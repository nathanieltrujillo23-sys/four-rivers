import { describe, expect, it } from "vitest";
import { VERSE } from "./scripture";
import { SPANISH_VERSION, spanishVerseText } from "./scriptureEs";

describe("Spanish scripture", () => {
  it("has a Spanish counterpart for every verse the course quotes", () => {
    const missing = Object.values(VERSE)
      .filter((v) => spanishVerseText(v.reference, v.translation) === null)
      .map((v) => `${v.reference} (${v.translation})`);
    expect(missing).toEqual([]);
  });

  it("keeps excerpts as excerpts", () => {
    for (const v of Object.values(VERSE)) {
      const es = spanishVerseText(v.reference, v.translation);
      if (v.text.includes("…")) expect(es).toMatch(/…/);
    }
  });

  it("maps each English version to its Spanish counterpart", () => {
    expect(SPANISH_VERSION).toEqual({ KJV: "RVR1960", NIV: "NVI", NLT: "NTV", ESV: "LBLA" });
  });
});
