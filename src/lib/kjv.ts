import { BIBLE_BOOKS } from "./bibleBooks";
import type { BibleShape } from "./readingPlan";
import type { ScriptureRef } from "../types";

/**
 * The whole King James Version (public domain), shipped as one static file and
 * downloaded the first time someone searches it. Books and chapters follow the
 * order in bibleBooks.ts.
 */
type Text = string[][][]; // book, chapter, verse

let loading: Promise<Text> | null = null;
let lowered: string[][][] | null = null;

function load(): Promise<Text> {
  loading ??= fetch("/bible/kjv.json")
    .then((r) => {
      if (!r.ok) throw new Error("kjv unavailable");
      return r.json() as Promise<{ v: Text }>;
    })
    .then((d) => d.v)
    .catch((err) => {
      loading = null;
      throw err;
    });
  return loading;
}

export interface Verse {
  v: number;
  text: string;
}

/** Every verse of one chapter (empty when the chapter does not exist). */
export async function kjvChapter(book: number, chapter: number): Promise<Verse[]> {
  const text = await load();
  return (text[book]?.[chapter - 1] ?? []).map((t, i) => ({ v: i + 1, text: t }));
}

const MAX_HITS = 30;

/** Every word typed must appear; verses with the whole phrase come first. Returns the first few and the full count. */
export async function kjvSearch(query: string): Promise<{ results: ScriptureRef[]; total: number }> {
  const text = await load();
  lowered ??= text.map((book) => book.map((ch) => ch.map((v) => v.toLowerCase())));
  const phrase = query.trim().toLowerCase();
  const words = phrase.split(/\s+/).filter(Boolean);
  if (words.length === 0) return { results: [], total: 0 };

  const exact: [number, number, number][] = [];
  const all: [number, number, number][] = [];
  lowered.forEach((book, b) =>
    book.forEach((chapter, c) =>
      chapter.forEach((verse, v) => {
        if (!words.every((w) => verse.includes(w))) return;
        (verse.includes(phrase) ? exact : all).push([b, c, v]);
      }),
    ),
  );
  const hits = [...exact, ...all];
  return {
    total: hits.length,
    results: hits.slice(0, MAX_HITS).map(([b, c, v]) => ({
      reference: `${BIBLE_BOOKS[b].ref} ${c + 1}:${v + 1}`,
      translation: "KJV" as const,
      text: text[b][c][v],
    })),
  };
}

let shapeLoading: Promise<BibleShape> | null = null;

/** Word counts (from the KJV) and paragraph breaks (public-domain WEB) that the reading-plan scheduler needs. */
export function loadBibleShape(): Promise<BibleShape> {
  shapeLoading ??= Promise.all([
    load(),
    fetch("/bible/sections.json").then((r) => {
      if (!r.ok) throw new Error("sections unavailable");
      return r.json() as Promise<{ s: number[][][] }>;
    }),
  ])
    .then(([text, sections]) => {
      const words = text.map((book) =>
        book.map((ch) => ch.map((v) => v.split(/\s+/).filter(Boolean).length)),
      );
      return {
        chapterCount: (b) => text[b].length,
        verseWords: (b, c) => words[b][c - 1] ?? [],
        breaks: (b, c) => sections.s[b]?.[c - 1] ?? [],
      } satisfies BibleShape;
    })
    .catch((err) => {
      shapeLoading = null;
      throw err;
    });
  return shapeLoading;
}
