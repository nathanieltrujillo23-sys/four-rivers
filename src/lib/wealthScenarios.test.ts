import { describe, expect, it } from "vitest";
import { defaultScenarios, modelFor, normalizeScenarios, runScenario, runScenarios, sensitivity } from "./wealthScenarios";
import { normalizePlan, samplePlan, uid } from "./wealthMath";

describe("scenarios", () => {
  it("builds a base, an upside and a downside from the model, and the base changes nothing", () => {
    const plan = samplePlan();
    const list = defaultScenarios(plan.model, uid);
    expect(list.map((s) => s.name)).toEqual(["Base case", "Upside", "Downside"]);
    expect(modelFor(plan, list[0])).toEqual(plan.model);
    expect(Number(modelFor(plan, list[1]).ret)).toBeCloseTo(Number(plan.model.ret) + 1.5, 5);
  });

  it("orders the outcomes: downside below base below upside, and the base matches the plan", () => {
    const plan = samplePlan();
    plan.scenarios.list = defaultScenarios(plan.model, uid);
    const [base, up, down] = runScenarios(plan);
    expect(down.sim.final.p50).toBeLessThan(base.sim.final.p50);
    expect(up.sim.final.p50).toBeGreaterThan(base.sim.final.p50);
    expect(base.changes).toEqual([]);
    expect(up.changes.join(" ")).toMatch(/Expected return/);
    // Same seed: running the base twice gives the same answer.
    expect(runScenario(plan, plan.scenarios.list[0]).sim.final.p50).toBe(base.sim.final.p50);
  });

  it("reads saved scenarios safely", () => {
    const s = normalizeScenarios({ list: [{ id: "a", name: "  ", overrides: { ret: "9", bogus: "1", vol: 5 } }, "bad", { name: "no id" }] });
    expect(s.list).toHaveLength(1);
    expect(s.list[0].name).toBe("Scenario");
    expect(s.list[0].overrides).toEqual({ ret: "9" });
    expect(normalizePlan(null).scenarios.list).toEqual([]);
  });
});

describe("sensitivity", () => {
  it("ranks assumptions by how far they move the outcome, and the favorable case beats the adverse one", () => {
    const plan = samplePlan();
    const r = sensitivity(plan, 500);
    expect(r.rows.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < r.rows.length; i++) expect(r.rows[i - 1].swing).toBeGreaterThanOrEqual(r.rows[i].swing);
    for (const row of r.rows) expect(row.favorableMedian).toBeGreaterThanOrEqual(row.adverseMedian);
    expect(r.rows.some((x) => x.id === "ret")).toBe(true);
  });

  it("leaves out assumptions that are not in play", () => {
    const plan = samplePlan();
    plan.model.monthly = "0";
    plan.model.initial = "0";
    plan.model.real = false;
    const ids = sensitivity(plan, 300).rows.map((r) => r.id);
    expect(ids).not.toContain("monthly");
    expect(ids).not.toContain("initial");
    expect(ids).not.toContain("inflation");
  });
});
