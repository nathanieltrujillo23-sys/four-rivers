import { describe, expect, it } from "vitest";
import { assetLocation, capitalGains, emptyPlanning, givingOptions, insuranceNeeds, longTermGainsTax, normalizePlanning, planningTouched, rothConversion, LTCG_THRESHOLDS } from "./wealthPlanning";
import { MODEL_PORTFOLIOS } from "./wealthPortfolio";

const snap = { debts: 20000, mortgage: 250000, liquid: 50000, netWorth: 300000 };

describe("insurance needs", () => {
  it("adds up life insurance by the DIME method and subtracts what is already there", () => {
    const d = { ...emptyPlanning().insurance, income: "100000", years: "10", replacePct: "70", education: "100000", finalExpenses: "15000", existingLife: "300000" };
    const r = insuranceNeeds(d, snap).life;
    expect(r.rows[0].amount).toBe(700000);
    expect(r.need).toBe(700000 + 20000 + 250000 + 100000 + 15000);
    expect(r.offset).toBe(50000);
    expect(r.gap).toBe(r.need - 50000 - 300000);
  });

  it("can ignore the snapshot, the mortgage, and liquid savings", () => {
    const d = { ...emptyPlanning().insurance, income: "80000", useSnapshot: false, debts: "5000", mortgage: "100000", payMortgage: false, offsetLiquid: false, liquid: "9999", finalExpenses: "0" };
    const r = insuranceNeeds(d, snap).life;
    expect(r.rows[1].amount).toBe(5000);
    expect(r.rows[2].amount).toBe(0);
    expect(r.offset).toBe(0);
  });

  it("never reports a negative gap, and sizes disability and umbrella cover", () => {
    const d = { ...emptyPlanning().insurance, income: "60000", existingLife: "5000000", groupLtd: "2000", ownLtd: "500", factors: ["home", "teen"] };
    const r = insuranceNeeds(d, snap);
    expect(r.life.gap).toBe(0);
    expect(r.disability.target).toBe(3000);
    expect(r.disability.gap).toBe(500);
    expect(r.umbrella.base).toBe(1_000_000);
    expect(r.umbrella.recommended).toBe(2_000_000);
    expect(insuranceNeeds({ ...d, factors: ["a", "b", "c"] }, snap).umbrella.recommended).toBe(3_000_000);
  });
});

describe("Roth conversion", () => {
  const base = { ...emptyPlanning().roth, taxable: "40000", balance: "100000", amount: "20000", years: "25", ret: "6", retRate: "24", state: "0", drag: "20" };
  it("finds the room left in the next brackets", () => {
    const r = rothConversion(base);
    // 2026 single: 12% bracket tops out at $50,400 taxable.
    expect(r.rooms[0]).toMatchObject({ rate: 0.12, top: 50400, room: 10400 });
  });

  it("charges the conversion at the brackets it fills", () => {
    const r = rothConversion(base);
    // 10,400 at 12% and 9,600 at 22%.
    expect(r.federal).toBeCloseTo(10400 * 0.12 + 9600 * 0.22, 0);
    expect(r.effective).toBeCloseTo(r.tax / 20000, 6);
    expect(r.marginalAfter).toBe(0.22);
  });

  it("comes out ahead only when later tax is higher than the tax now", () => {
    expect(rothConversion({ ...base, retRate: "30" }).advantage).toBeGreaterThan(0);
    expect(rothConversion({ ...base, retRate: "12" }).advantage).toBeLessThan(0);
    expect(rothConversion({ ...base, amount: "0" }).verdict).toMatch(/Enter an amount/);
  });

  it("cannot convert more than the balance", () => {
    expect(rothConversion({ ...base, amount: "500000" }).amount).toBe(100000);
  });
});

describe("capital gains", () => {
  const lot = (id: string, basis: number, value: number, longTerm = true, sell = true) => ({ id, name: id, basis: String(basis), value: String(value), longTerm, sell });

  it("stacks long-term gains on top of ordinary income across the 0%, 15% and 20% rates", () => {
    const z = LTCG_THRESHOLDS.single.zero;
    const t = longTermGainsTax(z - 10000, 30000, "single");
    expect(t.at0).toBe(10000);
    expect(t.at15).toBe(20000);
    expect(t.tax).toBeCloseTo(3000, 6);
    expect(longTermGainsTax(600000, 10000, "single").tax).toBeCloseTo(2000, 6);
  });

  it("taxes short-term gains as ordinary income and leaves out lots not sold", () => {
    const d = { ...emptyPlanning().gains, taxable: "30000", lots: [lot("a", 1000, 6000, false), lot("b", 1000, 9000, true, false)] };
    const r = capitalGains(d);
    expect(r.net).toBe(5000);
    expect(r.federalOrdinary).toBeCloseTo(5000 * 0.12, 6);
    expect(r.ltcg.tax).toBe(0);
  });

  it("nets losses against gains, deducts up to $3,000, and carries the rest", () => {
    const d = { ...emptyPlanning().gains, taxable: "50000", lots: [lot("a", 20000, 10000), lot("b", 1000, 2000, false)] };
    const r = capitalGains(d);
    expect(r.net).toBe(-9000);
    expect(r.deduction).toBe(3000);
    expect(r.carryForward).toBe(6000);
    expect(r.total).toBeLessThanOrEqual(0);
  });

  it("adds the 3.8% investment tax above the income threshold, and reports the 0% room", () => {
    const d = { ...emptyPlanning().gains, taxable: "300000", lots: [lot("a", 0, 100000)] };
    const r = capitalGains(d);
    expect(r.niit).toBeCloseTo(0.038 * 100000, 6);
    expect(capitalGains({ ...emptyPlanning().gains, taxable: "20000" }).zeroRoom).toBe(LTCG_THRESHOLDS.single.zero - 20000);
  });
});

describe("charitable giving", () => {
  const base = { ...emptyPlanning().giving, income: "120000", itemized: "5000", gift: "5000", basis: "1000", bunchYears: "3" };
  it("saves more by giving appreciated stock than the same cash", () => {
    const r = givingOptions(base);
    const cash = r.options.find((o) => o.id === "cash")!;
    const stock = r.options.find((o) => o.id === "stock")!;
    expect(stock.saved).toBeGreaterThan(cash.saved);
    expect(r.gain).toBe(4000);
    expect(r.best?.netCost).toBeLessThan(cash.netCost);
  });

  it("can beat giving every year by bunching years into one itemizing year", () => {
    const r = givingOptions(base);
    const stock = r.options.find((o) => o.id === "stock")!;
    const bunch = r.options.find((o) => o.id === "bunch")!;
    expect(bunch.charity).toBe(stock.charity);
    expect(bunch.saved).toBeGreaterThanOrEqual(stock.saved - 1);
  });

  it("allows only the small non-itemizer deduction for cash when taking the standard deduction", () => {
    const r = givingOptions({ ...base, itemized: "0", income: "70000", gift: "3000" });
    const cash = r.options.find((o) => o.id === "cash")!;
    // 3,000 given but only 1,000 deductible at the 22% (or lower) bracket, per year for 3 years.
    expect(cash.saved).toBeLessThan(3 * 1000 * 0.22 + 1);
    expect(cash.saved).toBeGreaterThan(0);
  });

  it("says nothing is best when there is no gift", () => {
    expect(givingOptions({ ...base, gift: "" }).best).toBeNull();
  });
});

describe("asset location", () => {
  const w = MODEL_PORTFOLIOS.Moderate;
  const exp = { lc: 6.5, sc: 7, intl: 7, em: 7.5, agg: 4.5, tips: 4, reit: 6.5, cash: 3.5 };
  const d = { ...emptyPlanning().location, taxable: "100000", deferred: "100000", roth: "50000" };

  it("places every dollar and keeps the overall mix", () => {
    const r = assetLocation(d, w, exp);
    const by = (m: typeof r.placed) => Object.values(m).reduce((t, acct) => t + Object.values(acct).reduce((a, b) => a + (b ?? 0), 0), 0);
    expect(by(r.placed)).toBeCloseTo(250000, 0);
    const lcTotal = (r.placed.taxable.lc ?? 0) + (r.placed.deferred.lc ?? 0) + (r.placed.roth.lc ?? 0);
    expect(lcTotal).toBeCloseTo(250000 * 0.3, 0);
  });

  it("puts bonds in the tax-deferred account and lowers the yearly tax drag", () => {
    const r = assetLocation(d, w, exp);
    expect(r.placed.deferred.agg ?? 0).toBeGreaterThan(0);
    expect(r.placed.taxable.agg ?? 0).toBeLessThan(r.prorata.taxable.agg ?? 0);
    expect(r.dragPlaced).toBeLessThan(r.dragProrata);
    expect(r.saving).toBeGreaterThan(0);
  });

  it("keeps cash in the taxable account", () => {
    const r = assetLocation(d, w, exp);
    expect(r.placed.taxable.cash ?? 0).toBeCloseTo(250000 * 0.1, 0);
  });

  it("handles no balances", () => {
    const r = assetLocation(emptyPlanning().location, w, exp);
    expect(r.total).toBe(0);
    expect(r.saving).toBe(0);
  });
});

describe("saved planning data", () => {
  it("fills in what is missing and ignores junk", () => {
    const p = normalizePlanning({ insurance: { income: 5, factors: ["home", 3] }, gains: { status: "nope", lots: [{ name: "x", basis: "1", value: "2" }, "bad"] }, roth: null });
    expect(p.insurance.income).toBe("");
    expect(p.insurance.factors).toEqual(["home"]);
    expect(p.gains.status).toBe("single");
    expect(p.gains.lots).toHaveLength(1);
    expect(p.gains.lots[0]).toMatchObject({ longTerm: true, sell: true });
    expect(p.roth.years).toBe("25");
  });

  it("tells whether a tool has been used", () => {
    const p = emptyPlanning();
    expect(planningTouched(p, "roth")).toBe(false);
    p.roth.amount = "5000";
    expect(planningTouched(p, "roth")).toBe(true);
    expect(planningTouched(p, "gains")).toBe(false);
  });
});
