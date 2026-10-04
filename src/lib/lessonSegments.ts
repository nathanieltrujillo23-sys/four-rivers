import type { Lesson, ScriptureRef, Translation } from "../types";
import type { Lang } from "../i18n/LanguageContext";
import { localizeReference } from "../i18n/books";
import { SPANISH_VERSION, SPANISH_VERSION_NAME, spanishVerseText } from "../content/scriptureEs";

/**
 * A lesson is read aloud as an ordered list of segments (title, each
 * paragraph, then each verse). The same keys are used to highlight the
 * segment being spoken, so LessonPanel and the reader always agree.
 */
export const segKey = {
  title: "title",
  para: (p: number) => `p${p}`,
  versePrefix: "v",
};

export interface Segment {
  key: string;
  text: string;
  scripture: boolean;
}

const TRANSLATION_NAME: Record<Translation, string> = {
  KJV: "King James Version",
  NIV: "New International Version",
  NLT: "New Living Translation",
  ESV: "English Standard Version",
};

/** "1 Corinthians 4:2" -> "First Corinthians 4, verse 2", so voices read it naturally. */
export function speakReference(reference: string): string {
  return reference
    .replace(/^1 /, "First ")
    .replace(/^2 /, "Second ")
    .replace(/^3 /, "Third ")
    .replace(/(\d+):(\d+)[-–](\d+)/, "$1, verses $2 through $3")
    .replace(/(\d+):(\d+)/, "$1, verse $2");
}

/** "Génesis 2:10" -> "Génesis 2, versículo 10", so Spanish voices read it naturally. */
export function speakReferenceEs(reference: string): string {
  return localizeReference(reference, "es")
    .replace(/^1 /, "Primera de ")
    .replace(/^2 /, "Segunda de ")
    .replace(/(\d+):(\d+)[-–](\d+)/, "$1, versículos $2 al $3")
    .replace(/(\d+):(\d+)/, "$1, versículo $2");
}

export function speakVerse(verse: ScriptureRef, lang: Lang = "en"): string {
  const spanish = lang === "es" ? spanishVerseText(verse.reference, verse.translation) : null;
  if (spanish) {
    const text = spanish.replace(/…/g, "").replace(/\s+/g, " ").trim();
    return `${speakReferenceEs(verse.reference)}, ${SPANISH_VERSION_NAME[SPANISH_VERSION[verse.translation]]}. ${text}`;
  }
  const text = verse.text.replace(/…/g, "").replace(/\s+/g, " ").trim();
  return `${speakReference(verse.reference)}, ${TRANSLATION_NAME[verse.translation]}. ${text}`;
}

export function buildSegments(lesson: Lesson, lang: Lang = "en"): Segment[] {
  const out: Segment[] = [{ key: segKey.title, text: `${lesson.title}.`, scripture: false }];
  lesson.body.forEach((para, p) =>
    out.push({ key: segKey.para(p), text: para, scripture: false })
  );
  lesson.scriptureRefs.forEach((v, i) =>
    out.push({ key: `${segKey.versePrefix}-${i}`, text: speakVerse(v, lang), scripture: true })
  );
  return out;
}

/**
 * Split long text into sentence-sized chunks. Browsers cut off long utterances
 * (Chrome stops after roughly 15 seconds), so we speak short pieces in a row.
 */
export function splitIntoChunks(text: string, maxLen = 220): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    if (current && current.length + sentence.length + 1 > maxLen) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
