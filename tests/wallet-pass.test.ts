import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import handler, { buildPass, validWalletLink, walletConfigured, walletSignature } from "../api/wallet-pass.ts";

let env: Record<string, string>;

beforeAll(() => {
  // A throwaway certificate, only to prove the pass file gets built and signed; Apple will not trust it.
  const dir = mkdtempSync(join(tmpdir(), "pass-"));
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", join(dir, "k.pem"), "-out", join(dir, "c.pem"), "-subj", "/CN=Test", "-days", "1"], { stdio: "ignore" });
  const cert = readFileSync(join(dir, "c.pem"), "utf8");
  env = {
    APPLE_PASS_TYPE_ID: "pass.com.example.fourrivers",
    APPLE_TEAM_ID: "ABCDE12345",
    APPLE_PASS_CERT: cert,
    APPLE_PASS_KEY: readFileSync(join(dir, "k.pem"), "utf8"),
    APPLE_WWDR_CERT: cert,
    CRON_SECRET: "secret",
    SUPABASE_SERVICE_ROLE_KEY: "svc",
    VITE_SUPABASE_URL: "https://x.supabase.co",
    VITE_SUPABASE_ANON_KEY: "anon",
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const res = () => {
  const out: { status: number; body: unknown; headers: Record<string, string>; file: Buffer | null } = {
    status: 0,
    body: null,
    headers: {},
    file: null,
  };
  const r = {
    status(c: number) {
      out.status = c;
      return r;
    },
    setHeader(k: string, v: string) {
      out.headers[k] = v;
    },
    json(b: unknown) {
      out.body = b;
    },
    end(b: Buffer) {
      out.file = b;
    },
  };
  return { r, out };
};

describe("wallet link", () => {
  it("is signed, and stops working after a minute or if changed", () => {
    const g = "00000000-0000-0000-0000-00000000aaaa";
    const exp = Math.floor(Date.now() / 1000) + 60;
    const sig = walletSignature(g, exp, "secret");
    expect(validWalletLink(g, exp, sig, "secret")).toBe(true);
    expect(validWalletLink(g, exp + 1, sig, "secret")).toBe(false);
    expect(validWalletLink("00000000-0000-0000-0000-00000000bbbb", exp, sig, "secret")).toBe(false);
    expect(validWalletLink(g, exp, sig, "secret", Date.now() + 120_000)).toBe(false);
  });
});

describe("the pass", () => {
  it("is a signed .pkpass zip with the group's code and invite link", () => {
    const file = buildPass(env, { id: "g1", name: "Tuesday Night Stewards", joinCode: "4271" }, "https://four-rivers.vercel.app");
    expect(file.subarray(0, 2).toString()).toBe("PK");
    const text = file.toString("latin1");
    for (const name of ["pass.json", "manifest.json", "signature", "icon.png", "logo@2x.png"]) expect(text).toContain(name);
    expect(text).toContain("https://four-rivers.vercel.app/community?code=4271");
    expect(text).toContain("Tuesday Night Stewards");
    expect(text).toContain("PKBarcodeFormatQR");
  });

  it("says it is not set up until the Apple certificates exist", async () => {
    expect(walletConfigured(env)).toBe(true);
    expect(walletConfigured({ ...env, APPLE_PASS_CERT: "" })).toBe(false);
    for (const k of Object.keys(env)) vi.stubEnv(k, "");
    const { r, out } = res();
    await handler({ method: "POST", headers: {}, body: {} }, r);
    expect(out.status).toBe(501);
  });

  it("only hands a link to a leader of that group, then serves the file from that link", async () => {
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
    const g = "00000000-0000-0000-0000-00000000aaaa";
    vi.stubGlobal("fetch", async (url: string) => {
      const u = String(url);
      if (u.includes("/auth/v1/user")) return new Response(JSON.stringify({ id: "u1", email: "l@x.com" }));
      if (u.includes("is_group_manager")) return new Response(JSON.stringify(true));
      if (u.includes("/rest/v1/groups")) return new Response(JSON.stringify([{ id: g, name: "Tuesday", join_code: "4271" }]));
      return new Response("{}", { status: 404 });
    });
    let { r, out } = res();
    await handler({ method: "POST", headers: { authorization: "Bearer t" }, body: { groupId: g } }, r);
    expect(out.status).toBe(200);
    const url = (out.body as { url: string }).url;
    expect(url).toMatch(/^\/api\/wallet-pass\?g=/);

    ({ r, out } = res());
    await handler({ method: "GET", url, headers: {} }, r);
    expect(out.status).toBe(200);
    expect(out.headers["Content-Type"]).toBe("application/vnd.apple.pkpass");
    expect(out.file!.subarray(0, 2).toString()).toBe("PK");

    // Someone who is not a leader of the group is refused.
    vi.stubGlobal("fetch", async (u: string) =>
      String(u).includes("/auth/v1/user")
        ? new Response(JSON.stringify({ id: "u2" }))
        : String(u).includes("is_group_manager")
          ? new Response(JSON.stringify(false))
          : new Response("{}", { status: 404 }),
    );
    ({ r, out } = res());
    await handler({ method: "POST", headers: { authorization: "Bearer t" }, body: { groupId: g } }, r);
    expect(out.status).toBe(403);
  });
});
