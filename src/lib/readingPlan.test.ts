import { describe, expect, it } from "vitest";
import { BIBLE_BOOKS } from "./bibleBooks";
import {
  addMonths,
  buildPlan,
  parsePassage,
  partition,
  readingDates,
  wholeBook,
  type BibleShape,
  type PlanConfig,
} from "./readingPlan";

const idx = (name: string) => BIBLE_BOOKS.findIndex((b) => b.ref === name);
const JOHN = idx("John");

/** A tiny pretend Bible: John has 4 chapters, Jude has 1; every verse is 10 words. */
const shape: BibleShape = {
  chapterCount: (b) => (b === JOHN ? 4 : 1),
  verseWords: (b, c) => {
    const verses = b === JOHN ? [10, 12, 8, 6][c - 1] : 5;
    return Array.from({ length: verses }, () => 10);
  },
  breaks: (b, c) => (b === JOHN && c === 2 ? [5, 9] : []),
};

const base: PlanConfig = {
  passages: [wholeBook(JOHN, shape)],
  start: "2026-10-05",
  end: "2026-10-08",
  cadence: "daily",
  order: "chronological",
  splitChapters: false,
};

describe("passages", () => {
  it("reads books, chapters, ranges, and verses", () => {
    expect(parsePassage("John", shape)).toMatchObject({ fromChapter: 1, toChapter: 4 });
    expect(parsePassage("john 2-3", shape)).toMatchObject({ fromChapter: 2, toChapter: 3, toVerse: 8 });
    expect(parsePassage("John 3:2-5", shape)).toMatchObject({ fromChapter: 3, fromVerse: 2, toVerse: 5 });
    expect(parsePassage("John 1:3-2:4", shape)).toMatchObject({ toChapter: 2, toVerse: 4 });
  });
  it("rejects what does not exist", () => {
    expect(parsePassage("John 9", shape)).toBeNull();
    expect(parsePassage("Nonsense 1", shape)).toBeNull();
    expect(parsePassage("John 1:5-2", shape)).toBeNull();
  });
});

describe("dates", () => {
  it("counts days, weekdays, and weeks", () => {
    expect(readingDates("2026-10-05", "2026-10-11", "daily")).toHaveLength(7);
    expect(readingDates("2026-10-05", "2026-10-11", "weekdays")).toHaveLength(5);
    expect(readingDates("2026-10-05", "2026-10-25", "weekly").map((d) => d.date)).toEqual([
      "2026-10-05",
      "2026-10-12",
      "2026-10-19",
    ]);
  });
  it("ends a month on the day before", () => {
    expect(addMonths("2026-10-05", 1)).toBe("2026-11-04");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-27");
  });
});

describe("partition", () => {
  it("balances and never splits an atom", () => {
    const atoms = [10, 10, 10, 10].map((words) => ({ words }));
    expect(partition(atoms, 2).map((g) => g.length)).toEqual([2, 2]);
    expect(partition(atoms, 4).map((g) => g.length)).toEqual([1, 1, 1, 1]);
  });
  it("leaves rest days when there is less than one atom per slot", () => {
    const groups = partition([{ words: 10 }, { words: 10 }], 4);
    expect(groups.flat()).toHaveLength(2);
    expect(groups.filter((g) => g.length === 0)).toHaveLength(2);
  });
});

describe("buildPlan", () => {
  it("covers every chapter once, in order, keeping chapters whole", () => {
    const days = buildPlan(base, shape);
    expect(days.map((d) => d.passages)).toEqual(["John 1", "John 2", "John 3", "John 4"]);
  });

  it("joins neighbouring chapters when days are scarce", () => {
    const days = buildPlan({ ...base, end: "2026-10-06" }, shape);
    expect(days.map((d) => d.passages)).toEqual(["John 1-2", "John 3-4"]);
  });

  it("splits long chapters only at natural breaks", () => {
    const days = buildPlan(
      { ...base, passages: [parsePassage("John 2", shape)!], splitChapters: true, end: "2026-10-07" },
      shape,
    );
    // chapter 2 has breaks at verses 5 and 9, so its three sections are 4, 4, and 4 verses
    expect(days.map((d) => d.passages)).toEqual(["John 2:1-4", "John 2:5-8", "John 2:9-12"]);
  });

  it("synchronizes books across the whole period", () => {
    const days = buildPlan(
      {
        ...base,
        passages: [parsePassage("John 2-3", shape)!, parsePassage("Jude", shape)!],
        order: "synchronized",
        splitChapters: true,
        start: "2026-10-05",
        end: "2026-10-07",
      },
      shape,
    );
    expect(days.length).toBe(3);
    // every day has some John; Jude shows up on the days its sections land on
    expect(days.every((d) => d.passages.includes("John"))).toBe(true);
    expect(days.some((d) => d.passages.includes("Jude"))).toBe(true);
  });

  it("reads one book after another in chronological order", () => {
    const days = buildPlan(
      {
        ...base,
        passages: [parsePassage("Jude", shape)!, parsePassage("John 1", shape)!],
        end: "2026-10-06",
      },
      shape,
    );
    expect(days.map((d) => d.passages)).toEqual(["Jude 1", "John 1"]);
  });

  it("marks weekly readings with the day they run through", () => {
    const days = buildPlan({ ...base, cadence: "weekly", end: "2026-10-14" }, shape);
    expect(days[0].through).toBe("2026-10-11");
    expect(days[1].through).toBe("2026-10-14");
  });
});
