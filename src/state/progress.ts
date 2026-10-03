import type { CourseProgress, CourseSnapshot, ModuleSection, RiverNumber, RiverStatus } from "../types";
import { LESSONS } from "../content/lessons";

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

/** Admins and the demo account see everything unlocked: every river, quiz,
 * the final exam, the dashboard, and the certificate. Progress itself is
 * never faked — this only lifts the gates in front of it. */
export function hasFullAccess(snapshot: CourseSnapshot): boolean {
  return snapshot.profile.role === "admin" || !!snapshot.profile.fullAccess;
}

/** Whether a river's quiz can be opened: normally once the river is complete. */
export function canOpenQuiz(snapshot: CourseSnapshot, river: RiverNumber): boolean {
  return hasFullAccess(snapshot) || deriveRiverStatus(snapshot, river) === "complete";
}

/** A river is unlocked if it's the first, or the previous river is complete
 * AND its quiz has been passed. */
export function isRiverUnlocked(snapshot: CourseSnapshot, river: RiverNumber): boolean {
  if (river === 1 || hasFullAccess(snapshot)) return true;
  const prev = (river - 1) as RiverNumber;
  return deriveRiverStatus(snapshot, prev) === "complete" && hasPassedRiverQuiz(snapshot.progress, prev);
}

/** Latest of the four rivers' completedAt timestamps — when the course as a
 * whole actually finished, not just "today" (which could be a later revisit). */
export function courseCompletedDate(progress: CourseProgress[]): string | null {
  const dates = ([1, 2, 3, 4] as RiverNumber[])
    .map((r) => progressForRiver(progress, r).completedAt)
    .filter((d): d is string => !!d);
  if (dates.length === 0) return null;
  return dates.reduce((latest, d) => (d > latest ? d : latest));
}

export function isCourseComplete(snapshot: CourseSnapshot): boolean {
  return ([1, 2, 3, 4] as RiverNumber[]).every(
    (r) => deriveRiverStatus(snapshot, r) === "complete"
  );
}

/** How many distinct modules of a section (a river, or the introduction)
 * have been marked read, from the server-backed module_views ledger. */
export function viewedModuleCount(snapshot: CourseSnapshot, section: ModuleSection): number {
  return new Set(
    snapshot.moduleViews.filter((v) => v.section === section).map((v) => v.moduleIndex)
  ).size;
}

export function isModuleViewed(
  snapshot: CourseSnapshot,
  section: ModuleSection,
  moduleIndex: number
): boolean {
  return snapshot.moduleViews.some((v) => v.section === section && v.moduleIndex === moduleIndex);
}

/** Whether every module in every river has been explicitly marked as read,
 * not just the server-side lesson-viewed flag used by `deriveRiverStatus`.
 * This is stricter: re-clicking through modules is a quick, low-cost thing
 * to ask of someone retaking the final exam who somehow skipped some. */
export function allRiverModulesMarkedComplete(snapshot: CourseSnapshot): boolean {
  return ([1, 2, 3, 4] as RiverNumber[]).every(
    (r) => viewedModuleCount(snapshot, r) >= LESSONS[r].lessons.length
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
    hasFullAccess(snapshot) ||
    isCourseComplete(snapshot) &&
    allRiverModulesMarkedComplete(snapshot) &&
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
