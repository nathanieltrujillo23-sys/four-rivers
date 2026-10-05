import { afterEach, describe, expect, it, vi } from "vitest";
import { emailFor, groupRows, runReminders } from "../api/reminders.ts";
import { unsubscribeToken, validUnsubscribeToken } from "../api/_reminder-token.ts";
import { passagesInSpanish } from "../api/_book-names.ts";

const rows = [
  {
    user_id: "u1",
    email: "a@x.com",
    display_name: "Ana",
    group_id: "g1",
    group_name: "Tuesday",
    passages: "Proverbs 4:10-5:14; Luke 2",
    wants_email: true,
    lang: "en" as const,
  },
  {
    user_id: "u1",
    email: "a@x.com",
    display_name: "Ana",
    group_id: "g2",
    group_name: "Sunday",
    passages: "John 3",
    wants_email: true,
    lang: "en" as const,
  },
  {
    user_id: "u2",
    email: "b@x.com",
    display_name: "",
    group_id: "g1",
    group_name: "Martes",
    passages: "Psalm 23",
    wants_email: true,
    lang: "es" as const,
  },
];

afterEach(() => vi.unstubAllGlobals());

describe("reminders", () => {
  it("makes one reminder per person, listing each group", () => {
    const out = groupRows(rows);
    expect(out).toHaveLength(2);
    expect(out[0].items.map((i) => i.groupName)).toEqual(["Tuesday", "Sunday"]);
  });

  it("writes the email in the person's language with a signed unsubscribe link", () => {
    const [en, es] = groupRows(rows);
    const e = emailFor(en, "https://site.test", "secret");
    expect(e.subject).toBe("You have 2 readings today");
    expect(e.html).toContain("/community/g1");
    expect(e.off).toContain(`u=u1&t=${unsubscribeToken("u1", "secret")}`);
    const s = emailFor(es, "https://site.test", "secret");
    expect(s.subject).toBe("Lectura de hoy: Salmo 23");
    expect(s.text).toContain("Desactivar estos recordatorios");
  });

  it("only accepts the right token for the right person", () => {
    const t = unsubscribeToken("u1", "secret");
    expect(validUnsubscribeToken("u1", t, "secret")).toBe(true);
    expect(validUnsubscribeToken("u2", t, "secret")).toBe(false);
    expect(validUnsubscribeToken("u1", "nope", "secret")).toBe(false);
  });

  it("puts book names in Spanish", () => {
    expect(passagesInSpanish("Proverbs 4:10-5:14; 1 John 3")).toBe("Proverbios 4:10-5:14; 1 Juan 3");
  });

  it("sends one email per person and skips people who did not opt in", async () => {
    const sent: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      if (String(url).includes("/rpc/reminders_due")) {
        return new Response(
          JSON.stringify([...rows, { ...rows[2], user_id: "u3", email: "c@x.com", wants_email: false }]),
          { status: 200 },
        );
      }
      if (String(url).includes("resend.com")) {
        sent.push(JSON.parse(String(init?.body)).to);
        return new Response("{}", { status: 200 });
      }
      return new Response("[]", { status: 200 });
    });
    const out = await runReminders(
      {
        VITE_SUPABASE_URL: "https://x.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "svc",
        RESEND_API_KEY: "r",
        CRON_SECRET: "s",
      },
      new Date("2026-10-05T12:00:00Z"),
    );
    expect(sent).toEqual(["a@x.com", "b@x.com"]);
    expect(out).toEqual({ date: "2026-10-05", people: 3, emails: 2, pushes: 0 });
  });
});
