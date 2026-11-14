/**
 * Three stand-alone wealth models: a portfolio backtester over real history, a study of retirement withdrawal strategies over
 * every historical starting year, and an estate snapshot. They are teaching models built from numbers the student enters and
 * from published history (marketHistory.ts). History is not a forecast, the estate figures are illustrative, and none of this
 * is investment, tax or legal advice.
 */
import { HISTORY, HISTORY_FIRST, HISTORY_LAST, type HistoryYear } from "./marketHistory";

const n = (v: unknown): number => {
  const x = parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};
const usd = (x: number) => `$${Math.round(x).toLocaleString("en-US")}`;
const p1 = (x: number) => `${(Math.round(x * 1000) / 10).toFixed(1)}%`;

/* ------------------------------------------------------------------ */
/* Backtester                                                          */
/* ------------------------------------------------------------------ */

export const ASSETS = [
  { id: "stocks", label: "U.S. large stocks", note: "S&P 500 with dividends" },
  { id: "small", label: "U.S. small stocks", note: "smallest tenth of the market" },
  { id: "bonds", label: "Treasury bonds", note: "10-year U.S. Treasuries" },
  { id: "corporate", label: "Corporate bonds", note: "Baa-rated" },
  { id: "bills", label: "Cash", note: "3-month Treasury bills" },
  { id: "realEstate", label: "Real estate", note: "U.S. home prices" },
  { id: "gold", label: "Gold", note: "" },
] as const;
export type AssetId = (typeof ASSETS)[number]["id"];
const IDS = ASSETS.map((a) => a.id) as AssetId[];

export interface BacktestInputs {
  /** Percent in each asset; they should add to 100. */
  weights: Record<AssetId, string>;
  start: string;
  end: string;
  initial: string;
  /** Added at the end of each year. */
  yearly: string;
  /** Bring the mix back to the target weights at the end of each year. */
  rebalance: boolean;
  /** Show everything after inflation (in the starting year's dollars). */
  real: boolean;
}
const noWeights = (): Record<AssetId, string> => ({ stocks: "0", small: "0", bonds: "0", corporate: "0", bills: "0", realEstate: "0", gold: "0" });
export const defaultBacktest = (): BacktestInputs => ({ weights: { ...noWeights(), stocks: "60", bonds: "40" }, start: "1976", end: String(HISTORY_LAST), initial: "10000", yearly: "0", rebalance: true, real: false });

export const PRESETS: { name: string; weights: Partial<Record<AssetId, number>> }[] = [
  { name: "All stocks", weights: { stocks: 100 } },
  { name: "80 / 20", weights: { stocks: 80, bonds: 20 } },
  { name: "60 / 40", weights: { stocks: 60, bonds: 40 } },
  { name: "40 / 60", weights: { stocks: 40, bonds: 60 } },
  { name: "Four equal parts", weights: { stocks: 25, bonds: 25, bills: 25, gold: 25 } },
];
export const presetWeights = (w: Partial<Record<AssetId, number>>): Record<AssetId, string> => {
  const out = noWeights();
  for (const id of IDS) out[id] = String(w[id] ?? 0);
  return out;
};

export interface BacktestYear {
  year: number;
  /** The portfolio's return for the year, as a fraction. */
  ret: number;
  value: number;
  /** $1 grown with no additions, for the portfolio, all stocks and a 60/40 mix. */
  index: number;
  stocksIndex: number;
  balancedIndex: number;
}
export interface BacktestResult {
  valid: boolean;
  problem: string;
  weightTotal: number;
  years: BacktestYear[];
  ending: number;
  contributed: number;
  /** Compound yearly return of $1 left alone (so additions do not distort it). */
  cagr: number;
  vol: number;
  best: { year: number; ret: number };
  worst: { year: number; ret: number };
  downYears: number;
  /** The deepest fall from a year-end high to a later year-end low, and the years it ran between. */
  maxDrawdown: number;
  drawdownFrom: number;
  drawdownTo: number;
  stocksCagr: number;
  balancedCagr: number;
  steps: string[];
}

const realRet = (r: number, inflation: number) => (1 + r) / (1 + inflation) - 1;
const assetRet = (h: HistoryYear, id: AssetId, real: boolean) => (real ? realRet(h[id] / 100, h.inflation / 100) : h[id] / 100);

export function backtest(i: BacktestInputs): BacktestResult {
  const empty: BacktestResult = { valid: false, problem: "", weightTotal: 0, years: [], ending: 0, contributed: 0, cagr: 0, vol: 0, best: { year: 0, ret: 0 }, worst: { year: 0, ret: 0 }, downYears: 0, maxDrawdown: 0, drawdownFrom: 0, drawdownTo: 0, stocksCagr: 0, balancedCagr: 0, steps: [] };
  const w = IDS.map((id) => Math.max(0, n(i.weights[id])));
  const total = w.reduce((a, b) => a + b, 0);
  if (Math.abs(total - 100) > 0.5) return { ...empty, weightTotal: total, problem: `The weights add to ${Math.round(total * 10) / 10}%. They need to add to 100%.` };
  const start = Math.round(n(i.start));
  const end = Math.round(n(i.end));
  if (start < HISTORY_FIRST || end > HISTORY_LAST || end < start) return { ...empty, weightTotal: total, problem: `Choose a start and end year between ${HISTORY_FIRST} and ${HISTORY_LAST}, with the start first.` };
  const initial = Math.max(0, n(i.initial));
  const yearly = Math.max(0, n(i.yearly));
  if (initial <= 0 && yearly <= 0) return { ...empty, weightTotal: total, problem: "Enter a starting amount or a yearly addition." };
  const target = w.map((x) => x / total);
  const rows = HISTORY.filter((h) => h.year >= start && h.year <= end);
  // Dollars held in each asset; without rebalancing they drift with their own returns.
  let hold = target.map((t) => t * initial);
  let driftIndex = target.slice();
  let index = 1;
  let stocksIndex = 1;
  let balancedIndex = 1;
  let peak = 1;
  let peakYear = start - 1;
  let maxDd = 0;
  let ddFrom = start;
  let ddTo = start;
  const years: BacktestYear[] = [];
  for (const h of rows) {
    const r = IDS.map((id) => assetRet(h, id, i.real));
    // The time-weighted return: on the target mix when rebalanced, on the drifted mix when not.
    const mix = i.rebalance ? target : driftIndex.map((x) => x / driftIndex.reduce((a, b) => a + b, 0));
    const ret = mix.reduce((a, t, k) => a + t * r[k], 0);
    hold = hold.map((x, k) => x * (1 + r[k]));
    driftIndex = driftIndex.map((x, k) => x * (1 + r[k]));
    let value = hold.reduce((a, b) => a + b, 0);
    if (i.rebalance) hold = target.map((t) => t * value);
    // The addition goes in at the end of the year, at the target weights.
    hold = hold.map((x, k) => x + target[k] * yearly);
    value += yearly;
    index *= 1 + ret;
    stocksIndex *= 1 + assetRet(h, "stocks", i.real);
    balancedIndex *= 1 + 0.6 * assetRet(h, "stocks", i.real) + 0.4 * assetRet(h, "bonds", i.real);
    if (index > peak) {
      peak = index;
      peakYear = h.year;
    } else if (1 - index / peak > maxDd) {
      maxDd = 1 - index / peak;
      ddFrom = peakYear;
      ddTo = h.year;
    }
    years.push({ year: h.year, ret, value, index, stocksIndex, balancedIndex });
  }
  const count = years.length;
  const rets = years.map((y) => y.ret);
  const mean = rets.reduce((a, b) => a + b, 0) / count;
  const vol = count > 1 ? Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (count - 1)) : 0;
  const best = years.reduce((a, b) => (b.ret > a.ret ? b : a));
  const worst = years.reduce((a, b) => (b.ret < a.ret ? b : a));
  const cagr = index ** (1 / count) - 1;
  const contributed = initial + yearly * count;
  const ending = years[count - 1].value;
  return {
    valid: true,
    problem: "",
    weightTotal: total,
    years,
    ending,
    contributed,
    cagr,
    vol,
    best: { year: best.year, ret: best.ret },
    worst: { year: worst.year, ret: worst.ret },
    downYears: rets.filter((x) => x < 0).length,
    maxDrawdown: maxDd,
    drawdownFrom: ddFrom,
    drawdownTo: ddTo,
    stocksCagr: stocksIndex ** (1 / count) - 1,
    balancedCagr: balancedIndex ** (1 / count) - 1,
    steps: [
      `Each year's return is the weighted sum of the assets' published returns for that year${i.real ? ", each first reduced by that year's inflation ((1 + return) ÷ (1 + inflation) − 1)" : ""}.`,
      i.rebalance ? "The mix is brought back to the target weights at the end of every year, so the weights are the same going into each year." : "The mix is never rebalanced: each asset grows with its own returns, so the winners become a larger share over time.",
      `${usd(initial)} at the start of ${start}${yearly > 0 ? `, plus ${usd(yearly)} added at the end of each year (${usd(contributed)} put in altogether),` : ""} became ${usd(ending)} by the end of ${end}${i.real ? `, in ${start} dollars` : ""}.`,
      `The compound return is measured on $1 left alone, so additions do not flatter it: $1 became $${(Math.round(index * 100) / 100).toFixed(2)} over ${count} years, which is ${p1(cagr)} a year. Volatility is the standard deviation of the yearly returns: ${p1(vol)}.`,
      maxDd > 0 ? `The deepest fall between year-ends was ${p1(maxDd)}, from the end of ${ddFrom} to the end of ${ddTo}. Falls inside a year were deeper than yearly figures show.` : "The portfolio never ended a year below an earlier year-end high in this period.",
      "No fees, taxes or trading costs are taken out, and nobody could buy these indexes at no cost for the whole period. History shows what happened, not what will.",
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Withdrawal strategies                                               */
/* ------------------------------------------------------------------ */

export interface WithdrawInputs {
  balance: string;
  /** Spending in the first year. */
  spend: string;
  years: string;
  /** Percent in stocks; the rest is in Treasury bonds. Rebalanced every year. */
  stockPct: string;
}
export const defaultWithdraw = (): WithdrawInputs => ({ balance: "1000000", spend: "40000", years: "30", stockPct: "60" });

export const STRATEGIES = [
  { id: "constant", name: "Constant dollar", text: "Take the first year's amount and raise it with inflation every year, whatever markets do (the idea behind the 4% rule)." },
  { id: "percent", name: "Fixed percent", text: "Take the same percent of whatever the balance is each year. It can never run out, but income swings with the market." },
  { id: "guardrails", name: "Guardrails", text: "Raise with inflation, but cut income 10% when the withdrawal rate drifts 20% above where it began, and raise it 10% when it falls 20% below." },
] as const;
export type StrategyId = (typeof STRATEGIES)[number]["id"];

export interface StrategyResult {
  id: StrategyId;
  /** Starting years tested, and the share in which the money lasted the whole period. */
  windows: number;
  success: number;
  /** Ending balance in the starting year's dollars: the median and the worst. */
  medianEnd: number;
  worstEnd: number;
  /** The lowest yearly income, in starting dollars: its median across starting years, and the worst single case. */
  medianLowIncome: number;
  worstLowIncome: number;
  /** Average yearly income in starting dollars, median across starting years. */
  medianAvgIncome: number;
  /** The starting year that ended worst. */
  hardestStart: number;
  failedStarts: number[];
}
export interface WithdrawResult {
  valid: boolean;
  problem: string;
  rate: number;
  firstStart: number;
  lastStart: number;
  strategies: StrategyResult[];
  /** For each starting year: the real ending balance under each strategy (for the chart). */
  byStart: { start: number; constant: number; percent: number; guardrails: number }[];
  steps: string[];
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** One retirement from one starting year. Money is taken at the start of each year; what is left earns that year's return. */
export function withdrawPath(strategy: StrategyId, rows: HistoryYear[], balance0: number, spend0: number, stock: number) {
  const rate0 = spend0 / balance0;
  let balance = balance0;
  let spend = spend0;
  let price = 1;
  let lowReal = Infinity;
  let sumReal = 0;
  let depleted = false;
  rows.forEach((h, k) => {
    // Last year's inflation lifts this year's amount (prices are known at the start of the year).
    if (k > 0 && strategy !== "percent") spend *= 1 + rows[k - 1].inflation / 100;
    if (strategy === "percent") spend = balance * rate0;
    if (strategy === "guardrails" && k > 0 && balance > 0) {
      const rate = spend / balance;
      if (rate > rate0 * 1.2) spend *= 0.9;
      else if (rate < rate0 * 0.8) spend *= 1.1;
    }
    const taken = Math.min(spend, balance);
    if (taken < spend - 1e-9) depleted = true;
    balance -= taken;
    const real = taken / price;
    lowReal = Math.min(lowReal, real);
    sumReal += real;
    balance *= 1 + (stock * h.stocks + (1 - stock) * h.bonds) / 100;
    price *= 1 + h.inflation / 100;
  });
  return { endReal: balance / price, lowReal, avgReal: sumReal / rows.length, depleted };
}

export function withdrawStudy(i: WithdrawInputs): WithdrawResult {
  const empty: WithdrawResult = { valid: false, problem: "", rate: 0, firstStart: 0, lastStart: 0, strategies: [], byStart: [], steps: [] };
  const balance = n(i.balance);
  const spend = n(i.spend);
  const years = Math.round(n(i.years));
  const stock = Math.min(100, Math.max(0, n(i.stockPct))) / 100;
  if (balance <= 0 || spend <= 0) return { ...empty, problem: "Enter the starting balance and the first year's spending." };
  if (spend >= balance) return { ...empty, problem: "The first year's spending is the whole balance. Lower it." };
  if (years < 5 || years > 50) return { ...empty, problem: "Choose a retirement of 5 to 50 years." };
  const lastStart = HISTORY_LAST - years + 1;
  if (lastStart < HISTORY_FIRST) return { ...empty, problem: "There is not enough history for a retirement that long." };
  const byStart: WithdrawResult["byStart"] = [];
  const per: Record<StrategyId, { start: number; endReal: number; lowReal: number; avgReal: number; depleted: boolean }[]> = { constant: [], percent: [], guardrails: [] };
  for (let s = HISTORY_FIRST; s <= lastStart; s++) {
    const rows = HISTORY.filter((h) => h.year >= s && h.year < s + years);
    const row = { start: s, constant: 0, percent: 0, guardrails: 0 };
    for (const st of STRATEGIES) {
      const r = withdrawPath(st.id, rows, balance, spend, stock);
      per[st.id].push({ start: s, ...r });
      row[st.id] = r.endReal;
    }
    byStart.push(row);
  }
  const strategies: StrategyResult[] = STRATEGIES.map((st) => {
    const list = per[st.id];
    const hardest = list.reduce((a, b) => (b.endReal < a.endReal || (b.endReal === a.endReal && b.lowReal < a.lowReal) ? b : a));
    return {
      id: st.id,
      windows: list.length,
      success: list.filter((x) => !x.depleted).length / list.length,
      medianEnd: median(list.map((x) => x.endReal)),
      worstEnd: Math.min(...list.map((x) => x.endReal)),
      medianLowIncome: median(list.map((x) => x.lowReal)),
      worstLowIncome: Math.min(...list.map((x) => x.lowReal)),
      medianAvgIncome: median(list.map((x) => x.avgReal)),
      hardestStart: hardest.start,
      failedStarts: list.filter((x) => x.depleted).map((x) => x.start),
    };
  });
  const c = strategies[0];
  return {
    valid: true,
    problem: "",
    rate: spend / balance,
    firstStart: HISTORY_FIRST,
    lastStart,
    strategies,
    byStart,
    steps: [
      `Every ${years}-year retirement that history allows is replayed: one starting in ${HISTORY_FIRST}, one in ${HISTORY_FIRST + 1}, and so on to ${lastStart} (${c.windows} in all), each with the returns and inflation that actually followed.`,
      `The portfolio is ${Math.round(stock * 100)}% U.S. large stocks and ${Math.round((1 - stock) * 100)}% 10-year Treasuries, rebalanced every year. Money is taken out at the start of each year; what is left earns that year's return.`,
      `The first year's spending of ${usd(spend)} is ${p1(spend / balance)} of ${usd(balance)}. Incomes and ending balances are shown in the starting year's dollars, so they can be compared across decades.`,
      `Constant dollar lasted the whole period in ${p1(c.success)} of the starting years${c.failedStarts.length ? ` (it ran out for retirements starting in ${c.failedStarts.slice(0, 6).join(", ")}${c.failedStarts.length > 6 ? " and others" : ""})` : ""}. A bad first decade does the damage: the same average return in a different order gives a different result.`,
      "Fixed percent cannot run out, so its success rate is always 100%; judge it by its lowest-income year instead. Guardrails sit between the two: steadier than fixed percent, safer than constant dollar.",
      "No fees or taxes are taken out, there are only two assets, and the future will not repeat the past. This shows how the rules behave, not what a client should do.",
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Estate snapshot                                                     */
/* ------------------------------------------------------------------ */

export const TITLING = [
  { id: "sole", label: "In one name, no beneficiary", passes: "By will, through probate" },
  { id: "joint", label: "Joint with right of survivorship", passes: "To the other owner, by title" },
  { id: "beneficiary", label: "Named beneficiary (retirement, TOD or POD)", passes: "To the beneficiary, by designation" },
  { id: "insurance", label: "Life insurance (death benefit)", passes: "To the beneficiary, by designation" },
  { id: "trust", label: "Held in a living trust", passes: "By the trust's terms" },
] as const;
export type TitlingId = (typeof TITLING)[number]["id"];

export const ESTATE_DOCS = [
  { id: "will", label: "Will", why: "Says who receives what passes by will, and names an executor." },
  { id: "guardian", label: "Guardian named for minor children", why: "Otherwise a court decides who raises them." },
  { id: "financialPoa", label: "Durable power of attorney", why: "Lets someone handle money if the client cannot." },
  { id: "healthPoa", label: "Health care power of attorney", why: "Lets someone make medical decisions if the client cannot." },
  { id: "livingWill", label: "Living will (advance directive)", why: "States wishes about end-of-life care." },
  { id: "beneficiaries", label: "Beneficiaries reviewed in the last three years", why: "A designation beats the will, so an old one can send money to the wrong person." },
] as const;

export interface EstateAsset {
  id: string;
  name: string;
  value: string;
  titling: TitlingId;
}
export interface EstateInputs {
  married: boolean;
  assets: EstateAsset[];
  debts: string;
  /** The federal exemption per person and the top rate, both typed so they can be kept current. */
  exemption: string;
  rate: string;
  docs: Record<string, boolean>;
  note: string;
}
export const defaultEstate = (): EstateInputs => ({ married: false, assets: [], debts: "", exemption: "15000000", rate: "40", docs: {}, note: "" });

export interface EstateResult {
  gross: number;
  net: number;
  /** How the estate passes, by route. */
  routes: { id: TitlingId; label: string; passes: string; amount: number; share: number }[];
  probate: number;
  probateShare: number;
  exemptionUsed: number;
  taxable: number;
  tax: number;
  missing: { id: string; label: string; why: string }[];
  steps: string[];
}

export function estate(i: EstateInputs): EstateResult {
  const gross = i.assets.reduce((a, x) => a + Math.max(0, n(x.value)), 0);
  const net = Math.max(0, gross - Math.max(0, n(i.debts)));
  const routes = TITLING.map((t) => {
    const amount = i.assets.filter((a) => a.titling === t.id).reduce((a, x) => a + Math.max(0, n(x.value)), 0);
    return { id: t.id, label: t.label, passes: t.passes, amount, share: gross > 0 ? amount / gross : 0 };
  });
  const probate = routes.find((r) => r.id === "sole")!.amount;
  const exemption = Math.max(0, n(i.exemption)) * (i.married ? 2 : 1);
  const taxable = Math.max(0, net - exemption);
  const tax = taxable * (n(i.rate) / 100);
  const missing = ESTATE_DOCS.filter((d) => !i.docs[d.id]);
  return {
    gross,
    net,
    routes,
    probate,
    probateShare: gross > 0 ? probate / gross : 0,
    exemptionUsed: exemption,
    taxable,
    tax,
    missing,
    steps: [
      `Everything listed adds to ${usd(gross)}; less debts of ${usd(Math.max(0, n(i.debts)))}, the net estate is ${usd(net)}. Life insurance counts at its death benefit when the client owns the policy.`,
      `How each asset is titled decides how it passes: ${usd(probate)} (${p1(gross > 0 ? probate / gross : 0)}) is in one name with no beneficiary, so it passes by will through probate, a public court process. The rest passes by title, by beneficiary designation or by trust.`,
      `Federal estate tax applies above the exemption: ${usd(n(i.exemption))} per person${i.married ? `, and a married couple can use two (${usd(exemption)}) when the first spouse's unused amount is claimed on an estate tax return (portability)` : ""}. Above it the rate entered is ${i.rate}%.`,
      taxable > 0 ? `${usd(net)} − ${usd(exemption)} = ${usd(taxable)} above the exemption; at ${i.rate}% that is about ${usd(tax)} of federal estate tax, before any planning.` : `The net estate is below the exemption, so no federal estate tax is shown. Most estates are: the conversation is about documents, titling and beneficiaries, not tax.`,
      "Not modeled: state estate and inheritance taxes (several states tax much smaller estates), gifts already made, the marital and charitable deductions, and trusts that change what is counted. The exemption changes with the law, so confirm the current figure.",
      "This is a way to see the shape of an estate and to prepare questions. Wills, trusts and tax planning are the work of an estate attorney and a CPA.",
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Saved with the analyst's own document                               */
/* ------------------------------------------------------------------ */

export interface WealthModels {
  backtest: BacktestInputs;
  withdraw: WithdrawInputs;
  estate: EstateInputs;
}
export const emptyModels = (): WealthModels => ({ backtest: defaultBacktest(), withdraw: defaultWithdraw(), estate: defaultEstate() });

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, d: string) => (typeof v === "string" ? v : d);

export function normalizeModels(raw: unknown): WealthModels {
  const b = emptyModels();
  if (!isObj(raw)) return b;
  if (isObj(raw.backtest)) {
    const r = raw.backtest;
    const weights = { ...b.backtest.weights };
    if (isObj(r.weights)) for (const id of IDS) weights[id] = str(r.weights[id], "0");
    b.backtest = { weights, start: str(r.start, b.backtest.start), end: str(r.end, b.backtest.end), initial: str(r.initial, b.backtest.initial), yearly: str(r.yearly, b.backtest.yearly), rebalance: r.rebalance !== false, real: r.real === true };
  }
  if (isObj(raw.withdraw)) {
    const r = raw.withdraw;
    b.withdraw = { balance: str(r.balance, b.withdraw.balance), spend: str(r.spend, b.withdraw.spend), years: str(r.years, b.withdraw.years), stockPct: str(r.stockPct, b.withdraw.stockPct) };
  }
  if (isObj(raw.estate)) {
    const r = raw.estate;
    const docs: Record<string, boolean> = {};
    if (isObj(r.docs)) for (const d of ESTATE_DOCS) if (typeof r.docs[d.id] === "boolean") docs[d.id] = r.docs[d.id] as boolean;
    b.estate = {
      married: r.married === true,
      assets: Array.isArray(r.assets)
        ? (r.assets as unknown[]).filter(isObj).slice(0, 40).map((a, k): EstateAsset => ({ id: str(a.id, `e${k}`), name: str(a.name, ""), value: str(a.value, ""), titling: TITLING.some((t) => t.id === a.titling) ? (a.titling as TitlingId) : "sole" }))
        : [],
      debts: str(r.debts, ""),
      exemption: str(r.exemption, b.estate.exemption),
      rate: str(r.rate, b.estate.rate),
      docs,
      note: str(r.note, ""),
    };
  }
  return b;
}
