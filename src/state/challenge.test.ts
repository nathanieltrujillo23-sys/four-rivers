import { describe, expect, it } from "vitest";
import {
  activityDates,
  currentChallengeDay,
  currentStreak,
  streakInfo,
  generateChallengePlan,
  isDayComplete,
} from "./challenge";
import type { CourseSnapshot } from "../types";

function emptySnapshot(overrides: Partial<CourseSnapshot> = {}): CourseSnapshot {
  return {
    profile: {
      userId: "u1",
      role: "free",
      displayName: null,
      fullName: null,
      examPassedAt: null,
      examBestScore: null,
      challengeStartedAt: null,
    leaderStatus: "none",
    },
    progress: [],
    incomeStreams: [],
    savingsGoals: [],
    savingsContributions: [],
    investmentEntries: [],
    givingEntries: [],
    moduleViews: [],
    ...overrides,
  };
}

describe("generateChallengePlan", () => {
  it("produces one day per day of the pace, two weeks by default", () => {
    expect(generateChallengePlan(undefined, 7)).toHaveLength(7);
    const plan = generateChallengePlan();
    expect(plan).toHaveLength(14);
    expect(plan.map((d) => d.day)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
  });

  it.each([7, 14] as const)("puts the final exam alone on the last day of a %i-day pace", (length) => {
    const plan = generateChallengePlan(undefined, length);
    const lastDay = plan[plan.length - 1];
    expect(lastDay.day).toBe(length);
    expect(lastDay.items).toHaveLength(1);
    expect(lastDay.items[0].to).toBe("/course/exam");
    for (const day of plan.slice(0, -1)) {
      expect(day.items.every((item) => item.to !== "/course/exam")).toBe(true);
    }
  });

  it.each([7, 14] as const)("spreads every other task across the days before it, none empty (%i days)", (length) => {
    const plan = generateChallengePlan(undefined, length);
    for (const day of plan.slice(0, -1)) {
      expect(day.items.length).toBeGreaterThan(0);
    }
    const all = plan.flatMap((d) => d.items);
    expect(all.filter((i) => i.to === "/course/exam")).toHaveLength(1);
    expect(all.length).toBe(generateChallengePlan(undefined, 7).flatMap((d) => d.items).length);
  });
});

describe("isDayComplete", () => {
  it("is false until every item in a day is done, true once they all are", () => {
    const plan = generateChallengePlan();
    const day1 = plan[0];
    expect(isDayComplete(day1, emptySnapshot())).toBe(false);

    const allDone = emptySnapshot({
      moduleViews: day1.items.map((_, i) => ({ section: "introduction" as const, moduleIndex: i, viewedAt: "t" })),
    });
    expect(isDayComplete(day1, allDone)).toBe(true);
  });
});

describe("currentChallengeDay", () => {
  it("is day 1 right after starting", () => {
    expect(currentChallengeDay(new Date().toISOString())).toBe(1);
  });
  it("clamps to the final day once the pace has passed", () => {
    const longAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString();
    expect(currentChallengeDay(longAgo)).toBe(14);
    expect(currentChallengeDay(longAgo, 7)).toBe(7);
  });
});

describe("currentStreak", () => {
  it("is 0 with no activity", () => {
    expect(currentStreak(new Set())).toBe(0);
  });
  it("counts consecutive days ending today", () => {
    const today = new Date();
    const ymd = (d: Date) => d.toLocaleDateString("en-CA");
    const dayMs = 24 * 60 * 60 * 1000;
    const dates = new Set([
      ymd(today),
      ymd(new Date(today.getTime() - dayMs)),
      ymd(new Date(today.getTime() - 2 * dayMs)),
    ]);
    expect(currentStreak(dates)).toBe(3);
  });
  it("stops counting at a gap of two days", () => {
    const today = new Date();
    const ymd = (d: Date) => d.toLocaleDateString("en-CA");
    const dayMs = 24 * 60 * 60 * 1000;
    const dates = new Set([ymd(today), ymd(new Date(today.getTime() - 3 * dayMs))]);
    expect(currentStreak(dates)).toBe(1);
  });
  it("forgives one missed day, but not two within a week", () => {
    const now = new Date(2026, 9, 20, 12);
    const day = (n: number) => new Date(now.getTime() - n * 86_400_000).toLocaleDateString("en-CA");
    // Active today, 2, 3 days ago: yesterday is forgiven.
    const one = streakInfo(new Set([day(0), day(2), day(3)]), now);
    expect(one).toMatchObject({ streak: 3, forgiven: [day(1)], graceReady: false });
    // A second slip four days earlier is inside the same week, so the run ends there.
    const two = streakInfo(new Set([day(0), day(2), day(4)]), now);
    expect(two.streak).toBe(2);
    // Slips a week apart are both forgiven.
    const spaced = streakInfo(new Set([day(0), day(2), day(3), day(4), day(5), day(6), day(7), day(8), day(10)]), now);
    expect(spaced.forgiven).toEqual([day(1), day(9)]);
  });
  it("keeps the streak alive when today is still open and yesterday was missed", () => {
    const now = new Date(2026, 9, 20, 12);
    const day = (n: number) => new Date(now.getTime() - n * 86_400_000).toLocaleDateString("en-CA");
    expect(streakInfo(new Set([day(2), day(3)]), now).streak).toBe(2);
  });
  it("is ready to forgive again once a week has passed", () => {
    const now = new Date(2026, 9, 20, 12);
    const day = (n: number) => new Date(now.getTime() - n * 86_400_000).toLocaleDateString("en-CA");
    const dates = new Set([day(0), day(1), day(2), day(3), day(4), day(5), day(6), day(7), day(9), day(10)]);
    expect(streakInfo(dates, now).graceReady).toBe(true);
  });
});

describe("activityDates", () => {
  it("collects dates from module views, tracker entries, and exam/quiz results", () => {
    const s = emptySnapshot({
      moduleViews: [{ section: "introduction", moduleIndex: 0, viewedAt: "2026-01-01T10:00:00Z" }],
      incomeStreams: [
        { id: "1", name: "a", category: "Other", amount: 1, cadence: "monthly", notes: null, createdAt: "2026-01-02T10:00:00Z" },
      ],
      profile: {
        userId: "u1",
        role: "free",
        displayName: null,
      fullName: null,
        examPassedAt: "2026-01-03T10:00:00Z",
        examBestScore: 50,
        challengeStartedAt: null,
    leaderStatus: "none",
      },
    });
    const dates = activityDates(s);
    expect(dates.size).toBe(3);
  });
});
