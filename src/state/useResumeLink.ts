import { useOptionalCourse } from "./CourseContext";
import { RIVERS } from "../theme/theme";
import { INTRODUCTION } from "../content/lessons";
import { deriveRiverStatus, hasPassedRiverQuiz, isCourseComplete, isRiverUnlocked } from "./progress";
import { readViewedCount } from "./useModuleProgress";
import type { RiverNumber } from "../types";

export interface ResumeLink {
  to: string;
  label: string;
}

/**
 * Where "Continue" in the nav should go: the next thing actually worth doing,
 * skipping the usual Course → River → Module clicking. Coarse on purpose —
 * it points at the introduction or a river's overview page rather than a
 * specific module, since that page already shows exactly what's left (read
 * more modules, log a tracker entry, take the quiz) once you land on it.
 * Returns null when there's no signed-in course to resume (e.g. on the
 * landing page), so callers can simply not render anything.
 */
export function useResumeLink(): ResumeLink | null {
  const snapshot = useOptionalCourse()?.snapshot ?? null;
  if (!snapshot) return null;

  if (readViewedCount("introduction") < INTRODUCTION.lessons.length) {
    return { to: "/course/introduction", label: "Continue" };
  }

  for (const r of RIVERS) {
    const river = r.number as RiverNumber;
    if (!isRiverUnlocked(snapshot, river)) continue;
    const status = deriveRiverStatus(snapshot, river);
    const quizPassed = hasPassedRiverQuiz(snapshot.progress, river);
    if (status !== "complete" || !quizPassed) {
      return { to: `/course/river/${river}`, label: "Continue" };
    }
  }

  if (isCourseComplete(snapshot)) {
    return { to: "/dashboard", label: "Dashboard" };
  }
  return { to: "/course", label: "Continue" };
}
