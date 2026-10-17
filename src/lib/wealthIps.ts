/**
 * The investment policy statement (IPS): the written plan an advisor and client agree on before any investing, covering the
 * return needed, the risk that can be taken, the time horizon, liquidity, taxes, constraints, and how the portfolio is kept
 * on course. Each section is drafted from the plan and can be reworded; the reworded text is kept in `plan.ips.overrides`.
 */
import { assessRisk } from "./wealthRisk";
import { bracketEstimate } from "./taxMath";
import { RISK_PROFILES, fmtUsd, listJoin, num, planFacts, snapshotMetrics, type WealthPlan } from "./wealthMath";

export interface IpsSection {
  id: string;
  title: string;
  /** The text drafted from the plan. */
  generated: string;
  /** What is shown: the analyst's wording when they changed it, otherwise the draft. */
  text: string;
  edited: boolean;
}

/** Equity share ranges by profile. General rules of thumb for teaching, not a recommendation for any one person. */
export const EQUITY_RANGE: Record<string, [number, number]> = {
  "Capital Preservation": [0, 20],
  Conservative: [20, 40],
  Moderate: [40, 60],
  Growth: [60, 80],
  Aggressive: [80, 100],
};

export function allocationRange(profile: string): string {
  const [lo, hi] = EQUITY_RANGE[profile] ?? [40, 60];
  const bondLo = Math.max(0, 100 - hi - 10);
  const bondHi = Math.min(100, 100 - lo);
  return `Stocks ${lo}% to ${hi}%, bonds ${bondLo}% to ${bondHi}%, cash 0% to 10%`;
}

export function buildIps(plan: WealthPlan, target: number): IpsSection[] {
  const a = assessRisk(plan, target);
  const f = planFacts(plan);
  const m = snapshotMetrics(plan);
  const name = plan.client.name.trim() || "the client";
  const profileName = a.inUse ?? plan.client.risk;
  const profile = RISK_PROFILES.find((p) => p.name === profileName) ?? RISK_PROFILES[2];
  const ret = num(plan.model.ret) || profile.ret;
  const vol = num(plan.model.vol) || profile.vol;
  const years = num(plan.model.years) || 0;
  const goalNames = plan.goals.slice(0, 4).map((g) => g.name);
  const bad = Math.round((ret - 1.28 * vol) * 10) / 10;
  const bracket = bracketEstimate(num(plan.client.income) * 12 / 0.85, "single");
  const needs = m.needs;
  const near = plan.goals.filter((g) => num(g.horizon) <= 3).map((g) => g.name);

  const gen: Record<string, string> = {
    purpose: `This statement sets out how ${name}'s savings are to be invested toward ${goalNames.length ? listJoin(goalNames) : "the goals in the plan"}${plan.goals.length > goalNames.length ? " and others" : ""}, and how the plan is monitored. It is prepared for education and discussion and is not investment advice.`,
    return: f.target > 0
      ? `The goals call for a return of about ${a.required ?? "n/a"}% a year before inflation, with no swings. The portfolio's long-term expected return is assumed to be ${ret}% a year, giving a median outcome of ${fmtUsd(f.sim.final.p50)} after ${f.sim.years} years and a ${f.sim.prob == null ? "n/a" : `${Math.round(f.sim.prob * 100)}%`} chance of reaching the target.`
      : `The portfolio's long-term expected return is assumed to be ${ret}% a year before inflation. Choose a target goal in the model to compare it with what the goals need.`,
    risk: `${name}'s risk tolerance${a.toleranceIndex != null ? ` is ${RISK_PROFILES[a.toleranceIndex].name}` : " has not been assessed"}, and their capacity to take risk${a.capacityIndex != null ? ` is ${RISK_PROFILES[a.capacityIndex].name}` : " has not been assessed"}. The plan uses the ${profile.name} profile: an expected return of ${ret}% with swings of about ${vol}% a year. In a bad year (about one in ten) the portfolio could be down roughly ${Math.abs(bad)}%${bad < 0 ? "" : " less than it gains in a typical year"}.${a.gap ? ` ${a.gap}` : ""}`,
    horizon: years
      ? `The long-term horizon is ${years} years. Goals due within three years${near.length ? ` (${listJoin(near.slice(0, 3))})` : ""} are held in cash and short-term bonds rather than stocks.`
      : "The time horizon has not been set in the model yet.",
    liquidity: needs > 0
      ? `Hold an emergency fund of three to six months of needs, which is ${fmtUsd(needs * 3)} to ${fmtUsd(needs * 6)}. Cash today covers ${m.emergencyMonths == null ? "an unknown number of" : (Math.round(m.emergencyMonths * 10) / 10).toString()} months. Money needed within three years stays out of stocks.`
      : "Hold an emergency fund of three to six months of essential expenses, and keep money needed within three years out of stocks.",
    taxes: num(plan.client.income) > 0
      ? `The estimated federal bracket on the next dollar earned is ${bracket.percent}% (single filer, from the income entered; state tax is not included). Use tax-advantaged accounts first, in this order: the employer match, a Roth IRA or HSA where eligible, then taxable accounts for flexibility.`
      : "Use tax-advantaged accounts first: the employer match, a Roth IRA or HSA where eligible, then taxable accounts for flexibility.",
    legal: "This is an educational plan. No advisory or fiduciary relationship exists. Contribution limits and tax rules follow 2026 federal law and change; any real implementation should be reviewed by a licensed professional.",
    unique: `${plan.client.values.length ? `Values that guide decisions: ${listJoin(plan.client.values.slice(0, 6))}. ` : ""}${f.mission ? `Money mission: “${f.mission}” ` : ""}Giving is set aside first, on payday.`.trim(),
    allocation: `Strategic range for the ${profile.name} profile: ${allocationRange(profile.name)}. These ranges are general rules of thumb; the target mix within them is chosen with the client.`,
    rebalance: "Rebalance when any asset class drifts more than five percentage points from its target, using new contributions first to limit taxes and costs. Review the plan at least once a year and after any major life change.",
    review: `Review cadence: ${plan.client.cadence || "monthly"}, with a full review (goals, SWOT, assumptions, and this statement) once a year.`,
  };
  const titles: Record<string, string> = {
    purpose: "Purpose and scope",
    return: "Return objective",
    risk: "Risk objective",
    horizon: "Time horizon",
    liquidity: "Liquidity needs",
    taxes: "Taxes",
    legal: "Legal and regulatory",
    unique: "Unique circumstances",
    allocation: "Asset allocation",
    rebalance: "Rebalancing",
    review: "Monitoring and review",
  };
  return Object.keys(gen).map((id) => {
    const override = plan.ips.overrides[id];
    const edited = typeof override === "string" && override.trim() !== "";
    return { id, title: titles[id], generated: gen[id], text: edited ? override!.trim() : gen[id], edited };
  });
}
