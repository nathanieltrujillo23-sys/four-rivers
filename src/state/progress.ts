import type { CourseProgress, CourseSnapshot, RiverNumber, RiverStatus } from "../types";

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

/** A river is unlocked if it's the first, or the previous river is complete. */
export function isRiverUnlocked(snapshot: CourseSnapshot, river: RiverNumber): boolean {
  if (river === 1) return true;
  return deriveRiverStatus(snapshot, (river - 1) as RiverNumber) === "complete";
}

export function isCourseComplete(snapshot: CourseSnapshot): boolean {
  return ([1, 2, 3, 4] as RiverNumber[]).every(
    (r) => deriveRiverStatus(snapshot, r) === "complete"
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
