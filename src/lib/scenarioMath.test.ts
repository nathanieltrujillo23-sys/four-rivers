import { describe, expect, it } from "vitest";
import {
  carPlan,
  compareAccounts,
  futureValue,
  housePlan,
  investInYourself,
  loanSummary,
  monthlyPayment,
  monthlyToReachGoal,
  monthsToReachGoal,
  offerValue,
  payoffPlan,
  splitMoney,
} from "./scenarioMath";

describe("loans", () => {
  it("matches a known payment, and handles a zero rate", () => {
    expect(monthlyPayment(200000, 6, 360)).toBeCloseTo(1199.1, 1);
    expect(monthlyPayment(1200, 0, 12)).toBe(100);
    expect(monthlyPayment(0, 5, 12)).toBe(0);
    expect(monthlyPayment(1000, 5, 0)).toBe(0);
  });
  it("adds up interest", () => {
    const s = loanSummary(10000, 5, 60);
    expect(s.payment).toBeCloseTo(188.71, 1);
    expect(s.totalInterest).toBeCloseTo(s.totalPaid - 10000, 6);
  });
});

describe("saving", () => {
  it("grows a monthly contribution", () => {
    expect(futureValue(0, 100, 0, 1)).toBe(1200);
    expect(futureValue(1000, 0, 12, 1)).toBeCloseTo(1126.83, 1);
  });
  it("finds the monthly amount for a goal, with and without interest", () => {
    expect(monthlyToReachGoal(1200, 0, 12, 0)).toBe(100);
    expect(monthlyToReachGoal(1000, 1000, 12, 0)).toBe(0);
    const m = monthlyToReachGoal(10000, 0, 24, 5);
    expect(futureValue(0, m, 5, 2)).toBeCloseTo(10000, 0);
  });
  it("counts the months to a goal, or says never", () => {
    expect(monthsToReachGoal(1000, 0, 100, 0)).toBe(10);
    expect(monthsToReachGoal(1000, 1000, 0, 0)).toBe(0);
    expect(monthsToReachGoal(1000, 0, 0, 0)).toBeNull();
  });
});

describe("debt payoff", () => {
  const debts = [
    { name: "Card", balance: 3000, aprPercent: 24, minimum: 90 },
    { name: "Loan", balance: 1500, aprPercent: 6, minimum: 50 },
  ];
  it("pays off, and the avalanche never costs more interest than the snowball", () => {
    const a = payoffPlan(debts, 100, "avalanche");
    const s = payoffPlan(debts, 100, "snowball");
    expect(a.months).not.toBeNull();
    expect(a.totalInterest).toBeLessThanOrEqual(s.totalInterest + 0.01);
    expect(a.order).toEqual(["Card", "Loan"]);
    expect(s.order).toEqual(["Loan", "Card"]);
  });
  it("is faster with more extra money", () => {
    expect(payoffPlan(debts, 300, "avalanche").months!).toBeLessThan(payoffPlan(debts, 0, "avalanche").months!);
  });
  it("says so when the minimum cannot catch up with the interest", () => {
    expect(payoffPlan([{ name: "Bad", balance: 10000, aprPercent: 30, minimum: 100 }], 0, "avalanche").months).toBeNull();
  });
  it("is done at once with no debts", () => {
    expect(payoffPlan([], 100, "snowball").months).toBe(0);
  });
});

describe("house and car", () => {
  it("adds every monthly cost of a house", () => {
    const h = housePlan({ price: 300000, downPercent: 10, aprPercent: 6, years: 30, propertyTaxPercent: 1, insuranceYearly: 1800, hoaMonthly: 50, pmiPercent: 0.6, closingPercent: 3 });
    expect(h.down).toBe(30000);
    expect(h.loan).toBe(270000);
    expect(h.pmi).toBeCloseTo(135, 6);
    expect(h.monthlyTotal).toBeCloseTo(h.principalAndInterest + 250 + 150 + 50 + 135, 6);
    expect(h.cashToClose).toBe(39000);
    expect(h.grossMonthlyNeeded).toBeCloseTo(h.monthlyTotal / 0.28, 6);
  });
  it("charges no mortgage insurance with 20% down", () => {
    expect(housePlan({ price: 100000, downPercent: 20, aprPercent: 6, years: 30, propertyTaxPercent: 1, insuranceYearly: 0, hoaMonthly: 0, pmiPercent: 0.6, closingPercent: 3 }).pmi).toBe(0);
  });
  it("adds the running costs of a car and compares them to take-home pay", () => {
    const c = carPlan({ price: 20000, down: 2000, tradeIn: 0, salesTaxPercent: 6, aprPercent: 6, months: 60, insuranceMonthly: 120, fuelMonthly: 100, upkeepMonthly: 50, takeHomeMonthly: 3000 });
    expect(c.financed).toBeCloseTo(19200, 6);
    expect(c.running).toBe(270);
    expect(c.shareOfTakeHome).toBeCloseTo(c.monthlyTotal / 3000, 6);
    expect(carPlan({ price: 1000, down: 0, tradeIn: 0, salesTaxPercent: 0, aprPercent: 0, months: 10, insuranceMonthly: 0, fuelMonthly: 0, upkeepMonthly: 0, takeHomeMonthly: 0 }).shareOfTakeHome).toBeNull();
  });
});

describe("accounts, yourself, income", () => {
  const base = { monthlyTakeHomeCost: 300, years: 30, returnPercent: 7, taxNowPercent: 22, taxLaterPercent: 22, capGainsPercent: 15, employerMatchMonthly: 0 };
  it("is a wash between traditional and Roth when the tax rate stays the same", () => {
    const r = compareAccounts(base);
    expect(r.traditional.afterTax).toBeCloseTo(r.roth.afterTax, 0);
  });
  it("favors the Roth when taxes will be higher later, and the traditional when lower", () => {
    expect(compareAccounts({ ...base, taxLaterPercent: 32 }).roth.afterTax).toBeGreaterThan(compareAccounts({ ...base, taxLaterPercent: 32 }).traditional.afterTax);
    expect(compareAccounts({ ...base, taxLaterPercent: 12 }).traditional.afterTax).toBeGreaterThan(compareAccounts({ ...base, taxLaterPercent: 12 }).roth.afterTax);
  });
  it("lets a match tip the traditional account ahead, and taxes gains in a brokerage", () => {
    const r = compareAccounts({ ...base, employerMatchMonthly: 100 });
    expect(r.traditional.afterTax).toBeGreaterThan(r.roth.afterTax);
    expect(r.taxable.afterTax).toBeLessThan(r.taxable.endingBalance);
  });
  it("pays back an investment in yourself", () => {
    expect(investInYourself(6000, 3000, 10)).toEqual({ paybackMonths: 24, netGain: 24000 });
    expect(investInYourself(6000, 0, 10).paybackMonths).toBeNull();
  });
  it("splits money and values an offer", () => {
    expect(splitMoney(1000, { give: 10, save: 20, invest: 20, spend: 50 })).toEqual({ give: 100, save: 200, invest: 200, spend: 500 });
    expect(splitMoney(1000, { a: 0, b: 0 })).toEqual({ a: 0, b: 0 });
    expect(offerValue({ salary: 60000, bonus: 2000, matchPercent: 4, healthMonthly: 200, commuteMonthly: 100, otherMonthly: 0 })).toBe(60000 + 2000 + 2400 - 3600);
  });
});
