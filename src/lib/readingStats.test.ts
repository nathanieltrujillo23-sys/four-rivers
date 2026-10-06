import { describe, expect, it } from "vitest";
import { readingStreak } from "./readingStats";

const due = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"];

describe("readingStreak", () => {
  it("counts back from the latest reading", () => {
    expect(readingStreak(due, new Set(due.slice(2)), "2026-10-05")).toBe(3);
  });
  it("stops at the first gap", () => {
    expect(readingStreak(due, new Set(["2026-10-01", "2026-10-02", "2026-10-04", "2026-10-05"]), "2026-10-05")).toBe(2);
  });
  it("does not punish a reading that is only due today", () => {
    expect(readingStreak(due, new Set(["2026-10-03", "2026-10-04"]), "2026-10-05")).toBe(2);
  });
  it("is zero when yesterday was missed and today is still open", () => {
    expect(readingStreak(due, new Set(["2026-10-01"]), "2026-10-05")).toBe(0);
  });
});
