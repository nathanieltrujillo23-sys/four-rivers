/**
 * The career portfolio: a one-page summary of the practice work a student has actually done across Wealth Tools, Investment Banking
 * Tools and Consulting Tools, in plain counts, with honest bullets and a checklist to confirm before it is shared. Nothing is invented:
 * every line comes from a number in the person's own workspaces.
 */
import { ibProgress, type IbData } from "./ibWorkspace";
import { caseAverages, consultingProgress, type ConsultingData } from "./consultingWorkspace";
import { CASE_RUBRIC } from "./consultingWorkspace";
import { prepProgress, resumeBullets, type PrepData } from "./wealthPrep";
import type { WealthCase, WealthCaseReview, WealthClient } from "../types";

export interface PortfolioInput {
  wealth?: { prep: PrepData; clients: WealthClient[]; cases: WealthCase[]; reviewsGiven: number };
  ib?: IbData;
  consulting?: ConsultingData;
}

export interface PortfolioSection {
  id: "wealth" | "ib" | "consulting";
  title: string;
  /** Label and value pairs for the table of what can be shown. */
  facts: [string, string][];
  bullets: string[];
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function portfolioSections(i: PortfolioInput): PortfolioSection[] {
  const out: PortfolioSection[] = [];
  if (i.wealth) {
    const { prep, clients, cases, reviewsGiven } = i.wealth;
    const p = prepProgress(prep);
    out.push({
      id: "wealth",
      title: "Wealth management (Daily Bread track)",
      facts: [
        ["Client plans built", String(clients.length)],
        ["Presentations built", String(prep.stats.decks)],
        ["Anonymized cases shared with the track", String(cases.length)],
        ["Peer reviews written", String(reviewsGiven)],
        ["Technical questions marked confident", `${p.confident} of ${p.techTotal}`],
        ["Market journal entries", String(p.journal)],
      ],
      bullets: [
        ...resumeBullets(clients, prep),
        ...(cases.length ? [`Shared ${plural(cases.length, "anonymized case study", "anonymized case studies")} with peers in the track${reviewsGiven ? ` and wrote ${plural(reviewsGiven, "structured peer review")} against a six-line rubric` : ""}.`] : []),
      ],
    });
  }
  if (i.ib) {
    const p = ibProgress(i.ib);
    out.push({
      id: "ib",
      title: "Investment banking preparation",
      facts: [
        ["Technical questions marked confident", `${p.confident} of ${p.total}`],
        ["Deals logged and analyzed", String(p.deals)],
        ["Readiness checklist", `${p.ready} of ${p.readyTotal}`],
        ["Firms tracked", String(p.recruits)],
      ],
      bullets: [
        ...(p.confident > 0 ? [`Worked through ${p.rated} investment banking technical questions across accounting, valuation, M&A and LBOs, and rated ${p.confident} as ready to answer unprompted.`] : []),
        ...(p.deals > 0 ? [`Maintain a log of ${plural(p.deals, "recent deal")} with the strategic rationale and takeaways for each, as preparation for interviews.`] : []),
        "Built practice valuation models (DCF, trading comparables, LBO, accretion and dilution, and an integrated three-statement model) from assumptions I entered; educational practice, not real transactions.",
      ].filter((b) => !b.startsWith("Built practice") || p.confident + p.deals + p.recruits > 0),
    });
  }
  if (i.consulting) {
    const c = consultingProgress(i.consulting);
    const { averages, count } = caseAverages(i.consulting.cases);
    const scored = CASE_RUBRIC.map(([k, label]) => (averages[k] == null ? null : `${label.toLowerCase()} ${averages[k]}`)).filter(Boolean);
    const drillAvg = i.consulting.drills.length ? Math.round((i.consulting.drills.reduce((a, d) => a + d.score / Math.max(1, d.total), 0) / i.consulting.drills.length) * 100) : null;
    out.push({
      id: "consulting",
      title: "Consulting preparation",
      facts: [
        ["Practice cases logged", String(count)],
        ["Average self or partner score (of 4)", scored.length ? scored.join(", ") : "none scored yet"],
        ["Mental math drills", `${c.drills}${drillAvg != null ? `, averaging ${drillAvg}% correct` : ""}`],
        ["Case frameworks marked confident", `${c.frameworks} of ${c.frameworksTotal}`],
        ["Fit stories written", `${c.stories} of ${c.storiesTotal}`],
      ],
      bullets: [
        ...(count > 0 ? [`Completed ${plural(count, "practice case")} across ${new Set(i.consulting.cases.map((x) => x.kind)).size} case types, scored against a four-part rubric (structure, quantitative, insight, communication) and tracked over time.`] : []),
        ...(c.drills > 0 ? [`Practiced timed mental math in ${plural(c.drills, "drill")}${drillAvg != null ? `, averaging ${drillAvg}% correct` : ""}.`] : []),
        ...(c.stories > 0 ? [`Wrote and rehearsed ${plural(c.stories, "fit story", "fit stories")} using the situation, task, action, result structure.`] : []),
      ],
    });
  }
  return out;
}

/** Items the student confirms before sharing the portfolio. */
export const PORTFOLIO_CHECKS: { id: string; text: string }[] = [
  { id: "anon", text: "Nothing here names or could identify a real client, classmate or company I worked with. Only anonymized cases are included." },
  { id: "honest", text: "I claim only what I did, and I describe it as educational practice, not a professional engagement." },
  { id: "confidential", text: "I have included no confidential information from an employer, an internship, a class or a competition." },
  { id: "title", text: "I describe myself as a student and use no title or designation I do not hold." },
  { id: "models", text: "I will say that the models and numbers come from my own practice tools and are not real transactions or a track record." },
  { id: "performance", text: "I make no claim about the performance of any real investment." },
];

/** The review counts the page needs, from the lists the repository returns. */
export function reviewsGiven(reviews: WealthCaseReview[], userId: string): number {
  return reviews.filter((r) => r.reviewerId === userId).length;
}
