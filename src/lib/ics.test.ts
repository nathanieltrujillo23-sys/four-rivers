import { describe, expect, it } from "vitest";
import { buildIcs, icsEscape, icsFold, nextDay } from "./ics";

describe("ics", () => {
  it("escapes the characters the format reserves", () => {
    expect(icsEscape("Luke 1; Luke 2, and more\nnext\\")).toBe("Luke 1\; Luke 2\\, and more\\nnext\\\\");
  });

  it("folds long lines at 75 bytes without splitting a character", () => {
    const folded = icsFold("SUMMARY:" + "é".repeat(80));
    for (const part of folded.split("\r\n")) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, "")).toBe("SUMMARY:" + "é".repeat(80));
  });

  it("ends all-day events the day after they finish (the end date is exclusive)", () => {
    expect(nextDay("2026-10-31")).toBe("2026-11-01");
    expect(nextDay("2026-12-31")).toBe("2027-01-01");
    const text = buildIcs("Plan", [
      { uid: "a@x", date: "2026-10-05", title: "Proverbs 4" },
      { uid: "b@x", date: "2026-10-05", through: "2026-10-11", title: "Week" },
    ]);
    expect(text).toContain("DTSTART;VALUE=DATE:20261005\r\nDTEND;VALUE=DATE:20261006");
    expect(text).toContain("DTEND;VALUE=DATE:20261012");
  });

  it("is a valid-looking calendar with CRLF lines and stable ids", () => {
    const text = buildIcs("My, plan", [{ uid: "g1-2026-10-05@4rivers", date: "2026-10-05", title: "Luke 3", description: "Open the group", url: "https://x/y" }], new Date("2026-10-05T12:00:00Z"));
    expect(text.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0")).toBe(true);
    expect(text.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(text).toContain("X-WR-CALNAME:My\\, plan");
    expect(text).toContain("UID:g1-2026-10-05@4rivers");
    expect(text).toContain("DTSTAMP:20261005T120000Z");
    expect(text).not.toMatch(/[^\r]\n/);
  });
});
