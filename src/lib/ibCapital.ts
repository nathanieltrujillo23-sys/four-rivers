/**
 * Three more teaching models for the Investment Banking Tools: a WACC builder (with beta taken from comparables), precedent
 * transactions, and a paper LBO drill. Like the rest of ibMath they use the round numbers a student enters, simplify what a real
 * model carries, and return their working. They are not investment advice and not a basis for a real transaction.
 *
 * Amounts are in millions of dollars; rates are entered as percents.
 */
import { stats, type FieldRow, type Stat } from "./ibMath";
import { rng } from "./consultingMath";

const n = (v: unknown): number => {
  const x = parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};
const f1 = (x: number) => (Math.round(x * 10) / 10).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const f2 = (x: number) => (Math.round(x * 100) / 100).toFixed(2);
const m = (x: number) => `$${f1(x)}M`;
const p1 = (x: number) => `${f1(x * 100)}%`;
const pct = (v: string) => n(v) / 100;

/* ------------------------------------------------------------------ */
/* WACC                                                                */
/* ------------------------------------------------------------------ */

export interface BetaPeer {
  id: string;
  name: string;
  /** The peer's observed (levered) beta, its debt-to-equity ratio in percent, and its tax rate in percent. */
  beta: string;
  debtToEquity: string;
  tax: string;
}
export interface WaccInputs {
  riskFree: string;
  /** The equity risk premium, and an optional size or company-specific premium, percent. */
  erp: string;
  sizePremium: string;
  /** The levered beta used when no peers are entered (or when "from comparables" is off). */
  beta: string;
  /** Take beta from the peers: unlever each one, take the median, and relever at this company's own capital structure. */
  fromPeers: boolean;
  peers: BetaPeer[];
  /** Pre-tax cost of debt, percent. */
  costOfDebt: string;
  tax: string;
  /** Market values of equity and debt, in millions. */
  equity: string;
  debt: string;
}
export const defaultWacc = (): WaccInputs => ({ riskFree: "4.2", erp: "5", sizePremium: "0", beta: "1.1", fromPeers: false, peers: [], costOfDebt: "6.5", tax: "25", equity: "700", debt: "300" });

export interface WaccResult {
  valid: boolean;
  problem: string;
  /** Each peer's unlevered beta (null when its inputs do not allow one). */
  peers: { id: string; name: string; unlevered: number | null }[];
  unleveredMedian: number | null;
  /** The levered beta actually used. */
  beta: number;
  costOfEquity: number;
  afterTaxDebt: number;
  weightEquity: number;
  weightDebt: number;
  wacc: number;
  steps: string[];
}

/** Hamada: unlevered beta = levered beta ÷ (1 + (1 − tax) × D/E). */
export const unlever = (beta: number, de: number, tax: number) => beta / (1 + (1 - tax) * de);
export const relever = (beta: number, de: number, tax: number) => beta * (1 + (1 - tax) * de);

export function wacc(i: WaccInputs): WaccResult {
  const empty: WaccResult = { valid: false, problem: "", peers: [], unleveredMedian: null, beta: 0, costOfEquity: 0, afterTaxDebt: 0, weightEquity: 0, weightDebt: 0, wacc: 0, steps: [] };
  const e = n(i.equity);
  const d = n(i.debt);
  if (e <= 0 || d < 0) return { ...empty, problem: "Enter the market value of equity (and debt, which can be zero)." };
  const t = pct(i.tax);
  const peers = i.peers.map((p) => ({ id: p.id, name: p.name, unlevered: n(p.beta) > 0 ? unlever(n(p.beta), pct(p.debtToEquity), pct(p.tax)) : null }));
  const st = stats(peers.map((p) => p.unlevered ?? 0));
  const usePeers = i.fromPeers && !!st;
  const beta = usePeers ? relever(st!.median, d / e, t) : n(i.beta);
  if (beta <= 0) return { ...empty, peers, unleveredMedian: st?.median ?? null, problem: "Enter a beta above zero, or add comparables with betas." };
  const ke = pct(i.riskFree) + beta * pct(i.erp) + pct(i.sizePremium);
  const kd = pct(i.costOfDebt) * (1 - t);
  const we = e / (e + d);
  const wd = d / (e + d);
  const w = we * ke + wd * kd;
  return {
    valid: true,
    problem: "",
    peers,
    unleveredMedian: st?.median ?? null,
    beta,
    costOfEquity: ke,
    afterTaxDebt: kd,
    weightEquity: we,
    weightDebt: wd,
    wacc: w,
    steps: [
      usePeers
        ? `Beta from comparables: each peer's beta is unlevered (beta ÷ (1 + (1 − tax) × debt/equity)) to strip out its own borrowing; the median unlevered beta is ${f2(st!.median)}. Relevered at this company's debt/equity of ${p1(d / e)}: ${f2(st!.median)} × (1 + (1 − ${i.tax}%) × ${f2(d / e)}) = ${f2(beta)}.`
        : `The levered beta entered is ${f2(beta)}. (Turn on "from comparables" to build it from peers instead.)`,
      `Cost of equity (CAPM) = risk-free rate + beta × equity risk premium${n(i.sizePremium) ? " + size premium" : ""} = ${i.riskFree}% + ${f2(beta)} × ${i.erp}%${n(i.sizePremium) ? ` + ${i.sizePremium}%` : ""} = ${p1(ke)}.`,
      `After-tax cost of debt = ${i.costOfDebt}% × (1 − ${i.tax}% tax) = ${p1(kd)}. Interest is tax-deductible, which is why debt is cheaper after tax.`,
      `Weights use market values: equity ${m(e)} and debt ${m(d)} give ${p1(we)} equity and ${p1(wd)} debt.`,
      `WACC = ${p1(we)} × ${p1(ke)} + ${p1(wd)} × ${p1(kd)} = ${p1(w)}.`,
      "Where the inputs come from in practice: the risk-free rate is a 10-year Treasury yield; betas come from a data terminal such as Capital IQ; the equity risk premium is published by sources such as Professor Damodaran (NYU Stern). Name your source for each.",
    ],
  };
}

/** WACC across a grid of beta (down) and equity risk premium (across), around the inputs. */
export function waccGrid(i: WaccInputs): { betas: number[]; erps: number[]; values: (number | null)[][] } {
  const base = wacc(i);
  const b0 = base.valid ? base.beta : n(i.beta);
  const e0 = n(i.erp);
  const betas = [-0.2, -0.1, 0, 0.1, 0.2].map((d) => Math.round((b0 + d) * 100) / 100);
  const erps = [-1, -0.5, 0, 0.5, 1].map((d) => Math.round((e0 + d) * 10) / 10);
  const values = betas.map((b) => erps.map((e) => { const r = wacc({ ...i, fromPeers: false, beta: String(b), erp: String(e) }); return r.valid ? r.wacc : null; }));
  return { betas, erps, values };
}

/* ------------------------------------------------------------------ */
/* Precedent transactions                                              */
/* ------------------------------------------------------------------ */

export interface PrecedentRow {
  id: string;
  target: string;
  acquirer: string;
  /** The year the deal was announced, as typed. */
  year: string;
  /** Transaction enterprise value, and the target's last-twelve-month revenue and EBITDA, in millions. */
  ev: string;
  revenue: string;
  ebitda: string;
  /** Premium paid over the target's unaffected share price, percent (blank for private targets). */
  premium: string;
  /** Where the deal's figures came from and the date they were pulled, "2026-11-14" or "". */
  source: string;
  asOf: string;
}

/** How many rows name a source, for the note under a table of comparables or deals. */
export const sourced = (rows: { source: string }[]) => rows.filter((r) => r.source.trim()).length;
export interface PrecedentInputs {
  rows: PrecedentRow[];
  targetRevenue: string;
  targetEbitda: string;
  netDebt: string;
  shares: string;
  /** The target's current share price, to apply the median premium to. */
  price: string;
  basis: "ebitda" | "revenue";
}
export const defaultPrecedents = (): PrecedentInputs => ({ rows: [], targetRevenue: "", targetEbitda: "", netDebt: "", shares: "", price: "", basis: "ebitda" });

export interface PrecedentResult {
  rows: { id: string; target: string; evRevenue: number | null; evEbitda: number | null; premium: number | null }[];
  evRevenue: Stat | null;
  evEbitda: Stat | null;
  premium: Stat | null;
  /** Low, median and high from the 25th to 75th percentile of the chosen multiple. */
  range: { ev: [number, number, number]; equity: [number, number, number]; perShare: [number, number, number] } | null;
  /** The share price implied by the median premium on the current price. */
  premiumPrice: number | null;
  steps: string[];
}

export function precedents(i: PrecedentInputs): PrecedentResult {
  const rows = i.rows.map((r) => {
    const ev = n(r.ev);
    return { id: r.id, target: r.target, evRevenue: ev > 0 && n(r.revenue) > 0 ? ev / n(r.revenue) : null, evEbitda: ev > 0 && n(r.ebitda) > 0 ? ev / n(r.ebitda) : null, premium: r.premium.trim() !== "" && n(r.premium) > 0 ? pct(r.premium) : null };
  });
  const evRevenue = stats(rows.map((r) => r.evRevenue ?? 0));
  const evEbitda = stats(rows.map((r) => r.evEbitda ?? 0));
  const premium = stats(rows.map((r) => r.premium ?? 0));
  const stat = i.basis === "ebitda" ? evEbitda : evRevenue;
  const metric = i.basis === "ebitda" ? n(i.targetEbitda) : n(i.targetRevenue);
  let range: PrecedentResult["range"] = null;
  if (stat && metric > 0) {
    const shares = Math.max(n(i.shares), 0.0001);
    const at = (mult: number): [number, number, number] => [mult * metric, mult * metric - n(i.netDebt), (mult * metric - n(i.netDebt)) / shares];
    const lo = at(stat.q1);
    const mid = at(stat.median);
    const hi = at(stat.q3);
    range = { ev: [lo[0], mid[0], hi[0]], equity: [lo[1], mid[1], hi[1]], perShare: [lo[2], mid[2], hi[2]] };
  }
  const premiumPrice = premium && n(i.price) > 0 ? n(i.price) * (1 + premium.median) : null;
  const label = i.basis === "ebitda" ? "EV/EBITDA" : "EV/Revenue";
  return {
    rows,
    evRevenue,
    evEbitda,
    premium,
    range,
    premiumPrice,
    steps: [
      "Each deal's multiples = the transaction enterprise value ÷ the target's revenue and EBITDA over the twelve months before the deal. A multiple is left out when its denominator is zero or negative.",
      "Transaction multiples usually sit above trading multiples for the same business, because a buyer pays a control premium and expects synergies.",
      range && stat
        ? `Applying the ${label} range (${f1(stat.q1)}x to ${f1(stat.q3)}x, median ${f1(stat.median)}x) to the target's ${i.basis === "ebitda" ? "EBITDA" : "revenue"} of ${m(metric)} gives an enterprise value of ${m(range.ev[0])} to ${m(range.ev[2])}.`
        : "Enter at least one deal with the chosen metric, and the target's matching figure, to see the implied value.",
      premium && premiumPrice != null
        ? `The median premium paid was ${p1(premium.median)}; on a current price of $${f2(n(i.price))} that is $${f2(premiumPrice)} a share.`
        : "Add premiums paid (for public targets) and a current share price to see the price a typical premium implies.",
      "Choose deals in the same industry, of similar size, from the last few years: market conditions at the time of a deal drive its multiple. Give the source and date of each.",
    ],
  };
}

/** The precedent range as a row for the football field, or null when there is not enough to show. */
export function precedentField(i: PrecedentInputs): FieldRow | null {
  const r = precedents(i);
  return r.range ? { id: "precedents", label: "Precedent transactions", low: r.range.ev[0], high: r.range.ev[2], mid: r.range.ev[1], note: "25th to 75th percentile, median marked" } : null;
}

/* ------------------------------------------------------------------ */
/* Paper LBO drill                                                     */
/* ------------------------------------------------------------------ */

export interface PaperLbo {
  seed: number;
  /** The facts given to the candidate, all round enough for mental math. */
  ebitda: number;
  entryMultiple: number;
  leverage: number;
  /** EBITDA grows by this many dollars a year, and this much debt is repaid a year. */
  ebitdaStep: number;
  paydown: number;
  years: number;
  exitMultiple: number;
  answers: { price: number; equity: number; exitEbitda: number; exitEv: number; exitDebt: number; exitEquity: number; moic: number; irr: number };
}

const pick = <T,>(r: () => number, list: T[]): T => list[Math.floor(r() * list.length)];

/** A paper LBO from a seed: the same seed always gives the same deal, so a set can be retried or shared. */
export function paperLbo(seed: number): PaperLbo {
  const r = rng(seed);
  const ebitda = pick(r, [50, 80, 100, 120, 150, 200]);
  const entryMultiple = pick(r, [7, 8, 9, 10, 11, 12]);
  const leverage = pick(r, [4, 5, 6].filter((l) => l < entryMultiple - 1));
  const years = pick(r, [3, 5, 5, 5]);
  const ebitdaStep = Math.round((ebitda * pick(r, [0.05, 0.1, 0.1, 0.2])) / 5) * 5 || 5;
  const debt = ebitda * leverage;
  // Repay between a third and two thirds of the debt over the hold, in a round yearly amount.
  const paydown = Math.max(5, Math.round((debt * pick(r, [0.35, 0.5, 0.65])) / years / 5) * 5);
  const exitMultiple = entryMultiple + pick(r, [-1, 0, 0, 0, 1]);
  const price = ebitda * entryMultiple;
  const equity = price - debt;
  const exitEbitda = ebitda + ebitdaStep * years;
  const exitEv = exitEbitda * exitMultiple;
  const exitDebt = debt - paydown * years;
  const exitEquity = exitEv - exitDebt;
  const moic = exitEquity / equity;
  return { seed, ebitda, entryMultiple, leverage, ebitdaStep, paydown, years, exitMultiple, answers: { price, equity, exitEbitda, exitEv, exitDebt, exitEquity, moic, irr: moic ** (1 / years) - 1 } };
}

/** The five things asked for, in order, with how close an answer has to be. */
export const PAPER_QUESTIONS: { id: "price" | "equity" | "exitEquity" | "moic" | "irr"; label: string; unit: string; hint: string }[] = [
  { id: "price", label: "Purchase price", unit: "$M", hint: "EBITDA × entry multiple" },
  { id: "equity", label: "Sponsor equity invested", unit: "$M", hint: "price − debt (ignore fees)" },
  { id: "exitEquity", label: "Equity value at exit", unit: "$M", hint: "exit EBITDA × exit multiple − remaining debt" },
  { id: "moic", label: "Multiple of money", unit: "x", hint: "exit equity ÷ equity invested" },
  { id: "irr", label: "IRR (approximate)", unit: "%", hint: "from the multiple and the years held" },
];

/** Dollar answers must be within 2%, the multiple within 0.1x, and the IRR within 2.5 points (it is done in your head). */
export function paperCheck(q: PaperLbo, id: (typeof PAPER_QUESTIONS)[number]["id"], guess: number): boolean {
  if (!Number.isFinite(guess)) return false;
  const a = q.answers[id];
  if (id === "moic") return Math.abs(guess - a) <= 0.1;
  if (id === "irr") return Math.abs(guess / 100 - a) <= 0.025;
  return Math.abs(guess - a) <= Math.abs(a) * 0.02;
}

/** The rule-of-thumb table candidates memorize: the IRR for a multiple of money over three and five years. */
export const IRR_TABLE: { moic: number; three: number; five: number }[] = [1.5, 2, 2.5, 3, 4, 5].map((x) => ({ moic: x, three: x ** (1 / 3) - 1, five: x ** (1 / 5) - 1 }));

export function paperSteps(q: PaperLbo): string[] {
  const a = q.answers;
  return [
    `Purchase price = EBITDA ${m(q.ebitda)} × ${q.entryMultiple}x = ${m(a.price)}.`,
    `Debt = ${q.leverage}x EBITDA = ${m(q.ebitda * q.leverage)}, so the sponsor's equity = ${m(a.price)} − ${m(q.ebitda * q.leverage)} = ${m(a.equity)}.`,
    `EBITDA grows $${q.ebitdaStep}M a year for ${q.years} years: ${m(q.ebitda)} + ${q.years} × $${q.ebitdaStep}M = ${m(a.exitEbitda)}. Exit enterprise value = ${m(a.exitEbitda)} × ${q.exitMultiple}x = ${m(a.exitEv)}.`,
    `Debt repaid = ${q.years} × $${q.paydown}M = ${m(q.paydown * q.years)}, leaving ${m(a.exitDebt)}. Exit equity = ${m(a.exitEv)} − ${m(a.exitDebt)} = ${m(a.exitEquity)}.`,
    `Multiple of money = ${m(a.exitEquity)} ÷ ${m(a.equity)} = ${f1(a.moic)}x. IRR = ${f1(a.moic)}^(1 ÷ ${q.years}) − 1 = ${p1(a.irr)}. In your head: about 2x in five years is 15%, 2.5x is 20%, 3x is 25%.`,
  ];
}

export interface PaperRun {
  date: string;
  seed: number;
  correct: number;
  seconds: number;
}
