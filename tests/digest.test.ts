import { afterEach, describe, expect, it, vi } from "vitest";
import { digestEmail, groupDigests, groupLines, runDigest } from "../api/digest.ts";
import { validUnsubscribeToken, unsubscribeToken } from "../api/_reminder-token.ts";

const stats = {
  members: 4,
  new_members: 1,
  reading_days: 5,
  ticks: 12,
  finished_all: ["Ana", "Ben"],
  none: ["Cruz"],
  new_prayers: 3,
  answered: 1,
};

const rows = [
  { user_id: "l1", email: "lead@x.com", display_name: "Lee", lang: "en" as const, group_id: "g1", group_name: "Tuesday", stats },
  {
    user_id: "l1",
    email: "lead@x.com",
    display_name: "Lee",
    lang: "en" as const,
    group_id: "g2",
    group_name: "Quiet group",
    stats: { ...stats, new_members: 0, reading_days: 0, new_prayers: 0, answered: 0 },
  },
  { user_id: "l2", email: "otro@x.com", display_name: "", lang: "es" as const, group_id: "g3", group_name: "Martes", stats },
];

afterEach(() => vi.unstubAllGlobals());

describe("weekly digest", () => {
  it("makes one digest per leader and leaves out groups with nothing to say", () => {
    const d = groupDigests(rows);
    expect(d).toHaveLength(2);
    expect(d[0].groups.map((g) => g.groupName)).toEqual(["Tuesday"]);
  });

  it("describes the week in plain sentences, in either language", () => {
    expect(groupLines("en", stats)).toEqual([
      "Readings: 12 of 20 ticked off across 5 reading days.",
      "Finished every reading: Ana, Ben.",
      "Haven't read yet this week: Cruz.",
      "1 new member joined.",
      "Prayer wall: 3 new requests, 1 marked answered.",
    ]);
    expect(groupLines("es", stats)[0]).toContain("12 de 20");
  });

  it("escapes names in the email and signs a separate unsubscribe link", () => {
    const d = groupDigests([{ ...rows[0], group_name: "<b>Bold</b>" }])[0];
    const mail = digestEmail(d, "https://site", "secret");
    expect(mail.html).not.toContain("<b>Bold</b>");
    expect(mail.subject).toBe("Your group this week");
    const token = new URL(mail.off).searchParams.get("t")!;
    expect(validUnsubscribeToken("l1", token, "secret", "digest")).toBe(true);
    // The token for reading reminders does not work for the digest, or the other way round.
    expect(validUnsubscribeToken("l1", token, "secret", "reminders")).toBe(false);
    expect(validUnsubscribeToken("l1", unsubscribeToken("l1", "secret"), "secret", "digest")).toBe(false);
  });

  it("emails each leader once for the week before today", async () => {
    const sent: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      if (String(url).includes("/rpc/leader_digest")) {
        const body = JSON.parse(String(init?.body));
        expect(body).toEqual({ p_from: "2026-09-28", p_to: "2026-10-04" });
        return new Response(JSON.stringify(rows), { status: 200 });
      }
      sent.push(JSON.parse(String(init?.body)).to);
      return new Response("{}", { status: 200 });
    });
    const out = await runDigest(
      { VITE_SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "svc", RESEND_API_KEY: "re", CRON_SECRET: "s" },
      new Date("2026-10-05T14:00:00Z"),
    );
    expect(sent).toEqual(["lead@x.com", "otro@x.com"]);
    expect(out).toMatchObject({ leaders: 2, emails: 2 });
  });
});
