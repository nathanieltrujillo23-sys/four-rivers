export interface Debt {
  name: string;
  balance: number;
  /** Annual percentage rate, e.g. 21 for 21%. */
  apr: number;
  minPayment: number;
}

interface DebtLine {
  name: string;
  balance: number;
  apr: number;
  min: number;
  paidOffMonth: number | null;
}

/** A debt portfolio mid-simulation. Mutated by `stepDebtMonth`. */
export interface DebtSim {
  debts: DebtLine[];
  month: number;
  totalInterest: number;
}

const EPS = 0.005;
export const MAX_MONTHS = 600;

export function createDebtSim(debts: Debt[]): DebtSim {
  return {
    debts: debts
      .filter((d) => d.balance > 0)
      .map((d) => ({
        name: d.name,
        balance: d.balance,
        apr: Math.max(0, d.apr),
        min: Math.max(0, d.minPayment),
        paidOffMonth: null,
      })),
    month: 0,
    totalInterest: 0,
  };
}

const active = (sim: DebtSim) =>
  sim.debts.filter((d) => d.paidOffMonth === null);

export function totalBalance(sim: DebtSim): number {
  return active(sim).reduce((sum, d) => sum + d.balance, 0);
}

/** Sum of the minimum payments of debts that are still open. */
export function activeMinimums(sim: DebtSim): number {
  return active(sim).reduce((sum, d) => sum + d.min, 0);
}

/** Sum of the minimum payments of debts already paid off — money that is now free. */
export function freedMinimums(sim: DebtSim): number {
  return sim.debts
    .filter((d) => d.paidOffMonth !== null)
    .reduce((sum, d) => sum + d.min, 0);
}

/**
 * Advances one month: interest accrues, every open debt gets at least its
 * minimum, then whatever is left of `budget` goes to the smallest open balance
 * first (the "snowball"), spilling into the next smallest once it's cleared.
 * `budget` can't go below the open minimums, since those are obligations.
 */
export function stepDebtMonth(sim: DebtSim, budget: number): void {
  sim.month += 1;
  for (const d of active(sim)) {
    const interest = (d.balance * d.apr) / 1200;
    d.balance += interest;
    sim.totalInterest += interest;
  }

  let pool = Math.max(budget, activeMinimums(sim));
  for (const d of active(sim)) {
    const pay = Math.min(d.min, d.balance);
    d.balance -= pay;
    pool -= pay;
  }
  for (const d of [...active(sim)].sort((a, b) => a.balance - b.balance)) {
    if (pool <= EPS) break;
    const pay = Math.min(pool, d.balance);
    d.balance -= pay;
    pool -= pay;
  }
  for (const d of active(sim)) {
    if (d.balance <= EPS) {
      d.balance = 0;
      d.paidOffMonth = sim.month;
    }
  }
}

export interface DebtPlanResult {
  /** Months until every debt is gone, or null if the payments never get there. */
  months: number | null;
  totalInterest: number;
  /** Total remaining balance at the end of each month; index 0 is the start. */
  balances: number[];
  /** Debts in the order they were cleared. */
  order: { name: string; month: number }[];
}

/**
 * Runs a whole payoff plan. `snowball: true` keeps the total monthly payment
 * constant (original minimums plus `extra`), so a cleared debt's payment rolls
 * onto the next; `snowball: false` is the minimums-only baseline, where each
 * debt is just paid its own minimum until it's gone.
 */
export function simulateDebts(
  debts: Debt[],
  { extra, snowball }: { extra: number; snowball: boolean },
): DebtPlanResult {
  const sim = createDebtSim(debts);
  const originalMinimums = activeMinimums(sim);
  const balances = [totalBalance(sim)];

  while (totalBalance(sim) > EPS && sim.month < MAX_MONTHS) {
    const budget = snowball
      ? originalMinimums + Math.max(0, extra)
      : activeMinimums(sim);
    stepDebtMonth(sim, budget);
    balances.push(totalBalance(sim));
  }

  return {
    months: totalBalance(sim) <= EPS ? sim.month : null,
    totalInterest: sim.totalInterest,
    balances,
    order: sim.debts
      .filter((d) => d.paidOffMonth !== null)
      .map((d) => ({ name: d.name, month: d.paidOffMonth as number }))
      .sort((a, b) => a.month - b.month),
  };
}
