/**
 * A simple income tax estimate for someone paid a salary or wages: federal income tax, Social Security, Medicare, and a
 * state or local rate the person enters. It uses the standard deduction and ignores credits, itemizing, self-employment,
 * investment income, and everything else. The figures are the IRS's for TAX_YEAR (Rev. Proc. 2025-32); update them each year.
 */
export const TAX_YEAR = 2026;

export type FilingStatus = "single" | "mfj" | "hoh";

export const STANDARD_DEDUCTION: Record<FilingStatus, number> = { single: 16100, mfj: 32200, hoh: 24150 };

/** [taxable income up to, rate]: each slice of income is taxed at its own rate. */
export const BRACKETS: Record<FilingStatus, [number, number][]> = {
  single: [[12400, 0.1], [50400, 0.12], [105700, 0.22], [201775, 0.24], [256225, 0.32], [640600, 0.35], [Infinity, 0.37]],
  mfj: [[24800, 0.1], [100800, 0.12], [211400, 0.22], [403550, 0.24], [512450, 0.32], [768700, 0.35], [Infinity, 0.37]],
  hoh: [[17700, 0.1], [67450, 0.12], [105700, 0.22], [201750, 0.24], [256200, 0.32], [640600, 0.35], [Infinity, 0.37]],
};

export const SOCIAL_SECURITY_WAGE_BASE = 184500;
const MEDICARE_EXTRA_AFTER: Record<FilingStatus, number> = { single: 200000, mfj: 250000, hoh: 200000 };

const pos = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);

/** Tax on taxable income, and the rate of the last dollar (the marginal bracket). */
export function federalTax(taxable: number, status: FilingStatus): { tax: number; marginalRate: number } {
  let tax = 0;
  let lower = 0;
  let marginalRate = 0;
  for (const [upTo, rate] of BRACKETS[status]) {
    if (taxable <= lower) break;
    tax += (Math.min(taxable, upTo) - lower) * rate;
    marginalRate = rate;
    lower = upTo;
  }
  return { tax, marginalRate };
}

export interface TaxInputs {
  status: FilingStatus;
  /** Yearly wages before anything is taken out. */
  gross: number;
  /** Yearly pre-tax retirement contributions (401k, 403b, traditional IRA through payroll). */
  retirement: number;
  /** Other yearly pre-tax pay deductions (health insurance premiums, HSA, commuter). */
  otherPretax: number;
  stateRatePercent: number;
  /** Tax credits (such as the child tax credit), which reduce federal tax dollar for dollar down to zero. */
  credits: number;
}

export function estimateTax(i: TaxInputs) {
  const gross = pos(i.gross);
  const retirement = Math.min(pos(i.retirement), gross);
  const other = Math.min(pos(i.otherPretax), gross - retirement);
  const taxable = Math.max(0, gross - retirement - other - STANDARD_DEDUCTION[i.status]);
  const { tax, marginalRate } = federalTax(taxable, i.status);
  const federal = Math.max(0, tax - pos(i.credits));
  // Social Security and Medicare are taken from wages, which a 401k does not reduce but health premiums and an HSA do.
  const ficaWages = Math.max(0, gross - other);
  const socialSecurity = 0.062 * Math.min(ficaWages, SOCIAL_SECURITY_WAGE_BASE);
  const medicare = 0.0145 * ficaWages + 0.009 * Math.max(0, ficaWages - MEDICARE_EXTRA_AFTER[i.status]);
  const state = (pos(i.stateRatePercent) / 100) * Math.max(0, gross - retirement - other);
  const totalTax = federal + socialSecurity + medicare + state;
  const takeHome = gross - retirement - other - totalTax;
  return {
    taxable,
    federal,
    marginalRate,
    socialSecurity,
    medicare,
    state,
    totalTax,
    takeHome,
    effectiveRate: gross > 0 ? totalTax / gross : 0,
  };
}

/* ------------------------------------------------------------------ */
/* Rates worked out from an income, with a sentence saying how         */
/* ------------------------------------------------------------------ */

export interface RateEstimate {
  /** The rate as a percent, to one decimal place. */
  percent: number;
  /** Fine print: how the number was worked out. */
  note: string;
}

export const FILING_OPTIONS: [FilingStatus, string][] = [
  ["single", "Single"],
  ["mfj", "Married filing jointly"],
  ["hoh", "Head of household"],
];
const FILING_PHRASE: Record<FilingStatus, string> = { single: "a single filer", mfj: "married filing jointly", hoh: "head of household" };

/** A saved or typed filing status, or single when it is not one of the three. */
export const asFilingStatus = (v: unknown): FilingStatus => (v === "mfj" || v === "hoh" ? v : "single");

const usd0 = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
const round1 = (x: number) => Math.round(x * 10) / 10;

/** The federal rate on the next dollar of income, from the brackets and the standard deduction. */
export function nextDollarRate(yearlyIncome: number, status: FilingStatus): number {
  const income = pos(yearlyIncome);
  if (income < STANDARD_DEDUCTION[status]) return 0;
  return federalTax(income - STANDARD_DEDUCTION[status] + 1, status).marginalRate;
}

/**
 * The tax rate on the next dollar earned (the "bracket"), for judging a gift's deduction or a traditional versus Roth account.
 * Federal income tax only: Social Security, Medicare and state tax do not change with a deduction or a retirement contribution
 * the same way, so they are left out.
 */
export function bracketEstimate(yearlyIncome: number, status: FilingStatus): RateEstimate {
  const income = pos(yearlyIncome);
  const std = STANDARD_DEDUCTION[status];
  const taxable = Math.max(0, income - std);
  const rate = nextDollarRate(income, status);
  return {
    percent: round1(rate * 100),
    note:
      income <= 0
        ? `Add a yearly income above and the rate is worked out for you. It uses the ${TAX_YEAR} federal brackets and standard deduction.`
        : `Estimated from ${usd0(income)} a year: ${usd0(income)} less the ${usd0(std)} standard deduction (${TAX_YEAR}, ${FILING_PHRASE[status]}) leaves ${usd0(taxable)} taxable, so the next dollar falls in the ${Math.round(rate * 100)}% federal bracket. State tax is not included; choose My own to change it.`,
  };
}

/**
 * The tax on extra yearly pay stacked on top of other income: the extra federal income tax from the brackets plus Social
 * Security and Medicare, as a share of the extra pay.
 */
export function extraPayEstimate(otherYearly: number, extraYearly: number, status: FilingStatus): RateEstimate {
  const other = pos(otherYearly);
  const extra = pos(extraYearly);
  const std = STANDARD_DEDUCTION[status];
  if (extra <= 0) return { percent: 0, note: "Add some extra income above and the tax on it is worked out for you." };
  const withExtra = estimateTax({ status, gross: other + extra, retirement: 0, otherPretax: 0, stateRatePercent: 0, credits: 0 });
  const without = estimateTax({ status, gross: other, retirement: 0, otherPretax: 0, stateRatePercent: 0, credits: 0 });
  const tax = withExtra.totalTax - without.totalTax;
  const federal = withExtra.federal - without.federal;
  const percent = round1((tax / extra) * 100);
  return {
    percent,
    note: `Estimated on ${usd0(extra)} a year added to ${other > 0 ? `${usd0(other)} of other pay` : "no other pay"}: federal income tax from the ${TAX_YEAR} brackets after the ${usd0(std)} standard deduction (${FILING_PHRASE[status]}) is ${usd0(federal)}, plus 7.65% Social Security and Medicare, for ${usd0(tax)} in all, or ${percent}%. State tax is not included; choose My own to change it.`,
  };
}

/**
 * The tax to set aside on a business's yearly profit: self-employment tax (15.3% on 92.35% of the profit) plus federal income
 * tax on the profit, after half the self-employment tax is deducted, stacked on any other income.
 */
export function selfEmploymentEstimate(otherYearly: number, profitYearly: number, status: FilingStatus): RateEstimate {
  const other = pos(otherYearly);
  const profit = pos(profitYearly);
  const std = STANDARD_DEDUCTION[status];
  if (profit <= 0) return { percent: 0, note: "There is no profit yet, so there is nothing to set aside. Add revenue above costs and the rate is worked out for you." };
  const earnings = profit * 0.9235;
  const socialSecurity = 0.124 * Math.min(earnings, Math.max(0, SOCIAL_SECURITY_WAGE_BASE - other));
  const selfEmployment = socialSecurity + 0.029 * earnings;
  const taxableWith = Math.max(0, other + profit - selfEmployment / 2 - std);
  const taxableWithout = Math.max(0, other - std);
  const federal = Math.max(0, federalTax(taxableWith, status).tax - federalTax(taxableWithout, status).tax);
  const total = selfEmployment + federal;
  const percent = round1((total / profit) * 100);
  return {
    percent,
    note: `Estimated on ${usd0(profit)} of yearly profit${other > 0 ? ` on top of ${usd0(other)} of other income` : ""}: self-employment tax is ${usd0(selfEmployment)} (15.3% of 92.35% of profit), and federal income tax from the ${TAX_YEAR} brackets after the ${usd0(std)} standard deduction (${FILING_PHRASE[status]}) adds ${usd0(federal)}, for ${usd0(total)} in all, or ${percent}% of profit. State tax is not included; choose My own to change it.`,
  };
}

/** Take-home pay from a yearly income: federal income tax, Social Security and Medicare, with a sentence saying how. */
export function takeHomeEstimate(yearlyIncome: number, status: FilingStatus): { monthly: number; percent: number; note: string } {
  const gross = pos(yearlyIncome);
  const r = estimateTax({ status, gross, retirement: 0, otherPretax: 0, stateRatePercent: 0, credits: 0 });
  const percent = round1(r.effectiveRate * 100);
  return {
    monthly: r.takeHome / 12,
    percent,
    note: `Estimated from ${usd0(gross)} a year: federal income tax of ${usd0(r.federal)} (${TAX_YEAR} brackets after the ${usd0(STANDARD_DEDUCTION[status])} standard deduction, ${FILING_PHRASE[status]}) plus ${usd0(r.socialSecurity + r.medicare)} for Social Security and Medicare is ${usd0(r.totalTax)}, or ${percent}% of pay. State tax, a 401(k), and health premiums are not included.`,
  };
}
