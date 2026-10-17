/**
 * Planning depth for a client plan: insurance needs, a Roth conversion, where to hold each kind of investment (asset location),
 * capital gains tax, and charitable giving. Each tool is a small, transparent calculation: every one returns the working along
 * with the answer so the screen and the deck can show how a number was reached.
 *
 * The tax figures are the IRS's for TAX_YEAR (see taxMath.ts) and are rounded planning estimates, not tax advice: they ignore
 * credits, phase-outs, the alternative minimum tax, and state-specific rules.
 */
import { BRACKETS, STANDARD_DEDUCTION, TAX_YEAR, asFilingStatus, federalTax, type FilingStatus } from "./taxMath";
import { CLASS_IDS, type ClassId } from "./wealthPortfolio";

const num = (v: unknown): number => {
  const x = parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};
const pos = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, d: string) => (typeof v === "string" ? v : d);
const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
const pct = (n: number, d = 1) => `${(Math.round(n * 10 ** (d + 2)) / 10 ** d).toFixed(d)}%`;

export { TAX_YEAR };

/* ------------------------------------------------------------------ */
/* Which tools, and what they remember                                 */
/* ------------------------------------------------------------------ */

export const PLANNING_TOOLS = [
  { id: "insurance", label: "Insurance needs", short: "Insurance", text: "Life, disability and umbrella coverage against what the client needs." },
  { id: "roth", label: "Roth conversion", short: "Roth conversion", text: "How much to convert, what it costs in tax, and when it pays off." },
  { id: "location", label: "Asset location", short: "Asset location", text: "Which account should hold which investment to keep tax low." },
  { id: "gains", label: "Capital gains", short: "Capital gains", text: "The tax on selling, the 0% room, and harvesting losses." },
  { id: "giving", label: "Charitable giving", short: "Giving", text: "Cash, appreciated stock, or a donor-advised fund: what each costs after tax." },
] as const;
export type PlanningToolId = (typeof PLANNING_TOOLS)[number]["id"];

export interface InsuranceData {
  /** Yearly gross pay of the person being insured. */
  income: string;
  dependents: string;
  /** Years the family would need the income (until the youngest is on their own, or a spouse can adjust). */
  years: string;
  /** Share of income to replace, percent. */
  replacePct: string;
  /** Take debts, the mortgage and liquid savings from the Snapshot instead of typing them. */
  useSnapshot: boolean;
  debts: string;
  mortgage: string;
  payMortgage: boolean;
  education: string;
  finalExpenses: string;
  liquid: string;
  offsetLiquid: boolean;
  existingLife: string;
  /** Disability: the share of income to replace, and what is already in force (monthly benefit). */
  ltdPct: string;
  groupLtd: string;
  ownLtd: string;
  existingUmbrella: string;
  /** Things that raise the chance of a liability claim, by id (see UMBRELLA_FACTORS). */
  factors: string[];
  netWorth: string;
  note: string;
}
export const UMBRELLA_FACTORS = [
  ["home", "Owns a home"],
  ["teen", "A teen or new driver in the household"],
  ["rental", "Rental property"],
  ["pool", "Pool, trampoline or dog"],
  ["business", "Owns a business or side business"],
  ["public", "Public role, board seat or high income"],
] as const;

export interface RothData {
  status: FilingStatus;
  /** Yearly taxable income before the conversion (after the standard deduction or other deductions). */
  taxable: string;
  /** Pre-tax (traditional IRA or 401k) balance that could be converted. */
  balance: string;
  /** The amount being considered. */
  amount: string;
  /** Years until the money is spent, and the return meanwhile, percent. */
  years: string;
  ret: string;
  /** The tax rate expected in retirement, percent (federal and state together). */
  retRate: string;
  state: string;
  /** Percent of its return the outside money used to pay the tax would lose to tax each year (tax drag). */
  drag: string;
  note: string;
}

export interface LotRow {
  id: string;
  name: string;
  basis: string;
  value: string;
  longTerm: boolean;
  sell: boolean;
}
export interface GainsData {
  status: FilingStatus;
  /** Yearly taxable income apart from these sales. */
  taxable: string;
  lots: LotRow[];
  /** A capital loss carried over from earlier years. */
  carry: string;
  state: string;
  note: string;
}

export interface GivingData {
  status: FilingStatus;
  /** Yearly gross income (adjusted gross income is taken to be the same). */
  income: string;
  /** Itemized deductions other than gifts (mortgage interest, state and local tax up to the cap, medical above the floor). */
  itemized: string;
  /** The yearly gift. */
  gift: string;
  /** For a gift of stock: what it cost the client, and the number of years of gifts to bunch into one year. */
  basis: string;
  bunchYears: string;
  state: string;
  note: string;
}

export interface LocationData {
  /** Balances in each kind of account. */
  taxable: string;
  deferred: string;
  roth: string;
  /** The tax rate on interest and non-qualified income, and on qualified dividends and gains, percent. */
  ordinary: string;
  qualified: string;
  note: string;
}

export interface PlanningData {
  insurance: InsuranceData;
  roth: RothData;
  location: LocationData;
  gains: GainsData;
  giving: GivingData;
}

export const emptyPlanning = (): PlanningData => ({
  insurance: {
    income: "", dependents: "", years: "10", replacePct: "70", useSnapshot: true, debts: "", mortgage: "", payMortgage: true, education: "", finalExpenses: "15000", liquid: "", offsetLiquid: true,
    existingLife: "", ltdPct: "60", groupLtd: "", ownLtd: "", existingUmbrella: "", factors: [], netWorth: "", note: "",
  },
  roth: { status: "single", taxable: "", balance: "", amount: "", years: "25", ret: "6", retRate: "24", state: "0", drag: "20", note: "" },
  location: { taxable: "", deferred: "", roth: "", ordinary: "24", qualified: "15", note: "" },
  gains: { status: "single", taxable: "", lots: [], carry: "", state: "0", note: "" },
  giving: { status: "single", income: "", itemized: "", gift: "", basis: "", bunchYears: "3", state: "0", note: "" },
});

const status = (v: unknown): FilingStatus => asFilingStatus(v);

/** A saved planning document read safely: anything missing falls back to the default. */
export function normalizePlanning(raw: unknown): PlanningData {
  const b = emptyPlanning();
  if (!isObj(raw)) return b;
  const merge = <T extends object>(base: T, saved: unknown): T => {
    if (!isObj(saved)) return base;
    const out = { ...base } as Record<string, unknown>;
    const bs = base as Record<string, unknown>;
    for (const [k, v] of Object.entries(bs)) {
      const sv = saved[k];
      if (typeof v === "string") out[k] = str(sv, v);
      else if (typeof v === "boolean") out[k] = typeof sv === "boolean" ? sv : v;
    }
    return out as T;
  };
  const ins = merge(b.insurance, raw.insurance);
  ins.factors = isObj(raw.insurance) && Array.isArray(raw.insurance.factors) ? (raw.insurance.factors as unknown[]).filter((x): x is string => typeof x === "string") : [];
  const roth = merge(b.roth, raw.roth);
  roth.status = status(isObj(raw.roth) ? raw.roth.status : undefined);
  const gains = merge(b.gains, raw.gains);
  gains.status = status(isObj(raw.gains) ? raw.gains.status : undefined);
  const lots = isObj(raw.gains) && Array.isArray(raw.gains.lots) ? (raw.gains.lots as unknown[]) : [];
  gains.lots = lots
    .filter(isObj)
    .map((l) => ({ id: str(l.id, Math.random().toString(36).slice(2, 8)), name: str(l.name, ""), basis: str(l.basis, ""), value: str(l.value, ""), longTerm: l.longTerm !== false, sell: l.sell !== false }));
  const giving = merge(b.giving, raw.giving);
  giving.status = status(isObj(raw.giving) ? raw.giving.status : undefined);
  return { insurance: ins, roth, location: merge(b.location, raw.location), gains, giving };
}

/** Whether a planning tool has been touched (so the deck can leave out one that is still blank). */
export function planningTouched(p: PlanningData, id: PlanningToolId): boolean {
  const e = emptyPlanning();
  const changed = (a: object, b: object) => JSON.stringify(a) !== JSON.stringify(b);
  switch (id) {
    case "insurance":
      return num(p.insurance.income) > 0 || num(p.insurance.existingLife) > 0 || num(p.insurance.groupLtd) + num(p.insurance.ownLtd) > 0 || p.insurance.factors.length > 0;
    case "roth":
      return num(p.roth.amount) > 0 || num(p.roth.taxable) > 0;
    case "location":
      return num(p.location.taxable) + num(p.location.deferred) + num(p.location.roth) > 0;
    case "gains":
      return p.gains.lots.length > 0 || changed({ ...p.gains, note: "" }, { ...e.gains, note: "" });
    case "giving":
      return num(p.giving.gift) > 0;
  }
}

/* ------------------------------------------------------------------ */
/* Insurance                                                           */
/* ------------------------------------------------------------------ */

export interface SnapshotNumbers {
  /** Debts other than the mortgage, the mortgage, and cash plus brokerage. */
  debts: number;
  mortgage: number;
  liquid: number;
  netWorth: number;
}

export interface InsuranceResult {
  life: {
    rows: { label: string; amount: number; how: string }[];
    need: number;
    offset: number;
    existing: number;
    gap: number;
    steps: string[];
  };
  disability: { income: number; target: number; existing: number; gap: number; steps: string[] };
  umbrella: { base: number; extra: number; recommended: number; existing: number; gap: number; netWorth: number; steps: string[] };
}

/** Life: the DIME method (debts, income, mortgage, education) plus final expenses, less what is already covered. */
export function insuranceNeeds(d: InsuranceData, snap: SnapshotNumbers): InsuranceResult {
  const income = pos(num(d.income));
  const replace = Math.min(100, pos(num(d.replacePct)));
  const years = pos(num(d.years));
  const debts = d.useSnapshot ? snap.debts : pos(num(d.debts));
  const mortgage = d.payMortgage ? (d.useSnapshot ? snap.mortgage : pos(num(d.mortgage))) : 0;
  const liquid = d.useSnapshot ? snap.liquid : pos(num(d.liquid));
  const rows = [
    { label: "Income to replace", amount: income * (replace / 100) * years, how: `${usd(income)} × ${replace}% × ${years} years (not discounted, so slightly cautious)` },
    { label: "Debts to clear", amount: debts, how: d.useSnapshot ? "Non-mortgage debts from the Snapshot" : "As entered" },
    { label: "Mortgage", amount: mortgage, how: d.payMortgage ? (d.useSnapshot ? "Mortgage balance from the Snapshot" : "As entered") : "Left out: the family keeps paying it" },
    { label: "Education", amount: pos(num(d.education)), how: "As entered" },
    { label: "Final expenses", amount: pos(num(d.finalExpenses)), how: "Funeral, last bills and estate costs, as entered" },
  ];
  const need = rows.reduce((t, r) => t + r.amount, 0);
  const offset = d.offsetLiquid ? liquid : 0;
  const existing = pos(num(d.existingLife));
  const gap = Math.max(0, need - offset - existing);
  const monthlyInc = income / 12;
  const target = monthlyInc * (Math.min(100, pos(num(d.ltdPct))) / 100);
  const existingDis = pos(num(d.groupLtd)) + pos(num(d.ownLtd));
  const base = Math.max(1_000_000, Math.ceil(Math.max(0, d.netWorth.trim() ? num(d.netWorth) : snap.netWorth) / 1_000_000) * 1_000_000);
  const extra = d.factors.length >= 3 ? 2_000_000 : d.factors.length >= 1 ? 1_000_000 : 0;
  const nw = d.netWorth.trim() ? num(d.netWorth) : snap.netWorth;
  const recommended = base + extra;
  const existingUmb = pos(num(d.existingUmbrella));
  return {
    life: {
      rows,
      need,
      offset,
      existing,
      gap,
      steps: [
        `Need = ${rows.map((r) => `${r.label.toLowerCase()} ${usd(r.amount)}`).join(" + ")} = ${usd(need)}.`,
        `Less ${offset > 0 ? `liquid savings ${usd(offset)} and ` : ""}coverage already in force ${usd(existing)}.`,
        `Gap = ${usd(need)} − ${usd(offset + existing)} = ${usd(gap)}${gap === 0 ? " (covered)" : ""}.`,
      ],
    },
    disability: {
      income: monthlyInc,
      target,
      existing: existingDis,
      gap: Math.max(0, target - existingDis),
      steps: [
        `Target benefit = ${usd(monthlyInc)} a month × ${pct(Math.min(100, pos(num(d.ltdPct))) / 100, 0)} = ${usd(target)} a month.`,
        `In force: ${usd(existingDis)} a month (employer plus individual). Employer plans usually pay 60% of salary up to a cap, and the benefit is taxable if the employer paid the premium.`,
        `Gap = ${usd(target)} − ${usd(existingDis)} = ${usd(Math.max(0, target - existingDis))} a month.`,
      ],
    },
    umbrella: {
      base,
      extra,
      recommended,
      existing: existingUmb,
      gap: Math.max(0, recommended - existingUmb),
      netWorth: nw,
      steps: [
        `Start with the client's net worth (${usd(nw)}) rounded up to the next $1 million, and at least $1 million: ${usd(base)}.`,
        `Add ${usd(extra)} for ${d.factors.length} risk factor${d.factors.length === 1 ? "" : "s"} (1 million for one or two, 2 million for three or more).`,
        `Recommended ${usd(recommended)}, less ${usd(existingUmb)} in force = ${usd(Math.max(0, recommended - existingUmb))} to add. This is a rule of thumb, not an underwriting rule.`,
      ],
    },
  };
}

/* ------------------------------------------------------------------ */
/* Roth conversion                                                     */
/* ------------------------------------------------------------------ */

export interface BracketRoom {
  rate: number;
  /** Taxable income at the top of this bracket. */
  top: number;
  /** How much more could be converted before reaching the top of this bracket. */
  room: number;
}

export interface RothResult {
  taxableBefore: number;
  marginalBefore: number;
  rooms: BracketRoom[];
  amount: number;
  federal: number;
  stateTax: number;
  tax: number;
  /** Tax on the conversion as a share of the amount converted (the rate actually paid on it). */
  effective: number;
  marginalAfter: number;
  /** Value of the converted dollars at the end of the period, in a Roth and left in a traditional account after tax. */
  rothEnd: number;
  tradEnd: number;
  /** What the tax paid now would have grown to if left invested outside the account. */
  taxOpportunity: number;
  advantage: number;
  breakEvenRate: number;
  verdict: string;
  steps: string[];
}

export function rothConversion(d: RothData): RothResult {
  const taxable = pos(num(d.taxable));
  const amount = Math.min(pos(num(d.amount)), d.balance.trim() ? pos(num(d.balance)) : Infinity);
  const status = d.status;
  const before = federalTax(taxable, status);
  const after = federalTax(taxable + amount, status);
  const federal = after.tax - before.tax;
  const stateTax = (pos(num(d.state)) / 100) * amount;
  const tax = federal + stateTax;
  const effective = amount > 0 ? tax / amount : 0;
  const rooms: BracketRoom[] = BRACKETS[status]
    .filter(([top]) => top > taxable && Number.isFinite(top))
    .slice(0, 3)
    .map(([top, rate]) => ({ rate, top, room: top - taxable }));
  const years = pos(num(d.years));
  const r = pos(num(d.ret)) / 100;
  const g = (1 + r) ** years;
  const dragged = Math.max(0, r * (1 - Math.min(100, pos(num(d.drag))) / 100));
  const gOutside = (1 + dragged) ** years;
  const retRate = Math.min(100, pos(num(d.retRate))) / 100;
  const rothEnd = amount * g;
  const tradEnd = amount * g * (1 - retRate);
  const taxOpportunity = tax * gOutside;
  const advantage = rothEnd - tradEnd - taxOpportunity;
  const breakEvenRate = effective * (gOutside / g);
  const verdict =
    amount <= 0
      ? "Enter an amount to convert."
      : advantage > 0
        ? `Converting comes out ahead by about ${usd(advantage)} in ${years} years, because the tax now (${pct(effective)}) is lower than the tax expected later (${pct(retRate)}).`
        : `Converting comes out behind by about ${usd(-advantage)} in ${years} years, because the tax now (${pct(effective)}) is not lower than the tax expected later (${pct(retRate)}). Waiting, or converting a smaller amount, may be better.`;
  return {
    taxableBefore: taxable,
    marginalBefore: before.marginalRate,
    rooms,
    amount,
    federal,
    stateTax,
    tax,
    effective,
    marginalAfter: after.marginalRate,
    rothEnd,
    tradEnd,
    taxOpportunity,
    advantage,
    breakEvenRate,
    verdict,
    steps: [
      `Federal tax on the conversion = tax on ${usd(taxable + amount)} less tax on ${usd(taxable)} (${TAX_YEAR} brackets, ${status}) = ${usd(federal)}; state ${usd(stateTax)}; together ${usd(tax)}, or ${pct(effective)} of ${usd(amount)}.`,
      `${usd(amount)} grows at ${pct(r, 1)} for ${years} years: ${usd(rothEnd)} in a Roth (tax free), or ${usd(tradEnd)} after a ${pct(retRate, 0)} tax if left in the traditional account.`,
      `The ${usd(tax)} of tax paid now, if kept invested outside the account (return less a ${pct(Math.min(100, pos(num(d.drag))) / 100, 0)} tax drag), would have grown to ${usd(taxOpportunity)}.`,
      `Advantage = ${usd(rothEnd)} − ${usd(tradEnd)} − ${usd(taxOpportunity)} = ${usd(advantage)}. Break-even retirement tax rate about ${pct(breakEvenRate)}.`,
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Capital gains                                                       */
/* ------------------------------------------------------------------ */

/** Taxable income up to which long-term gains are taxed at 0% and at 15% (20% above), TAX_YEAR (Rev. Proc. 2025-32). */
export const LTCG_THRESHOLDS: Record<FilingStatus, { zero: number; fifteen: number }> = {
  single: { zero: 49450, fifteen: 545500 },
  mfj: { zero: 98900, fifteen: 613700 },
  hoh: { zero: 66200, fifteen: 579600 },
};
/** The 3.8% net investment income tax applies to investment income above this modified adjusted gross income (not indexed). */
export const NIIT_THRESHOLD: Record<FilingStatus, number> = { single: 200000, mfj: 250000, hoh: 200000 };
export const LOSS_DEDUCTION_LIMIT = 3000;

/** Tax on long-term gains stacked on top of ordinary taxable income, with the dollars in each rate. */
export function longTermGainsTax(ordinaryTaxable: number, gain: number, status: FilingStatus) {
  const t = LTCG_THRESHOLDS[status];
  const g = pos(gain);
  const o = pos(ordinaryTaxable);
  const at0 = Math.max(0, Math.min(g, t.zero - o));
  const at15 = Math.max(0, Math.min(g - at0, t.fifteen - Math.max(o, t.zero)));
  const at20 = Math.max(0, g - at0 - at15);
  return { at0, at15, at20, tax: at15 * 0.15 + at20 * 0.2 };
}

export interface GainsResult {
  shortTerm: number;
  longTerm: number;
  net: number;
  deduction: number;
  carryForward: number;
  ordinaryTaxable: number;
  federalOrdinary: number;
  ltcg: ReturnType<typeof longTermGainsTax>;
  niit: number;
  stateTax: number;
  total: number;
  /** The share of the net gain paid in tax. */
  effective: number;
  /** Long-term gains that could still be realized at 0% on top of this year's income and sales. */
  zeroRoom: number;
  steps: string[];
}

export function capitalGains(d: GainsData): GainsResult {
  const sold = d.lots.filter((l) => l.sell);
  let st = 0;
  let lt = -pos(num(d.carry));
  for (const l of sold) {
    const g = num(l.value) - num(l.basis);
    if (l.longTerm) lt += g;
    else st += g;
  }
  const shortTerm = st;
  // Net the two kinds against each other, as the tax form does.
  if (st < 0 && lt > 0) {
    lt += st;
    st = 0;
  } else if (lt < 0 && st > 0) {
    st += lt;
    lt = 0;
  }
  const net = st + lt;
  const deduction = net < 0 ? Math.min(LOSS_DEDUCTION_LIMIT, -net) : 0;
  const carryForward = net < 0 ? -net - deduction : 0;
  const base = pos(num(d.taxable));
  const stTaxed = Math.max(0, st);
  const ordinaryTaxable = Math.max(0, base + stTaxed - deduction);
  const federalOrdinary = federalTax(ordinaryTaxable, d.status).tax - federalTax(Math.max(0, base), d.status).tax;
  const ltg = Math.max(0, lt);
  const ltcg = longTermGainsTax(ordinaryTaxable, ltg, d.status);
  const magi = base + STANDARD_DEDUCTION[d.status] + Math.max(0, net);
  const niit = 0.038 * Math.min(Math.max(0, net), Math.max(0, magi - NIIT_THRESHOLD[d.status]));
  const stateTax = (pos(num(d.state)) / 100) * Math.max(0, net);
  const total = federalOrdinary + ltcg.tax + niit + stateTax;
  const zeroRoom = Math.max(0, LTCG_THRESHOLDS[d.status].zero - ordinaryTaxable - ltg);
  return {
    shortTerm,
    longTerm: lt,
    net,
    deduction,
    carryForward,
    ordinaryTaxable,
    federalOrdinary,
    ltcg,
    niit,
    stateTax,
    total,
    effective: net > 0 ? total / net : 0,
    zeroRoom,
    steps: [
      `Gain or loss on each lot sold is its value less its cost. Short-term (held a year or less): ${usd(shortTerm)}; long-term, after any carried-over loss: ${usd(lt)}. A loss in one kind offsets a gain in the other.`,
      net < 0
        ? `A net loss of ${usd(-net)}: up to ${usd(LOSS_DEDUCTION_LIMIT)} reduces ordinary income this year, ${usd(carryForward)} carries to next year.`
        : `Net gain ${usd(net)}. Short-term gains are taxed as ordinary income (${usd(federalOrdinary)} extra federal tax); long-term gains are stacked on top of ${usd(ordinaryTaxable)} of taxable income: ${usd(ltcg.at0)} at 0%, ${usd(ltcg.at15)} at 15%, ${usd(ltcg.at20)} at 20% = ${usd(ltcg.tax)}.`,
      `Net investment income tax: 3.8% of the smaller of the gain and the income over ${usd(NIIT_THRESHOLD[d.status])} = ${usd(niit)}. State: ${usd(stateTax)}.`,
      `Room left in the 0% long-term bracket: ${usd(zeroRoom)}. Gains realized up to there (gain harvesting) are federal tax free and raise the cost basis.`,
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Charitable giving                                                   */
/* ------------------------------------------------------------------ */

/** Cash gifts by people who take the standard deduction can be deducted up to this much (2026 onward). */
export const NON_ITEMIZER_GIFT: Record<FilingStatus, number> = { single: 1000, mfj: 2000, hoh: 1000 };
/** From 2026, itemized gifts count only above this share of adjusted gross income. */
export const GIVING_FLOOR = 0.005;
/** Cash gifts to public charities are deductible up to this share of income; gifts of appreciated stock, this share. */
export const CASH_LIMIT = 0.6;
export const STOCK_LIMIT = 0.3;

export interface GivingYear {
  /** Cash or stock given this year, and which deduction was used. */
  gift: number;
  itemizing: boolean;
  deduction: number;
  tax: number;
}
export interface GivingOption {
  id: "cash" | "stock" | "bunch";
  label: string;
  /** A short name for tables and headlines. */
  short: string;
  /** Total tax over the period, and the tax saved against giving nothing. */
  tax: number;
  saved: number;
  /** What the charity gets, over the period. */
  charity: number;
  /** What the gifts cost the client after tax, over the period. */
  netCost: number;
  detail: string;
}
export interface GivingResult {
  years: number;
  baseTax: number;
  gain: number;
  gainTaxAvoided: number;
  options: GivingOption[];
  best: GivingOption | null;
  steps: string[];
}

function yearTax(income: number, itemized: number, giftItemizable: number, giftNonItemizer: number, status: FilingStatus) {
  const standard = STANDARD_DEDUCTION[status] + Math.min(giftNonItemizer, NON_ITEMIZER_GIFT[status]);
  const itemizedTotal = itemized + Math.max(0, giftItemizable - GIVING_FLOOR * income);
  const deduction = Math.max(standard, itemizedTotal);
  return { tax: federalTax(Math.max(0, income - deduction), status).tax, deduction, itemizing: itemizedTotal > standard };
}

/** Compares giving cash each year, giving appreciated stock each year, and bunching several years of gifts into one. */
export function givingOptions(d: GivingData): GivingResult {
  const income = pos(num(d.income));
  const status = d.status;
  const gift = pos(num(d.gift));
  const itemized = pos(num(d.itemized));
  const years = Math.max(1, Math.min(10, Math.round(num(d.bunchYears)) || 1));
  const stateRate = pos(num(d.state)) / 100;
  const none = yearTax(income, itemized, 0, 0, status);
  const baseTax = none.tax;

  const stateSaving = (deduct: number) => deduct * stateRate;
  // Cash each year.
  const cashYear = yearTax(income, itemized, Math.min(gift, CASH_LIMIT * income), gift, status);
  const cashSaved = (baseTax - cashYear.tax + stateSaving(gift > 0 && cashYear.itemizing ? gift : 0)) * years;
  // Stock each year: the full value is deductible (up to 30% of income) and the gain is never taxed.
  const basis = Math.min(gift, pos(num(d.basis)));
  const gain = Math.max(0, gift - basis);
  const stockYear = yearTax(income, itemized, Math.min(gift, STOCK_LIMIT * income), 0, status);
  const gainTax = longTermGainsTax(Math.max(0, income - none.deduction), gain, status).tax;
  const stockSaved = (baseTax - stockYear.tax + stateSaving(stockYear.itemizing ? gift : 0) + gainTax) * years;
  // Bunching: N years of stock into a donor-advised fund in one year, then the standard deduction.
  const lump = gift * years;
  const bunchFirst = yearTax(income, itemized, Math.min(lump, STOCK_LIMIT * income), 0, status);
  const bunchBasis = Math.min(lump, basis * years);
  const bunchGainTax = longTermGainsTax(Math.max(0, income - none.deduction), Math.max(0, lump - bunchBasis), status).tax;
  const bunchSaved = baseTax - bunchFirst.tax + stateSaving(bunchFirst.itemizing ? Math.min(lump, STOCK_LIMIT * income) : 0) + bunchGainTax;
  const cashNet = gift * years - cashSaved;
  const stockNet = gift * years - stockSaved;
  const bunchNet = lump - bunchSaved;
  const options: GivingOption[] = [
    {
      id: "cash",
      label: `Cash, ${usd(gift)} a year`,
      short: "Giving cash each year",
      tax: cashYear.tax * years,
      saved: cashSaved,
      charity: gift * years,
      netCost: cashNet,
      detail: cashYear.itemizing ? "Itemizing: the gift adds to the other deductions." : `Taking the standard deduction: only up to ${usd(NON_ITEMIZER_GIFT[status])} of a cash gift is deductible.`,
    },
    {
      id: "stock",
      label: `Appreciated stock, ${usd(gift)} a year`,
      short: "Giving appreciated stock each year",
      tax: stockYear.tax * years,
      saved: stockSaved,
      charity: gift * years,
      netCost: stockNet,
      detail: `Gives the stock itself, so the ${usd(gain)} gain each year is never taxed${stockYear.itemizing ? ", and the full value is deducted." : "; the gift is not deducted because the standard deduction is larger."}`,
    },
    {
      id: "bunch",
      label: `${years} years of stock in one gift (donor-advised fund)`,
      short: `Bunching ${years} years of stock into one donor-advised fund gift`,
      tax: bunchFirst.tax,
      saved: bunchSaved,
      charity: lump,
      netCost: bunchNet,
      detail: `Gives ${usd(lump)} once to a donor-advised fund, deducts it in one year${bunchFirst.itemizing ? "" : " (not enough to itemize)"}, and grants it to charities over the ${years} years.`,
    },
  ];
  const best = gift > 0 ? options.reduce((a, b) => (b.netCost < a.netCost ? b : a)) : null;
  return {
    years,
    baseTax,
    gain,
    gainTaxAvoided: gainTax * years,
    options,
    best,
    steps: [
      `With no gift the federal tax is ${usd(baseTax)} (${TAX_YEAR} brackets, taking the larger of the standard deduction ${usd(STANDARD_DEDUCTION[status])} and itemized deductions ${usd(itemized)}).`,
      `Gifts are itemized only if they lift deductions above the standard deduction, and count only above ${pct(GIVING_FLOOR, 1)} of income (from 2026). Cash is limited to ${pct(CASH_LIMIT, 0)} of income and stock to ${pct(STOCK_LIMIT, 0)}.`,
      `Giving stock instead of cash avoids tax on the gain (${usd(gain)} at the long-term rates, ${usd(gainTax)} a year) and deducts the full value.`,
      `Cost after tax = what is given less the tax it saves. The 35% cap on the benefit for the top bracket, the alternative minimum tax, and carryovers of unused deductions are not modeled.`,
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Asset location                                                      */
/* ------------------------------------------------------------------ */

/** How each asset class is taxed while held in a taxable account: its yearly income yield and the kind of tax on it. */
export const TAX_TRAITS: Record<ClassId, { yield: number; kind: "ordinary" | "qualified"; note: string }> = {
  lc: { yield: 1.5, kind: "qualified", note: "Mostly qualified dividends and deferred gains." },
  sc: { yield: 1.2, kind: "qualified", note: "Low yield; gains are deferred until sold." },
  intl: { yield: 2.8, kind: "qualified", note: "Dividends are qualified; foreign tax credit works only in a taxable account." },
  em: { yield: 2.5, kind: "qualified", note: "Qualified dividends, with higher growth." },
  agg: { yield: 4.2, kind: "ordinary", note: "Interest is taxed as ordinary income every year." },
  tips: { yield: 3.5, kind: "ordinary", note: "Interest and inflation adjustments are taxed as ordinary income each year." },
  reit: { yield: 3.8, kind: "ordinary", note: "Most distributions are ordinary income, partly offset by the 20% pass-through deduction." },
  cash: { yield: 3.5, kind: "ordinary", note: "Interest is ordinary income; keep emergency cash handy in a taxable account." },
};

export type AccountKind = "taxable" | "deferred" | "roth";
export const ACCOUNT_LABEL: Record<AccountKind, string> = { taxable: "Taxable", deferred: "Tax-deferred (traditional IRA or 401k)", roth: "Roth" };

export interface LocationResult {
  total: number;
  /** Dollars of each class in each account, as placed. */
  placed: Record<AccountKind, Partial<Record<ClassId, number>>>;
  /** The same, with every account holding the same mix. */
  prorata: Record<AccountKind, Partial<Record<ClassId, number>>>;
  dragProrata: number;
  dragPlaced: number;
  saving: number;
  steps: string[];
}

/**
 * Places the target mix (class weights in percent, adding to 100) across the three account types. The classes that lose the most
 * to tax each year (taxed at the highest rate per dollar of income) go in the tax-deferred account first; the classes with the most
 * growth go in the Roth; what is left, the tax-efficient classes, goes in the taxable account.
 */
export function assetLocation(d: LocationData, weights: Record<ClassId, number>, expectedReturn: Record<ClassId, number>): LocationResult {
  const bal: Record<AccountKind, number> = { taxable: pos(num(d.taxable)), deferred: pos(num(d.deferred)), roth: pos(num(d.roth)) };
  const total = bal.taxable + bal.deferred + bal.roth;
  const ord = pos(num(d.ordinary)) / 100;
  const qual = pos(num(d.qualified)) / 100;
  const rate = (c: ClassId) => (TAX_TRAITS[c].kind === "ordinary" ? ord : qual);
  const costPerDollar = (c: ClassId) => (TAX_TRAITS[c].yield / 100) * rate(c);
  const wsum = CLASS_IDS.reduce((t, c) => t + pos(weights[c] ?? 0), 0) || 1;
  const target: Record<ClassId, number> = Object.fromEntries(CLASS_IDS.map((c) => [c, (pos(weights[c] ?? 0) / wsum) * total])) as Record<ClassId, number>;

  const placed: LocationResult["placed"] = { taxable: {}, deferred: {}, roth: {} };
  const left = { ...target };
  const room = { ...bal };
  const fill = (acct: AccountKind, order: ClassId[]) => {
    for (const c of order) {
      const put = Math.min(left[c], room[acct]);
      if (put > 0.5) {
        placed[acct][c] = (placed[acct][c] ?? 0) + put;
        left[c] -= put;
        room[acct] -= put;
      }
    }
  };
  // Cash stays in the taxable account (it is the emergency money), so it is placed there first.
  fill("taxable", ["cash"]);
  fill("deferred", [...CLASS_IDS].sort((a, b) => costPerDollar(b) - costPerDollar(a)));
  fill("roth", [...CLASS_IDS].sort((a, b) => (expectedReturn[b] ?? 0) - (expectedReturn[a] ?? 0)));
  fill("taxable", [...CLASS_IDS].sort((a, b) => costPerDollar(a) - costPerDollar(b)));

  const prorata: LocationResult["prorata"] = { taxable: {}, deferred: {}, roth: {} };
  for (const a of ["taxable", "deferred", "roth"] as AccountKind[]) for (const c of CLASS_IDS) if (total > 0 && target[c] > 0) prorata[a][c] = (target[c] / total) * bal[a];
  const drag = (m: LocationResult["placed"]) => CLASS_IDS.reduce((t, c) => t + (m.taxable[c] ?? 0) * costPerDollar(c), 0);
  const dragProrata = drag(prorata);
  const dragPlaced = drag(placed);
  return {
    total,
    placed,
    prorata,
    dragProrata,
    dragPlaced,
    saving: dragProrata - dragPlaced,
    steps: [
      `Yearly tax cost of holding a class in a taxable account = its income yield × the tax rate on that kind of income (ordinary ${pct(ord, 0)}, qualified ${pct(qual, 0)}). Bonds and REITs cost the most; broad stock funds the least.`,
      `Placed in order: cash in the taxable account, then the costliest classes in the tax-deferred account, then the highest-return classes in the Roth, and the rest in the taxable account.`,
      `Taxable-account tax drag: ${usd(dragProrata)} a year if every account held the same mix, ${usd(dragPlaced)} as placed, a saving of ${usd(dragProrata - dragPlaced)} a year.`,
      `The overall mix is unchanged. Real decisions also weigh account limits, the cost of selling, withdrawal order and the investor's own needs.`,
    ],
  };
}
