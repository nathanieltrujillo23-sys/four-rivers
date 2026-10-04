import { BIBLE_BOOKS, formatReference, parseReference, type ParsedReference } from "./bibleBooks";
import { kjvChapter, kjvSearch, type Verse } from "./kjv";
import { VERSE_LIBRARY } from "../content/verseLibrary";
import { localizedVerse } from "../content/scriptureEs";
import type { Lang } from "../i18n/LanguageContext";
import type { ScriptureRef, Translation } from "../types";

/** "all" and NIV search the course's own verse library; KJV, ESV, and NLT search the whole Bible. */
export type VersionFilter = "all" | Translation;
export const FULL_BIBLE: Translation[] = ["KJV", "ESV", "NLT"];

export type SearchNote = "notConfigured" | "signIn" | "error" | "more";

export interface SearchOutcome {
  results: ScriptureRef[];
  note: SearchNote | null;
  /** How many verses matched in all, when more than are shown. */
  total?: number;
}

const MAX_RANGE = 12;
const MAX_CHAPTER_LIST = 40;

function fromVerses(ref: ParsedReference, translation: Translation, verses: Verse[]): ScriptureRef[] {
  const name = BIBLE_BOOKS[ref.book].ref;
  if (ref.from === null) {
    return verses.slice(0, MAX_CHAPTER_LIST).map((v) => ({
      reference: `${name} ${ref.chapter}:${v.v}`,
      translation,
      text: v.text,
    }));
  }
  const last = Math.min(ref.to ?? ref.from, ref.from + MAX_RANGE - 1);
  const picked = verses.filter((v) => v.v >= ref.from! && v.v <= last);
  if (picked.length === 0) return [];
  if (picked.length === 1) {
    return [{ reference: `${name} ${ref.chapter}:${picked[0].v}`, translation, text: picked[0].text }];
  }
  return [
    {
      reference: formatReference({ ...ref, from: picked[0].v, to: picked[picked.length - 1].v }),
      translation,
      text: picked.map((v) => v.text).join(" "),
    },
  ];
}

type Token = () => Promise<string | null>;

type ApiResult =
  | { ok: true; data: { verses?: Verse[]; results?: { ref: string; text: string }[]; total?: number } }
  | { ok: false; note: SearchNote };

async function callApi(params: Record<string, string>, getToken: Token): Promise<ApiResult> {
  const token = await getToken();
  if (!token) return { ok: false, note: "signIn" };
  try {
    const res = await fetch(`/api/bible?${new URLSearchParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 501) return { ok: false, note: "notConfigured" };
    if (res.status === 401) return { ok: false, note: "signIn" };
    if (!res.ok) return { ok: false, note: "error" };
    return { ok: true, data: await res.json() };
  } catch {
    return { ok: false, note: "error" };
  }
}

function passageParams(version: Translation, ref: ParsedReference): Record<string, string> {
  const book = BIBLE_BOOKS[ref.book];
  const params: Record<string, string> = {
    version,
    book: book.ref,
    code: book.nlt,
    ch: String(ref.chapter),
  };
  if (ref.from !== null) {
    params.from = String(ref.from);
    params.to = String(Math.min(ref.to ?? ref.from, ref.from + MAX_RANGE - 1));
  }
  return params;
}

function librarySearch(query: string, version: VersionFilter, lang: Lang): ScriptureRef[] {
  const pool = version === "all" ? VERSE_LIBRARY : VERSE_LIBRARY.filter((v) => v.translation === version);
  const q = query.trim().toLowerCase();
  if (!q) return pool.slice(0, version === "all" ? 8 : 12);
  return pool
    .filter((v) => {
      const es = localizedVerse(v, lang);
      return (
        v.reference.toLowerCase().includes(q) ||
        es.reference.toLowerCase().includes(q) ||
        es.text.toLowerCase().includes(q) ||
        v.text.toLowerCase().includes(q)
      );
    })
    .slice(0, 12);
}

/**
 * Finds verses by reference ("John 3:16", "Juan 3:16-18", "Psalm 23") or by
 * keyword. KJV is searched from the bundled text; ESV and NLT go through the
 * server, which holds those publishers' keys. NIV and "All versions" search the
 * course's verse library, since the NIV has no free service we may use.
 */
export async function searchScripture(opts: {
  query: string;
  version: VersionFilter;
  lang: Lang;
  getToken: Token;
}): Promise<SearchOutcome> {
  const { query, version, lang, getToken } = opts;
  const text = query.trim();
  if (version === "all" || version === "NIV" || !text) {
    return { results: librarySearch(text, version, lang), note: null };
  }

  const ref = parseReference(text);
  try {
    if (version === "KJV") {
      if (ref) {
        return { results: fromVerses(ref, "KJV", await kjvChapter(ref.book, ref.chapter)), note: null };
      }
      const { results, total } = await kjvSearch(text);
      return { results, total, note: total > results.length ? "more" : null };
    }

    if (ref) {
      const r = await callApi(passageParams(version, ref), getToken);
      if (!r.ok) return { results: [], note: r.note };
      return { results: fromVerses(ref, version, r.data.verses ?? []), note: null };
    }
    const r = await callApi({ version, q: text }, getToken);
    if (!r.ok) return { results: [], note: r.note };
    const results: ScriptureRef[] = [];
    for (const row of r.data.results ?? []) {
      const parsed = parseReference(row.ref);
      if (parsed) results.push({ reference: formatReference(parsed), translation: version, text: row.text });
    }
    const total = r.data.total ?? results.length;
    return { results, total, note: total > results.length ? "more" : null };
  } catch {
    return { results: [], note: "error" };
  }
}

/** NLT search rows are cut short at a footnote; fetch the whole verse once it is chosen. */
export async function completeVerse(verse: ScriptureRef, getToken: Token): Promise<ScriptureRef> {
  if (!verse.text.endsWith("…") || verse.translation !== "NLT") return verse;
  const ref = parseReference(verse.reference);
  if (!ref) return verse;
  const r = await callApi(passageParams("NLT", ref), getToken);
  if (!r.ok) return verse;
  return fromVerses(ref, "NLT", r.data.verses ?? [])[0] ?? verse;
}
