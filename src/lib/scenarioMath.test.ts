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
  payoffWithExtra,
  wishSchedule,
  retirementPlan,
  costOfWaiting,
  minimumOnlyPayoff,
  loanBalances,
  minimumOnlyBalances,
  savingsByMonth,
  growthByYear,
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

describe("one loan, a wish list, retirement, and waiting", () => {
  it("pays a loan off sooner, with less interest, when more is paid", () => {
    const base = monthlyPayment(20000, 6, 120);
    const slow = payoffWithExtra(20000, 6, base, 0);
    const fast = payoffWithExtra(20000, 6, base, 200);
    expect(slow.months).toBe(120);
    expect(fast.months!).toBeLessThan(slow.months!);
    expect(fast.totalInterest).toBeLessThan(slow.totalInterest);
    expect(slow.totalInterest).toBeCloseTo(base * 120 - 20000, 0);
  });
  it("says so when the payment cannot cover the interest", () => {
    expect(payoffWithExtra(10000, 24, 100, 0).months).toBeNull();
    expect(payoffWithExtra(0, 5, 100, 0).months).toBe(0);
  });
  it("funds wishes in order", () => {
    expect(wishSchedule([1000, 500, 500], 200, 200)).toEqual([4, 7, 9]);
    expect(wishSchedule([100], 500, 0)).toEqual([0]);
    expect(wishSchedule([100], 0, 0)).toEqual([null]);
  });
  it("sets a retirement target in today's dollars and finds the gap", () => {
    const r = retirementPlan({ spendYearly: 48000, otherIncomeYearly: 18000, withdrawalPercent: 4, saved: 0, monthly: 0, years: 30, returnPercent: 7, inflationPercent: 3 });
    expect(r.target).toBe(750000);
    expect(r.projected).toBe(0);
    expect(r.neededMonthly).toBeGreaterThan(0);
    const on = retirementPlan({ spendYearly: 48000, otherIncomeYearly: 18000, withdrawalPercent: 4, saved: 0, monthly: r.neededMonthly, years: 30, returnPercent: 7, inflationPercent: 3 });
    expect(Math.abs(on.gap)).toBeLessThan(5);
    expect(retirementPlan({ spendYearly: 10000, otherIncomeYearly: 20000, withdrawalPercent: 4, saved: 0, monthly: 0, years: 5, returnPercent: 5, inflationPercent: 2 }).target).toBe(0);
  });
  it("prices waiting to start", () => {
    const w = costOfWaiting(0, 300, 7, 30, 10);
    expect(w.startNow).toBeGreaterThan(w.startLater);
    expect(w.cost).toBeCloseTo(w.startNow - w.startLater, 6);
    expect(costOfWaiting(0, 300, 7, 30, 0).cost).toBe(0);
  });
});

describe("the credit card minimum trap", () => {
  it("takes far longer and costs far more than a steady payment", () => {
    const min = minimumOnlyPayoff(3500, 22, 3, 25);
    const steady = payoffWithExtra(3500, 22, 150, 0);
    expect(min.months).not.toBeNull();
    expect(min.months!).toBeGreaterThan(steady.months! * 2);
    expect(min.totalInterest).toBeGreaterThan(steady.totalInterest);
  });
  it("pays off with no interest when there is none, and never when the floor cannot keep up", () => {
    expect(minimumOnlyPayoff(1000, 0, 10, 25).totalInterest).toBe(0);
    expect(minimumOnlyPayoff(1000, 0, 10, 25).months).toBeGreaterThan(10);
    expect(minimumOnlyPayoff(0, 22, 3, 25).months).toBe(0);
    expect(minimumOnlyPayoff(100000, 30, 0, 25).months).toBeNull();
  });
});

describe("series for the charts", () => {
  it("drains a loan to zero, faster with an extra payment", () => {
    const pay = monthlyPayment(10000, 6, 60);
    const slow = loanBalances(10000, 6, pay, 0);
    const fast = loanBalances(10000, 6, pay, 200);
    expect(slow[0]).toBe(10000);
    expect(slow.at(-1)!).toBeLessThan(1);
    expect(slow.length).toBeGreaterThanOrEqual(60);
    expect(fast.length).toBeLessThan(slow.length);
    expect(loanBalances(10000, 30, 10, 0).length).toBe(1); // never gets paid off
  });
  it("lists a balance for every year, starting with the start", () => {
    const g = growthByYear(1000, 100, 5, 10);
    expect(g).toHaveLength(11);
    expect(g[0]).toBe(1000);
    expect(g[10]).toBeCloseTo(futureValue(1000, 100, 5, 10), 6);
  });
});

describe("more chart series", () => {
  it("shrinks a card balance when only the minimum is paid, and stops at 40 years", () => {
    const b = minimumOnlyBalances(3500, 22, 3, 25);
    expect(b[0]).toBe(3500);
    expect(b.at(-1)!).toBeLessThan(1);
    expect(minimumOnlyBalances(100000, 30, 0, 25).length).toBeLessThanOrEqual(481);
  });
  it("saves up to a goal and stops there", () => {
    const s = savingsByMonth(100, 200, 0, 1000);
    expect(s[0]).toBe(100);
    expect(s.at(-1)).toBe(1000);
    expect(s).toHaveLength(6);
  });
});
