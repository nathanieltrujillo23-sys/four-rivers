import type { Lesson, ModuleSection } from "../types";

export interface LessonHit {
  section: ModuleSection;
  moduleIndex: number;
  title: string;
  /** A short piece of the lesson around the first match, with the matched words wrapped in {{ }}. */
  snippet: string;
  score: number;
}

export interface SearchableSection {
  section: ModuleSection;
  lessons: Lesson[];
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Splits a query into words (accents and case ignored), dropping anything under two letters. */
export function queryWords(query: string): string[] {
  return norm(query)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2);
}

function snippetFor(text: string, words: string[]): string {
  const flat = norm(text);
  let at = -1;
  for (const w of words) {
    const i = flat.indexOf(w);
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  if (at < 0) return text.slice(0, 140);
  const start = Math.max(0, at - 60);
  const end = Math.min(text.length, at + 120);
  let out = text.slice(start, end);
  // Wrap every matched word; offsets are the same because normalizing keeps length.
  const flatOut = flat.slice(start, end);
  const marks: [number, number][] = [];
  for (const w of words) {
    let from = 0;
    for (let i = flatOut.indexOf(w, from); i >= 0; i = flatOut.indexOf(w, from)) {
      marks.push([i, i + w.length]);
      from = i + w.length;
    }
  }
  marks.sort((a, b) => a[0] - b[0]);
  let result = "";
  let cursor = 0;
  for (const [a, b] of marks) {
    if (a < cursor) continue;
    result += out.slice(cursor, a) + "{{" + out.slice(a, b) + "}}";
    cursor = b;
  }
  result += out.slice(cursor);
  out = result;
  return (start > 0 ? "… " : "") + out + (end < text.length ? " …" : "");
}

/** Every lesson that contains all the words typed, best matches first. Titles count most. */
export function searchLessons(sections: SearchableSection[], query: string): LessonHit[] {
  const words = queryWords(query);
  if (words.length === 0) return [];
  const hits: LessonHit[] = [];
  for (const { section, lessons } of sections) {
    lessons.forEach((lesson, moduleIndex) => {
      const title = norm(lesson.title);
      const body = lesson.body.map(norm);
      let score = 0;
      for (const w of words) {
        const inTitle = title.includes(w);
        const bodyCount = body.reduce((n, p) => n + (p.split(w).length - 1), 0);
        if (!inTitle && bodyCount === 0) return;
        score += (inTitle ? 8 : 0) + Math.min(bodyCount, 6);
      }
      const para =
        lesson.body.find((p) => words.every((w) => norm(p).includes(w))) ??
        lesson.body.find((p) => words.some((w) => norm(p).includes(w))) ??
        lesson.body[0] ??
        "";
      hits.push({ section, moduleIndex, title: lesson.title, snippet: snippetFor(para, words), score });
    });
  }
  return hits.sort((a, b) => b.score - a.score);
}
