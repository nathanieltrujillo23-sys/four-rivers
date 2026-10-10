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
