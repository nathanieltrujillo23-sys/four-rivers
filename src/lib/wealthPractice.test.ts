import { describe, expect, it } from "vitest";
import { TOPICS } from "../components/community/workshop/workshopContent";
import { buildDeck, deckOutline } from "./wealthDeck";
import { normalizePlan, snapshotMetrics } from "./wealthMath";
import { PRACTICE_CASES, practiceCase } from "./wealthPractice";

describe("practice cases", () => {
  it("each opens as a complete client plan, with the analysis left for the student", () => {
    expect(new Set(PRACTICE_CASES.map((c) => c.id)).size).toBe(PRACTICE_CASES.length);
    for (const c of PRACTICE_CASES) {
      const plan = c.build();
      // Nothing is lost or changed when the plan is saved and loaded.
      expect(normalizePlan(JSON.parse(JSON.stringify(plan))), c.id).toEqual(plan);
      expect(plan.client.name).toBeTruthy();
      expect(plan.notes.discovery).toMatch(/^Practice case\./);
      expect(plan.goals.length).toBeGreaterThanOrEqual(3);
      expect(plan.snapshot.assets.length).toBeGreaterThan(0);
      for (const f of plan.focus) expect(TOPICS.some((t) => t.id === f), `${c.id} focus ${f}`).toBe(true);
      // The student writes these.
      expect(Object.values(plan.swot).flat()).toEqual([]);
      expect(plan.roadmap).toEqual([]);
      // The month adds up: nobody is given a budget that spends more than they bring home.
      const m = snapshotMetrics(plan);
      expect(m.surplus, `${c.id} surplus`).toBeGreaterThanOrEqual(0);
      expect(m.surplus, `${c.id} surplus`).toBeLessThan(m.income * 0.35);
      expect(c.brief.length).toBeGreaterThanOrEqual(3);
      expect(c.tasks.length).toBeGreaterThanOrEqual(3);
      expect(c.notice.length).toBeGreaterThanOrEqual(3);
    }
    expect(practiceCase("pre-retirement")!.client).toContain("Bauer");
    expect(practiceCase("nope")).toBeUndefined();
  });

  it("each can be taken all the way to a presentation", async () => {
    for (const c of PRACTICE_CASES) {
      const input = { plan: c.build(), tools: {} };
      const outline = deckOutline(input);
      expect(outline.find((o) => o.id === "goals")!.included, c.id).toBe(true);
      const { pres, titles } = await buildDeck(input);
      expect(titles.length, c.id).toBeGreaterThan(8);
      const buf = (await pres.write({ outputType: "nodebuffer" })) as Buffer;
      expect(buf.length).toBeGreaterThan(20000);
    }
  }, 120_000);
});
