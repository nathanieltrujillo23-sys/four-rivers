import type { Lang } from "../i18n/LanguageContext";
import type { ModuleSection } from "../types";
import { EXPLANATIONS, type ExplanationSet } from "./explanations";
import { EXPLANATIONS_ES } from "./es/explanations";
import { localizedIntroduction, localizedRiver } from "./localized";
import { localizedVerse } from "./scriptureEs";

export interface ShownExplanation {
  why: string;
  lessonTitle: string;
  /** Where to read the lesson again. */
  href: string;
  verse: { text: string; reference: string; version: string } | null;
}

/** The explanation for question `index` of a quiz or the exam, in the reader's language (null if there is none). */
export function explanationFor(set: ExplanationSet, index: number, lang: Lang): ShownExplanation | null {
  const e = EXPLANATIONS[set]?.[index];
  if (!e) return null;
  const lessons = e.section === "introduction" ? localizedIntroduction(lang).lessons : localizedRiver(e.section, lang).lessons;
  const lesson = lessons[e.lesson];
  const verseRef = lesson?.scriptureRefs[e.verse] ?? lesson?.scriptureRefs[0];
  return {
    why: (lang === "es" ? EXPLANATIONS_ES[set]?.[index] : undefined) ?? e.why,
    lessonTitle: lesson?.title ?? "",
    href: lessonHref(e.section, e.lesson),
    verse: verseRef ? localizedVerse(verseRef, lang) : null,
  };
}

export function lessonHref(section: ModuleSection, lesson: number): string {
  return section === "introduction"
    ? `/course/introduction/module/${lesson + 1}`
    : `/course/river/${section}/module/${lesson + 1}`;
}
