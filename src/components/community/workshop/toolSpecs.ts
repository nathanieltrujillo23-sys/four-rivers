import { estimateTax, STANDARD_DEDUCTION, TAX_YEAR, type FilingStatus } from "../../../lib/taxMath";
import {
  costOfWaiting,
  futureValue,
  growthByYear,
  loanBalances,
  minimumOnlyBalances,
  savingsByMonth,
  loanSummary,
  minimumOnlyPayoff,
  monthlyToReachGoal,
  monthsToReachGoal,
  payoffWithExtra,
  retirementPlan,
  splitMoney,
  wishSchedule,
} from "../../../lib/scenarioMath";
import type { ToolId } from "./toolCatalog";
import type { Series } from "./charts";

/** One line in a list field: a name and a dollar amount. */
export interface Item {
  id: string;
  name: string;
  amount: number;
}

export type Field =
  | { kind: "num"; key: string; label: string; def: number; prefix?: string; suffix?: string; step?: number }
  | { kind: "text"; key: string; label: string; def?: string }
  | { kind: "area"; key: string; label: string; hint?: string }
  | { kind: "choice"; key: string; label: string; options: [string, string][]; def: string }
  | { kind: "list"; key: string; label: string; nameLabel: string; amountLabel: string; add: string; max: number; def: [string, number][] };

export type Values = Record<string, number | string | Item[]>;

export interface ResultRow {
  label: string;
  value: string;
  note?: string;
  strong?: boolean;
}

export interface ToolSpec {
  /** Paragraphs shown above the fields. */
  intro?: string[];
  inputsHeading?: string;
  resultsHeading?: string;
  fields: Field[];
  compute: (v: Values) => { results: ResultRow[]; notes?: string[] };
  /** An optional chart under the results: lines that draw themselves. */
  chart?: (v: Values) => { series: Series[]; startLabel: string; endLabel: string; caption: string } | null;
}

const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
const usd2 = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0);
const months = (n: number | null) => {
  if (n === null) return "never at these payments";
  const y = Math.floor(n / 12);
  const m = n % 12;
  return [y ? `${y} yr` : "", m || !y ? `${m} mo` : ""].filter(Boolean).join(" ");
};
const n = (v: Values, k: string) => (typeof v[k] === "number" ? (v[k] as number) : 0);
const s = (v: Values, k: string) => (typeof v[k] === "string" ? (v[k] as string) : "");
const list = (v: Values, k: string) => (Array.isArray(v[k]) ? (v[k] as Item[]) : []);
const sum = (items: Item[]) => items.reduce((t, i) => t + i.amount, 0);
const share = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);


/** The estate documents share a shape: a status, a few decisions, and where the paper is kept. */
const STATUS: Field = {
  kind: "choice",
  key: "status",
  label: "Where this stands",
  def: "none",
  options: [
    ["none", "Not started"],
    ["talking", "Talking to an attorney"],
    ["drafted", "Drafted, not yet signed"],
    ["signed", "Signed and stored safely"],
  ],
};
const ESTATE_NOTE = "Signing and witnessing rules differ by state. Have a licensed estate planning attorney in your state prepare and review these documents. This organizer is not legal advice.";

function estate(intro: string[], fields: Field[], extra?: string[]): ToolSpec {
  return {
    intro,
    inputsHeading: "Your plan",
    resultsHeading: "Where it stands",
    fields: [STATUS, ...fields],
    compute: (v) => {
      const decisions = fields.filter((f) => f.kind === "text" || f.kind === "area" || f.kind === "choice");
      const done = decisions.filter((f) => {
        const val = s(v, f.key);
        return val !== "" && val !== (f.kind === "choice" ? f.def : "");
      }).length;
      const label = (STATUS as Extract<Field, { kind: "choice" }>).options.find(([k]) => k === s(v, "status"))?.[1] ?? "";
      return {
        results: [
          { label: "Status", value: label, strong: s(v, "status") === "signed" },
          { label: "Decisions filled in", value: `${done} of ${decisions.length}` },
        ],
        notes: [...(extra ?? []), ESTATE_NOTE],
      };
    },
  };
}

export const SPECS: Partial<Record<ToolId, ToolSpec>> = {
  /* ------------------------------------------------------------ Live */
  budget: {
    intro: [
      "Needs are what you must pay to live and work. Wants are the regular extras you choose. Wishes are the bigger things you save toward. What is left over goes to giving, growing, and paying down debt, which the other sections plan.",
    ],
    fields: [
      { kind: "list", key: "income", label: "Income", nameLabel: "Source", amountLabel: "Per month", add: "income", max: 8, def: [["Take-home pay", 3200]] },
      { kind: "list", key: "needs", label: "Needs", nameLabel: "Need", amountLabel: "Per month", add: "need", max: 14, def: [["Rent", 1100], ["Food", 350], ["Transportation", 250], ["Insurance and bills", 250]] },
      { kind: "list", key: "wants", label: "Wants", nameLabel: "Want", amountLabel: "Per month", add: "want", max: 14, def: [["Eating out", 120], ["Subscriptions", 40], ["Fun", 100]] },
      { kind: "list", key: "wishes", label: "Wishes", nameLabel: "Wish", amountLabel: "Per month", add: "wish", max: 10, def: [["Trip fund", 100], ["New laptop", 60]] },
    ],
    compute: (v) => {
      const inc = sum(list(v, "income"));
      const need = sum(list(v, "needs"));
      const want = sum(list(v, "wants"));
      const wish = sum(list(v, "wishes"));
      const left = inc - need - want - wish;
      return {
        results: [
          { label: "Income", value: usd(inc) },
          { label: "Needs", value: usd(need), note: `${share(need, inc)}% of income. A common guide is about 50% or less.` },
          { label: "Wants", value: usd(want), note: `${share(want, inc)}% of income` },
          { label: "Wishes", value: usd(wish), note: `${share(wish, inc)}% of income. Wants and wishes together: about 30% or less.` },
          {
            label: left >= 0 ? "Left for giving, growing, and owing" : "Over by",
            value: usd(Math.abs(left)),
            note: left >= 0 ? `${share(left, inc)}% of income. Give every dollar a job.` : "Plans add up to more than income",
            strong: left >= 0,
          },
        ],
      };
    },
  },
  rent: {
    fields: [
      { kind: "num", key: "rent", label: "Total rent per month", prefix: "$", def: 1800 },
      { kind: "num", key: "people", label: "People sharing, including you", def: 2 },
      { kind: "num", key: "utilities", label: "Utilities per month (total)", prefix: "$", def: 220 },
      { kind: "num", key: "internet", label: "Internet per month (total)", prefix: "$", def: 60 },
      { kind: "num", key: "insurance", label: "Your renters insurance per month", prefix: "$", def: 20 },
      { kind: "num", key: "income", label: "Your income per month, before tax", prefix: "$", def: 4200 },
    ],
    compute: (v) => {
      const p = Math.max(1, Math.round(n(v, "people")));
      const rentShare = n(v, "rent") / p;
      const other = (n(v, "utilities") + n(v, "internet")) / p + n(v, "insurance");
      const total = rentShare + other;
      const income = n(v, "income");
      return {
        results: [
          { label: "Your share of the rent", value: usd(rentShare) },
          { label: "Your share of utilities, internet, and insurance", value: usd(other) },
          { label: "Your housing cost", value: usd(total), strong: true },
          { label: "Share of your income", value: income > 0 ? `${Math.round((total / income) * 100)}%` : "Add your income", note: "A common guide is about 30% or less." },
          { label: "Housing at 30% of income would be", value: usd(income * 0.3) },
          { label: "Saved by sharing, compared with living alone", value: usd(n(v, "rent") - rentShare), note: "on rent each month" },
        ],
        notes: ["Agree on who pays what, who is on the lease, and what happens if a roommate leaves, before you sign."],
      };
    },
  },
  emergency: {
    fields: [
      { kind: "num", key: "needs", label: "Needs per month", prefix: "$", def: 2300 },
      { kind: "num", key: "months", label: "Months of needs to cover", def: 3 },
      { kind: "num", key: "saved", label: "Saved so far", prefix: "$", def: 1000 },
      { kind: "num", key: "monthly", label: "Added each month", prefix: "$", def: 200 },
      { kind: "num", key: "apr", label: "Savings interest", suffix: "%", step: 0.5, def: 4 },
    ],
    compute: (v) => {
      const target = n(v, "needs") * n(v, "months");
      const covered = n(v, "needs") > 0 ? n(v, "saved") / n(v, "needs") : 0;
      const wait = monthsToReachGoal(target, n(v, "saved"), n(v, "monthly"), n(v, "apr"));
      return {
        results: [
          { label: "Target", value: usd(target), note: `${n(v, "months")} months of needs` },
          { label: "Covered today", value: `${Math.round(covered * 10) / 10} months`, note: `${usd(n(v, "saved"))} saved` },
          { label: "Still to save", value: usd(Math.max(0, target - n(v, "saved"))) },
          { label: `At ${usd(n(v, "monthly"))} a month`, value: wait === null ? "Not reached" : wait === 0 ? "Already there" : `Ready in ${months(wait)}`, strong: true },
        ],
        notes: ["Many people start with one month of needs, then build toward three to six. Keep it in a separate savings account that is easy to reach but not easy to spend."],
      };
    },
  },
  trimwant: {
    fields: [
      { kind: "text", key: "item", label: "The want", def: "Coffee shop drinks" },
      { kind: "num", key: "cost", label: "Cost each time", prefix: "$", step: 0.25, def: 6 },
      { kind: "num", key: "now", label: "Times a week now", def: 5 },
      { kind: "num", key: "after", label: "Times a week after trimming", def: 2 },
      { kind: "num", key: "ret", label: "Yearly return if invested", suffix: "%", step: 0.5, def: 7 },
      { kind: "num", key: "years", label: "Years", def: 20 },
    ],
    compute: (v) => {
      const now = n(v, "cost") * n(v, "now") * 52;
      const after = n(v, "cost") * n(v, "after") * 52;
      const saved = Math.max(0, now - after);
      return {
        results: [
          { label: "Costs each year now", value: usd(now) },
          { label: "Costs each year after trimming", value: usd(after) },
          { label: "Saved each year", value: usd(saved), strong: true },
          { label: `If invested for ${n(v, "years")} years`, value: usd(futureValue(0, saved / 12, n(v, "ret"), n(v, "years"))), note: "an estimate, not a promise" },
        ],
        notes: ["The goal is not to cut every want. Trim the ones you enjoy least, and keep the ones that are worth it."],
      };
    },
  },
  wishes: {
    intro: ["Put the wish you want first at the top. Each wish is paid for before the next one starts."],
    fields: [
      { kind: "list", key: "wishes", label: "Wishes, in order", nameLabel: "Wish", amountLabel: "Cost", add: "wish", max: 10, def: [["New laptop", 1200], ["Weekend trip", 600], ["Bike", 400]] },
      { kind: "num", key: "saved", label: "Already set aside for wishes", prefix: "$", def: 200 },
      { kind: "num", key: "monthly", label: "Set aside each month", prefix: "$", def: 150 },
    ],
    compute: (v) => {
      const items = list(v, "wishes");
      const when = wishSchedule(items.map((i) => i.amount), n(v, "saved"), n(v, "monthly"));
      const total = sum(items);
      return {
        results: [
          ...items.map((i, k): ResultRow => ({ label: i.name || `Wish ${k + 1}`, value: when[k] === null ? "Not reached" : when[k] === 0 ? "Already covered" : `Ready in ${months(when[k])}`, note: usd(i.amount) })),
          { label: "All wishes cost", value: usd(total), strong: true },
        ],
      };
    },
  },
  /* ------------------------------------------------------------ Give */
  giveplan: {
    fields: [
      { kind: "num", key: "income", label: "Take-home pay per month", prefix: "$", def: 3200 },
      { kind: "num", key: "percent", label: "Percent to give", suffix: "%", step: 0.5, def: 10 },
      { kind: "num", key: "church", label: "Share to church", suffix: "%", def: 60 },
      { kind: "num", key: "family", label: "Share to family", suffix: "%", def: 15 },
      { kind: "num", key: "friends", label: "Share to friends", suffix: "%", def: 10 },
      { kind: "num", key: "charity", label: "Share to charity", suffix: "%", def: 15 },
    ],
    compute: (v) => {
      const total = (n(v, "income") * n(v, "percent")) / 100;
      const parts = splitMoney(total, { Church: n(v, "church"), Family: n(v, "family"), Friends: n(v, "friends"), Charity: n(v, "charity") });
      return {
        results: [
          { label: "Giving each month", value: usd(total), note: `${usd(total * 12)} a year`, strong: true },
          ...Object.entries(parts).map(([k, a]): ResultRow => ({ label: k, value: usd(a), note: `${usd(a * 12)} a year` })),
        ],
        notes: ["Shares are scaled to 100% if they do not add up. Deciding the split before the money arrives is what keeps giving steady. Many people raise their percent a little each year."],
      };
    },
  },
  church: {
    fields: [
      { kind: "num", key: "gross", label: "Income per month, before tax", prefix: "$", def: 4200 },
      { kind: "num", key: "net", label: "Take-home pay per month", prefix: "$", def: 3200 },
      { kind: "num", key: "percent", label: "Percent to give", suffix: "%", step: 0.5, def: 10 },
      { kind: "choice", key: "base", label: "Figure it on", def: "gross", options: [["gross", "Income before tax"], ["net", "Take-home pay"]] },
      { kind: "choice", key: "freq", label: "How often you are paid", def: "26", options: [["52", "Weekly"], ["26", "Every two weeks"], ["24", "Twice a month"], ["12", "Monthly"]] },
      { kind: "num", key: "offering", label: "Extra offerings per month", prefix: "$", def: 25 },
    ],
    compute: (v) => {
      const base = s(v, "base") === "net" ? n(v, "net") : n(v, "gross");
      const monthly = (base * n(v, "percent")) / 100;
      const periods = Number(s(v, "freq")) || 12;
      return {
        results: [
          { label: "Tithe each month", value: usd(monthly), strong: true },
          { label: "Each paycheck", value: usd2((monthly * 12) / periods), note: `${periods} paychecks a year` },
          { label: "Tithe each year", value: usd(monthly * 12) },
          { label: "With offerings, each year", value: usd(monthly * 12 + n(v, "offering") * 12) },
        ],
        notes: ["Churches and traditions teach this differently, and the choice is yours before God.", "\"Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.\" 2 Corinthians 9:7 (NIV)"],
      };
    },
  },
  family: {
    fields: [
      { kind: "list", key: "support", label: "Regular monthly support", nameLabel: "Who", amountLabel: "Per month", add: "person", max: 8, def: [["Parents", 150], ["Sibling", 50]] },
      { kind: "num", key: "onetime", label: "One-time gifts and help in a year", prefix: "$", def: 300 },
      { kind: "num", key: "income", label: "Take-home pay per month", prefix: "$", def: 3200 },
    ],
    compute: (v) => {
      const monthly = sum(list(v, "support"));
      const yearly = monthly * 12 + n(v, "onetime");
      return {
        results: [
          { label: "Support each month", value: usd(monthly) },
          { label: "Total each year", value: usd(yearly), strong: true },
          { label: "Share of take-home pay", value: n(v, "income") > 0 ? `${Math.round((yearly / 12 / n(v, "income")) * 100)}%` : "Add your income" },
          { label: "Left each month after family support", value: usd(n(v, "income") - yearly / 12) },
        ],
        notes: ["Agree on what you can give, for how long, and what you cannot. Clear limits keep generosity from turning into resentment."],
      };
    },
  },
  friends: {
    fields: [
      { kind: "list", key: "occasions", label: "Occasions in a year", nameLabel: "Occasion", amountLabel: "Per year", add: "occasion", max: 12, def: [["Birthdays", 240], ["Weddings and showers", 300], ["Christmas and holidays", 300], ["Hospitality and hosting", 200]] },
    ],
    compute: (v) => {
      const total = sum(list(v, "occasions"));
      return {
        results: [
          { label: "Total for the year", value: usd(total), strong: true },
          { label: "Set aside each month", value: usd(total / 12) },
          { label: "Set aside each paycheck (every two weeks)", value: usd2(total / 26) },
        ],
        notes: ["Planning gifts and hosting ahead keeps joyful moments from landing on a credit card."],
      };
    },
  },
  charity: {
    fields: [
      { kind: "num", key: "monthly", label: "Gift each month", prefix: "$", def: 50 },
      { kind: "num", key: "match", label: "Employer match on your gift", suffix: "%", def: 0 },
      { kind: "choice", key: "itemize", label: "Do you itemize deductions?", def: "no", options: [["no", "No"], ["yes", "Yes"]] },
      { kind: "num", key: "tax", label: "Your tax rate", suffix: "%", def: 22 },
      { kind: "num", key: "years", label: "Years", def: 10 },
    ],
    compute: (v) => {
      const yearly = n(v, "monthly") * 12;
      const matched = (yearly * n(v, "match")) / 100;
      const taxSaved = s(v, "itemize") === "yes" ? (yearly * n(v, "tax")) / 100 : 0;
      return {
        results: [
          { label: "You give each year", value: usd(yearly) },
          { label: "Reaches the charity each year", value: usd(yearly + matched), note: matched > 0 ? `${usd(matched)} from your employer` : undefined, strong: true },
          { label: "Tax savings each year", value: usd(taxSaved), note: s(v, "itemize") === "yes" ? undefined : "Most people take the standard deduction, so a gift often does not lower their tax" },
          { label: "True yearly cost to you", value: usd(yearly - taxSaved) },
          { label: `Reaches the charity over ${n(v, "years")} years`, value: usd((yearly + matched) * n(v, "years")) },
        ],
        notes: ["Check that a charity is legitimate and spends well, and keep your receipts. Deduction rules change, so confirm with a tax professional."],
      };
    },
  },
  /* ------------------------------------------------------------ Grow */
  compound: {
    fields: [
      { kind: "num", key: "initial", label: "Start with", prefix: "$", def: 1000 },
      { kind: "num", key: "monthly", label: "Add each month", prefix: "$", def: 200 },
      { kind: "num", key: "ret", label: "Yearly return you assume", suffix: "%", step: 0.5, def: 7 },
      { kind: "num", key: "years", label: "Years", def: 30 },
      { kind: "num", key: "wait", label: "Years you might wait to start", def: 10 },
    ],
    compute: (v) => {
      const end = futureValue(n(v, "initial"), n(v, "monthly"), n(v, "ret"), n(v, "years"));
      const put = n(v, "initial") + n(v, "monthly") * 12 * n(v, "years");
      const w = costOfWaiting(n(v, "initial"), n(v, "monthly"), n(v, "ret"), n(v, "years"), n(v, "wait"));
      return {
        results: [
          { label: "If you start now", value: usd(end), note: `${usd(put)} put in`, strong: true },
          { label: "Growth on top of what you put in", value: usd(end - put) },
          { label: `If you wait ${n(v, "wait")} years to start`, value: usd(w.startLater) },
          { label: "What waiting costs", value: usd(w.cost) },
        ],
        notes: ["The markets do not return a steady rate. This shows what time does, not what will happen."],
      };
    },
  },
  retire: {
    fields: [
      { kind: "num", key: "spend", label: "Yearly spending you want, in today's dollars", prefix: "$", def: 48000 },
      { kind: "num", key: "other", label: "Yearly income from other sources (Social Security, pension)", prefix: "$", def: 18000 },
      { kind: "num", key: "withdraw", label: "Yearly withdrawal rate", suffix: "%", step: 0.25, def: 4 },
      { kind: "num", key: "saved", label: "Saved so far", prefix: "$", def: 5000 },
      { kind: "num", key: "monthly", label: "Added each month", prefix: "$", def: 300 },
      { kind: "num", key: "years", label: "Years until retirement", def: 35 },
      { kind: "num", key: "ret", label: "Yearly return you assume", suffix: "%", step: 0.5, def: 7 },
      { kind: "num", key: "infl", label: "Yearly inflation", suffix: "%", step: 0.5, def: 3 },
    ],
    compute: (v) => {
      const r = retirementPlan({ spendYearly: n(v, "spend"), otherIncomeYearly: n(v, "other"), withdrawalPercent: n(v, "withdraw"), saved: n(v, "saved"), monthly: n(v, "monthly"), years: n(v, "years"), returnPercent: n(v, "ret"), inflationPercent: n(v, "infl") });
      return {
        results: [
          { label: "Target savings (today's dollars)", value: usd(r.target), strong: true },
          { label: "On track for (today's dollars)", value: usd(r.projected) },
          { label: r.gap > 0 ? "Gap to close" : "Ahead of the target by", value: usd(Math.abs(r.gap)) },
          { label: "Monthly saving that would reach the target", value: usd(r.neededMonthly) },
        ],
        notes: ["Everything is in today's dollars, so inflation is already counted. The withdrawal rate, return, and Social Security are guesses; revisit them often."],
      };
    },
  },
  /* ------------------------------------------------------------ Owe */
  payoff: {
    intro: ["For a student loan, a car loan, or a home loan. Enter what is left, and see what an extra payment does."],
    fields: [
      { kind: "num", key: "balance", label: "Balance left", prefix: "$", def: 25000 },
      { kind: "num", key: "apr", label: "Interest (APR)", suffix: "%", step: 0.25, def: 6 },
      { kind: "num", key: "left", label: "Months left on the loan", def: 120 },
      { kind: "num", key: "extra", label: "Extra you could pay each month", prefix: "$", def: 150 },
    ],
    compute: (v) => {
      const pay = loanSummary(n(v, "balance"), n(v, "apr"), n(v, "left")).payment;
      const base = payoffWithExtra(n(v, "balance"), n(v, "apr"), pay, 0);
      const fast = payoffWithExtra(n(v, "balance"), n(v, "apr"), pay, n(v, "extra"));
      const sooner = base.months !== null && fast.months !== null ? base.months - fast.months : null;
      return {
        results: [
          { label: "Regular payment", value: usd(pay), note: `${usd(base.totalInterest)} interest over the rest of the loan` },
          { label: "With the extra payment", value: usd(pay + n(v, "extra")), note: fast.months === null ? undefined : `paid off in ${months(fast.months)}` },
          { label: "Paid off sooner by", value: sooner === null ? "-" : months(sooner), strong: true },
          { label: "Interest saved", value: usd(Math.max(0, base.totalInterest - fast.totalInterest)) },
        ],
        notes: ["Before paying extra, check the loan has no penalty for it, and that the extra goes to the principal. Compare the interest rate to what you could earn elsewhere."],
      };
    },
  },
  loans: {
    fields: [
      { kind: "num", key: "amount", label: "Amount borrowed", prefix: "$", def: 20000 },
      { kind: "num", key: "aprA", label: "Loan A interest (APR)", suffix: "%", step: 0.125, def: 6.5 },
      { kind: "num", key: "termA", label: "Loan A length", suffix: "months", def: 60 },
      { kind: "num", key: "feesA", label: "Loan A fees", prefix: "$", def: 300 },
      { kind: "num", key: "aprB", label: "Loan B interest (APR)", suffix: "%", step: 0.125, def: 5.9 },
      { kind: "num", key: "termB", label: "Loan B length", suffix: "months", def: 72 },
      { kind: "num", key: "feesB", label: "Loan B fees", prefix: "$", def: 0 },
    ],
    compute: (v) => {
      const a = loanSummary(n(v, "amount"), n(v, "aprA"), n(v, "termA"));
      const b = loanSummary(n(v, "amount"), n(v, "aprB"), n(v, "termB"));
      const costA = a.totalPaid + n(v, "feesA");
      const costB = b.totalPaid + n(v, "feesB");
      const cheaper = costA === costB ? "Same" : costA < costB ? "Loan A" : "Loan B";
      return {
        results: [
          { label: "Loan A payment", value: usd(a.payment), note: `${usd(costA)} total with fees` },
          { label: "Loan B payment", value: usd(b.payment), note: `${usd(costB)} total with fees` },
          { label: "Costs less overall", value: cheaper, note: cheaper === "Same" ? undefined : `by ${usd(Math.abs(costA - costB))}`, strong: true },
          { label: "Lower monthly payment", value: a.payment === b.payment ? "Same" : a.payment < b.payment ? "Loan A" : "Loan B", note: "A longer loan often has the lower payment and the higher total" },
        ],
        notes: ["Compare the APR and every fee, and ask whether a longer term is lowering the payment or just stretching the cost."],
      };
    },
  },
  /* ------------------------------------------------------------ Estate */
  will: estate(
    [
      "A will says who gets what you own, who carries out your wishes (the executor), and who raises any minor children. Without one, state law decides, and a court may choose the guardian.",
      "A will goes through probate. Some things pass outside it, such as retirement accounts and life insurance with a named beneficiary, so check those beneficiary forms too: they override the will.",
    ],
    [
      { kind: "text", key: "executor", label: "Executor (carries out the will)" },
      { kind: "text", key: "executor2", label: "Backup executor" },
      { kind: "text", key: "guardian", label: "Guardian for minor children (if any)" },
      { kind: "area", key: "gifts", label: "Key gifts and wishes", hint: "Who should receive what matters most, including gifts to church or charity." },
      { kind: "text", key: "where", label: "Where the original is kept" },
      { kind: "text", key: "reviewed", label: "Last reviewed (year)" },
    ],
  ),
  trust: estate(
    [
      "A revocable living trust holds your assets for your benefit while you live, and passes them to the people you name afterward, usually without probate. You can change or cancel it while you are able.",
      "It only works for assets that are actually put in the trust (retitled). It tends to matter most for larger estates, property in more than one state, privacy, and planning for incapacity. Not everyone needs one.",
    ],
    [
      { kind: "text", key: "trustee", label: "Trustee now (usually you)" },
      { kind: "text", key: "successor", label: "Successor trustee (takes over if you cannot)" },
      { kind: "text", key: "beneficiaries", label: "Beneficiaries" },
      { kind: "area", key: "assets", label: "Assets to put in the trust", hint: "Home, accounts, businesses. Retirement accounts usually stay out and use beneficiary forms." },
      { kind: "choice", key: "funded", label: "Have the assets been retitled?", def: "no", options: [["no", "Not yet"], ["some", "Some"], ["yes", "Yes, all"]] },
    ],
    ["A trust that is signed but not funded does little. Retitling the assets is the step people most often skip."],
  ),
  financialpoa: estate(
    [
      "A durable power of attorney names someone (your agent) to handle your money and legal matters if you cannot: pay bills, manage accounts, file taxes. \"Durable\" means it keeps working if you become incapacitated.",
      "Choose someone trustworthy and organized, and a backup. An agent has real power over your finances.",
    ],
    [
      { kind: "text", key: "agent", label: "Agent" },
      { kind: "text", key: "agent2", label: "Backup agent" },
      { kind: "choice", key: "starts", label: "When it starts", def: "now", options: [["now", "Right away"], ["springing", "Only if I cannot act"]] },
      { kind: "area", key: "limits", label: "Powers and limits", hint: "What the agent may do, and what you do not want them to do." },
      { kind: "text", key: "where", label: "Where the original is kept" },
    ],
  ),
  healthpoa: estate(
    [
      "A health care power of attorney (also called a health care proxy or surrogate) names someone to make medical decisions for you if you cannot speak for yourself.",
      "Pick someone calm who knows your values, and talk with them in advance about what you would want.",
    ],
    [
      { kind: "text", key: "agent", label: "Health care agent" },
      { kind: "text", key: "agent2", label: "Backup agent" },
      { kind: "choice", key: "talked", label: "Have you talked with them about your wishes?", def: "no", options: [["no", "Not yet"], ["some", "A little"], ["yes", "Yes, in detail"]] },
      { kind: "area", key: "notes", label: "What your agent should know" },
      { kind: "text", key: "copies", label: "Who has a copy (doctor, hospital, family)" },
    ],
  ),
  livingwill: estate(
    [
      "A living will, or advance directive, says in your own words what medical care you would and would not want if you are seriously ill and cannot speak for yourself, such as life support or feeding tubes.",
      "It works together with your health care power of attorney: one tells your agent what you want, the other names who decides.",
    ],
    [
      { kind: "area", key: "wishes", label: "Care you would want or not want", hint: "In your own words, with your values and faith in mind." },
      { kind: "choice", key: "organs", label: "Organ donation", def: "undecided", options: [["undecided", "Undecided"], ["yes", "Yes"], ["no", "No"]] },
      { kind: "text", key: "copies", label: "Who has a copy" },
      { kind: "text", key: "reviewed", label: "Last reviewed (year)" },
    ],
  ),
  /* ------------------------------------------------------------ Other goals */
  baby: {
    fields: [
      { kind: "num", key: "oneTime", label: "One-time costs (crib, car seat, delivery)", prefix: "$", def: 2500 },
      { kind: "num", key: "monthly", label: "Everyday costs per month (diapers, food, clothes)", prefix: "$", def: 450 },
      { kind: "num", key: "childcare", label: "Childcare per month", prefix: "$", def: 900 },
      { kind: "num", key: "insurance", label: "Extra health insurance per month", prefix: "$", def: 150 },
      { kind: "num", key: "leaveMonths", label: "Months of reduced income", def: 3 },
      { kind: "num", key: "leaveLoss", label: "Income lost each of those months", prefix: "$", def: 1200 },
      { kind: "num", key: "margin", label: "Left each month today, after all costs", prefix: "$", def: 400 },
      { kind: "num", key: "until", label: "Months until the baby arrives", def: 9 },
    ],
    compute: (v) => {
      const newMonthly = n(v, "monthly") + n(v, "childcare") + n(v, "insurance");
      const lost = n(v, "leaveMonths") * n(v, "leaveLoss");
      const firstYear = n(v, "oneTime") + newMonthly * 12 + lost;
      const prep = n(v, "until") > 0 ? (n(v, "oneTime") + lost) / n(v, "until") : n(v, "oneTime") + lost;
      const margin = n(v, "margin") - newMonthly;
      return {
        results: [
          { label: "New monthly cost", value: usd(newMonthly) },
          { label: "Left each month after the baby", value: usd(margin), note: margin < 0 ? "A monthly shortfall to plan for" : undefined },
          { label: "First-year cost", value: usd(firstYear), note: "one-time costs, a year of monthly costs, and income lost" },
          { label: "To set aside before the baby arrives", value: `${usd(prep)} a month`, strong: true },
        ],
        notes: ["Check what your employer and insurance cover before the due date. Many families also update their will, a guardian choice, and life insurance when a child arrives."],
      };
    },
  },
  business: {
    fields: [
      { kind: "num", key: "startup", label: "Start-up costs", prefix: "$", def: 3000 },
      { kind: "num", key: "revenue", label: "Revenue per month", prefix: "$", def: 1500 },
      { kind: "num", key: "costs", label: "Costs per month", prefix: "$", def: 600 },
      { kind: "num", key: "hours", label: "Hours a week", def: 10 },
      { kind: "num", key: "tax", label: "Set aside for taxes", suffix: "%", def: 25 },
    ],
    compute: (v) => {
      const profit = n(v, "revenue") - n(v, "costs");
      const after = profit * (1 - Math.min(90, n(v, "tax")) / 100);
      const hourly = n(v, "hours") > 0 ? after / (n(v, "hours") * 4.33) : 0;
      return {
        results: [
          { label: "Profit each month, before tax", value: usd(profit) },
          { label: "Kept each month, after tax", value: usd(after), strong: true },
          { label: "Earned per hour worked", value: usd2(hourly) },
          { label: "Start-up costs paid back in", value: after > 0 ? months(Math.ceil(n(v, "startup") / after)) : "Not at these numbers" },
          { label: "Kept each year", value: usd(after * 12) },
        ],
        notes: ["The first months usually earn less than the plan. Keep business money separate, track every expense, and ask a tax professional about self-employment tax."],
      };
    },
  },
  moving: {
    fields: [
      { kind: "num", key: "move", label: "Movers or truck", prefix: "$", def: 1200 },
      { kind: "num", key: "deposits", label: "Deposits and first month's rent", prefix: "$", def: 3600 },
      { kind: "num", key: "travel", label: "Travel", prefix: "$", def: 300 },
      { kind: "num", key: "setup", label: "Set-up (utilities, furniture, supplies)", prefix: "$", def: 200 },
      { kind: "num", key: "oldRent", label: "Rent now, per month", prefix: "$", def: 1400 },
      { kind: "num", key: "newRent", label: "New rent, per month", prefix: "$", def: 1800 },
      { kind: "num", key: "extra", label: "Other new costs per month (commute, parking)", prefix: "$", def: 50 },
      { kind: "num", key: "canSave", label: "You can save each month", prefix: "$", def: 400 },
    ],
    compute: (v) => {
      const oneTime = n(v, "move") + n(v, "deposits") + n(v, "travel") + n(v, "setup");
      const change = n(v, "newRent") - n(v, "oldRent") + n(v, "extra");
      return {
        results: [
          { label: "Cash needed to move", value: usd(oneTime), strong: true },
          { label: "Monthly change", value: `${change >= 0 ? "+" : "-"}${usd(Math.abs(change))}`, note: change >= 0 ? "more each month" : "less each month" },
          { label: "Extra cost in the first year", value: usd(oneTime + change * 12) },
          { label: "Time to save the cash", value: n(v, "canSave") > 0 ? months(Math.ceil(oneTime / n(v, "canSave"))) : "Add a monthly amount" },
        ],
        notes: ["Ask whether a new job, a raise, or a lower cost of living makes the move pay for itself. Weigh the people and the church community too."],
      };
    },
  },

  /* ------------------------------------------------------------ The sixth tool in each section */
  subscriptions: {
    intro: ["List what you pay for every month. Move the ones you could live without into the second list to see what they really cost."],
    fields: [
      { kind: "list", key: "keep", label: "Subscriptions I keep", nameLabel: "Service", amountLabel: "Per month", add: "subscription", max: 20, def: [["Streaming video", 16], ["Music", 11], ["Phone cloud storage", 3], ["Gym", 35]] },
      { kind: "list", key: "cut", label: "Subscriptions to cancel or pause", nameLabel: "Service", amountLabel: "Per month", add: "subscription", max: 20, def: [["Second streaming service", 14], ["Game pass", 17], ["App I forgot about", 10]] },
      { kind: "num", key: "ret", label: "Yearly return if you invest what you save", suffix: "%", step: 0.5, def: 7 },
      { kind: "num", key: "years", label: "Years", def: 10 },
    ],
    compute: (v) => {
      const keep = sum(list(v, "keep"));
      const cut = sum(list(v, "cut"));
      return {
        results: [
          { label: "All subscriptions each month", value: usd(keep + cut), note: `${usd((keep + cut) * 12)} a year` },
          { label: "What you keep", value: usd(keep), note: `${usd(keep * 12)} a year` },
          { label: "Saved by cutting the second list", value: usd(cut * 12), note: `${usd(cut)} a month`, strong: true },
          { label: `If invested for ${n(v, "years")} years`, value: usd(futureValue(0, cut, n(v, "ret"), n(v, "years"))), note: "an estimate, not a promise" },
        ],
        notes: ["Check your bank and card statements for the last three months. Most people find at least one charge they forgot. Keep what you actually use and enjoy."],
      };
    },
  },
  growgiving: {
    fields: [
      { kind: "num", key: "income", label: "Take-home pay per month today", prefix: "$", def: 3200 },
      { kind: "num", key: "start", label: "Percent you give now", suffix: "%", step: 0.5, def: 3 },
      { kind: "num", key: "target", label: "Percent you want to reach", suffix: "%", step: 0.5, def: 10 },
      { kind: "num", key: "years", label: "Years to get there", def: 5 },
      { kind: "num", key: "growth", label: "Yearly raise in your pay", suffix: "%", step: 0.5, def: 3 },
    ],
    compute: (v) => {
      const years = Math.max(1, Math.round(n(v, "years")));
      let ramp = 0;
      let flat = 0;
      for (let y = 1; y <= years; y++) {
        const yearly = n(v, "income") * 12 * Math.pow(1 + n(v, "growth") / 100, y);
        ramp += (yearly * (n(v, "start") + ((n(v, "target") - n(v, "start")) * y) / years)) / 100;
        flat += (yearly * n(v, "start")) / 100;
      }
      const atTarget = (n(v, "income") * Math.pow(1 + n(v, "growth") / 100, years) * n(v, "target")) / 100;
      return {
        results: [
          { label: "Giving each month now", value: usd((n(v, "income") * n(v, "start")) / 100) },
          { label: `Giving each month in year ${years}`, value: usd(atTarget), strong: true },
          { label: "Step up each year", value: `${Math.round(((n(v, "target") - n(v, "start")) / years) * 100) / 100} percentage points` },
          { label: `Given over the ${years} years`, value: usd(ramp), note: `${usd(ramp - flat)} more than staying at ${n(v, "start")}%` },
        ],
        notes: ["Raising your giving a little each year, ideally when your pay rises, is easier than a big jump. Decide the step now and let it happen on its own."],
      };
    },
  },
  match: {
    intro: ["An employer match is part of your pay that only you can claim, by putting money in your retirement plan. Find your plan's formula in its summary or ask HR."],
    fields: [
      { kind: "num", key: "salary", label: "Yearly pay before tax", prefix: "$", def: 60000 },
      { kind: "num", key: "rate", label: "Employer adds this much per $1 you put in", suffix: "%", def: 50 },
      { kind: "num", key: "cap", label: "...on contributions up to this share of your pay", suffix: "%", step: 0.5, def: 6 },
      { kind: "num", key: "mine", label: "What you put in now", suffix: "% of pay", step: 0.5, def: 3 },
    ],
    compute: (v) => {
      const counted = Math.min(n(v, "mine"), n(v, "cap"));
      const now = (n(v, "salary") * counted * n(v, "rate")) / 10000;
      const full = (n(v, "salary") * n(v, "cap") * n(v, "rate")) / 10000;
      const fullCost = (n(v, "salary") * n(v, "cap")) / 100;
      return {
        results: [
          { label: "You put in each year", value: usd((n(v, "salary") * n(v, "mine")) / 100) },
          { label: "Your employer adds now", value: usd(now) },
          { label: "Free money left on the table", value: usd(full - now), note: full - now > 0.5 ? undefined : "You are getting the full match", strong: full - now > 0.5 },
          { label: "To get the full match, put in", value: `${n(v, "cap")}% = ${usd(fullCost)} a year`, note: `${usd2(fullCost / 26)} before tax each paycheck (every two weeks)` },
        ],
        notes: ["Before paying extra on debt or investing elsewhere, many people first capture the whole match. Ask whether the match vests: some employers keep it if you leave early."],
      };
    },
  },
  card: {
    intro: ["Card companies set a low minimum payment, which keeps you paying for years. Compare it with a steady payment of your own."],
    fields: [
      { kind: "num", key: "balance", label: "Card balance", prefix: "$", def: 3500 },
      { kind: "num", key: "apr", label: "Interest (APR)", suffix: "%", step: 0.25, def: 22 },
      { kind: "num", key: "minPercent", label: "Minimum payment, as a share of the balance", suffix: "%", step: 0.5, def: 3 },
      { kind: "num", key: "floor", label: "The least the minimum can be", prefix: "$", def: 25 },
      { kind: "num", key: "fixed", label: "A steady payment you could make", prefix: "$", def: 150 },
    ],
    compute: (v) => {
      const min = minimumOnlyPayoff(n(v, "balance"), n(v, "apr"), n(v, "minPercent"), n(v, "floor"));
      const fixed = payoffWithExtra(n(v, "balance"), n(v, "apr"), n(v, "fixed"), 0);
      return {
        results: [
          { label: "Paying only the minimum", value: min.months === null ? "Not paid off in 100 years" : months(min.months), note: `${usd(min.totalInterest)} in interest` },
          { label: `Paying ${usd(n(v, "fixed"))} every month`, value: fixed.months === null ? "Never at this payment" : months(fixed.months), note: `${usd(fixed.totalInterest)} in interest`, strong: true },
          { label: "Interest you would save", value: fixed.months === null ? "-" : usd(Math.max(0, min.totalInterest - fixed.totalInterest)) },
        ],
        notes: ["Stop adding new purchases to a card you are paying down. If you can, move the balance to a lower rate, and pay the same amount every month even as the minimum falls."],
      };
    },
  },
  tax: {
    intro: [
      `A quick estimate for someone paid wages, using the ${TAX_YEAR} federal figures. It uses the standard deduction and leaves out credits you do not enter, itemizing, side income, and investment income.`,
    ],
    inputsHeading: "Your numbers",
    fields: [
      { kind: "choice", key: "filing", label: "Filing status", def: "single", options: [["single", "Single"], ["mfj", "Married filing jointly"], ["hoh", "Head of household"]] },
      { kind: "num", key: "gross", label: "Yearly pay before anything is taken out", prefix: "$", def: 55000 },
      { kind: "num", key: "retirement", label: "Pre-tax retirement saving each year (401k)", prefix: "$", def: 3000 },
      { kind: "num", key: "other", label: "Other pre-tax pay deductions each year (health premiums, HSA)", prefix: "$", def: 1500 },
      { kind: "num", key: "state", label: "State and local income tax rate (Florida has none)", suffix: "%", step: 0.25, def: 0 },
      { kind: "num", key: "credits", label: "Tax credits you expect (such as child tax credit)", prefix: "$", def: 0 },
    ],
    compute: (v) => {
      const status = (["single", "mfj", "hoh"].includes(s(v, "filing")) ? s(v, "filing") : "single") as FilingStatus;
      const r = estimateTax({ status, gross: n(v, "gross"), retirement: n(v, "retirement"), otherPretax: n(v, "other"), stateRatePercent: n(v, "state"), credits: n(v, "credits") });
      return {
        results: [
          { label: "Federal income tax", value: usd(r.federal), note: `taxable income ${usd(r.taxable)} after the ${usd(STANDARD_DEDUCTION[status])} standard deduction` },
          { label: "Social Security and Medicare", value: usd(r.socialSecurity + r.medicare), note: `${usd(r.socialSecurity)} + ${usd(r.medicare)}` },
          { label: "State and local tax", value: usd(r.state) },
          { label: "All taxes", value: usd(r.totalTax), note: `${Math.round(r.effectiveRate * 1000) / 10}% of your pay` },
          { label: "Tax on your next dollar", value: `${Math.round(r.marginalRate * 100)}%`, note: "your federal bracket" },
          { label: "You keep", value: usd(r.takeHome), note: `${usd(r.takeHome / 12)} a month, or ${usd2(r.takeHome / 26)} every two weeks`, strong: true },
        ],
        notes: [
          "Pre-tax retirement saving lowers your income tax, which is why it costs less than it looks. \"You keep\" is what reaches your bank account after taxes and those pre-tax deductions. Tax rules change every year; check irs.gov or a tax professional before relying on this.",
        ],
      };
    },
  },
  college: {
    intro: ["For your own degree, a child's, or someone you want to help. Costs rise each year, so the later it starts, the more it costs."],
    fields: [
      { kind: "num", key: "cost", label: "One year costs today (tuition, housing, books, food)", prefix: "$", def: 24000 },
      { kind: "num", key: "years", label: "Years of school", def: 4 },
      { kind: "num", key: "until", label: "Years until it starts", def: 8 },
      { kind: "num", key: "inflation", label: "How fast college costs rise each year", suffix: "%", step: 0.5, def: 4 },
      { kind: "num", key: "aid", label: "Scholarships and grants each year (today's dollars)", prefix: "$", def: 6000 },
      { kind: "num", key: "saved", label: "Saved so far", prefix: "$", def: 5000 },
      { kind: "num", key: "ret", label: "Yearly return on savings", suffix: "%", step: 0.5, def: 5 },
    ],
    compute: (v) => {
      let total = 0;
      let aid = 0;
      for (let k = 0; k < Math.max(1, Math.round(n(v, "years"))); k++) {
        const factor = Math.pow(1 + n(v, "inflation") / 100, n(v, "until") + k);
        total += n(v, "cost") * factor;
        aid += Math.min(n(v, "aid"), n(v, "cost")) * factor;
      }
      const net = Math.max(0, total - aid);
      const monthly = monthlyToReachGoal(net, n(v, "saved"), Math.round(n(v, "until") * 12), n(v, "ret"));
      return {
        results: [
          { label: "What the whole degree will cost then", value: usd(total) },
          { label: "After scholarships and grants", value: usd(net), strong: true },
          { label: "To save each month from now", value: usd(monthly), note: n(v, "until") > 0 ? `for ${n(v, "until")} years` : "it starts now" },
          { label: "Still to cover if you save nothing more", value: usd(Math.max(0, net - n(v, "saved"))), note: "savings, work, or loans" },
        ],
        notes: ["Many families cover college with a mix of savings, scholarships, work, and some borrowing. Borrow only what you expect to be able to repay, and compare the loan to your future pay."],
      };
    },
  },
};

/* ---------------------------------------------------------------- charts that draw themselves */
SPECS.compound!.chart = (v) => {
  const years = Math.round(n(v, "years"));
  const now = growthByYear(n(v, "initial"), n(v, "monthly"), n(v, "ret"), years);
  const wait = now.map((_, y) => (y < n(v, "wait") ? 0 : futureValue(n(v, "initial"), n(v, "monthly"), n(v, "ret"), y - n(v, "wait"))));
  return {
    series: [
      { label: "Start now", points: now, color: "var(--color-river-2)" },
      { label: `Wait ${n(v, "wait")} years`, points: wait, color: "var(--color-river-4)" },
    ],
    startLabel: "Today",
    endLabel: `Year ${years}`,
    caption: "What the investment grows to, starting now and starting later",
  };
};
SPECS.retire!.chart = (v) => {
  const r = retirementPlan({ spendYearly: n(v, "spend"), otherIncomeYearly: n(v, "other"), withdrawalPercent: n(v, "withdraw"), saved: n(v, "saved"), monthly: n(v, "monthly"), years: n(v, "years"), returnPercent: n(v, "ret"), inflationPercent: n(v, "infl") });
  const track = growthByYear(n(v, "saved"), n(v, "monthly"), r.realPercent, Math.round(n(v, "years")));
  return {
    series: [
      { label: "On track for", points: track, color: "var(--color-river-1)" },
      { label: "Target", points: track.map(() => r.target), color: "var(--color-river-4)", dashed: true },
    ],
    startLabel: "Today",
    endLabel: `Year ${Math.round(n(v, "years"))}`,
    caption: "Your savings growing toward the retirement target, in today's dollars",
  };
};
SPECS.payoff!.chart = (v) => {
  const pay = loanSummary(n(v, "balance"), n(v, "apr"), n(v, "left")).payment;
  const slow = loanBalances(n(v, "balance"), n(v, "apr"), pay, 0);
  const fast = loanBalances(n(v, "balance"), n(v, "apr"), pay, n(v, "extra"));
  return {
    series: [
      { label: "Regular payments", points: slow, color: "var(--color-river-4)" },
      { label: "With the extra payment", points: fast, color: "var(--color-river-2)" },
    ],
    startLabel: "Today",
    endLabel: `${slow.length - 1} months`,
    caption: "What you still owe, month by month, with and without the extra payment",
  };
};
SPECS.emergency!.chart = (v) => {
  const goal = n(v, "needs") * n(v, "months");
  const pts = savingsByMonth(n(v, "saved"), n(v, "monthly"), n(v, "apr"), goal);
  return {
    series: [
      { label: "Your emergency fund", points: pts, color: "var(--color-river-1)" },
      { label: "Target", points: pts.map(() => goal), color: "var(--color-river-4)", dashed: true },
    ],
    startLabel: "Today",
    endLabel: pts.length > 1 ? `${pts.length - 1} months` : "",
    caption: "Your emergency fund filling up toward the target",
  };
};
SPECS.card!.chart = (v) => {
  const min = minimumOnlyBalances(n(v, "balance"), n(v, "apr"), n(v, "minPercent"), n(v, "floor"));
  const steady = loanBalances(n(v, "balance"), n(v, "apr"), n(v, "fixed"), 0);
  return {
    series: [
      { label: "Paying only the minimum", points: min, color: "var(--color-river-4)" },
      { label: `Paying ${usd(n(v, "fixed"))} a month`, points: steady, color: "var(--color-river-2)" },
    ],
    startLabel: "Today",
    endLabel: `${min.length - 1} months`,
    caption: "What you still owe on the card, month by month",
  };
};
