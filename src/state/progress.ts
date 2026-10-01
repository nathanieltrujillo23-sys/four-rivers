import type { CourseProgress, CourseSnapshot, RiverNumber, RiverStatus } from "../types";
import { LESSONS } from "../content/lessons";
import { readViewedCount } from "./useModuleProgress";

/**
 * Completion rule (single source of truth):
 *
 *   A river is COMPLETE when BOTH:
 *     1. its lesson has been viewed (lesson_viewed_at is set), AND
 *     2. at least one entry has been logged in its companion tracker.
 *
 *   IN_PROGRESS  = exactly one of the two conditions met.
 *   NOT_STARTED  = neither.
 *
 * `completed_at` on course_progress is a timestamp set the first moment both
 * conditions hold. It is STICKY: once a river is complete it stays complete, so
 * logging and deleting entries afterwards (the ongoing Dashboard use) never
 * locks people out of the Dashboard or re-locks later rivers. Status itself is
 * never stored — always derived here.
 */

export function entryCountForRiver(snapshot: CourseSnapshot, river: RiverNumber): number {
  switch (river) {
    case 1:
      return snapshot.incomeStreams.length;
    case 2:
      return snapshot.savingsContributions.length;
    case 3:
      return snapshot.investmentEntries.length;
    case 4:
      return snapshot.givingEntries.length;
  }
}

export function progressForRiver(
  progress: CourseProgress[],
  river: RiverNumber
): CourseProgress {
  return (
    progress.find((p) => p.riverNumber === river) ?? {
      riverNumber: river,
      lessonViewedAt: null,
      completedAt: null,
      quizPassedAt: null,
      quizBestScore: null,
    }
  );
}

export function deriveRiverStatus(
  snapshot: CourseSnapshot,
  river: RiverNumber
): RiverStatus {
  const p = progressForRiver(snapshot.progress, river);
  if (p.completedAt) return "complete";
  const lessonViewed = !!p.lessonViewedAt;
  const hasEntry = entryCountForRiver(snapshot, river) > 0;
  if (lessonViewed && hasEntry) return "complete";
  if (lessonViewed || hasEntry) return "in_progress";
  return "not_started";
}

/**
 * Quizzes shipped after rivers already existed. Grandfathering anything
 * completed before this date means shipping them doesn't retroactively
 * re-lock rivers people had already finished — only rivers completed from
 * here on need a passed quiz to unlock the next one.
 */
const QUIZ_GATE_LAUNCH = "2026-10-01T00:00:00Z";

/** Whether this river's quiz requirement is satisfied, for `isRiverUnlocked`
 * and for the river page's own "what's left" checklist. */
export function hasPassedRiverQuiz(progress: CourseProgress[], river: RiverNumber): boolean {
  const p = progressForRiver(progress, river);
  if (p.quizPassedAt) return true;
  return !!p.completedAt && p.completedAt < QUIZ_GATE_LAUNCH;
}

/** A river is unlocked if it's the first, or the previous river is complete
 * AND its quiz has been passed. */
export function isRiverUnlocked(snapshot: CourseSnapshot, river: RiverNumber): boolean {
  if (river === 1) return true;
  const prev = (river - 1) as RiverNumber;
  return deriveRiverStatus(snapshot, prev) === "complete" && hasPassedRiverQuiz(snapshot.progress, prev);
}

export function isCourseComplete(snapshot: CourseSnapshot): boolean {
  return ([1, 2, 3, 4] as RiverNumber[]).every(
    (r) => deriveRiverStatus(snapshot, r) === "complete"
  );
}

/** Whether every module in every river has been explicitly marked as read
 * (the client-side "modules read" tracker), not just the server-side
 * lesson-viewed flag used by `deriveRiverStatus`. This is stricter and
 * per-browser; re-clicking through modules on a new browser is a quick,
 * low-cost thing to ask of someone retaking the final exam. */
export function allRiverModulesMarkedComplete(): boolean {
  return ([1, 2, 3, 4] as RiverNumber[]).every(
    (r) => readViewedCount(r) >= LESSONS[r].lessons.length
  );
}

/** Whether all four river quizzes have been passed (grandfather-aware, same
 * rule used to unlock the next river). */
export function allRiverQuizzesPassed(progress: CourseProgress[]): boolean {
  return ([1, 2, 3, 4] as RiverNumber[]).every((r) => hasPassedRiverQuiz(progress, r));
}

/** The final exam requires more than the ledger's "complete" status: every
 * module must be explicitly marked read, and every river quiz passed. */
export function canTakeFinalExam(snapshot: CourseSnapshot): boolean {
  return (
    isCourseComplete(snapshot) &&
    allRiverModulesMarkedComplete() &&
    allRiverQuizzesPassed(snapshot.progress)
  );
}

/**
 * After any change, work out whether `completed_at` needs to be stamped for a
 * river. Returns the value to persist, or `undefined` if no write is needed.
 * Completion is sticky, so this only ever sets the timestamp — never clears it.
 */
export function reconcileCompletedAt(
  snapshot: CourseSnapshot,
  river: RiverNumber
): { completedAt: string } | undefined {
  const p = progressForRiver(snapshot.progress, river);
  if (p.completedAt) return undefined;
  const hasBoth = !!p.lessonViewedAt && entryCountForRiver(snapshot, river) > 0;
  return hasBoth ? { completedAt: new Date().toISOString() } : undefined;
}
