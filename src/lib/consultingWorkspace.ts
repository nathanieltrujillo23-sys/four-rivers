/** The Consulting workspace: one private document per person. */
import { CONSULTING_READINESS, FRAMEWORKS, STORY_PROMPTS } from "./consultingContent";
import { defaultProfit, type Factor, type ProfitInputs, type SizingEstimate } from "./consultingMath";
import { RECRUIT_STATUSES, type Recruit } from "./ibWorkspace";

export interface DrillRun {
  date: string;
  score: number;
  total: number;
  seconds: number;
}
export interface CaseLog {
  id: string;
  date: string;
  kind: string;
  partner: string;
  /** Scores from 1 to 4 for each part of the rubric (0 means not scored). */
  scores: { structure: number; quant: number; insight: number; communication: number };
  notes: string;
}
export const CASE_RUBRIC: [keyof CaseLog["scores"], string, string][] = [
  ["structure", "Structure", "A clear, tailored framework with a hypothesis"],
  ["quant", "Quantitative", "Accurate, organized math and sensible numbers"],
  ["insight", "Insight", "Spotting what matters and drawing a conclusion from it"],
  ["communication", "Communication", "Clear, concise, confident, and a crisp recommendation"],
];

export interface ConsultingData {
  sizing: SizingEstimate[];
  profit: ProfitInputs;
  drills: DrillRun[];
  frameworks: Record<string, { mine: string; confident: boolean }>;
  stories: Record<string, string>;
  cases: CaseLog[];
  recruits: Recruit[];
  ready: Record<string, boolean>;
}
export const emptyConsulting = (): ConsultingData => ({ sizing: [], profit: defaultProfit(), drills: [], frameworks: {}, stories: {}, cases: [], recruits: [], ready: {} });

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function normalizeConsulting(raw: unknown): ConsultingData {
  const b = emptyConsulting();
  if (!isObj(raw)) return b;
  const profit = { ...b.profit };
  if (isObj(raw.profit)) for (const k of Object.keys(profit) as (keyof ProfitInputs)[]) if (typeof raw.profit[k] === "string") profit[k] = raw.profit[k] as string;
  const frameworks: ConsultingData["frameworks"] = {};
  if (isObj(raw.frameworks)) for (const [k, v] of Object.entries(raw.frameworks)) if (FRAMEWORKS.some((f) => f.id === k) && isObj(v)) frameworks[k] = { mine: str(v.mine), confident: v.confident === true };
  const stories: ConsultingData["stories"] = {};
  if (isObj(raw.stories)) for (const [k, v] of Object.entries(raw.stories)) if (STORY_PROMPTS.some((s) => s.id === k) && typeof v === "string") stories[k] = v;
  const ids = CONSULTING_READINESS.flatMap((g) => g.items.map((i) => i.id));
  const ready: ConsultingData["ready"] = {};
  if (isObj(raw.ready)) for (const [k, v] of Object.entries(raw.ready)) if (typeof v === "boolean" && ids.includes(k)) ready[k] = v;
  return {
    sizing: Array.isArray(raw.sizing)
      ? (raw.sizing as unknown[]).filter(isObj).slice(0, 30).map((e, i): SizingEstimate => ({
          id: str(e.id, `e${i}`),
          title: str(e.title, "Estimate"),
          unit: str(e.unit),
          checkLabel: str(e.checkLabel),
          check: str(e.check),
          factors: Array.isArray(e.factors) ? (e.factors as unknown[]).filter(isObj).slice(0, 10).map((f, j): Factor => ({ id: str(f.id, `f${j}`), label: str(f.label), value: str(f.value), op: f.op === "÷" ? "÷" : "x" })) : [],
        }))
      : [],
    profit,
    drills: Array.isArray(raw.drills) ? (raw.drills as unknown[]).filter(isObj).slice(-60).map((d) => ({ date: str(d.date), score: num(d.score), total: num(d.total), seconds: num(d.seconds) })) : [],
    frameworks,
    stories,
    cases: Array.isArray(raw.cases)
      ? (raw.cases as unknown[]).filter(isObj).slice(0, 200).map((c, i): CaseLog => {
          const sc = isObj(c.scores) ? c.scores : {};
          const clamp = (v: unknown) => Math.min(4, Math.max(0, Math.round(num(v))));
          return { id: str(c.id, `k${i}`), date: str(c.date), kind: str(c.kind), partner: str(c.partner), notes: str(c.notes), scores: { structure: clamp(sc.structure), quant: clamp(sc.quant), insight: clamp(sc.insight), communication: clamp(sc.communication) } };
        })
      : [],
    recruits: Array.isArray(raw.recruits) ? (raw.recruits as unknown[]).filter(isObj).slice(0, 60).map((r, i) => ({ id: str(r.id, `r${i}`), firm: str(r.firm), group: str(r.group), status: RECRUIT_STATUSES.includes(r.status as never) ? (r.status as string) : "Researching", deadline: str(r.deadline), notes: str(r.notes) })) : [],
    ready,
  };
}

/** Average score on each part of the rubric across the cases that scored it, and how many cases there are. */
export function caseAverages(cases: CaseLog[]) {
  const out = {} as Record<keyof CaseLog["scores"], number | null>;
  for (const [k] of CASE_RUBRIC) {
    const v = cases.map((c) => c.scores[k]).filter((x) => x > 0);
    out[k] = v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
  }
  return { averages: out, count: cases.length };
}

export function consultingProgress(d: ConsultingData) {
  const items = CONSULTING_READINESS.flatMap((g) => g.items);
  return {
    frameworks: Object.values(d.frameworks).filter((f) => f.confident).length,
    frameworksTotal: FRAMEWORKS.length,
    stories: STORY_PROMPTS.filter((s) => (d.stories[s.id] ?? "").trim().length > 40).length,
    storiesTotal: STORY_PROMPTS.length,
    cases: d.cases.length,
    drills: d.drills.length,
    ready: items.filter((i) => d.ready[i.id]).length,
    readyTotal: items.length,
  };
}
