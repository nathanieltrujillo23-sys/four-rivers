import { describe, expect, it } from "vitest";
import { INTRODUCTION, LESSONS } from "../lessons";
import { INTRODUCTION_TEXT_ES, RIVER_TEXT_ES } from "./index";

describe("Spanish lessons", () => {
  it("mirror the English structure so the verses line up", () => {
    expect(INTRODUCTION_TEXT_ES?.lessons).toHaveLength(INTRODUCTION.lessons.length);
    INTRODUCTION.lessons.forEach((l, i) =>
      expect(INTRODUCTION_TEXT_ES?.lessons[i].body.length, `intro ${i}`).toBe(l.body.length),
    );
    for (const n of [1, 2, 3, 4] as const) {
      const es = RIVER_TEXT_ES[n];
      expect(es?.lessons, `river ${n}`).toHaveLength(LESSONS[n].lessons.length);
      LESSONS[n].lessons.forEach((l, i) =>
        expect(es?.lessons[i].body.length, `river ${n} lesson ${i}`).toBe(l.body.length),
      );
    }
  });
});
