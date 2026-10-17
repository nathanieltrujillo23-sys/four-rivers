import type { WealthCase, WealthCaseReview, WealthClient } from "../types";
import { normalizePlan } from "./wealthMath";
import { prepProgress, type PrepData } from "./wealthPrep";

/** What a peer reviewer scores a shared case on, each from 1 (needs work) to 4 (excellent). Matches the rubric used for practice clients. */
export const REVIEW_RUBRIC: { id: string; label: string; hint: string; levels: [string, string, string, string] }[] = [
  {
    id: "discovery",
    label: "Discovery quality",
    hint: "Did the notes capture the person, not just the numbers: values, fears, family, how they talk about money?",
    levels: ["Mostly numbers, little about the person", "Some background, thin on motives", "Clear picture of the person and what matters to them", "Rich and specific, with the client's own words and what they left unsaid"],
  },
  {
    id: "goals",
    label: "Goal clarity",
    hint: "Are the goals specific, with a dollar amount, a date and a priority, and do they follow from what the client said?",
    levels: ["Vague or missing amounts and dates", "Amounts and dates but little priority", "Specific and prioritized", "Specific, prioritized, and tied to the client's values with the trade-offs named"],
  },
  {
    id: "rigor",
    label: "Analytical rigor",
    hint: "Does the math hold up: the savings rate, the simulation, the portfolio, the stress tests?",
    levels: ["Numbers do not connect", "Reasonable but with gaps", "Consistent from snapshot to recommendation", "Consistent, stress-tested, and explains what could go wrong"],
  },
  {
    id: "assumptions",
    label: "Assumption transparency",
    hint: "Are returns, inflation, taxes and fees stated with a source and date, and are the reasons for them given?",
    levels: ["Assumptions hidden or unexplained", "Stated but not sourced", "Stated with a source and date", "Sourced, reasonable, and shown with a range or sensitivity"],
  },
  {
    id: "communication",
    label: "Recommendation and communication",
    hint: "Would the client understand it? Is there a clear recommendation and a next step?",
    levels: ["Hard to follow", "Understandable but no clear recommendation", "Clear recommendation in plain language", "Clear, persuasive, and in the order the client would ask their questions"],
  },
  {
    id: "compliance",
    label: "Disclosure and suitability",
    hint: "Is it clearly educational, are risks disclosed, and does the recommendation suit the client's risk and horizon?",
    levels: ["No disclosures; suitability not considered", "Disclosures present, suitability implied", "Disclosures and a reasoned match to risk and horizon", "Disclosures, documented suitability, and the limits of the analysis stated"],
  },
];

export const REVIEW_KEYS = REVIEW_RUBRIC.map((r) => r.id);

/** Average of each rubric line (and overall) across reviews, to one decimal; null when there are none. */
export function averageScores(reviews: Pick<WealthCaseReview, "scores">[]): { byLine: Record<string, number>; overall: number } | null {
  if (reviews.length === 0) return null;
  const byLine: Record<string, number> = {};
  for (const k of REVIEW_KEYS) {
    const vals = reviews.map((r) => Number(r.scores[k])).filter((n) => Number.isFinite(n) && n >= 1 && n <= 4);
    byLine[k] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
  }
  const lines = Object.values(byLine).filter((n) => n > 0);
  const overall = lines.length ? Math.round((lines.reduce((a, b) => a + b, 0) / lines.length) * 10) / 10 : 0;
  return { byLine, overall };
}

/** Whether a review is complete enough to send: every line scored. */
export const reviewComplete = (scores: Record<string, number>) => REVIEW_KEYS.every((k) => scores[k] >= 1 && scores[k] <= 4);

export interface PathContext {
  clients: WealthClient[];
  prep: PrepData;
  /** Cases the person has shared, and reviews they have written. */
  casesShared: number;
  reviewsGiven: number;
}

export interface PathStep {
  id: string;
  title: string;
  body: string;
  /** Where to do it. */
  to: string;
  linkLabel: string;
  /** Progress as "x of y" text, and whether it is complete. */
  progress: (c: PathContext) => { done: boolean; text: string };
}

const count = (n: number, goal: number, noun: string) => ({ done: n >= goal, text: `${Math.min(n, goal)} of ${goal} ${noun}` });

/**
 * The learning path through the wealth track, in the order that builds on itself. Every step is checked from the work actually done
 * in Wealth Tools, so there is nothing to tick by hand and nothing to claim that was not done.
 */
export const LEARNING_PATH: PathStep[] = [
  {
    id: "vocab",
    title: "Learn the language",
    body: "Work through the technical questions until ten of them are ones you could answer out loud. Time value of money, risk and return, account types, how bonds and rates relate.",
    to: "/community/wealth/prep",
    linkLabel: "Technical questions",
    progress: (c) => count(prepProgress(c.prep).confident, 10, "questions confident"),
  },
  {
    id: "discovery",
    title: "Rehearse a discovery meeting",
    body: "Role-play one of the practice clients with a friend: ask about the person before the numbers, then score yourself on the rubric.",
    to: "/community/wealth/prep",
    linkLabel: "Practice clients",
    progress: (c) => count(prepProgress(c.prep).drills, 1, "practice client worked"),
  },
  {
    id: "plan",
    title: "Build a first full plan",
    body: "Start a plan for a real peer (with their agreement) or a practice client, and take it from discovery through goals, SWOT and strategy.",
    to: "/community/wealth",
    linkLabel: "Client plans",
    progress: (c) => {
      const n = c.clients.filter((x) => normalizePlan(x.plan).goals.length > 0).length;
      return count(n, 1, "plan with goals");
    },
  },
  {
    id: "risk",
    title: "Profile risk and write the policy",
    body: "Find the client's risk tolerance and capacity, then write an investment policy statement they could sign.",
    to: "/community/wealth",
    linkLabel: "Open a plan",
    progress: (c) => count(c.clients.filter((x) => Object.keys(normalizePlan(x.plan).risk.answers).length >= 3).length, 1, "plan risk-profiled"),
  },
  {
    id: "portfolio",
    title: "Build a portfolio from sourced assumptions",
    body: "Enter capital market assumptions with a source and date, set an allocation, and read the efficient frontier, stress tests and fee drag.",
    to: "/community/wealth",
    linkLabel: "Open a plan",
    progress: (c) => count(c.clients.filter((x) => normalizePlan(x.plan).portfolio.started).length, 1, "plan with a portfolio"),
  },
  {
    id: "present",
    title: "Present it",
    body: "Build the PowerPoint, read the speaker notes aloud, and walk someone through it in under fifteen minutes.",
    to: "/community/wealth",
    linkLabel: "Open a plan",
    progress: (c) => count(c.prep.stats.decks, 1, "deck built"),
  },
  {
    id: "share",
    title: "Share an anonymized case",
    body: "Remove everything that identifies the client, then share it so classmates can learn from it and tell you what to improve.",
    to: "/community/wealth/cases",
    linkLabel: "Case library",
    progress: (c) => count(c.casesShared, 1, "case shared"),
  },
  {
    id: "review",
    title: "Review two classmates' cases",
    body: "Scoring someone else's work is the fastest way to see your own gaps. Be specific about what was strong and what to change.",
    to: "/community/wealth/cases",
    linkLabel: "Case library",
    progress: (c) => count(c.reviewsGiven, 2, "reviews written"),
  },
  {
    id: "journal",
    title: "Keep a market journal for a month",
    body: "One short entry a week: your view, the evidence, and what would change your mind. Interviewers ask what you have been reading.",
    to: "/community/wealth/prep",
    linkLabel: "Market journal",
    progress: (c) => count(c.prep.journal.length, 4, "weekly entries"),
  },
];

export function pathStatus(c: PathContext) {
  const steps = LEARNING_PATH.map((s) => ({ step: s, ...s.progress(c) }));
  return { steps, done: steps.filter((s) => s.done).length, total: steps.length };
}

/** A short line for a case card: who wrote it, when, and how many reviews it has. */
export function caseByline(c: Pick<WealthCase, "authorName" | "createdAt" | "reviewCount">, now = new Date()): string {
  const who = c.authorName.trim() || "A student in the track";
  const days = Math.max(0, Math.floor((now.getTime() - new Date(c.createdAt).getTime()) / 86_400_000));
  const when = days === 0 ? "today" : days === 1 ? "yesterday" : days < 30 ? `${days} days ago` : new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${who}, ${when}, ${c.reviewCount} review${c.reviewCount === 1 ? "" : "s"}`;
}
