import { describe, expect, it } from "vitest";
import {
  BENCHMARK_WEIGHTS,
  MODEL_PORTFOLIOS,
  correlationsAdjusted,
  covariance,
  efficientFrontier,
  emptyPortfolio,
  feeDragSeries,
  isPositiveSemiDefinite,
  normalizePortfolio,
  portfolioStats,
  rebalanceAfter,
  runLifecycle,
  stressTests,
  weightTotal,
  withWeights,
  type ClassId,
} from "./wealthPortfolio";

const growth = () => withWeights(emptyPortfolio(), MODEL_PORTFOLIOS.Growth);
const w = (obj: Partial<Record<ClassId, number>>) => withWeights(emptyPortfolio(), { lc: 0, sc: 0, intl: 0, em: 0, agg: 0, tips: 0, reit: 0, cash: 0, ...obj });

describe("model portfolios and assumptions", () => {
  it("add every model portfolio to 100% and raise the stock share with the profile", () => {
    const eq = Object.entries(MODEL_PORTFOLIOS).map(([name, wt]) => {
      expect(Object.values(wt).reduce((a, b) => a + b, 0), name).toBe(100);
      return portfolioStats(withWeights(emptyPortfolio(), wt)).equity;
    });
    expect(eq).toEqual([...eq].sort((a, b) => a - b));
    expect(eq[0]).toBeLessThan(20);
    expect(eq[4]).toBeGreaterThan(80);
    expect(weightTotal(growth())).toBe(100);
  });

  it("reads a saved portfolio safely and keeps what was typed", () => {
    expect(normalizePortfolio(null).started).toBe(false);
    const p = normalizePortfolio({ started: true, source: "Test set", classes: [{ id: "lc", ret: "8", vol: "18", weight: "50" }], corr: { "lc|sc": "0.5", "bogus|x": "1" }, stress: { gfc: { lc: "-40" } } });
    expect(p.started).toBe(true);
    expect(p.classes.find((c) => c.id === "lc")).toMatchObject({ ret: "8", vol: "18", weight: "50" });
    expect(p.classes).toHaveLength(8);
    expect(p.corr["lc|sc"]).toBe("0.5");
    expect("bogus|x" in p.corr).toBe(false);
    expect(p.stress.gfc.lc).toBe("-40");
  });
});

describe("portfolio risk and return", () => {
  it("is just the class itself when everything is in one class", () => {
    const s = portfolioStats(w({ cash: 100 }));
    expect(s.geometric).toBeCloseTo(3.5, 1);
    expect(s.vol).toBeCloseTo(1, 6);
    expect(s.equity).toBe(0);
    expect(s.diversification).toBeCloseTo(1, 6);
  });

  it("takes less risk than the average of its parts when they do not move together (diversification)", () => {
    const s = portfolioStats(w({ lc: 50, agg: 50 }));
    const avg = (16 + 5) / 2;
    expect(s.vol).toBeLessThan(avg);
    expect(s.diversification).toBeGreaterThan(1);
    expect(s.riskShare.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    // Stocks carry most of the risk in a 50/50 mix even at equal dollars.
    expect(s.riskShare[0]).toBeGreaterThan(0.8);
  });

  it("orders risk and return by profile, and the 60/40 reference sits between moderate and growth in risk", () => {
    const ps = Object.values(MODEL_PORTFOLIOS).map((m) => portfolioStats(withWeights(emptyPortfolio(), m)));
    for (let i = 1; i < ps.length; i++) {
      expect(ps[i].vol).toBeGreaterThan(ps[i - 1].vol);
      expect(ps[i].geometric).toBeGreaterThan(ps[i - 1].geometric);
    }
    const bench = portfolioStats(withWeights(emptyPortfolio(), BENCHMARK_WEIGHTS));
    expect(bench.vol).toBeGreaterThan(ps[2].vol);
    expect(bench.vol).toBeLessThan(ps[4].vol);
    expect(ps[3].arithmetic).toBeGreaterThan(ps[3].geometric);
  });

  it("repairs correlations that cannot all be true together", () => {
    const p = emptyPortfolio();
    expect(correlationsAdjusted(p)).toBe(false);
    p.corr["lc|sc"] = "-0.95";
    p.corr["lc|intl"] = "-0.95";
    p.corr["sc|intl"] = "-0.95"; // three assets cannot all be almost perfectly opposite
    expect(correlationsAdjusted(p)).toBe(true);
    const cov = covariance(p);
    expect(isPositiveSemiDefinite(cov.map((row, i) => row.map((c, j) => c / (Math.sqrt(cov[i][i] * cov[j][j]) || 1))))).toBe(true);
    expect(portfolioStats(withWeights(p, MODEL_PORTFOLIOS.Growth)).vol).toBeGreaterThan(0);
  });
});

describe("the efficient frontier", () => {
  it("rises with risk, and no random portfolio beats it", () => {
    const f = efficientFrontier(growth(), 4000);
    expect(f.frontier.length).toBeGreaterThan(10);
    for (let i = 1; i < f.frontier.length; i++) {
      expect(f.frontier[i].vol).toBeGreaterThanOrEqual(f.frontier[i - 1].vol);
      expect(f.frontier[i].ret).toBeGreaterThan(f.frontier[i - 1].ret);
    }
    const above = f.cloud.filter((c) => {
      const at = f.frontier.filter((x) => x.vol <= c.vol).pop();
      return at && c.ret > at.ret + 0.3;
    });
    expect(above.length).toBe(0);
    expect(f.assets).toHaveLength(8);
    // The result is steady: the same assumptions draw the same line.
    expect(efficientFrontier(growth(), 4000).frontier[5]).toEqual(f.frontier[5]);
  });
});

describe("stress tests, fees and rebalancing", () => {
  it("loses nothing in cash and most in the riskiest mix, and says how long recovery takes", () => {
    const cash = stressTests(w({ cash: 100 }), 10000);
    expect(cash.every((r) => r.loss >= 0)).toBe(true);
    const agg = stressTests(withWeights(emptyPortfolio(), MODEL_PORTFOLIOS.Aggressive), 10000);
    const con = stressTests(withWeights(emptyPortfolio(), MODEL_PORTFOLIOS.Conservative), 10000);
    const gfc = (rs: ReturnType<typeof stressTests>) => rs.find((r) => r.scenario.id === "gfc")!;
    expect(gfc(agg).loss).toBeLessThan(gfc(con).loss);
    expect(gfc(agg).dollars).toBeCloseTo((10000 * gfc(agg).loss) / 100, 6);
    expect(gfc(agg).recoveryYears).toBeGreaterThan(2);
    expect(cash.find((r) => r.scenario.id === "gfc")!.recoveryYears).toBeNull();
    const edited = growth();
    edited.stress.custom = { lc: "-50", sc: "-50", intl: "-50", em: "-50", reit: "-50", agg: "0", tips: "0", cash: "0" };
    const custom = stressTests(edited, 10000).find((r) => r.scenario.id === "custom")!;
    expect(custom.loss).toBeCloseTo(-37.5, 0); // 75% in stocks and real estate, down half
  });

  it("shows fees costing more the longer they run", () => {
    const low = feeDragSeries(10000, 300, 30, 7, 0.05);
    const high = feeDragSeries(10000, 300, 30, 7, 1.25);
    expect(low).toHaveLength(31);
    expect(low[30]).toBeGreaterThan(high[30]);
    expect(low[30] - high[30]).toBeGreaterThan(low[10] - high[10]);
    expect(feeDragSeries(1000, 0, 1, 0, 0)[1]).toBeCloseTo(1000, 6);
  });

  it("drifts after a stock rally and sizes the trades that put it back, with a band", () => {
    const rows = rebalanceAfter(growth(), { lc: 100, sc: 100, intl: 100, em: 100, reit: 100, agg: 0, tips: 0, cash: 0 }, 100000, 5);
    expect(rows.reduce((t, r) => t + r.drifted, 0)).toBeCloseTo(100, 6);
    expect(rows.reduce((t, r) => t + r.trade, 0)).toBeCloseTo(0, 4);
    const lc = rows.find((r) => r.id === "lc")!;
    expect(lc.drifted).toBeGreaterThan(lc.target);
    expect(lc.trade).toBeLessThan(0); // sell what grew
    expect(rows.find((r) => r.id === "agg")!.trade).toBeGreaterThan(0); // buy what fell behind
    expect(rows.some((r) => r.outsideBand)).toBe(true);
    const calm = rebalanceAfter(growth(), { lc: 1, sc: 1, intl: 1, em: 1, reit: 1, agg: 1, tips: 1, cash: 1 }, 100000, 5);
    expect(calm.some((r) => r.outsideBand)).toBe(false);
  });
});

describe("retirement income", () => {
  const base = { currentAge: 25, retireAge: 65, lengthYears: 30, initial: 10000, monthly: 600, ret: 7, vol: 14, inflation: 2.5, spend: 60000, income: 20000, paths: 400 };
  it("is steady for the same inputs, and a safer plan lasts more often", () => {
    const a = runLifecycle(base);
    expect(runLifecycle(base).success).toBe(a.success);
    expect(a.points).toHaveLength(71);
    expect(a.points[0].age).toBe(25);
    expect(a.success).toBeGreaterThanOrEqual(0);
    expect(a.success).toBeLessThanOrEqual(1);
    const thrifty = runLifecycle({ ...base, spend: 40000 });
    const lavish = runLifecycle({ ...base, spend: 100000 });
    expect(thrifty.success).toBeGreaterThanOrEqual(a.success);
    expect(lavish.success).toBeLessThanOrEqual(a.success);
    expect(runLifecycle({ ...base, monthly: 1500 }).atRetirement.p50).toBeGreaterThan(a.atRetirement.p50);
  });

  it("reports the first year's withdrawal against the balance at retirement", () => {
    const r = runLifecycle({ ...base, vol: 0, ret: 2.5, inflation: 2.5, initial: 0, monthly: 0, spend: 40000, income: 0, retireAge: 25, lengthYears: 10, paths: 20 });
    // No growth in real terms, $40,000 a year out of nothing: fails at once.
    expect(r.success).toBe(0);
    const fine = runLifecycle({ ...base, vol: 0, ret: 2.5, inflation: 2.5, initial: 500000, monthly: 0, spend: 40000, income: 0, retireAge: 25, lengthYears: 10, paths: 20 });
    expect(fine.success).toBe(1);
    expect(fine.withdrawalRate).toBeCloseTo(8, 6);
  });
});
