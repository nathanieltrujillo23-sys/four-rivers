import { describe, expect, it } from "vitest";
import { estimateTax, federalTax, TAX_YEAR } from "./taxMath";

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
