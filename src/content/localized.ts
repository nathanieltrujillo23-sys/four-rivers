import type { Lang } from "../i18n/LanguageContext";
import type { Lesson, RiverContent, RiverNumber } from "../types";
import { INTRODUCTION, LESSONS, type IntroductionContent } from "./lessons";
import { INTRODUCTION_TEXT_ES, RIVER_TEXT_ES } from "./es";
import type { LessonText } from "./es/types";

function mergeLessons(base: Lesson[], text: LessonText[] | undefined): Lesson[] {
  if (!text || text.length !== base.length) return base;
  return base.map((lesson, i) => ({ ...lesson, title: text[i].title, body: text[i].body }));
}

/** The introduction in the chosen language (English whenever a translation is missing). */
export function localizedIntroduction(lang: Lang): IntroductionContent {
  if (lang !== "es" || !INTRODUCTION_TEXT_ES) return INTRODUCTION;
  const t = INTRODUCTION_TEXT_ES;
  return { ...INTRODUCTION, title: t.title, intro: t.intro, lessons: mergeLessons(INTRODUCTION.lessons, t.lessons) };
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
