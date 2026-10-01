import { describe, expect, it } from "vitest";
import type { CourseProgress, CourseSnapshot, RiverNumber } from "../types";
import {
  allRiverModulesMarkedComplete,
  allRiverQuizzesPassed,
  canTakeFinalExam,
  courseCompletedDate,
  deriveRiverStatus,
  entryCountForRiver,
  hasPassedRiverQuiz,
  isCourseComplete,
  isModuleViewed,
  isRiverUnlocked,
  progressForRiver,
  reconcileCompletedAt,
  viewedModuleCount,
} from "./progress";
import { LESSONS } from "../content/lessons";

function emptyProgress(river: RiverNumber): CourseProgress {
  return { riverNumber: river, lessonViewedAt: null, completedAt: null, quizPassedAt: null, quizBestScore: null };
}

function snapshot(overrides: Partial<CourseSnapshot> = {}): CourseSnapshot {
  return {
    profile: { userId: "u1", role: "free", displayName: null, examPassedAt: null, examBestScore: null },
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

describe("entryCountForRiver", () => {
  it("counts the right ledger per river", () => {
    const s = snapshot({
      incomeStreams: [{ id: "1", name: "a", category: "Other", amount: 1, cadence: "monthly", notes: null, createdAt: "t" }],
      givingEntries: [
        { id: "2", recipient: "a", amount: 1, notes: null, createdAt: "t" },
        { id: "3", recipient: "b", amount: 1, notes: null, createdAt: "t" },
      ],
    });
    expect(entryCountForRiver(s, 1)).toBe(1);
    expect(entryCountForRiver(s, 2)).toBe(0);
    expect(entryCountForRiver(s, 4)).toBe(2);
  });
});

describe("progressForRiver", () => {
  it("returns a default empty row when none exists yet", () => {
    expect(progressForRiver([], 2)).toEqual(emptyProgress(2));
  });
  it("finds the matching row", () => {
    const row = { ...emptyProgress(3), lessonViewedAt: "t" };
    expect(progressForRiver([row], 3)).toBe(row);
  });
});

describe("deriveRiverStatus", () => {
  it("is not_started with neither condition met", () => {
    expect(deriveRiverStatus(snapshot(), 1)).toBe("not_started");
  });
  it("is in_progress with only the lesson viewed", () => {
    const s = snapshot({ progress: [{ ...emptyProgress(1), lessonViewedAt: "t" }] });
    expect(deriveRiverStatus(s, 1)).toBe("in_progress");
  });
  it("is in_progress with only an entry logged", () => {
    const s = snapshot({
      incomeStreams: [{ id: "1", name: "a", category: "Other", amount: 1, cadence: "monthly", notes: null, createdAt: "t" }],
    });
    expect(deriveRiverStatus(s, 1)).toBe("in_progress");
  });
  it("is complete once both conditions are met", () => {
    const s = snapshot({
      progress: [{ ...emptyProgress(1), lessonViewedAt: "t" }],
      incomeStreams: [{ id: "1", name: "a", category: "Other", amount: 1, cadence: "monthly", notes: null, createdAt: "t" }],
    });
    expect(deriveRiverStatus(s, 1)).toBe("complete");
  });
  it("stays complete once completedAt is stamped, even if entries are later removed", () => {
    const s = snapshot({ progress: [{ ...emptyProgress(1), completedAt: "t" }] });
    expect(deriveRiverStatus(s, 1)).toBe("complete");
  });
});

describe("hasPassedRiverQuiz", () => {
  it("is true once quizPassedAt is set", () => {
    const p = [{ ...emptyProgress(1), quizPassedAt: "2026-10-05T00:00:00Z" }];
    expect(hasPassedRiverQuiz(p, 1)).toBe(true);
  });
  it("is grandfathered true for a river completed before the quiz gate launch", () => {
    const p = [{ ...emptyProgress(1), completedAt: "2026-09-01T00:00:00Z" }];
    expect(hasPassedRiverQuiz(p, 1)).toBe(true);
  });
  it("is false for a river completed after the gate launch without a passed quiz", () => {
    const p = [{ ...emptyProgress(1), completedAt: "2026-10-05T00:00:00Z" }];
    expect(hasPassedRiverQuiz(p, 1)).toBe(false);
  });
  it("is false with no completion and no quiz", () => {
    expect(hasPassedRiverQuiz([], 1)).toBe(false);
  });
});

describe("isRiverUnlocked", () => {
  it("river 1 is always unlocked", () => {
    expect(isRiverUnlocked(snapshot(), 1)).toBe(true);
  });
  it("river 2 is locked until river 1 is complete and its quiz passed", () => {
    expect(isRiverUnlocked(snapshot(), 2)).toBe(false);
    const s = snapshot({ progress: [{ ...emptyProgress(1), completedAt: "t", quizPassedAt: "t" }] });
    expect(isRiverUnlocked(s, 2)).toBe(true);
  });
  it("river 2 stays locked if river 1 is complete but its quiz isn't passed (post-launch)", () => {
    const s = snapshot({ progress: [{ ...emptyProgress(1), completedAt: "2026-10-05T00:00:00Z" }] });
    expect(isRiverUnlocked(s, 2)).toBe(false);
  });
});

describe("courseCompletedDate", () => {
  it("is null with no completed rivers at all", () => {
    expect(courseCompletedDate([])).toBeNull();
  });
  it("is the latest of the four completedAt dates", () => {
    const p = ([1, 2, 3, 4] as RiverNumber[]).map((r) => ({
      ...emptyProgress(r),
      completedAt: `2026-0${r}-01T00:00:00Z`,
    }));
    expect(courseCompletedDate(p)).toBe("2026-04-01T00:00:00Z");
  });
});

describe("isCourseComplete", () => {
  it("requires all four rivers complete", () => {
    const complete = (r: RiverNumber) => ({ ...emptyProgress(r), completedAt: "t" });
    expect(isCourseComplete(snapshot({ progress: [1, 2, 3].map((r) => complete(r as RiverNumber)) }))).toBe(false);
    expect(isCourseComplete(snapshot({ progress: [1, 2, 3, 4].map((r) => complete(r as RiverNumber)) }))).toBe(true);
  });
});

describe("allRiverQuizzesPassed", () => {
  it("requires every river's quiz satisfied", () => {
    const grandfathered = ([1, 2, 3] as RiverNumber[]).map((r) => ({
      ...emptyProgress(r),
      completedAt: "2026-01-01T00:00:00Z",
    }));
    expect(allRiverQuizzesPassed(grandfathered)).toBe(false);
    const all = [...grandfathered, { ...emptyProgress(4), completedAt: "2026-01-01T00:00:00Z" }];
    expect(allRiverQuizzesPassed(all)).toBe(true);
  });
});

describe("viewedModuleCount / isModuleViewed", () => {
  it("counts distinct module indices per section", () => {
    const s = snapshot({
      moduleViews: [
        { section: 1, moduleIndex: 0 },
        { section: 1, moduleIndex: 0 },
        { section: 1, moduleIndex: 1 },
        { section: "introduction", moduleIndex: 0 },
      ],
    });
    expect(viewedModuleCount(s, 1)).toBe(2);
    expect(viewedModuleCount(s, 2)).toBe(0);
    expect(viewedModuleCount(s, "introduction")).toBe(1);
    expect(isModuleViewed(s, 1, 1)).toBe(true);
    expect(isModuleViewed(s, 1, 2)).toBe(false);
  });
});

describe("allRiverModulesMarkedComplete / canTakeFinalExam", () => {
  function allModulesViewed(): CourseSnapshot["moduleViews"] {
    return ([1, 2, 3, 4] as RiverNumber[]).flatMap((r) =>
      LESSONS[r].lessons.map((_, i) => ({ section: r, moduleIndex: i }))
    );
  }

  it("is false until every module in every river is marked read", () => {
    const s = snapshot({ moduleViews: [{ section: 1, moduleIndex: 0 }] });
    expect(allRiverModulesMarkedComplete(s)).toBe(false);
  });

  it("is true once every module in every river is marked read", () => {
    const s = snapshot({ moduleViews: allModulesViewed() });
    expect(allRiverModulesMarkedComplete(s)).toBe(true);
  });

  it("canTakeFinalExam requires completion, modules read, AND quizzes passed together", () => {
    const complete = ([1, 2, 3, 4] as RiverNumber[]).map((r) => ({
      ...emptyProgress(r),
      completedAt: "2026-01-01T00:00:00Z", // grandfathered quiz pass
    }));
    const courseDoneOnly = snapshot({ progress: complete });
    expect(canTakeFinalExam(courseDoneOnly)).toBe(false); // modules not marked read

    const everything = snapshot({ progress: complete, moduleViews: allModulesViewed() });
    expect(canTakeFinalExam(everything)).toBe(true);
  });
});

describe("reconcileCompletedAt", () => {
  it("returns undefined if already completed (sticky)", () => {
    const s = snapshot({ progress: [{ ...emptyProgress(1), completedAt: "t" }] });
    expect(reconcileCompletedAt(s, 1)).toBeUndefined();
  });
  it("returns undefined if only one condition is met", () => {
    const s = snapshot({ progress: [{ ...emptyProgress(1), lessonViewedAt: "t" }] });
    expect(reconcileCompletedAt(s, 1)).toBeUndefined();
  });
  it("returns a fresh completedAt once both conditions are met for the first time", () => {
    const s = snapshot({
      progress: [{ ...emptyProgress(1), lessonViewedAt: "t" }],
      incomeStreams: [{ id: "1", name: "a", category: "Other", amount: 1, cadence: "monthly", notes: null, createdAt: "t" }],
    });
    const result = reconcileCompletedAt(s, 1);
    expect(result).toBeDefined();
    expect(typeof result!.completedAt).toBe("string");
  });
});
