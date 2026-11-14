/**
 * Practice cases for the wealth track: invented clients in six common situations, each opened as a client plan with the
 * discovery notes, balance sheet, spending and stated goals filled in. The analysis is left to the student: the SWOT,
 * strategy, risk profile, model and presentation. Every person and number here is made up for practice.
 */
import { emptyPlan, uid, type AssetKind, type ExpenseCat, type GoalCategory, type LiabilityKind, type Priority, type WealthPlan } from "./wealthMath";
import type { ClientTypeId } from "./wealthSetup";

export interface PracticeCase {
  id: string;
  title: string;
  level: "Foundation" | "Intermediate" | "Advanced";
  client: string;
  /** One line for the card. */
  summary: string;
  /** What you learn in the discovery meeting. */
  brief: string[];
  /** What to produce. */
  tasks: string[];
  /** What a strong answer notices; shown only when asked for. */
  notice: string[];
  /** Models and tools in the space that fit this case. */
  tools: string[];
  build: () => WealthPlan;
}

type A = [string, AssetKind, number];
type L = [string, LiabilityKind, number, number, number];
type E = [string, ExpenseCat, number];
type G = [string, GoalCategory, number, number, Priority, number];

function plan(o: {
  name: string;
  age: number;
  occupation: string;
  income: number;
  type: ClientTypeId;
  values: string[];
  psychology: string;
  discovery: string;
  assets: A[];
  liabilities: L[];
  expenses: E[];
  goals: G[];
  focus: string[];
  retirement?: { age: number; spend: number; income: number; length: number };
  model?: { initial: number; monthly: number; years: number };
}): WealthPlan {
  const p = emptyPlan();
  p.client = { ...p.client, name: o.name, age: String(o.age), occupation: o.occupation, income: String(o.income), values: o.values, psychology: o.psychology };
  p.notes.discovery = o.discovery;
  p.setup = { type: o.type, modules: {} };
  p.focus = o.focus;
  p.snapshot = {
    assets: o.assets.map(([name, kind, value]) => ({ id: uid(), name, kind, value: String(value) })),
    liabilities: o.liabilities.map(([name, kind, balance, apr, payment]) => ({ id: uid(), name, kind, balance: String(balance), apr: String(apr), payment: String(payment) })),
    expenses: o.expenses.map(([name, category, amount]) => ({ id: uid(), name, category, amount: String(amount) })),
  };
  p.goals = o.goals.map(([name, category, amount, horizon, priority, current]) => ({ id: uid(), name, category, amount: String(amount), horizon: String(horizon), priority, current: String(current) }));
  if (o.retirement) p.retirement = { age: String(o.retirement.age), spend: String(o.retirement.spend), income: String(o.retirement.income), length: String(o.retirement.length) };
  if (o.model) p.model = { ...p.model, initial: String(o.model.initial), monthly: String(o.model.monthly), years: o.model.years };
  return p;
}

export const PRACTICE_CASES: PracticeCase[] = [
  {
    id: "first-job",
    title: "First job, first plan",
    level: "Foundation",
    client: "Ana Torres, 23",
    summary: "A new nurse with student loans, a 401(k) match she is not taking, and no cushion.",
    brief: [
      "Ana started as a registered nurse six months ago and takes home about $4,300 a month. She has $28,000 of federal student loans at 5.5% and a $3,200 credit card balance from moving.",
      "Her hospital matches 401(k) contributions dollar for dollar up to 4% of pay; she has not signed up because 'the loans come first'. She keeps $900 in checking and nothing else.",
      "She wants to stop feeling behind, be debt-free by 30, and take her mother on a trip next year. She describes herself as careful but admits she avoids opening her loan statements.",
    ],
    tasks: [
      "Write her SWOT from the meeting notes, and a one-sentence money mission in her words.",
      "Put her debts in the payoff tool: which order, and how fast with what she can free up?",
      "Decide what you would raise first: the cushion, the match, or the card. Say why.",
      "Build a short presentation: where she is, the order of work, and the first three steps.",
    ],
    notice: [
      "The match is a 100% return on the first 4% of pay; skipping it to pay a 5.5% loan faster costs her money every month.",
      "The card at a high rate comes before the student loans; the loans can run on schedule.",
      "With $900 in cash, one surprise goes back on the card. A small starter cushion comes before aggressive payoff.",
      "Her avoidance is the real risk: automate the payments and give her one number to watch.",
    ],
    tools: ["Paying off several debts", "Employer match", "Emergency fund", "Monthly budget"],
    build: () =>
      plan({
        name: "Ana Torres", age: 23, occupation: "Registered nurse, first year", income: 4300, type: "young",
        values: ["Family", "Security", "Integrity"],
        psychology: "Careful and hardworking, but avoids looking at her loan statements. Wants a clear order of steps more than a perfect plan.",
        discovery: "Practice case. New nurse, six months in. Federal student loans and a card balance from moving. Hospital matches 401(k) dollar for dollar to 4% of pay and she is not enrolled. Wants to be debt-free by 30 and to take her mother on a trip next year.",
        assets: [["Checking", "cash", 900]],
        liabilities: [["Federal student loans", "student", 28000, 5.5, 300], ["Credit card", "card", 3200, 24, 95]],
        expenses: [["Rent and utilities", "Needs", 1350], ["Groceries", "Needs", 380], ["Car, gas and insurance", "Needs", 520], ["Phone and internet", "Needs", 110], ["Eating out and fun", "Wants", 420], ["Subscriptions", "Wants", 60], ["Church giving", "Giving", 200], ["Loan and card payments", "Saving", 395]],
        goals: [["Starter emergency fund", "Short-Term", 5000, 1, "High", 900], ["Pay off the credit card", "Short-Term", 3200, 1, "High", 0], ["Trip with Mom", "Short-Term", 2500, 1, "Med", 0], ["Student loans paid off", "Medium-Term", 28000, 7, "High", 0], ["Retirement", "Long-Term Retirement/Wealth", 1500000, 42, "Med", 0]],
        focus: ["debt", "emergency", "retirement"],
        model: { initial: 0, monthly: 290, years: 42 },
      }),
  },
  {
    id: "down-payment",
    title: "Two incomes, one down payment",
    level: "Foundation",
    client: "Jordan and Priya Ellis, 29 and 30",
    summary: "Newly married, two paychecks, separate accounts, and a house they want in three years.",
    brief: [
      "Jordan is a civil engineer and Priya a physical therapist; together they take home about $9,800 a month. They married last year and still run separate accounts.",
      "They have $41,000 in savings between them, a $17,000 car loan at 6.9%, and about $64,000 in retirement accounts. Each contributes enough to get an employer match.",
      "They want a home around $420,000 in three years and hope to start a family soon after. Priya worries about being 'house poor'; Jordan wants to buy sooner.",
    ],
    tasks: [
      "Work out the cash they need (down payment and closing costs) and the monthly saving that gets them there.",
      "Use the house tool to test what monthly payment keeps housing near 28% of gross income.",
      "Say where the down payment money should sit for a three-year goal, and why not in stocks.",
      "Build a presentation that shows two options: buy in three years, or sooner with less down.",
    ],
    notice: [
      "A three-year goal is too short for stocks: the backtester shows how often three years ends lower.",
      "Less than 20% down adds mortgage insurance; show its monthly cost, not just the lower cash needed.",
      "They disagree on timing. Present both options with numbers rather than choosing for them.",
      "A child soon after changes the budget (childcare, one income for a time), so the payment should fit a tighter month.",
    ],
    tools: ["Buying a house", "Getting married", "Having a child", "Portfolio backtester"],
    build: () =>
      plan({
        name: "Jordan and Priya Ellis", age: 30, occupation: "Civil engineer and physical therapist", income: 9800, type: "young",
        values: ["Family", "Security", "Faith", "Generosity"],
        psychology: "Jordan is eager and optimistic; Priya is cautious and worries about a payment that crowds out everything else. Both want to decide together.",
        discovery: "Practice case. Married last year, still on separate accounts. Want a home near $420,000 in three years and children soon after. Both get their employer match. They disagree on how soon to buy.",
        assets: [["Joint savings", "cash", 41000], ["Checking", "cash", 6500], ["Jordan 401(k)", "retirement", 38000], ["Priya 403(b)", "retirement", 26000]],
        liabilities: [["Car loan", "auto", 17000, 6.9, 420]],
        expenses: [["Rent and utilities", "Needs", 2300], ["Groceries", "Needs", 750], ["Cars, gas and insurance", "Needs", 900], ["Health and phone", "Needs", 380], ["Travel and eating out", "Wants", 1100], ["Subscriptions and hobbies", "Wants", 250], ["Tithe and giving", "Giving", 980], ["House fund", "Saving", 1800], ["Extra retirement", "Saving", 400]],
        goals: [["Down payment and closing costs", "Medium-Term", 100000, 3, "High", 41000], ["Emergency fund (6 months)", "Short-Term", 30000, 2, "High", 6500], ["Pay off the car", "Medium-Term", 17000, 3, "Med", 0], ["Retirement", "Long-Term Retirement/Wealth", 3500000, 35, "Med", 64000]],
        focus: ["house", "marriage", "family"],
        model: { initial: 64000, monthly: 1400, years: 35 },
      }),
  },
  {
    id: "growing-family",
    title: "A growing family with no safety net",
    level: "Intermediate",
    client: "Daniel and Grace Okafor, 36 and 34",
    summary: "Two children, one main income, little life insurance, and no will.",
    brief: [
      "Daniel is a sales manager earning most of the household income; Grace works part time as a teacher's aide. They take home about $8,400 a month and have two children, ages 5 and 2.",
      "They own a home worth about $380,000 with a $295,000 mortgage, have $22,000 in savings and $140,000 in retirement accounts. Daniel has life insurance of one year's salary through work; Grace has none.",
      "They have no will and have not named a guardian. They want college savings started and to give more, but 'there is never anything left'.",
    ],
    tasks: [
      "Estimate the life and disability insurance gaps with the Planning tools.",
      "Use the estate snapshot: what passes how, and which documents are missing?",
      "Find room in the budget for college savings without stopping retirement saving.",
      "Present the plan in order of urgency, with what belongs to an attorney or insurance agent named plainly.",
    ],
    notice: [
      "The largest risk is not investment risk: it is Daniel's income stopping. Insurance and a guardian come before college savings.",
      "Coverage through work ends with the job. Say that, without recommending a product.",
      "Retirement comes before college: there are loans for college and none for retirement.",
      "Naming a guardian needs a will. That is an attorney's work; your job is to make the gap visible.",
    ],
    tools: ["Insurance needs", "Estate snapshot", "Paying for college", "Giving plan"],
    build: () =>
      plan({
        name: "Daniel and Grace Okafor", age: 36, occupation: "Sales manager; part-time teacher's aide", income: 8400, type: "family",
        values: ["Family", "Faith", "Generosity", "Legacy"],
        psychology: "Devoted parents who feel stretched. They put off the hard conversations (insurance, a will) because they are uncomfortable, not because they disagree.",
        discovery: "Practice case. Two children, 5 and 2. Daniel earns most of the income. Life insurance of one year's salary through his employer only. No will and no guardian named. Want to start college savings and give more.",
        assets: [["Home", "home", 380000], ["Savings", "cash", 22000], ["Daniel 401(k)", "retirement", 118000], ["Grace IRA", "retirement", 22000]],
        liabilities: [["Mortgage", "mortgage", 295000, 6.25, 2150], ["Minivan loan", "auto", 21000, 7.2, 480]],
        expenses: [["Mortgage, taxes and insurance", "Needs", 2650], ["Groceries", "Needs", 1050], ["Childcare", "Needs", 900], ["Cars, gas and insurance", "Needs", 980], ["Utilities, phone and health", "Needs", 720], ["Activities and eating out", "Wants", 650], ["Tithe and giving", "Giving", 700], ["401(k) beyond the match", "Saving", 300]],
        goals: [["Emergency fund (6 months)", "Short-Term", 40000, 3, "High", 22000], ["College fund, two children", "Medium-Term", 160000, 13, "Med", 0], ["Pay off the minivan", "Medium-Term", 21000, 4, "Low", 0], ["Retirement", "Long-Term Retirement/Wealth", 2800000, 29, "High", 140000], ["Yearly giving", "Giving / Generosity", 12000, 1, "Med", 8400]],
        focus: ["family", "estate", "giving"],
        model: { initial: 140000, monthly: 900, years: 29 },
      }),
  },
  {
    id: "business-owner",
    title: "The business is the balance sheet",
    level: "Intermediate",
    client: "Luis Mendoza, 44",
    summary: "A landscaping company owner with uneven income, most of his net worth in the business, and no retirement plan.",
    brief: [
      "Luis owns a landscaping company with eight employees. He pays himself about $7,500 a month in a good season and half that in winter. He guesses the business is worth $600,000.",
      "Outside the business he has $35,000 in cash, a home with $180,000 of equity, and an old IRA of $28,000. He has no retirement plan for himself or his crew and no disability coverage.",
      "He wants to retire by 62, perhaps by selling to his nephew, and to know whether he is 'on track or kidding himself'. He is married; his wife keeps the books.",
    ],
    tasks: [
      "Separate what he owns outside the business from the business itself, and show how concentrated he is.",
      "Model retirement at 62 with and without a sale of the business.",
      "List the questions for a CPA about retirement plans for the self-employed, without choosing one.",
      "Present a plan that lowers how much rides on one asset, in steps he can take this year.",
    ],
    notice: [
      "Nearly all of his net worth is one private company. A plan that needs the sale to work is a plan with one point of failure.",
      "Uneven income needs a larger cushion and a budget built on the low months.",
      "A self-employed retirement plan (a SEP IRA or solo 401(k) are the usual ones to ask about) can shelter income; which one fits is a CPA's call.",
      "No disability coverage: if he cannot work, the business value falls with him.",
    ],
    tools: ["Withdrawal strategies", "Insurance needs", "Starting a business or side hustle", "Retirement target"],
    build: () =>
      plan({
        name: "Luis Mendoza", age: 44, occupation: "Owner, landscaping company (8 employees)", income: 5800, type: "business",
        values: ["Family", "Independence", "Discipline", "Legacy"],
        psychology: "Confident in his own work and wary of markets he cannot see. Treats the business as his retirement plan.",
        discovery: "Practice case. Income swings by season: about $7,500 a month in season and half that in winter. Thinks the business is worth $600,000 and may sell to his nephew. No retirement plan, no disability coverage. Wants to retire by 62.",
        assets: [["Business (his estimate)", "other", 600000], ["Home", "home", 410000], ["Business and personal cash", "cash", 35000], ["Old IRA", "retirement", 28000]],
        liabilities: [["Mortgage", "mortgage", 230000, 5.1, 1650], ["Equipment loan", "other", 48000, 8.5, 980], ["Truck loan", "auto", 26000, 7.5, 560]],
        expenses: [["Mortgage, taxes and insurance", "Needs", 2050], ["Groceries and household", "Needs", 900], ["Vehicles", "Needs", 800], ["Health insurance", "Needs", 950], ["Family and eating out", "Wants", 500], ["Church giving", "Giving", 400], ["Savings", "Saving", 200]],
        goals: [["Six months of cash for slow seasons", "Short-Term", 45000, 2, "High", 35000], ["Retirement savings outside the business", "Long-Term Retirement/Wealth", 1200000, 18, "High", 28000], ["Pay off the equipment loan", "Medium-Term", 48000, 4, "Med", 0], ["Sell or hand over the business", "Long-Term Retirement/Wealth", 600000, 18, "Med", 0]],
        focus: ["retirement", "business", "emergency"],
        retirement: { age: 62, spend: 72000, income: 26000, length: 30 },
        model: { initial: 28000, monthly: 200, years: 18 },
      }),
  },
  {
    id: "concentrated-stock",
    title: "Most of it is one stock",
    level: "Advanced",
    client: "Rachel Kim, 41",
    summary: "A technology director with 60% of her investments in employer shares, large gains, and a wish to give.",
    brief: [
      "Rachel is a director at a public software company. She takes home about $14,500 a month and receives stock every quarter. Her employer shares are worth $900,000, bought and vested at an average cost of $210,000.",
      "Her other investments are $380,000 in a 401(k) and $220,000 in index funds. She owns a condo and has no debt beyond its mortgage.",
      "She knows she holds too much of one company but 'hates the tax bill' on selling. She gives about $20,000 a year to her church and two charities, in cash.",
    ],
    tasks: [
      "Show her concentration: one stock as a share of her investments and of her net worth.",
      "Use the capital gains tool to compare selling at once with selling over several years.",
      "Use the giving tool to compare cash gifts with giving appreciated shares.",
      "Present options to discuss, each with its trade-off, and name what a CPA must confirm.",
    ],
    notice: [
      "Her paycheck, her new stock grants and her savings all depend on one company: the risk is larger than the share count shows.",
      "Giving appreciated shares instead of cash can meet the same giving goal while removing shares with large gains.",
      "Spreading sales over years manages the tax, but the tax bill is not a reason to keep the risk.",
      "Stock that vests is taxed as income when it vests, so selling new shares right away adds little extra tax. A CPA should confirm the details.",
    ],
    tools: ["Capital gains", "Charitable giving", "Asset allocation", "Stress tests"],
    build: () =>
      plan({
        name: "Rachel Kim", age: 41, occupation: "Director of product, public software company", income: 14500, type: "executive",
        values: ["Generosity", "Faith", "Growth", "Freedom"],
        psychology: "Analytical and well informed. Loyal to her company and anchored on what the shares were once worth. Dislikes paying tax more than she fears the risk.",
        discovery: "Practice case. Employer shares worth $900,000 with a cost of about $210,000; more vest every quarter. Gives about $20,000 a year in cash. Knows she is concentrated and dislikes the tax on selling.",
        assets: [["Employer stock", "brokerage", 900000], ["Index funds", "brokerage", 220000], ["401(k)", "retirement", 380000], ["Condo", "home", 520000], ["Cash", "cash", 60000]],
        liabilities: [["Condo mortgage", "mortgage", 310000, 3.4, 1900]],
        expenses: [["Mortgage, dues and taxes", "Needs", 2900], ["Groceries and household", "Needs", 900], ["Car and insurance", "Needs", 650], ["Health and utilities", "Needs", 500], ["Travel and dining", "Wants", 1800], ["Giving", "Giving", 1700], ["401(k) and investing", "Saving", 4200]],
        goals: [["No more than 20% in one stock", "Medium-Term", 300000, 4, "High", 0], ["Financial independence at 55", "Long-Term Retirement/Wealth", 4500000, 14, "High", 1500000], ["Give $500,000 over her lifetime", "Giving / Generosity", 500000, 20, "Med", 0]],
        focus: ["markets", "giving", "retirement"],
        retirement: { age: 55, spend: 130000, income: 0, length: 40 },
        model: { initial: 1500000, monthly: 4200, years: 14 },
      }),
  },
  {
    id: "pre-retirement",
    title: "Five years to retirement",
    level: "Advanced",
    client: "Tom and Linda Bauer, 60 and 58",
    summary: "A couple with $1.4 million saved, a pension choice to make, and a question: is it enough?",
    brief: [
      "Tom is a plant supervisor with a pension; Linda is a dental hygienist. They take home about $10,200 a month and plan to stop working in five years.",
      "They have $1.1 million in retirement accounts (almost all pre-tax), $300,000 in savings and brokerage accounts, and a paid-off home. Tom's pension can be $2,400 a month for his life only, or $2,050 a month continuing to Linda.",
      "They want $7,000 a month to live on, to travel while they are healthy, and to leave something to their church and three children. Linda is afraid of running out; Tom thinks they have plenty.",
    ],
    tasks: [
      "Run the retirement income model and the withdrawal strategy study for a 30-year retirement.",
      "Lay out the pension choice as a question of who is protected, with the monthly difference.",
      "Explain why having nearly everything in pre-tax accounts matters, and what to ask a CPA about Roth conversions.",
      "Present their options with the trade-offs, including what they can adjust if markets start badly.",
    ],
    notice: [
      "The first decade decides most of it: the withdrawal study shows which starting years failed and why.",
      "The single-life pension pays more but leaves Linda, who is younger, with nothing from it if Tom dies first.",
      "Pre-tax accounts mean every withdrawal is taxable and required withdrawals begin later; the years between retiring and then are when conversions are usually weighed. That is a CPA's analysis.",
      "They see risk differently. Guardrails (spend a little less after bad years) is a rule both can agree to before they need it.",
    ],
    tools: ["Withdrawal strategies", "Retirement income", "Roth conversion", "Estate snapshot"],
    build: () =>
      plan({
        name: "Tom and Linda Bauer", age: 60, occupation: "Plant supervisor; dental hygienist", income: 10200, type: "preretire",
        values: ["Family", "Faith", "Security", "Generosity", "Legacy"],
        psychology: "Tom is relaxed and assumes it will work out. Linda is anxious about running out and wants to see the bad cases. Both are savers who find spending hard.",
        discovery: "Practice case. Stop working in five years. Tom's pension: $2,400 a month for his life only, or $2,050 continuing to Linda. Want $7,000 a month, travel early, and gifts to their church and three children. Nearly all savings are pre-tax.",
        assets: [["Tom 401(k)", "retirement", 720000], ["Linda 401(k) and IRA", "retirement", 380000], ["Brokerage account", "brokerage", 210000], ["Savings", "cash", 90000], ["Home (paid off)", "home", 450000]],
        liabilities: [],
        expenses: [["Property tax, insurance and upkeep", "Needs", 1100], ["Groceries and household", "Needs", 1000], ["Cars, gas and insurance", "Needs", 700], ["Health and utilities", "Needs", 900], ["Travel and family", "Wants", 1200], ["Tithe and giving", "Giving", 1000], ["Retirement saving", "Saving", 3200]],
        goals: [["Retirement income of $7,000 a month", "Long-Term Retirement/Wealth", 1900000, 5, "High", 1400000], ["Travel fund for the first ten years", "Medium-Term", 100000, 5, "Med", 20000], ["Gifts to church and children", "Giving / Generosity", 300000, 25, "Med", 0]],
        focus: ["retirement", "estate", "giving"],
        retirement: { age: 65, spend: 84000, income: 52000, length: 30 },
        model: { initial: 1400000, monthly: 3200, years: 5 },
      }),
  },
];

export const practiceCase = (id: string) => PRACTICE_CASES.find((c) => c.id === id);
