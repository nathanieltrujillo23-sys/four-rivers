import type { Lang } from "../i18n/LanguageContext";
import type { Lesson, RiverContent, RiverNumber } from "../types";
import { INTRODUCTION, LESSONS, type IntroductionContent } from "./lessons";
import { INTRODUCTION_TEXT_ES, RIVER_TEXT_ES } from "./es";
import type { LessonText } from "./es/types";
import { EXAM_QUESTIONS } from "./exam";
import { INTRO_QUIZ } from "./introQuiz";
import { QUIZZES, type QuizQuestion } from "./quizzes";
import { EXAM_ES, INTRO_QUIZ_ES, QUIZZES_ES, type QuestionText } from "./es/quizzes";

function mergeLessons(base: Lesson[], text: LessonText[] | undefined): Lesson[] {
  if (!text || text.length !== base.length) return base;
  return base.map((lesson, i) => ({ ...lesson, title: text[i].title, body: text[i].body }));
}

/** The introduction in the chosen language (English whenever a translation is missing). */
export function localizedIntroduction(lang: Lang): IntroductionContent {
  if (lang !== "es" || !INTRODUCTION_TEXT_ES) return INTRODUCTION;
  const t = INTRODUCTION_TEXT_ES;
  return {
    ...INTRODUCTION,
    title: t.title,
    intro: t.intro,
    lessons: mergeLessons(INTRODUCTION.lessons, t.lessons),
  };
}

/** One river's content in the chosen language (English whenever a translation is missing). */
export function localizedRiver(n: RiverNumber, lang: Lang): RiverContent {
  const base = LESSONS[n];
  const t = lang === "es" ? RIVER_TEXT_ES[n] : undefined;
  if (!t) return base;
  return {
    ...base,
    title: t.title,
    intro: t.intro,
    practicePrompt: t.practicePrompt,
    lessons: mergeLessons(base.lessons, t.lessons),
  };
}

function mergeQuestions(base: QuizQuestion[], text: QuestionText[] | undefined): QuizQuestion[] {
  if (!text || text.length !== base.length) return base;
  return base.map((q, i) =>
    text[i].options.length === q.options.length
      ? { ...q, question: text[i].question, options: text[i].options }
      : q,
  );
}

export function localizedQuiz(n: RiverNumber, lang: Lang): QuizQuestion[] {
  return lang === "es" ? mergeQuestions(QUIZZES[n], QUIZZES_ES[n]) : QUIZZES[n];
}

export function localizedExam(lang: Lang): QuizQuestion[] {
  return lang === "es" ? mergeQuestions(EXAM_QUESTIONS, EXAM_ES) : EXAM_QUESTIONS;
}

export function localizedIntroQuiz(lang: Lang): QuizQuestion[] {
  return lang === "es" ? mergeQuestions(INTRO_QUIZ, INTRO_QUIZ_ES) : INTRO_QUIZ;
}
