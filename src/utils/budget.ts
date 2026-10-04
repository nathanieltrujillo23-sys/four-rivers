/**
 * The monthly stewardship plan: where income comes from and where it goes.
 * Only the itemized lines are stored. Every total and percentage is derived
 * from them, never saved separately (the same ledger rule as the trackers).
 */

export const BUDGET_CATEGORIES = [
  "income",
  "needs",
  "discretionary",
  "saving",
  "investing",
  "giving",
] as const;

export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

/** The five places income can go (everything but income itself). */
export const SPENDING_CATEGORIES = BUDGET_CATEGORIES.filter(
  (c): c is Exclude<BudgetCategory, "income"> => c !== "income",
);

export interface BudgetItem {
  id: string;
  label: string;
  /** null until the learner types a number, so an untouched row isn't mistaken for "$0". */
  amount: number | null;
}

export type Budget = Record<BudgetCategory, BudgetItem[]>;

let counter = 0;
export function newItem(label = "", amount: number | null = null): BudgetItem {
  counter += 1;
  return { id: `b${Date.now().toString(36)}${counter}`, label, amount };
}

export function emptyBudget(): Budget {
  return {
    income: [newItem()],
    needs: [newItem()],
    discretionary: [newItem()],
    saving: [newItem()],
    investing: [newItem()],
    giving: [newItem()],
  };
}

export function categoryTotal(items: BudgetItem[]): number {
  return items.reduce((sum, i) => sum + (Number.isFinite(i.amount) ? (i.amount as number) : 0), 0);
}

export interface BudgetSummary {
  income: number;
  needs: number;
  discretionary: number;
  saving: number;
  investing: number;
  giving: number;
  /** Everything assigned to a place, i.e. the five categories added up. */
  assigned: number;
  /** Income minus assigned: positive means dollars without a job yet, negative means over. */
  leftover: number;
}

export function summarize(budget: Budget): BudgetSummary {
  const income = categoryTotal(budget.income);
  const needs = categoryTotal(budget.needs);
  const discretionary = categoryTotal(budget.discretionary);
  const saving = categoryTotal(budget.saving);
  const investing = categoryTotal(budget.investing);
  const giving = categoryTotal(budget.giving);
  const assigned = needs + discretionary + saving + investing + giving;
  return { income, needs, discretionary, saving, investing, giving, assigned, leftover: income - assigned };
}

/** Rows the learner actually filled in (a name or an amount); blank rows are ignored. */
export function filledItems(items: BudgetItem[]): BudgetItem[] {
  return items.filter((i) => i.label.trim() !== "" || (i.amount !== null && i.amount !== 0));
}

/** A category counts once it has a named line with an amount typed in (zero is a real answer). */
export function categoryComplete(items: BudgetItem[]): boolean {
  return items.some((i) => i.label.trim() !== "" && i.amount !== null && i.amount >= 0);
}

export function categoryCompleteness(budget: Budget): Record<BudgetCategory, boolean> {
  const out = {} as Record<BudgetCategory, boolean>;
  for (const c of BUDGET_CATEGORIES) out[c] = categoryComplete(budget[c]);
  return out;
}

/** The plan can be exported once income is above zero and every category has its answer. */
export function isBudgetComplete(budget: Budget): boolean {
  const done = categoryCompleteness(budget);
  return BUDGET_CATEGORIES.every((c) => done[c]) && categoryTotal(budget.income) > 0;
}

/** Share of income, as a 0 to 1 fraction (0 when there is no income yet). */
export function shareOfIncome(amount: number, income: number): number {
  return income > 0 ? amount / income : 0;
}

/** Cleans stored data back into a valid Budget, so a hand-edited or old save can't crash the page. */
export function normalizeBudget(raw: unknown): Budget {
  const base = emptyBudget();
  if (!raw || typeof raw !== "object") return base;
  const src = raw as Record<string, unknown>;
  for (const c of BUDGET_CATEGORIES) {
    const list = src[c];
    if (!Array.isArray(list)) continue;
    const items = list
      .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
      .map((i) =>
        newItem(
          typeof i.label === "string" ? i.label.slice(0, 80) : "",
          typeof i.amount === "number" && Number.isFinite(i.amount) && i.amount >= 0 ? i.amount : null,
        ),
      );
    if (items.length > 0) base[c] = items.slice(0, 30);
  }
  return base;
}
