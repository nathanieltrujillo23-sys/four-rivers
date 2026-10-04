import { describe, expect, it } from "vitest";
import {
  categoryTotal,
  emptyBudget,
  filledItems,
  isBudgetComplete,
  newItem,
  normalizeBudget,
  summarize,
} from "./budget";

function filled() {
  const b = emptyBudget();
  b.income = [newItem("Paycheck", 3000), newItem("Tutoring", 400)];
  b.needs = [newItem("Rent", 1200), newItem("Groceries", 400)];
  b.discretionary = [newItem("Fun", 300)];
  b.saving = [newItem("Emergency fund", 300)];
  b.investing = [newItem("Roth IRA", 200)];
  b.giving = [newItem("Church", 300)];
  return b;
}

describe("budget", () => {
  it("derives totals from the lines", () => {
    const s = summarize(filled());
    expect(s.income).toBe(3400);
    expect(s.needs).toBe(1600);
    expect(s.assigned).toBe(2700);
    expect(s.leftover).toBe(700);
  });

  it("reports a negative leftover when spending passes income", () => {
    const b = filled();
    b.discretionary = [newItem("Trip", 2500)];
    expect(summarize(b).leftover).toBeLessThan(0);
  });

  it("ignores empty amounts when totaling", () => {
    expect(categoryTotal([newItem("x", null), newItem("y", 5)])).toBe(5);
  });

  it("is complete only when income and every category are answered", () => {
    expect(isBudgetComplete(emptyBudget())).toBe(false);
    expect(isBudgetComplete(filled())).toBe(true);
    const zeroGiving = filled();
    zeroGiving.giving = [newItem("Nothing this month", 0)];
    expect(isBudgetComplete(zeroGiving)).toBe(true);
    const noIncome = filled();
    noIncome.income = [newItem("Paycheck", 0)];
    expect(isBudgetComplete(noIncome)).toBe(false);
  });

  it("drops blank rows when listing filled items", () => {
    expect(filledItems([newItem(), newItem("Rent", 900)])).toHaveLength(1);
  });

  it("repairs bad stored data instead of throwing", () => {
    expect(normalizeBudget(null).income).toHaveLength(1);
    const b = normalizeBudget({ income: [{ label: 5, amount: -3 }, "junk"], needs: "nope" });
    expect(b.income).toHaveLength(1);
    expect(b.income[0].amount).toBeNull();
    expect(b.needs).toHaveLength(1);
  });
});
