/**
 * Risk profiling the way advisors separate it: how much risk the client is WILLING to take (tolerance, an attitude), how much
 * they can AFFORD to take (capacity, their situation), and how much the goals REQUIRE (the return needed). The plan is built
 * on the lowest of tolerance and capacity, and a goal that needs more than that is flagged, because that gap is the conversation.
 */
import { RISK_PROFILES, num, snapshotMetrics, type WealthPlan } from "./wealthMath";

export interface RiskQuestion {
  id: string;
  group: "tolerance" | "capacity";
  text: string;
  /** Five options, from the most cautious (0) to the most comfortable with risk (4). */
  options: string[];
  /** Capacity questions answered from the rest of the plan when it has the numbers. */
  fromPlan?: string;
}

export const RISK_QUESTIONS: RiskQuestion[] = [
  {
    id: "t1",
    group: "tolerance",
    text: "Suppose your investments fell 20% in three months. What would you most likely do?",
    options: ["Sell everything to stop the losses", "Sell some to feel safer", "Do nothing and wait", "Buy a little more while prices are low", "Buy a lot more"],
  },
  {
    id: "t2",
    group: "tolerance",
    text: "How would you describe your investing experience?",
    options: ["None; I have only used savings accounts", "A little; I have read about it", "Some; I own a fund or two", "Several years of owning stocks or funds", "Many years, and I follow markets closely"],
  },
  {
    id: "t3",
    group: "tolerance",
    text: "Over one year, which range of results for a long-term investment could you accept?",
    options: ["Gain 2%, lose at most 1%", "Gain 6%, lose at most 5%", "Gain 12%, lose at most 12%", "Gain 20%, lose at most 22%", "Gain 30%, lose at most 35%"],
  },
  {
    id: "t4",
    group: "tolerance",
    text: "Which statement is closest to your goal for this money?",
    options: ["Never lose any of it", "Protect it and grow it a little", "Balance protection and growth", "Grow it, accepting some big swings", "Grow it as much as possible"],
  },
  {
    id: "t5",
    group: "tolerance",
    text: "How would big swings in your account affect you?",
    options: ["I would lose sleep and check it constantly", "I would worry for days", "I would be uneasy but cope", "I would barely notice", "I would see swings as opportunities"],
  },
  {
    id: "t6",
    group: "tolerance",
    text: "In a past market drop (or when you imagine one), how did you behave with money?",
    options: ["I froze or pulled money out", "I got nervous and cut back", "I kept my plan but felt it", "I stuck to my plan calmly", "I invested more"],
  },
  {
    id: "c1",
    group: "capacity",
    text: "How soon will you need most of this money? (taken from the model's time horizon)",
    options: ["Under 3 years", "3 to 5 years", "6 to 10 years", "11 to 20 years", "More than 20 years"],
    fromPlan: "horizon",
  },
  {
    id: "c2",
    group: "capacity",
    text: "How steady is the client's income?",
    options: ["Very uncertain or irregular", "Varies a lot (tips, commission, gig work)", "Steady but could change", "Steady with growth ahead", "Very secure and well above expenses"],
  },
  {
    id: "c3",
    group: "capacity",
    text: "How many months of needs does their cash cover? (taken from the financial snapshot)",
    options: ["Under 1 month", "1 to 3 months", "3 to 6 months", "6 to 12 months", "More than 12 months"],
    fromPlan: "cushion",
  },
  {
    id: "c4",
    group: "capacity",
    text: "Does anyone depend on this income or these savings?",
    options: ["Several people depend on it", "A spouse and a child", "A spouse or partner", "A relative, occasionally", "No one"],
  },
  {
    id: "c5",
    group: "capacity",
    text: "How heavy is their debt? (monthly payments as a share of take-home, from the snapshot)",
    options: ["Over 36%", "20% to 36%", "10% to 20%", "5% to 10%", "Under 5%"],
    fromPlan: "debt",
  },
];

/** The answer for a question: from the plan where it has the numbers, otherwise the one chosen (or null when not answered). */
export function answerFor(plan: WealthPlan, q: RiskQuestion): { value: number | null; auto: boolean } {
  if (q.fromPlan === "horizon") {
    const y = num(plan.model.years);
    if (y <= 0) return { value: null, auto: true };
    return { value: y < 3 ? 0 : y <= 5 ? 1 : y <= 10 ? 2 : y <= 20 ? 3 : 4, auto: true };
  }
  if (q.fromPlan === "cushion") {
    const m = snapshotMetrics(plan).emergencyMonths;
    if (m == null) return { value: null, auto: true };
    return { value: m < 1 ? 0 : m < 3 ? 1 : m < 6 ? 2 : m < 12 ? 3 : 4, auto: true };
  }
  if (q.fromPlan === "debt") {
    const d = snapshotMetrics(plan).debtShare;
    if (d == null) return { value: null, auto: true };
    return { value: d > 0.36 ? 0 : d > 0.2 ? 1 : d > 0.1 ? 2 : d > 0.05 ? 3 : 4, auto: true };
  }
  const v = plan.risk.answers[q.id];
  return { value: typeof v === "number" && v >= 0 && v <= 4 ? v : null, auto: false };
}

/** A 0 to 100 score to the index of the risk profile it falls in. */
export function profileIndexForScore(score: number): number {
  return score < 20 ? 0 : score < 40 ? 1 : score < 60 ? 2 : score < 80 ? 3 : 4;
}

/**
 * The annual return that would take the starting balance and the monthly saving to the target in the model's horizon, with no
 * swings. Null with no target. It is the return the goals REQUIRE; a market that delivers it is not guaranteed.
 */
export function requiredReturn(plan: WealthPlan, target: number): number | null {
  if (!(target > 0)) return null;
  const initial = num(plan.model.initial);
  const monthly = num(plan.model.monthly);
  const months = Math.max(1, Math.round((num(plan.model.years) || 1) * 12));
  const fv = (annual: number) => {
    const r = annual / 100 / 12;
    let b = initial;
    for (let m = 0; m < months; m++) b = b * (1 + r) + monthly;
    return b;
  };
  if (fv(0) >= target) return 0;
  let lo = 0;
  let hi = 40;
  if (fv(hi) < target) return null;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (fv(mid) >= target) hi = mid;
    else lo = mid;
  }
  return Math.round(hi * 10) / 10;
}

export interface RiskAssessment {
  /** 0 to 100 for each part, or null until enough is answered. */
  tolerance: number | null;
  capacity: number | null;
  toleranceIndex: number | null;
  capacityIndex: number | null;
  /** The return the goals need, and the index of the first profile whose assumed return covers it (5 if none does). */
  required: number | null;
  requiredIndex: number | null;
  answered: { tolerance: number; capacity: number };
  /** The profile the plan should use: the more cautious of tolerance and capacity, or the one chosen by hand. */
  recommendedIndex: number | null;
  recommended: string | null;
  /** What the person chose to use, if different. */
  chosen: string | null;
  /** The profile actually in use. */
  inUse: string | null;
  /** A sentence on whether the goals ask for more risk than the client should take. */
  gap: string | null;
}

const score = (values: (number | null)[]) => {
  const have = values.filter((v): v is number => v !== null);
  return have.length ? (have.reduce((a, b) => a + b, 0) / (have.length * 4)) * 100 : null;
};

/** Tolerance, capacity and required return, and the profile they point to. */
export function assessRisk(plan: WealthPlan, target: number): RiskAssessment {
  const answers = RISK_QUESTIONS.map((q) => ({ q, a: answerFor(plan, q) }));
  const tolV = answers.filter((x) => x.q.group === "tolerance").map((x) => x.a.value);
  const capV = answers.filter((x) => x.q.group === "capacity").map((x) => x.a.value);
  const tolAnswered = tolV.filter((v) => v !== null).length;
  const capAnswered = capV.filter((v) => v !== null).length;
  // Not enough answered to say much.
  const tolerance = tolAnswered >= 3 ? score(tolV) : null;
  const capacity = capAnswered >= 3 ? score(capV) : null;
  const toleranceIndex = tolerance == null ? null : profileIndexForScore(tolerance);
  const capacityIndex = capacity == null ? null : profileIndexForScore(capacity);
  const required = requiredReturn(plan, target);
  const requiredIndex = required == null ? null : (() => {
    const i = RISK_PROFILES.findIndex((p) => p.ret >= required);
    return i === -1 ? RISK_PROFILES.length : i;
  })();
  const known = [toleranceIndex, capacityIndex].filter((v): v is number => v !== null);
  const recommendedIndex = known.length ? Math.min(...known) : null;
  const recommended = recommendedIndex == null ? null : RISK_PROFILES[recommendedIndex].name;
  const chosen = plan.risk.chosen && RISK_PROFILES.some((p) => p.name === plan.risk.chosen) ? plan.risk.chosen : null;
  const inUse = chosen ?? recommended;
  const useIndex = inUse ? RISK_PROFILES.findIndex((p) => p.name === inUse) : null;
  let gap: string | null = null;
  if (required != null && useIndex != null && useIndex >= 0) {
    const used = RISK_PROFILES[useIndex];
    if (required > used.ret) {
      gap = `The goals need about ${required}% a year, but the ${used.name} profile assumes ${used.ret}%. To close the gap, save more, allow more time, or lower the target, rather than taking more risk than the client can bear.`;
    } else {
      gap = `The goals need about ${required}% a year, which the ${used.name} profile's ${used.ret}% assumption covers.`;
    }
  }
  return {
    tolerance,
    capacity,
    toleranceIndex,
    capacityIndex,
    required,
    requiredIndex,
    answered: { tolerance: tolAnswered, capacity: capAnswered },
    recommendedIndex,
    recommended,
    chosen,
    inUse,
    gap,
  };
}
