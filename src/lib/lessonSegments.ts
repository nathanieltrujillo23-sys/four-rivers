import type { Lesson, ScriptureRef, Translation } from "../types";

/**
 * A lesson is read aloud as an ordered list of segments (title, intro, each
 * heading, paragraph, and verse). The same keys are used to highlight the
 * segment being spoken, so LessonPanel and the reader always agree.
 */
export const segKey = {
  title: "title",
  intro: "intro",
  introVersePrefix: "intro-v",
  heading: (s: number) => `s${s}-h`,
  para: (s: number, p: number) => `s${s}-p${p}`,
  versePrefix: (s: number) => `s${s}-v`,
};

export interface Segment {
  key: string;
  text: string;
  /** Index of the lesson section this belongs to; -1 for title/intro. */
  section: number;
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

export function speakVerse(verse: ScriptureRef): string {
  const text = verse.text.replace(/…/g, "").replace(/\s+/g, " ").trim();
  return `${speakReference(verse.reference)}, ${TRANSLATION_NAME[verse.translation]}. ${text}`;
}

export function buildSegments(lesson: Lesson): Segment[] {
  const out: Segment[] = [
    {
      key: segKey.title,
      text: `River ${lesson.riverNumber}. ${lesson.title}.`,
      section: -1,
      scripture: false,
    },
    { key: segKey.intro, text: lesson.intro, section: -1, scripture: false },
  ];
  lesson.introScripture.forEach((v, i) =>
    out.push({
      key: `${segKey.introVersePrefix}-${i}`,
      text: speakVerse(v),
      section: -1,
      scripture: true,
    })
  );
  lesson.sections.forEach((sec, s) => {
    out.push({ key: segKey.heading(s), text: `${sec.heading}.`, section: s, scripture: false });
    sec.body.forEach((para, p) =>
      out.push({ key: segKey.para(s, p), text: para, section: s, scripture: false })
    );
    sec.scriptureRefs.forEach((v, k) =>
      out.push({
        key: `${segKey.versePrefix(s)}-${k}`,
        text: speakVerse(v),
        section: s,
        scripture: true,
      })
    );
  });
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
