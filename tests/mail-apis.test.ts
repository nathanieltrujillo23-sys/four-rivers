import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMail } from "../api/announce.ts";
import announce from "../api/announce.ts";
import translate, { translateTexts } from "../api/translate.ts";
import welcome, { welcomeMail, welcomeText } from "../api/welcome.ts";
import { notifyAdmins } from "../api/leader-request.ts";
import { validUnsubscribeToken } from "../api/_reminder-token.ts";

const env = {
  VITE_SUPABASE_URL: "https://x.supabase.co",
  VITE_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "svc",
  RESEND_API_KEY: "re",
  CRON_SECRET: "secret",
  ANTHROPIC_API_KEY: "ak",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function res() {
  const out: { status: number; body: unknown } = { status: 0, body: null };
  const r = {
    status(c: number) {
      out.status = c;
      return r;
    },
    setHeader() {},
    json(b: unknown) {
      out.body = b;
    },
  };
  return { r, out };
}

/** A fake network: answers each address with a canned reply and remembers what was sent where. */
function network(routes: Record<string, (init?: RequestInit) => unknown>) {
  const sent: { url: string; body: unknown }[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const u = String(url);
    sent.push({ url: u, body: init?.body ? JSON.parse(String(init.body)) : null });
    const key = Object.keys(routes).find((k) => u.includes(k));
    if (!key) return new Response("{}", { status: 404 });
    const body = routes[key](init);
    return new Response(JSON.stringify(body), { status: body === null ? 500 : 200 });
  });
  return sent;
}

const asAdmin = {
  "/auth/v1/user": () => ({ id: "admin-1", email: "admin@x.com" }),
  "select=role": () => [{ role: "admin" }],
};

describe("announcements", () => {
  it("greets by name, escapes the text, and carries a signed unsubscribe link", () => {
    const m = buildMail(
      { user_id: "u1", email: "a@x.com", display_name: "Ana", lang: "en" },
      { subject: "News", body: "Hello <b>there</b>\n\nSecond paragraph" },
      "en",
      "https://site",
      "secret",
    );
    expect(m.html).toContain("<p>Hi Ana,</p>");
    expect(m.html).not.toContain("<b>there</b>");
    expect(m.html.match(/<p style=/g)).toHaveLength(3);
    const token = new URL(m.unsubscribe!).searchParams.get("t")!;
    expect(validUnsubscribeToken("u1", token, "secret", "announce")).toBe(true);
    expect(validUnsubscribeToken("u1", token, "secret", "digest")).toBe(false);
  });

  it("only lets an admin send, and sends Spanish readers the Spanish text", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "svc");
    vi.stubEnv("RESEND_API_KEY", "re");
    vi.stubEnv("VITE_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");
    vi.stubEnv("CRON_SECRET", "secret");

    // Not an admin: refused.
    network({ "/auth/v1/user": () => ({ id: "u9" }), "select=role": () => [{ role: "free" }] });
    let { r, out } = res();
    await announce({ method: "POST", headers: { authorization: "Bearer t" }, body: { audience: "everyone", subject: "s", body: "b" } }, r);
    expect(out.status).toBe(403);

    // An admin: two recipients, one reading in Spanish.
    const sent = network({
      ...asAdmin,
      "announcement_recipients": () => [
        { user_id: "u1", email: "a@x.com", display_name: "Ana", lang: "en" },
        { user_id: "u2", email: "b@x.com", display_name: "Beto", lang: "es" },
      ],
      "emails/batch": () => ({ data: [] }),
      "/rest/v1/announcements": () => ({}),
    });
    ({ r, out } = res());
    await announce(
      {
        method: "POST",
        headers: { authorization: "Bearer t" },
        body: { audience: "everyone", subject: "News", body: "Hello", subjectEs: "Noticias", bodyEs: "Hola" },
      },
      r,
    );
    expect(out).toMatchObject({ status: 200, body: { recipients: 2, sent: 2 } });
    const batch = sent.find((s) => s.url.includes("emails/batch"))!.body as { to: string; subject: string }[];
    expect(batch.map((m) => [m.to, m.subject])).toEqual([
      ["a@x.com", "News"],
      ["b@x.com", "Noticias"],
    ]);
    // It is recorded in the history.
    expect(sent.some((s) => s.url.endsWith("/rest/v1/announcements"))).toBe(true);
  });

  it("a test goes only to the admin and is not recorded", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "svc");
    vi.stubEnv("RESEND_API_KEY", "re");
    vi.stubEnv("VITE_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");
    const sent = network({ ...asAdmin, "emails/batch": () => ({}) });
    const { r, out } = res();
    await announce({ method: "POST", headers: { authorization: "Bearer t" }, body: { audience: "everyone", subject: "s", body: "b", test: true } }, r);
    expect(out.body).toMatchObject({ recipients: 1, sent: 1 });
    expect((sent.find((s) => s.url.includes("emails/batch"))!.body as { to: string }[])[0].to).toBe("admin@x.com");
    expect(sent.some((s) => s.url.endsWith("/rest/v1/announcements"))).toBe(false);
  });
});

describe("translation", () => {
  it("asks for a JSON array back and checks it has the same length", async () => {
    network({ "api.anthropic.com": () => ({ content: [{ type: "text", text: 'Here: ["Hola", "Adiós"]' }] }) });
    expect(await translateTexts(env, ["Hello", "Goodbye"])).toEqual(["Hola", "Adiós"]);
    network({ "api.anthropic.com": () => ({ content: [{ type: "text", text: '["solo uno"]' }] }) });
    expect(await translateTexts(env, ["a", "b"])).toBeNull();
  });

  it("is for admins only and says so when it is not set up", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "svc");
    vi.stubEnv("VITE_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");
    let { r, out } = res();
    await translate({ method: "POST", headers: {}, body: { texts: ["a"] } }, r);
    expect(out.status).toBe(501); // no ANTHROPIC_API_KEY
    vi.stubEnv("ANTHROPIC_API_KEY", "ak");
    network({ "/auth/v1/user": () => ({ id: "u9" }), "select=role": () => [{ role: "free" }] });
    ({ r, out } = res());
    await translate({ method: "POST", headers: { authorization: "Bearer t" }, body: { texts: ["a"] } }, r);
    expect(out.status).toBe(403);
  });
});

describe("welcome email", () => {
  it("uses the saved message when there is one, and the shipped one otherwise", async () => {
    network({ "site_text": () => [{ content: { title: "Hi from me", paragraphs: ["One"], sign: "Nate" } }] });
    expect((await welcomeText(env, "en")).title).toBe("Hi from me");
    network({ "site_text": () => [] });
    expect((await welcomeText(env, "es")).title).toBe("Te damos la bienvenida a 4 Rivers");
  });

  it("thanks them by name and is signed by the founder", () => {
    const m = welcomeMail({ title: "Welcome", paragraphs: ["Thank you.", "Be encouraged."], sign: "Nate" }, "Ana", "en", "https://site");
    expect(m.subject).toBe("Welcome");
    expect(m.html).toContain("Hi Ana,");
    expect(m.text).toContain("— Nate");
  });

  it("sends once: nothing happens for someone already welcomed", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "svc");
    vi.stubEnv("RESEND_API_KEY", "re");
    vi.stubEnv("VITE_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");
    const sent = network({
      "/auth/v1/user": () => ({ id: "u1", email: "a@x.com" }),
      "select=welcome_sent_at": () => [{ welcome_sent_at: "2026-10-01T00:00:00Z", display_name: "Ana" }],
    });
    const { r, out } = res();
    await welcome({ method: "POST", headers: { authorization: "Bearer t" }, body: { lang: "en" } }, r);
    expect(out.body).toEqual({ sent: false });
    expect(sent.some((s) => s.url.includes("api.resend.com"))).toBe(false);
  });
});

describe("leader request alert", () => {
  const profile = {
    leader_status: "requested",
    leader_requested_at: "2026-10-06T10:00:00Z",
    leader_note: "I lead a small group",
    leader_request_notified_at: null,
    display_name: "Sam",
    full_name: "Sam Lee",
  };

  it("emails every admin once and marks the request as announced", async () => {
    const sent = network({
      "select=leader_status": () => [profile],
      "role=eq.admin": () => [{ user_id: "a1" }, { user_id: "a2" }],
      "/auth/v1/admin/users/a1": () => ({ email: "one@x.com" }),
      "/auth/v1/admin/users/a2": () => ({ email: "two@x.com" }),
      "/rest/v1/profiles?user_id=eq.u1": () => ({}),
      "api.resend.com": () => ({}),
    });
    expect(await notifyAdmins(env, "u1", "sam@x.com")).toBe(2);
    const mails = sent.filter((s) => s.url.includes("api.resend.com")).map((s) => s.body as { to: string; subject: string });
    expect(mails.map((m) => m.to)).toEqual(["one@x.com", "two@x.com"]);
    expect(mails[0].subject).toBe("Sam Lee asked to lead a group");
    expect(sent.some((s) => s.url.includes("rest/v1/profiles?user_id=eq.u1"))).toBe(true);
  });

  it("does nothing when there is no pending request, or the admins were already told", async () => {
    network({ "select=leader_status": () => [{ ...profile, leader_status: "none" }] });
    expect(await notifyAdmins(env, "u1", null)).toBe(0);
    network({ "select=leader_status": () => [{ ...profile, leader_request_notified_at: "2026-10-06T10:05:00Z" }] });
    expect(await notifyAdmins(env, "u1", null)).toBe(0);
  });
});
