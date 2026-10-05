import { describe, expect, it } from "vitest";
import { queryWords, searchLessons } from "./lessonSearch";

const sections = [
  {
    section: "introduction" as const,
    lessons: [
      {
        title: "What is stewardship?",
        body: ["Stewardship means caring for what is entrusted to you."],
        scriptureRefs: [],
      },
      { title: "Budgeting", body: ["A budget gives every dollar a job."], scriptureRefs: [] },
    ],
  },
  {
    section: 2 as const,
    lessons: [{ title: "Saving", body: ["An emergency fund is a budget for surprises."], scriptureRefs: [] }],
  },
];

describe("lesson search", () => {
  it("ignores accents, case, and one-letter words", () => {
    expect(queryWords("  Presupuesto, a  ÉL ")).toEqual(["presupuesto", "el"]);
  });
  it("needs every word and puts title matches first", () => {
    const hits = searchLessons(sections, "budget");
    expect(hits.map((h) => h.title)).toEqual(["Budgeting", "Saving"]);
    expect(searchLessons(sections, "budget emergency").map((h) => h.title)).toEqual(["Saving"]);
  });
  it("marks the matched words in the snippet", () => {
    const [hit] = searchLessons(sections, "dollar");
    expect(hit.snippet).toContain("{{dollar}}");
  });
  it("finds nothing for a missing word", () => {
    expect(searchLessons(sections, "zebra")).toEqual([]);
  });
});
