import { describe, expect, it } from "vitest";
import { LEARNING_PATH, REVIEW_KEYS, REVIEW_RUBRIC, averageScores, caseByline, pathStatus, reviewComplete } from "./wealthCommunity";
import { emptyPrep } from "./wealthPrep";
import { personaById } from "./wealthPersonas";
import type { WealthClient } from "../types";

const client = (plan: unknown): WealthClient => ({ id: "c", name: "x", plan, tools: {}, createdAt: "", updatedAt: "" });

describe("review rubric", () => {
  it("has six lines, each with four level descriptions, and keys the database accepts", () => {
    expect(REVIEW_RUBRIC).toHaveLength(6);
    expect(REVIEW_KEYS).toEqual(["discovery", "goals", "rigor", "assumptions", "communication", "compliance"]);
    for (const l of REVIEW_RUBRIC) {
      expect(l.levels).toHaveLength(4);
      expect(l.hint.length).toBeGreaterThan(20);
    }
  });

  it("is complete only when every line is scored 1 to 4", () => {
    const all = Object.fromEntries(REVIEW_KEYS.map((k) => [k, 3]));
    expect(reviewComplete(all)).toBe(true);
    expect(reviewComplete({ ...all, rigor: 0 })).toBe(false);
    expect(reviewComplete({ ...all, rigor: 5 })).toBe(false);
    expect(reviewComplete({})).toBe(false);
  });

  it("averages by line and overall, ignoring bad values", () => {
    expect(averageScores([])).toBeNull();
    const a = Object.fromEntries(REVIEW_KEYS.map((k) => [k, 4]));
    const b = Object.fromEntries(REVIEW_KEYS.map((k) => [k, 2]));
    const avg = averageScores([{ scores: a }, { scores: b }, { scores: { ...a, goals: 9 } }]);
    expect(avg?.byLine.discovery).toBeCloseTo(3.3, 1);
    expect(avg?.byLine.goals).toBe(3);
    expect(avg?.overall).toBeGreaterThan(3);
  });
});

describe("learning path", () => {
  it("starts empty and is checked from real work", () => {
    const empty = pathStatus({ clients: [], prep: emptyPrep(), casesShared: 0, reviewsGiven: 0 });
    expect(empty.total).toBe(LEARNING_PATH.length);
    expect(empty.done).toBe(0);

    const prep = emptyPrep();
    prep.stats.decks = 2;
    prep.journal = Array.from({ length: 4 }, (_, i) => ({ id: String(i), date: "2026-10-01", view: "v", read: "", idea: "", client: "" }));
    const plan = personaById("tips")!.plan();
    const status = pathStatus({ clients: [client(plan)], prep, casesShared: 1, reviewsGiven: 2 });
    const by = Object.fromEntries(status.steps.map((s) => [s.step.id, s.done]));
    expect(by.plan).toBe(true);
    expect(by.present).toBe(true);
    expect(by.share).toBe(true);
    expect(by.review).toBe(true);
    expect(by.journal).toBe(true);
    expect(by.vocab).toBe(false);
  });

  it("reports progress as text and never beyond the goal", () => {
    const prep = emptyPrep();
    prep.stats.decks = 9;
    const s = pathStatus({ clients: [], prep, casesShared: 0, reviewsGiven: 1 });
    expect(s.steps.find((x) => x.step.id === "present")?.text).toBe("1 of 1 deck built");
    expect(s.steps.find((x) => x.step.id === "review")?.text).toBe("1 of 2 reviews written");
  });
});

describe("case byline", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  it("names the author, or says it is unnamed", () => {
    expect(caseByline({ authorName: "Avery", createdAt: "2026-10-17T08:00:00Z", reviewCount: 1 }, now)).toBe("Avery, today, 1 review");
    expect(caseByline({ authorName: "  ", createdAt: "2026-10-14T08:00:00Z", reviewCount: 0 }, now)).toBe("A student in the track, 3 days ago, 0 reviews");
  });
});
