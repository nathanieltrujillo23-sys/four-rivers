import { newItem, normalizeBudget, type Budget } from "../../../utils/budget";
import type { Debt } from "../../../lib/scenarioMath";

/** The toolkit's tools, the names printed on the meeting PDF, and the starting numbers of each. */
export const TOOL_IDS = ["budget", "accounts", "yourself", "income", "marriage", "car", "house", "vacation", "debt"] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export const TOOL_TITLES: Record<ToolId, string> = {
  budget: "Budgeting",
  accounts: "Investing in the markets",
  yourself: "Investing in yourself",
  income: "Income",
  marriage: "Getting married",
  car: "Buying a car",
  house: "Buying a house",
  vacation: "Taking a vacation",
  debt: "Paying off debt",
};

export const isToolId = (v: string): v is ToolId => (TOOL_IDS as readonly string[]).includes(v);

export const offerDefaultA = { salary: 60000, bonus: 0, matchPercent: 4, healthMonthly: 150, commuteMonthly: 80, otherMonthly: 0 };
export const offerDefaultB = { salary: 66000, bonus: 2000, matchPercent: 0, healthMonthly: 300, commuteMonthly: 250, otherMonthly: 0 };

export const DEFAULTS = {
  accounts: { cost: 300, years: 30, ret: 7, now: 22, later: 22, gains: 15, match: 0 },
  yourself: { cost: 5000, raise: 4000, years: 10 },
  income: {
    gross: 500,
    tax: 22,
    share: { Give: 10, Save: 20, Invest: 20, Spend: 50 } as Record<string, number>,
    a: offerDefaultA,
    b: offerDefaultB,
  },
  marriage: { incA: 2800, incB: 2600, costA: 2100, costB: 2000, together: 3400, debts: 400, wedding: 15000, saved: 3000, months: 12, apr: 4 },
  car: { price: 22000, down: 3000, tradeIn: 0, salesTaxPercent: 6, aprPercent: 7, months: 60, insuranceMonthly: 130, fuelMonthly: 120, upkeepMonthly: 60, takeHomeMonthly: 3200 },
  house: { price: 300000, downPercent: 10, aprPercent: 6.5, years: 30, propertyTaxPercent: 1.1, insuranceYearly: 1800, hoaMonthly: 0, pmiPercent: 0.6, closingPercent: 3, income: 5500 },
  vacation: { cost: 2400, saved: 300, months: 8, apr: 4, monthly: 250 },
  debt: {
    debts: [
      { name: "Credit card", balance: 4800, aprPercent: 22, minimum: 120 },
      { name: "Personal loan", balance: 1800, aprPercent: 9, minimum: 70 },
      { name: "Student loan", balance: 12000, aprPercent: 5, minimum: 140 },
    ] as Debt[],
    extra: 150,
  },
};

/** A starting budget with a few common lines to talk through. */
export function defaultBudget(): Budget {
  const b = normalizeBudget(null);
  b.income = [newItem("Take-home pay", 2800)];
  b.needs = [newItem("Rent", 1100), newItem("Food", 350), newItem("Transportation", 250), newItem("Insurance and bills", 250)];
  b.discretionary = [newItem("Fun and eating out", 200)];
  b.saving = [newItem("Emergency fund", 200)];
  b.investing = [newItem("Retirement", 150)];
  b.giving = [newItem("Church and giving", 280)];
  return b;
}

/** What a tool starts with, overlaid with whatever was saved (a saved value that is missing or odd is ignored). */
export function coerce<T extends object>(defaults: T, saved: unknown): T {
  const base = structuredClone(defaults);
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return base;
  return { ...base, ...(saved as Partial<T>) };
}
