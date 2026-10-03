import { describe, expect, it } from "vitest";
import { createDebtSim, simulateDebts, stepDebtMonth, totalBalance, type Debt } from "./debtSnowball";

const card: Debt = { name: "Card", balance: 1000, apr: 0, minPayment: 100 };

describe("simulateDebts", () => {
  it("pays off a zero-interest debt in balance / payment months", () => {
    const r = simulateDebts([card], { extra: 0, snowball: false });
    expect(r.months).toBe(10);
    expect(r.totalInterest).toBeCloseTo(0);
    expect(r.balances[0]).toBe(1000);
    expect(r.balances[r.balances.length - 1]).toBe(0);
  });

  it("charges monthly interest", () => {
    const sim = createDebtSim([{ name: "A", balance: 1200, apr: 12, minPayment: 0 }]);
    stepDebtMonth(sim, 0);
    expect(totalBalance(sim)).toBeCloseTo(1212); // 1% a month
  });

  it("finishes sooner and pays less interest with a snowball than with minimums only", () => {
    const debts: Debt[] = [
      { name: "Store card", balance: 600, apr: 24, minPayment: 25 },
      { name: "Credit card", balance: 2400, apr: 21, minPayment: 70 },
      { name: "Loan", balance: 6000, apr: 5.5, minPayment: 90 },
    ];
    const base = simulateDebts(debts, { extra: 0, snowball: false });
    const snow = simulateDebts(debts, { extra: 200, snowball: true });
    expect(base.months).not.toBeNull();
    expect(snow.months).not.toBeNull();
    expect(snow.months!).toBeLessThan(base.months!);
    expect(snow.totalInterest).toBeLessThan(base.totalInterest);
  });

  it("clears the smallest balance first and rolls its payment onward", () => {
    const debts: Debt[] = [
      { name: "Big", balance: 3000, apr: 0, minPayment: 50 },
      { name: "Small", balance: 300, apr: 0, minPayment: 50 },
    ];
    const r = simulateDebts(debts, { extra: 100, snowball: true });
    expect(r.order[0].name).toBe("Small");
    expect(r.order[1].name).toBe("Big");
    // 200/month total: Small clears in 2 months, then all 200 goes to Big.
    expect(r.order[0].month).toBe(2);
    expect(r.months).toBe(Math.ceil((3000 + 300) / 200));
  });

  it("reports null when the payments never beat the interest", () => {
    const r = simulateDebts([{ name: "A", balance: 10000, apr: 30, minPayment: 50 }], { extra: 0, snowball: false });
    expect(r.months).toBeNull();
  });

  it("handles no debts at all", () => {
    const r = simulateDebts([], { extra: 100, snowball: true });
    expect(r.months).toBe(0);
    expect(r.totalInterest).toBe(0);
  });
});
