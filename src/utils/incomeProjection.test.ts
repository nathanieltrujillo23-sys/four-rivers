import { describe, expect, it } from "vitest";
import { compareDiscretionary, projectYears, type ProjectionInput } from "./incomeProjection";

const base: ProjectionInput = {
  years: 5,
  mainMonthly: 3000,
  addedMonthly: 400,
  includeAdded: true,
  expensesMonthly: 2600,
  incomeGrowthPercent: 0,
  expenseGrowthPercent: 0,
  use: "save",
  debts: [],
  savingsRatePercent: 0,
  investReturnPercent: 0,
};

describe("compareDiscretionary", () => {
  it("shows added income landing entirely in discretionary when expenses are flat", () => {
    const c = compareDiscretionary(3000, 400, 2600);
    expect(c.before).toBe(400);
    expect(c.after).toBe(800);
    expect(c.change).toBe(400);
    expect(c.changePercent).toBeCloseTo(100);
  });
  it("has no percent when there was nothing left over before", () => {
    expect(compareDiscretionary(2600, 400, 2600).changePercent).toBeNull();
  });
});

describe("projectYears", () => {
  it("returns one row per year with flat income and expenses", () => {
    const rows = projectYears(base);
    expect(rows).toHaveLength(5);
    expect(rows[0].income).toBeCloseTo(3400 * 12);
    expect(rows[0].expenses).toBeCloseTo(2600 * 12);
    expect(rows[0].discretionary).toBeCloseTo(800 * 12);
  });

  it("grows income by the yearly rate while expenses stay put", () => {
    const rows = projectYears({ ...base, incomeGrowthPercent: 10 });
    expect(rows[1].income).toBeCloseTo(rows[0].income * 1.1);
    expect(rows[1].expenses).toBeCloseTo(rows[0].expenses);
    expect(rows[1].discretionary).toBeGreaterThan(rows[0].discretionary);
  });

  it("saves the discretionary money with no growth when the rate is zero", () => {
    const rows = projectYears(base);
    expect(rows[4].saved).toBeCloseTo(800 * 12 * 5);
    expect(rows[4].invested).toBe(0);
  });

  it("invests it when asked, and grows it with a positive return", () => {
    const flat = projectYears({ ...base, use: "invest" });
    const grown = projectYears({ ...base, use: "invest", investReturnPercent: 6 });
    expect(flat[4].invested).toBeCloseTo(800 * 12 * 5);
    expect(grown[4].invested).toBeGreaterThan(flat[4].invested);
  });

  it("counts only the main income when the added streams are excluded", () => {
    const withAdded = projectYears(base);
    const mainOnly = projectYears({ ...base, includeAdded: false });
    expect(mainOnly[0].discretionary).toBeCloseTo(400 * 12);
    expect(withAdded[0].discretionary - mainOnly[0].discretionary).toBeCloseTo(400 * 12);
  });

  it("pays debt down, then sends the leftover to savings", () => {
    const rows = projectYears({
      ...base,
      years: 4,
      use: "debt",
      debts: [{ name: "Card", balance: 2000, apr: 0, minPayment: 50 }],
    });
    expect(rows[0].debtRemaining).toBe(0);
    expect(rows[0].debtPaidDown).toBeCloseTo(2000);
    expect(rows[3].saved).toBeGreaterThan(0);
  });
});
