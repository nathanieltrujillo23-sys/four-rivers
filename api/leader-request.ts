/**
 * Emails the admins when someone asks to become a group leader, or (with {"kind":"wealth"}) asks for Wealth Tools.
 * The app calls this right after the request is saved.
 * It only acts when the caller really has a pending request that the admins have not been told about yet.
 * Needs SUPABASE_SERVICE_ROLE_KEY and RESEND_API_KEY.
 *
 *   POST /api/leader-request
 */
import { emailOf, header, serviceGet, servicePatch, signedInUser, type Env, type Req, type Res } from "./_auth.js";
import { esc, sendMail } from "./_mail.js";

interface Profile {
  status: string;
  requested_at: string | null;
  note: string | null;
  notified_at: string | null;
  display_name: string | null;
  full_name: string | null;
}

/** The two kinds of request, and the profile columns each one lives in. */
const KINDS = {
  leader: { prefix: "leader", subject: "asked to lead a group", what: "become a group leader", where: "Leaders tab" },
  wealth: { prefix: "wealth", subject: "asked for Wealth Tools", what: "use Wealth Tools", where: "Wealth tools tab" },
} as const;
type Kind = keyof typeof KINDS;

export async function notifyAdmins(env: Env, userId: string, email: string | null, kind: Kind = "leader"): Promise<number> {
  const k = KINDS[kind];
  const raw = await serviceGet<Record<string, string | null>[]>(
    env,
    `/rest/v1/profiles?select=${k.prefix}_status,${k.prefix}_requested_at,${k.prefix}_note,${k.prefix}_request_notified_at,display_name,full_name&user_id=eq.${userId}`,
  );
  const r = raw?.[0];
  const p: Profile | undefined = r && {
    status: r[`${k.prefix}_status`] ?? "",
    requested_at: r[`${k.prefix}_requested_at`] ?? null,
    note: r[`${k.prefix}_note`] ?? null,
    notified_at: r[`${k.prefix}_request_notified_at`] ?? null,
    display_name: r.display_name ?? null,
    full_name: r.full_name ?? null,
  };
  if (!p || p.status !== "requested" || !p.requested_at) return 0;
  if (p.notified_at && p.notified_at >= p.requested_at) return 0;

  const admins = (await serviceGet<{ user_id: string }[]>(env, "/rest/v1/profiles?select=user_id&role=eq.admin")) ?? [];
  const addresses = (await Promise.all(admins.map((a) => emailOf(env, a.user_id)))).filter((e): e is string => !!e);
  if (addresses.length === 0) return 0;

  // Mark it before sending so a double click cannot email twice.
  await servicePatch(env, `/rest/v1/profiles?user_id=eq.${userId}`, { [`${k.prefix}_request_notified_at`]: new Date().toISOString() });
  const who = p.full_name || p.display_name || email || "Someone";
  const site = env.SITE_URL ?? "https://four-rivers.vercel.app";
  const note = p.note ? `\n\nThey wrote: "${p.note}"` : "";
  let sent = 0;
  for (const to of addresses) {
    const ok = await sendMail(env, {
      to,
      subject: `${who} ${k.subject}`,
      html: `<p>${esc(who)}${email ? ` (${esc(email)})` : ""} asked to ${k.what} on 4 Rivers.</p>${
        p.note ? `<p>They wrote: “${esc(p.note)}”</p>` : ""
      }<p><a href="${site}/admin">Review it in the Admin dashboard (${k.where})</a></p>`,
      text: `${who}${email ? ` (${email})` : ""} asked to ${k.what} on 4 Rivers.${note}\n\nReview it: ${site}/admin`,
    });
    if (ok) sent += 1;
  }
  return sent;
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "POST") return void res.status(405).json({ error: "post_only" });
  const env: Env = process.env;
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.RESEND_API_KEY) return void res.status(501).json({ error: "not_configured" });
  const user = await signedInUser(header(req, "authorization"), env);
  if (!user) return void res.status(401).json({ error: "sign_in" });
  const kind: Kind = (req.body as { kind?: unknown } | undefined)?.kind === "wealth" ? "wealth" : "leader";
  res.status(200).json({ notified: await notifyAdmins(env, user.id, user.email, kind) });
}
