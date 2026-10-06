import { describe, expect, it } from "vitest";
import { BIBLE_BOOKS } from "./bibleBooks";
import { PLAN_TEMPLATES } from "./planTemplates";
import { parsePassage, type BibleShape } from "./readingPlan";

// Every chapter and verse "exists"; this only checks that each passage is written in a form the plan maker reads.
const shape: BibleShape = {
  chapterCount: () => 150,
  verseWords: () => Array.from({ length: 80 }, () => 10),
  breaks: () => [],
};

describe("plan templates", () => {
  it("name only real books and unique ids", () => {
    expect(new Set(PLAN_TEMPLATES.map((t) => t.id)).size).toBe(PLAN_TEMPLATES.length);
    for (const t of PLAN_TEMPLATES) {
      expect(t.passages.length).toBeGreaterThan(0);
      for (const label of t.passages) {
        const p = parsePassage(label, shape);
        expect(p, `${t.id}: ${label}`).not.toBeNull();
        expect(BIBLE_BOOKS[p!.book]).toBeDefined();
      }
    }
  });
});
