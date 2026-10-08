import { describe, expect, it } from "vitest";
import { MOMENTS } from "./moments";
import { MOMENTS_ES } from "./es/moments";
import { findLibraryVerse } from "./verseLibrary";
import { localizedVerse } from "./scriptureEs";

const words = (t: { hook: string; sections: { body: string[] }[] }) =>
  (t.hook + " " + t.sections.flatMap((s) => s.body).join(" ")).split(/\s+/).length;

describe("money moments", () => {
  it("each has Spanish text, six sections, three steps, and a short read", () => {
    for (const m of MOMENTS) {
      const es = MOMENTS_ES[m.id];
      expect(es, m.id).toBeDefined();
      expect(m.en.sections).toHaveLength(6);
      expect(es.sections).toHaveLength(6);
      expect(m.en.steps).toHaveLength(3);
      expect(m.en.ask).toHaveLength(4);
      expect(es.ask).toHaveLength(4);
      expect(es.steps).toHaveLength(3);
      expect(words(m.en)).toBeGreaterThan(400);
      expect(words(m.en)).toBeLessThan(800);
    }
  });

  it("quote only verses that are in the course library, with a Spanish twin", () => {
    for (const m of MOMENTS) {
      expect(m.verses.length).toBeGreaterThanOrEqual(3);
      for (const v of m.verses) {
        const found = findLibraryVerse(v.reference, v.translation);
        expect(found, `${m.id}: ${v.reference} (${v.translation})`).toBeDefined();
        expect(localizedVerse(found!, "es").version).not.toBe(v.translation);
      }
    }
  });

  it("link to pages that exist", () => {
    for (const m of MOMENTS) expect(m.relatedTo).toMatch(/^\/(dashboard|course\/(introduction|river\/[1-4])\/module\/\d+)$/);
  });
});
