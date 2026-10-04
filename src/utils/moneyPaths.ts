/**
 * Where the same dollars can sit, and what happens to them over time:
 * cash that earns almost nothing while prices rise, a high-yield savings
 * account, or money invested in the market at its long-run average. Purely
 * illustrative. Real returns vary year to year and are never guaranteed.
 */

export interface PathAssumptions {
  /** Yearly rise in prices, in percent. */
  inflation: number;
  /** What an ordinary checking account (or cash) earns, in percent. */
  checking: number;
  /** A typical high-yield savings account, in percent per year. */
  hysa: number;
  /** The S&P 500's long-run average yearly return before inflation, in percent. */
  market: number;
}

export const DEFAULT_ASSUMPTIONS: PathAssumptions = {
  inflation: 3,
  checking: 0.1,
  hysa: 4,
  market: 10,
};

export interface PathPoint {
  year: number;
  /** The account balance in dollars of that year. */
  nominal: number;
  /** The same balance expressed in today's buying power. */
  real: number;
  /** Total dollars put in so far (the start plus every monthly addition). */
  contributed: number;
}

/**
 * One path, one point per year from 0 to `years`. Rates are effective yearly
 * rates, compounded monthly; monthly additions land at the end of each month.
 */
export function projectPath(
  start: number,
  monthly: number,
  years: number,
  ratePercent: number,
  inflationPercent: number,
): PathPoint[] {
  const monthlyGrowth = Math.pow(1 + ratePercent / 100, 1 / 12);
  const points: PathPoint[] = [];
  let balance = start;
  for (let year = 0; year <= years; year++) {
    if (year > 0) {
      for (let m = 0; m < 12; m++) balance = balance * monthlyGrowth + monthly;
    }
    points.push({
      year,
      nominal: balance,
      real: balance / Math.pow(1 + inflationPercent / 100, year),
      contributed: start + monthly * 12 * year,
    });
  }
  return points;
}

export interface MoneyPaths {
  cash: PathPoint[];
  hysa: PathPoint[];
  market: PathPoint[];
}

export function projectAll(start: number, monthly: number, years: number, a: PathAssumptions): MoneyPaths {
  return {
    cash: projectPath(start, monthly, years, a.checking, a.inflation),
    hysa: projectPath(start, monthly, years, a.hysa, a.inflation),
    market: projectPath(start, monthly, years, a.market, a.inflation),
  };
}
