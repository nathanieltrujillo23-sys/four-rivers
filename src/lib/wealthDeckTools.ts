import { compareAccounts, carPlan, housePlan, loanBalances, payoffPlan, splitMoney, type Debt } from "./scenarioMath";
import { DEFAULTS, accountsNowRate, accountsState, coerce, incomeState, incomeTaxRate } from "../components/community/workshop/toolDefaults";
import { coerceSpec } from "../components/community/workshop/specValues";
import { SPECS } from "../components/community/workshop/toolSpecs";
import type { ToolId } from "../components/community/workshop/toolCatalog";
import { summarizeTool } from "../components/community/workshop/toolSummaries";

/** A chart for one toolkit tool, in a form the presentation can draw as a native PowerPoint chart. */
export interface DeckChart {
  kind: "line" | "bar" | "doughnut";
  title: string;
  labels: string[];
  series: { name: string; values: number[] }[];
  /** How the numbers read. */
  unit: "usd";
}

/** At most `max` points, always keeping the first and last. */
function thin<T>(xs: T[], max = 30): { items: T[]; index: number[] } {
  if (xs.length <= max) return { items: xs, index: xs.map((_, i) => i) };
  const step = (xs.length - 1) / (max - 1);
  const index = Array.from({ length: max }, (_, i) => Math.round(i * step));
  return { items: index.map((i) => xs[i]), index };
}

/** A balance-over-time chart from plain points, labelled in months or years. */
function balanceLines(title: string, series: { name: string; points: number[] }[], unit: "month" | "year"): DeckChart {
  const longest = Math.max(...series.map((s) => s.points.length));
  const base = Array.from({ length: longest }, (_, i) => i);
  const { items: idx } = thin(base);
  const labels = idx.map((i) => (unit === "year" ? `Yr ${i}` : i === 0 ? "Today" : `Mo ${i}`));
  return {
    kind: "line",
    title,
    labels,
    unit: "usd",
    series: series.map((s) => ({
      name: s.name,
      // A shorter series (a loan paid off sooner) ends at zero.
      values: idx.map((i) => Math.round(i < s.points.length ? s.points[i] : 0)),
    })),
  };
}

/**
 * A chart for the tool, from its saved numbers (or its starting example). Null when a tool has nothing worth drawing
 * beyond its table of results.
 */
export function toolDeckChart(id: ToolId, saved: unknown): DeckChart | null {
  const spec = SPECS[id];
  if (spec) {
    if (!spec.chart) return null;
    const c = spec.chart(coerceSpec(spec, saved));
    if (!c || c.series.length === 0) return null;
    // The tools label the end of the line "Year 30" for yearly points and "36 months" for monthly ones.
    return balanceLines(c.caption, c.series.map((s) => ({ name: s.label, points: s.points })), /^year/i.test(c.endLabel) ? "year" : "month");
  }
  switch (id) {
    case "car": {
      const v = coerce(DEFAULTS.car, saved);
      const c = carPlan(v);
      return balanceLines("What is still owed on the car loan", [{ name: "Loan balance", points: loanBalances(c.financed, v.aprPercent, c.payment, 0) }], "month");
    }
    case "house": {
      const v = coerce(DEFAULTS.house, saved);
      const h = housePlan(v);
      const monthly = loanBalances(h.loan, v.aprPercent, h.principalAndInterest, 0);
      return balanceLines("What is still owed on the mortgage", [{ name: "Mortgage balance", points: monthly.filter((_, i) => i % 12 === 0) }], "year");
    }
    case "debt": {
      const v = coerce(DEFAULTS.debt, saved);
      const debts: Debt[] = v.debts;
      const snow = payoffPlan(debts, v.extra, "snowball");
      const aval = payoffPlan(debts, v.extra, "avalanche");
      return {
        kind: "bar",
        title: "Total interest paid by payoff method",
        labels: ["Snowball (smallest balance first)", "Avalanche (highest rate first)"],
        series: [{ name: "Interest paid", values: [Math.round(snow.totalInterest), Math.round(aval.totalInterest)] }],
        unit: "usd",
      };
    }
    case "accounts": {
      const v = accountsState(saved);
      const r = compareAccounts({
        monthlyTakeHomeCost: v.cost,
        years: v.years,
        returnPercent: v.ret,
        taxNowPercent: accountsNowRate(v).used,
        taxLaterPercent: v.later,
        capGainsPercent: v.gains,
        employerMatchMonthly: v.match,
      });
      return {
        kind: "bar",
        title: `Left after tax, by account type, after ${v.years} years`,
        labels: ["Traditional", "Roth", "Brokerage", "HSA"],
        series: [{ name: "After tax", values: [r.traditional.afterTax, r.roth.afterTax, r.taxable.afterTax, r.hsa.afterTax].map(Math.round) }],
        unit: "usd",
      };
    }
    case "income": {
      const v = incomeState(saved);
      const net = v.gross * (1 - Math.min(90, incomeTaxRate(v).used) / 100);
      const parts = splitMoney(net, v.share);
      return {
        kind: "doughnut",
        title: "Where more income would go each month",
        labels: Object.keys(parts),
        series: [{ name: "Per month", values: Object.values(parts).map((x) => Math.round(x)) }],
        unit: "usd",
      };
    }
    default:
      return null;
  }
}

/** One result a tool shows: a label, the number, and the short explanation under it. */
export interface DeckResult {
  label: string;
  value: string;
  note?: string;
}

/** What the tool shows, as separate label, value and note (the screen's result tiles). */
export function toolResults(id: ToolId, saved: unknown): DeckResult[] {
  const spec = SPECS[id];
  if (spec) return spec.compute(coerceSpec(spec, saved)).results.map((r) => ({ label: r.label, value: r.value, note: r.note }));
  // The tools with their own screens report rows as "value  (note)".
  const snap = summarizeTool(id, saved);
  return snap.sections.slice(1).flatMap((sec) =>
    sec.rows.map(([label, v]): DeckResult => {
      const m = /^(.*?)\s{2}\((.*)\)$/s.exec(v);
      return m ? { label, value: m[1], note: m[2] } : { label, value: v };
    }),
  );
}
