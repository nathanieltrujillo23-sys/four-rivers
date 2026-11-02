/**
 * Mock cases for Consulting Tools: an interviewer who gives only the headline, shares data only when asked (as in a real case, where
 * asking for the numbers you need is part of the skill), and walks through clarify, structure, quantitative, insight and
 * recommendation. Each case has an answer key worked out in code so the numbers cannot drift from the story. The cases are
 * invented for practice.
 */

export type StepKind = "clarify" | "structure" | "quant" | "insight" | "recommend";

export interface DataRequest {
  id: string;
  /** What the candidate asks for. */
  ask: string;
  /** What the interviewer says in reply. */
  reply: string;
}
export interface MockStep {
  id: string;
  kind: StepKind;
  /** What the interviewer says to start this step. */
  prompt: string;
  /** What a strong answer includes. */
  points: string[];
  /** A numeric question in this step, if any. */
  calc?: { question: string; answer: number; unit: string; working: string };
}
export interface MockCase {
  id: string;
  title: string;
  /** The framework this case is closest to (see consultingContent). */
  framework: string;
  /** The interviewer's opening. */
  intro: string;
  data: DataRequest[];
  steps: MockStep[];
}

const m1 = (x: number) => Math.round(x * 10) / 10;

/* ---- Case 1: profitability ---- */
const FM = { rev0: 1000, rev1: 1040, cogs0: 700, cogs1: 760, sga0: 240, sga1: 238 };
const fmProfit0 = FM.rev0 - FM.cogs0 - FM.sga0;
const fmProfit1 = FM.rev1 - FM.cogs1 - FM.sga1;
const fmCounterfactual = FM.rev1 - FM.rev1 * (FM.cogs0 / FM.rev0) - FM.sga1;

/* ---- Case 2: market entry ---- */
const ME = { population: 1400, middleShare: 0.2, buyShare: 0.05, spend: 60, targetShare: 0.05, contribution: 0.2, investment: 30 };
const meBuyers = ME.population * ME.middleShare * ME.buyShare; // millions of people
const meMarket = meBuyers * ME.spend; // millions of dollars
const meRevenue = meMarket * ME.targetShare;
const meProfit = meRevenue * ME.contribution;
const mePayback = ME.investment / meProfit;

/* ---- Case 3: pricing ---- */
const PR = { price: 500, cost: 200, fixed: 3_000_000, customers: 20_000, newPrice: 600, lost: 0.2 };
const prProfit = (PR.price - PR.cost) * PR.customers - PR.fixed;
const prNew = (PR.newPrice - PR.cost) * PR.customers * (1 - PR.lost) - PR.fixed;

export const MOCK_CASES: MockCase[] = [
  {
    id: "freshmart",
    title: "FreshMart: why did profit fall?",
    framework: "profit",
    intro: "Our client is FreshMart, a regional grocery chain. Over the last year its profit fell from 60 million dollars to 42 million. The CEO wants to know why, and what to do about it. How would you like to start?",
    data: [
      { id: "rev", ask: "Revenue over the two years", reply: `Revenue was ${FM.rev0} million last year before and ${FM.rev1} million this year: up 4 percent.` },
      { id: "cogs", ask: "Cost of goods sold (what the stores pay for the food)", reply: `Cost of goods sold was ${FM.cogs0} million before and ${FM.cogs1} million now.` },
      { id: "sga", ask: "Operating costs (staff, rent, marketing)", reply: `Staff, rent and marketing together were ${FM.sga0} million before and ${FM.sga1} million now.` },
      { id: "comp", ask: "What competitors and the industry have done", reply: "Competitors report stable margins. Food wholesale prices rose about 3 percent industry-wide, and FreshMart's contract with its largest supplier was renegotiated this year." },
      { id: "mix", ask: "The product mix", reply: "The share of sales from fresh produce rose, which carries a lower margin, because of a new promotion on fruit and vegetables." },
    ],
    steps: [
      { id: "c1", kind: "clarify", prompt: "Before you structure, what would you want to know?", points: ["How profit is defined and the time period", "Whether the decline is company-specific or industry-wide", "Which stores, products or regions drive it, and when it started"] },
      { id: "c2", kind: "structure", prompt: "Take a minute and tell me how you would approach this.", points: ["Profit = revenue − costs, with a hypothesis", "Revenue: price, volume, mix", "Costs: variable (what the stores pay for goods) and fixed (staff, rent)", "Compare with the industry; decide what to do about it"] },
      {
        id: "c3", kind: "quant", prompt: "Using the data, compute the profit each year and tell me what changed.",
        points: [`Profit before: ${FM.rev0} − ${FM.cogs0} − ${FM.sga0} = ${fmProfit0}; now: ${FM.rev1} − ${FM.cogs1} − ${FM.sga1} = ${fmProfit1}`, "Revenue is up 40, but the cost of goods is up 60, which more than eats the gain", "Operating costs fell a little, which does not offset it"],
        calc: { question: `If the cost of goods had stayed at ${m1((FM.cogs0 / FM.rev0) * 100)}% of revenue, what would this year's profit have been, in millions of dollars?`, answer: fmCounterfactual, unit: "$M", working: `Cost would be ${FM.rev1} × 70% = ${m1(FM.rev1 * 0.7)}; profit = ${FM.rev1} − ${m1(FM.rev1 * 0.7)} − ${FM.sga1} = ${m1(fmCounterfactual)}` },
      },
      { id: "c4", kind: "insight", prompt: "What does that tell you about the cause?", points: ["The gross margin fell from 30% to about 26.9%: the problem is the cost of goods, not volume or overhead", "Two likely causes: the supplier contract and the shift toward low-margin produce", "Industry prices rose only 3%, but FreshMart's costs rose about 8.6%, so part of this is company-specific"] },
      { id: "c5", kind: "recommend", prompt: "Give me your recommendation to the CEO, as you would in 30 seconds.", points: ["Reopen or rebid the supplier contract to bring the cost back toward the industry increase", "Review pricing and the promotion so the margin on produce recovers", "Keep the overhead discipline; track gross margin monthly as the early warning", "Risks: a supplier may not move; shoppers may resist price increases"] },
    ],
  },
  {
    id: "activewear",
    title: "Activewear in India: should we enter?",
    framework: "entry",
    intro: "Our client is a US activewear brand with strong sales at home. It is considering entering India. Should it? How would you like to start?",
    data: [
      { id: "pop", ask: "The size of the population", reply: `India has about ${ME.population} million people.` },
      { id: "mid", ask: "How many are in the middle class or above, who could buy premium activewear", reply: `Assume about ${ME.middleShare * 100} percent of the population.` },
      { id: "buy", ask: "How many of them buy premium activewear in a year", reply: `About ${ME.buyShare * 100} percent of that group buys premium activewear each year.` },
      { id: "spend", ask: "How much a buyer spends a year", reply: `A typical buyer spends about ${ME.spend} dollars a year.` },
      { id: "comp", ask: "The competition", reply: "Two global brands and several local ones compete; the global brands hold about half of premium sales between them. Local brands are cheaper." },
      { id: "cost", ask: "What entry would cost and earn", reply: `The client aims for ${ME.targetShare * 100} percent of the market. Each dollar of sales contributes ${ME.contribution * 100} cents of profit before the up-front investment of ${ME.investment} million dollars.` },
    ],
    steps: [
      { id: "a1", kind: "clarify", prompt: "What would you ask before starting?", points: ["The client's goal: profit, growth or a strategic position", "Online or stores, and the budget and timeline", "Whether they have any presence or partners in India already"] },
      { id: "a2", kind: "structure", prompt: "How would you structure this?", points: ["Market: size, growth, customers", "Competition and how they would react", "The client's ability to win: brand, supply chain, partners", "Economics: investment, payback and risks; then the decision"] },
      {
        id: "a3", kind: "quant", prompt: "Size the market for premium activewear in India, using the numbers I gave you.",
        points: [`Population ${ME.population}M × ${ME.middleShare * 100}% in the middle class = ${m1(ME.population * ME.middleShare)}M people`, `× ${ME.buyShare * 100}% who buy = ${m1(meBuyers)}M buyers`, `× $${ME.spend} a year = $${m1(meMarket)}M a year`],
        calc: { question: "What is the annual market, in millions of dollars?", answer: meMarket, unit: "$M", working: `${ME.population} × ${ME.middleShare} × ${ME.buyShare} × ${ME.spend} = ${m1(meMarket)}` },
      },
      {
        id: "a4", kind: "insight", prompt: `The client wants ${ME.targetShare * 100}% of that market. How long to pay back the ${ME.investment} million dollar investment?`,
        points: [`Revenue at ${ME.targetShare * 100}% share = $${m1(meRevenue)}M a year; profit at ${ME.contribution * 100}% = $${m1(meProfit)}M a year`, `Payback = ${ME.investment} ÷ ${m1(meProfit)} = about ${m1(mePayback)} years`, "Worth it only if the share is reachable against two global brands, and if the price point fits"],
        calc: { question: "How many years to pay back the investment?", answer: mePayback, unit: " years", working: `${ME.investment} ÷ (${m1(meRevenue)} × ${ME.contribution}) = ${m1(mePayback)}` },
      },
      { id: "a5", kind: "recommend", prompt: "What do you recommend?", points: ["Likely yes, but staged: start online or with a partner to test demand before a large investment", "Reasons: a payback of about 3.6 years at a modest 5% share, a growing middle class", "Risks: price competition from local brands, supply chain and returns, reaching 5% share", "Next steps: a pilot, a local partner, a view on pricing"] },
    ],
  },
  {
    id: "analytics",
    title: "Pricing a new analytics tool",
    framework: "pricing",
    intro: "Our client is a software company about to launch an analytics tool for mid-size retailers. It plans to charge 500 dollars a customer a year. Is that the right price?",
    data: [
      { id: "cost", ask: "The cost of serving each customer", reply: `Each customer costs about ${PR.cost} dollars a year to serve (hosting and support).` },
      { id: "fixed", ask: "Fixed costs", reply: `Development and overhead are about ${PR.fixed / 1_000_000} million dollars a year.` },
      { id: "vol", ask: "Expected customers at 500 dollars", reply: `About ${PR.customers.toLocaleString("en-US")} customers at 500 dollars.` },
      { id: "elastic", ask: "How customers react to a higher price", reply: `Market research suggests that at ${PR.newPrice} dollars, about ${PR.lost * 100} percent of those customers would not buy.` },
      { id: "comp", ask: "Competitor prices and value", reply: "Two competitors charge 450 and 700 dollars; the client's tool saves customers roughly 3,000 dollars a year in staff time." },
    ],
    steps: [
      { id: "p1", kind: "clarify", prompt: "What would you ask first?", points: ["The goal: profit, share or growth", "Who the customer is and what they do now", "Whether the price can change after launch"] },
      { id: "p2", kind: "structure", prompt: "How would you decide on a price?", points: ["Cost: the floor that covers unit and fixed cost", "Customer: the value delivered and willingness to pay", "Competition: where the alternatives are priced", "Strategy: the goal, the price model, and a way to test"] },
      {
        id: "p3", kind: "quant", prompt: "What is the annual profit at 500 dollars?",
        points: [`Contribution per customer = ${PR.price} − ${PR.cost} = ${PR.price - PR.cost}`, `× ${PR.customers.toLocaleString("en-US")} customers = ${((PR.price - PR.cost) * PR.customers) / 1e6} million`, `Less fixed costs ${PR.fixed / 1e6} million = ${prProfit / 1e6} million`],
        calc: { question: "Annual profit at 500 dollars, in millions of dollars?", answer: prProfit / 1e6, unit: "$M", working: `(${PR.price} − ${PR.cost}) × ${PR.customers} − ${PR.fixed} = ${prProfit}` },
      },
      {
        id: "p4", kind: "insight", prompt: "Now at 600 dollars, with the lost customers. Is it better?",
        points: [`Customers = ${PR.customers} × (1 − ${PR.lost}) = ${PR.customers * (1 - PR.lost)}`, `Profit = (${PR.newPrice} − ${PR.cost}) × ${PR.customers * (1 - PR.lost)} − ${PR.fixed} = ${prNew}`, "It is higher, by 0.4 million, even with fewer customers: a higher price helps when unit margin is large", "But fewer customers also means less market share and less data and word of mouth"],
        calc: { question: "Annual profit at 600 dollars, in millions of dollars?", answer: prNew / 1e6, unit: "$M", working: `(${PR.newPrice} − ${PR.cost}) × ${PR.customers * (1 - PR.lost)} − ${PR.fixed} = ${prNew}` },
      },
      { id: "p5", kind: "recommend", prompt: "What price do you recommend?", points: ["Not simply the highest profit: the value to customers is about 3,000 dollars a year, so 600 is well within it, and one competitor charges 700", "Suggest launching near 600 with a test of two price points or tiers, and watching conversion", "Risks: the research may overstate or understate sensitivity; monitor churn", "Revisit as the product and competition mature"] },
    ],
  },
];

export const mockCaseById = (id: string) => MOCK_CASES.find((c) => c.id === id);

/* ---- The case timer ---- */

export const CASE_PHASES: { id: string; label: string; minutes: number }[] = [
  { id: "clarify", label: "Clarify and structure", minutes: 4 },
  { id: "analysis", label: "Analysis and numbers", minutes: 14 },
  { id: "insight", label: "Brainstorm and insight", minutes: 5 },
  { id: "recommend", label: "Recommendation", minutes: 2 },
];

/** Which phase a stopwatch reading falls in, how far into it, and whether the case has run over its 25 minutes. */
export function phaseAt(elapsedSeconds: number) {
  let start = 0;
  for (const p of CASE_PHASES) {
    const end = start + p.minutes * 60;
    if (elapsedSeconds < end) return { phase: p, into: elapsedSeconds - start, over: false, total: CASE_PHASES.reduce((t, x) => t + x.minutes, 0) * 60 };
    start = end;
  }
  const last = CASE_PHASES[CASE_PHASES.length - 1];
  return { phase: last, into: elapsedSeconds - (start - last.minutes * 60), over: true, total: start };
}

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
