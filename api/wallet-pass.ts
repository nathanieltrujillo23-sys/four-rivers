/**
 * An Apple Wallet pass for a group: a card with the group's name, its 4-digit join code, and a QR code that opens the
 * invite link. A group leader (or co-leader) taps "Add to Apple Wallet" on the leader page; the pass can then be shown
 * or AirDropped to anyone joining.
 *
 *   POST /api/wallet-pass   { groupId }   (signed in as a leader of that group)  ->  { url }
 *   GET  <url>                                                                     ->  the .pkpass file
 *
 * The first call checks who is asking and hands back a link that works for one minute, so the file itself can be opened
 * straight from Safari (which is how an iPhone offers "Add to Wallet"); no sign-in token ever goes into a link.
 *
 * Needs an Apple Developer account (see docs/apple-wallet.md) and these Vercel variables:
 *   APPLE_PASS_TYPE_ID, APPLE_TEAM_ID, APPLE_PASS_CERT, APPLE_PASS_KEY, APPLE_WWDR_CERT, optional APPLE_PASS_KEY_PASSPHRASE
 * (PEM text; a line break may be written as \n). Also CRON_SECRET and SUPABASE_SERVICE_ROLE_KEY like the other functions.
 * Without them this answers 501 and the app says Wallet is not set up yet.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { PKPass } from "passkit-generator";
import { WALLET_IMAGES } from "./_wallet-images.js";
import {
  bodyOf,
  header,
  serviceGet,
  signedInUser,
  supabaseUrl,
  type Env,
  type Req,
  type Res,
} from "./_auth.js";

const LINK_SECONDS = 60;

const pem = (v: string | undefined) => (v ?? "").replace(/\\n/g, "\n");

export function walletConfigured(env: Env): boolean {
  return !!(
    env.APPLE_PASS_TYPE_ID &&
    env.APPLE_TEAM_ID &&
    env.APPLE_PASS_CERT &&
    env.APPLE_PASS_KEY &&
    env.APPLE_WWDR_CERT &&
    env.CRON_SECRET &&
    env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function walletSignature(groupId: string, expires: number, secret: string): string {
  return createHmac("sha256", secret).update(`wallet:${groupId}:${expires}`).digest("hex");
}

export function validWalletLink(groupId: string, expires: number, sig: string, secret: string, now = Date.now()): boolean {
  if (!Number.isFinite(expires) || expires * 1000 < now) return false;
  const expected = Buffer.from(walletSignature(groupId, expires, secret));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export interface PassGroup {
  id: string;
  name: string;
  joinCode: string;
}

/** Builds the .pkpass file (a signed zip). */
export function buildPass(env: Env, group: PassGroup, site: string): Buffer {
  const images = Object.fromEntries(Object.entries(WALLET_IMAGES).map(([name, b64]) => [name, Buffer.from(b64, "base64")]));
  const pass = new PKPass(
    images,
    {
      wwdr: pem(env.APPLE_WWDR_CERT),
      signerCert: pem(env.APPLE_PASS_CERT),
      signerKey: pem(env.APPLE_PASS_KEY),
      signerKeyPassphrase: env.APPLE_PASS_KEY_PASSPHRASE || undefined,
    },
    {
      formatVersion: 1,
      passTypeIdentifier: env.APPLE_PASS_TYPE_ID!,
      teamIdentifier: env.APPLE_TEAM_ID!,
      organizationName: "4 Rivers",
      serialNumber: `group-${group.id}`,
      description: `Join ${group.name} on 4 Rivers`,
      backgroundColor: "rgb(250, 245, 236)",
      foregroundColor: "rgb(44, 38, 32)",
      labelColor: "rgb(138, 90, 36)",
    },
  );
  pass.type = "generic";
  const link = `${site}/community?code=${group.joinCode}`;
  pass.primaryFields.push({ key: "group", label: "GROUP", value: group.name });
  pass.secondaryFields.push(
    { key: "code", label: "JOIN CODE", value: group.joinCode },
    { key: "site", label: "WHERE", value: site.replace(/^https?:\/\//, "") },
  );
  pass.backFields.push(
    {
      key: "how",
      label: "HOW TO JOIN",
      value: `Scan the code, or open ${site}/community, create a free account, and enter the code ${group.joinCode}.`,
    },
    { key: "link", label: "INVITE LINK", value: link },
  );
  pass.setBarcodes({ format: "PKBarcodeFormatQR", message: link, messageEncoding: "iso-8859-1", altText: `Code ${group.joinCode}` });
  return pass.getAsBuffer();
}

interface Res2 extends Res {
  end(body: Buffer): void;
}

export default async function handler(req: Req & { url?: string }, res: Res2) {
  res.setHeader("Cache-Control", "private, no-store");
  const env: Env = process.env;
  if (!walletConfigured(env)) return void res.status(501).json({ error: "not_configured" });
  const site = env.SITE_URL ?? "https://four-rivers.vercel.app";
  const secret = env.CRON_SECRET!;

  if (req.method === "POST") {
    const authorization = header(req, "authorization");
    const user = await signedInUser(authorization, env);
    if (!user) return void res.status(401).json({ error: "sign_in" });
    const groupId = bodyOf<{ groupId?: string }>(req)?.groupId ?? "";
    if (!/^[0-9a-f-]{36}$/.test(groupId)) return void res.status(400).json({ error: "bad_group" });
    // Ask the database as this person: only a leader or co-leader of the group gets a pass.
    const rpc = await fetch(`${supabaseUrl(env)}/rest/v1/rpc/is_group_manager`, {
      method: "POST",
      headers: {
        apikey: env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY ?? "",
        Authorization: authorization!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gid: groupId }),
    });
    if (!rpc.ok || (await rpc.json()) !== true) return void res.status(403).json({ error: "leaders_only" });
    const expires = Math.floor(Date.now() / 1000) + LINK_SECONDS;
    const sig = walletSignature(groupId, expires, secret);
    return void res.status(200).json({ url: `/api/wallet-pass?g=${groupId}&e=${expires}&s=${sig}` });
  }

  const params = new URL(req.url ?? "", "http://localhost").searchParams;
  const g = params.get("g") ?? "";
  const e = Number(params.get("e"));
  const s = params.get("s") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(g) || !validWalletLink(g, e, s, secret)) {
    return void res.status(403).json({ error: "link_expired" });
  }
  const rows = await serviceGet<{ id: string; name: string; join_code: string }[]>(
    env,
    `/rest/v1/groups?select=id,name,join_code&id=eq.${g}`,
  );
  const group = rows?.[0];
  if (!group) return void res.status(404).json({ error: "not_found" });
  try {
    const file = buildPass(env, { id: group.id, name: group.name, joinCode: group.join_code }, site);
    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader("Content-Disposition", `attachment; filename="4-rivers-group.pkpass"`);
    res.status(200);
    res.end(file);
  } catch {
    res.status(500).json({ error: "pass_failed" });
  }
}
