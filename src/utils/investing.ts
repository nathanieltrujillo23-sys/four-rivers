import type { InvestmentEntry } from "../types";

export interface InvestmentBreakdownItem {
  label: string;
  percent: number;
}

const MAX_NAMED = 3;

/**
 * Groups logged investment entries by name and turns them into a short,
 * percent-of-total breakdown — at most 4 items, with anything past the top 3
 * collapsed into "Other" so the "your streams" diagram's investing list never
 * grows past the space it has. Returns [] when nothing's been logged yet, so
 * the caller can fall back to a static illustrative list.
 */
export function investmentBreakdown(entries: InvestmentEntry[]): InvestmentBreakdownItem[] {
  const totals = new Map<string, number>();
  for (const e of entries) {
    totals.set(e.name, (totals.get(e.name) ?? 0) + e.contributionAmount);
  }
  const grandTotal = [...totals.values()].reduce((sum, v) => sum + v, 0);
  if (grandTotal <= 0) return [];

  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const toItem = ([name, amount]: [string, number]): InvestmentBreakdownItem => ({
    label: name,
    percent: Math.round((amount / grandTotal) * 100),
  });

  if (sorted.length <= MAX_NAMED + 1) return sorted.map(toItem);

  const top = sorted.slice(0, MAX_NAMED).map(toItem);
  const restAmount = sorted.slice(MAX_NAMED).reduce((sum, [, amount]) => sum + amount, 0);
  return [...top, { label: "Other", percent: Math.round((restAmount / grandTotal) * 100) }];
}
