/**
 * Named versions of a client's model (base, upside, downside, or any the analyst builds) run side by side, and a one-at-a-time
 * sensitivity analysis (a tornado chart) showing which assumptions move the outcome most. Both use the plan's own Monte Carlo
 * model with the plan's seed, so a difference between two cases comes from the inputs and not from random draws.
 */
import { num, runMonteCarlo, type McResult, type Model, type WealthPlan } from "./wealthMath";

export const SCENARIO_FIELDS = [
  ["initial", "Starting balance", "$"],
  ["monthly", "Monthly saving", "$"],
  ["years", "Years", ""],
  ["ret", "Expected return", "%"],
  ["vol", "Volatility", "%"],
  ["inflation", "Inflation", "%"],
] as const;
export type ScenarioField = (typeof SCENARIO_FIELDS)[number][0];

export interface Scenario {
  id: string;
  name: string;
  /** Model inputs this version changes. A blank or missing input is the plan's own. */
  overrides: Partial<Record<ScenarioField, string>>;
  /** What this version stands for, in the analyst's words (shown on the slide). */
  note: string;
}
export interface ScenarioData {
  list: Scenario[];
}

export const emptyScenarios = (): ScenarioData => ({ list: [] });

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export function normalizeScenarios(raw: unknown): ScenarioData {
  if (!isObj(raw) || !Array.isArray(raw.list)) return emptyScenarios();
  const list: Scenario[] = [];
  for (const s of raw.list.slice(0, 6)) {
    if (!isObj(s) || typeof s.id !== "string") continue;
    const overrides: Scenario["overrides"] = {};
    if (isObj(s.overrides)) for (const [k] of SCENARIO_FIELDS) if (typeof s.overrides[k] === "string" && (s.overrides[k] as string).trim()) overrides[k] = s.overrides[k] as string;
    list.push({ id: s.id, name: typeof s.name === "string" && s.name.trim() ? s.name : "Scenario", overrides, note: typeof s.note === "string" ? s.note : "" });
  }
  return { list };
}

/** The usual three: the plan as it is, a better market, and a worse one with more swings. The analyst edits them. */
export function defaultScenarios(model: Model, mk: () => string): Scenario[] {
  const ret = num(model.ret);
  const vol = num(model.vol);
  const r1 = (n: number) => String(Math.round(n * 10) / 10);
  return [
    { id: mk(), name: "Base case", overrides: {}, note: "The plan as it stands: the starting balance, saving, return and swings in the model." },
    { id: mk(), name: "Upside", overrides: { ret: r1(ret + 1.5), vol: r1(Math.max(1, vol - 2)) }, note: "Markets do better than assumed: 1.5 points more a year, with calmer swings." },
    { id: mk(), name: "Downside", overrides: { ret: r1(Math.max(0, ret - 2)), vol: r1(vol + 3) }, note: "A weaker market: 2 points less a year, with larger swings." },
  ];
}

/** The plan's model with a scenario's changes applied. */
export function modelFor(plan: WealthPlan, s: Scenario): Model {
  const m = { ...plan.model };
  for (const [k] of SCENARIO_FIELDS) {
    const v = s.overrides[k];
    if (v !== undefined && v.trim() !== "") (m as Record<string, unknown>)[k] = v;
  }
  return m;
}

function targetOf(plan: WealthPlan): number {
  const goal = plan.goals.find((g) => g.id === plan.model.goalId);
  return plan.model.goalId === "custom" ? num(plan.model.customTarget) : goal ? num(goal.amount) : 0;
}

export interface ScenarioResult {
  scenario: Scenario;
  model: Model;
  sim: McResult;
  target: number;
  /** What differs from the plan's model, in words, for the table. */
  changes: string[];
}

export function runScenario(plan: WealthPlan, s: Scenario, paths = 1000): ScenarioResult {
  const m = modelFor(plan, s);
  const target = targetOf(plan);
  const sim = runMonteCarlo({ initial: num(m.initial), monthly: num(m.monthly), years: num(m.years) || 1, ret: num(m.ret), vol: num(m.vol), target, inflation: num(m.inflation), real: !!m.real, seed: m.seed || 42, paths });
  const changes = SCENARIO_FIELDS.filter(([k]) => s.overrides[k] !== undefined && s.overrides[k]!.trim() !== "" && num(s.overrides[k]) !== num(plan.model[k])).map(
    ([k, label, unit]) => `${label} ${unit === "$" ? "$" : ""}${num(s.overrides[k]).toLocaleString("en-US")}${unit === "%" ? "%" : ""}`,
  );
  return { scenario: s, model: m, sim, target, changes };
}

export function runScenarios(plan: WealthPlan, paths = 1000): ScenarioResult[] {
  return plan.scenarios.list.map((s) => runScenario(plan, s, paths));
}

/* ------------------------------------------------------------------ */
/* Sensitivity                                                         */
/* ------------------------------------------------------------------ */

export interface SensitivityRow {
  id: string;
  label: string;
  /** The adverse and favorable input values, as text. */
  adverse: string;
  favorable: string;
  /** Median ending balance and chance of the goal in each case. */
  adverseMedian: number;
  favorableMedian: number;
  adverseProb: number | null;
  favorableProb: number | null;
  swing: number;
}
export interface SensitivityResult {
  baseMedian: number;
  baseProb: number | null;
  rows: SensitivityRow[];
}

/**
 * Changes one assumption at a time, to an adverse and a favorable value, and records the median ending balance and the chance of
 * reaching the goal. Rows come back with the biggest swing first, which is what makes the chart a tornado.
 */
export function sensitivity(plan: WealthPlan, paths = 1000): SensitivityResult {
  const m = plan.model;
  const target = targetOf(plan);
  const base = { initial: num(m.initial), monthly: num(m.monthly), years: num(m.years) || 1, ret: num(m.ret), vol: num(m.vol), inflation: num(m.inflation) };
  const run = (o: Partial<typeof base>) => {
    const p = { ...base, ...o };
    return runMonteCarlo({ ...p, target, real: !!m.real, seed: m.seed || 42, paths });
  };
  const b = run({});
  const f = (n: number) => (Math.round(n * 10) / 10).toString();
  type Spec = { id: string; label: string; adv: Partial<typeof base>; fav: Partial<typeof base>; advText: string; favText: string; skip?: boolean };
  const specs: Spec[] = [
    { id: "ret", label: "Expected return", adv: { ret: Math.max(0, base.ret - 1.5) }, fav: { ret: base.ret + 1.5 }, advText: `${f(Math.max(0, base.ret - 1.5))}%`, favText: `${f(base.ret + 1.5)}%` },
    { id: "vol", label: "Volatility", adv: { vol: base.vol + 4 }, fav: { vol: Math.max(1, base.vol - 4) }, advText: `${f(base.vol + 4)}%`, favText: `${f(Math.max(1, base.vol - 4))}%` },
    { id: "monthly", label: "Monthly saving", adv: { monthly: base.monthly * 0.75 }, fav: { monthly: base.monthly * 1.25 }, advText: `$${Math.round(base.monthly * 0.75).toLocaleString("en-US")}`, favText: `$${Math.round(base.monthly * 1.25).toLocaleString("en-US")}`, skip: base.monthly <= 0 },
    { id: "years", label: "Years invested", adv: { years: Math.max(1, base.years - 5) }, fav: { years: Math.min(60, base.years + 5) }, advText: `${Math.max(1, base.years - 5)} years`, favText: `${Math.min(60, base.years + 5)} years` },
    { id: "initial", label: "Starting balance", adv: { initial: base.initial * 0.75 }, fav: { initial: base.initial * 1.25 }, advText: `$${Math.round(base.initial * 0.75).toLocaleString("en-US")}`, favText: `$${Math.round(base.initial * 1.25).toLocaleString("en-US")}`, skip: base.initial <= 0 },
    { id: "inflation", label: "Inflation", adv: { inflation: base.inflation + 1.5 }, fav: { inflation: Math.max(0, base.inflation - 1.5) }, advText: `${f(base.inflation + 1.5)}%`, favText: `${f(Math.max(0, base.inflation - 1.5))}%`, skip: !m.real },
  ];
  const rows: SensitivityRow[] = specs
    .filter((s) => !s.skip)
    .map((s) => {
      const a = run(s.adv);
      const v = run(s.fav);
      return {
        id: s.id,
        label: s.label,
        adverse: s.advText,
        favorable: s.favText,
        adverseMedian: a.final.p50,
        favorableMedian: v.final.p50,
        adverseProb: a.prob,
        favorableProb: v.prob,
        swing: Math.abs(v.final.p50 - a.final.p50),
      };
    })
    .sort((x, y) => y.swing - x.swing);
  return { baseMedian: b.final.p50, baseProb: b.prob, rows };
}
