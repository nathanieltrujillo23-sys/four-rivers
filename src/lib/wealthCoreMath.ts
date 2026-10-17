/**
 * "How this was calculated" for the plan's core numbers (the projection, goal funding, the snapshot ratios, risk, the portfolio and
 * retirement income), written with the client's own figures so a presenter can say exactly how each was reached.
 */
import { assessRisk } from "./wealthRisk";
import { portfolioStats, weightTotal } from "./wealthPortfolio";
import { fmtK, fmtPct, fmtUsd, num, planFacts, snapshotMetrics, type WealthPlan } from "./wealthMath";

const p1 = (n: number) => `${(Math.round(n * 10) / 10).toString()}%`;

export function projectionMath(plan: WealthPlan): string[] {
  const m = plan.model;
  const f = planFacts(plan);
  return [
    `Each of 2,000 simulated futures starts at ${fmtUsd(num(m.initial))} and moves month by month for ${Math.round(num(m.years) || 1)} years. Each month the balance is multiplied by a random growth factor drawn from a lognormal distribution with an expected return of ${m.ret}% a year and volatility of ${m.vol}% a year, then ${fmtUsd(num(m.monthly))} is added at month end.`,
    `The same random seed is used each time, so the same inputs always give the same picture until "rerun" draws a new one. The shaded range is the 10th to 90th percentile across the 2,000 futures; the line is the median.`,
    m.real ? `Amounts are shown in today's dollars: each future balance is divided by (1 + ${m.inflation}%)^years.` : "Amounts are in future dollars (not reduced for inflation).",
    f.target > 0 && f.sim.prob != null ? `Chance of reaching the goal = the share of futures that end at or above ${fmtUsd(f.target)}: ${fmtPct(f.sim.prob)}. It is a modeled probability, not a promise.` : "Pick a goal to see the share of futures that reach it.",
    `Median ending balance ${fmtUsd(f.sim.final.p50)}; middle 80% from ${fmtK(f.sim.final.p10)} to ${fmtK(f.sim.final.p90)}. Total contributed: ${fmtUsd(f.sim.contributed)}.`,
  ];
}

export function goalMath(plan: WealthPlan): string[] {
  const f = planFacts(plan);
  return [
    `The amount across all goals is the sum of every goal's amount: ${fmtUsd(f.total)}. Funded today = the sum of what is already saved toward each goal, capped at its amount: ${fmtUsd(f.saved)}.`,
    `Straight-line monthly need = for each goal, (amount − saved) ÷ (years × 12), added together: ${fmtUsd(f.monthlyNeed)}. It ignores investment growth, so it is the cautious number.`,
    "A goal's chance of success is simulated with a return and volatility that fit its time horizon: money needed within about a year is assumed to sit in cash, and longer goals use progressively more of the plan's portfolio.",
  ];
}

export function snapshotMath(plan: WealthPlan): string[] {
  const m = snapshotMetrics(plan);
  return [
    `Net worth = total assets ${fmtUsd(m.totalAssets)} − total debts ${fmtUsd(m.totalDebt)} = ${fmtUsd(m.netWorth)}.`,
    m.emergencyMonths == null ? "Cash cushion = cash ÷ monthly needs (add expenses marked Needs to see it)." : `Cash cushion = cash ${fmtUsd(m.cash)} ÷ monthly needs ${fmtUsd(m.needs)} = ${p1(m.emergencyMonths)} months of needs. Rule of thumb: 3 to 6 months.`,
    m.savingsRate == null ? "Savings rate = monthly saving ÷ monthly take-home pay." : `Savings rate = monthly saving ${fmtUsd(m.saving)} ÷ take-home pay ${fmtUsd(m.income)} = ${fmtPct(m.savingsRate)}. Rule of thumb: 10% to 20% or more.`,
    m.debtShare == null ? "Debt load = monthly debt payments ÷ monthly take-home pay." : `Debt load = monthly debt payments ${fmtUsd(m.debtPayments)} ÷ take-home pay ${fmtUsd(m.income)} = ${fmtPct(m.debtShare)}. Rule of thumb: under about 36%.`,
    `Average interest rate on debt = each balance × its APR, added up, ÷ total debt = ${p1(m.weightedApr)}.`,
    "The status words (on track, watch, needs work) are rules of thumb, not laws.",
  ];
}

export function riskMath(plan: WealthPlan): string[] {
  const a = assessRisk(plan, planFacts(plan).target);
  return [
    `Tolerance (how the client feels about swings) and capacity (how much loss they could absorb) are each scored 0 to 100 from the answers: ${a.tolerance == null ? "not enough answers yet" : `tolerance ${Math.round(a.tolerance)}`}${a.capacity == null ? "" : `, capacity ${Math.round(a.capacity)}`}.`,
    `Each score maps to one of five profiles. The profile in use is the more cautious of the two${a.inUse ? ` (${a.inUse})` : ""}, unless one was chosen by hand.`,
    a.required == null ? "Required return needs a goal with an amount and a date." : `Required return = the yearly return the model needs for the goal given the saving and time: ${a.required}% a year. If it is higher than the profile's assumed return, the goal asks for more risk than the client should take.`,
    "The questionnaire starts a conversation. It is not a suitability determination.",
  ];
}

export function portfolioMath(plan: WealthPlan): string[] {
  const pf = plan.portfolio;
  if (!(pf.started && Math.abs(weightTotal(pf) - 100) < 0.5)) return ["Set weights that add to 100% to see how the portfolio's numbers are worked out."];
  const st = portfolioStats(pf);
  return [
    `Compound (geometric) return ${p1(st.geometric)} = the average (arithmetic) return ${p1(st.arithmetic)} − half the variance. Published return assumptions are compound; the Monte Carlo model uses the average, so each class's compound return is converted by adding half its variance.`,
    `Volatility ${p1(st.vol)} = √(wᵀ Σ w), where w is the weights and Σ the covariance matrix built from each class's volatility and the correlations entered (pulled slightly toward zero if the correlations cannot all be true together).`,
    `Return per unit of risk (Sharpe-style) = (return − cash return) ÷ volatility = ${st.sharpe.toFixed(2)}.`,
    `A bad year (about 1 in 10) = average return − 1.28 × volatility = ${p1(st.badYear)}.`,
    "The efficient frontier is traced from 6,000 random long-only mixes of the same asset classes: for each level of risk, the highest return found.",
  ];
}

export function retirementMath(plan: WealthPlan): string[] {
  const r = plan.retirement;
  return [
    `The client saves ${fmtUsd(num(plan.model.monthly))} a month from age ${plan.client.age || "?"} until ${r.age || "?"}, then spends ${fmtUsd(num(r.spend))} a year (today's dollars) for ${r.length || "30"} years, with ${fmtUsd(num(r.income))} a year of Social Security or pension from retirement.`,
    "Each of 1,000 simulated markets runs month by month through both phases at the model's real return and volatility. Withdrawals are the spending less other income.",
    "Probability of success = the share of simulated markets in which the balance never reaches zero before the end age. First-year withdrawal rate = first year's withdrawal ÷ the balance at retirement; 4% is a common guide.",
    "Sequence risk: poor returns in the first years of withdrawals do the most damage, which is why the worst tenth of paths falls so quickly after retirement.",
  ];
}
