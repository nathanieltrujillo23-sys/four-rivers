/**
 * The investment layer of a client plan: capital market assumptions the analyst enters (with their source), a portfolio built
 * from them, its risk and return, the efficient frontier, stress tests, fee drag, rebalancing, and a retirement income
 * simulation. This file has no imports from the rest of the plan code so the plan can depend on it.
 *
 * The starting numbers are round, illustrative placeholders for teaching. They are not a forecast and not any firm's view:
 * the analyst is expected to replace them with a published set and record where it came from.
 */

const num = (v: unknown): number => {
  const x = parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};

/* ------------------------------------------------------------------ */
/* Assumptions                                                         */
/* ------------------------------------------------------------------ */

export const CLASS_IDS = ["lc", "sc", "intl", "em", "agg", "tips", "reit", "cash"] as const;
export type ClassId = (typeof CLASS_IDS)[number];

export interface AssetClassRow {
  id: ClassId;
  name: string;
  /** Expected compound (geometric) return, percent a year, as published. */
  ret: string;
  /** Volatility (standard deviation), percent a year. */
  vol: string;
  /** The weight in the portfolio, percent. */
  weight: string;
  /** Equities count toward the equity share. */
  equity: boolean;
}

export interface PortfolioData {
  /** False until the analyst starts a portfolio; the deck leaves the investment slides out until then. */
  started: boolean;
  classes: AssetClassRow[];
  /** Correlations keyed "a|b" with a before b in CLASS_IDS order. */
  corr: Record<string, string>;
  /** Where the assumptions came from, and when. */
  source: string;
  asOf: string;
  /** The yearly fee on the portfolio (advisory plus fund costs), percent, for the fee-drag exhibit. */
  fee: string;
  /** Edited stress scenarios: scenario id to class id to return percent. */
  stress: Record<string, Record<string, string>>;
  /** The name of the analyst's own scenario. */
  customName: string;
}

/** Illustrative starting assumptions. Replace them with a published source and record it. */
const CLASS_DEFAULTS: [ClassId, string, number, number, boolean][] = [
  ["lc", "US large cap stocks", 6.5, 16, true],
  ["sc", "US small and mid cap stocks", 7, 20, true],
  ["intl", "International developed stocks", 7, 17, true],
  ["em", "Emerging markets stocks", 7.5, 22, true],
  ["agg", "US investment-grade bonds", 4.5, 5, false],
  ["tips", "Inflation-linked bonds (TIPS)", 4, 6, false],
  ["reit", "Real estate (REITs)", 6.5, 19, true],
  ["cash", "Cash", 3.5, 1, false],
];

const CORR_DEFAULTS: Record<string, number> = {
  "lc|sc": 0.9, "lc|intl": 0.85, "lc|em": 0.75, "lc|agg": 0.15, "lc|tips": 0.2, "lc|reit": 0.75, "lc|cash": 0,
  "sc|intl": 0.8, "sc|em": 0.75, "sc|agg": 0.05, "sc|tips": 0.1, "sc|reit": 0.75, "sc|cash": 0,
  "intl|em": 0.85, "intl|agg": 0.2, "intl|tips": 0.25, "intl|reit": 0.7, "intl|cash": 0,
  "em|agg": 0.2, "em|tips": 0.25, "em|reit": 0.65, "em|cash": 0,
  "agg|tips": 0.8, "agg|reit": 0.3, "agg|cash": 0.2,
  "tips|reit": 0.3, "tips|cash": 0.1,
  "reit|cash": 0,
};

/** Model portfolios for the five risk profiles, as weights in percent (illustrative; they add to 100). */
export const MODEL_PORTFOLIOS: Record<string, Record<ClassId, number>> = {
  "Capital Preservation": { lc: 10, sc: 0, intl: 5, em: 0, agg: 40, tips: 15, reit: 0, cash: 30 },
  Conservative: { lc: 20, sc: 3, intl: 7, em: 0, agg: 40, tips: 10, reit: 0, cash: 20 },
  Moderate: { lc: 30, sc: 5, intl: 12, em: 3, agg: 30, tips: 5, reit: 5, cash: 10 },
  Growth: { lc: 40, sc: 8, intl: 17, em: 5, agg: 18, tips: 2, reit: 5, cash: 5 },
  Aggressive: { lc: 48, sc: 12, intl: 20, em: 8, agg: 5, tips: 0, reit: 7, cash: 0 },
};
/** A common 60/40 reference portfolio to compare against. */
export const BENCHMARK_WEIGHTS: Record<ClassId, number> = { lc: 60, sc: 0, intl: 0, em: 0, agg: 40, tips: 0, reit: 0, cash: 0 };

export const emptyPortfolio = (): PortfolioData => ({
  started: false,
  classes: CLASS_DEFAULTS.map(([id, name, ret, vol, equity]) => ({ id, name, ret: String(ret), vol: String(vol), weight: "0", equity })),
  corr: Object.fromEntries(Object.entries(CORR_DEFAULTS).map(([k, v]) => [k, String(v)])),
  source: "",
  asOf: "",
  fee: "1",
  stress: {},
  customName: "My scenario",
});

export const corrKey = (a: ClassId, b: ClassId) => (CLASS_IDS.indexOf(a) < CLASS_IDS.indexOf(b) ? `${a}|${b}` : `${b}|${a}`);

/** A saved portfolio read safely: anything missing falls back to the illustrative default. */
export function normalizePortfolio(raw: unknown): PortfolioData {
  const base = emptyPortfolio();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const r = raw as Record<string, unknown>;
  const savedClasses = Array.isArray(r.classes) ? (r.classes as Partial<AssetClassRow>[]) : [];
  const classes = base.classes.map((c) => {
    const s = savedClasses.find((x) => x?.id === c.id);
    return s ? { ...c, ret: typeof s.ret === "string" ? s.ret : c.ret, vol: typeof s.vol === "string" ? s.vol : c.vol, weight: typeof s.weight === "string" ? s.weight : c.weight, name: typeof s.name === "string" && s.name ? s.name : c.name } : c;
  });
  const corr = { ...base.corr };
  if (r.corr && typeof r.corr === "object" && !Array.isArray(r.corr)) for (const [k, v] of Object.entries(r.corr as Record<string, unknown>)) if (k in corr && typeof v === "string") corr[k] = v;
  const stress: PortfolioData["stress"] = {};
  if (r.stress && typeof r.stress === "object" && !Array.isArray(r.stress)) {
    for (const [sid, row] of Object.entries(r.stress as Record<string, unknown>)) {
      if (row && typeof row === "object" && !Array.isArray(row)) stress[sid] = Object.fromEntries(Object.entries(row as Record<string, unknown>).filter(([, v]) => typeof v === "string")) as Record<string, string>;
    }
  }
  return {
    started: r.started === true,
    classes,
    corr,
    source: typeof r.source === "string" ? r.source : "",
    asOf: typeof r.asOf === "string" ? r.asOf : "",
    fee: typeof r.fee === "string" ? r.fee : base.fee,
    stress,
    customName: typeof r.customName === "string" && r.customName ? r.customName : base.customName,
  };
}

/** Sets the weights from a model portfolio (and marks the portfolio started). */
export function withWeights(p: PortfolioData, weights: Record<ClassId, number>): PortfolioData {
  return { ...p, started: true, classes: p.classes.map((c) => ({ ...c, weight: String(weights[c.id] ?? 0) })) };
}

/* ------------------------------------------------------------------ */
/* Risk and return                                                     */
/* ------------------------------------------------------------------ */

/** The covariance matrix from volatilities and correlations, pulled toward the identity if the correlations are not consistent. */
export function covariance(p: PortfolioData): number[][] {
  const vol = p.classes.map((c) => Math.max(0, num(c.vol)) / 100);
  const n = vol.length;
  const rho = (i: number, j: number) => {
    if (i === j) return 1;
    const v = num(p.corr[corrKey(p.classes[i].id, p.classes[j].id)]);
    return Math.max(-0.99, Math.min(0.99, v));
  };
  let lambda = 0;
  for (let attempt = 0; attempt < 30; attempt++) {
    const m = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : (1 - lambda) * rho(i, j))));
    if (isPositiveSemiDefinite(m)) return m.map((row, i) => row.map((r, j) => r * vol[i] * vol[j]));
    lambda += 0.05;
  }
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? vol[i] * vol[i] : 0)));
}

/** A Cholesky attempt: true when the matrix has no negative variance directions (so the correlations can all hold together). */
export function isPositiveSemiDefinite(m: number[][]): boolean {
  const n = m.length;
  const L = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = m[i][j];
      for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
      if (i === j) {
        if (sum < -1e-9) return false;
        L[i][j] = Math.sqrt(Math.max(sum, 0));
      } else L[i][j] = L[j][j] > 1e-12 ? sum / L[j][j] : 0;
    }
  }
  return true;
}

/** Whether the entered correlations were adjusted to be consistent. */
export function correlationsAdjusted(p: PortfolioData): boolean {
  const n = p.classes.length;
  const m = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : Math.max(-0.99, Math.min(0.99, num(p.corr[corrKey(p.classes[i].id, p.classes[j].id)]))))),
  );
  return !isPositiveSemiDefinite(m);
}

export const weightsOf = (p: PortfolioData): number[] => p.classes.map((c) => Math.max(0, num(c.weight)) / 100);
export const weightTotal = (p: PortfolioData): number => p.classes.reduce((t, c) => t + Math.max(0, num(c.weight)), 0);

export interface PortfolioStats {
  /** Average yearly return (arithmetic), the figure the Monte Carlo model uses. */
  arithmetic: number;
  /** The compound yearly return, which is lower by about half the variance. */
  geometric: number;
  vol: number;
  /** Return above cash per unit of risk. */
  sharpe: number;
  /** Weighted average volatility over portfolio volatility: how much diversification helps. */
  diversification: number;
  equity: number;
  /** A bad year, about one in ten: the average return less 1.28 standard deviations. */
  badYear: number;
  /** Each class's share of the portfolio's risk (adds to 1). */
  riskShare: number[];
}

/** Return, risk and diversification of weights (as fractions) under the assumptions. All percentages are in percent. */
export function portfolioStats(p: PortfolioData, w: number[] = weightsOf(p), covMatrix?: number[][]): PortfolioStats {
  const total = w.reduce((t, x) => t + x, 0) || 1;
  const wn = w.map((x) => x / total);
  const cov = covMatrix ?? covariance(p);
  const g = p.classes.map((c) => num(c.ret) / 100);
  const vols = p.classes.map((c) => num(c.vol) / 100);
  // Published returns are compound, so each class's average (arithmetic) return is its compound return plus half its variance.
  const arith = g.map((r, i) => r + (vols[i] * vols[i]) / 2);
  const mean = wn.reduce((t, x, i) => t + x * arith[i], 0);
  const mv = cov.map((row) => row.reduce((t, c, j) => t + c * wn[j], 0));
  const variance = Math.max(0, wn.reduce((t, x, i) => t + x * mv[i], 0));
  const sd = Math.sqrt(variance);
  const cashIdx = p.classes.findIndex((c) => c.id === "cash");
  const rf = cashIdx >= 0 ? g[cashIdx] : 0;
  const geo = mean - variance / 2;
  const avgVol = wn.reduce((t, x, i) => t + x * vols[i], 0);
  return {
    arithmetic: mean * 100,
    geometric: geo * 100,
    vol: sd * 100,
    sharpe: sd > 0 ? (geo - rf) / sd : 0,
    diversification: sd > 0 ? avgVol / sd : 1,
    equity: wn.reduce((t, x, i) => t + (p.classes[i].equity ? x : 0), 0) * 100,
    badYear: (mean - 1.28 * sd) * 100,
    riskShare: wn.map((x, i) => (variance > 0 ? (x * mv[i]) / variance : 0)),
  };
}

/* ------------------------------------------------------------------ */
/* The efficient frontier                                              */
/* ------------------------------------------------------------------ */

function mulberry(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface FrontierPoint {
  vol: number;
  ret: number;
}

/**
 * Long-only portfolios drawn at random (a fixed seed, so the picture is steady), and the best of them: for each level of
 * risk, the highest return found. Returns are the compound (geometric) yearly return, in percent.
 */
export function efficientFrontier(p: PortfolioData, draws = 12000): { cloud: FrontierPoint[]; frontier: FrontierPoint[]; assets: (FrontierPoint & { id: ClassId; name: string })[] } {
  const rnd = mulberry(2026);
  const n = p.classes.length;
  const cov = covariance(p);
  const pts: FrontierPoint[] = [];
  for (let d = 0; d < draws; d++) {
    // Some portfolios use only a few classes, so the corners of the frontier are reached too.
    const k = 1 + Math.floor(rnd() * n);
    const w = new Array(n).fill(0);
    const picks = Array.from({ length: n }, (_, i) => i).sort(() => rnd() - 0.5).slice(0, k);
    let sum = 0;
    for (const i of picks) {
      w[i] = -Math.log(1 - rnd() * 0.999999);
      sum += w[i];
    }
    const s = portfolioStats(p, w.map((x) => x / sum), cov);
    pts.push({ vol: s.vol, ret: s.geometric });
  }
  const sorted = [...pts].sort((a, b) => a.vol - b.vol);
  const frontier: FrontierPoint[] = [];
  let best = -Infinity;
  for (const pt of sorted) {
    if (pt.ret > best + 1e-9) {
      best = pt.ret;
      frontier.push(pt);
    }
  }
  // Thin the envelope to about 40 points so it draws as a line.
  const step = Math.max(1, Math.floor(frontier.length / 40));
  const thin = frontier.filter((_, i) => i % step === 0 || i === frontier.length - 1);
  const cloud = pts.filter((_, i) => i % 12 === 0);
  const assets = p.classes.map((c) => ({ id: c.id, name: c.name, vol: num(c.vol), ret: num(c.ret) }));
  return { cloud, frontier: thin, assets };
}

/* ------------------------------------------------------------------ */
/* Stress tests                                                        */
/* ------------------------------------------------------------------ */

export interface StressScenario {
  id: string;
  name: string;
  /** What the figures are: a calendar year, a cumulative period, or a peak-to-trough fall. */
  basis: string;
  returns: Record<ClassId, number>;
}

/**
 * Approximate, rounded index returns for three well-known periods, and one blank for the analyst's own. Verify against the index
 * provider before presenting; they are here to make the idea concrete.
 */
export const STRESS_DEFAULTS: StressScenario[] = [
  { id: "dotcom", name: "2000 to 2002 bear market", basis: "cumulative, three years", returns: { lc: -38, sc: -22, intl: -43, em: -37, agg: 34, tips: 42, reit: 48, cash: 12 } },
  { id: "gfc", name: "2008 financial crisis", basis: "calendar year", returns: { lc: -37, sc: -34, intl: -43, em: -53, agg: 5, tips: -2, reit: -38, cash: 1 } },
  { id: "covid", name: "2020 pandemic crash", basis: "peak to trough, Feb to Mar", returns: { lc: -34, sc: -41, intl: -34, em: -33, agg: -1, tips: -2, reit: -41, cash: 0 } },
  { id: "rates", name: "2022 rates shock", basis: "calendar year", returns: { lc: -18, sc: -20, intl: -14, em: -20, agg: -13, tips: -12, reit: -25, cash: 2 } },
  { id: "custom", name: "My scenario", basis: "as defined", returns: { lc: -25, sc: -30, intl: -25, em: -30, agg: -5, tips: -5, reit: -25, cash: 0 } },
];

export function scenarioReturns(p: PortfolioData, s: StressScenario): Record<ClassId, number> {
  const out = { ...s.returns };
  const edited = p.stress[s.id] ?? {};
  for (const id of CLASS_IDS) if (id in edited && edited[id] !== "") out[id] = num(edited[id]);
  return out;
}

export interface StressResult {
  scenario: StressScenario;
  /** The portfolio's return in the scenario, percent. */
  loss: number;
  /** Dollars gained or lost on `value`. */
  dollars: number;
  /** Years the portfolio would take to get back to where it was at its expected compound return, or null if it did not fall. */
  recoveryYears: number | null;
}

export function stressTests(p: PortfolioData, value: number): StressResult[] {
  const w = weightsOf(p);
  const total = w.reduce((t, x) => t + x, 0) || 1;
  const geo = portfolioStats(p, w).geometric / 100;
  return STRESS_DEFAULTS.map((base) => {
    const scenario = base.id === "custom" ? { ...base, name: p.customName || base.name } : base;
    const r = scenarioReturns(p, scenario);
    const loss = p.classes.reduce((t, c, i) => t + (w[i] / total) * r[c.id], 0);
    const f = 1 + loss / 100;
    return {
      scenario,
      loss,
      dollars: value * (loss / 100),
      recoveryYears: f < 1 && geo > 0 ? Math.log(1 / f) / Math.log(1 + geo) : null,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Fees, and rebalancing                                               */
/* ------------------------------------------------------------------ */

/** What a starting balance and monthly saving grow to at a yearly return net of a fee (a steady return, so only the fee differs). */
export function feeDragSeries(initial: number, monthly: number, years: number, retPercent: number, feePercent: number): number[] {
  const r = Math.max(-0.99, (retPercent - feePercent) / 100) / 12;
  const out = [initial];
  let b = initial;
  for (let m = 1; m <= years * 12; m++) {
    b = b * (1 + r) + monthly;
    if (m % 12 === 0) out.push(b);
  }
  return out;
}

export interface DriftRow {
  id: ClassId;
  name: string;
  target: number;
  /** The weight after the scenario's returns, percent. */
  drifted: number;
  /** Dollars to buy (positive) or sell (negative) to return to target. */
  trade: number;
  outsideBand: boolean;
}

/** How the weights drift after a year of the given returns, and the trades that would restore them, with a band (in points). */
export function rebalanceAfter(p: PortfolioData, returns: Record<ClassId, number>, value: number, band = 5): DriftRow[] {
  const w = weightsOf(p);
  const total = w.reduce((t, x) => t + x, 0) || 1;
  const target = w.map((x) => x / total);
  const grown = target.map((x, i) => x * (1 + returns[p.classes[i].id] / 100));
  const sum = grown.reduce((t, x) => t + x, 0) || 1;
  const newValue = value * sum;
  return p.classes.map((c, i) => {
    const drifted = grown[i] / sum;
    return {
      id: c.id,
      name: c.name,
      target: target[i] * 100,
      drifted: drifted * 100,
      trade: (target[i] - drifted) * newValue,
      outsideBand: Math.abs(drifted - target[i]) * 100 > band,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Retirement income                                                   */
/* ------------------------------------------------------------------ */

export interface RetirementData {
  /** The age the client plans to retire. */
  age: string;
  /** Yearly spending in retirement, in today's dollars. */
  spend: string;
  /** Yearly income from Social Security or a pension, in today's dollars, starting at retirement. */
  income: string;
  /** How many years retirement is planned to last. */
  length: string;
}
export const emptyRetirement = (): RetirementData => ({ age: "65", spend: "", income: "", length: "30" });
export function normalizeRetirement(raw: unknown): RetirementData {
  const base = emptyRetirement();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const r = raw as Record<string, unknown>;
  const pick = (k: keyof RetirementData) => (typeof r[k] === "string" ? (r[k] as string) : base[k]);
  return { age: pick("age"), spend: pick("spend"), income: pick("income"), length: pick("length") };
}

export interface LifecycleParams {
  currentAge: number;
  retireAge: number;
  lengthYears: number;
  initial: number;
  monthly: number;
  /** Average yearly return and volatility, in percent, and inflation. */
  ret: number;
  vol: number;
  inflation: number;
  /** Yearly spending and other income, in today's dollars. */
  spend: number;
  income: number;
  paths?: number;
  seed?: number;
}

export interface LifecyclePoint {
  age: number;
  p10: number;
  p50: number;
  p90: number;
}
export interface LifecycleResult {
  points: LifecyclePoint[];
  /** The chance the money lasts for the whole retirement. */
  success: number;
  atRetirement: { p10: number; p50: number; p90: number };
  /** The first year's withdrawal as a share of the median balance at retirement, in percent. */
  withdrawalRate: number | null;
  /** The age at which the median path runs out, or null if it does not. */
  medianLastsTo: number | null;
}

/**
 * Saving until retirement and then spending, in today's dollars (returns are reduced by inflation, and saving and spending
 * keep up with it). A path fails if the balance reaches zero before retirement ends. Withdrawals are made at the start of each
 * year, so a bad first few years matter most: that is sequence risk.
 */
export function runLifecycle(q: LifecycleParams): LifecycleResult {
  const paths = q.paths ?? 1000;
  const rnd = mulberry(q.seed ?? 99);
  const toRetire = Math.max(0, Math.round(q.retireAge - q.currentAge));
  const years = toRetire + Math.max(1, Math.round(q.lengthYears));
  const real = (1 + q.ret / 100) / (1 + q.inflation / 100) - 1;
  const s = Math.max(0, q.vol / 100);
  const mu = Math.log(1 + real);
  const dt = 1 / 12;
  const drift = (mu - 0.5 * s * s) * dt;
  const diff = s * Math.sqrt(dt);
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
  const need = Math.max(0, q.spend - q.income);
  const snaps = Array.from({ length: years + 1 }, () => new Float64Array(paths));
  let ok = 0;
  let medianAtRetire: number[] = [];
  for (let p = 0; p < paths; p++) {
    let b = q.initial;
    let failed = false;
    snaps[0][p] = b;
    for (let y = 1; y <= years; y++) {
      if (y > toRetire) b -= need; // spending begins at the start of each retirement year
      for (let m = 0; m < 12; m++) {
        if (b > 0) b = b * Math.exp(drift + diff * gauss());
        if (y <= toRetire) b += q.monthly;
      }
      if (b <= 0) {
        b = 0;
        if (y > toRetire) failed = true;
      }
      snaps[y][p] = b;
    }
    if (!failed && b > 0) ok++;
    medianAtRetire.push(snaps[toRetire][p]);
  }
  const quant = (arr: Float64Array | number[], f: number) => {
    const sorted = Array.from(arr).sort((a, b) => a - b);
    const pos = (sorted.length - 1) * f;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  };
  const points: LifecyclePoint[] = snaps.map((arr, y) => ({ age: q.currentAge + y, p10: Math.round(quant(arr, 0.1)), p50: Math.round(quant(arr, 0.5)), p90: Math.round(quant(arr, 0.9)) }));
  const median = quant(medianAtRetire, 0.5);
  const lastPositive = points.findIndex((pt, i) => i > toRetire && pt.p50 <= 0);
  return {
    points,
    success: ok / paths,
    atRetirement: { p10: Math.round(quant(medianAtRetire, 0.1)), p50: Math.round(median), p90: Math.round(quant(medianAtRetire, 0.9)) },
    withdrawalRate: median > 0 && need > 0 ? (need / median) * 100 : null,
    medianLastsTo: lastPositive === -1 ? null : points[lastPositive].age,
  };
}
