/**
 * Practice clients: invented people for rehearsing a discovery meeting, a plan and a presentation without using anyone's real
 * finances. Each has a backstory, a script of what they reveal when asked, a starter plan (the facts a meeting would gather, with
 * the analysis left to the analyst), what a strong answer covers, and a level. Nothing here is a real person.
 */
import { emptyPlan, uid, today, type WealthPlan, type Goal, type GoalCategory, type Priority, type AssetLine, type LiabilityLine, type ExpenseLine } from "./wealthMath";

export type PersonaLevel = "Student" | "Early career" | "Family" | "High net worth" | "Pre-retirement";

export interface Persona {
  id: string;
  name: string;
  title: string;
  level: PersonaLevel;
  blurb: string;
  /** What the analyst should be able to do after working with this client. */
  objectives: string[];
  /** What the client says when asked: the script for a role-played discovery meeting. */
  facts: { q: string; a: string }[];
  /** What a strong recommendation covers (used to self-score a case drill). */
  rubric: string[];
  /** The starter plan: facts gathered in the meeting, with the analysis left to do. */
  plan: () => WealthPlan;
}

const goal = (name: string, category: GoalCategory, amount: number, horizon: number, priority: Priority, current: number): Goal => ({
  id: uid(),
  name,
  category,
  amount: String(amount),
  horizon: String(horizon),
  priority,
  current: String(current),
});
const asset = (name: string, kind: AssetLine["kind"], value: number): AssetLine => ({ id: uid(), name, kind, value: String(value) });
const debt = (name: string, kind: LiabilityLine["kind"], balance: number, apr: number, payment: number): LiabilityLine => ({ id: uid(), name, kind, balance: String(balance), apr: String(apr), payment: String(payment) });
const spend = (name: string, category: ExpenseLine["category"], amount: number): ExpenseLine => ({ id: uid(), name, category, amount: String(amount) });

interface Seed {
  name: string;
  age: number;
  occupation: string;
  income: number;
  values: string[];
  psychology: string;
  notes: string;
  goals: Goal[];
  assets: AssetLine[];
  liabilities: LiabilityLine[];
  expenses: ExpenseLine[];
  initial: number;
  monthly: number;
  years: number;
  focus: string[];
  retire?: { age: number; spend: number; income: number };
}

/** A starter plan from the facts of a meeting; the SWOT, mission, risk answers and strategy are left for the analyst. */
function seeded(s: Seed): WealthPlan {
  const p = emptyPlan();
  p.client = { ...p.client, name: s.name, age: String(s.age), occupation: s.occupation, income: String(s.income), values: s.values, psychology: s.psychology, date: today(), cadence: "Quarterly" };
  p.notes.discovery = s.notes;
  p.goals = s.goals;
  p.snapshot = { assets: s.assets, liabilities: s.liabilities, expenses: s.expenses };
  p.model = { ...p.model, initial: String(s.initial), monthly: String(s.monthly), years: s.years, goalId: s.goals[s.goals.length - 1]?.id ?? "" };
  p.focus = s.focus;
  if (s.retire) p.retirement = { age: String(s.retire.age), spend: String(s.retire.spend), income: String(s.retire.income), length: "30" };
  return p;
}

export const PERSONAS: Persona[] = [
  {
    id: "tips",
    name: "Jordan Ellis",
    title: "The junior with tip income",
    level: "Student",
    blurb: "21, a business major who serves tables about 25 hours a week. Income swings with the season, a credit card is costing 27%, and a duplex someday is the dream.",
    objectives: ["Plan around irregular income", "Rank a high-interest debt against investing", "Build a first emergency fund", "Explain the Roth IRA to a beginner"],
    facts: [
      { q: "What do you do for income?", a: "I wait tables, about 25 hours a week. Some weeks I take home $400, some $800. Over a year it averages about $2,600 a month." },
      { q: "Any debt?", a: "One credit card with $2,400 on it at 27%. I pay $75 a month and it barely moves. No student loans; I have a scholarship." },
      { q: "What do you have saved?", a: "About $600 in checking, $1,200 in savings, and $3,500 in a Roth IRA I opened last year." },
      { q: "Where does the money go?", a: "Rent and utilities about $900, groceries $300, gas and phone $270, eating out and fun about $260, and I give 10% at church." },
      { q: "What do you want?", a: "To stop worrying about money, pay off the card, buy a used car, and eventually own a duplex and live in one side." },
      { q: "How do you feel about investing?", a: "I like it, but I trade too much when I'm bored. I once sold in a panic and regretted it." },
    ],
    rubric: ["Names the 27% card as the first priority, with the reason (a guaranteed cost)", "Builds the emergency fund from the lowest-income month", "Keeps the Roth IRA going at a smaller amount", "Addresses the impulse to trade with a rule", "Explains irregular-income budgeting"],
    plan: () =>
      seeded({
        name: "Jordan Ellis",
        age: 21,
        occupation: "Junior, business major; restaurant server about 25 hours a week",
        income: 2600,
        values: ["Faith", "Generosity", "Independence"],
        psychology: "Likes investing but trades impulsively when bored; sold in a panic once and regretted it.",
        notes: "Server with irregular tip income, a 27% credit card, a small emergency fund, and a goal of owning a duplex. Gives 10% at church.",
        goals: [goal("Emergency fund (3 months)", "Short-Term", 4400, 1, "High", 1200), goal("Pay off credit card", "Short-Term", 2400, 0.5, "High", 0), goal("Reliable used car", "Medium-Term", 10000, 3, "Med", 0), goal("Duplex down payment", "Medium-Term", 30000, 6, "Med", 0), goal("Retirement (Roth IRA)", "Long-Term Retirement/Wealth", 1000000, 40, "High", 3500)],
        assets: [asset("Checking", "cash", 600), asset("Savings", "cash", 1200), asset("Roth IRA", "retirement", 3500)],
        liabilities: [debt("Credit card", "card", 2400, 27, 75)],
        expenses: [spend("Rent and utilities", "Needs", 900), spend("Groceries", "Needs", 300), spend("Gas and phone", "Needs", 270), spend("Eating out and fun", "Wants", 260), spend("Tithe", "Giving", 260), spend("Roth IRA", "Saving", 100)],
        initial: 3500,
        monthly: 200,
        years: 40,
        focus: ["debt", "emergency", "retirement"],
      }),
  },
  {
    id: "senior",
    name: "Priya Shah",
    title: "The graduating senior with an offer",
    level: "Early career",
    blurb: "22, graduating in May with a $68,000 job offer, $32,000 of student loans, a 401(k) match she has never heard of, and a move to a new city.",
    objectives: ["Compare two kinds of debt", "Explain an employer match", "Set up first-job priorities in order", "Estimate take-home pay from a salary"],
    facts: [
      { q: "What is the offer?", a: "$68,000 base salary, a $5,000 signing bonus, and a 401(k) where the company matches 100% up to 4% of pay. I start in July." },
      { q: "What do you owe?", a: "$28,000 in federal student loans at 5.5% and $4,000 in a private loan at 7.5%. Payments would be about $330 a month." },
      { q: "What do you have saved?", a: "About $800. My parents will help with a security deposit but nothing more." },
      { q: "What will your costs be?", a: "Rent about $1,500 in Charlotte, car insurance and gas $260, groceries $350, phone $60, and a gym and subscriptions around $100." },
      { q: "What do you want?", a: "Not to live paycheck to paycheck, pay off the loans in ten years or less, start saving for retirement, and maybe buy a car in three years." },
      { q: "How do you feel about risk?", a: "I don't want to lose money. I've never invested. My dad says stocks are gambling." },
    ],
    rubric: ["Captures the full 4% match before anything else (and explains why)", "Builds a starter emergency fund", "Compares the 7.5% private loan with the 5.5% federal loans and with investing", "Estimates take-home pay and states what is excluded", "Explains risk in plain words for a nervous first-time investor"],
    plan: () =>
      seeded({
        name: "Priya Shah",
        age: 22,
        occupation: "Graduating senior; starting at $68,000 a year",
        income: 4000,
        values: ["Security", "Family", "Growth"],
        psychology: "Afraid of losing money; has never invested; family sees the market as gambling.",
        notes: "Accepted a $68,000 offer with a $5,000 signing bonus and a 4% 401(k) match. $32,000 of student loans. Moving to a new city.",
        goals: [goal("Starter emergency fund", "Short-Term", 7000, 1, "High", 800), goal("Pay off private loan (7.5%)", "Medium-Term", 4000, 2, "High", 0), goal("Federal loans paid in 10 years", "Long-Term Retirement/Wealth", 28000, 10, "Med", 0), goal("Car replacement", "Medium-Term", 15000, 3, "Low", 0), goal("Retirement", "Long-Term Retirement/Wealth", 2000000, 43, "High", 0)],
        assets: [asset("Checking", "cash", 800)],
        liabilities: [debt("Federal student loans", "student", 28000, 5.5, 280), debt("Private student loan", "student", 4000, 7.5, 50)],
        expenses: [spend("Rent", "Needs", 1500), spend("Groceries", "Needs", 350), spend("Car insurance and gas", "Needs", 260), spend("Phone", "Needs", 60), spend("Gym and subscriptions", "Wants", 100), spend("401(k) to the match", "Saving", 227)],
        initial: 0,
        monthly: 400,
        years: 43,
        focus: ["debt", "markets", "emergency"],
        retire: { age: 65, spend: 70000, income: 28000 },
      }),
  },
  {
    id: "couple",
    name: "Sam and Alex Rivers",
    title: "The couple saving for a first home",
    level: "Early career",
    blurb: "Both 28, two incomes, $52,000 saved, student and car loans, and a plan to buy a $380,000 home in three years. They disagree about how much risk to take with the down payment.",
    objectives: ["Match investments to a 3-year goal", "Calculate the true monthly cost of a home", "Mediate two risk tolerances", "Balance down payment, emergency fund and retirement"],
    facts: [
      { q: "What is your income?", a: "Together about $135,000 before tax, around $8,300 a month take-home." },
      { q: "What do you have?", a: "$30,000 in savings, $22,000 in Roth IRAs, and about $9,000 each in 401(k)s through work." },
      { q: "What do you owe?", a: "Student loans of $18,000 at 4.5%, and a car loan of $11,000 at 6.5%." },
      { q: "What is the home goal?", a: "A $380,000 house in about three years, ideally with 10% to 20% down." },
      { q: "How do you disagree?", a: "Alex wants to put the down payment in stocks to grow faster. Sam wants it safe. We are both a little scared of getting it wrong." },
      { q: "What are your costs?", a: "Rent $2,100, groceries $700, car costs $450, phone and internet $200, insurance $250, fun and dining $600, and we give about $400 a month." },
    ],
    rubric: ["Separates the down payment (3-year, safe) from retirement (decades, growth)", "Calculates the full monthly housing cost, not just the loan payment", "Explains the trade-off of 10% versus 20% down", "Proposes a way to resolve the disagreement without picking a winner", "Keeps an emergency fund separate from the down payment"],
    plan: () =>
      seeded({
        name: "Sam and Alex Rivers",
        age: 28,
        occupation: "Two earners, combined $135,000 before tax",
        income: 8300,
        values: ["Family", "Stewardship", "Security"],
        psychology: "Two different risk tolerances: one wants the down payment in stocks, the other wants it safe.",
        notes: "Buying a $380,000 home in about three years. $52,000 saved plus retirement accounts. Student loan and car loan. They want to agree on how to invest the down payment.",
        goals: [goal("Emergency fund (6 months)", "Short-Term", 24000, 1, "High", 0), goal("Home down payment (15%)", "Medium-Term", 57000, 3, "High", 30000), goal("Pay off car loan", "Medium-Term", 11000, 3, "Med", 0), goal("Retirement", "Long-Term Retirement/Wealth", 3000000, 37, "High", 40000), goal("Giving", "Giving / Generosity", 4800, 1, "Med", 0)],
        assets: [asset("Savings", "cash", 30000), asset("Roth IRAs", "retirement", 22000), asset("401(k)s", "retirement", 18000)],
        liabilities: [debt("Student loans", "student", 18000, 4.5, 220), debt("Car loan", "auto", 11000, 6.5, 330)],
        expenses: [spend("Rent", "Needs", 2100), spend("Groceries", "Needs", 700), spend("Car costs", "Needs", 450), spend("Phone and internet", "Needs", 200), spend("Insurance", "Needs", 250), spend("Fun and dining", "Wants", 600), spend("Giving", "Giving", 400), spend("Retirement and savings", "Saving", 1800)],
        initial: 40000,
        monthly: 1800,
        years: 37,
        focus: ["house", "markets", "emergency"],
      }),
  },
  {
    id: "freelance",
    name: "Dani Okafor",
    title: "The freelance designer",
    level: "Early career",
    blurb: "26, self-employed, income that averages $4,200 a month but swings widely, no retirement account, taxes owed every quarter, and no safety net.",
    objectives: ["Estimate self-employment tax and set it aside", "Choose a retirement account for a self-employed person", "Size an emergency fund for irregular income", "Smooth an uneven income into a paycheck"],
    facts: [
      { q: "What is your income?", a: "It averages about $4,200 a month before taxes, but January through March can be $1,500 and some months hit $8,000." },
      { q: "Do you pay taxes ahead?", a: "No. I got a surprise bill last April and put it on a credit card. I know I'm supposed to pay quarterly." },
      { q: "Retirement?", a: "Nothing. No account at all." },
      { q: "What do you owe and own?", a: "$3,100 on a credit card at 24%, $4,000 in savings, and a laptop and equipment worth about $3,000." },
      { q: "Costs?", a: "Rent $1,300, health insurance $380, groceries $350, software $120, phone $70, fun $250. I give around $100 a month." },
      { q: "What do you want?", a: "Stability. A real emergency fund, a retirement account, and to stop being afraid of tax season." },
    ],
    rubric: ["Estimates the tax to set aside, including self-employment tax, and moves it to a separate account", "Proposes paying yourself a steady 'salary' from a buffer account", "Suggests a retirement account suited to self-employment and why", "Sizes the cushion from the lowest months", "Prioritizes the 24% card"],
    plan: () =>
      seeded({
        name: "Dani Okafor",
        age: 26,
        occupation: "Freelance designer, self-employed",
        income: 3400,
        values: ["Independence", "Generosity", "Creativity"],
        psychology: "Anxious about tax season and uneven income; avoids looking at the numbers.",
        notes: "Self-employed with income that swings from $1,500 to $8,000 a month, no retirement account, no quarterly tax payments, and a 24% credit card.",
        goals: [goal("Tax set-aside account", "Short-Term", 3500, 0.5, "High", 0), goal("Emergency fund (6 months)", "Short-Term", 12000, 1.5, "High", 4000), goal("Pay off credit card", "Short-Term", 3100, 1, "High", 0), goal("Solo retirement account", "Long-Term Retirement/Wealth", 1500000, 39, "High", 0), goal("Giving", "Giving / Generosity", 1200, 1, "Low", 0)],
        assets: [asset("Savings", "cash", 4000), asset("Equipment", "other", 3000)],
        liabilities: [debt("Credit card", "card", 3100, 24, 100)],
        expenses: [spend("Rent", "Needs", 1300), spend("Health insurance", "Needs", 380), spend("Groceries", "Needs", 350), spend("Software and phone", "Needs", 190), spend("Fun", "Wants", 250), spend("Giving", "Giving", 100)],
        initial: 4000,
        monthly: 200,
        years: 39,
        focus: ["emergency", "income", "retirement"],
      }),
  },
  {
    id: "executive",
    name: "Chris Navarro",
    title: "The executive with concentrated stock",
    level: "High net worth",
    blurb: "46, a vice president whose employer stock is 60% of a $3.7 million net worth. Two children approaching college, a $650,000 mortgage, and a desire to give generously and retire at 60.",
    objectives: ["Explain concentration risk and ways to reduce it", "Plan 529 funding for two children", "Use appreciated stock for charitable giving", "Build a retirement-income plan for a high spender"],
    facts: [
      { q: "What do you earn?", a: "About $420,000 a year including stock awards, around $19,500 a month after tax." },
      { q: "What do you own?", a: "$2.1 million in company stock (some restricted), $900,000 in 401(k) and IRAs, $250,000 in cash, and a house worth about $1.4 million with $650,000 left on the mortgage." },
      { q: "What worries you?", a: "If the stock drops I lose most of my wealth and my job in the same year. But I've done well and I believe in the company." },
      { q: "Kids?", a: "Two, ages 10 and 13. About $60,000 saved in 529 plans so far. I'd like to cover most of college." },
      { q: "Giving?", a: "We give about $30,000 a year and would like to do it more tax-wisely." },
      { q: "Retirement?", a: "At 60, spending about $300,000 a year in today's dollars, with Social Security later." },
    ],
    rubric: ["Names concentration and income correlation risk plainly", "Offers a gradual diversification approach with tax awareness, not a sudden sale", "Explains giving appreciated stock (a donor-advised fund) versus cash", "Estimates 529 needs for two children by their ages", "Tests the retirement spending against the portfolio, including sequence risk"],
    plan: () =>
      seeded({
        name: "Chris Navarro",
        age: 46,
        occupation: "Vice president at a public company",
        income: 19500,
        values: ["Family", "Faith", "Generosity", "Legacy"],
        psychology: "Confident, proud of the company, reluctant to sell; worried about concentration but emotionally attached.",
        notes: "60% of net worth is employer stock; income depends on the same company. Two children approaching college. Wants to give more tax-wisely and retire at 60.",
        goals: [goal("Diversify the company stock", "Medium-Term", 1000000, 4, "High", 0), goal("College for two children", "Medium-Term", 400000, 8, "High", 60000), goal("Charitable giving", "Giving / Generosity", 30000, 1, "Med", 0), goal("Retire at 60", "Long-Term Retirement/Wealth", 7500000, 14, "High", 900000)],
        assets: [asset("Company stock", "brokerage", 2100000), asset("401(k) and IRAs", "retirement", 900000), asset("Cash", "cash", 250000), asset("529 plans", "education", 60000), asset("Home", "home", 1400000)],
        liabilities: [debt("Mortgage", "mortgage", 650000, 4.1, 4300)],
        expenses: [spend("Mortgage and home", "Needs", 6500), spend("Other needs", "Needs", 5500), spend("Wants and travel", "Wants", 3500), spend("Giving", "Giving", 2500), spend("Saving", "Saving", 2500)],
        initial: 3250000,
        monthly: 2500,
        years: 14,
        focus: ["markets", "retirement", "giving"],
        retire: { age: 60, spend: 300000, income: 60000 },
      }),
  },
  {
    id: "retiring",
    name: "Pat and Lee Morgan",
    title: "The couple five years from retirement",
    level: "Pre-retirement",
    blurb: "Both 60, a $1.4 million portfolio, a paid-off home, $95,000 of yearly spending, and worries about health costs, long-term care, and what to leave their grandchildren.",
    objectives: ["Test a retirement income plan against sequence risk", "Coordinate Social Security timing and withdrawals", "Discuss long-term care and estate documents", "Frame a plan for someone who fears running out"],
    facts: [
      { q: "What do you have?", a: "$900,000 in 401(k)s and IRAs, $350,000 in a taxable account, $150,000 in cash, and a paid-off house worth about $600,000." },
      { q: "What do you spend?", a: "About $95,000 a year, including travel and helping our grandchildren." },
      { q: "Income in retirement?", a: "Social Security together about $52,000 a year if we wait until 67. Lee has a small pension of $8,000." },
      { q: "When do you want to retire?", a: "In five years, at 65. We'd like to travel for the first ten years." },
      { q: "What worries you?", a: "A market crash right as we stop working, health costs, and long-term care for one of us." },
      { q: "Legacy?", a: "We want to leave something to our three grandchildren and keep giving to our church." },
    ],
    rubric: ["Calculates the income gap from 65 to 67 and where it is funded", "Explains sequence risk and offers a cash or bond buffer for early years", "Discusses Social Security timing", "Raises long-term care, healthcare and estate documents (will, powers of attorney, beneficiaries)", "Keeps the plan in plain words for worried clients"],
    plan: () =>
      seeded({
        name: "Pat and Lee Morgan",
        age: 60,
        occupation: "Two employees, five years from retirement",
        income: 11500,
        values: ["Family", "Faith", "Legacy", "Security"],
        psychology: "Fear of running out of money, especially in a crash right at retirement.",
        notes: "Retiring at 65 with $1.4 million, a paid-off home, $95,000 a year of spending, and Social Security starting at 67. Concerned about sequence risk, health costs and long-term care.",
        goals: [goal("Retire at 65", "Medium-Term", 2000000, 5, "High", 1400000), goal("Healthcare and long-term care reserve", "Medium-Term", 150000, 10, "High", 0), goal("Travel in early retirement", "Medium-Term", 100000, 5, "Med", 0), goal("Legacy for grandchildren", "Giving / Generosity", 150000, 25, "Low", 0), goal("Church giving", "Giving / Generosity", 6000, 1, "Med", 0)],
        assets: [asset("401(k)s and IRAs", "retirement", 900000), asset("Taxable account", "brokerage", 350000), asset("Cash", "cash", 150000), asset("Home", "home", 600000)],
        liabilities: [],
        expenses: [spend("Home and living", "Needs", 5200), spend("Health costs", "Needs", 900), spend("Travel and fun", "Wants", 1800), spend("Giving and family", "Giving", 900), spend("Saving", "Saving", 2700)],
        initial: 1400000,
        monthly: 2700,
        years: 5,
        focus: ["retirement", "estate", "markets"],
        retire: { age: 65, spend: 95000, income: 60000 },
      }),
  },
];

export const personaById = (id: string) => PERSONAS.find((p) => p.id === id);
