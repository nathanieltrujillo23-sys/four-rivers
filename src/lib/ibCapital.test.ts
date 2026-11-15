import { describe, expect, it } from "vitest";
import { IRR_TABLE, PAPER_QUESTIONS, defaultPrecedents, defaultWacc, paperCheck, paperLbo, paperSteps, precedents, relever, unlever, wacc, waccGrid } from "./ibCapital";
import { emptyIb, normalizeIb } from "./ibWorkspace";

describe("WACC builder", () => {
  it("works a textbook case by hand", () => {
    // Ke = 4% + 1.2 x 5% = 10%; Kd = 6% x (1 - 25%) = 4.5%; 60/40 weights: 0.6 x 10% + 0.4 x 4.5% = 7.8%.
    const r = wacc({ ...defaultWacc(), riskFree: "4", erp: "5", beta: "1.2", sizePremium: "0", costOfDebt: "6", tax: "25", equity: "600", debt: "400" });
    expect(r.valid).toBe(true);
    expect(r.costOfEquity).toBeCloseTo(0.1, 10);
    expect(r.afterTaxDebt).toBeCloseTo(0.045, 10);
    expect(r.wacc).toBeCloseTo(0.078, 10);
    expect(r.steps.join(" ")).toContain("7.8%");
  });

  it("unlevers peers, takes the median and relevers at the company's own structure", () => {
    expect(relever(unlever(1.4, 0.5, 0.25), 0.5, 0.25)).toBeCloseTo(1.4, 12);
    const peers = [
      { id: "a", name: "A", beta: "1.5", debtToEquity: "100", tax: "25" }, // 1.5 / 1.75
      { id: "b", name: "B", beta: "1.0", debtToEquity: "0", tax: "25" }, // 1.0
      { id: "c", name: "C", beta: "", debtToEquity: "20", tax: "25" }, // left out
    ];
    const r = wacc({ ...defaultWacc(), fromPeers: true, peers, equity: "500", debt: "500", tax: "20" });
    const median = (1.5 / 1.75 + 1) / 2;
    expect(r.peers[2].unlevered).toBeNull();
    expect(r.unleveredMedian).toBeCloseTo(median, 12);
    expect(r.beta).toBeCloseTo(median * (1 + 0.8 * 1), 12);
    // With "from comparables" off the typed beta is used.
    expect(wacc({ ...defaultWacc(), fromPeers: false, peers, beta: "0.8" }).beta).toBe(0.8);
  });

  it("refuses nonsense and gives a grid centred on the inputs", () => {
    expect(wacc({ ...defaultWacc(), equity: "0" }).valid).toBe(false);
    expect(wacc({ ...defaultWacc(), beta: "0" }).valid).toBe(false);
    const g = waccGrid(defaultWacc());
    expect(g.values[2][2]).toBeCloseTo(wacc(defaultWacc()).wacc, 12);
    expect(g.values[4][4]!).toBeGreaterThan(g.values[0][0]!);
  });
});

describe("precedent transactions", () => {
  it("values the target on the middle half of the deals and prices the median premium", () => {
    const rows = [
      { id: "a", target: "T1", acquirer: "", year: "2024", ev: "800", revenue: "400", ebitda: "100", premium: "20", source: "", asOf: "" }, // 8x
      { id: "b", target: "T2", acquirer: "", year: "2024", ev: "1000", revenue: "400", ebitda: "100", premium: "30", source: "", asOf: "" }, // 10x
      { id: "c", target: "T3", acquirer: "", year: "2025", ev: "1200", revenue: "400", ebitda: "100", premium: "40", source: "", asOf: "" }, // 12x
      { id: "d", target: "Private", acquirer: "", year: "2025", ev: "500", revenue: "", ebitda: "", premium: "", source: "", asOf: "" },
    ];
    const r = precedents({ ...defaultPrecedents(), rows, targetEbitda: "50", netDebt: "100", shares: "10", price: "20" });
    expect(r.evEbitda).toMatchObject({ count: 3, median: 10, q1: 9, q3: 11 });
    expect(r.range!.ev).toEqual([450, 500, 550]);
    expect(r.range!.perShare[1]).toBe(40);
    expect(r.premium!.median).toBeCloseTo(0.3, 12);
    expect(r.premiumPrice).toBeCloseTo(26, 10);
    expect(precedents(defaultPrecedents()).range).toBeNull();
  });
});

describe("paper LBO drill", () => {
  it("gives the same deal for the same seed, always with round, solvable numbers", () => {
    expect(paperLbo(7)).toEqual(paperLbo(7));
    for (let seed = 1; seed <= 300; seed++) {
      const q = paperLbo(seed);
      const a = q.answers;
      expect(a.equity, `seed ${seed}`).toBeGreaterThan(0);
      expect(a.exitDebt, `seed ${seed}`).toBeGreaterThanOrEqual(0);
      expect(a.exitEquity).toBeGreaterThan(0);
      expect(a.price).toBe(q.ebitda * q.entryMultiple);
      expect(a.exitEquity).toBe((q.ebitda + q.ebitdaStep * q.years) * q.exitMultiple - (q.ebitda * q.leverage - q.paydown * q.years));
      expect(a.irr).toBeCloseTo(a.moic ** (1 / q.years) - 1, 12);
      expect(q.paydown % 5).toBe(0);
      expect(paperSteps(q)).toHaveLength(5);
    }
  });

  it("marks an answer by how close it is", () => {
    const q = paperLbo(3);
    expect(paperCheck(q, "price", q.answers.price)).toBe(true);
    expect(paperCheck(q, "price", q.answers.price * 1.05)).toBe(false);
    expect(paperCheck(q, "moic", q.answers.moic + 0.09)).toBe(true);
    expect(paperCheck(q, "irr", q.answers.irr * 100 + 2)).toBe(true);
    expect(paperCheck(q, "irr", q.answers.irr * 100 + 4)).toBe(false);
    expect(paperCheck(q, "equity", NaN)).toBe(false);
    expect(PAPER_QUESTIONS.map((x) => x.id)).toEqual(["price", "equity", "exitEquity", "moic", "irr"]);
    expect(IRR_TABLE.find((r) => r.moic === 2)!.five).toBeCloseTo(0.1487, 3);
  });
});

describe("the saved workspace", () => {
  it("keeps the new models through a save and load, and fills them in for older saves", () => {
    const old = normalizeIb({ dcf: { wacc: "8" } });
    expect(old.wacc).toEqual(defaultWacc());
    expect(old.precedents.rows).toEqual([]);
    expect(old.paper).toEqual([]);
    const d = emptyIb();
    d.wacc = { ...d.wacc, fromPeers: true, peers: [{ id: "a", name: "A", beta: "1.2", debtToEquity: "30", tax: "25" }] };
    d.precedents = { ...d.precedents, basis: "revenue", rows: [{ id: "p", target: "T", acquirer: "A", year: "2025", ev: "1", revenue: "2", ebitda: "3", premium: "4", source: "", asOf: "" }] };
    d.paper = [{ date: "2026-11-14", seed: 5, correct: 4, seconds: 210 }];
    expect(normalizeIb(JSON.parse(JSON.stringify(d)))).toEqual(d);
    expect(normalizeIb({ paper: [{ seed: "x" }], precedents: { basis: "pe" } }).precedents.basis).toBe("ebitda");
  });
});
