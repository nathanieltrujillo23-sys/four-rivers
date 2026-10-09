import type { Debt } from "../../../lib/scenarioMath";

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

/** What a tool starts with, overlaid with whatever was saved (a saved value that is missing or odd is ignored). */
export function coerce<T extends object>(defaults: T, saved: unknown): T {
  const base = structuredClone(defaults);
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return base;
  return { ...base, ...(saved as Partial<T>) };
}

/** The notes under the eight tools that have their own screens: shown on screen and printed on the PDF, and editable in Admin. */
export const CUSTOM_NOTES = {
  accounts: [
    "Every account is compared at the same cost to your paycheck. Pre-tax accounts let the same take-home cost put in more. The yearly limits, income rules, and withdrawal rules change; check irs.gov or a tax professional. The markets do not return a steady rate, so treat the result as a comparison, not a forecast.",
  ],
  yourself: [
    "Count time as a cost too: hours spent learning are hours not earning. A skill that opens a door, builds a business, or lets you serve better can be worth more than the raise alone. These are estimates; nothing guarantees an outcome.",
  ],
  income: [
    "Deciding the split before the money arrives is what keeps it from disappearing.",
    "Value is salary plus bonus plus the retirement match, minus the health, commute, and other costs. It leaves out taxes, growth, and the things money cannot count: the people, the purpose, and the room to serve.",
  ],
  marriage: [
    "Talk through the hard parts together before the wedding: debts, giving, who handles the bills, and what you each want money to do. A wedding costs a day; a marriage costs a lifetime, so many couples set the wedding budget last.",
  ],
  car: [
    "A car loses value quickly, so a long loan can leave you owing more than the car is worth. Compare the same car with a bigger down payment, a shorter loan, or an older model, and shop for the loan before the car.",
  ],
  house: [
    "Also plan for repairs (many owners set aside 1% of the price a year), moving costs, and keeping an emergency fund after the down payment. Rates, taxes, and insurance vary by place, so replace these with real quotes.",
  ],
  vacation: [
    "Saving for a trip ahead of time means no card balance afterward. The same math works for a gift, a move, or an emergency fund. Put the goal in its own account so it is not spent on something else.",
  ],
  debt: ["Either beats paying only the minimums. Each paid-off debt's payment rolls into the next one."],
} as const;
