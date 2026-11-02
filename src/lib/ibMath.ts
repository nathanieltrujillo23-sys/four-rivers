/**
 * Valuation math for the Investment Banking Tools: a discounted cash flow, trading comparables, a simple LBO, and merger accretion
 * and dilution. These are teaching models: they use round assumptions the student enters, simplify what a real model carries, and
 * return their working so each number can be explained. They are not investment advice and not a basis for a real transaction.
 *
 * Amounts are in millions of dollars (shares in millions, per-share figures in dollars).
 */

const n = (v: unknown): number => {
  const x = parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};
const f1 = (x: number) => (Math.round(x * 10) / 10).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const m = (x: number) => `$${f1(x)}M`;
const p1 = (x: number) => `${f1(x * 100)}%`;
const pct = (v: string) => n(v) / 100;

/* ------------------------------------------------------------------ */
/* DCF                                                                 */
/* ------------------------------------------------------------------ */

export interface DcfInputs {
  /** Last year's revenue. */
  revenue: string;
  /** Revenue growth in each of the five forecast years, percent. */
  growth: string[];
  ebitMargin: string;
  tax: string;
  /** Depreciation and amortization, capex, and the change in net working capital as shares of revenue (working capital: of the change in revenue). */
  da: string;
  capex: string;
  nwc: string;
  wacc: string;
  terminalGrowth: string;
  /** Exit EV/EBITDA multiple for the second terminal-value method. */
  exitMultiple: string;
  netDebt: string;
  shares: string;
  price: string;
  midYear: boolean;
}

export const defaultDcf = (): DcfInputs => ({
  revenue: "1000",
  growth: ["8", "7", "6", "5", "4"],
  ebitMargin: "18",
  tax: "25",
  da: "4",
  capex: "5",
  nwc: "10",
  wacc: "9",
  terminalGrowth: "2.5",
  exitMultiple: "10",
  netDebt: "300",
  shares: "100",
  price: "",
  midYear: true,
});

export interface DcfYear {
  year: number;
  revenue: number;
  ebit: number;
  nopat: number;
  da: number;
  capex: number;
  dNwc: number;
  fcf: number;
  ebitda: number;
  discount: number;
  pv: number;
}
export interface DcfResult {
  valid: boolean;
  problem: string;
  years: DcfYear[];
  pvFcf: number;
  terminalPerpetuity: number;
  pvTerminalPerpetuity: number;
  evPerpetuity: number;
  terminalExit: number;
  pvTerminalExit: number;
  evExit: number;
  /** The exit multiple implied by the perpetuity value, and the perpetual growth implied by the exit multiple. */
  impliedMultiple: number;
  impliedGrowth: number;
  equityPerpetuity: number;
  equityExit: number;
  perSharePerpetuity: number;
  perShareExit: number;
  /** The share of enterprise value that comes from the terminal value (perpetuity method). */
  terminalShare: number;
  upside: number | null;
  steps: string[];
}

export function dcf(i: DcfInputs): DcfResult {
  const wacc = pct(i.wacc);
  const g = pct(i.terminalGrowth);
  const t = pct(i.tax);
  const base: DcfResult = {
    valid: false, problem: "", years: [], pvFcf: 0, terminalPerpetuity: 0, pvTerminalPerpetuity: 0, evPerpetuity: 0, terminalExit: 0, pvTerminalExit: 0, evExit: 0,
    impliedMultiple: 0, impliedGrowth: 0, equityPerpetuity: 0, equityExit: 0, perSharePerpetuity: 0, perShareExit: 0, terminalShare: 0, upside: null, steps: [],
  };
  if (wacc <= g) return { ...base, problem: "The discount rate (WACC) must be higher than the terminal growth rate, or the perpetuity value is not defined." };
  if (n(i.revenue) <= 0) return { ...base, problem: "Enter last year's revenue." };
  const years: DcfYear[] = [];
  let rev = n(i.revenue);
  let pvFcf = 0;
  for (let k = 0; k < 5; k++) {
    const prev = rev;
    rev = prev * (1 + pct(i.growth[k] ?? "0"));
    const ebit = rev * pct(i.ebitMargin);
    const nopat = ebit * (1 - t);
    const da = rev * pct(i.da);
    const capex = rev * pct(i.capex);
    const dNwc = (rev - prev) * pct(i.nwc);
    const fcf = nopat + da - capex - dNwc;
    const period = k + 1 - (i.midYear ? 0.5 : 0);
    const discount = 1 / (1 + wacc) ** period;
    pvFcf += fcf * discount;
    years.push({ year: k + 1, revenue: rev, ebit, nopat, da, capex, dNwc, fcf, ebitda: ebit + da, discount, pv: fcf * discount });
  }
  const last = years[4];
  // Gordon growth: the final year's cash flow grown one year, divided by (WACC - g). With the mid-year convention the cash flows arrive
  // mid-year, so the perpetuity is discounted from N - 0.5; an exit multiple is a sale at the end of year N and is discounted from N.
  const tvP = (last.fcf * (1 + g)) / (wacc - g);
  const pvTvP = tvP / (1 + wacc) ** (5 - (i.midYear ? 0.5 : 0));
  const tvE = last.ebitda * n(i.exitMultiple);
  const pvTvE = tvE / (1 + wacc) ** 5;
  const evP = pvFcf + pvTvP;
  const evE = pvFcf + pvTvE;
  const shares = Math.max(n(i.shares), 0.0001);
  const eqP = evP - n(i.netDebt);
  const eqE = evE - n(i.netDebt);
  const price = n(i.price);
  // The growth rate that makes a Gordon terminal value equal to the exit-multiple value: TV = FCF(1+g)/(W-g)  =>  g = (TV*W - FCF)/(TV + FCF).
  const impliedGrowth = (tvE * wacc - last.fcf) / (tvE + last.fcf);
  return {
    valid: true,
    problem: "",
    years,
    pvFcf,
    terminalPerpetuity: tvP,
    pvTerminalPerpetuity: pvTvP,
    evPerpetuity: evP,
    terminalExit: tvE,
    pvTerminalExit: pvTvE,
    evExit: evE,
    impliedMultiple: last.ebitda > 0 ? tvP / last.ebitda : 0,
    impliedGrowth,
    equityPerpetuity: eqP,
    equityExit: eqE,
    perSharePerpetuity: eqP / shares,
    perShareExit: eqE / shares,
    terminalShare: evP > 0 ? pvTvP / evP : 0,
    upside: price > 0 ? eqP / shares / price - 1 : null,
    steps: [
      `Each year: revenue = last year's × (1 + growth); EBIT = revenue × ${i.ebitMargin}% margin; NOPAT = EBIT × (1 − ${i.tax}% tax) = ${m(years[0].nopat)} in year 1.`,
      `Unlevered free cash flow = NOPAT + D&A − capex − increase in net working capital = ${m(years[0].fcf)} in year 1 and ${m(last.fcf)} in year 5.`,
      `Each cash flow is discounted at the ${i.wacc}% WACC by 1 ÷ (1 + WACC)^t${i.midYear ? ", with t at the middle of each year (mid-year convention)" : ", with t at the end of each year"}. The five years are worth ${m(pvFcf)}.`,
      `Terminal value, perpetuity method: final-year FCF × (1 + ${i.terminalGrowth}%) ÷ (WACC − growth) = ${m(tvP)}, worth ${m(pvTvP)} today (${p1(evP > 0 ? pvTvP / evP : 0)} of enterprise value).`,
      `Terminal value, exit multiple: final-year EBITDA ${m(last.ebitda)} × ${i.exitMultiple}x = ${m(tvE)}, worth ${m(pvTvE)} today. The two methods should roughly agree; the perpetuity value implies ${f1(tvP / Math.max(last.ebitda, 0.0001))}x EBITDA and the exit multiple implies ${p1(impliedGrowth)} growth.`,
      `Enterprise value ${m(evP)} less net debt ${m(n(i.netDebt))} = equity value ${m(eqP)}; ÷ ${f1(shares)}M shares = $${f1(eqP / shares)} a share.`,
    ],
  };
}

/** Equity value per share across a grid of WACC (down) and terminal growth (across), around the inputs. */
export function dcfGrid(i: DcfInputs): { waccs: number[]; growths: number[]; values: (number | null)[][] } {
  const w0 = n(i.wacc);
  const g0 = n(i.terminalGrowth);
  const waccs = [-1, -0.5, 0, 0.5, 1].map((d) => Math.round((w0 + d) * 10) / 10);
  const growths = [-1, -0.5, 0, 0.5, 1].map((d) => Math.round((g0 + d) * 10) / 10);
  const values = waccs.map((w) => growths.map((g) => { const r = dcf({ ...i, wacc: String(w), terminalGrowth: String(g) }); return r.valid ? r.perSharePerpetuity : null; }));
  return { waccs, growths, values };
}

/* ------------------------------------------------------------------ */
/* Comparables                                                         */
/* ------------------------------------------------------------------ */

export interface CompRow {
  id: string;
  name: string;
  /** Enterprise value, revenue, EBITDA, and net income, in millions. */
  ev: string;
  revenue: string;
  ebitda: string;
  netIncome: string;
  /** Equity value (market cap) for P/E. */
  equity: string;
}
export interface CompsInputs {
  rows: CompRow[];
  /** The target's metrics and balance sheet. */
  targetRevenue: string;
  targetEbitda: string;
  targetNetIncome: string;
  netDebt: string;
  shares: string;
  /** Which multiple to centre the valuation on. */
  basis: "ebitda" | "revenue" | "pe";
}
export const defaultComps = (): CompsInputs => ({ rows: [], targetRevenue: "", targetEbitda: "", targetNetIncome: "", netDebt: "", shares: "", basis: "ebitda" });

export interface Stat { low: number; q1: number; median: number; mean: number; q3: number; high: number; count: number }
const quantile = (sorted: number[], q: number) => {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};
export function stats(values: number[]): Stat | null {
  const v = values.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (!v.length) return null;
  return { low: v[0], q1: quantile(v, 0.25), median: quantile(v, 0.5), mean: v.reduce((a, b) => a + b, 0) / v.length, q3: quantile(v, 0.75), high: v[v.length - 1], count: v.length };
}

export interface CompsResult {
  rows: { id: string; name: string; evRevenue: number | null; evEbitda: number | null; pe: number | null }[];
  evRevenue: Stat | null;
  evEbitda: Stat | null;
  pe: Stat | null;
  /** The implied enterprise value (and equity value) range for the target, from the 25th to 75th percentile of the chosen multiple. */
  range: { ev: [number, number, number]; equity: [number, number, number]; perShare: [number, number, number] } | null;
  steps: string[];
}

export function comps(i: CompsInputs): CompsResult {
  const rows = i.rows.map((r) => {
    const ev = n(r.ev);
    return { id: r.id, name: r.name, evRevenue: n(r.revenue) > 0 && ev > 0 ? ev / n(r.revenue) : null, evEbitda: n(r.ebitda) > 0 && ev > 0 ? ev / n(r.ebitda) : null, pe: n(r.netIncome) > 0 && n(r.equity) > 0 ? n(r.equity) / n(r.netIncome) : null };
  });
  const evRevenue = stats(rows.map((r) => r.evRevenue ?? 0));
  const evEbitda = stats(rows.map((r) => r.evEbitda ?? 0));
  const pe = stats(rows.map((r) => r.pe ?? 0));
  const basis = i.basis;
  const stat = basis === "ebitda" ? evEbitda : basis === "revenue" ? evRevenue : pe;
  const metric = basis === "ebitda" ? n(i.targetEbitda) : basis === "revenue" ? n(i.targetRevenue) : n(i.targetNetIncome);
  let range: CompsResult["range"] = null;
  if (stat && metric > 0) {
    const shares = Math.max(n(i.shares), 0.0001);
    const at = (mult: number): [number, number, number] => {
      if (basis === "pe") {
        const equity = mult * metric;
        return [equity + n(i.netDebt), equity, equity / shares];
      }
      const ev = mult * metric;
      return [ev, ev - n(i.netDebt), (ev - n(i.netDebt)) / shares];
    };
    const lo = at(stat.q1);
    const mid = at(stat.median);
    const hi = at(stat.q3);
    range = { ev: [lo[0], mid[0], hi[0]], equity: [lo[1], mid[1], hi[1]], perShare: [lo[2], mid[2], hi[2]] };
  }
  const label = basis === "ebitda" ? "EV/EBITDA" : basis === "revenue" ? "EV/Revenue" : "P/E";
  return {
    rows,
    evRevenue,
    evEbitda,
    pe,
    range,
    steps: [
      "Each comparable's multiples = its enterprise value ÷ revenue, enterprise value ÷ EBITDA, and equity value ÷ net income (P/E). A multiple is left out when its denominator is zero or negative.",
      "The 25th percentile, median and 75th percentile of the multiples are used, not the extremes, so one odd company does not set the answer.",
      range && stat
        ? `Applying the ${label} range (${f1(stat.q1)}x to ${f1(stat.q3)}x, median ${f1(stat.median)}x) to the target's ${basis === "ebitda" ? "EBITDA" : basis === "revenue" ? "revenue" : "net income"} of ${m(metric)} gives an enterprise value of ${m(range.ev[0])} to ${m(range.ev[2])}.`
        : "Enter at least one comparable with the chosen metric, and the target's matching figure, to see the implied value.",
      "Equity value = enterprise value − net debt (for a P/E, equity value is the multiple × net income and net debt is added to get enterprise value). Divide by shares for a per-share value.",
      "Choose comparables with similar business, size, growth and margins; a range from poorly matched companies says little.",
    ],
  };
}

/* ------------------------------------------------------------------ */
/* LBO                                                                 */
/* ------------------------------------------------------------------ */

export interface LboInputs {
  ebitda: string;
  entryMultiple: string;
  /** Debt as a multiple of EBITDA, and its interest rate. */
  leverage: string;
  interest: string;
  /** Fees as a percent of the purchase price. */
  fees: string;
  growth: string;
  /** D&A, capex and the increase in working capital as percents of EBITDA. */
  da: string;
  capex: string;
  nwc: string;
  tax: string;
  years: string;
  exitMultiple: string;
}
export const defaultLbo = (): LboInputs => ({ ebitda: "100", entryMultiple: "9", leverage: "5", interest: "9", fees: "2", growth: "6", da: "20", capex: "20", nwc: "5", tax: "25", years: "5", exitMultiple: "9" });

export interface LboYear { year: number; ebitda: number; interest: number; tax: number; fcf: number; paydown: number; debt: number }
export interface LboResult {
  valid: boolean;
  problem: string;
  price: number;
  debt: number;
  fees: number;
  equity: number;
  uses: number;
  years: LboYear[];
  exitEv: number;
  exitDebt: number;
  exitEquity: number;
  moic: number;
  irr: number;
  /** Where the value came from: EBITDA growth, a change in the multiple, and paying down debt (they add to the gain in equity value, less fees). */
  bridge: { growth: number; multiple: number; debt: number; fees: number; total: number };
  steps: string[];
}

export function lbo(i: LboInputs): LboResult {
  const ebitda0 = n(i.ebitda);
  const entry = n(i.entryMultiple);
  const hold = Math.max(1, Math.min(10, Math.round(n(i.years)) || 5));
  const empty: LboResult = { valid: false, problem: "", price: 0, debt: 0, fees: 0, equity: 0, uses: 0, years: [], exitEv: 0, exitDebt: 0, exitEquity: 0, moic: 0, irr: 0, bridge: { growth: 0, multiple: 0, debt: 0, fees: 0, total: 0 }, steps: [] };
  if (ebitda0 <= 0 || entry <= 0) return { ...empty, problem: "Enter EBITDA and an entry multiple." };
  const price = ebitda0 * entry;
  const debt0 = Math.min(ebitda0 * n(i.leverage), price);
  const fees = price * pct(i.fees);
  const uses = price + fees;
  const equity = uses - debt0;
  if (equity <= 0) return { ...empty, problem: "Debt and fees cover the whole purchase: there is no equity to invest. Lower the leverage." };
  const years: LboYear[] = [];
  let debt = debt0;
  let ebitda = ebitda0;
  let cash = 0;
  for (let k = 1; k <= hold; k++) {
    ebitda *= 1 + pct(i.growth);
    const interest = debt * pct(i.interest);
    const da = ebitda * pct(i.da);
    const tax = Math.max(0, (ebitda - da - interest) * pct(i.tax));
    const fcf = ebitda - ebitda * pct(i.capex) - ebitda * pct(i.nwc) - interest - tax;
    const paydown = Math.max(0, Math.min(debt, fcf));
    if (fcf > paydown) cash += fcf - paydown;
    debt -= paydown;
    years.push({ year: k, ebitda, interest, tax, fcf, paydown, debt });
  }
  const exitEbitda = ebitda;
  const exitEv = exitEbitda * n(i.exitMultiple);
  const exitEquity = exitEv - debt + cash;
  const moic = exitEquity / equity;
  const irr = moic > 0 ? moic ** (1 / hold) - 1 : -1;
  // Value creation: the gain in equity splits into EBITDA growth (at the entry multiple), the change in multiple (on exit EBITDA), and net debt paid down; fees reduce it.
  const growth = (exitEbitda - ebitda0) * entry;
  const multiple = (n(i.exitMultiple) - entry) * exitEbitda;
  const debtPaid = debt0 - debt + cash;
  const total = exitEquity - equity;
  return {
    valid: true,
    problem: "",
    price,
    debt: debt0,
    fees,
    equity,
    uses,
    years,
    exitEv,
    exitDebt: debt,
    exitEquity,
    moic,
    irr,
    bridge: { growth, multiple, debt: debtPaid, fees: -fees, total },
    steps: [
      `Purchase price = EBITDA ${m(ebitda0)} × ${i.entryMultiple}x = ${m(price)}. Uses = price + ${i.fees}% fees = ${m(uses)}.`,
      `Sources: debt of ${i.leverage}x EBITDA = ${m(debt0)}, and the sponsor's equity is what is left: ${m(equity)} (${p1(equity / uses)} of the total).`,
      `Each year EBITDA grows ${i.growth}%. Interest = beginning debt × ${i.interest}%. Taxes = (EBITDA − D&A − interest) × ${i.tax}%. Cash flow = EBITDA − capex − working capital − interest − taxes, and all of it repays debt (a 100% cash sweep).`,
      `At exit in year ${hold}: enterprise value = EBITDA ${m(exitEbitda)} × ${i.exitMultiple}x = ${m(exitEv)}; less remaining debt ${m(debt)} = equity ${m(exitEquity)}.`,
      `MOIC = exit equity ÷ equity invested = ${f1(moic)}x. IRR = MOIC^(1 ÷ ${hold}) − 1 = ${p1(irr)} (one cash flow in and one out, so no interim dividends).`,
      `Value bridge: EBITDA growth ${m(growth)} + multiple change ${m(multiple)} + debt paid down ${m(debtPaid)} − fees ${m(fees)} = gain of ${m(total)}.`,
    ],
  };
}

/** IRR for a grid of exit multiples (across) and holding periods (down). */
export function lboGrid(i: LboInputs): { multiples: number[]; holds: number[]; values: (number | null)[][] } {
  const x0 = n(i.exitMultiple);
  const multiples = [-2, -1, 0, 1, 2].map((d) => Math.max(1, Math.round((x0 + d) * 10) / 10));
  const holds = [3, 4, 5, 6, 7];
  return { multiples, holds, values: holds.map((h) => multiples.map((x) => { const r = lbo({ ...i, exitMultiple: String(x), years: String(h) }); return r.valid ? r.irr : null; })) };
}

/* ------------------------------------------------------------------ */
/* Accretion / dilution                                                */
/* ------------------------------------------------------------------ */

export interface MergerInputs {
  acqPrice: string;
  acqShares: string;
  acqNetIncome: string;
  tgtPrice: string;
  tgtShares: string;
  tgtNetIncome: string;
  /** Offer premium over the target's price, percent. */
  premium: string;
  /** Share of the price paid in stock; the rest is cash. */
  stockPct: string;
  /** How cash is raised: pre-tax interest on new debt (percent), or the pre-tax yield given up on cash on hand. */
  costOfCash: string;
  /** Pre-tax synergies, in millions, and one-time fees (not in EPS). */
  synergies: string;
  tax: string;
}
export const defaultMerger = (): MergerInputs => ({ acqPrice: "50", acqShares: "200", acqNetIncome: "600", tgtPrice: "20", tgtShares: "100", tgtNetIncome: "100", premium: "30", stockPct: "50", costOfCash: "6", synergies: "25", tax: "25" });

export interface MergerResult {
  valid: boolean;
  problem: string;
  offerPrice: number;
  purchasePrice: number;
  stockIssued: number;
  newShares: number;
  cashPaid: number;
  standaloneEps: number;
  proFormaIncome: number;
  proFormaShares: number;
  proFormaEps: number;
  /** Accretion (+) or dilution (−) as a percent of standalone EPS. */
  accretion: number;
  /** Pre-tax synergies needed for EPS to break even. */
  breakEvenSynergies: number;
  /** The acquirer's and target's P/E ratios, and the offer's. */
  acqPe: number;
  offerPe: number;
  steps: string[];
}

export function merger(i: MergerInputs): MergerResult {
  const empty: MergerResult = { valid: false, problem: "", offerPrice: 0, purchasePrice: 0, stockIssued: 0, newShares: 0, cashPaid: 0, standaloneEps: 0, proFormaIncome: 0, proFormaShares: 0, proFormaEps: 0, accretion: 0, breakEvenSynergies: 0, acqPe: 0, offerPe: 0, steps: [] };
  const aSh = n(i.acqShares);
  if (aSh <= 0 || n(i.acqPrice) <= 0 || n(i.tgtShares) <= 0 || n(i.tgtPrice) <= 0) return { ...empty, problem: "Enter the share prices and share counts for both companies." };
  const offer = n(i.tgtPrice) * (1 + pct(i.premium));
  const purchase = offer * n(i.tgtShares);
  const stockPct = Math.min(1, Math.max(0, pct(i.stockPct)));
  const stockIssued = purchase * stockPct;
  const cashPaid = purchase - stockIssued;
  const newShares = stockIssued / n(i.acqPrice);
  const t = pct(i.tax);
  const standaloneEps = n(i.acqNetIncome) / aSh;
  const financing = cashPaid * pct(i.costOfCash) * (1 - t);
  const synergies = n(i.synergies) * (1 - t);
  const income = n(i.acqNetIncome) + n(i.tgtNetIncome) + synergies - financing;
  const shares = aSh + newShares;
  const eps = income / shares;
  const accretion = standaloneEps > 0 ? eps / standaloneEps - 1 : 0;
  // Synergies (after tax) that make pro forma EPS equal standalone EPS: (NI_a + NI_t + S - fin) / shares = standalone.
  const needAfterTax = standaloneEps * shares - n(i.acqNetIncome) - n(i.tgtNetIncome) + financing;
  const breakEven = t < 1 ? Math.max(0, needAfterTax / (1 - t)) : 0;
  return {
    valid: true,
    problem: "",
    offerPrice: offer,
    purchasePrice: purchase,
    stockIssued,
    newShares,
    cashPaid,
    standaloneEps,
    proFormaIncome: income,
    proFormaShares: shares,
    proFormaEps: eps,
    accretion,
    breakEvenSynergies: breakEven,
    acqPe: n(i.acqNetIncome) > 0 ? (n(i.acqPrice) * aSh) / n(i.acqNetIncome) : 0,
    offerPe: n(i.tgtNetIncome) > 0 ? purchase / n(i.tgtNetIncome) : 0,
    steps: [
      `Offer price = target price $${f1(n(i.tgtPrice))} × (1 + ${i.premium}% premium) = $${f1(offer)}; purchase price = offer × ${f1(n(i.tgtShares))}M shares = ${m(purchase)}.`,
      `${i.stockPct}% is paid in stock: ${m(stockIssued)} ÷ the acquirer's $${f1(n(i.acqPrice))} share price = ${f1(newShares)}M new shares. The other ${m(cashPaid)} is cash, which costs ${i.costOfCash}% a year before tax (new interest or lost interest income).`,
      `Pro forma net income = acquirer + target + synergies × (1 − tax) − financing cost × (1 − tax) = ${m(n(i.acqNetIncome))} + ${m(n(i.tgtNetIncome))} + ${m(synergies)} − ${m(financing)} = ${m(income)}.`,
      `Pro forma shares = ${f1(aSh)}M + ${f1(newShares)}M = ${f1(shares)}M. Pro forma EPS $${f1(eps)} against standalone $${f1(standaloneEps)}: ${accretion >= 0 ? "accretive" : "dilutive"} by ${p1(Math.abs(accretion))}.`,
      `Break-even synergies (pre-tax) for no accretion or dilution: ${m(breakEven)}. A rule of thumb: an all-stock deal is accretive when the target's P/E at the offer is below the acquirer's P/E (here ${f1(i.tgtNetIncome ? purchase / Math.max(n(i.tgtNetIncome), 0.0001) : 0)}x against ${f1(n(i.acqNetIncome) > 0 ? (n(i.acqPrice) * aSh) / n(i.acqNetIncome) : 0)}x).`,
    ],
  };
}
