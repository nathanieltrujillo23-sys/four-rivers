import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { evaluate } from "./excelTestKit";
import { colName } from "./excel";
import { workbookBuffer } from "./excelWrite";
import { compsSheet, dcfSheet, ibBook, lboSheet, mergerSheet, precedentsSheet, statementsSheet, waccSheet } from "./ibExcel";
import { comps, dcf, defaultComps, defaultDcf, defaultLbo, defaultMerger, lbo, merger } from "./ibMath";
import { defaultPrecedents, defaultWacc, precedents, wacc } from "./ibCapital";
import { defaultStatements, statements } from "./ibStatements";
import { emptyIb } from "./ibWorkspace";

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

describe("the Excel workbooks match the app's own numbers", () => {
  it("names columns the way a spreadsheet does", () => {
    expect([0, 25, 26, 27, 51, 52].map(colName)).toEqual(["A", "Z", "AA", "AB", "AZ", "BA"]);
  });

  it("DCF: both terminal value methods, with and without the mid-year convention", () => {
    for (const i of [defaultDcf(), { ...defaultDcf(), midYear: false, wacc: "10.5", growth: ["12", "9", "7", "5", "3"], netDebt: "-50" }]) {
      const m = dcfSheet(i);
      const x = evaluate([m.sheet]);
      const r = dcf(i);
      expect(x.errors()).toEqual([]);
      close(x.num("DCF", m.out.pvFcf), r.pvFcf);
      close(x.num("DCF", m.out.evP), r.evPerpetuity);
      close(x.num("DCF", m.out.evE), r.evExit);
      close(x.num("DCF", m.out.psP), r.perSharePerpetuity);
      close(x.num("DCF", m.out.psE), r.perShareExit);
      close(x.num("DCF", m.out.share), r.terminalShare);
      close(x.num("DCF", m.out.impM), r.impliedMultiple);
      close(x.num("DCF", m.out.impG), r.impliedGrowth);
      close(x.num("DCF", m.out.fcf5), r.years[4].fcf);
    }
  });

  it("LBO: sources and uses, the cash sweep, returns and the value bridge, for several holding periods", () => {
    for (const i of [defaultLbo(), { ...defaultLbo(), years: "3", leverage: "6.5", exitMultiple: "11" }, { ...defaultLbo(), years: "8", leverage: "2", growth: "12" }]) {
      const m = lboSheet(i);
      const x = evaluate([m.sheet]);
      const r = lbo(i);
      expect(x.errors()).toEqual([]);
      close(x.num("LBO", m.out.uses), r.uses);
      close(x.num("LBO", m.out.equity), r.equity);
      close(x.num("LBO", m.out.exitDebt), r.exitDebt);
      close(x.num("LBO", m.out.exitEquity), r.exitEquity);
      close(x.num("LBO", m.out.moic), r.moic);
      close(x.num("LBO", m.out.irr), r.irr);
      close(x.num("LBO", m.out.bTotal), r.bridge.total);
    }
  });

  it("three statements: every year balances and ties to the app", () => {
    for (const i of [defaultStatements(), { ...defaultStatements(), growth: ["-10", "-5", "0", "20", "15"], repay: "500", payout: "60", cash: "5" }]) {
      const m = statementsSheet(i);
      const x = evaluate([m.sheet]);
      const r = statements(i);
      const S = "Three statements";
      expect(x.errors()).toEqual([]);
      close(x.num(S, m.out.check1), 0);
      close(x.num(S, m.out.check5), 0);
      close(x.num(S, m.out.rev5), r.years[4].revenue);
      close(x.num(S, m.out.ni1), r.years[0].netIncome);
      close(x.num(S, m.out.ni5), r.years[4].netIncome);
      close(x.num(S, m.out.cash5), r.years[4].cash);
      close(x.num(S, m.out.debt5), r.years[4].debt);
      close(x.num(S, m.out.equity5), r.years[4].equity);
      close(x.num(S, m.out.assets5), r.years[4].assets);
      close(x.num(S, m.out.cfo3), r.years[2].cfo);
      close(x.num(S, m.out.ebitda2), r.years[1].ebitda);
    }
  });

  it("comparables: percentiles ignore missing multiples, on each basis", () => {
    const rows = [
      { id: "a", name: "Alpha", ev: "1000", revenue: "400", ebitda: "100", netIncome: "50", equity: "800" },
      { id: "b", name: "Beta", ev: "1500", revenue: "500", ebitda: "125", netIncome: "", equity: "1200" },
      { id: "c", name: "Gamma", ev: "600", revenue: "", ebitda: "80", netIncome: "30", equity: "500" },
      { id: "d", name: "Delta", ev: "2400", revenue: "900", ebitda: "-20", netIncome: "110", equity: "2000" },
    ];
    for (const basis of ["ebitda", "revenue", "pe"] as const) {
      const i = { ...defaultComps(), rows, basis, targetRevenue: "300", targetEbitda: "70", targetNetIncome: "35", netDebt: "120", shares: "40" };
      const m = compsSheet(i);
      const x = evaluate([m.sheet]);
      const r = comps(i);
      close(x.num("Comparables", m.out.evLow), r.range!.ev[0]);
      close(x.num("Comparables", m.out.evMid), r.range!.ev[1]);
      close(x.num("Comparables", m.out.evHigh), r.range!.ev[2]);
      close(x.num("Comparables", m.out.eqMid), r.range!.equity[1]);
      close(x.num("Comparables", m.out.psMid), r.range!.perShare[1]);
      close(x.num("Comparables", m.out.medEbitda), r.evEbitda!.median);
      close(x.num("Comparables", m.out.meanRev), r.evRevenue!.mean);
    }
  });

  it("precedent transactions: multiples, the range and the median premium", () => {
    const i = {
      ...defaultPrecedents(),
      rows: [
        { id: "a", target: "T1", acquirer: "A1", year: "2023", ev: "900", revenue: "300", ebitda: "90", premium: "28" },
        { id: "b", target: "T2", acquirer: "A2", year: "2024", ev: "1300", revenue: "350", ebitda: "100", premium: "" },
        { id: "c", target: "T3", acquirer: "A3", year: "2025", ev: "700", revenue: "280", ebitda: "", premium: "41" },
      ],
      targetRevenue: "320", targetEbitda: "85", netDebt: "150", shares: "50", price: "14",
    };
    for (const basis of ["ebitda", "revenue"] as const) {
      const m = precedentsSheet({ ...i, basis });
      const x = evaluate([m.sheet]);
      const r = precedents({ ...i, basis });
      close(x.num("Precedents", m.out.evLow), r.range!.ev[0]);
      close(x.num("Precedents", m.out.evMid), r.range!.ev[1]);
      close(x.num("Precedents", m.out.evHigh), r.range!.ev[2]);
      close(x.num("Precedents", m.out.psMid), r.range!.perShare[1]);
      close(x.num("Precedents", m.out.premPrice), r.premiumPrice!);
    }
  });

  it("accretion and dilution, and WACC with and without comparables", () => {
    for (const i of [defaultMerger(), { ...defaultMerger(), stockPct: "0", synergies: "0", premium: "45" }]) {
      const m = mergerSheet(i);
      const x = evaluate([m.sheet]);
      const r = merger(i);
      expect(x.errors()).toEqual([]);
      close(x.num("Accretion-dilution", m.out.eps), r.proFormaEps);
      close(x.num("Accretion-dilution", m.out.accretion), r.accretion);
      close(x.num("Accretion-dilution", m.out.breakEven), r.breakEvenSynergies);
      close(x.num("Accretion-dilution", m.out.newShares), r.newShares);
    }
    const peers = [
      { id: "a", name: "P1", beta: "1.3", debtToEquity: "40", tax: "25" },
      { id: "b", name: "P2", beta: "0.9", debtToEquity: "10", tax: "21" },
      { id: "c", name: "P3", beta: "1.1", debtToEquity: "65", tax: "25" },
    ];
    for (const i of [defaultWacc(), { ...defaultWacc(), fromPeers: true, peers, sizePremium: "1.5" }]) {
      const m = waccSheet(i);
      const x = evaluate([m.sheet]);
      const r = wacc(i);
      expect(x.errors()).toEqual([]);
      close(x.num("WACC", m.out.beta), r.beta);
      close(x.num("WACC", m.out.ke), r.costOfEquity);
      close(x.num("WACC", m.out.kd), r.afterTaxDebt);
      close(x.num("WACC", m.out.wacc), r.wacc);
    }
  });

  it("writes a real .xlsx with every model, formulas intact", async () => {
    const spec = ibBook(emptyIb(), "all");
    expect(spec.sheets.map((s) => s.name)).toEqual(["About", "DCF", "WACC", "Comparables", "Precedents", "LBO", "Accretion-dilution", "Three statements"]);
    const zip = await JSZip.loadAsync(await workbookBuffer(spec));
    const names = Object.keys(zip.files).filter((f) => /^xl\/worksheets\/sheet\d+\.xml$/.test(f));
    expect(names).toHaveLength(8);
    const dcfXml = await zip.file("xl/worksheets/sheet2.xml")!.async("string");
    expect(dcfXml).toMatch(/<f>SUM\(B\d+:F\d+\)<\/f>/);
    expect(await zip.file("xl/workbook.xml")!.async("string")).toContain("fullCalcOnLoad");
    expect(ibBook(emptyIb(), "lbo").filename).toBe("LBO.xlsx");
  });
});
