import { BIBLE_BOOKS, findBook } from "./bibleBooks";

/**
 * Turns a list of passages and a date range into a day-by-day reading
 * schedule. It never splits a section of text: portions end only at chapter
 * ends (whole-chapter mode) or at natural breaks inside a chapter (a
 * paragraph or stanza start) when chapters may be divided.
 */

/** What the scheduler needs to know about the Bible's text. */
export interface BibleShape {
  /** Word counts per verse of one chapter (chapter numbers start at 1). */
  verseWords(book: number, chapter: number): number[];
  /** Verse numbers (above 1) where a new paragraph or stanza begins in the chapter. */
  breaks(book: number, chapter: number): number[];
  chapterCount(book: number): number;
}

export interface Passage {
  book: number;
  fromChapter: number;
  fromVerse: number;
  toChapter: number;
  toVerse: number;
}

export type Cadence = "daily" | "weekdays" | "weekly";
export type PlanOrder = "chronological" | "synchronized";

export interface PlanConfig {
  passages: Passage[];
  /** ISO dates, "2026-10-05". */
  start: string;
  end: string;
  cadence: Cadence;
  order: PlanOrder;
  /** True: chapters may be divided at natural breaks so days come out even. False: chapters stay whole. */
  splitChapters: boolean;
}

export interface PlanDay {
  date: string;
  /** For weekly plans, the last day the reading covers. */
  through: string | null;
  /** Readable references such as "Luke 3:1-20; Luke 4", English book names. */
  passages: string;
  words: number;
}

export const MAX_PLAN_DAYS = 400;

/* ------------------------------------------------------------------ */
/* Passages                                                           */
/* ------------------------------------------------------------------ */

/**
 * "Luke" (whole book), "Luke 3", "Luke 3-5", "Luke 3:1-20", or "Luke 3:10-4:13".
 * Returns null when the book is unknown or the numbers do not make sense.
 */
export function parsePassage(input: string, shape: BibleShape): Passage | null {
  const text = input.trim();
  if (!text) return null;

  const whole = findBook(text);
  if (whole !== null) return wholeBook(whole, shape);

  const m = text.match(
    /^(.+?)\s*(\d{1,3})(?:\s*[:.]\s*(\d{1,3}))?(?:\s*[-–—]\s*(\d{1,3})(?:\s*[:.]\s*(\d{1,3}))?)?$/,
  );
  if (!m) return null;
  const book = findBook(m[1]);
  if (book === null) return null;
  const chapters = shape.chapterCount(book);
  const c1 = Number(m[2]);
  const v1 = m[3] ? Number(m[3]) : null;
  const dash = m[4] ? Number(m[4]) : null;
  const v2Given = m[5] ? Number(m[5]) : null;

  let p: Passage;
  if (v1 === null) {
    const c2 = dash ?? c1;
    p = { book, fromChapter: c1, fromVerse: 1, toChapter: c2, toVerse: 0 };
  } else if (dash === null) {
    p = { book, fromChapter: c1, fromVerse: v1, toChapter: c1, toVerse: v1 };
  } else if (v2Given === null) {
    p = { book, fromChapter: c1, fromVerse: v1, toChapter: c1, toVerse: dash };
  } else {
    p = { book, fromChapter: c1, fromVerse: v1, toChapter: dash, toVerse: v2Given };
  }
  if (p.fromChapter < 1 || p.toChapter > chapters || p.toChapter < p.fromChapter) return null;
  if (p.toVerse === 0) p.toVerse = shape.verseWords(book, p.toChapter).length;
  const lastCount = shape.verseWords(book, p.toChapter).length;
  const firstCount = shape.verseWords(book, p.fromChapter).length;
  if (p.fromVerse < 1 || p.fromVerse > firstCount || p.toVerse < 1 || p.toVerse > lastCount) return null;
  if (p.fromChapter === p.toChapter && p.toVerse < p.fromVerse) return null;
  return p;
}

export function wholeBook(book: number, shape: BibleShape): Passage {
  const last = shape.chapterCount(book);
  return {
    book,
    fromChapter: 1,
    fromVerse: 1,
    toChapter: last,
    toVerse: shape.verseWords(book, last).length,
  };
}

/** How a passage reads back to the leader: "Luke", "Luke 3-5", "Psalm 23:1-3". */
export function describePassage(p: Passage, shape: BibleShape): string {
  const name = BIBLE_BOOKS[p.book].ref;
  const lastCount = shape.verseWords(p.book, p.toChapter).length;
  const startsAtTop = p.fromVerse === 1;
  const endsAtBottom = p.toVerse === lastCount;
  if (p.fromChapter === 1 && startsAtTop && p.toChapter === shape.chapterCount(p.book) && endsAtBottom) {
    return name;
  }
  return formatRange(p.book, p.fromChapter, p.fromVerse, p.toChapter, p.toVerse, shape);
}

/* ------------------------------------------------------------------ */
/* Dates                                                              */
/* ------------------------------------------------------------------ */

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** One month, three months, and so on from a start date, ending the day before the same date. */
export function addMonths(iso: string, months: number): string {
  const d = parseISO(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return addDays(toISO(d), -1);
}

/** The days a reading is assigned on, plus (for weekly plans) the day each covers through. */
export function readingDates(
  start: string,
  end: string,
  cadence: Cadence,
): { date: string; through: string | null }[] {
  const out: { date: string; through: string | null }[] = [];
  if (end < start) return out;
  if (cadence === "weekly") {
    for (let d = start; d <= end && out.length <= MAX_PLAN_DAYS; d = addDays(d, 7)) {
      const last = addDays(d, 6);
      out.push({ date: d, through: last > end ? end : last });
    }
    return out;
  }
  for (let d = start; d <= end && out.length <= MAX_PLAN_DAYS; d = addDays(d, 1)) {
    const dow = parseISO(d).getDay();
    if (cadence === "weekdays" && (dow === 0 || dow === 6)) continue;
    out.push({ date: d, through: null });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Scheduling                                                         */
/* ------------------------------------------------------------------ */

/** The smallest piece the scheduler will hand out: it is never divided further. */
interface Atom {
  book: number;
  chapter: number;
  from: number;
  to: number;
  words: number;
}

function atomsFor(p: Passage, shape: BibleShape, split: boolean): Atom[] {
  const atoms: Atom[] = [];
  for (let chapter = p.fromChapter; chapter <= p.toChapter; chapter++) {
    const words = shape.verseWords(p.book, chapter);
    const from = chapter === p.fromChapter ? p.fromVerse : 1;
    const to = chapter === p.toChapter ? p.toVerse : words.length;
    const cuts = split ? shape.breaks(p.book, chapter).filter((v) => v > from && v <= to) : [];
    const starts = [from, ...cuts];
    starts.forEach((s, i) => {
      const e = i + 1 < starts.length ? starts[i + 1] - 1 : to;
      let sum = 0;
      for (let v = s; v <= e; v++) sum += words[v - 1] ?? 0;
      atoms.push({ book: p.book, chapter, from: s, to: e, words: sum });
    });
  }
  return atoms;
}

/**
 * Splits a sequence into `slots` consecutive groups as even in word count as
 * the atoms allow, never dividing an atom. With fewer atoms than slots the
 * extra slots come out empty (rest days), spread evenly.
 */
export function partition<T extends { words: number }>(atoms: T[], slots: number): T[][] {
  const groups: T[][] = Array.from({ length: slots }, () => []);
  if (atoms.length === 0 || slots === 0) return groups;
  if (atoms.length <= slots) {
    // Fewer pieces than days: one piece per day, spaced evenly, starting on the first day.
    atoms.forEach((atom, i) => groups[Math.floor((i * slots) / atoms.length)].push(atom));
    return groups;
  }
  const total = atoms.reduce((s, a) => s + a.words, 0);
  // cumulative[i] = words before atom i; cumulative[n] = total
  const cumulative = [0];
  for (const a of atoms) cumulative.push(cumulative[cumulative.length - 1] + a.words);

  let index = 0;
  for (let slot = 0; slot < slots; slot++) {
    const target = (total * (slot + 1)) / slots;
    let next = index;
    // advance while taking one more atom lands closer to the target
    while (next < atoms.length) {
      const before = Math.abs(cumulative[next] - target);
      const after = Math.abs(cumulative[next + 1] - target);
      if (after <= before) next++;
      else break;
    }
    if (slot === slots - 1) next = atoms.length;
    groups[slot] = atoms.slice(index, next);
    index = next;
  }
  return groups;
}

function formatRange(
  book: number,
  c1: number,
  v1: number,
  c2: number,
  v2: number,
  shape: BibleShape,
): string {
  const name = BIBLE_BOOKS[book].ref;
  const wholeChapters = v1 === 1 && v2 === shape.verseWords(book, c2).length;
  if (wholeChapters) return c1 === c2 ? `${name} ${c1}` : `${name} ${c1}-${c2}`;
  if (c1 === c2) return v1 === v2 ? `${name} ${c1}:${v1}` : `${name} ${c1}:${v1}-${v2}`;
  return `${name} ${c1}:${v1}-${c2}:${v2}`;
}

/** Joins a day's atoms into readable references, one per book. */
function describeAtoms(atoms: Atom[], shape: BibleShape): string {
  const parts: string[] = [];
  let i = 0;
  while (i < atoms.length) {
    let j = i;
    while (j + 1 < atoms.length && atoms[j + 1].book === atoms[i].book) j++;
    parts.push(
      formatRange(atoms[i].book, atoms[i].chapter, atoms[i].from, atoms[j].chapter, atoms[j].to, shape),
    );
    i = j + 1;
  }
  return parts.join("; ");
}

export function buildPlan(config: PlanConfig, shape: BibleShape): PlanDay[] {
  const dates = readingDates(config.start, config.end, config.cadence);
  if (dates.length === 0 || dates.length > MAX_PLAN_DAYS || config.passages.length === 0) return [];
  const slots = dates.length;
  const perPassage = config.passages.map((p) => atomsFor(p, shape, config.splitChapters));

  let days: Atom[][];
  if (config.order === "chronological" || perPassage.length === 1) {
    days = partition(perPassage.flat(), slots);
  } else {
    // Synchronized: every passage is spread across the whole period, so each
    // day reads a little from each book instead of finishing one at a time.
    const split = perPassage.map((atoms) => partition(atoms, slots));
    days = Array.from({ length: slots }, (_, k) => split.flatMap((groups) => groups[k]));
  }

  const out: PlanDay[] = [];
  days.forEach((atoms, k) => {
    if (atoms.length === 0) return;
    out.push({
      date: dates[k].date,
      through: dates[k].through,
      passages: describeAtoms(atoms, shape),
      words: atoms.reduce((s, a) => s + a.words, 0),
    });
  });
  return out;
}

/** Average reading time per reading day at an easy aloud pace. */
export function minutesPerDay(days: PlanDay[]): number {
  if (days.length === 0) return 0;
  const words = days.reduce((s, d) => s + d.words, 0) / days.length;
  return Math.max(1, Math.round(words / 180));
}
