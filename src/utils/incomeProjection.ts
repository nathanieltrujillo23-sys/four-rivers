import {
  activeMinimums,
  createDebtSim,
  freedMinimums,
  stepDebtMonth,
  totalBalance,
  type Debt,
} from "./debtSnowball";

export type Use = "debt" | "save" | "invest" | "split";

export interface DiscretionaryComparison {
  before: number;
  after: number;
  change: number;
  /** Percent change from `before`, or null when `before` is zero or negative. */
  changePercent: number | null;
}

/** Discretionary money before and after added income, with expenses unchanged. */
export function compareDiscretionary(
  mainMonthly: number,
  addedMonthly: number,
  expensesMonthly: number,
): DiscretionaryComparison {
  const before = mainMonthly - expensesMonthly;
  const after = mainMonthly + addedMonthly - expensesMonthly;
  return {
    before,
    after,
    change: after - before,
    changePercent: before > 0 ? ((after - before) / before) * 100 : null,
  };
}

export interface ProjectionInput {
  years: number;
  mainMonthly: number;
  addedMonthly: number;
  /** Whether the added streams are counted (false = the main income alone). */
  includeAdded: boolean;
  /** Monthly expenses, including debt minimum payments. */
  expensesMonthly: number;
  incomeGrowthPercent: number;
  expenseGrowthPercent: number;
  use: Use;
  debts: Debt[];
  savingsRatePercent: number;
  investReturnPercent: number;
}

export interface YearRow {
  year: number;
  income: number;
  expenses: number;
  discretionary: number;
  debtRemaining: number;
  /** Principal cleared so far (never below zero). */
  debtPaidDown: number;
  saved: number;
  invested: number;
}

const SHARES: Record<Use, [number, number, number]> = {
  debt: [1, 0, 0],
  save: [0, 1, 0],
  invest: [0, 0, 1],
  split: [1 / 3, 1 / 3, 1 / 3],
};

/**
 * Month-by-month projection, summarized per year. Income grows by its yearly
 * rate; expenses by theirs (0 means they stay flat). Whatever is left over each
 * month (discretionary, plus any debt minimums freed by a paid-off debt) is
 * split by `use` between extra debt payments, savings, and investments. Once
 * the debt is gone, its share goes to savings. Hypothetical, not a prediction.
 */
export function projectYears(input: ProjectionInput): YearRow[] {
  const sim = createDebtSim(input.debts);
  const startingDebt = totalBalance(sim);
  const baseIncome =
    input.mainMonthly + (input.includeAdded ? input.addedMonthly : 0);
  const [debtShare, saveShare, investShare] = SHARES[input.use];

  let saved = 0;
  let invested = 0;
  const rows: YearRow[] = [];
  let incomeSum = 0;
  let expenseSum = 0;
  let discretionarySum = 0;

  for (let m = 0; m < input.years * 12; m++) {
    const yearIndex = Math.floor(m / 12);
    const income =
      baseIncome * Math.pow(1 + input.incomeGrowthPercent / 100, yearIndex);
    const expenses =
      input.expensesMonthly *
      Math.pow(1 + input.expenseGrowthPercent / 100, yearIndex);
    const discretionary = Math.max(0, income - expenses + freedMinimums(sim));

    const debtOpen = totalBalance(sim) > 0.005;
    const toDebt = debtOpen ? discretionary * debtShare : 0;
    const redirected = debtOpen ? 0 : discretionary * debtShare;
    if (debtOpen) stepDebtMonth(sim, activeMinimums(sim) + toDebt);

    saved =
      saved * (1 + input.savingsRatePercent / 1200) +
      discretionary * saveShare +
      redirected;
    invested =
      invested * (1 + input.investReturnPercent / 1200) +
      discretionary * investShare;

    incomeSum += income;
    expenseSum += expenses;
    discretionarySum += discretionary;

    if ((m + 1) % 12 === 0) {
      const remaining = totalBalance(sim);
      rows.push({
        year: yearIndex + 1,
        income: incomeSum,
        expenses: expenseSum,
        discretionary: discretionarySum,
        debtRemaining: remaining,
        debtPaidDown: Math.max(0, startingDebt - remaining),
        saved,
        invested,
      });
      incomeSum = 0;
      expenseSum = 0;
      discretionarySum = 0;
    }
  }
  return rows;
}
