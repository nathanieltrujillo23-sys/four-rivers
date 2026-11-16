import { describe, expect, it } from "vitest";
import { PRACTICE_DAYS, PRACTICE_LENGTH, currentPracticeDay } from "./practice";
import { VERSE } from "./scripture";
import { spanishVerseText } from "./scriptureEs";

describe("30 Days of Practice", () => {
  it("has one entry for each of the 30 days, in order", () => {
    expect(PRACTICE_DAYS.map((d) => d.day)).toEqual(Array.from({ length: PRACTICE_LENGTH }, (_, i) => i + 1));
  });

  it("gives every day a verse from the course library, in an approved translation, with its Spanish version", () => {
    for (const d of PRACTICE_DAYS) {
      const v = VERSE[d.verse];
      expect(v, `day ${d.day}`).toBeDefined();
      expect(["KJV", "NIV", "NLT", "ESV"]).toContain(v.translation);
      expect(spanishVerseText(v.reference, v.translation), `Spanish for day ${d.day} (${v.reference})`).toBeTruthy();
    }
  });

  it("has every line in English and Spanish, with no emoji", () => {
    for (const d of PRACTICE_DAYS) {
      for (const text of [d.en, d.es]) {
        expect(text.title && text.action && text.why, `day ${d.day}`).toBeTruthy();
        expect(/\p{Extended_Pictographic}/u.test(Object.values(text).join(" "))).toBe(false);
      }
    }
  });

  it("covers each river for a week", () => {
    for (const r of [1, 2, 3, 4]) expect(PRACTICE_DAYS.filter((d) => d.river === r).length).toBeGreaterThanOrEqual(7);
  });

  it("counts today from the start date, clamped to 1-30", () => {
    const start = new Date("2026-11-01T09:00:00Z").getTime();
    expect(currentPracticeDay(new Date(start).toISOString(), start)).toBe(1);
    expect(currentPracticeDay(new Date(start).toISOString(), start + 2.5 * 86_400_000)).toBe(3);
    expect(currentPracticeDay(new Date(start).toISOString(), start + 90 * 86_400_000)).toBe(30);
  });
});
