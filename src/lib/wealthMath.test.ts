import { describe, expect, it } from "vitest";
import {
  buildMission,
  emptyPlan,
  generateRoadmap,
  isPlanEmpty,
  normalizePlan,
  num,
  runMonteCarlo,
  samplePlan,
  scenarioGrid,
  simulatePlan,
  solveMonthlyFor,
  synthesize,
  vehicleGrowth,
} from "./wealthMath";

describe("wealth plan math", () => {
  it("reads typed numbers forgivingly", () => {
    expect(num("$1,200.50")).toBe(1200.5);
    expect(num("")).toBe(0);
    expect(num("abc")).toBe(0);
    expect(num(7)).toBe(7);
  });

  it("draws the same simulation for the same inputs, and a different one for a new seed", () => {
    const p = { initial: 5000, monthly: 300, years: 20, ret: 7, vol: 14, target: 200000, paths: 400 };
    const a = runMonteCarlo({ ...p, seed: 42 });
    const b = runMonteCarlo({ ...p, seed: 42 });
    const c = runMonteCarlo({ ...p, seed: 43 });
    expect(a.final).toEqual(b.final);
    expect(a.final.p50).not.toBe(c.final.p50);
    expect(a.data).toHaveLength(21);
  });

  it("orders the percentiles and grows with more saved", () => {
    const base = { initial: 1000, years: 25, ret: 7, vol: 14, target: 0, paths: 500, seed: 3 };
    const low = runMonteCarlo({ ...base, monthly: 100 });
    const high = runMonteCarlo({ ...base, monthly: 500 });
    expect(low.final.p10).toBeLessThan(low.final.p50);
    expect(low.final.p50).toBeLessThan(low.final.p90);
    expect(high.final.p50).toBeGreaterThan(low.final.p50);
    expect(low.prob).toBeNull();
  });

  it("with no volatility the median is the plain compound result", () => {
    const r = runMonteCarlo({ initial: 0, monthly: 100, years: 1, ret: 0, vol: 0, target: 1000, paths: 10 });
    expect(r.final.p50).toBe(1200);
    expect(r.prob).toBe(1);
  });

  it("finds a monthly amount that reaches the goal, or says it cannot", () => {
    const need = solveMonthlyFor(0.8, { initial: 0, monthly: 0, years: 20, ret: 7, vol: 12, target: 250000 });
    expect(need).not.toBeNull();
    const check = runMonteCarlo({ initial: 0, monthly: need!, years: 20, ret: 7, vol: 12, target: 250000, paths: 600, snapshots: false, seed: 7 });
    expect(check.prob!).toBeGreaterThanOrEqual(0.8);
    expect(solveMonthlyFor(0.8, { initial: 0, monthly: 0, years: 1, ret: 7, vol: 12, target: 0 })).toBeNull();
  });

  it("turns a SWOT into three strategy tracks and puts debt first", () => {
    const sw = {
      S: [{ id: "1", text: "High savings rate" }],
      W: [{ id: "2", text: "No emergency fund" }, { id: "3", text: "Credit card debt at 27% APR" }],
      O: [{ id: "4", text: "Employer 401(k) match" }],
      T: [{ id: "5", text: "Lifestyle creep" }],
    };
    const r = synthesize(sw);
    expect(r.growth[0].headline).toContain("High savings rate");
    expect(r.growth[0].tactic).toMatch(/employer match/i);
    expect(r.risk[0].tactic).toMatch(/raises/i);
    expect(r.remediate[0].headline).toContain("Credit card");
    expect(r.blockers).toHaveLength(2);
  });

  it("writes the mission sentence from its parts, or uses the person's own wording", () => {
    const plan = emptyPlan();
    expect(buildMission(plan.mission, plan.client)).toBe("");
    const m = { ...plan.mission, values: ["Faith", "Family"], vision: "financial independence", beneficiaries: "my family", age: "50" };
    expect(buildMission(m, plan.client)).toBe(
      "Stewarding today's resources, guided by faith and family, to achieve financial independence, provide for my family, and build generational impact by age 50.",
    );
    expect(buildMission({ ...m, custom: "  My own words.  " }, plan.client)).toBe("My own words.");
  });

  it("builds a roadmap in every phase from the example plan", () => {
    const plan = samplePlan();
    const { sim } = simulatePlan(plan);
    const items = generateRoadmap(plan, sim);
    expect(new Set(items.map((i) => i.phase)).size).toBe(5);
    expect(items.some((i) => /avalanche/i.test(i.text))).toBe(true);
    expect(items.every((i) => i.status === "Pending")).toBe(true);
  });

  it("fills in whatever a saved document is missing, and recognises an empty plan", () => {
    const p = normalizePlan({ client: { name: "Sam" }, goals: "oops", swot: { S: [{ id: "1", text: "x" }] } });
    expect(p.client.name).toBe("Sam");
    expect(p.client.risk).toBe("Moderate");
    expect(p.goals).toEqual([]);
    expect(p.swot.S).toHaveLength(1);
    expect(p.swot.T).toEqual([]);
    expect(isPlanEmpty(normalizePlan(null))).toBe(true);
    expect(isPlanEmpty(p)).toBe(false);
    expect(isPlanEmpty(samplePlan())).toBe(false);
  });

  it("shows a Roth beating the same money in a taxable account", () => {
    const [roth, trad, taxable, hysa] = vehicleGrowth(30, 7);
    expect(roth.value).toBeGreaterThan(taxable.value);
    expect(roth.value).toBeGreaterThan(trad.value);
    expect(hysa.value).toBeLessThan(taxable.value);
  });

  it("compares four contributions across three risk profiles, and more saved never hurts", () => {
    const plan = samplePlan();
    const g = scenarioGrid(plan);
    expect(g.monthly).toEqual([200, 400, 600, 800]);
    expect(g.profiles.map((p) => p.name)).toEqual(["Conservative", "Moderate", "Growth"]);
    expect(g.cells).toHaveLength(4);
    for (let c = 0; c < 3; c++) for (let r = 1; r < 4; r++) expect(g.cells[r][c].median).toBeGreaterThan(g.cells[r - 1][c].median);
    expect(g.cells[0][0].prob).not.toBeNull();
  });

  it("keeps at most three focus areas and fills in deck settings", () => {
    const p = normalizePlan({ focus: ["debt", "car", "house", "estate"], deck: { presenter: "Alex" } });
    expect(p.focus).toHaveLength(3);
    expect(p.deck.presenter).toBe("Alex");
    expect(p.deck.skip).toEqual([]);
  });
});
