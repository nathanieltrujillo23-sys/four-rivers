import type { RiverNumber } from "../../types";

/**
 * Spanish question text, in the same order as the English quizzes. Only the
 * wording is here: which option is correct stays in the English data, so the
 * two languages can never disagree about the answer.
 */
export interface QuestionText {
  question: string;
  options: string[];
}

export const QUIZZES_ES: Partial<Record<RiverNumber, QuestionText[]>> = {};
export const EXAM_ES: QuestionText[] | undefined = undefined;
export const INTRO_QUIZ_ES: QuestionText[] | undefined = undefined;
