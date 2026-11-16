import type { CourseSnapshot, RiverNumber } from "../types";
import { QUIZ_QUESTION_COUNT } from "../content/quizzes";

/** Spaced review (Update 40): a river's questions come back this many days after its quiz was passed. */
export const REVIEW_DAYS = [1, 7, 30] as const;
export const REVIEW_SIZE = 3;
const DAY = 86_400_000;

export interface QuizReview {
  river: RiverNumber;
  round: 1 | 2 | 3;
  score: number;
  doneAt: string;
}

export interface DueReview {
  river: RiverNumber;
  round: 1 | 2 | 3;
  dueAt: string;
  /** Indexes into the river's quiz. */
  questions: number[];
}

/**
 * Which questions a round asks: every third question, starting at a different one each round, so the three rounds
 * cover nine of the ten and reach across the whole river rather than one lesson.
 */
export function reviewQuestions(round: 1 | 2 | 3, count: number = QUIZ_QUESTION_COUNT): number[] {
  const picked: number[] = [];
  for (let i = round - 1; i < count && picked.length < REVIEW_SIZE; i += 3) picked.push(i);
  return picked;
}

/** Every review that is due now and not done, earliest first. */
export function dueReviews(snapshot: CourseSnapshot, done: QuizReview[], now: number = Date.now()): DueReview[] {
  const finished = new Set(done.map((d) => `${d.river}:${d.round}`));
  const out: DueReview[] = [];
  for (const p of snapshot.progress) {
    if (!p.quizPassedAt) continue;
    const passed = new Date(p.quizPassedAt).getTime();
    REVIEW_DAYS.forEach((days, i) => {
      const round = (i + 1) as 1 | 2 | 3;
      const due = passed + days * DAY;
      if (due <= now && !finished.has(`${p.riverNumber}:${round}`)) {
        out.push({ river: p.riverNumber, round, dueAt: new Date(due).toISOString(), questions: reviewQuestions(round) });
      }
    });
  }
  return out.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}
