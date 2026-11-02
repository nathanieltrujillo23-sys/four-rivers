import { describe, expect, it } from "vitest";
import { comps, dcf, dcfGrid, defaultComps, defaultDcf, defaultLbo, defaultMerger, lbo, lboGrid, merger, stats } from "./ibMath";

describe("DCF", () => {
  it("rebuilds a simple case by hand: flat cash flows, no growth, no terminal growth", () => {
    const d = { ...defaultDcf(), growth: ["0", "0", "0", "0", "0"], revenue: "1000", ebitMargin: "20", tax: "0", da: "0", capex: "0", nwc: "0", wacc: "10", terminalGrowth: "0", midYear: false, netDebt: "0", shares: "100", exitMultiple: "5" };
    const r = dcf(d);
    // FCF = 200 a year. PV of five years at 10% = 200 × 3.7908 = 758.2; TV = 200/0.10 = 2000, PV = 1241.8; EV = 2000.
    expect(r.years[0].fcf).toBeCloseTo(200, 6);
    expect(r.pvFcf).toBeCloseTo(758.157, 2);
    expect(r.evPerpetuity).toBeCloseTo(2000, 2);
    expect(r.perSharePerpetuity).toBeCloseTo(20, 2);
    expect(r.terminalShare).toBeCloseTo(0.6209, 3);
  });

  it("values mid-year cash flows higher than end-of-year, and refuses WACC at or below growth", () => {
    const base = defaultDcf();
    expect(dcf({ ...base, midYear: true }).evPerpetuity).toBeGreaterThan(dcf({ ...base, midYear: false }).evPerpetuity);
    const bad = dcf({ ...base, wacc: "2", terminalGrowth: "3" });
    expect(bad.valid).toBe(false);
    expect(bad.problem).toMatch(/WACC/);
    expect(dcf({ ...base, revenue: "" }).valid).toBe(false);
  });

  it("subtracts net debt, divides by shares, and compares to the price", () => {
    const r = dcf({ ...defaultDcf(), price: "10" });
    expect(r.equityPerpetuity).toBeCloseTo(r.evPerpetuity - 300, 6);
    expect(r.perSharePerpetuity).toBeCloseTo(r.equityPerpetuity / 100, 6);
    expect(r.upside).toBeCloseTo(r.perSharePerpetuity / 10 - 1, 6);
    expect(dcf(defaultDcf()).upside).toBeNull();
  });

  it("gives a sensitivity grid that rises as WACC falls and growth rises", () => {
    const g = dcfGrid(defaultDcf());
    expect(g.values).toHaveLength(5);
    expect(g.values[0][4]!).toBeGreaterThan(g.values[4][0]!);
    expect(g.values[2][2]).toBeCloseTo(dcf(defaultDcf()).perSharePerpetuity, 6);
  });
});

describe("comparables", () => {
  const row = (id: string, ev: number, rev: number, ebitda: number, ni: number, eq: number) => ({ id, name: id, ev: String(ev), revenue: String(rev), ebitda: String(ebitda), netIncome: String(ni), equity: String(eq) });
  it("computes multiples, percentiles, and an implied value range", () => {
    const i = { ...defaultComps(), rows: [row("a", 1000, 500, 100, 50, 800), row("b", 1200, 600, 100, 60, 900), row("c", 800, 400, 100, 40, 600), row("d", 1500, 700, 100, 70, 1200)], targetEbitda: "50", netDebt: "100", shares: "10" };
    const r = comps(i);
    expect(r.rows[0].evEbitda).toBe(10);
    expect(r.evEbitda).toMatchObject({ low: 8, high: 15, median: 11, count: 4 });
    // 25th to 75th percentile of 8, 10, 12, 15 is 9.5 to 12.75.
    expect(r.range!.ev[0]).toBeCloseTo(9.5 * 50, 6);
    expect(r.range!.ev[2]).toBeCloseTo(12.75 * 50, 6);
    expect(r.range!.equity[1]).toBeCloseTo(11 * 50 - 100, 6);
  });

  it("skips multiples with no denominator and says nothing without data", () => {
    const r = comps({ ...defaultComps(), rows: [row("x", 500, 0, -5, 0, 0)] });
    expect(r.rows[0]).toMatchObject({ evRevenue: null, evEbitda: null, pe: null });
    expect(r.range).toBeNull();
    expect(stats([])).toBeNull();
  });

  it("values on a P/E basis by working up to enterprise value", () => {
    const r = comps({ ...defaultComps(), basis: "pe", rows: [row("a", 0, 0, 0, 50, 1000)], targetNetIncome: "20", netDebt: "40", shares: "5" });
    expect(r.range!.equity[1]).toBeCloseTo(400, 6);
    expect(r.range!.ev[1]).toBeCloseTo(440, 6);
    expect(r.range!.perShare[1]).toBeCloseTo(80, 6);
  });
});

describe("LBO", () => {
  it("sources and uses balance, debt falls, and returns follow from equity in and out", () => {
    const r = lbo(defaultLbo());
    expect(r.price).toBeCloseTo(900, 6);
    expect(r.debt).toBeCloseTo(500, 6);
    expect(r.equity).toBeCloseTo(r.uses - r.debt, 6);
    expect(r.years).toHaveLength(5);
    expect(r.years[4].debt).toBeLessThan(r.debt);
    expect(r.moic).toBeCloseTo(r.exitEquity / r.equity, 9);
    expect(r.irr).toBeCloseTo(r.moic ** (1 / 5) - 1, 9);
    expect(r.irr).toBeGreaterThan(0.1);
  });

  it("explains the gain as growth, multiple change and debt paydown less fees", () => {
    const r = lbo({ ...defaultLbo(), exitMultiple: "10" });
    expect(r.bridge.growth + r.bridge.multiple + r.bridge.debt + r.bridge.fees).toBeCloseTo(r.bridge.total, 6);
    expect(r.bridge.multiple).toBeGreaterThan(0);
  });

  it("returns more with a higher exit multiple, and refuses leverage that leaves no equity", () => {
    expect(lbo({ ...defaultLbo(), exitMultiple: "11" }).irr).toBeGreaterThan(lbo({ ...defaultLbo(), exitMultiple: "9" }).irr);
    expect(lbo({ ...defaultLbo(), leverage: "20", fees: "0" }).valid).toBe(false);
    expect(lbo({ ...defaultLbo(), ebitda: "" }).valid).toBe(false);
    const g = lboGrid(defaultLbo());
    expect(g.values).toHaveLength(5);
    expect(g.values[2][4]!).toBeGreaterThan(g.values[2][0]!);
  });
});

describe("accretion and dilution", () => {
  it("works the deal through to pro forma EPS", () => {
    const r = merger(defaultMerger());
    expect(r.offerPrice).toBeCloseTo(26, 6);
    expect(r.purchasePrice).toBeCloseTo(2600, 6);
    expect(r.newShares).toBeCloseTo(1300 / 50, 6);
    expect(r.cashPaid).toBeCloseTo(1300, 6);
    const financing = 1300 * 0.06 * 0.75;
    expect(r.proFormaIncome).toBeCloseTo(600 + 100 + 25 * 0.75 - financing, 6);
    expect(r.proFormaEps).toBeCloseTo(r.proFormaIncome / (200 + 26), 6);
    expect(r.standaloneEps).toBe(3);
  });

  it("finds the synergies that bring EPS back to even", () => {
    const r = merger(defaultMerger());
    const even = merger({ ...defaultMerger(), synergies: String(r.breakEvenSynergies) });
    expect(Math.abs(even.accretion)).toBeLessThan(1e-9);
  });

  it("is dilutive when the target is expensive and accretive when it is cheap", () => {
    expect(merger({ ...defaultMerger(), premium: "100", synergies: "0" }).accretion).toBeLessThan(0);
    expect(merger({ ...defaultMerger(), tgtNetIncome: "400", stockPct: "100" }).accretion).toBeGreaterThan(0);
    expect(merger({ ...defaultMerger(), acqShares: "" }).valid).toBe(false);
  });
});
