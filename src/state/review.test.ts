import { describe, expect, it } from "vitest";
import { dueReviews, reviewQuestions } from "./review";
import type { CourseSnapshot } from "../types";

const DAY = 86_400_000;
const now = new Date("2026-11-16T12:00:00Z").getTime();
const ago = (d: number) => new Date(now - d * DAY).toISOString();
function snap(passed: Partial<Record<1 | 2 | 3 | 4, number>>): CourseSnapshot {
  return {
    progress: Object.entries(passed).map(([r, d]) => ({
      riverNumber: Number(r) as 1,
      lessonViewedAt: ago(d! + 1),
      completedAt: ago(d!),
      quizPassedAt: ago(d!),
      quizBestScore: 8,
    })),
  } as unknown as CourseSnapshot;
}

describe("spaced review", () => {
  it("asks three questions a round, spread across the quiz, with no repeats across rounds", () => {
    const all = [1, 2, 3].flatMap((r) => reviewQuestions(r as 1));
    expect(reviewQuestions(1)).toEqual([0, 3, 6]);
    expect(new Set(all).size).toBe(9);
  });

  it("comes due 1, 7 and 30 days after a quiz is passed", () => {
    expect(dueReviews(snap({ 1: 0.5 }), [], now)).toHaveLength(0);
    expect(dueReviews(snap({ 1: 2 }), [], now).map((r) => r.round)).toEqual([1]);
    expect(dueReviews(snap({ 1: 8 }), [], now).map((r) => r.round)).toEqual([1, 2]);
    expect(dueReviews(snap({ 1: 31 }), [], now).map((r) => r.round)).toEqual([1, 2, 3]);
  });

  it("leaves out finished rounds and lists the earliest first", () => {
    // River 1 passed 10 days ago (round 2 due 3 days ago, round 1 done); River 3 passed 2 days ago (round 1 due yesterday).
    const due = dueReviews(snap({ 1: 10, 3: 2 }), [{ river: 1, round: 1, score: 3, doneAt: ago(8) }], now);
    expect(due.map((r) => `${r.river}:${r.round}`)).toEqual(["1:2", "3:1"]);
  });

  it("ignores rivers whose quiz isn't passed", () => {
    const s = snap({ 2: 10 });
    (s.progress[0] as { quizPassedAt: string | null }).quizPassedAt = null;
    expect(dueReviews(s, [], now)).toHaveLength(0);
  });
});
