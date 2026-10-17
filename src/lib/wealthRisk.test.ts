import { describe, expect, it } from "vitest";
import { buildIps, allocationRange } from "./wealthIps";
import { answerFor, assessRisk, profileIndexForScore, requiredReturn, RISK_QUESTIONS } from "./wealthRisk";
import { emptyPlan, goalOutlooks, samplePlan, simulatePlan, snapshotMetrics } from "./wealthMath";

describe("the financial snapshot", () => {
  it("adds up net worth, liquidity, savings rate and debt load, with a rule of thumb for each", () => {
    const m = snapshotMetrics(samplePlan());
    expect(m.totalAssets).toBe(5300);
    expect(m.totalDebt).toBe(2400);
    expect(m.netWorth).toBe(2900);
    expect(m.cash).toBe(1800);
    expect(m.needs).toBe(1470);
    expect(m.emergencyMonths).toBeCloseTo(1800 / 1470, 6);
    expect(m.light.emergency).toBe("low");
    expect(m.savingsRate).toBeCloseTo(300 / 2600, 6);
    expect(m.light.savings).toBe("ok");
    expect(m.debtShare).toBeCloseTo(75 / 2600, 6);
    expect(m.light.debt).toBe("good");
    expect(m.weightedApr).toBe(27);
    expect(m.surplus).toBe(2600 - 2340);
    expect(snapshotMetrics(emptyPlan()).hasAny).toBe(false);
  });
});

describe("goal funding status", () => {
  it("rates each goal by the chance the saving reaches it, with safer assumptions for goals that are close", () => {
    const plan = samplePlan();
    const o = goalOutlooks(plan);
    expect(o).toHaveLength(plan.goals.length);
    const emergency = o.find((x) => x.goal.name.startsWith("Emergency"))!;
    expect(emergency.ret).toBe(3.5);
    expect(emergency.bucket).toBe("Essential");
    const longTerm = o.find((x) => x.goal.name.startsWith("Financial independence"))!;
    expect(longTerm.ret).toBe(7.5);
    // Putting far more toward a goal can only help.
    const more = samplePlan();
    more.goals[5].monthly = "5000";
    expect(goalOutlooks(more)[5].prob!).toBeGreaterThan(longTerm.prob!);
    // A goal being funded exactly on schedule, with nothing at risk, is on track.
    const cash = samplePlan();
    cash.goals = [{ ...cash.goals[0], amount: "1200", current: "1200" }];
    expect(goalOutlooks(cash)[0].status).toBe("On track");
  });

  it("handles a goal less than a year away in months, not whole years", () => {
    const plan = samplePlan();
    const card = plan.goals.find((g) => g.name === "Pay off credit card")!; // $2,400 in 6 months, $600 saved
    card.monthly = "300"; // $600 + 6 x $300 = $2,400
    const a = goalOutlooks(plan).find((x) => x.goal.id === card.id)!;
    card.monthly = "100";
    const b = goalOutlooks(plan).find((x) => x.goal.id === card.id)!;
    expect(a.prob!).toBeGreaterThan(0.9);
    expect(b.prob!).toBeLessThan(0.1);
  });
});

describe("the three-part risk profile", () => {
  it("scores tolerance and capacity from the answers and finds the return the goals need", () => {
    const plan = samplePlan();
    const { target } = simulatePlan(plan);
    const a = assessRisk(plan, target);
    expect(a.answered.tolerance).toBe(6);
    expect(a.tolerance).toBeGreaterThan(40);
    expect(a.capacityIndex).not.toBeNull();
    expect(a.required).not.toBeNull();
    // The plan uses the more cautious of tolerance and capacity.
    expect(a.recommendedIndex).toBe(Math.min(a.toleranceIndex!, a.capacityIndex!));
    expect(a.gap).toMatch(/goals need about/);
  });

  it("answers capacity questions from the plan where it can", () => {
    const plan = samplePlan();
    const q = (id: string) => RISK_QUESTIONS.find((x) => x.id === id)!;
    expect(answerFor(plan, q("c1"))).toEqual({ value: 4, auto: true }); // 35 years
    expect(answerFor(plan, q("c3"))).toEqual({ value: 1, auto: true }); // 1.2 months of cash
    expect(answerFor(plan, q("c5"))).toEqual({ value: 4, auto: true }); // debt payments are 2.9% of take-home
    expect(answerFor(emptyPlan(), q("c3")).value).toBeNull();
  });

  it("maps scores to profiles, and says nothing until enough is answered", () => {
    expect([0, 19, 20, 59, 60, 99, 100].map(profileIndexForScore)).toEqual([0, 0, 1, 2, 3, 4, 4]);
    const a = assessRisk(emptyPlan(), 0);
    expect(a.tolerance).toBeNull();
    expect(a.recommended).toBeNull();
  });

  it("solves the return needed to reach a target", () => {
    const plan = samplePlan();
    plan.model.initial = "0";
    plan.model.monthly = "1000";
    plan.model.years = 10;
    // $120,000 put in; reaching $150,000 needs a modest return.
    const r = requiredReturn(plan, 150000)!;
    expect(r).toBeGreaterThan(3);
    expect(r).toBeLessThan(6);
    expect(requiredReturn(plan, 100000)).toBe(0);
    expect(requiredReturn(plan, 0)).toBeNull();
  });
});

describe("the investment policy statement", () => {
  it("drafts every section from the plan, and keeps the analyst's own wording", () => {
    const plan = samplePlan();
    const { target } = simulatePlan(plan);
    const ips = buildIps(plan, target);
    expect(ips.map((s) => s.id)).toEqual(["purpose", "return", "risk", "horizon", "liquidity", "taxes", "legal", "unique", "allocation", "rebalance", "review"]);
    expect(ips.find((s) => s.id === "purpose")!.text).toContain("Marcus Rivera");
    expect(ips.find((s) => s.id === "liquidity")!.text).toMatch(/\$4,410 to \$8,820/);
    expect(ips.find((s) => s.id === "allocation")!.text).toMatch(/Stocks \d+% to \d+%/);
    expect(ips.every((s) => !s.edited && s.text === s.generated)).toBe(true);
    plan.ips.overrides.rebalance = "  Rebalance every January.  ";
    const edited = buildIps(plan, target).find((s) => s.id === "rebalance")!;
    expect(edited).toMatchObject({ edited: true, text: "Rebalance every January." });
    expect(allocationRange("Growth")).toBe("Stocks 60% to 80%, bonds 10% to 40%, cash 0% to 10%");
  });
});
