/**
 * The Investment Banking models as Excel sheets with live formulas. Each function mirrors its model in ibMath, ibStatements or
 * ibCapital line for line (the tests evaluate these formulas and compare them with the app's numbers), and returns the sheet
 * plus the addresses of its headline results.
 */
import { Grid, abs, at, book, fx, head, inp, type XBook, type XCell, type XFormat, type XSheet, type XValue } from "./excel";
import type { CompsInputs, DcfInputs, LboInputs, MergerInputs } from "./ibMath";
import type { StatementInputs } from "./ibStatements";
import type { PrecedentInputs, WaccInputs } from "./ibCapital";
import type { IbData } from "./ibWorkspace";

const n = (v: unknown): number => {
  const x = parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};
const pct = (v: string) => n(v) / 100;

export interface ModelSheet {
  sheet: XSheet;
  /** Where the headline results are, by name (addresses on this sheet). */
  out: Record<string, string>;
}

const YEARS5 = [1, 2, 3, 4, 5];

/** A guard for sheets that point at rows before adding them: the next row must be the one that was promised. */
function expectRow(g: Grid, row: number) {
  if (g.next !== row) throw new Error(`${g.name}: expected row ${row}, at ${g.next}`);
}
/** An input cell for a figure that may have been left blank. */
const blankable = (v: string, value: number, fmt: XFormat = "m1"): XCell => (v.trim() === "" ? { v: null, fmt, style: "input" } : inp(value, fmt));

/* ------------------------------------------------------------------ */

export function dcfSheet(i: DcfInputs): ModelSheet {
  const g = new Grid("DCF");
  g.title("Discounted cash flow", "$ in millions, except per share. Blue cells are inputs.");
  g.section("Inputs");
  const rev0 = g.input("Revenue, last year", n(i.revenue));
  const margin = g.input("EBIT margin", pct(i.ebitMargin), "pct");
  const tax = g.input("Tax rate", pct(i.tax), "pct");
  const da = g.input("D&A, % of revenue", pct(i.da), "pct");
  const capex = g.input("Capex, % of revenue", pct(i.capex), "pct");
  const nwc = g.input("Increase in working capital, % of the change in revenue", pct(i.nwc), "pct");
  const wacc = g.input("Discount rate (WACC)", pct(i.wacc), "pct");
  const tg = g.input("Terminal growth", pct(i.terminalGrowth), "pct");
  const exitM = g.input("Exit multiple (EV/EBITDA)", n(i.exitMultiple), "x");
  const netDebt = g.input("Net debt", n(i.netDebt));
  const shares = g.input("Shares (millions)", Math.max(n(i.shares), 0.0001));
  const mid = g.input("Mid-year convention (1 = yes, 0 = no)", i.midYear ? 1 : 0, "int");
  g.blank();
  g.section("Forecast");
  const yr = g.series("", YEARS5.map((y) => head(y, "year")), "head");
  const gr = g.series("Revenue growth", YEARS5.map((_, k) => inp(pct(i.growth[k] ?? "0"), "pct")));
  const rev = g.next;
  g.series("Revenue", YEARS5.map((c) => fx(c === 1 ? `${rev0}*(1+${at(c, gr)})` : `${at(c - 1, rev)}*(1+${at(c, gr)})`)));
  const ebit = g.series("EBIT", YEARS5.map((c) => fx(`${at(c, rev)}*${margin}`)));
  const nopat = g.series("NOPAT (EBIT after tax)", YEARS5.map((c) => fx(`${at(c, ebit)}*(1-${tax})`)));
  const daRow = g.series("Plus: D&A", YEARS5.map((c) => fx(`${at(c, rev)}*${da}`)));
  const capexRow = g.series("Less: capex", YEARS5.map((c) => fx(`${at(c, rev)}*${capex}`)));
  const nwcRow = g.series("Less: increase in working capital", YEARS5.map((c) => fx(`(${at(c, rev)}-${c === 1 ? rev0 : at(c - 1, rev)})*${nwc}`)));
  const fcf = g.series("Unlevered free cash flow", YEARS5.map((c) => fx(`${at(c, nopat)}+${at(c, daRow)}-${at(c, capexRow)}-${at(c, nwcRow)}`, "m1", "total")), "total");
  const ebitda = g.series("EBITDA", YEARS5.map((c) => fx(`${at(c, ebit)}+${at(c, daRow)}`)));
  const period = g.series("Discount period (years)", YEARS5.map((c) => fx(`${at(c, yr)}-0.5*${mid}`, "dec2")));
  const factor = g.series("Discount factor", YEARS5.map((c) => fx(`1/(1+${wacc})^${at(c, period)}`, "dec2")));
  const pv = g.series("Present value of free cash flow", YEARS5.map((c) => fx(`${at(c, fcf)}*${at(c, factor)}`)));
  g.blank();
  g.section("Valuation");
  const pvFcf = g.calc("Sum of the present values", `SUM(${at(1, pv)}:${at(5, pv)})`);
  const tvP = g.calc("Terminal value, perpetuity growth", `${at(5, fcf)}*(1+${tg})/(${wacc}-${tg})`);
  const pvTvP = g.calc("Its present value", `${tvP}/(1+${wacc})^(5-0.5*${mid})`);
  const evP = g.calc("Enterprise value, perpetuity method", `${pvFcf}+${pvTvP}`, "m1", "total");
  const tvE = g.calc("Terminal value, exit multiple", `${at(5, ebitda)}*${exitM}`);
  const pvTvE = g.calc("Its present value", `${tvE}/(1+${wacc})^5`);
  const evE = g.calc("Enterprise value, exit multiple method", `${pvFcf}+${pvTvE}`, "m1", "total");
  g.blank();
  const eqP = g.calc("Equity value, perpetuity method", `${evP}-${netDebt}`);
  const psP = g.calc("Value per share, perpetuity method", `${eqP}/${shares}`, "usd2", "total");
  const eqE = g.calc("Equity value, exit multiple method", `${evE}-${netDebt}`);
  const psE = g.calc("Value per share, exit multiple method", `${eqE}/${shares}`, "usd2", "total");
  g.blank();
  g.section("Cross-checks");
  const share = g.calc("Terminal value as a share of enterprise value", `${pvTvP}/${evP}`, "pct");
  const impM = g.calc("Exit multiple implied by the perpetuity value", `${tvP}/${at(5, ebitda)}`, "x");
  const impG = g.calc("Growth implied by the exit multiple", `(${tvE}*${wacc}-${at(5, fcf)})/(${tvE}+${at(5, fcf)})`, "pct");
  g.blank();
  g.section("Value per share: discount rate (down) against terminal growth (across)");
  const steps = [-0.01, -0.005, 0, 0.005, 0.01];
  const gHead = g.next;
  g.add(head("WACC \\ growth"), ...steps.map((d) => fx(`ROUND(${tg}+${d},3)`, "pct", "total")));
  const grid: string[][] = [];
  for (const d of steps) {
    const row = g.next;
    const w = at(0, row);
    g.add(
      fx(`ROUND(${wacc}+${d},3)`, "pct", "total"),
      ...steps.map((_, k) => {
        const gr2 = at(k + 1, gHead);
        const pvs = YEARS5.map((c) => `${at(c, fcf)}/(1+${w})^${at(c, period)}`).join("+");
        return fx(`IF(${w}>${gr2},(${pvs}+${at(5, fcf)}*(1+${gr2})/(${w}-${gr2})/(1+${w})^(5-0.5*${mid})-${netDebt})/${shares},"n/a")`, "usd2");
      }),
    );
    grid.push(steps.map((_, k) => at(k + 1, row)));
  }
  return { sheet: g.sheet(), out: { pvFcf, evP, evE, eqP, psP, psE, share, impM, impG, fcf1: at(1, fcf), fcf5: at(5, fcf), gridLow: grid[0][0], gridMid: grid[2][2], gridHigh: grid[4][4], gridCorner: grid[0][4] } };
}

/* ------------------------------------------------------------------ */

export function lboSheet(i: LboInputs): ModelSheet {
  const hold = Math.max(1, Math.min(10, Math.round(n(i.years)) || 5));
  // At least seven years are laid out, so the grid at the foot can look at other holding periods.
  const span = Math.max(hold, 7);
  const cols = Array.from({ length: span }, (_, k) => k + 1);
  const g = new Grid("LBO", [40, ...Array(span).fill(13)]);
  g.title("Leveraged buyout", "$ in millions. One tranche of debt with a full cash sweep. Blue cells are inputs.");
  g.section("Inputs");
  const ebitda0 = g.input("EBITDA at entry", n(i.ebitda));
  const entry = g.input("Entry multiple", n(i.entryMultiple), "x");
  const lev = g.input("Debt, x EBITDA", n(i.leverage), "x");
  const rate = g.input("Interest rate", pct(i.interest), "pct");
  const fees = g.input("Fees, % of price", pct(i.fees), "pct");
  const growth = g.input("EBITDA growth", pct(i.growth), "pct");
  const da = g.input("D&A, % of EBITDA", pct(i.da), "pct");
  const capex = g.input("Capex, % of EBITDA", pct(i.capex), "pct");
  const nwc = g.input("Working capital, % of EBITDA", pct(i.nwc), "pct");
  const tax = g.input("Tax rate", pct(i.tax), "pct");
  const exitM = g.input("Exit multiple", n(i.exitMultiple), "x");
  const years = g.calc(`Years held (the returns below read year ${hold}; change the holding period in the app and export again)`, String(hold), "int");
  g.blank();
  g.section("Sources and uses");
  const price = g.calc("Purchase price", `${ebitda0}*${entry}`);
  const feeAmt = g.calc("Fees", `${price}*${fees}`);
  const uses = g.calc("Total uses", `${price}+${feeAmt}`, "m1", "total");
  const debt0 = g.calc("Debt", `MIN(${ebitda0}*${lev},${price})`);
  const equity = g.calc("Sponsor equity", `${uses}-${debt0}`, "m1", "total");
  g.blank();
  g.section("Debt paydown");
  g.series("", cols.map((y) => head(y, "year")), "head");
  const eb = g.next;
  g.series("EBITDA", cols.map((c) => fx(`${c === 1 ? ebitda0 : at(c - 1, eb)}*(1+${growth})`)));
  // The ending-debt row sits five rows below the beginning-debt row; it is referenced before it is added.
  const begin = g.next;
  const end = begin + 5;
  g.series("Debt at the start of the year", cols.map((c) => fx(c === 1 ? debt0 : at(c - 1, end))));
  const interest = g.series("Interest", cols.map((c) => fx(`${at(c, begin)}*${rate}`)));
  const taxes = g.series("Taxes", cols.map((c) => fx(`MAX(0,(${at(c, eb)}-${at(c, eb)}*${da}-${at(c, interest)})*${tax})`)));
  const fcf = g.series("Cash flow to repay debt", cols.map((c) => fx(`${at(c, eb)}-${at(c, eb)}*${capex}-${at(c, eb)}*${nwc}-${at(c, interest)}-${at(c, taxes)}`)));
  const paydown = g.series("Debt repaid", cols.map((c) => fx(`MAX(0,MIN(${at(c, begin)},${at(c, fcf)}))`)));
  g.series("Debt at year end", cols.map((c) => fx(`${at(c, begin)}-${at(c, paydown)}`, "m1", "total")), "total");
  const cash = g.series("Cash kept after the debt is repaid", cols.map((c) => fx(`MAX(0,${at(c, fcf)}-${at(c, paydown)})`)));
  g.blank();
  g.section("Returns");
  const exitEbitda = g.calc("EBITDA at exit", at(hold, eb));
  const exitEv = g.calc("Enterprise value at exit", `${exitEbitda}*${exitM}`);
  const exitDebt = g.calc("Less: debt remaining", at(hold, end));
  const cashSum = g.calc("Plus: cash built up", `SUM(${at(1, cash)}:${at(hold, cash)})`);
  const exitEquity = g.calc("Equity value at exit", `${exitEv}-${exitDebt}+${cashSum}`, "m1", "total");
  const moic = g.calc("Multiple of money", `${exitEquity}/${equity}`, "x", "total");
  const irr = g.calc("IRR", `IF(${moic}>0,${moic}^(1/${years})-1,-1)`, "pct", "total");
  g.blank();
  g.section("Where the return came from");
  const bGrowth = g.calc("EBITDA growth", `(${exitEbitda}-${ebitda0})*${entry}`);
  const bMult = g.calc("Change in the multiple", `(${exitM}-${entry})*${exitEbitda}`);
  const bDebt = g.calc("Debt paid down", `${debt0}-${exitDebt}+${cashSum}`);
  const bFees = g.calc("Fees", `-${feeAmt}`);
  const bTotal = g.calc("Gain in equity value", `${bGrowth}+${bMult}+${bDebt}+${bFees}`, "m1", "total");
  g.blank();
  g.section("IRR: years held (down) against exit multiple (across)");
  const mSteps = [-2, -1, 0, 1, 2];
  const mHead = g.next;
  g.add(head("Years \\ exit"), ...mSteps.map((d) => fx(`MAX(1,ROUND(${exitM}+${d},1))`, "x", "total")));
  const irrGrid: string[][] = [];
  for (const h of [3, 4, 5, 6, 7]) {
    const row = g.next;
    g.add(
      { v: h, fmt: "int", style: "total" },
      ...mSteps.map((_, k) => {
        const m2 = `(${at(h, eb)}*${at(k + 1, mHead)}-${at(h, end)}+SUM(${at(1, cash)}:${at(h, cash)}))/${equity}`;
        return fx(`IF(${m2}>0,(${m2})^(1/${at(0, row)})-1,-1)`, "pct");
      }),
    );
    irrGrid.push(mSteps.map((_, k) => at(k + 1, row)));
  }
  return { sheet: g.sheet(), out: { price, uses, debt0, equity, exitEquity, moic, irr, bTotal, exitDebt, gridLow: irrGrid[0][0], gridMid: irrGrid[2][2], gridHigh: irrGrid[4][4] } };
}

/* ------------------------------------------------------------------ */

export function statementsSheet(i: StatementInputs): ModelSheet {
  const g = new Grid("Three statements", [40, 13, 13, 13, 13, 13, 13]);
  g.title("Three-statement model", "$ in millions. The income statement, balance sheet and cash flow statement are linked; the check row stays at zero.");
  g.section("Inputs");
  const cash0 = g.input("Opening cash", n(i.cash));
  const ar0 = g.input("Opening receivables", n(i.receivables));
  const inv0 = g.input("Opening inventory", n(i.inventory));
  const ppe0 = g.input("Opening PP&E", n(i.ppe));
  const ap0 = g.input("Opening payables", n(i.payables));
  const debt0 = g.input("Opening debt", n(i.debt));
  const rev0 = g.input("Revenue, last year", n(i.revenue));
  const cogsP = g.input("COGS, % of revenue", pct(i.cogs), "pct");
  const sgaP = g.input("SG&A, % of revenue", pct(i.sga), "pct");
  const daP = g.input("D&A, % of revenue", pct(i.da), "pct");
  const capexP = g.input("Capex, % of revenue", pct(i.capex), "pct");
  const arDays = g.input("Receivables, days of revenue", n(i.arDays), "int");
  const invDays = g.input("Inventory, days of COGS", n(i.invDays), "int");
  const apDays = g.input("Payables, days of COGS", n(i.apDays), "int");
  const tax = g.input("Tax rate", pct(i.tax), "pct");
  const rate = g.input("Interest rate on debt", pct(i.interest), "pct");
  const cashRate = g.input("Interest earned on cash", pct(i.cashRate), "pct");
  const repay = g.input("Debt repaid each year", n(i.repay));
  const payout = g.input("Dividends, % of net income", pct(i.payout), "pct");
  g.blank();
  // Column B is the opening year; C to G are years 1 to 5.
  const Y = [2, 3, 4, 5, 6];
  const headRow = (): XValue[] => [head("Opening"), ...YEARS5.map((y) => head(y, "year"))];
  g.section("Income statement");
  g.series("", headRow(), "head");
  const gr = g.series("Revenue growth", [null, ...YEARS5.map((_, k) => inp(pct(i.growth[k] ?? "0"), "pct"))]);
  const rev = g.next;
  g.series("Revenue", [fx(rev0), ...Y.map((c) => fx(`${at(c - 1, rev)}*(1+${at(c, gr)})`))]);
  const cogs = g.series("Cost of goods sold", [null, ...Y.map((c) => fx(`${at(c, rev)}*${cogsP}`))]);
  const gross = g.series("Gross profit", [null, ...Y.map((c) => fx(`${at(c, rev)}-${at(c, cogs)}`))]);
  const sga = g.series("SG&A", [null, ...Y.map((c) => fx(`${at(c, rev)}*${sgaP}`))]);
  const ebitda = g.series("EBITDA", [null, ...Y.map((c) => fx(`${at(c, gross)}-${at(c, sga)}`, "m1", "total"))], "total");
  const da = g.series("D&A", [null, ...Y.map((c) => fx(`${at(c, rev)}*${daP}`))]);
  const ebit = g.series("EBIT", [null, ...Y.map((c) => fx(`${at(c, ebitda)}-${at(c, da)}`))]);
  // The balance sheet rows are added below; their row numbers are fixed here so the interest lines can point at them
  // (five income lines, a blank, the section title and the column heads come first).
  const cashRow = g.next + 8;
  const arRow = cashRow + 1;
  const invRow = cashRow + 2;
  const ppeRow = cashRow + 3;
  const assetsRow = cashRow + 4;
  const apRow = cashRow + 5;
  const debtRow = cashRow + 6;
  const liabRow = cashRow + 7;
  const equityRow = cashRow + 8;
  const intExp = g.series("Interest expense", [null, ...Y.map((c) => fx(`${at(c - 1, debtRow)}*${rate}`))]);
  const intInc = g.series("Interest income", [null, ...Y.map((c) => fx(`MAX(0,${at(c - 1, cashRow)})*${cashRate}`))]);
  const ebt = g.series("Pre-tax income", [null, ...Y.map((c) => fx(`${at(c, ebit)}-${at(c, intExp)}+${at(c, intInc)}`))]);
  const taxRow = g.series("Taxes", [null, ...Y.map((c) => fx(`MAX(0,${at(c, ebt)})*${tax}`))]);
  const ni = g.series("Net income", [null, ...Y.map((c) => fx(`${at(c, ebt)}-${at(c, taxRow)}`, "m1", "total"))], "total");
  g.blank();
  // Cash flow rows, likewise fixed ahead: after equity come the check row, a blank, the section title and the column heads.
  const cfNi = equityRow + 5;
  const cfCapex = cfNi + 6;
  const cfRepay = cfNi + 8;
  const cfDiv = cfNi + 9;
  const cfNet = cfNi + 11;
  g.section("Balance sheet");
  g.series("", headRow(), "head");
  expectRow(g, cashRow);
  g.series("Cash", [fx(cash0), ...Y.map((c) => fx(`${at(c - 1, cashRow)}+${at(c, cfNet)}`))]);
  g.series("Receivables", [fx(ar0), ...Y.map((c) => fx(`${at(c, rev)}*${arDays}/365`))]);
  g.series("Inventory", [fx(inv0), ...Y.map((c) => fx(`${at(c, cogs)}*${invDays}/365`))]);
  g.series("PP&E", [fx(ppe0), ...Y.map((c) => fx(`${at(c - 1, ppeRow)}-${at(c, cfCapex)}-${at(c, da)}`))]);
  g.series("Total assets", [1, ...Y].map((c) => fx(`SUM(${at(c, cashRow)}:${at(c, ppeRow)})`, "m1", "total")), "total");
  g.series("Payables", [fx(ap0), ...Y.map((c) => fx(`${at(c, cogs)}*${apDays}/365`))]);
  g.series("Debt", [fx(debt0), ...Y.map((c) => fx(`${at(c - 1, debtRow)}+${at(c, cfRepay)}`))]);
  g.series("Total liabilities", [1, ...Y].map((c) => fx(`${at(c, apRow)}+${at(c, debtRow)}`, "m1", "total")), "total");
  g.series("Equity", [fx(`${at(1, assetsRow)}-${at(1, liabRow)}`), ...Y.map((c) => fx(`${at(c - 1, equityRow)}+${at(c, ni)}+${at(c, cfDiv)}`))]);
  const check = g.series("Check: assets less liabilities and equity (should be zero)", [1, ...Y].map((c) => fx(`${at(c, assetsRow)}-${at(c, liabRow)}-${at(c, equityRow)}`, "m1", "good")), "good");
  g.blank();
  g.section("Cash flow statement");
  g.series("", headRow(), "head");
  expectRow(g, cfNi);
  g.series("Net income", [null, ...Y.map((c) => fx(at(c, ni)))]);
  g.series("Plus: D&A", [null, ...Y.map((c) => fx(at(c, da)))]);
  g.series("Change in receivables", [null, ...Y.map((c) => fx(`-(${at(c, arRow)}-${at(c - 1, arRow)})`))]);
  g.series("Change in inventory", [null, ...Y.map((c) => fx(`-(${at(c, invRow)}-${at(c - 1, invRow)})`))]);
  g.series("Change in payables", [null, ...Y.map((c) => fx(`${at(c, apRow)}-${at(c - 1, apRow)}`))]);
  const cfo = g.series("Cash from operations", [null, ...Y.map((c) => fx(`SUM(${at(c, cfNi)}:${at(c, cfNi + 4)})`, "m1", "total"))], "total");
  g.series("Capex (cash from investing)", [null, ...Y.map((c) => fx(`-${at(c, rev)}*${capexP}`))]);
  g.series("", []);
  g.series("Debt repaid", [null, ...Y.map((c) => fx(`-MIN(${at(c - 1, debtRow)},${repay})`))]);
  g.series("Dividends", [null, ...Y.map((c) => fx(`-MAX(0,${at(c, ni)})*${payout}`))]);
  const cff = g.series("Cash from financing", [null, ...Y.map((c) => fx(`${at(c, cfRepay)}+${at(c, cfDiv)}`, "m1", "total"))], "total");
  g.series("Net change in cash", [null, ...Y.map((c) => fx(`${at(c, cfo)}+${at(c, cfCapex)}+${at(c, cff)}`, "m1", "total"))], "total");
  return {
    sheet: g.sheet(),
    out: { rev5: at(6, rev), ni1: at(2, ni), ni5: at(6, ni), cash5: at(6, cashRow), equity5: at(6, equityRow), debt5: at(6, debtRow), assets5: at(6, assetsRow), check1: at(2, check), check5: at(6, check), cfo3: at(4, cfo), ebitda2: at(3, ebitda) },
  };
}

/* ------------------------------------------------------------------ */

/** The six summary rows (low to high) for one column of multiples. */
function statRows(g: Grid, label: (s: string) => string, ranges: { range: string; fmt: "x" | "pct" }[]) {
  const fns: [string, (r: string) => string][] = [
    ["Low", (r) => `MIN(${r})`],
    ["25th percentile", (r) => `QUARTILE(${r},1)`],
    ["Median", (r) => `MEDIAN(${r})`],
    ["Mean", (r) => `AVERAGE(${r})`],
    ["75th percentile", (r) => `QUARTILE(${r},3)`],
    ["High", (r) => `MAX(${r})`],
  ];
  const rows: Record<string, number> = {};
  for (const [name, f] of fns) rows[name] = g.series(label(name), ranges.map((x) => fx(f(x.range), x.fmt)));
  return rows;
}

export function compsSheet(i: CompsInputs): ModelSheet {
  const g = new Grid("Comparables", [30, 13, 13, 13, 13, 13, 12, 12, 12, 26, 14]);
  g.title("Trading comparables", "$ in millions. Enter each company's figures from its own filings or from Capital IQ, and name the source and date.");
  g.section("Comparable companies");
  g.add(...["Company", "EV", "Revenue", "EBITDA", "Net income", "Equity value", "EV/Revenue", "EV/EBITDA", "P/E", "Source", "Date pulled"].map((h) => head(h)));
  const first = g.next;
  const list = i.rows.length ? i.rows : [{ id: "", name: "", ev: "", revenue: "", ebitda: "", netIncome: "", equity: "", source: "", asOf: "" }];
  for (const r of list) {
    const row = g.next;
    const cell = (v: string) => blankable(v, n(v));
    g.add({ v: r.name, style: "input" }, cell(r.ev), cell(r.revenue), cell(r.ebitda), cell(r.netIncome), cell(r.equity),
      fx(`IF(AND(${at(1, row)}>0,${at(2, row)}>0),${at(1, row)}/${at(2, row)},"")`, "x"),
      fx(`IF(AND(${at(1, row)}>0,${at(3, row)}>0),${at(1, row)}/${at(3, row)},"")`, "x"),
      fx(`IF(AND(${at(5, row)}>0,${at(4, row)}>0),${at(5, row)}/${at(4, row)},"")`, "x"),
      { v: r.source, style: "input" }, { v: r.asOf, style: "input" });
  }
  const last = g.next - 1;
  g.blank();
  g.section("Summary of the multiples");
  g.add(head(""), head("EV/Revenue"), head("EV/EBITDA"), head("P/E"));
  const st = statRows(g, (s) => s, [6, 7, 8].map((c) => ({ range: `${abs(c, first)}:${abs(c, last)}`, fmt: "x" as const })));
  g.blank();
  g.section("The target");
  const tRev = g.input("Target revenue", n(i.targetRevenue));
  const tEbitda = g.input("Target EBITDA", n(i.targetEbitda));
  const tNi = g.input("Target net income", n(i.targetNetIncome));
  const netDebt = g.input("Net debt", n(i.netDebt));
  const shares = g.input("Shares (millions)", Math.max(n(i.shares), 0.0001));
  g.blank();
  const col = i.basis === "revenue" ? 1 : i.basis === "ebitda" ? 2 : 3;
  const metric = i.basis === "revenue" ? tRev : i.basis === "ebitda" ? tEbitda : tNi;
  const label = i.basis === "revenue" ? "EV/Revenue" : i.basis === "ebitda" ? "EV/EBITDA" : "P/E";
  g.section(`Implied value, on ${label}`);
  g.add(head(""), head("25th"), head("Median"), head("75th"));
  const mults = [st["25th percentile"], st["Median"], st["75th percentile"]].map((r) => abs(col, r));
  const pe = i.basis === "pe";
  const ev = g.series("Enterprise value", mults.map((mref) => fx(pe ? `${mref}*${metric}+${netDebt}` : `${mref}*${metric}`)));
  const eq = g.series("Equity value", mults.map((mref, k) => fx(pe ? `${mref}*${metric}` : `${at(k + 1, ev)}-${netDebt}`)));
  const ps = g.series("Value per share", mults.map((_, k) => fx(`${at(k + 1, eq)}/${shares}`, "usd2", "total")), "total");
  return { sheet: g.sheet(), out: { evLow: at(1, ev), evMid: at(2, ev), evHigh: at(3, ev), eqMid: at(2, eq), psMid: at(2, ps), medEbitda: at(2, st["Median"]), meanRev: at(1, st["Mean"]) } };
}

export function precedentsSheet(i: PrecedentInputs): ModelSheet {
  const g = new Grid("Precedents", [26, 22, 9, 13, 13, 13, 11, 12, 12, 26, 14]);
  g.title("Precedent transactions", "$ in millions. Enter each deal from its announcement or from Capital IQ, and name the source and date.");
  g.section("Transactions");
  g.add(...["Target", "Acquirer", "Year", "Deal EV", "Revenue", "EBITDA", "Premium", "EV/Revenue", "EV/EBITDA", "Source", "Date pulled"].map((h) => head(h)));
  const first = g.next;
  const list = i.rows.length ? i.rows : [{ id: "", target: "", acquirer: "", year: "", ev: "", revenue: "", ebitda: "", premium: "", source: "", asOf: "" }];
  for (const r of list) {
    const row = g.next;
    const cell = (v: string) => blankable(v, n(v));
    g.add({ v: r.target, style: "input" }, { v: r.acquirer, style: "input" }, { v: r.year, style: "input" }, cell(r.ev), cell(r.revenue), cell(r.ebitda),
      blankable(n(r.premium) > 0 ? r.premium : "", pct(r.premium), "pct"),
      fx(`IF(AND(${at(3, row)}>0,${at(4, row)}>0),${at(3, row)}/${at(4, row)},"")`, "x"),
      fx(`IF(AND(${at(3, row)}>0,${at(5, row)}>0),${at(3, row)}/${at(5, row)},"")`, "x"),
      { v: r.source, style: "input" }, { v: r.asOf, style: "input" });
  }
  const last = g.next - 1;
  g.blank();
  g.section("Summary");
  g.add(head(""), head("EV/Revenue"), head("EV/EBITDA"), head("Premium"));
  const st = statRows(g, (s) => s, [{ range: `${abs(7, first)}:${abs(7, last)}`, fmt: "x" }, { range: `${abs(8, first)}:${abs(8, last)}`, fmt: "x" }, { range: `${abs(6, first)}:${abs(6, last)}`, fmt: "pct" }]);
  g.blank();
  g.section("The target");
  const tRev = g.input("Target revenue", n(i.targetRevenue));
  const tEbitda = g.input("Target EBITDA", n(i.targetEbitda));
  const netDebt = g.input("Net debt", n(i.netDebt));
  const shares = g.input("Shares (millions)", Math.max(n(i.shares), 0.0001));
  const price = g.input("Current share price", n(i.price), "usd2");
  g.blank();
  const col = i.basis === "revenue" ? 1 : 2;
  const metric = i.basis === "revenue" ? tRev : tEbitda;
  g.section(`Implied value, on ${i.basis === "revenue" ? "EV/Revenue" : "EV/EBITDA"}`);
  g.add(head(""), head("25th"), head("Median"), head("75th"));
  const mults = [st["25th percentile"], st["Median"], st["75th percentile"]].map((r) => abs(col, r));
  const ev = g.series("Enterprise value", mults.map((mref) => fx(`${mref}*${metric}`)));
  const eq = g.series("Equity value", mults.map((_, k) => fx(`${at(k + 1, ev)}-${netDebt}`)));
  const ps = g.series("Value per share", mults.map((_, k) => fx(`${at(k + 1, eq)}/${shares}`, "usd2", "total")), "total");
  g.blank();
  const premPrice = g.calc("Price at the median premium", `${price}*(1+${abs(3, st["Median"])})`, "usd2", "total");
  return { sheet: g.sheet(), out: { evLow: at(1, ev), evMid: at(2, ev), evHigh: at(3, ev), psMid: at(2, ps), premPrice } };
}

/* ------------------------------------------------------------------ */

export function mergerSheet(i: MergerInputs): ModelSheet {
  const g = new Grid("Accretion-dilution");
  g.title("Merger accretion and dilution", "$ in millions, except per share. Blue cells are inputs.");
  g.section("Inputs");
  const aPrice = g.input("Acquirer share price", n(i.acqPrice), "usd2");
  const aShares = g.input("Acquirer shares (millions)", n(i.acqShares));
  const aNi = g.input("Acquirer net income", n(i.acqNetIncome));
  const tPrice = g.input("Target share price", n(i.tgtPrice), "usd2");
  const tShares = g.input("Target shares (millions)", n(i.tgtShares));
  const tNi = g.input("Target net income", n(i.tgtNetIncome));
  const prem = g.input("Offer premium", pct(i.premium), "pct");
  const stock = g.input("Share of the price paid in stock", Math.min(1, Math.max(0, pct(i.stockPct))), "pct");
  const cost = g.input("Pre-tax cost of the cash", pct(i.costOfCash), "pct");
  const syn = g.input("Pre-tax synergies", n(i.synergies));
  const tax = g.input("Tax rate", pct(i.tax), "pct");
  g.blank();
  g.section("The deal");
  const offer = g.calc("Offer price per share", `${tPrice}*(1+${prem})`, "usd2");
  const purchase = g.calc("Purchase price", `${offer}*${tShares}`);
  const stockIssued = g.calc("Paid in stock", `${purchase}*${stock}`);
  const cashPaid = g.calc("Paid in cash", `${purchase}-${stockIssued}`);
  const newShares = g.calc("New shares issued (millions)", `${stockIssued}/${aPrice}`);
  g.blank();
  g.section("Earnings per share");
  const standalone = g.calc("Acquirer EPS, standalone", `${aNi}/${aShares}`, "usd2");
  const financing = g.calc("After-tax cost of the cash", `${cashPaid}*${cost}*(1-${tax})`);
  const synAfter = g.calc("After-tax synergies", `${syn}*(1-${tax})`);
  const income = g.calc("Pro forma net income", `${aNi}+${tNi}+${synAfter}-${financing}`);
  const shares = g.calc("Pro forma shares (millions)", `${aShares}+${newShares}`);
  const eps = g.calc("Pro forma EPS", `${income}/${shares}`, "usd2", "total");
  const accretion = g.calc("Accretion (dilution)", `${eps}/${standalone}-1`, "pct2", "total");
  const breakEven = g.calc("Pre-tax synergies to break even", `MAX(0,(${standalone}*${shares}-${aNi}-${tNi}+${financing})/(1-${tax}))`);
  g.blank();
  g.section("Rule of thumb");
  g.calc("Acquirer P/E", `${aPrice}*${aShares}/${aNi}`, "x");
  g.calc("P/E paid for the target", `${purchase}/${tNi}`, "x");
  return { sheet: g.sheet(), out: { offer, purchase, newShares, eps, accretion, breakEven, standalone } };
}

/* ------------------------------------------------------------------ */

export function waccSheet(i: WaccInputs): ModelSheet {
  const g = new Grid("WACC", [44, 14, 14, 14, 16]);
  g.title("Cost of capital (WACC)", "Rates are percents; equity and debt are market values in $ millions. Name the source of each input.");
  g.section("Inputs");
  const rf = g.input("Risk-free rate (10-year Treasury)", pct(i.riskFree), "pct2");
  const erp = g.input("Equity risk premium", pct(i.erp), "pct2");
  const size = g.input("Size or company premium", pct(i.sizePremium), "pct2");
  const kdPre = g.input("Pre-tax cost of debt", pct(i.costOfDebt), "pct2");
  const tax = g.input("Tax rate", pct(i.tax), "pct");
  const e = g.input("Market value of equity", n(i.equity));
  const d = g.input("Market value of debt", n(i.debt));
  g.blank();
  const peers = i.fromPeers ? i.peers.filter((p) => n(p.beta) > 0) : [];
  let beta: string;
  if (peers.length) {
    g.section("Beta from comparables");
    g.add(head("Company"), head("Levered beta"), head("Debt / equity"), head("Tax rate"), head("Unlevered beta"));
    const first = g.next;
    for (const p of peers) {
      const row = g.next;
      g.add({ v: p.name, style: "input" }, inp(n(p.beta), "dec2"), inp(pct(p.debtToEquity), "pct"), inp(pct(p.tax), "pct"), fx(`${at(1, row)}/(1+(1-${at(3, row)})*${at(2, row)})`, "dec2"));
    }
    const last = g.next - 1;
    const med = g.calc("Median unlevered beta", `MEDIAN(${abs(4, first)}:${abs(4, last)})`, "dec2");
    beta = g.calc("Relevered at this company's debt / equity", `${med}*(1+(1-${tax})*${d}/${e})`, "dec2", "total");
  } else {
    g.section("Beta");
    beta = g.input("Levered beta", n(i.beta), "dec2");
  }
  g.blank();
  g.section("Cost of capital");
  const ke = g.calc("Cost of equity (CAPM)", `${rf}+${beta}*${erp}+${size}`, "pct2");
  const kd = g.calc("After-tax cost of debt", `${kdPre}*(1-${tax})`, "pct2");
  const we = g.calc("Weight of equity", `${e}/(${e}+${d})`, "pct");
  const wd = g.calc("Weight of debt", `${d}/(${e}+${d})`, "pct");
  const w = g.calc("WACC", `${we}*${ke}+${wd}*${kd}`, "pct2", "total");
  g.blank();
  g.section("WACC: beta (down) against the equity risk premium (across)");
  const eSteps = [-0.01, -0.005, 0, 0.005, 0.01];
  const eHead = g.next;
  g.add(head("Beta \\ premium"), ...eSteps.map((x) => fx(`ROUND(${erp}+${x},3)`, "pct", "total")));
  const wGrid: string[][] = [];
  for (const x of [-0.2, -0.1, 0, 0.1, 0.2]) {
    const row = g.next;
    g.add(fx(`ROUND(${beta}+${x},2)`, "dec2", "total"), ...eSteps.map((_, k) => fx(`${we}*(${rf}+${at(0, row)}*${at(k + 1, eHead)}+${size})+${wd}*${kd}`, "pct2")));
    wGrid.push(eSteps.map((_, k) => at(k + 1, row)));
  }
  return { sheet: g.sheet(), out: { beta, ke, kd, we, wacc: w, gridLow: wGrid[0][0], gridMid: wGrid[2][2], gridHigh: wGrid[4][4] } };
}

/* ------------------------------------------------------------------ */

export type IbModel = "dcf" | "wacc" | "comps" | "precedents" | "lbo" | "merger" | "statements";
const TITLES: Record<IbModel, string> = { dcf: "DCF", wacc: "WACC", comps: "Trading comparables", precedents: "Precedent transactions", lbo: "LBO", merger: "Accretion and dilution", statements: "Three-statement model" };

export function ibSheet(d: IbData, model: IbModel): ModelSheet {
  if (model === "dcf") return dcfSheet(d.dcf);
  if (model === "wacc") return waccSheet(d.wacc);
  if (model === "comps") return compsSheet(d.comps);
  if (model === "precedents") return precedentsSheet(d.precedents);
  if (model === "lbo") return lboSheet(d.lbo);
  if (model === "merger") return mergerSheet(d.merger);
  return statementsSheet(d.statements);
}

/** One model as a workbook, or every model in one workbook. */
export function ibBook(d: IbData, model: IbModel | "all"): XBook {
  const models: IbModel[] = model === "all" ? ["dcf", "wacc", "comps", "precedents", "lbo", "merger", "statements"] : [model];
  return book(model === "all" ? "Investment Banking Models" : TITLES[model], models.map((mm) => ibSheet(d, mm).sheet), ["Amounts are in millions of dollars (shares in millions, per-share figures in dollars)."]);
}
