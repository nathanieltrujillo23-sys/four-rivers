import { describe, expect, it } from "vitest";
import { asFilingStatus, bracketEstimate, estimateTax, extraPayEstimate, federalTax, nextDollarRate, selfEmploymentEstimate, takeHomeEstimate, TAX_YEAR } from "./taxMath";

const base = { status: "single" as const, gross: 50000, retirement: 0, otherPretax: 0, stateRatePercent: 0, credits: 0 };

describe("income tax estimate", () => {
  it("taxes each slice at its own rate (single, $50,000 of wages)", () => {
    const r = estimateTax(base);
    expect(TAX_YEAR).toBe(2026);
    expect(r.taxable).toBe(33900); // 50,000 less the 16,100 standard deduction
    expect(r.federal).toBeCloseTo(12400 * 0.1 + (33900 - 12400) * 0.12, 6); // 3,820
    expect(r.marginalRate).toBe(0.12);
    expect(r.socialSecurity).toBeCloseTo(3100, 6);
    expect(r.medicare).toBeCloseTo(725, 6);
    expect(r.takeHome).toBeCloseTo(50000 - 3820 - 3100 - 725, 6);
  });

  it("owes no income tax under the standard deduction, but still pays Social Security and Medicare", () => {
    const r = estimateTax({ ...base, gross: 15000 });
    expect(r.federal).toBe(0);
    expect(r.socialSecurity).toBeCloseTo(930, 6);
  });

  it("uses the joint and head-of-household brackets", () => {
    expect(estimateTax({ ...base, status: "mfj", gross: 100000 }).federal).toBeCloseTo(24800 * 0.1 + (67800 - 24800) * 0.12, 6);
    expect(estimateTax({ ...base, status: "hoh", gross: 24150 }).taxable).toBe(0);
  });

  it("lowers income tax, but not Social Security, with a 401k; health premiums lower both", () => {
    const plain = estimateTax(base);
    const k401 = estimateTax({ ...base, retirement: 5000 });
    expect(k401.federal).toBeLessThan(plain.federal);
    expect(k401.socialSecurity).toBe(plain.socialSecurity);
    const premiums = estimateTax({ ...base, otherPretax: 3000 });
    expect(premiums.socialSecurity).toBeLessThan(plain.socialSecurity);
  });

  it("stops Social Security at the wage base, adds the extra Medicare tax, and applies credits and a state rate", () => {
    const high = estimateTax({ ...base, gross: 300000 });
    expect(high.socialSecurity).toBeCloseTo(0.062 * 184500, 6);
    expect(high.medicare).toBeCloseTo(0.0145 * 300000 + 0.009 * 100000, 6);
    expect(estimateTax({ ...base, credits: 99999 }).federal).toBe(0);
    expect(estimateTax({ ...base, stateRatePercent: 4 }).state).toBeCloseTo(2000, 6);
    expect(federalTax(0, "single")).toEqual({ tax: 0, marginalRate: 0 });
  });

  it("never gives odd numbers for odd input", () => {
    const r = estimateTax({ status: "single", gross: -5, retirement: 99, otherPretax: NaN, stateRatePercent: -3, credits: -1 });
    for (const v of Object.values(r)) expect(Number.isFinite(v)).toBe(true);
    expect(r.takeHome).toBe(0);
  });
});

describe("tax rates worked out from an income", () => {
  it("finds the bracket of the next dollar after the standard deduction", () => {
    expect(nextDollarRate(10000, "single")).toBe(0);
    expect(nextDollarRate(20000, "single")).toBe(0.1);
    expect(nextDollarRate(60000, "single")).toBe(0.12);
    expect(nextDollarRate(100000, "single")).toBe(0.22);
    expect(nextDollarRate(100000, "mfj")).toBe(0.12);
    expect(bracketEstimate(60000, "single").percent).toBe(12);
    expect(bracketEstimate(60000, "single").note).toMatch(/\$16,100 standard deduction/);
    expect(bracketEstimate(60000, "mfj").note).toMatch(/\$32,200 standard deduction .*married filing jointly/);
  });

  it("taxes extra pay on top of other income, including Social Security and Medicare", () => {
    // $12,000 alone is under the standard deduction, so only the 7.65% payroll tax applies.
    expect(extraPayEstimate(0, 12000, "single").percent).toBe(7.7);
    // $40,000 alone: $2,620 federal + $3,060 payroll = $5,680 = 14.2%.
    expect(extraPayEstimate(0, 40000, "single").percent).toBe(14.2);
    // On top of $60,000 the extra pay is taxed at the 12% bracket plus 7.65%, so a higher rate than on its own.
    expect(extraPayEstimate(60000, 12000, "single").percent).toBeGreaterThan(extraPayEstimate(0, 12000, "single").percent);
    expect(extraPayEstimate(0, 0, "single").percent).toBe(0);
    expect(extraPayEstimate(0, 40000, "single").note).toMatch(/7\.65% Social Security and Medicare/);
  });

  it("adds self-employment tax to income tax on a side business", () => {
    // $10,800 of profit: self-employment tax of $1,526 and no income tax (under the standard deduction) is 14.1%.
    const r = selfEmploymentEstimate(0, 10800, "single");
    expect(r.percent).toBe(14.1);
    expect(r.note).toMatch(/15\.3% of 92\.35% of profit/);
    // With a job on top the profit is also taxed at income-tax rates.
    expect(selfEmploymentEstimate(60000, 10800, "single").percent).toBeGreaterThan(r.percent);
    expect(selfEmploymentEstimate(0, 0, "single").percent).toBe(0);
  });

  it("estimates monthly take-home from a yearly income", () => {
    const t = takeHomeEstimate(50000, "single");
    expect(t.monthly).toBeCloseTo((50000 - 3820 - 3100 - 725) / 12, 6);
    expect(t.percent).toBe(15.3);
    expect(t.note).toMatch(/State tax, a 401\(k\), and health premiums are not included/);
  });

  it("reads a filing status safely", () => {
    expect(asFilingStatus("mfj")).toBe("mfj");
    expect(asFilingStatus("hoh")).toBe("hoh");
    expect(asFilingStatus("nonsense")).toBe("single");
    expect(asFilingStatus(undefined)).toBe("single");
  });
});
