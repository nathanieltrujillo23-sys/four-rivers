/** The money toolkit: six sections of five tools each. */
export const SECTIONS = [
  {
    id: "live",
    title: "Live",
    text: "Personal expenses, divided into needs, wants, and wishes.",
    tools: ["budget", "rent", "emergency", "trimwant", "wishes"],
  },
  {
    id: "give",
    title: "Give",
    text: "To your church, your family, your friends, and charity.",
    tools: ["giveplan", "church", "family", "friends", "charity"],
  },
  {
    id: "grow",
    title: "Grow",
    text: "Investing in yourself and in the markets.",
    tools: ["yourself", "income", "accounts", "compound", "retire"],
  },
  {
    id: "owe",
    title: "Owe",
    text: "Buying something with a loan, and paying a loan off.",
    tools: ["car", "house", "debt", "payoff", "loans"],
  },
  {
    id: "estate",
    title: "Estate planning",
    text: "The five core documents that protect the people you love.",
    tools: ["will", "trust", "financialpoa", "healthpoa", "livingwill"],
  },
  {
    id: "goals",
    title: "Other financial goals",
    text: "Life events and goals that deserve a plan.",
    tools: ["marriage", "vacation", "baby", "business", "moving"],
  },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

export const TOOL_IDS = SECTIONS.flatMap((s) => s.tools) as unknown as readonly (
  | "budget" | "rent" | "emergency" | "trimwant" | "wishes"
  | "giveplan" | "church" | "family" | "friends" | "charity"
  | "yourself" | "income" | "accounts" | "compound" | "retire"
  | "car" | "house" | "debt" | "payoff" | "loans"
  | "will" | "trust" | "financialpoa" | "healthpoa" | "livingwill"
  | "marriage" | "vacation" | "baby" | "business" | "moving"
)[];
export type ToolId = (typeof TOOL_IDS)[number];

export const isToolId = (v: string): v is ToolId => (TOOL_IDS as readonly string[]).includes(v);

/** The name and one-line description of each tool, as shown on its card and printed on the meeting PDF. */
export const CATALOG: Record<ToolId, { title: string; text: string }> = {
  budget: { title: "Monthly budget", text: "Needs, wants, and wishes, and what is left over." },
  rent: { title: "Housing and roommates", text: "Rent, shared costs, and what housing should take." },
  emergency: { title: "Emergency fund", text: "How many months of needs you could cover, and how to get there." },
  trimwant: { title: "Trim a want", text: "What a small regular spend really costs, and what trimming it could grow into." },
  wishes: { title: "Wish list planner", text: "Fund your wishes in order from one monthly amount." },
  giveplan: { title: "Giving plan", text: "Set a percent to give, and split it four ways." },
  church: { title: "Church giving", text: "Tithe and offering, per paycheck and per year." },
  family: { title: "Family support", text: "Helping family without losing your footing." },
  friends: { title: "Friends and celebrations", text: "Gifts, weddings, holidays, and hospitality, planned." },
  charity: { title: "Charity gifts", text: "Monthly giving, employer matching, and the true cost to you." },
  yourself: { title: "Investing in yourself", text: "What a course, skill, or degree has to earn back." },
  income: { title: "Growing your income", text: "Where extra income goes, and how to compare job offers." },
  accounts: { title: "Investing in the markets", text: "Traditional, Roth, brokerage, and HSA accounts compared." },
  compound: { title: "Growth over time", text: "What steady investing becomes, and what waiting costs." },
  retire: { title: "Retirement target", text: "How much you need, where you are, and the monthly gap." },
  car: { title: "Buying a car", text: "The loan, the true monthly cost, and your share of take-home pay." },
  house: { title: "Buying a house", text: "Monthly cost, cash needed up front, and the income it takes." },
  debt: { title: "Paying off several debts", text: "Snowball and avalanche side by side, with your own debts." },
  payoff: { title: "Pay one loan off faster", text: "A student, car, or home loan, with an extra payment." },
  loans: { title: "Compare two loans", text: "Which offer really costs less, fees included." },
  will: { title: "Last will and testament", text: "Who gets what, who carries it out, and who raises your children." },
  trust: { title: "Revocable living trust", text: "Holding assets for you now and passing them on later." },
  financialpoa: { title: "Durable power of attorney", text: "Someone to handle your money if you cannot." },
  healthpoa: { title: "Health care power of attorney", text: "Someone to make medical decisions if you cannot." },
  livingwill: { title: "Living will (advance directive)", text: "Your wishes about medical care, in your own words." },
  marriage: { title: "Getting married", text: "Two incomes, one home, and a wedding budget." },
  vacation: { title: "Taking a vacation", text: "Save for a trip, a gift, or any goal by a date." },
  baby: { title: "Having a child", text: "First-year costs, childcare, and time away from work." },
  business: { title: "Starting a business or side hustle", text: "Start-up costs, profit, and time to pay back." },
  moving: { title: "Moving", text: "Moving costs, new rent, and the cash you need first." },
};
