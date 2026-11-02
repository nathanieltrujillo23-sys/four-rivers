import { describe, expect, it } from "vitest";
import { drillSet, isClose, plain, profit, profitGrid, defaultProfit, sizing, SIZING_TEMPLATES } from "./consultingMath";
import { FRAMEWORKS, STORY_PROMPTS } from "./consultingContent";
import { caseAverages, consultingProgress, emptyConsulting, normalizeConsulting } from "./consultingWorkspace";
import { IB_QUESTIONS, IB_CATEGORIES } from "./ibContent";
import { emptyIb, ibProgress, normalizeIb } from "./ibWorkspace";

describe("market sizing", () => {
  const est = (factors: [string, "x" | "÷"][], check = "") => ({ id: "e", title: "t", unit: "units", checkLabel: "", check, factors: factors.map(([v, op], i) => ({ id: String(i), label: "f", value: v, op })) });

  it("multiplies and divides the chain in order", () => {
    const r = sizing(est([["1000", "x"], ["0.5", "x"], ["4", "÷"]]));
    expect(r.total).toBe(125);
    expect(r.running).toEqual([1000, 500, 125]);
  });

  it("says how far the answer is from a known figure", () => {
    expect(sizing(est([["100", "x"]], "120")).verdict).toMatch(/reasonable/);
    expect(sizing(est([["100", "x"]], "10")).verdict).toMatch(/10\.0x higher/);
    expect(sizing(est([["100", "x"]])).verdict).toMatch(/figure you know/);
    expect(sizing(est([])).total).toBe(0);
    expect(sizing(est([["5", "÷"], ["0", "÷"]])).total).toBe(0);
  });

  it("writes big numbers plainly, and every template works out", () => {
    expect(plain(3_200_000_000)).toBe("3.2 billion");
    expect(plain(450_000)).toBe("450 thousand");
    for (const t of SIZING_TEMPLATES) {
      const r = sizing({ id: "x", title: t.title, unit: t.unit, checkLabel: t.checkLabel, check: "", factors: t.factors.map(([label, value, op], i) => ({ id: String(i), label, value, op })) });
      expect(r.total).toBeGreaterThan(0);
    }
  });
});

describe("profit and break-even", () => {
  it("works the contribution, profit and break-even", () => {
    const r = profit(defaultProfit());
    expect(r.contributionPerUnit).toBe(20);
    expect(r.profit).toBe(20 * 30000 - 400000);
    expect(r.breakEvenUnits).toBe(20000);
    expect(r.breakEvenRevenue).toBe(1_000_000);
    expect(r.marginOfSafety).toBeCloseTo(1 / 3, 6);
  });

  it("has no break-even when the price does not cover the variable cost, and a grid centred on the inputs", () => {
    expect(profit({ ...defaultProfit(), price: "20", variableCost: "30" }).breakEvenUnits).toBeNull();
    const g = profitGrid(defaultProfit());
    expect(g.values[2][2]).toBe(profit(defaultProfit()).profit);
    expect(g.values[4][2]).toBeGreaterThan(g.values[0][2]);
  });
});

describe("mental math drills", () => {
  it("makes the same ten questions from the same seed, each with a numeric answer and a tip", () => {
    const a = drillSet(7);
    expect(a).toHaveLength(10);
    expect(drillSet(7).map((q) => q.prompt)).toEqual(a.map((q) => q.prompt));
    expect(drillSet(8).map((q) => q.prompt)).not.toEqual(a.map((q) => q.prompt));
    for (const q of a) {
      expect(Number.isFinite(q.answer)).toBe(true);
      expect(q.tip.length).toBeGreaterThan(5);
    }
  });

  it("accepts a close mental answer but not a wrong one", () => {
    expect(isClose(840, 840)).toBe(true);
    expect(isClose(850, 840)).toBe(true);
    expect(isClose(900, 840)).toBe(false);
    expect(isClose(NaN, 5)).toBe(false);
    expect(isClose(9, 9)).toBe(true);
  });
});

describe("content and workspaces", () => {
  it("has frameworks and story prompts with the parts each needs", () => {
    expect(FRAMEWORKS.length).toBeGreaterThanOrEqual(6);
    for (const f of FRAMEWORKS) {
      expect(f.structure.length).toBeGreaterThanOrEqual(3);
      expect(f.clarify.length).toBeGreaterThan(0);
      expect(f.drill.length).toBeGreaterThan(20);
    }
    expect(new Set(FRAMEWORKS.map((f) => f.id)).size).toBe(FRAMEWORKS.length);
    expect(STORY_PROMPTS.length).toBeGreaterThanOrEqual(5);
  });

  it("has technical questions in every banking category with unique ids", () => {
    expect(new Set(IB_QUESTIONS.map((q) => q.id)).size).toBe(IB_QUESTIONS.length);
    for (const c of IB_CATEGORIES) expect(IB_QUESTIONS.filter((q) => q.category === c).length, c).toBeGreaterThanOrEqual(5);
  });

  it("reads saved workspaces safely, and keeps only what is valid", () => {
    expect(normalizeConsulting(null)).toEqual(emptyConsulting());
    const c = normalizeConsulting({ cases: [{ id: "k", scores: { structure: 9, quant: -2, insight: "x", communication: 3 } }], frameworks: { profit: { mine: "x", confident: true }, bogus: { mine: "y" } }, stories: { lead: "a", nope: "b" }, drills: [{ score: 7, total: 10 }] });
    expect(c.cases[0].scores).toEqual({ structure: 4, quant: 0, insight: 0, communication: 3 });
    expect(Object.keys(c.frameworks)).toEqual(["profit"]);
    expect(Object.keys(c.stories)).toEqual(["lead"]);
    expect(caseAverages(c.cases).averages).toMatchObject({ structure: 4, quant: null, communication: 3 });
    expect(consultingProgress(c).frameworks).toBe(1);

    const ib = normalizeIb({ dcf: { wacc: "11", growth: ["1", 2, "3"], midYear: false }, comps: { basis: "pe", rows: [{ name: "A" }, "bad"] }, tech: { ac1: "confident", zz: "confident", va1: "wrong" }, deals: [{ company: "X" }], recruits: [{ firm: "F", status: "nope" }], ready: { excel: true, junk: true } });
    expect(ib.dcf.wacc).toBe("11");
    expect(ib.dcf.growth).toEqual(["1", "7", "3", "5", "4"]);
    expect(ib.dcf.midYear).toBe(false);
    expect(ib.comps.basis).toBe("pe");
    expect(ib.comps.rows).toHaveLength(1);
    expect(Object.keys(ib.tech)).toEqual(["ac1"]);
    expect(ib.recruits[0].status).toBe("Researching");
    expect(ibProgress(ib)).toMatchObject({ confident: 1, deals: 1, ready: 1 });
    expect(normalizeIb(undefined)).toEqual(emptyIb());
  });
});
