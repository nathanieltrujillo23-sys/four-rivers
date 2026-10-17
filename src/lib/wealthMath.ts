import { MODEL_PORTFOLIOS, emptyPortfolio, emptyRetirement, normalizePortfolio, normalizeRetirement, withWeights, type PortfolioData, type RetirementData } from "./wealthPortfolio";

/**
 * The Wealth Tools plan: its data shape, the advisory logic (SWOT strategy, mission statement, roadmap) and the Monte Carlo
 * model. Ported from the Daily Bread "Wealth Management Track" portal; the numbers here are for planning and learning,
 * not advice.
 *
 * Monte Carlo: monthly geometric Brownian motion with a seeded generator (2,000 paths by default), contributions added at
 * each month end, so the same inputs always draw the same picture until "rerun" picks a new seed.
 */

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const uid = () => Math.random().toString(36).slice(2, 10);
export const today = () => new Date().toISOString().slice(0, 10);

/** A number typed into a box: "$1,200" -> 1200, anything unreadable -> 0. */
export const num = (v: unknown): number => {
  const x = parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};

export const fmtUsd = (n: number): string =>
  Number.isFinite(n) ? n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : "$0";

/** $1.2M, $450K, $80. */
export const fmtK = (n: number): string => {
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(n / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n)}`;
};

export const fmtPct = (x: number, d = 0): string => `${(x * 100).toFixed(d)}%`;

export const listJoin = (arr: string[]): string =>
  arr.length <= 1 ? arr.join("") : arr.length === 2 ? `${arr[0]} and ${arr[1]}` : `${arr.slice(0, -1).join(", ")}, and ${arr[arr.length - 1]}`;

export const fmtDate = (s: string): string => {
  if (!s) return "";
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

/* ------------------------------------------------------------------ */
/* Data shape                                                          */
/* ------------------------------------------------------------------ */

export const RISK_PROFILES = [
  { name: "Capital Preservation", ret: 3.5, vol: 4, desc: "Protect principal first; accepts low growth for stability." },
  { name: "Conservative", ret: 5, vol: 7, desc: "Mostly bonds and cash; small equity sleeve." },
  { name: "Moderate", ret: 6.5, vol: 11, desc: "Balanced mix; tolerates normal market swings." },
  { name: "Growth", ret: 7.5, vol: 14, desc: "Equity heavy; long horizon offsets volatility." },
  { name: "Aggressive", ret: 8.5, vol: 17, desc: "Maximum equity exposure; large drawdowns expected." },
] as const;

export const GOAL_CATEGORIES = ["Short-Term", "Medium-Term", "Long-Term Retirement/Wealth", "Giving / Generosity"] as const;
export type GoalCategory = (typeof GOAL_CATEGORIES)[number];
export const PRIORITIES = ["High", "Med", "Low"] as const;
export type Priority = (typeof PRIORITIES)[number];
export const VALUE_SUGGESTIONS = ["Faith", "Family", "Discipline", "Independence", "Generosity", "Security", "Freedom", "Legacy", "Health", "Growth", "Integrity", "Adventure"];

export const PHASES = ["30 Days", "90 Days", "6 Months", "1 Year", "3 Years"] as const;
export type Phase = (typeof PHASES)[number];
export const STATUSES = ["Pending", "In Progress", "Completed"] as const;
export type Status = (typeof STATUSES)[number];

export const SWOT_KEYS = ["S", "W", "O", "T"] as const;
export type SwotKey = (typeof SWOT_KEYS)[number];
export const SWOT_TITLES: Record<SwotKey, string> = { S: "Strengths", W: "Weaknesses", O: "Opportunities", T: "Threats" };

export interface Goal {
  id: string;
  name: string;
  category: GoalCategory;
  amount: string;
  horizon: string;
  priority: Priority;
  current: string;
  /** How essential the goal is. Defaults from the priority when not chosen. */
  bucket?: GoalBucket;
  /** What is being put toward it each month. Defaults to the straight-line amount when empty. */
  monthly?: string;
}
export const GOAL_BUCKETS = ["Essential", "Important", "Aspirational"] as const;
export type GoalBucket = (typeof GOAL_BUCKETS)[number];
/** The goal's bucket: the one chosen, or from its priority (high is essential, medium important, low aspirational). */
export const bucketOf = (g: Goal): GoalBucket => g.bucket ?? (g.priority === "High" ? "Essential" : g.priority === "Med" ? "Important" : "Aspirational");

/* ---- The financial snapshot: what the client owns and owes, and where the month goes ---- */

export const ASSET_KINDS = ["cash", "brokerage", "retirement", "education", "home", "other"] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];
export const LIABILITY_KINDS = ["card", "student", "auto", "mortgage", "other"] as const;
export type LiabilityKind = (typeof LIABILITY_KINDS)[number];
export const EXPENSE_CATS = ["Needs", "Wants", "Giving", "Saving"] as const;
export type ExpenseCat = (typeof EXPENSE_CATS)[number];
export interface AssetLine {
  id: string;
  name: string;
  kind: AssetKind;
  value: string;
}
export interface LiabilityLine {
  id: string;
  name: string;
  kind: LiabilityKind;
  balance: string;
  apr: string;
  payment: string;
}
export interface ExpenseLine {
  id: string;
  name: string;
  category: ExpenseCat;
  amount: string;
}
export interface Snapshot {
  assets: AssetLine[];
  liabilities: LiabilityLine[];
  /** Monthly spending and saving, from the client's take-home pay. */
  expenses: ExpenseLine[];
}

/** The risk questionnaire's answers (question id to the chosen option, 0 to 4) and the profile chosen by hand, if any. */
export interface RiskData {
  answers: Record<string, number>;
  /** A profile name the analyst chose over the recommended one, or "". */
  chosen: string;
}

/** The investment policy statement: wording the analyst has changed from what is generated, by section id. */
export interface IpsData {
  overrides: Record<string, string>;
}
export interface SwotItem {
  id: string;
  text: string;
}
export interface RoadmapItem {
  id: string;
  phase: Phase;
  text: string;
  source: string;
  status: Status;
}
export interface Client {
  name: string;
  age: string;
  occupation: string;
  contact: string;
  cadence: string;
  values: string[];
  risk: string;
  psychology: string;
  income: string;
  date: string;
}
export interface Mission {
  verb: string;
  values: string[];
  vision: string;
  beneficiaries: string;
  legacy: string;
  age: string;
  custom: string;
}
export interface Model {
  initial: string;
  monthly: string;
  years: number | string;
  ret: number | string;
  vol: number | string;
  goalId: string;
  customTarget: string;
  seed: number;
  inflation: number | string;
  real: boolean;
}
/** How the walk-through presentation is put together (kept with the plan). */
export interface DeckSettings {
  /** Who is presenting (the analyst). */
  presenter: string;
  /** The meeting date, "2026-10-16". */
  meetingDate: string;
  /** Section ids left out of the deck (see DECK_SECTIONS). */
  skip: string[];
  /** Extra toolkit tools to include beyond the focus areas' tools. */
  tools: string[];
}

export interface WealthPlan {
  client: Client;
  goals: Goal[];
  swot: Record<SwotKey, SwotItem[]>;
  notes: { growth: string; risk: string; remediate: string; discovery: string };
  /** The 2 or 3 areas (topic ids from the discovery workshop) the client most wants to learn about. */
  focus: string[];
  snapshot: Snapshot;
  risk: RiskData;
  ips: IpsData;
  /** The investment layer: capital market assumptions, weights, stress scenarios. */
  portfolio: PortfolioData;
  /** Planned retirement, for the retirement income simulation. */
  retirement: RetirementData;
  deck: DeckSettings;
  mission: Mission;
  model: Model;
  /** "<day>-<hour>" -> schedule category key. */
  schedule: Record<string, string>;
  roadmap: RoadmapItem[];
}

export const emptyPlan = (): WealthPlan => ({
  client: { name: "", age: "", occupation: "", contact: "", cadence: "Monthly", values: [], risk: "Moderate", psychology: "", income: "", date: today() },
  goals: [],
  swot: { S: [], W: [], O: [], T: [] },
  notes: { growth: "", risk: "", remediate: "", discovery: "" },
  focus: [],
  snapshot: { assets: [], liabilities: [], expenses: [] },
  risk: { answers: {}, chosen: "" },
  ips: { overrides: {} },
  portfolio: emptyPortfolio(),
  retirement: emptyRetirement(),
  deck: { presenter: "", meetingDate: today(), skip: [], tools: [] },
  mission: { verb: "Stewarding", values: [], vision: "", beneficiaries: "", legacy: "generational impact", age: "", custom: "" },
  model: { initial: "", monthly: "", years: 30, ret: 6.5, vol: 11, goalId: "", customTarget: "", seed: 42, inflation: 2.5, real: false },
  schedule: {},
  roadmap: [],
});

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Reads a saved plan (or nothing) into a complete plan, tolerating a partly missing or hand-edited document. */
export function normalizePlan(raw: unknown): WealthPlan {
  const base = emptyPlan();
  if (!isObj(raw)) return base;
  const swot = isObj(raw.swot) ? raw.swot : {};
  return {
    client: { ...base.client, ...(isObj(raw.client) ? (raw.client as Partial<Client>) : {}), values: arr<string>(isObj(raw.client) ? raw.client.values : []) },
    goals: arr<Goal>(raw.goals),
    swot: { S: arr<SwotItem>(swot.S), W: arr<SwotItem>(swot.W), O: arr<SwotItem>(swot.O), T: arr<SwotItem>(swot.T) },
    notes: { ...base.notes, ...(isObj(raw.notes) ? (raw.notes as Partial<WealthPlan["notes"]>) : {}) },
    focus: arr<string>(raw.focus).filter((x) => typeof x === "string").slice(0, 3),
    snapshot: {
      assets: arr<AssetLine>(isObj(raw.snapshot) ? raw.snapshot.assets : []),
      liabilities: arr<LiabilityLine>(isObj(raw.snapshot) ? raw.snapshot.liabilities : []),
      expenses: arr<ExpenseLine>(isObj(raw.snapshot) ? raw.snapshot.expenses : []),
    },
    risk: {
      answers: isObj(raw.risk) && isObj(raw.risk.answers) ? (raw.risk.answers as Record<string, number>) : {},
      chosen: isObj(raw.risk) && typeof raw.risk.chosen === "string" ? raw.risk.chosen : "",
    },
    ips: { overrides: isObj(raw.ips) && isObj(raw.ips.overrides) ? (raw.ips.overrides as Record<string, string>) : {} },
    portfolio: normalizePortfolio(raw.portfolio),
    retirement: normalizeRetirement(raw.retirement),
    deck: {
      ...base.deck,
      ...(isObj(raw.deck) ? (raw.deck as Partial<DeckSettings>) : {}),
      skip: arr<string>(isObj(raw.deck) ? raw.deck.skip : []),
      tools: arr<string>(isObj(raw.deck) ? raw.deck.tools : []),
    },
    mission: { ...base.mission, ...(isObj(raw.mission) ? (raw.mission as Partial<Mission>) : {}), values: arr<string>(isObj(raw.mission) ? raw.mission.values : []) },
    model: { ...base.model, ...(isObj(raw.model) ? (raw.model as Partial<Model>) : {}) },
    schedule: isObj(raw.schedule) ? (raw.schedule as Record<string, string>) : {},
    roadmap: arr<RoadmapItem>(raw.roadmap),
  };
}

/** Whether the plan has anything in it yet (used to offer the example only to an empty plan). */
export function isPlanEmpty(p: WealthPlan): boolean {
  return (
    !p.client.name && !p.client.occupation && p.goals.length === 0 && SWOT_KEYS.every((k) => p.swot[k].length === 0) &&
    !p.mission.vision && !p.mission.custom && !p.notes.discovery && p.focus.length === 0 && p.snapshot.assets.length === 0 && p.snapshot.liabilities.length === 0 && p.snapshot.expenses.length === 0 && !p.portfolio.started && p.roadmap.length === 0 && Object.keys(p.schedule).length === 0 && !num(p.model.initial) && !num(p.model.monthly)
  );
}

/* ------------------------------------------------------------------ */
/* Advisory logic                                                      */
/* ------------------------------------------------------------------ */

// Order matters: the first match wins.
const TACTICS: [RegExp, string][] = [
  [/no retirement|not opened|no account/i, "Open the account this month, even with a small automatic deposit, to start the compounding clock."],
  [/debt|credit|apr|loan/i, "Attack the highest APR balance first (avalanche method) and freeze new card spending until it is cleared."],
  [/emergency|buffer|cushion/i, "Build a $1,000 starter buffer, then grow it to 3 to 6 months of essential expenses in a high yield savings account."],
  [/irregular|variable|inconsistent/i, "Budget from the lowest earning month on record and sweep any surplus to goals every week."],
  [/roth/i, "Fund a Roth IRA while the tax bracket is low (2026 limit: $7,500; requires earned income at least equal to the contribution)."],
  [/401|match/i, "Contribute at least enough to capture the full employer match: an immediate return on every dollar deferred."],
  [/tip/i, "Log tips daily. The federal qualified tip deduction (up to $25,000 per year, tax years 2025 through 2028) reduces federal income tax; payroll taxes still apply."],
  [/real estate|house|duplex|property/i, "Stack a down payment reserve and study owner occupied 2 to 4 unit (house hacking) financing options."],
  [/compound|runway/i, "Automate contributions now; the earliest years of compounding do the heaviest lifting."],
  [/lifestyle|creep/i, "Commit future raises in advance: route at least half of every raise to savings automatically."],
  [/hours|slow|layoff|job|volatil|recession/i, "Hold an extra month of cash and keep one backup income stream active."],
  [/overtrad|speculat|gambl|crypto/i, "Cap speculative capital at 5% of investable assets; keep the core in diversified index funds."],
  [/car|medical|repair|surprise|expense/i, "Create sinking funds for predictable irregular costs and review insurance deductibles."],
  [/side|hustle|freelanc/i, "Treat side income as growth capital: invest a fixed share and set aside about 25% for taxes."],
  [/bilingual|spanish|language/i, "Market bilingual skills for higher paying, client facing roles and a broader referral network."],
  [/disciplin|consistent|habit/i, "Convert discipline into automation so progress never depends on willpower."],
  [/sav(e|ing)/i, "Lock the savings rate in with automatic transfers that fire on payday."],
  [/educat|course|degree|finance|business/i, "Apply coursework directly: build and review a personal financial plan each semester."],
];
const tacticFor = (text = ""): string | null => TACTICS.find(([re]) => re.test(text))?.[1] ?? null;
const remediationRank = (t: string) => (/debt|credit|apr|loan/i.test(t) ? 1 : /emergency|buffer/i.test(t) ? 2 : /irregular|variable/i.test(t) ? 3 : 4);

export interface Insight {
  headline: string;
  tactic: string;
}
export interface Insights {
  growth: Insight[];
  risk: Insight[];
  remediate: (Insight & { rank: number })[];
  blockers: string[];
}

/** Turns the SWOT into three strategy tracks: grow (S x O), defend (S x T), and fix the foundation (W). */
export function synthesize(swot: WealthPlan["swot"]): Insights {
  const S = swot.S.map((x) => x.text);
  const W = swot.W.map((x) => x.text);
  const O = swot.O.map((x) => x.text);
  const T = swot.T.map((x) => x.text);
  const growth = O.map((o, i) => {
    const s = S.length ? S[i % S.length] : null;
    return {
      headline: s ? `Use "${s}" to capture "${o}".` : `Capture "${o}". Identify a strength to anchor it.`,
      tactic: tacticFor(o) || tacticFor(s || "") || "Assign a dollar amount, a date, and an account to this opportunity.",
    };
  });
  const risk = T.map((t, i) => {
    const s = S.length ? S[(i + 1) % S.length] : null;
    return {
      headline: s ? `Deploy "${s}" as a shield against "${t}".` : `Defend against "${t}". Build a strength that offsets it.`,
      tactic: tacticFor(t) || "Quantify the downside and pre fund a response before it happens.",
    };
  });
  const remediate = W.map((w) => ({ headline: w, tactic: tacticFor(w) || "Define a measurable fix, an owner, and a deadline.", rank: remediationRank(w) })).sort(
    (a, b) => a.rank - b.rank,
  );
  const blockers = W.filter((w) => /debt|credit|apr|emergency|buffer/i.test(w));
  return { growth, risk, remediate, blockers };
}

/** The one-sentence money mission, from the guided builder (or the person's own wording if they wrote one). */
export function buildMission(m: Mission, client: Client): string {
  if (m.custom && m.custom.trim()) return m.custom.trim();
  const vals = (m.values.length ? m.values : client.values).map((v) => v.toLowerCase());
  if (!m.vision && !vals.length && !m.beneficiaries) return "";
  let s = `${m.verb} today's resources`;
  if (vals.length) s += `, guided by ${listJoin(vals)},`;
  const tail = [`achieve ${m.vision || "financial independence"}`];
  if (m.beneficiaries) tail.push(`provide for ${m.beneficiaries}`);
  if (m.legacy) tail.push(`build ${m.legacy}`);
  s += ` to ${listJoin(tail)}`;
  if (m.age) s += ` by age ${m.age}`;
  return `${s}.`;
}

/* ------------------------------------------------------------------ */
/* Monte Carlo engine (monthly GBM, seeded)                            */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const quantile = (sorted: number[], q: number): number => {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

export interface McParams {
  initial: number;
  monthly: number;
  years: number;
  ret: number;
  vol: number;
  target: number;
  inflation?: number;
  real?: boolean;
  paths?: number;
  seed?: number;
  snapshots?: boolean;
  /** Run this many months instead of `years` whole years (for goals that are less than a year away); no yearly snapshots. */
  months?: number;
}
export interface McPoint {
  year: number;
  label: string;
  p10: number;
  p50: number;
  p90: number;
  contributed: number;
}
export interface McResult {
  data: McPoint[];
  final: McPoint;
  prob: number | null;
  years: number;
  contributed: number;
}

export function runMonteCarlo(p: McParams & { snapshots?: true }): McResult;
export function runMonteCarlo(p: McParams & { snapshots: false }): { prob: number | null };
export function runMonteCarlo(p: McParams): McResult | { prob: number | null };
export function runMonteCarlo({ initial, monthly, years, ret, vol, target, inflation = 0, real = false, paths = 2000, seed = 42, snapshots = true, months: monthsOverride }: McParams) {
  const rnd = mulberry32(seed);
  const Y = Math.max(1, Math.min(60, Math.round(years)));
  const months = monthsOverride ? Math.max(1, Math.round(monthsOverride)) : Y * 12;
  const mu = Math.log(1 + ret / 100); // continuous growth rate matching the expected annual return
  const s = Math.max(0, vol / 100);
  const dt = 1 / 12;
  const drift = (mu - 0.5 * s * s) * dt; // GBM log drift
  const diff = s * Math.sqrt(dt);
  const defl = (y: number) => (real ? Math.pow(1 + inflation / 100, y) : 1);
  let spare: number | null = null;
  const gauss = () => {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u = 0;
    while (u === 0) u = rnd();
    const v = rnd();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
  const snaps = snapshots && !monthsOverride ? Array.from({ length: Y + 1 }, () => new Float64Array(paths)) : null;
  let success = 0;
  const finalDefl = monthsOverride ? 1 : defl(Y);
  for (let p = 0; p < paths; p++) {
    let b = initial;
    if (snaps) snaps[0][p] = b;
    for (let m = 1; m <= months; m++) {
      b = b * Math.exp(drift + diff * gauss()) + monthly;
      if (snaps && m % 12 === 0) snaps[m / 12][p] = b / defl(m / 12);
    }
    if (target > 0 && b / finalDefl >= target) success++;
  }
  const prob = target > 0 ? success / paths : null;
  if (!snaps) return { prob };
  const data: McPoint[] = snaps.map((a, y) => {
    const sorted = Array.from(a).sort((x, z) => x - z);
    return {
      year: y,
      label: `Yr ${y}`,
      p10: Math.round(quantile(sorted, 0.1)),
      p50: Math.round(quantile(sorted, 0.5)),
      p90: Math.round(quantile(sorted, 0.9)),
      contributed: Math.round((initial + monthly * 12 * y) / defl(y)),
    };
  });
  return { data, final: data[data.length - 1], prob, years: Y, contributed: initial + monthly * months } satisfies McResult;
}

/** The smallest monthly contribution (to the nearest $5) that reaches the target with probability `prob`, or null. */
export function solveMonthlyFor(prob: number, params: McParams): number | null {
  if (!(params.target > 0)) return null;
  const base = { ...params, paths: 600, snapshots: false as const, seed: 7 };
  const reach = (monthly: number) => runMonteCarlo({ ...base, monthly }).prob ?? 0;
  let lo = 0;
  let hi = Math.max(50, params.target / (Math.max(1, params.years) * 12)) * 1.5;
  for (let i = 0; i < 8 && reach(hi) < prob; i++) hi *= 2;
  if (reach(hi) < prob) return null;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (reach(mid) >= prob) hi = mid;
    else lo = mid;
  }
  return Math.ceil(hi / 5) * 5;
}

/** Runs the model exactly as the plan describes it. */
export function simulatePlan(plan: WealthPlan): { sim: McResult; target: number } {
  const m = plan.model;
  const goal = plan.goals.find((g) => g.id === m.goalId);
  const target = m.goalId === "custom" ? num(m.customTarget) : goal ? num(goal.amount) : 0;
  const sim = runMonteCarlo({
    initial: num(m.initial),
    monthly: num(m.monthly),
    years: num(m.years) || 1,
    ret: num(m.ret),
    vol: num(m.vol),
    target,
    inflation: num(m.inflation),
    real: !!m.real,
    seed: m.seed || 42,
  });
  return { sim, target };
}

/* ------------------------------------------------------------------ */
/* Roadmap generator                                                   */
/* ------------------------------------------------------------------ */

/** Builds milestones in five phases from the plan's SWOT, goals, model and schedule. */
export function generateRoadmap(data: WealthPlan, sim: McResult | null): RoadmapItem[] {
  const items: RoadmapItem[] = [];
  const add = (phase: Phase, text: string, source: string) => items.push({ id: uid(), phase, text, source, status: "Pending" });
  const { swot, goals, model, schedule } = data;
  const W = swot.W.map((x) => x.text);
  const O = swot.O.map((x) => x.text);
  const T = swot.T.map((x) => x.text);
  const S = swot.S.map((x) => x.text);

  add("30 Days", "Open a high yield savings account and automate a transfer every payday", "Habit");
  W.slice()
    .sort((a, b) => remediationRank(a) - remediationRank(b))
    .forEach((w) => {
      if (/debt|credit|apr|loan/i.test(w)) add("30 Days", `List every balance and APR; start avalanche payoff (${w})`, "Weakness");
      else if (/emergency|buffer/i.test(w)) add("30 Days", "Reach a $1,000 starter emergency buffer", "Weakness");
      else if (/irregular|variable/i.test(w)) add("30 Days", "Build a baseline budget from the lowest income month; bank tips daily", "Weakness");
      else if (/retirement|account/i.test(w)) add("30 Days", "Open a Roth IRA and set a recurring contribution", "Weakness");
      else add("90 Days", `Resolve: ${w}`, "Weakness");
    });
  const wealthHours = Object.values(schedule || {}).filter((v) => v === "wealth").length;
  add("30 Days", wealthHours ? `Protect ${wealthHours} weekly wealth planning hour${wealthHours > 1 ? "s" : ""} on the calendar` : "Block at least one weekly money date on the calendar", "Habit");

  if (num(model.monthly) > 0) add("90 Days", `Automate ${fmtUsd(num(model.monthly))}/month into the long term investment account`, "Model");
  goals.filter((g) => g.category === "Short-Term").forEach((g) => add(num(g.horizon) <= 0.5 ? "90 Days" : "6 Months", `Fully fund "${g.name}" (${fmtUsd(num(g.amount))})`, "Goal"));

  if (W.some((w) => /emergency|buffer/i.test(w))) add("6 Months", "Grow emergency fund to 3 months of essential expenses", "Weakness");
  O.slice(0, 2).forEach((o) => add("6 Months", `Act on opportunity: ${o}`, "Opportunity"));
  T.slice(0, 2).forEach((t) => add("6 Months", `Defense in place for: ${t}`, "Threat"));

  add("1 Year", "Fund the Roth IRA toward the $7,500 annual limit (2026)", "Opportunity");
  if (S[0]) add("1 Year", `Scale strength into income: ${S[0]}`, "Strength");
  add("1 Year", "Annual review: refresh SWOT, rerun model, rebalance", "Habit");

  goals.filter((g) => g.category === "Medium-Term").forEach((g) => add(num(g.horizon) <= 1 ? "1 Year" : "3 Years", `Hit "${g.name}" target of ${fmtUsd(num(g.amount))}`, "Goal"));
  goals.filter((g) => g.category === "Giving / Generosity").forEach((g) => add("90 Days", `Automate giving toward "${g.name}" (${fmtUsd(num(g.amount))}/yr) on payday, first`, "Goal"));
  if (sim && sim.data.length > 3) add("3 Years", `Portfolio checkpoint: median path projects ${fmtUsd(sim.data[3].p50)} by year 3`, "Model");
  goals.filter((g) => g.category === "Long-Term Retirement/Wealth").forEach((g) => add("3 Years", `On track check for "${g.name}" (${fmtUsd(num(g.amount))} in ${num(g.horizon)} yrs)`, "Goal"));
  return items;
}

/* ------------------------------------------------------------------ */
/* Weekly schedule                                                     */
/* ------------------------------------------------------------------ */

export const SCHED_CATS = [
  { key: "academic", label: "Classes / Academic", color: "#2f7fb8" },
  { key: "work", label: "Work / Shifts", color: "#c9a24b" },
  { key: "faith", label: "Faith / Church", color: "#7c5cbf" },
  { key: "orgs", label: "Student Orgs / Leadership", color: "#c0405a" },
  { key: "fitness", label: "Fitness / Personal", color: "#2f6f4f" },
  { key: "wealth", label: "Wealth Planning / Study", color: "#274b6d" },
] as const;
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
/** 6am to 11pm slots. */
export const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);
export const hourLabel = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? "a" : "p"}`;

/* ------------------------------------------------------------------ */
/* An example plan                                                     */
/* ------------------------------------------------------------------ */

const fillSched = (entries: [number[], number, number, string][]): Record<string, string> => {
  const s: Record<string, string> = {};
  entries.forEach(([days, start, end, cat]) =>
    days.forEach((d) => {
      for (let h = start; h < end; h++) s[`${d}-${h}`] = cat;
    }),
  );
  return s;
};

/** A worked example (a college student with tip income and a credit card), so someone can see a full plan before starting. */
export function samplePlan(): WealthPlan {
  const g = (name: string, category: GoalCategory, amount: number, horizon: number, priority: Priority, current: number): Goal => ({
    id: uid(),
    name,
    category,
    amount: String(amount),
    horizon: String(horizon),
    priority,
    current: String(current),
  });
  const goals = [
    g("Emergency fund (3 months)", "Short-Term", 6000, 1, "High", 1200),
    g("Pay off credit card", "Short-Term", 2400, 0.5, "High", 600),
    g("Reliable used car", "Medium-Term", 12000, 3, "Med", 2000),
    g("House hack down payment (duplex)", "Medium-Term", 35000, 5, "High", 0),
    g("Graduate school fund", "Medium-Term", 15000, 4, "Low", 0),
    g("Financial independence portfolio", "Long-Term Retirement/Wealth", 1500000, 35, "High", 3500),
    g("Annual giving and tithe fund", "Giving / Generosity", 3100, 1, "High", 260),
  ];
  const it = (list: string[]): SwotItem[] => list.map((text) => ({ id: uid(), text }));
  const data: WealthPlan = {
    client: {
      name: "Marcus Rivera",
      age: "21",
      occupation: "Junior, business major (real estate focus); restaurant server about 25 hrs/week",
      contact: "marcus.rivera@email.com · text preferred",
      cadence: "Weekly money date, monthly check in",
      values: ["Faith", "Family", "Discipline", "Independence", "Generosity"],
      risk: "Growth",
      psychology: "Comfortable with volatility and excited about markets, but tends to make impulsive trades when bored. Motivated by visible progress; carries anxiety about debt.",
      income: "2600",
      date: today(),
    },
    goals,
    swot: {
      S: it(["Saves about 20% of tip income", "Disciplined schedule with consistent shift availability", "Bilingual: English and Spanish", "Business coursework in real estate and finance", "No student loan debt (scholarship)"]),
      W: it(["$2,400 credit card balance at 27% APR", "Emergency fund covers under 1 month", "Irregular income from tips makes budgeting hard", "No retirement account opened yet"]),
      O: it(["Roth IRA while in a low tax bracket", "Federal tip income deduction through 2028", "Real estate internships and licensing", "Long runway for market compounding (35+ years)", "Employer 401(k) match after graduation"]),
      T: it(["Restaurant hours cut in slow season", "Lifestyle creep after graduation", "Car repair or medical surprise", "Overtrading or speculative bets"]),
    },
    notes: {
      growth: "",
      risk: "",
      remediate: "",
      discovery: "Met on campus after a Daily Bread study. Wants to stop living tip to tip, clear the card, and start investing before graduation. Lights up talking about owning a duplex someday.",
    },
    focus: ["debt", "markets", "house"],
    snapshot: {
      assets: [
        { id: uid(), name: "Checking", kind: "cash", value: "600" },
        { id: uid(), name: "Savings (emergency fund)", kind: "cash", value: "1200" },
        { id: uid(), name: "Roth IRA", kind: "retirement", value: "3500" },
      ],
      liabilities: [{ id: uid(), name: "Credit card", kind: "card", balance: "2400", apr: "27", payment: "75" }],
      expenses: [
        { id: uid(), name: "Rent and utilities", category: "Needs", amount: "900" },
        { id: uid(), name: "Groceries", category: "Needs", amount: "300" },
        { id: uid(), name: "Transportation and phone", category: "Needs", amount: "270" },
        { id: uid(), name: "Eating out and fun", category: "Wants", amount: "260" },
        { id: uid(), name: "Subscriptions", category: "Wants", amount: "50" },
        { id: uid(), name: "Tithe and giving", category: "Giving", amount: "260" },
        { id: uid(), name: "Roth IRA and emergency fund", category: "Saving", amount: "300" },
      ],
    },
    risk: { answers: { t1: 3, t2: 2, t3: 3, t4: 3, t5: 2, t6: 3, c2: 1, c4: 4 }, chosen: "" },
    ips: { overrides: {} },
    portfolio: {
      ...withWeights(emptyPortfolio(), MODEL_PORTFOLIOS.Growth),
      source: "Illustrative placeholder assumptions for the example client; replace with a published set",
      asOf: today(),
    },
    retirement: { age: "65", spend: "60000", income: "20000", length: "30" },
    deck: { presenter: "", meetingDate: today(), skip: [], tools: [] },
    mission: { verb: "Stewarding", values: ["Faith", "Family", "Discipline"], vision: "financial independence", beneficiaries: "my family and community", legacy: "generational impact", age: "45", custom: "" },
    model: { initial: "4700", monthly: "400", years: 35, ret: 7.5, vol: 14, goalId: goals[5].id, customTarget: "", seed: 42, inflation: 2.5, real: false },
    schedule: fillSched([
      [[0, 2, 4], 7, 8, "fitness"],
      [[5], 9, 10, "fitness"],
      [[0, 2, 4], 9, 11, "academic"],
      [[1, 3], 10, 12, "academic"],
      [[0, 1, 2], 14, 16, "academic"],
      [[1, 3], 13, 14, "academic"],
      [[3, 4, 5], 17, 22, "work"],
      [[6], 11, 16, "work"],
      [[6], 9, 11, "faith"],
      [[2], 19, 20, "faith"],
      [[0, 1], 18, 19, "orgs"],
      [[0, 2], 20, 21, "wealth"],
      [[6], 18, 19, "wealth"],
    ]),
    roadmap: [],
  };
  const sim = runMonteCarlo({ initial: 4700, monthly: 400, years: 35, ret: 7.5, vol: 14, target: 1500000, paths: 500 });
  data.roadmap = generateRoadmap(data, sim).map((x, i) => ({ ...x, status: (i < 2 ? "Completed" : i < 4 ? "In Progress" : "Pending") as Status }));
  return data;
}

/* ------------------------------------------------------------------ */
/* Education hub: how each kind of account grows, after tax            */
/* ------------------------------------------------------------------ */

/** One $5,000 deposit, grown for `years` at `rate`% and taxed on the way out. Illustrative, not a forecast. */
export function vehicleGrowth(years: number, rate: number) {
  const P = 5000;
  const r = rate / 100;
  const n = Math.max(1, years);
  const roth = P * Math.pow(1 + r, n);
  const trad = roth * (1 - 0.15);
  const taxV = P * Math.pow(1 + r - 0.008, n);
  const taxable = taxV - (taxV - P) * 0.15;
  const hysa = P * Math.pow(1 + 0.04 * (1 - 0.12), n);
  return [
    { name: "Roth IRA", value: Math.round(roth) },
    { name: "Traditional 401(k)", value: Math.round(trad) },
    { name: "Taxable brokerage", value: Math.round(taxable) },
    { name: "High yield savings", value: Math.round(hysa) },
  ];
}

/* ------------------------------------------------------------------ */
/* Scenario analysis: what changes the outcome                         */
/* ------------------------------------------------------------------ */

export interface ScenarioGrid {
  /** The monthly contributions compared, smallest first. */
  monthly: number[];
  profiles: { name: string; ret: number; vol: number }[];
  /** cells[row][col]: the median ending balance and the chance of reaching the target (null with no target). */
  cells: { median: number; prob: number | null }[][];
  target: number;
  years: number;
}

/**
 * The plan's model run at four monthly contributions and three risk profiles, so a client can see what saving more, or
 * taking more (or less) risk, does to the outcome. Uses fewer paths than the main model so it stays quick.
 */
export function scenarioGrid(plan: WealthPlan): ScenarioGrid {
  const m = plan.model;
  const base = num(m.monthly);
  const monthly = (base > 0 ? [0.5, 1, 1.5, 2].map((f) => Math.max(0, Math.round((base * f) / 5) * 5)) : [100, 250, 500, 1000]).filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  const profiles = RISK_PROFILES.filter((r) => ["Conservative", "Moderate", "Growth"].includes(r.name)).map((r) => ({ name: r.name, ret: r.ret, vol: r.vol }));
  const { target } = simulatePlan(plan);
  const years = num(m.years) || 1;
  const cells = monthly.map((mo) =>
    profiles.map((p) => {
      const r = runMonteCarlo({
        initial: num(m.initial),
        monthly: mo,
        years,
        ret: p.ret,
        vol: p.vol,
        target,
        inflation: num(m.inflation),
        real: !!m.real,
        paths: 500,
        seed: 11,
      });
      return { median: r.final.p50, prob: r.prob };
    }),
  );
  return { monthly, profiles, cells, target, years };
}

/** The headline facts a presenter leads with, computed once so every slide agrees. */
export function planFacts(plan: WealthPlan) {
  const total = plan.goals.reduce((s, g) => s + num(g.amount), 0);
  const saved = plan.goals.reduce((s, g) => s + Math.min(num(g.current), num(g.amount)), 0);
  const monthlyNeed = plan.goals.reduce((s, g) => s + Math.max(0, num(g.amount) - num(g.current)) / Math.max(1, num(g.horizon) * 12), 0);
  const { sim, target } = simulatePlan(plan);
  const insights = synthesize(plan.swot);
  const mission = buildMission(plan.mission, plan.client);
  return { total, saved, monthlyNeed, sim, target, insights, mission };
}

/* ------------------------------------------------------------------ */
/* The financial snapshot                                              */
/* ------------------------------------------------------------------ */

const sumBy = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((t, x) => t + f(x), 0);

export type Light = "good" | "ok" | "low";

/** Net worth, liquidity, savings rate and debt load, each with a plain rule of thumb. */
export function snapshotMetrics(plan: WealthPlan) {
  const { assets, liabilities, expenses } = plan.snapshot;
  const income = num(plan.client.income);
  const totalAssets = sumBy(assets, (a) => num(a.value));
  const totalDebt = sumBy(liabilities, (l) => num(l.balance));
  const cash = sumBy(assets.filter((a) => a.kind === "cash"), (a) => num(a.value));
  const investable = sumBy(assets.filter((a) => a.kind === "brokerage" || a.kind === "retirement"), (a) => num(a.value));
  const by = (cat: ExpenseCat) => sumBy(expenses.filter((e) => e.category === cat), (e) => num(e.amount));
  const needs = by("Needs");
  const wants = by("Wants");
  const giving = by("Giving");
  const saving = by("Saving");
  const spent = needs + wants + giving + saving;
  const debtPayments = sumBy(liabilities, (l) => num(l.payment));
  const weightedApr = totalDebt > 0 ? sumBy(liabilities, (l) => num(l.balance) * num(l.apr)) / totalDebt : 0;
  const emergencyMonths = needs > 0 ? cash / needs : null;
  const savingsRate = income > 0 ? saving / income : null;
  const debtShare = income > 0 ? debtPayments / income : null;
  const light = {
    emergency: emergencyMonths == null ? null : ((emergencyMonths >= 6 ? "good" : emergencyMonths >= 3 ? "ok" : "low") as Light),
    savings: savingsRate == null ? null : ((savingsRate >= 0.2 ? "good" : savingsRate >= 0.1 ? "ok" : "low") as Light),
    debt: debtShare == null ? null : ((debtShare <= 0.15 ? "good" : debtShare <= 0.36 ? "ok" : "low") as Light),
    surplus: income > 0 ? ((income - spent >= 0 ? "good" : "low") as Light) : null,
  };
  return {
    totalAssets,
    totalDebt,
    netWorth: totalAssets - totalDebt,
    cash,
    investable,
    needs,
    wants,
    giving,
    saving,
    spent,
    income,
    surplus: income - spent,
    debtPayments,
    weightedApr,
    emergencyMonths,
    savingsRate,
    debtShare,
    light,
    hasAny: assets.length + liabilities.length + expenses.length > 0,
  };
}

/* ------------------------------------------------------------------ */
/* Goal funding: where each goal stands                                */
/* ------------------------------------------------------------------ */

export interface GoalOutlook {
  goal: Goal;
  bucket: GoalBucket;
  monthly: number;
  /** The yearly return and swings assumed for the money set aside for this goal, which depend on how soon it is needed. */
  ret: number;
  vol: number;
  /** The chance of reaching the target by the goal's date, in 2,000 simulated markets (500 for speed), or null with no target. */
  prob: number | null;
  status: "On track" | "Watch" | "Behind";
}

/**
 * Money needed soon belongs in safe holdings, so the return assumed for a goal depends on its horizon: cash for a year or less,
 * cash and short bonds up to three years, a bond-heavy mix up to five, and the plan's own portfolio beyond that.
 */
export function goalAssumption(horizonYears: number, portfolioRet: number, portfolioVol: number): { ret: number; vol: number } {
  if (horizonYears <= 1) return { ret: 3.5, vol: 0.5 };
  if (horizonYears <= 3) return { ret: Math.min(4.5, portfolioRet), vol: 3 };
  if (horizonYears <= 5) return { ret: Math.min(5.5, portfolioRet), vol: Math.min(7, portfolioVol) };
  return { ret: portfolioRet, vol: portfolioVol };
}

/** The straight-line monthly amount that funds a goal exactly on time with no growth. */
export const straightLine = (g: Goal) => Math.max(0, num(g.amount) - num(g.current)) / Math.max(1, (num(g.horizon) || 1) * 12);

/**
 * What is being put toward each goal each month. A goal with an amount typed in keeps it. The rest of the client's monthly saving
 * (the Saving lines of the snapshot, or the model's monthly amount) is shared out in order: essential goals before important ones
 * before aspirational ones, and within a bucket the soonest first. With no saving entered, each goal is assumed to be funded
 * on schedule (the straight-line amount).
 */
export function allocateSaving(plan: WealthPlan): Map<string, number> {
  const out = new Map<string, number>();
  const snap = snapshotMetrics(plan);
  const budget = snap.saving > 0 ? snap.saving : num(plan.model.monthly) > 0 ? num(plan.model.monthly) : null;
  if (budget === null) {
    for (const g of plan.goals) out.set(g.id, g.monthly !== undefined && g.monthly !== "" ? num(g.monthly) : straightLine(g));
    return out;
  }
  let left = budget - plan.goals.reduce((t, g) => t + (g.monthly !== undefined && g.monthly !== "" ? num(g.monthly) : 0), 0);
  const order = { Essential: 0, Important: 1, Aspirational: 2 } as const;
  const open = plan.goals
    .filter((g) => g.monthly === undefined || g.monthly === "")
    .sort((a, b) => order[bucketOf(a)] - order[bucketOf(b)] || (num(a.horizon) || 99) - (num(b.horizon) || 99));
  for (const g of plan.goals) if (g.monthly !== undefined && g.monthly !== "") out.set(g.id, num(g.monthly));
  for (const g of open) {
    const give = Math.max(0, Math.min(straightLine(g), left));
    out.set(g.id, give);
    left -= give;
  }
  return out;
}

/** Each goal's funded status: the chance the saving being done reaches its target on time, with horizon-appropriate returns. */
export function goalOutlooks(plan: WealthPlan): GoalOutlook[] {
  const shares = allocateSaving(plan);
  return plan.goals.map((goal) => {
    const horizon = Math.max(0.25, num(goal.horizon) || 1);
    const target = num(goal.amount);
    const monthly = shares.get(goal.id) ?? 0;
    const { ret, vol } = goalAssumption(horizon, num(plan.model.ret), num(plan.model.vol));
    const years = Math.max(1, Math.round(horizon));
    const prob =
      target > 0
        ? runMonteCarlo({ initial: num(goal.current), monthly, years, ret, vol, target, paths: 500, seed: 5, snapshots: false, months: Math.round(horizon * 12) }).prob
        : null;
    const status = prob == null ? "Watch" : prob >= 0.8 ? "On track" : prob >= 0.6 ? "Watch" : "Behind";
    return { goal, bucket: bucketOf(goal), monthly, ret, vol, prob, status };
  });
}
