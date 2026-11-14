import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { evaluate } from "./excelTestKit";
import { workbookBuffer } from "./excelWrite";
import { backtestSheet, clientStatementsBook, estateSheet, statementsOfClient, wealthBook, withdrawSheet } from "./wealthExcel";
import { backtest, defaultBacktest, defaultEstate, defaultWithdraw, emptyModels, estate, presetWeights, withdrawStudy } from "./wealthModels";
import { samplePlan, snapshotMetrics } from "./wealthMath";
import { PRACTICE_CASES } from "./wealthPractice";

const close = (a: number, b: number, digits = 6) => expect(a).toBeCloseTo(b, digits);

describe("the wealth workbooks match the app's own numbers", () => {
  it("backtest: rebalanced, left to drift, after inflation, and with yearly additions", () => {
    const cases = [
      defaultBacktest(),
      { ...defaultBacktest(), rebalance: false, yearly: "1200", start: "1990", end: "2010" },
      { ...defaultBacktest(), real: true, weights: presetWeights({ stocks: 25, bonds: 25, bills: 25, gold: 25 }), start: "1970", end: "1985", yearly: "500" },
      { ...defaultBacktest(), weights: presetWeights({ stocks: 59.8, small: 10, bonds: 30 }), start: "2000", end: "2012" },
    ];
    for (const i of cases) {
      const m = backtestSheet(i)!;
      const x = evaluate([m.sheet]);
      const r = backtest(i);
      expect(x.errors()).toEqual([]);
      close(x.num("Backtest", m.out.ending), r.ending, 4);
      close(x.num("Backtest", m.out.contributed), r.contributed);
      close(x.num("Backtest", m.out.cagr), r.cagr, 10);
      close(x.num("Backtest", m.out.vol), r.vol, 10);
      close(x.num("Backtest", m.out.best), r.best.ret, 10);
      close(x.num("Backtest", m.out.worst), r.worst.ret, 10);
      close(x.num("Backtest", m.out.maxDd), r.maxDrawdown, 10);
    }
    expect(backtestSheet({ ...defaultBacktest(), start: "1800" })).toBeNull();
  });

  it("estate snapshot: totals, routes and tax", () => {
    const i = {
      ...defaultEstate(),
      married: true,
      debts: "400000",
      exemption: "5000000",
      assets: [
        { id: "a", name: "Brokerage", value: "9000000", titling: "sole" as const },
        { id: "b", name: "Home", value: "2500000", titling: "joint" as const },
        { id: "c", name: "Policy", value: "3000000", titling: "insurance" as const },
        { id: "d", name: "Unknown", value: "", titling: "trust" as const },
      ],
    };
    const m = estateSheet(i);
    const x = evaluate([m.sheet]);
    const r = estate(i);
    expect(x.errors()).toEqual([]);
    close(x.num("Estate snapshot", m.out.gross), r.gross);
    close(x.num("Estate snapshot", m.out.net), r.net);
    close(x.num("Estate snapshot", m.out.taxable), r.taxable);
    close(x.num("Estate snapshot", m.out.tax), r.tax);
    close(x.num("Estate snapshot", m.out.probate), r.probate);
    close(x.num("Estate snapshot", m.out.probateShare), r.probateShare);
    close(x.num("Estate snapshot", m.out.insurance), 3000000);
    expect(evaluate([estateSheet(defaultEstate()).sheet]).errors()).toEqual([]);
  });

  it("a client's financial statements tie to the snapshot in the plan, for the example and every practice case", () => {
    for (const plan of [samplePlan(), ...PRACTICE_CASES.map((c) => c.build())]) {
      const m = statementsOfClient(plan);
      const x = evaluate([m.sheet]);
      const s = snapshotMetrics(plan);
      const S = "Financial statements";
      expect(x.errors(), plan.client.name).toEqual([]);
      close(x.num(S, m.out.totalAssets), s.totalAssets);
      close(x.num(S, m.out.totalDebt), s.totalDebt);
      close(x.num(S, m.out.netWorth), s.netWorth);
      close(x.num(S, m.out.surplus), s.surplus);
      close(x.num(S, m.out.needs), s.needs);
      close(x.num(S, m.out.cushion), s.emergencyMonths ?? 0);
      close(x.num(S, m.out.savings), s.savingsRate ?? 0);
    }
  });

  it("the withdrawal study exports its results, and every workbook is a real file", async () => {
    const w = withdrawSheet(defaultWithdraw())!;
    close(evaluate([w.sheet]).num("Withdrawal study", w.out.success), withdrawStudy(defaultWithdraw()).strategies[0].success);
    expect(withdrawSheet({ ...defaultWithdraw(), years: "2" })).toBeNull();
    for (const model of ["backtest", "withdraw", "estate"] as const) {
      const spec = wealthBook(emptyModels(), model)!;
      const zip = await JSZip.loadAsync(await workbookBuffer(spec));
      expect(Object.keys(zip.files).filter((f) => /^xl\/worksheets\/sheet\d+\.xml$/.test(f))).toHaveLength(2);
    }
    const spec = clientStatementsBook(samplePlan());
    expect(spec.filename).toBe("Marcus-Rivera-financial-statements.xlsx");
  });
});
