/**
 * Consulting models as Excel sheets with live formulas: a market-sizing chain and the profit and break-even model with its
 * price-by-volume grid. The tests evaluate the formulas and compare them with the app's numbers.
 */
import { Grid, abs, at, book, fx, head, inp, type XBook, type XValue } from "./excel";
import type { ModelSheet } from "./ibExcel";
import type { ProfitInputs, SizingEstimate } from "./consultingMath";

const n = (v: unknown): number => {
  const x = parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};

export function sizingSheet(e: SizingEstimate): ModelSheet {
  const g = new Grid("Market sizing", [46, 18, 12, 20]);
  g.title(e.title || "Market sizing", "A chain of simple factors, multiplied or divided in order. State each assumption aloud; the structure matters more than the exact value.");
  g.add(head("Factor"), head("Value"), head("× or ÷"), head("Running total"));
  const used = e.factors.filter((f) => f.value.trim() !== "");
  let prev = "";
  for (const f of used) {
    const row = g.next;
    const running = prev ? (f.op === "÷" ? `${prev}/${at(1, row)}` : `${prev}*${at(1, row)}`) : f.op === "÷" ? `1/${at(1, row)}` : at(1, row);
    g.add({ v: f.label || "Factor", style: "input" }, inp(n(f.value), "dec2"), { v: f.op === "÷" ? "÷" : "×" }, fx(running, "int"));
    prev = at(3, row);
  }
  g.blank();
  const total = g.calc(`Estimate${e.unit ? ` (${e.unit})` : ""}`, prev || "0", "int", "total");
  const check = g.input(e.checkLabel || "A figure you know, to compare against", n(e.check), "int");
  const ratio = g.calc("Estimate ÷ known figure (within 0.5 to 2 is reasonable)", `IF(${check}>0,${total}/${check},0)`, "dec2");
  return { sheet: g.sheet(), out: { total, ratio } };
}

export function profitSheet(i: ProfitInputs): ModelSheet {
  const g = new Grid("Profit and break-even", [40, 16, 16, 16, 16, 16]);
  g.title("Profit and break-even", "Dollars and units. Blue cells are inputs.");
  g.section("Inputs");
  const price = g.input("Price per unit", n(i.price), "usd2");
  const vc = g.input("Variable cost per unit", n(i.variableCost), "usd2");
  const fixed = g.input("Fixed costs", n(i.fixedCost), "usd0");
  const vol = g.input("Units sold", n(i.volume), "int");
  g.blank();
  g.section("Results");
  const revenue = g.calc("Revenue", `${price}*${vol}`, "usd0");
  const variable = g.calc("Variable costs", `${vc}*${vol}`, "usd0");
  const contribution = g.calc("Contribution", `${revenue}-${variable}`, "usd0");
  const cpu = g.calc("Contribution per unit", `${price}-${vc}`, "usd2");
  const cm = g.calc("Contribution margin", `IF(${price}>0,${cpu}/${price},0)`, "pct");
  const profit = g.calc("Profit", `${contribution}-${fixed}`, "usd0", "total");
  const margin = g.calc("Profit margin", `IF(${revenue}>0,${profit}/${revenue},0)`, "pct");
  const be = g.calc("Break-even units", `IF(${cpu}>0,${fixed}/${cpu},0)`, "int", "total");
  const beRev = g.calc("Break-even revenue", `${be}*${price}`, "usd0");
  const safety = g.calc("Margin of safety (how far sales can fall)", `IF(AND(${cpu}>0,${vol}>0),(${vol}-${be})/${vol},0)`, "pct");
  g.blank();
  g.section("Profit by price (down) and units sold (across)");
  const steps = [-0.2, -0.1, 0, 0.1, 0.2];
  const pSteps = [-0.1, -0.05, 0, 0.05, 0.1];
  const headRow = g.next;
  g.add(head("Price \\ units"), ...steps.map((d) => fx(`ROUND(${vol}*(1+${d}),0)`, "int", "total")));
  const cells: string[][] = [];
  for (const d of pSteps) {
    const row = g.next;
    const line: XValue[] = [fx(`ROUND(${price}*(1+${d}),2)`, "usd2", "total"), ...steps.map((_, k) => fx(`(${abs(0, row)}-${vc})*${at(k + 1, headRow)}-${fixed}`, "usd0"))];
    g.add(...line);
    cells.push(steps.map((_, k) => at(k + 1, row)));
  }
  return { sheet: g.sheet(), out: { revenue, contribution, cm, profit, margin, be, beRev, safety, gridLow: cells[0][0], gridMid: cells[2][2], gridHigh: cells[4][4] } };
}

export function sizingBook(e: SizingEstimate): XBook {
  return book(e.title || "Market sizing", [sizingSheet(e).sheet]);
}
export function profitBook(i: ProfitInputs): XBook {
  return book("Profit and break-even", [profitSheet(i).sheet]);
}
