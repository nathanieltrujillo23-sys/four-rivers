/**
 * The arithmetic behind the workshop's scenario tools (car, house, marriage, vacation, debt, accounts, income).
 * Plain functions with no screen code, so they can be tested. They are teaching estimates, not advice.
 */

const finite = (n: number) => (Number.isFinite(n) ? n : 0);
const pos = (n: number) => Math.max(0, finite(n));

/** The level monthly payment on a loan (the usual amortization formula). */
export function monthlyPayment(principal: number, aprPercent: number, months: number): number {
  const p = pos(principal);
  const n = Math.round(pos(months));
  if (p === 0 || n === 0) return 0;
  const r = pos(aprPercent) / 100 / 12;
  if (r === 0) return p / n;
  return (p * r) / (1 - Math.pow(1 + r, -n));
}

export interface LoanSummary {
  payment: number;
  totalPaid: number;
  totalInterest: number;
}

export function loanSummary(principal: number, aprPercent: number, months: number): LoanSummary {
  const payment = monthlyPayment(principal, aprPercent, months);
  const totalPaid = payment * Math.round(pos(months));
  return { payment, totalPaid, totalInterest: Math.max(0, totalPaid - pos(principal)) };
}

/** What an initial amount plus a level monthly contribution grows to, compounded monthly. */
export function futureValue(initial: number, monthly: number, annualPercent: number, years: number): number {
  const r = finite(annualPercent) / 100 / 12;
  const n = Math.round(pos(years) * 12);
  let balance = pos(initial);
  for (let i = 0; i < n; i++) balance = balance * (1 + r) + pos(monthly);
  return balance;
}

/** The monthly amount to set aside to reach a goal by a date, counting interest on what is saved. */
export function monthlyToReachGoal(target: number, alreadySaved: number, months: number, aprPercent: number): number {
  const n = Math.round(pos(months));
  const need = pos(target) - pos(alreadySaved);
  if (need <= 0) return 0;
  if (n === 0) return need;
  const r = pos(aprPercent) / 100 / 12;
  const grownStart = pos(alreadySaved) * Math.pow(1 + r, n);
  const stillNeeded = pos(target) - grownStart;
  if (stillNeeded <= 0) return 0;
  if (r === 0) return stillNeeded / n;
  return (stillNeeded * r) / (Math.pow(1 + r, n) - 1);
}

/** How many months of saving a level amount it takes to reach a goal (null if it never will). */
export function monthsToReachGoal(target: number, alreadySaved: number, monthly: number, aprPercent: number): number | null {
  const goal = pos(target);
  let balance = pos(alreadySaved);
  if (balance >= goal) return 0;
  if (pos(monthly) === 0 && pos(aprPercent) === 0) return null;
  const r = pos(aprPercent) / 100 / 12;
  for (let m = 1; m <= 1200; m++) {
    balance = balance * (1 + r) + pos(monthly);
    if (balance >= goal) return m;
  }
  return null;
}

export interface Debt {
  name: string;
  balance: number;
  aprPercent: number;
  minimum: number;
}

export interface PayoffResult {
  /** Months until every debt is paid, or null when the payments never catch up with the interest. */
  months: number | null;
  totalInterest: number;
  /** The order the debts were paid off in. */
  order: string[];
}

/**
 * Pays off several debts: every minimum each month, plus an extra amount aimed at one debt at a time. The snowball
 * aims at the smallest balance first; the avalanche aims at the highest interest rate first. A paid-off debt's
 * minimum rolls into the extra, which is what makes both methods work.
 */
export function payoffPlan(debts: Debt[], extraMonthly: number, method: "snowball" | "avalanche"): PayoffResult {
  const live = debts
    .map((d) => ({ ...d, balance: pos(d.balance), aprPercent: pos(d.aprPercent), minimum: pos(d.minimum) }))
    .filter((d) => d.balance > 0);
  const order: string[] = [];
  let totalInterest = 0;
  let rollover = pos(extraMonthly);
  for (let month = 1; month <= 1200; month++) {
    if (live.every((d) => d.balance <= 0.005)) return { months: month - 1, totalInterest, order };
    // Interest first, then the minimums.
    for (const d of live) {
      if (d.balance <= 0.005) continue;
      const interest = (d.balance * d.aprPercent) / 100 / 12;
      d.balance += interest;
      totalInterest += interest;
    }
    let available = rollover;
    for (const d of live) {
      if (d.balance <= 0.005) continue;
      const pay = Math.min(d.minimum, d.balance);
      d.balance -= pay;
      available += d.minimum - pay;
    }
    // Aim the extra at the target, and spill any left over to the next one.
    const targets = live
      .filter((d) => d.balance > 0.005)
      .sort((a, b) => (method === "snowball" ? a.balance - b.balance : b.aprPercent - a.aprPercent));
    for (const d of targets) {
      if (available <= 0) break;
      const pay = Math.min(available, d.balance);
      d.balance -= pay;
      available -= pay;
    }
    for (const d of live) {
      if (d.balance <= 0.005 && !order.includes(d.name)) {
        order.push(d.name);
        rollover += d.minimum;
      }
    }
  }
  return { months: null, totalInterest, order };
}

export interface HouseInputs {
  price: number;
  downPercent: number;
  aprPercent: number;
  years: number;
  propertyTaxPercent: number;
  insuranceYearly: number;
  hoaMonthly: number;
  /** Yearly mortgage-insurance rate, charged when the down payment is under 20%. */
  pmiPercent: number;
  closingPercent: number;
}

export interface HouseResult {
  down: number;
  loan: number;
  principalAndInterest: number;
  tax: number;
  insurance: number;
  hoa: number;
  pmi: number;
  monthlyTotal: number;
  /** Take-home-before-tax pay needed per month if housing is to stay near 28% of gross income. */
  grossMonthlyNeeded: number;
  cashToClose: number;
}

export function housePlan(h: HouseInputs): HouseResult {
  const price = pos(h.price);
  const down = (price * Math.min(100, pos(h.downPercent))) / 100;
  const loan = price - down;
  const principalAndInterest = monthlyPayment(loan, h.aprPercent, pos(h.years) * 12);
  const tax = (price * pos(h.propertyTaxPercent)) / 100 / 12;
  const insurance = pos(h.insuranceYearly) / 12;
  const hoa = pos(h.hoaMonthly);
  const pmi = h.downPercent < 20 ? (loan * pos(h.pmiPercent)) / 100 / 12 : 0;
  const monthlyTotal = principalAndInterest + tax + insurance + hoa + pmi;
  return {
    down,
    loan,
    principalAndInterest,
    tax,
    insurance,
    hoa,
    pmi,
    monthlyTotal,
    grossMonthlyNeeded: monthlyTotal / 0.28,
    cashToClose: down + (price * pos(h.closingPercent)) / 100,
  };
}

export interface CarInputs {
  price: number;
  down: number;
  tradeIn: number;
  salesTaxPercent: number;
  aprPercent: number;
  months: number;
  insuranceMonthly: number;
  fuelMonthly: number;
  upkeepMonthly: number;
  takeHomeMonthly: number;
}

export function carPlan(c: CarInputs) {
  const tax = (pos(c.price) * pos(c.salesTaxPercent)) / 100;
  const financed = Math.max(0, pos(c.price) + tax - pos(c.down) - pos(c.tradeIn));
  const loan = loanSummary(financed, c.aprPercent, c.months);
  const running = pos(c.insuranceMonthly) + pos(c.fuelMonthly) + pos(c.upkeepMonthly);
  const monthlyTotal = loan.payment + running;
  return {
    tax,
    financed,
    ...loan,
    running,
    monthlyTotal,
    shareOfTakeHome: pos(c.takeHomeMonthly) > 0 ? monthlyTotal / pos(c.takeHomeMonthly) : null,
  };
}

export type AccountKind = "traditional" | "roth" | "taxable" | "hsa";

export interface AccountInputs {
  /** What the person actually gives up from their paycheck each month. */
  monthlyTakeHomeCost: number;
  years: number;
  returnPercent: number;
  taxNowPercent: number;
  taxLaterPercent: number;
  capGainsPercent: number;
  /** Extra money an employer puts into the traditional (401k-style) account each month. */
  employerMatchMonthly: number;
}

/**
 * Compares account types for the same out-of-pocket cost. A traditional account takes pre-tax money (so the same
 * take-home cost buys more) and is taxed when withdrawn; a Roth is funded after tax and grows tax-free; a taxable
 * brokerage is funded after tax and pays tax on gains; an HSA is pre-tax and tax-free when used for health costs.
 */
export function compareAccounts(a: AccountInputs): Record<AccountKind, { contributed: number; endingBalance: number; afterTax: number }> {
  const cost = pos(a.monthlyTakeHomeCost);
  const now = Math.min(0.9, pos(a.taxNowPercent) / 100);
  const later = Math.min(0.9, pos(a.taxLaterPercent) / 100);
  const gains = Math.min(0.9, pos(a.capGainsPercent) / 100);
  const months = Math.round(pos(a.years) * 12);
  const preTax = cost / (1 - now);
  const trad = futureValue(0, preTax + pos(a.employerMatchMonthly), a.returnPercent, a.years);
  const roth = futureValue(0, cost, a.returnPercent, a.years);
  const taxable = futureValue(0, cost, a.returnPercent, a.years);
  const hsa = futureValue(0, preTax, a.returnPercent, a.years);
  return {
    traditional: {
      contributed: (preTax + pos(a.employerMatchMonthly)) * months,
      endingBalance: trad,
      afterTax: trad * (1 - later),
    },
    roth: { contributed: cost * months, endingBalance: roth, afterTax: roth },
    taxable: {
      contributed: cost * months,
      endingBalance: taxable,
      afterTax: taxable - Math.max(0, taxable - cost * months) * gains,
    },
    hsa: { contributed: preTax * months, endingBalance: hsa, afterTax: hsa },
  };
}

/** What learning a skill or finishing a degree has to earn back: months to pay back its cost, and the gain after some years. */
export function investInYourself(cost: number, yearlyRaise: number, yearsOfBenefit: number) {
  const c = pos(cost);
  const raise = pos(yearlyRaise);
  return {
    paybackMonths: raise > 0 ? Math.ceil((c / raise) * 12) : null,
    netGain: raise * pos(yearsOfBenefit) - c,
  };
}

/** Splits extra monthly money by percentages (they are scaled if they do not add up to 100). */
export function splitMoney(amount: number, shares: Record<string, number>): Record<string, number> {
  const total = Object.values(shares).reduce((s, v) => s + pos(v), 0);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(shares)) out[k] = total > 0 ? (pos(amount) * pos(v)) / total : 0;
  return out;
}

export interface OfferInputs {
  salary: number;
  bonus: number;
  /** Employer retirement match, as a percent of salary. */
  matchPercent: number;
  healthMonthly: number;
  commuteMonthly: number;
  otherMonthly: number;
}

/** The yearly value of a job offer once benefits and costs are counted, before tax. */
export function offerValue(o: OfferInputs): number {
  return (
    pos(o.salary) +
    pos(o.bonus) +
    (pos(o.salary) * pos(o.matchPercent)) / 100 -
    (pos(o.healthMonthly) + pos(o.commuteMonthly) + pos(o.otherMonthly)) * 12
  );
}

/** Pays one loan with a fixed payment plus an extra amount each month. Null months when the payment never covers the interest. */
export function payoffWithExtra(balance: number, aprPercent: number, payment: number, extra: number): { months: number | null; totalInterest: number } {
  let bal = pos(balance);
  const r = pos(aprPercent) / 100 / 12;
  const pay = pos(payment) + pos(extra);
  let interest = 0;
  for (let m = 1; m <= 1200; m++) {
    if (bal <= 0.005) return { months: m - 1, totalInterest: interest };
    const i = bal * r;
    if (pay <= i + 0.005) return { months: null, totalInterest: interest };
    interest += i;
    bal = bal + i - Math.min(pay, bal + i);
  }
  return { months: bal <= 0.005 ? 1200 : null, totalInterest: interest };
}

/**
 * Funds a wish list in order from one monthly amount: the months until each wish is paid for (0 when what is already saved
 * covers it, null when it never will be). Earlier wishes are paid before later ones.
 */
export function wishSchedule(costs: number[], alreadySaved: number, monthly: number): (number | null)[] {
  let running = 0;
  return costs.map((c) => {
    running += pos(c);
    const need = running - pos(alreadySaved);
    if (need <= 0) return 0;
    if (pos(monthly) <= 0) return null;
    return Math.ceil(need / pos(monthly));
  });
}

export interface RetirementInputs {
  spendYearly: number;
  otherIncomeYearly: number;
  withdrawalPercent: number;
  saved: number;
  monthly: number;
  years: number;
  returnPercent: number;
  inflationPercent: number;
}

/** A retirement target in today's dollars, what the savings are on track to be, and the monthly amount that would close the gap. */
export function retirementPlan(i: RetirementInputs) {
  const realPercent = ((1 + finite(i.returnPercent) / 100) / (1 + pos(i.inflationPercent) / 100) - 1) * 100;
  const fromPortfolio = Math.max(0, pos(i.spendYearly) - pos(i.otherIncomeYearly));
  const target = pos(i.withdrawalPercent) > 0 ? fromPortfolio / (pos(i.withdrawalPercent) / 100) : 0;
  const projected = futureValue(i.saved, i.monthly, realPercent, i.years);
  return {
    realPercent,
    target,
    projected,
    gap: target - projected,
    neededMonthly: monthlyToReachGoal(target, i.saved, Math.round(pos(i.years) * 12), realPercent),
  };
}

/** What starting later costs: the same money, the same end date, but the investing begins `waitYears` into the plan. */
export function costOfWaiting(initial: number, monthly: number, returnPercent: number, years: number, waitYears: number) {
  const startNow = futureValue(initial, monthly, returnPercent, years);
  const startLater = futureValue(initial, monthly, returnPercent, Math.max(0, pos(years) - pos(waitYears)));
  return { startNow, startLater, cost: startNow - startLater };
}

/**
 * Paying only the minimum on a credit card: each month's minimum is a percent of the balance (but never less than a floor),
 * so the payment shrinks as the balance does. Null months means it is still not paid off after 100 years.
 */
export function minimumOnlyPayoff(balance: number, aprPercent: number, minPercent: number, floor: number): { months: number | null; totalInterest: number } {
  let bal = pos(balance);
  const r = pos(aprPercent) / 100 / 12;
  let interest = 0;
  for (let m = 1; m <= 1200; m++) {
    if (bal <= 0.005) return { months: m - 1, totalInterest: interest };
    const i = bal * r;
    interest += i;
    bal += i;
    bal -= Math.min(bal, Math.max(pos(floor), (bal * pos(minPercent)) / 100));
  }
  return { months: bal <= 0.005 ? 1200 : null, totalInterest: interest };
}

/** What is still owed after each month of a loan paid with a fixed payment plus an extra amount (the first value is the starting balance). */
export function loanBalances(balance: number, aprPercent: number, payment: number, extra: number, maxMonths = 600): number[] {
  let bal = pos(balance);
  const r = pos(aprPercent) / 100 / 12;
  const pay = pos(payment) + pos(extra);
  const out = [bal];
  for (let m = 1; m <= maxMonths && bal > 0.005; m++) {
    const i = bal * r;
    if (pay <= i + 0.005) break; // never gets paid off at this payment
    bal = Math.max(0, bal + i - Math.min(pay, bal + i));
    out.push(bal);
  }
  return out;
}

/** The balance of an investment (or savings) after each year, from its start. */
export function growthByYear(initial: number, monthly: number, annualPercent: number, years: number): number[] {
  const out: number[] = [];
  for (let y = 0; y <= Math.min(80, Math.round(pos(years))); y++) out.push(futureValue(initial, monthly, annualPercent, y));
  return out;
}

/** What is owed after each month when only the minimum is paid (the first value is the starting balance; at most 40 years shown). */
export function minimumOnlyBalances(balance: number, aprPercent: number, minPercent: number, floor: number): number[] {
  let bal = pos(balance);
  const r = pos(aprPercent) / 100 / 12;
  const out = [bal];
  for (let m = 1; m <= 480 && bal > 0.005; m++) {
    bal += bal * r;
    bal -= Math.min(bal, Math.max(pos(floor), (bal * pos(minPercent)) / 100));
    out.push(bal);
  }
  return out;
}

/** Savings after each month of a level monthly amount, up to the month it reaches the goal (at most 20 years shown). */
export function savingsByMonth(saved: number, monthly: number, aprPercent: number, goal: number): number[] {
  let bal = pos(saved);
  const r = pos(aprPercent) / 100 / 12;
  const out = [bal];
  for (let m = 1; m <= 240 && bal < pos(goal); m++) {
    bal = bal * (1 + r) + pos(monthly);
    out.push(Math.min(bal, pos(goal)));
  }
  return out;
}
