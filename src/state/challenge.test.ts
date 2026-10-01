import { describe, expect, it } from "vitest";
import {
  CHALLENGE_LENGTH_DAYS,
  activityDates,
  currentChallengeDay,
  currentStreak,
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
      examPassedAt: null,
      examBestScore: null,
      challengeStartedAt: null,
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
  it("produces exactly 30 days, numbered 1 through 30", () => {
    const plan = generateChallengePlan();
    expect(plan).toHaveLength(CHALLENGE_LENGTH_DAYS);
    expect(plan.map((d) => d.day)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it("puts the final exam alone on day 30, and nothing else references it", () => {
    const plan = generateChallengePlan();
    const lastDay = plan[plan.length - 1];
    expect(lastDay.day).toBe(30);
    expect(lastDay.items).toHaveLength(1);
    expect(lastDay.items[0].to).toBe("/course/exam");
    for (const day of plan.slice(0, -1)) {
      expect(day.items.every((item) => item.to !== "/course/exam")).toBe(true);
    }
  });

  it("spreads every non-exam item across the first 29 days with none empty", () => {
    const plan = generateChallengePlan();
    for (const day of plan.slice(0, -1)) {
      expect(day.items.length).toBeGreaterThan(0);
    }
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
  it("clamps to the final day once the challenge window has passed", () => {
    const longAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString();
    expect(currentChallengeDay(longAgo)).toBe(30);
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
  it("stops counting at the first gap", () => {
    const today = new Date();
    const ymd = (d: Date) => d.toLocaleDateString("en-CA");
    const dayMs = 24 * 60 * 60 * 1000;
    const dates = new Set([ymd(today), ymd(new Date(today.getTime() - 2 * dayMs))]); // gap at yesterday
    expect(currentStreak(dates)).toBe(1);
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
        examPassedAt: "2026-01-03T10:00:00Z",
        examBestScore: 50,
        challengeStartedAt: null,
      },
    });
    const dates = activityDates(s);
    expect(dates.size).toBe(3);
  });
});
