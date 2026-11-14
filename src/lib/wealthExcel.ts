/**
 * The wealth models as Excel sheets: the backtest and the estate snapshot with live formulas, a client's personal financial
 * statements (balance sheet, monthly and yearly cash flow, key ratios) with live formulas, and the withdrawal study as a
 * table of results. The tests evaluate the formulas and compare them with the app's numbers.
 */
import { Grid, abs, at, book, fx, head, inp, type XBook, type XValue } from "./excel";
import type { ModelSheet } from "./ibExcel";
import { HISTORY, HISTORY_SOURCE } from "./marketHistory";
import { ASSETS, ESTATE_DOCS, STRATEGIES, TITLING, backtest, withdrawStudy, type BacktestInputs, type EstateInputs, type WealthModels, type WithdrawInputs } from "./wealthModels";
import type { WealthPlan } from "./wealthMath";

const n = (v: unknown): number => {
  const x = parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};

/* ------------------------------------------------------------------ */

export function backtestSheet(i: BacktestInputs): ModelSheet | null {
  const r = backtest(i);
  if (!r.valid) return null;
  const K = ASSETS.length;
  const g = new Grid("Backtest", [22, ...Array(K + 5 + (i.rebalance ? 0 : 2 * K)).fill(13)]);
  g.title("Portfolio backtest", `${i.real ? "Returns are after inflation. " : ""}${HISTORY_SOURCE}`);
  g.section("Inputs");
  const initial = g.input("Starting amount", n(i.initial), "usd0");
  const yearly = g.input("Added at the end of each year", n(i.yearly), "usd0");
  g.blank();
  g.add(head("Target mix"), ...ASSETS.map((a) => head(a.label)));
  const typed = g.add({ v: "Weight", style: "label" }, ...ASSETS.map((a) => inp(Math.max(0, n(i.weights[a.id])) / 100, "pct")));
  const typedRange = `${abs(1, typed)}:${abs(K, typed)}`;
  g.add({ v: "Total (should be 100%)", style: "label" }, fx(`SUM(${typedRange})`, "pct", "total"));
  // The weights actually used are scaled to add to exactly 100%.
  const wRow = g.add({ v: "Weight used", style: "label" }, ...ASSETS.map((_, a) => fx(`${at(a + 1, typed)}/SUM(${typedRange})`, "pct")));
  const weights = `${abs(1, wRow)}:${abs(K, wRow)}`;
  g.blank();
  g.section(i.rebalance ? "Year by year (rebalanced to the target mix every year)" : "Year by year (never rebalanced: each asset grows on its own)");
  // Columns: year, the seven returns, portfolio return, value, growth of $1, running high, fall from the high; then,
  // when the mix is left to drift, the dollars in each asset and $1 split by the starting weights and left alone.
  const cRet = K + 1;
  const cVal = K + 2;
  const cIdx = K + 3;
  const cPeak = K + 4;
  const cDd = K + 5;
  const cHold = K + 6;
  const cDrift = cHold + K;
  g.add(head("Year"), ...ASSETS.map((a) => head(a.label)), head("Portfolio"), head("Value"), head("Growth of $1"), head("High so far"), head("Fall from high"),
    ...(i.rebalance ? [] : [...ASSETS.map((a) => head(`$ in ${a.label}`)), ...ASSETS.map((a) => head(`$1: ${a.label}`))]));
  const first = g.next;
  const rows = HISTORY.filter((h) => h.year >= Math.round(n(i.start)) && h.year <= Math.round(n(i.end)));
  rows.forEach((h, k) => {
    const row = g.next;
    const prev = row - 1;
    const rets = `${at(1, row)}:${at(K, row)}`;
    const cells: XValue[] = [{ v: h.year, style: "label" }, ...ASSETS.map((a) => inp(i.real ? (1 + h[a.id] / 100) / (1 + h.inflation / 100) - 1 : h[a.id] / 100, "pct2"))];
    if (i.rebalance) {
      cells.push(fx(`SUMPRODUCT(${weights},${rets})`, "pct2"));
      cells.push(fx(`${k === 0 ? initial : at(cVal, prev)}*(1+${at(cRet, row)})+${yearly}`, "usd0"));
      cells.push(fx(`${k === 0 ? "1" : at(cIdx, prev)}*(1+${at(cRet, row)})`, "dec2"));
    } else {
      const drift = `SUM(${at(cDrift, row)}:${at(cDrift + K - 1, row)})`;
      cells.push(fx(k === 0 ? `${drift}-1` : `${drift}/SUM(${at(cDrift, prev)}:${at(cDrift + K - 1, prev)})-1`, "pct2"));
      cells.push(fx(`SUM(${at(cHold, row)}:${at(cHold + K - 1, row)})`, "usd0"));
      cells.push(fx(drift, "dec2"));
    }
    cells.push(fx(k === 0 ? `MAX(1,${at(cIdx, row)})` : `MAX(${at(cPeak, prev)},${at(cIdx, row)})`, "dec2"));
    cells.push(fx(`1-${at(cIdx, row)}/${at(cPeak, row)}`, "pct"));
    if (!i.rebalance) {
      ASSETS.forEach((_, a) => cells.push(fx(`${k === 0 ? `${initial}*${abs(a + 1, wRow)}` : at(cHold + a, prev)}*(1+${at(a + 1, row)})+${yearly}*${abs(a + 1, wRow)}`, "usd0")));
      ASSETS.forEach((_, a) => cells.push(fx(`${k === 0 ? abs(a + 1, wRow) : at(cDrift + a, prev)}*(1+${at(a + 1, row)})`, "dec2")));
    }
    g.add(...cells);
  });
  const last = g.next - 1;
  const col = (c: number) => `${abs(c, first)}:${abs(c, last)}`;
  g.blank();
  g.section("Results");
  const ending = g.calc("Ending value", at(cVal, last), "usd0", "total");
  const contributed = g.calc("Put in altogether", `${initial}+${yearly}*${rows.length}`, "usd0");
  const cagr = g.calc("Compound yearly return (of $1 left alone)", `${at(cIdx, last)}^(1/${rows.length})-1`, "pct2", "total");
  const vol = rows.length > 1 ? g.calc("Volatility (standard deviation of yearly returns)", `STDEV(${col(cRet)})`, "pct2") : g.calc("Volatility (standard deviation of yearly returns)", "0", "pct2");
  const best = g.calc("Best year", `MAX(${col(cRet)})`, "pct2");
  const worst = g.calc("Worst year", `MIN(${col(cRet)})`, "pct2");
  const maxDd = g.calc("Deepest fall between year-ends", `MAX(${col(cDd)})`, "pct2");
  g.blank();
  g.note("No fees, taxes or trading costs. History shows what happened, not what will happen.");
  return { sheet: g.sheet(), out: { ending, contributed, cagr, vol, best, worst, maxDd } };
}

/* ------------------------------------------------------------------ */

export function estateSheet(i: EstateInputs): ModelSheet {
  const g = new Grid("Estate snapshot", [44, 16, 44, 16]);
  g.title("Estate snapshot", "Illustrative. Dollars. Confirm the exemption and rate; state taxes are not modeled. Wills, trusts and tax planning are an attorney's and a CPA's work.");
  g.section("What is owned, and how it is titled");
  g.add(head("Asset"), head("Value"), head("How it is titled"));
  const first = g.next;
  const list = i.assets.length ? i.assets : [{ id: "", name: "", value: "", titling: "sole" as const }];
  for (const a of list) g.add({ v: a.name, style: "input" }, a.value.trim() === "" ? { v: null, fmt: "usd0", style: "input" } : inp(Math.max(0, n(a.value)), "usd0"), { v: TITLING.find((t) => t.id === a.titling)!.label, style: "input" });
  const last = g.next - 1;
  const values = `${abs(1, first)}:${abs(1, last)}`;
  const titles = `${abs(2, first)}:${abs(2, last)}`;
  g.blank();
  g.section("Inputs");
  const debts = g.input("Debts", Math.max(0, n(i.debts)), "usd0");
  const exemption = g.input("Federal exemption per person", Math.max(0, n(i.exemption)), "usd0");
  const people = g.input("Exemptions available (1 single, 2 married with portability)", i.married ? 2 : 1, "int");
  const rate = g.input("Rate above the exemption", n(i.rate) / 100, "pct");
  g.blank();
  g.section("The estate");
  const gross = g.calc("Everything listed", `SUM(${values})`, "usd0");
  const net = g.calc("Net estate", `MAX(0,${gross}-${debts})`, "usd0", "total");
  const taxable = g.calc("Above the exemption", `MAX(0,${net}-${exemption}*${people})`, "usd0");
  const tax = g.calc("Federal estate tax, before any planning", `${taxable}*${rate}`, "usd0", "total");
  g.blank();
  g.section("How it passes");
  g.add(head("Titling"), head("Amount"), head("Passes"), head("Share"));
  const routes: Record<string, number> = {};
  for (const t of TITLING) {
    const row = g.next;
    routes[t.id] = g.add({ v: t.label, style: "label" }, fx(`SUMIF(${titles},${at(0, row)},${values})`, "usd0"), t.passes, fx(`IF(${gross}>0,${at(1, row)}/${gross},0)`, "pct"));
  }
  g.blank();
  g.section("Documents");
  for (const d of ESTATE_DOCS) g.add({ v: d.label, style: "label" }, { v: i.docs[d.id] ? "In place" : "To discuss", style: i.docs[d.id] ? "good" : "input" }, d.why);
  return { sheet: g.sheet(), out: { gross, net, taxable, tax, probate: at(1, routes.sole), probateShare: at(3, routes.sole), insurance: at(1, routes.insurance) } };
}

/* ------------------------------------------------------------------ */

/** The withdrawal study as tables of results (the replay itself is done in the app). */
export function withdrawSheet(i: WithdrawInputs): ModelSheet | null {
  const r = withdrawStudy(i);
  if (!r.valid) return null;
  const g = new Grid("Withdrawal study", [40, 18, 18, 18]);
  g.title("Withdrawal strategies over history", `Results worked out in the app from every ${Math.round(n(i.years))}-year retirement starting ${r.firstStart} to ${r.lastStart}. In the starting year's dollars. ${HISTORY_SOURCE}`);
  g.section("Inputs used");
  g.add("Starting balance", { v: n(i.balance), fmt: "usd0" });
  g.add("First year's spending", { v: n(i.spend), fmt: "usd0" });
  g.add("Years", { v: Math.round(n(i.years)), fmt: "int" });
  g.add("In stocks (the rest in 10-year Treasuries)", { v: Math.min(100, Math.max(0, n(i.stockPct))) / 100, fmt: "pct" });
  g.blank();
  g.section("Results by strategy");
  g.add(head(""), ...STRATEGIES.map((s) => head(s.name)));
  const row = (label: string, pick: (s: (typeof r.strategies)[number]) => number, fmt: "pct" | "usd0" | "int") => g.add({ v: label, style: "label" }, ...r.strategies.map((s) => ({ v: pick(s), fmt })));
  const success = row("Starting years in which the money lasted", (s) => s.success, "pct");
  row("Starting years tested", (s) => s.windows, "int");
  row("Ending balance, median", (s) => s.medianEnd, "usd0");
  row("Ending balance, worst", (s) => s.worstEnd, "usd0");
  row("Lowest yearly income, median", (s) => s.medianLowIncome, "usd0");
  row("Lowest yearly income, worst", (s) => s.worstLowIncome, "usd0");
  row("Average yearly income, median", (s) => s.medianAvgIncome, "usd0");
  g.add({ v: "Hardest starting year", style: "label" }, ...r.strategies.map((s) => ({ v: String(s.hardestStart) })));
  g.blank();
  g.section("Ending balance by starting year");
  g.add(head("Start"), ...STRATEGIES.map((s) => head(s.name)));
  for (const b of r.byStart) g.add({ v: String(b.start), style: "label" }, { v: b.constant, fmt: "usd0" }, { v: b.percent, fmt: "usd0" }, { v: b.guardrails, fmt: "usd0" });
  return { sheet: g.sheet(), out: { success: at(1, success) } };
}

/* ------------------------------------------------------------------ */

const KIND_LABEL: Record<string, string> = { cash: "Cash", brokerage: "Investments", retirement: "Retirement accounts", education: "Education accounts", home: "Home", other: "Other", card: "Credit card", student: "Student loan", auto: "Car loan", mortgage: "Mortgage" };

/** A client's personal financial statements from their plan: what is owned and owed, where the month goes, and the key ratios. */
export function statementsOfClient(plan: WealthPlan): ModelSheet {
  const g = new Grid("Financial statements", [40, 20, 16, 16]);
  g.title(`Personal financial statements${plan.client.name ? `: ${plan.client.name}` : ""}`, "Dollars, from figures the client provided. Illustrative and educational; not an audited statement.");
  g.section("Statement of financial position (what is owned and owed)");
  g.add(head("Assets"), head("Kind"), head("Value"));
  const aFirst = g.next;
  const assets = plan.snapshot.assets.length ? plan.snapshot.assets : [{ id: "", name: "", kind: "cash" as const, value: "" }];
  for (const a of assets) g.add({ v: a.name, style: "input" }, { v: KIND_LABEL[a.kind], style: "input" }, inp(n(a.value), "usd0"));
  const aLast = g.next - 1;
  const aVals = `${abs(2, aFirst)}:${abs(2, aLast)}`;
  const aKinds = `${abs(1, aFirst)}:${abs(1, aLast)}`;
  const totalAssets = abs(2, g.add({ v: "Total assets", style: "total" }, null, fx(`SUM(${aVals})`, "usd0", "total")));
  g.blank();
  g.add(head("Liabilities"), head("Kind"), head("Balance"), head("Monthly payment"));
  const lFirst = g.next;
  const debts = plan.snapshot.liabilities.length ? plan.snapshot.liabilities : [{ id: "", name: "", kind: "other" as const, balance: "", apr: "", payment: "" }];
  for (const l of debts) g.add({ v: l.name, style: "input" }, { v: KIND_LABEL[l.kind], style: "input" }, inp(n(l.balance), "usd0"), inp(n(l.payment), "usd0"));
  const lLast = g.next - 1;
  const totalRow = g.add({ v: "Total liabilities", style: "total" }, null, fx(`SUM(${abs(2, lFirst)}:${abs(2, lLast)})`, "usd0", "total"), fx(`SUM(${abs(3, lFirst)}:${abs(3, lLast)})`, "usd0", "total"));
  const totalDebt = abs(2, totalRow);
  const payments = abs(3, totalRow);
  g.blank();
  const netWorth = g.add({ v: "Net worth", style: "total" }, null, fx(`${totalAssets}-${totalDebt}`, "usd0", "total"));
  g.blank();
  g.section("Cash flow statement (where the money goes)");
  g.add(head(""), head("Category"), head("Monthly"), head("Yearly"));
  const incomeRow = g.next;
  g.add({ v: "Take-home pay", style: "label" }, null, inp(n(plan.client.income), "usd0"), fx(`${at(2, incomeRow)}*12`, "usd0"));
  const income = abs(2, incomeRow);
  const eFirst = g.next;
  const expenses = plan.snapshot.expenses.length ? plan.snapshot.expenses : [{ id: "", name: "", category: "Needs" as const, amount: "" }];
  for (const e of expenses) {
    const row = g.next;
    g.add({ v: e.name, style: "input" }, { v: e.category, style: "input" }, inp(n(e.amount), "usd0"), fx(`${at(2, row)}*12`, "usd0"));
  }
  const eLast = g.next - 1;
  const eVals = `${abs(2, eFirst)}:${abs(2, eLast)}`;
  const eCats = `${abs(1, eFirst)}:${abs(1, eLast)}`;
  const cat: Record<string, string> = {};
  for (const c of ["Needs", "Wants", "Giving", "Saving"]) {
    const row = g.next;
    g.add({ v: `Total ${c.toLowerCase()}`, style: "label" }, c, fx(`SUMIF(${eCats},${at(1, row)},${eVals})`, "usd0"), fx(`${at(2, row)}*12`, "usd0"));
    cat[c] = abs(2, row);
  }
  const outRow = g.next;
  g.add({ v: "Total going out", style: "total" }, null, fx(`SUM(${eVals})`, "usd0", "total"), fx(`${at(2, outRow)}*12`, "usd0", "total"));
  const surplusRow = g.next;
  g.add({ v: "Left over (unassigned)", style: "total" }, null, fx(`${income}-${at(2, outRow)}`, "usd0", "total"), fx(`${at(2, surplusRow)}*12`, "usd0", "total"));
  g.blank();
  g.section("Key ratios");
  const cashSum = `SUMIF(${aKinds},"${KIND_LABEL.cash}",${aVals})`;
  const cushion = g.calc("Months of needs covered by cash (aim for 3 to 6)", `IF(${cat.Needs}>0,${cashSum}/${cat.Needs},0)`, "dec2");
  const savings = g.calc("Savings rate, of take-home pay (aim for 15% to 20%)", `IF(${income}>0,${cat.Saving}/${income},0)`, "pct");
  const debtShare = g.calc("Debt payments, of take-home pay (aim under 15%)", `IF(${income}>0,${payments}/${income},0)`, "pct");
  const debtToAssets = g.calc("Debts as a share of assets", `IF(${totalAssets}>0,${totalDebt}/${totalAssets},0)`, "pct");
  return { sheet: g.sheet(), out: { totalAssets, totalDebt, netWorth: at(2, netWorth), surplus: at(2, surplusRow), cushion, savings, debtShare, debtToAssets, needs: cat.Needs } };
}

/* ------------------------------------------------------------------ */

export type WealthModel = "backtest" | "withdraw" | "estate";
const TITLES: Record<WealthModel, string> = { backtest: "Portfolio backtest", withdraw: "Withdrawal strategies", estate: "Estate snapshot" };

/** One wealth model as a workbook, or null when its inputs do not make a result yet. */
export function wealthBook(m: WealthModels, model: WealthModel): XBook | null {
  const s = model === "backtest" ? backtestSheet(m.backtest) : model === "withdraw" ? withdrawSheet(m.withdraw) : estateSheet(m.estate);
  return s ? book(TITLES[model], [s.sheet], ["Amounts are in dollars. History is shown as published; it is not a forecast."]) : null;
}

export function clientStatementsBook(plan: WealthPlan): XBook {
  return book(`${plan.client.name || "Client"} financial statements`, [statementsOfClient(plan).sheet], ["Figures are the client's own, as entered in the plan. Keep this file confidential."]);
}
