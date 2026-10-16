/** Reference tables for the education hub and the presentation: how accounts and kinds of income compare. 2026 federal rules. */

export const VEHICLES: { name: string; rows: Record<string, string> }[] = [
  {
    name: "Taxable brokerage",
    rows: {
      "2026 limit": "No limit",
      "Going in": "After tax dollars",
      Growth: "Dividends and realized gains taxed each year; long term gains get lower rates",
      "Coming out": "Anytime; gains taxed when sold",
      Liquidity: "High",
      "Best for": "Flexible goals beyond retirement",
    },
  },
  {
    name: "Roth IRA",
    rows: {
      "2026 limit": "$7,500 (+$1,100 catch up at 50+); income phase outs apply",
      "Going in": "After tax dollars; needs earned income",
      Growth: "Tax free",
      "Coming out": "Contributions anytime; earnings tax free after 59½ and 5 years",
      Liquidity: "Medium",
      "Best for": "Young earners in low tax brackets",
    },
  },
  {
    name: "Traditional 401(k)",
    rows: {
      "2026 limit": "$24,500 employee deferral (+$8,000 catch up at 50+)",
      "Going in": "Pre tax; lowers taxable income today",
      Growth: "Tax deferred",
      "Coming out": "Taxed as ordinary income; 10% penalty before 59½ with exceptions",
      Liquidity: "Low",
      "Best for": "Capturing the employer match; high bracket years",
    },
  },
  {
    name: "High yield savings",
    rows: {
      "2026 limit": "No limit; FDIC insured to $250,000 per depositor, per bank, per ownership category",
      "Going in": "After tax dollars",
      Growth: "Interest taxed as ordinary income yearly; rate floats",
      "Coming out": "Anytime",
      Liquidity: "Very high",
      "Best for": "Emergency fund and goals under 3 years",
    },
  },
];

export const INCOME_COLS: { k: string; rows: string[] }[] = [
  { k: "W-2 hourly wage", rows: ["High", "No: capped by hours", "Payroll + income tax withheld", "Fixed hours", "Low", "Hours cut or job loss", "Funds fixed overhead"] },
  {
    k: "Tips / shift work",
    rows: [
      "Medium: varies by night and season",
      "Partly: better shifts and skills",
      "Taxable and reportable; qualified tips deductible up to $25,000/yr through 2028 (federal income tax only)",
      "Evening and weekend heavy",
      "Medium",
      "Slow seasons; burnout",
      "Accelerates savings rate",
    ],
  },
  {
    k: "Side hustle (1099)",
    rows: [
      "Low",
      "Yes, if systemized",
      "Self employment tax ~15.3% on net; quarterly estimates; expenses deductible",
      "Flexible but competes with school",
      "High",
      "Inconsistent demand; time drain",
      "Builds skills and business equity",
    ],
  },
  {
    k: "Equity compounding",
    rows: [
      "Low short term, high long term",
      "Yes: money works without hours",
      "Long term gains taxed at lower rates; tax free inside a Roth",
      "Minimal once automated",
      "Very high over decades",
      "Market drawdowns",
      "The engine of long term wealth",
    ],
  },
];
export const INCOME_ROWS = ["Predictability", "Scales beyond time?", "Tax treatment", "Time demand", "Upside", "Key risk", "Role in the plan"];


/** One line on why each discovery topic matters, for the presenter and the focus-area slide. */
export const TOPIC_WHY: Record<string, string> = {
  budgeting: "A plan for every dollar before the month starts is what makes saving, giving and investing happen.",
  emergency: "A cash cushion keeps one bad month from turning into debt, and lets everything else run undisturbed.",
  giving: "Deciding what to give first, on payday, keeps generosity a priority instead of a leftover.",
  markets: "Which account holds the money (and how it is taxed) changes how much of the growth you keep.",
  yourself: "A skill or credential can raise income for decades; it is often the best return available early on.",
  income: "More income only helps if it has a destination; deciding the split first keeps it from disappearing.",
  retirement: "Time does the heavy lifting: the earliest dollars have the longest to compound.",
  debt: "Interest is a guaranteed cost; the right payoff order saves months and real money.",
  car: "The loan payment is only part of what a car costs, and it competes with every other goal.",
  house: "Buying is a large, long commitment; the true monthly cost and cash needed up front decide if it fits.",
  estate: "A will and the supporting documents protect the people you love and spare them guesswork.",
  marriage: "Two incomes, two sets of habits, and often two sets of debt: talking numbers early prevents surprises.",
  vacation: "Saving ahead means the trip is paid for, not carried on a card afterward.",
  family: "A child changes income, costs and priorities; planning ahead turns the surprise into a plan.",
  business: "Starting a business means irregular income and start-up costs, so a runway and a plan matter.",
  moving: "A move has deposits, transport and overlap costs that are easy to underestimate.",
};
