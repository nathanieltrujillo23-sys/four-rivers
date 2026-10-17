/** The career-prep document one student keeps in Wealth Tools: practice ratings, answers, journal, checklist, tracker, and counters. */
import { TECH_QUESTIONS, READINESS, BEHAVIORAL_PROMPTS } from "./wealthPrepContent";
import { PERSONAS } from "./wealthPersonas";
import type { WealthClient } from "../types";
import { normalizePlan } from "./wealthMath";

export type TechRating = "confident" | "getting" | "needs";
export const APP_STATUSES = ["Researching", "Preparing", "Applied", "Interviewing", "Offer", "Declined"] as const;
export type AppStatus = (typeof APP_STATUSES)[number];

export interface JournalEntry {
  id: string;
  /** The week or day, "2026-10-17". */
  date: string;
  /** What I think is going on in markets, in a few sentences. */
  view: string;
  /** What I read or watched. */
  read: string;
  /** One idea: a stock or fund, the thesis, the risks. */
  idea: string;
  /** What I would tell a client about it. */
  client: string;
}
export interface AppRow {
  id: string;
  firm: string;
  program: string;
  deadline: string;
  status: AppStatus;
  notes: string;
}
export interface PrepData {
  tech: Record<string, TechRating>;
  behavioral: Record<string, string>;
  drills: Record<string, { notes: string; checks: Record<string, boolean> }>;
  journal: JournalEntry[];
  ready: Record<string, boolean>;
  custom: { id: string; text: string; done: boolean }[];
  apps: AppRow[];
  stats: { decks: number; caseExports: number };
}

export const emptyPrep = (): PrepData => ({ tech: {}, behavioral: {}, drills: {}, journal: [], ready: {}, custom: [], apps: [], stats: { decks: 0, caseExports: 0 } });

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const strMap = (v: unknown): Record<string, string> => (isObj(v) ? Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x === "string")) as Record<string, string> : {});

export function normalizePrep(raw: unknown): PrepData {
  const base = emptyPrep();
  if (!isObj(raw)) return base;
  const tech: PrepData["tech"] = {};
  if (isObj(raw.tech)) for (const [k, v] of Object.entries(raw.tech)) if (v === "confident" || v === "getting" || v === "needs") tech[k] = v;
  const drills: PrepData["drills"] = {};
  if (isObj(raw.drills)) {
    for (const [k, v] of Object.entries(raw.drills)) {
      if (isObj(v)) drills[k] = { notes: typeof v.notes === "string" ? v.notes : "", checks: isObj(v.checks) ? (Object.fromEntries(Object.entries(v.checks).filter(([, x]) => typeof x === "boolean")) as Record<string, boolean>) : {} };
    }
  }
  const stats = isObj(raw.stats) ? raw.stats : {};
  return {
    tech,
    behavioral: strMap(raw.behavioral),
    drills,
    journal: arr<JournalEntry>(raw.journal).filter((e) => isObj(e) && typeof (e as JournalEntry).id === "string"),
    ready: isObj(raw.ready) ? (Object.fromEntries(Object.entries(raw.ready).filter(([, x]) => typeof x === "boolean")) as Record<string, boolean>) : {},
    custom: arr<{ id: string; text: string; done: boolean }>(raw.custom).filter((c) => isObj(c) && typeof c.text === "string"),
    apps: arr<AppRow>(raw.apps).filter((a) => isObj(a) && typeof (a as AppRow).id === "string"),
    stats: { decks: Number.isFinite(Number(stats.decks)) ? Number(stats.decks) : 0, caseExports: Number.isFinite(Number(stats.caseExports)) ? Number(stats.caseExports) : 0 },
  };
}

/** How far along each part of the prep is, for the summary at the top of the page. */
export function prepProgress(d: PrepData) {
  const techTotal = TECH_QUESTIONS.length;
  const confident = TECH_QUESTIONS.filter((q) => d.tech[q.id] === "confident").length;
  const rated = TECH_QUESTIONS.filter((q) => d.tech[q.id]).length;
  const behavioral = BEHAVIORAL_PROMPTS.filter((p) => (d.behavioral[p.id] ?? "").trim().length > 20).length;
  const drills = PERSONAS.filter((p) => {
    const dr = d.drills[p.id];
    return dr && (dr.notes.trim().length > 20 || Object.values(dr.checks).some(Boolean));
  }).length;
  const items = READINESS.flatMap((g) => g.items);
  const readyDone = items.filter((i) => d.ready[i.id]).length + d.custom.filter((c) => c.done).length;
  const readyTotal = items.length + d.custom.length;
  return { techTotal, confident, rated, behavioral, behavioralTotal: BEHAVIORAL_PROMPTS.length, drills, drillsTotal: PERSONAS.length, journal: d.journal.length, readyDone, readyTotal, apps: d.apps.length };
}

/**
 * Resume bullets drafted from what has actually been done in Wealth Tools, in plain counts, and worded as educational work for
 * peers: they never claim a professional engagement. Edit them to fit your resume.
 */
export function resumeBullets(clients: WealthClient[], prep: PrepData): string[] {
  const plans = clients.map((c) => normalizePlan(c.plan));
  const n = clients.length;
  const goals = plans.reduce((t, p) => t + p.goals.length, 0);
  const tools = clients.reduce((t, c) => t + Object.keys(c.tools).length, 0);
  const withPortfolio = plans.filter((p) => p.portfolio.started).length;
  const withRisk = plans.filter((p) => Object.keys(p.risk.answers).length >= 3).length;
  const out: string[] = [];
  if (n > 0) {
    out.push(
      `Built ${n} goals-based wealth plan${n === 1 ? "" : "s"} for peers through the Daily Bread Wealth Management Track at the University of Florida (educational, not advisory): discovery notes, financial snapshot, SWOT, goals${withRisk ? ", risk profiling" : ""}${withPortfolio ? ", and an investment policy statement with a portfolio" : ""}.`,
    );
    out.push(`Modeled ${goals} client goal${goals === 1 ? "" : "s"} with Monte Carlo simulation (2,000 paths) and scenario analysis across savings rates and risk profiles to show the range of outcomes and the saving needed for an 80% chance of success.`);
  }
  if (tools > 0) out.push(`Applied ${tools} personal finance planning model${tools === 1 ? "" : "s"} (debt payoff, home purchase, retirement, tax and account comparisons) to client scenarios.`);
  if (prep.stats.decks > 0) out.push(`Produced ${prep.stats.decks} client presentation${prep.stats.decks === 1 ? "" : "s"} in PowerPoint, with native charts, exhibits with sources, and speaker notes explaining each slide.`);
  if (withPortfolio > 0) out.push(`Constructed ${withPortfolio} sample portfolio${withPortfolio === 1 ? "" : "s"} from documented capital market assumptions, with efficient frontier, stress tests against historical drawdowns, fee drag and rebalancing analysis.`);
  if (prep.journal.length > 0) out.push(`Maintain a weekly market journal (${prep.journal.length} entr${prep.journal.length === 1 ? "y" : "ies"}) with a stated view, an investment idea, risks and a client-ready explanation.`);
  const drills = prepProgress(prep).drills;
  if (drills > 0) out.push(`Completed ${drills} practice client case${drills === 1 ? "" : "s"} (discovery through recommendation) scored against a rubric.`);
  return out;
}
