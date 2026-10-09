import {
  carPlan,
  compareAccounts,
  housePlan,
  investInYourself,
  monthlyToReachGoal,
  monthsToReachGoal,
  offerValue,
  payoffPlan,
  splitMoney,
} from "../../../lib/scenarioMath";
import { BUDGET_CATEGORIES, categoryTotal, normalizeBudget, shareOfIncome, summarize, type BudgetCategory } from "../../../utils/budget";
import { DEFAULTS, TOOL_TITLES, coerce, defaultBudget, type ToolId } from "./toolDefaults";

/** A tool's numbers and results in plain rows, for the meeting PDF. */
export interface ToolSnapshot {
  id: ToolId;
  title: string;
  /** False when nobody opened the tool in this meeting, so the numbers are only the starting example. */
  filledIn: boolean;
  /** Short groups of label and value rows. */
  sections: { heading: string; rows: [string, string][] }[];
  notes: string[];
}

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
const pct = (n: number) => `${Math.round(n * 10) / 10}%`;

/** "2 yr 3 mo", or null when it never happens. */
export function monthsLabel(n: number | null): string {
  if (n === null) return "never at these payments";
  const y = Math.floor(n / 12);
  const m = n % 12;
  return [y ? `${y} yr` : "", m || !y ? `${m} mo` : ""].filter(Boolean).join(" ");
}

const CAT_NAMES: Record<BudgetCategory, string> = {
  income: "Income",
  needs: "Needs",
  discretionary: "Wants",
  saving: "Saving",
  investing: "Investing",
  giving: "Giving",
};

/** The numbers one tool holds, as rows. `saved` is the state kept with the meeting (undefined if the tool was never opened). */
export function summarizeTool(id: ToolId, saved: unknown): ToolSnapshot {
  const filledIn = saved !== undefined && saved !== null;
  const base = { id, title: TOOL_TITLES[id], filledIn };
  switch (id) {
    case "budget": {
      const b = filledIn ? normalizeBudget(saved) : defaultBudget();
      const s = summarize(b);
      return {
        ...base,
        sections: [
          {
            heading: "Where the month's money goes",
            rows: [
              ...BUDGET_CATEGORIES.map((c): [string, string] => {
                const lines = b[c].filter((i) => i.label.trim() || i.amount);
                const share = c === "income" ? "" : ` (${Math.round(shareOfIncome(categoryTotal(b[c]), s.income) * 100)}%)`;
                // A single line is named in brackets; several are listed after a colon.
                const detail =
                  lines.length === 1
                    ? ` (${lines[0].label.trim() || "one line"})`
                    : lines.length > 1
                      ? `: ${lines.map((i) => `${i.label.trim() || "Line"} ${usd(i.amount ?? 0)}`).join(", ")}`
                      : "";
                return [CAT_NAMES[c], `${usd(categoryTotal(b[c]))}${share}${detail}`];
              }),
              ["Left over (or over by)", usd(s.leftover)],
            ],
          },
        ],
        notes: ["A common starting guide is about 50% needs, 30% wants, and 20% saving, investing, and giving. Use what fits this person."],
      };
    }
    case "accounts": {
      const v = coerce(DEFAULTS.accounts, saved);
      const r = compareAccounts({
        monthlyTakeHomeCost: v.cost,
        years: v.years,
        returnPercent: v.ret,
        taxNowPercent: v.now,
        taxLaterPercent: v.later,
        capGainsPercent: v.gains,
        employerMatchMonthly: v.match,
      });
      return {
        ...base,
        sections: [
          {
            heading: "Numbers used",
            rows: [
              ["Monthly cost out of the paycheck", usd(v.cost)],
              ["Years invested", String(v.years)],
              ["Assumed yearly return", pct(v.ret)],
              ["Tax rate now / in retirement", `${pct(v.now)} / ${pct(v.later)}`],
              ["Tax on investment gains", pct(v.gains)],
              ["Employer match per month", usd(v.match)],
            ],
          },
          {
            heading: "What each account is worth after tax",
            rows: [
              ["Traditional (401k, IRA)", `${usd(r.traditional.afterTax)}  (grows to ${usd(r.traditional.endingBalance)})`],
              ["Roth (401k, IRA)", `${usd(r.roth.afterTax)}  (grows to ${usd(r.roth.endingBalance)})`],
              ["Regular brokerage account", `${usd(r.taxable.afterTax)}  (grows to ${usd(r.taxable.endingBalance)})`],
              ["HSA, used for health costs", `${usd(r.hsa.afterTax)}  (grows to ${usd(r.hsa.endingBalance)})`],
            ],
          },
        ],
        notes: [
          "Each account is compared at the same cost to the paycheck. Yearly limits and rules change; check irs.gov or a tax professional. Markets do not return a steady rate, so this is a comparison, not a forecast.",
        ],
      };
    }
    case "yourself": {
      const v = coerce(DEFAULTS.yourself, saved);
      const r = investInYourself(v.cost, v.raise, v.years);
      return {
        ...base,
        sections: [
          {
            heading: "Numbers used",
            rows: [
              ["Cost of the course, skill, or degree", usd(v.cost)],
              ["Extra income per year it could bring", usd(v.raise)],
              ["Years of benefit", String(v.years)],
            ],
          },
          {
            heading: "What it shows",
            rows: [
              ["Pays itself back in", r.paybackMonths === null ? "not yet" : monthsLabel(r.paybackMonths)],
              [`Net gain after ${v.years} years`, usd(r.netGain)],
            ],
          },
        ],
        notes: ["Count time as a cost too. These are estimates; nothing guarantees an outcome."],
      };
    }
    case "income": {
      const v = coerce(DEFAULTS.income, saved);
      const net = v.gross * (1 - Math.min(90, v.tax) / 100);
      const parts = splitMoney(net, v.share);
      return {
        ...base,
        sections: [
          {
            heading: "Where extra income would go",
            rows: [
              ["Extra income per month, before tax", usd(v.gross)],
              ["Estimated tax", pct(v.tax)],
              ["Left after tax", usd(net)],
              ...Object.entries(parts).map(([k, a]): [string, string] => [`${k} (${v.share[k] ?? 0}%)`, `${usd(a)} a month, ${usd(a * 12)} a year`]),
            ],
          },
          {
            heading: "Two job offers, yearly value before tax",
            rows: [
              ["Offer A", `${usd(offerValue(v.a))}  (salary ${usd(v.a.salary)}, bonus ${usd(v.a.bonus)}, match ${pct(v.a.matchPercent)})`],
              ["Offer B", `${usd(offerValue(v.b))}  (salary ${usd(v.b.salary)}, bonus ${usd(v.b.bonus)}, match ${pct(v.b.matchPercent)})`],
            ],
          },
        ],
        notes: ["Offer value is salary plus bonus plus match, minus health, commute, and other costs. It leaves out tax and what money cannot count."],
      };
    }
    case "marriage": {
      const v = coerce(DEFAULTS.marriage, saved);
      const income = v.incA + v.incB;
      const margin = income - v.together - v.debts;
      const need = monthlyToReachGoal(v.wedding, v.saved, v.months, v.apr);
      return {
        ...base,
        sections: [
          {
            heading: "Numbers used",
            rows: [
              ["Take-home pay, each / combined", `${usd(v.incA)} / ${usd(v.incB)} / ${usd(income)}`],
              ["Costs now, each", `${usd(v.costA)} / ${usd(v.costB)}`],
              ["Costs together", usd(v.together)],
              ["Debt payments, both", usd(v.debts)],
              ["Wedding budget / saved so far", `${usd(v.wedding)} / ${usd(v.saved)}`],
              ["Months until the wedding", String(v.months)],
            ],
          },
          {
            heading: "What it shows",
            rows: [
              ["Left each month after costs and debt", usd(margin)],
              ["Saved by sharing a home", `${usd(v.costA + v.costB - v.together)} a month`],
              ["Needed each month for the wedding", usd(need)],
              ["Fits within what is left?", margin >= need ? "Yes" : `Not yet, ${usd(need - margin)} a month short`],
            ],
          },
        ],
        notes: ["Talk through debts, giving, who handles the bills, and what each person wants money to do."],
      };
    }
    case "car": {
      const v = coerce(DEFAULTS.car, saved);
      const c = carPlan(v);
      return {
        ...base,
        sections: [
          {
            heading: "Numbers used",
            rows: [
              ["Price / down payment / trade-in", `${usd(v.price)} / ${usd(v.down)} / ${usd(v.tradeIn)}`],
              ["Sales tax and fees", pct(v.salesTaxPercent)],
              ["Loan interest / length", `${pct(v.aprPercent)} / ${v.months} months`],
              ["Insurance, fuel, upkeep per month", `${usd(v.insuranceMonthly)} / ${usd(v.fuelMonthly)} / ${usd(v.upkeepMonthly)}`],
              ["Take-home pay per month", usd(v.takeHomeMonthly)],
            ],
          },
          {
            heading: "What it shows",
            rows: [
              ["Loan payment", `${usd(c.payment)} a month on ${usd(c.financed)} borrowed`],
              ["Interest over the loan", usd(c.totalInterest)],
              ["True monthly cost of the car", usd(c.monthlyTotal)],
              ["Share of take-home pay", c.shareOfTakeHome === null ? "not entered" : `${Math.round(c.shareOfTakeHome * 100)}%`],
            ],
          },
        ],
        notes: ["Many planners suggest keeping all car costs under about 15% of take-home pay. A longer loan can leave more owed than the car is worth."],
      };
    }
    case "house": {
      const v = coerce(DEFAULTS.house, saved);
      const h = housePlan(v);
      return {
        ...base,
        sections: [
          {
            heading: "Numbers used",
            rows: [
              ["Home price / down payment", `${usd(v.price)} / ${pct(v.downPercent)}`],
              ["Mortgage interest / length", `${pct(v.aprPercent)} / ${v.years} years`],
              ["Property tax / insurance per year", `${pct(v.propertyTaxPercent)} / ${usd(v.insuranceYearly)}`],
              ["HOA dues per month", usd(v.hoaMonthly)],
              ["Gross income per month", usd(v.income)],
            ],
          },
          {
            heading: "What it shows",
            rows: [
              ["Monthly housing cost", usd(h.monthlyTotal)],
              ["Loan payment alone", usd(h.principalAndInterest)],
              ["Cash needed up front", `${usd(h.cashToClose)} (${usd(h.down)} down plus closing costs)`],
              ["Income to keep it near 28%", `${usd(h.grossMonthlyNeeded)} a month before tax`],
              ["Share of this person's income", v.income > 0 ? `${Math.round((h.monthlyTotal / v.income) * 100)}%` : "not entered"],
            ],
          },
        ],
        notes: ["Also plan for repairs, moving costs, and an emergency fund after the down payment. Replace these with real quotes."],
      };
    }
    case "vacation": {
      const v = coerce(DEFAULTS.vacation, saved);
      const need = monthlyToReachGoal(v.cost, v.saved, v.months, v.apr);
      const wait = monthsToReachGoal(v.cost, v.saved, v.monthly, v.apr);
      return {
        ...base,
        sections: [
          {
            heading: "Numbers used",
            rows: [
              ["What it will cost", usd(v.cost)],
              ["Already set aside", usd(v.saved)],
              ["Months until the trip", String(v.months)],
              ["Savings interest", pct(v.apr)],
              ["Can set aside per month", usd(v.monthly)],
            ],
          },
          {
            heading: "What it shows",
            rows: [
              [`To be ready in ${v.months} months`, `${usd(need)} a month`],
              [`Saving ${usd(v.monthly)} a month`, wait === null ? "not reached" : wait === 0 ? "already there" : `ready in ${monthsLabel(wait)}`],
            ],
          },
        ],
        notes: ["The same math works for a gift, a move, or an emergency fund."],
      };
    }
    case "debt": {
      const v = coerce(DEFAULTS.debt, saved);
      const snow = payoffPlan(v.debts, v.extra, "snowball");
      const aval = payoffPlan(v.debts, v.extra, "avalanche");
      return {
        ...base,
        sections: [
          {
            heading: "The debts",
            rows: [
              ...v.debts.map((d): [string, string] => [d.name || "Debt", `${usd(d.balance)} at ${pct(d.aprPercent)}, minimum ${usd(d.minimum)} a month`]),
              ["Extra paid each month", usd(v.extra)],
            ],
          },
          {
            heading: "Two ways to pay them off",
            rows: [
              ["Snowball (smallest balance first)", `debt-free in ${monthsLabel(snow.months)}, ${usd(snow.totalInterest)} interest. Order: ${snow.order.join(", ") || "none"}`],
              ["Avalanche (highest interest first)", `debt-free in ${monthsLabel(aval.months)}, ${usd(aval.totalInterest)} interest. Order: ${aval.order.join(", ") || "none"}`],
            ],
          },
        ],
        notes: ["Either beats paying only the minimums. Each paid-off debt's payment rolls into the next one."],
      };
    }
  }
}
