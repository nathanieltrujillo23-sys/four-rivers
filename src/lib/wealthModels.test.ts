import { describe, expect, it } from "vitest";
import { HISTORY, HISTORY_FIRST, HISTORY_LAST } from "./marketHistory";
import { ESTATE_DOCS, STRATEGIES, backtest, defaultBacktest, defaultEstate, defaultWithdraw, emptyModels, estate, normalizeModels, presetWeights, withdrawPath, withdrawStudy } from "./wealthModels";
import { emptyPrep, normalizePrep } from "./wealthPrep";

const yr = (y: number) => HISTORY.find((h) => h.year === y)!;
const only = (w: Parameters<typeof presetWeights>[0]) => presetWeights(w);

describe("the market history", () => {
  it("covers every year once, with the well-known years as published", () => {
    expect(HISTORY.map((h) => h.year)).toEqual(Array.from({ length: HISTORY_LAST - HISTORY_FIRST + 1 }, (_, k) => HISTORY_FIRST + k));
    expect(HISTORY_FIRST).toBe(1928);
    expect(yr(2008).stocks).toBe(-36.55);
    expect(yr(2008).bonds).toBe(20.1);
    expect(yr(1931).stocks).toBe(-43.84);
    expect(yr(2022).inflation).toBe(8);
    for (const h of HISTORY) for (const v of Object.values(h)) expect(Number.isFinite(v)).toBe(true);
  });
});

describe("the backtester", () => {
  it("works one year by hand, in nominal and in real terms", () => {
    const one = backtest({ ...defaultBacktest(), weights: only({ stocks: 100 }), start: "2008", end: "2008" });
    expect(one.ending).toBeCloseTo(10000 * (1 - 0.3655), 6);
    const mixed = backtest({ ...defaultBacktest(), start: "2008", end: "2008" });
    expect(mixed.years[0].ret).toBeCloseTo(0.6 * -0.3655 + 0.4 * 0.201, 12);
    const real = backtest({ ...defaultBacktest(), weights: only({ stocks: 100 }), start: "2022", end: "2022", real: true });
    expect(real.years[0].ret).toBeCloseTo((1 + yr(2022).stocks / 100) / 1.08 - 1, 12);
  });

  it("adds the yearly amount at the end of each year and keeps the return free of it", () => {
    const a = yr(2010).stocks / 100;
    const b = yr(2011).stocks / 100;
    const r = backtest({ ...defaultBacktest(), weights: only({ stocks: 100 }), start: "2010", end: "2011", initial: "1000", yearly: "500" });
    expect(r.ending).toBeCloseTo((1000 * (1 + a) + 500) * (1 + b) + 500, 6);
    expect(r.contributed).toBe(2000);
    expect(r.cagr).toBeCloseTo(Math.sqrt((1 + a) * (1 + b)) - 1, 12);
  });

  it("lets the winners run when it is not rebalanced", () => {
    const base = { ...defaultBacktest(), start: "1990", end: "1999" };
    const re = backtest(base);
    const drift = backtest({ ...base, rebalance: false });
    const s = HISTORY.filter((h) => h.year >= 1990 && h.year <= 1999).reduce((x, h) => x * (1 + h.stocks / 100), 1);
    const bo = HISTORY.filter((h) => h.year >= 1990 && h.year <= 1999).reduce((x, h) => x * (1 + h.bonds / 100), 1);
    expect(drift.ending).toBeCloseTo(10000 * (0.6 * s + 0.4 * bo), 4);
    expect(drift.ending).not.toBeCloseTo(re.ending, 0);
    expect(re.years.at(-1)!.index).toBeCloseTo(re.ending / 10000, 10);
  });

  it("finds the deepest fall between year-ends and the best and worst years", () => {
    const r = backtest({ ...defaultBacktest(), weights: only({ stocks: 100 }), start: "1995", end: "2012" });
    const dd = 1 - (1 + yr(2000).stocks / 100) * (1 + yr(2001).stocks / 100) * (1 + yr(2002).stocks / 100);
    const dd08 = 1 - (1 + yr(2008).stocks / 100);
    expect(r.maxDrawdown).toBeCloseTo(Math.max(dd, dd08), 10);
    expect(r.worst).toEqual({ year: 2008, ret: -0.3655 });
    expect(r.downYears).toBe(4);
    expect(r.stocksCagr).toBeCloseTo(r.cagr, 12);
  });

  it("refuses weights that do not add to 100 and years outside the history", () => {
    expect(backtest({ ...defaultBacktest(), weights: only({ stocks: 70, bonds: 40 }) }).problem).toMatch(/add to 110%/);
    expect(backtest({ ...defaultBacktest(), start: "1900" }).valid).toBe(false);
    expect(backtest({ ...defaultBacktest(), start: "2020", end: "2010" }).valid).toBe(false);
    expect(backtest({ ...defaultBacktest(), initial: "0", yearly: "0" }).valid).toBe(false);
    expect(backtest(defaultBacktest()).valid).toBe(true);
  });
});

describe("withdrawal strategies", () => {
  it("follows one two-year retirement by hand", () => {
    const rows = [yr(2000), yr(2001)];
    const g = (h: (typeof rows)[number]) => 1 + (0.6 * h.stocks + 0.4 * h.bonds) / 100;
    const p = withdrawPath("constant", rows, 1000, 40, 0.6);
    const second = 40 * (1 + rows[0].inflation / 100);
    const end = ((1000 - 40) * g(rows[0]) - second) * g(rows[1]);
    const price = (1 + rows[0].inflation / 100) * (1 + rows[1].inflation / 100);
    expect(p.endReal).toBeCloseTo(end / price, 8);
    expect(p.lowReal).toBeCloseTo(40, 8);
    expect(p.depleted).toBe(false);
    // Fixed percent takes 4% of whatever is left.
    const q = withdrawPath("percent", rows, 1000, 40, 0.6);
    expect(q.avgReal).toBeCloseTo((40 + (960 * g(rows[0]) * 0.04) / (1 + rows[0].inflation / 100)) / 2, 8);
    // Spending more than there is runs out.
    expect(withdrawPath("constant", rows, 1000, 700, 0.6).depleted).toBe(true);
  });

  it("replays every starting year: a small withdrawal always lasts, a large one fails in the hard decades", () => {
    const safe = withdrawStudy({ ...defaultWithdraw(), spend: "20000" });
    expect(safe.strategies.map((s) => s.id)).toEqual(STRATEGIES.map((s) => s.id));
    expect(safe.strategies[0].windows).toBe(HISTORY_LAST - 30 + 1 - HISTORY_FIRST + 1);
    expect(safe.strategies.every((s) => s.success === 1)).toBe(true);
    const rich = withdrawStudy({ ...defaultWithdraw(), spend: "80000" });
    const [constant, percent, guard] = rich.strategies;
    expect(constant.success).toBeLessThan(0.7);
    expect(constant.failedStarts).toContain(1966);
    expect(percent.success).toBe(1);
    expect(guard.success).toBeGreaterThanOrEqual(constant.success);
    expect(percent.worstLowIncome).toBeLessThan(80000);
    expect(rich.byStart).toHaveLength(constant.windows);
    expect(rich.rate).toBeCloseTo(0.08, 12);
  });

  it("refuses inputs that make no sense", () => {
    expect(withdrawStudy({ ...defaultWithdraw(), balance: "0" }).valid).toBe(false);
    expect(withdrawStudy({ ...defaultWithdraw(), spend: "2000000" }).valid).toBe(false);
    expect(withdrawStudy({ ...defaultWithdraw(), years: "3" }).valid).toBe(false);
    expect(withdrawStudy({ ...defaultWithdraw(), years: "200" }).valid).toBe(false);
  });
});

describe("the estate snapshot", () => {
  const assets = [
    { id: "a", name: "Brokerage", value: "400000", titling: "sole" as const },
    { id: "b", name: "Home", value: "600000", titling: "joint" as const },
    { id: "c", name: "401(k)", value: "900000", titling: "beneficiary" as const },
    { id: "d", name: "Term policy", value: "1000000", titling: "insurance" as const },
    { id: "e", name: "Trust account", value: "100000", titling: "trust" as const },
  ];
  it("adds the estate, shows how it passes, and lists the missing documents", () => {
    const r = estate({ ...defaultEstate(), assets, debts: "250000", docs: { will: true, financialPoa: true } });
    expect(r.gross).toBe(3000000);
    expect(r.net).toBe(2750000);
    expect(r.probate).toBe(400000);
    expect(r.probateShare).toBeCloseTo(400000 / 3000000, 12);
    expect(r.routes.map((x) => x.amount)).toEqual([400000, 600000, 900000, 1000000, 100000]);
    expect(r.tax).toBe(0);
    expect(r.missing.map((m) => m.id)).toEqual(ESTATE_DOCS.map((d) => d.id).filter((id) => id !== "will" && id !== "financialPoa"));
  });
  it("shows federal tax only above the exemption, which doubles for a married couple", () => {
    const big = [{ id: "x", name: "Business", value: "20000000", titling: "sole" as const }];
    const single = estate({ ...defaultEstate(), assets: big });
    expect(single.taxable).toBe(5000000);
    expect(single.tax).toBe(2000000);
    const married = estate({ ...defaultEstate(), assets: big, married: true });
    expect(married.exemptionUsed).toBe(30000000);
    expect(married.tax).toBe(0);
    expect(estate(defaultEstate()).gross).toBe(0);
  });
});

describe("saving the models", () => {
  it("keeps them with the analyst's document and fills them in for older saves", () => {
    expect(normalizePrep({ tech: {} }).models).toEqual(emptyModels());
    const d = emptyPrep();
    d.models.backtest = { ...d.models.backtest, weights: only({ stocks: 80, gold: 20 }), real: true, rebalance: false };
    d.models.estate = { ...d.models.estate, married: true, assets: [{ id: "a", name: "Home", value: "5", titling: "joint" }], docs: { will: true } };
    d.models.withdraw = { ...d.models.withdraw, stockPct: "75" };
    expect(normalizePrep(JSON.parse(JSON.stringify(d))).models).toEqual(d.models);
    expect(normalizeModels({ estate: { assets: [{ titling: "nonsense" }] } }).estate.assets[0].titling).toBe("sole");
  });
});
