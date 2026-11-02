/**
 * A small integrated three-statement model: income statement, balance sheet and cash flow statement, five years forward, built so the
 * balance sheet always balances and the cash flow statement ties to the change in cash. It exists to practice how the statements
 * connect (the classic interview question: what happens to each statement when depreciation rises?). Amounts in millions of dollars.
 */

const n = (v: unknown): number => {
  const x = parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};
const pct = (v: string) => n(v) / 100;

export interface StatementInputs {
  /** Opening balance sheet (the year before the forecast). */
  cash: string;
  receivables: string;
  inventory: string;
  ppe: string;
  payables: string;
  debt: string;
  /** Last year's revenue, and growth for each of the five years, percent. */
  revenue: string;
  growth: string[];
  cogs: string;
  sga: string;
  /** D&A and capex as percents of revenue. */
  da: string;
  capex: string;
  /** Days of revenue in receivables, and days of COGS in inventory and payables. */
  arDays: string;
  invDays: string;
  apDays: string;
  tax: string;
  /** Interest rate on opening debt, and on opening cash. */
  interest: string;
  cashRate: string;
  /** Debt repaid each year, and the share of net income paid as dividends. */
  repay: string;
  payout: string;
}

export const defaultStatements = (): StatementInputs => ({
  cash: "100", receivables: "120", inventory: "90", ppe: "500", payables: "70", debt: "300",
  revenue: "1000", growth: ["8", "7", "6", "5", "5"], cogs: "60", sga: "20", da: "5", capex: "6",
  arDays: "45", invDays: "55", apDays: "40", tax: "25", interest: "6", cashRate: "2", repay: "20", payout: "30",
});

export interface StatementYear {
  year: number;
  // Income statement
  revenue: number; cogs: number; grossProfit: number; sga: number; ebitda: number; da: number; ebit: number;
  interestExpense: number; interestIncome: number; ebt: number; tax: number; netIncome: number;
  // Balance sheet
  cash: number; receivables: number; inventory: number; ppe: number; assets: number; payables: number; debt: number; liabilities: number; equity: number;
  // Cash flow
  cfo: number; cfi: number; cff: number; netChange: number;
  /** Total assets less liabilities and equity: zero when the model balances. */
  check: number;
}

export interface StatementResult {
  openingEquity: number;
  years: StatementYear[];
  /** The largest balance check in absolute value across the years. */
  worstCheck: number;
  balances: boolean;
  /** Years in which cash falls below zero, which means the company would need financing. */
  shortfallYears: number[];
  steps: string[];
}

export function statements(i: StatementInputs): StatementResult {
  const openingAssets = n(i.cash) + n(i.receivables) + n(i.inventory) + n(i.ppe);
  const openingEquity = openingAssets - n(i.payables) - n(i.debt);
  let cash = n(i.cash);
  let ar = n(i.receivables);
  let inv = n(i.inventory);
  let ppe = n(i.ppe);
  let ap = n(i.payables);
  let debt = n(i.debt);
  let equity = openingEquity;
  let rev = n(i.revenue);
  const years: StatementYear[] = [];
  for (let k = 0; k < 5; k++) {
    rev *= 1 + pct(i.growth[k] ?? "0");
    const cogs = rev * pct(i.cogs);
    const gross = rev - cogs;
    const sga = rev * pct(i.sga);
    const ebitda = gross - sga;
    const da = rev * pct(i.da);
    const ebit = ebitda - da;
    const intExp = debt * pct(i.interest);
    const intInc = Math.max(0, cash) * pct(i.cashRate);
    const ebt = ebit - intExp + intInc;
    const tax = Math.max(0, ebt) * pct(i.tax);
    const ni = ebt - tax;
    const capex = rev * pct(i.capex);
    const newAr = (rev * n(i.arDays)) / 365;
    const newInv = (cogs * n(i.invDays)) / 365;
    const newAp = (cogs * n(i.apDays)) / 365;
    const repay = Math.min(debt, n(i.repay));
    const dividends = Math.max(0, ni) * pct(i.payout);
    const cfo = ni + da - (newAr - ar) - (newInv - inv) + (newAp - ap);
    const cfi = -capex;
    const cff = -repay - dividends;
    const net = cfo + cfi + cff;
    cash += net;
    ar = newAr;
    inv = newInv;
    ap = newAp;
    ppe = ppe + capex - da;
    debt -= repay;
    equity += ni - dividends;
    const assets = cash + ar + inv + ppe;
    const liabilities = ap + debt;
    years.push({ year: k + 1, revenue: rev, cogs, grossProfit: gross, sga, ebitda, da, ebit, interestExpense: intExp, interestIncome: intInc, ebt, tax, netIncome: ni, cash, receivables: ar, inventory: inv, ppe, assets, payables: ap, debt, liabilities, equity, cfo, cfi, cff, netChange: net, check: assets - liabilities - equity });
  }
  const worst = Math.max(...years.map((y) => Math.abs(y.check)));
  return {
    openingEquity,
    years,
    worstCheck: worst,
    balances: worst < 1e-6,
    shortfallYears: years.filter((y) => y.cash < 0).map((y) => y.year),
    steps: [
      `Revenue grows by the stated rate each year. COGS, SG&A, D&A and capex are percents of revenue; EBITDA = revenue − COGS − SG&A; EBIT = EBITDA − D&A.`,
      `Interest expense is the opening debt × the interest rate; interest income is the opening cash × the cash rate. Taxes = pre-tax income × the tax rate; net income is what is left.`,
      `Receivables = revenue × days ÷ 365; inventory and payables = COGS × days ÷ 365. PP&E = last year's + capex − D&A. Debt falls by the repayment. Equity = last year's + net income − dividends.`,
      `Cash flow from operations = net income + D&A − the increase in receivables − the increase in inventory + the increase in payables. Investing = −capex. Financing = −debt repaid − dividends.`,
      `Cash at year end = last year's cash + the net change in cash. Nothing is forced to balance: total assets minus liabilities and equity is calculated each year, and it is zero because every line on the balance sheet moves with a matching line on the other statements.`,
    ],
  };
}
