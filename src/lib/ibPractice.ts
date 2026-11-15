/**
 * Practice cases for Investment Banking Tools: three invented situations (a sale, a buyout, a merger), each with a brief,
 * the work to do, and a set of numbers that loads into the valuation models. Every company, peer and deal here is made up
 * for practice; none is a real security or transaction.
 */
import { defaultWacc, type PrecedentRow } from "./ibCapital";
import { defaultComps, defaultDcf, defaultLbo, defaultMerger, type CompRow } from "./ibMath";
import type { IbData } from "./ibWorkspace";

export interface IbCase {
  id: string;
  title: string;
  level: "Foundation" | "Intermediate" | "Advanced";
  /** Which side of the table you are on. */
  role: string;
  summary: string;
  brief: string[];
  tasks: string[];
  /** What a strong answer notices; shown only when asked for. */
  notice: string[];
  /** The models this case fills in. */
  models: string[];
  /** The numbers to load. Only the models named are replaced; the rest of the workspace is left alone. */
  load: () => Partial<Pick<IbData, "dcf" | "wacc" | "comps" | "precedents" | "lbo" | "merger">>;
}

const SOURCE = "Practice case (invented)";
const comp = (name: string, ev: number, revenue: number, ebitda: number, netIncome: number, equity: number): CompRow => ({ id: `pc-${name}`, name, ev: String(ev), revenue: String(revenue), ebitda: String(ebitda), netIncome: String(netIncome), equity: String(equity), source: SOURCE, asOf: "" });
const deal = (target: string, acquirer: string, year: number, ev: number, revenue: number, ebitda: number, premium: number | ""): PrecedentRow => ({ id: `pd-${target}`, target, acquirer, year: String(year), ev: String(ev), revenue: String(revenue), ebitda: String(ebitda), premium: premium === "" ? "" : String(premium), source: SOURCE, asOf: "" });

export const IB_CASES: IbCase[] = [
  {
    id: "sell-side",
    title: "Selling a family company",
    level: "Foundation",
    role: "Sell-side adviser",
    summary: "A family-owned snack maker wants to know what it is worth before it talks to buyers.",
    brief: [
      "Juniper Snacks is a family-owned maker of baked snacks with $420 million of revenue and steady growth. The founder is 68, no one in the next generation wants to run it, and two larger food companies have called.",
      "The family has a number in mind: $700 million, 'because a neighbour's company sold for ten times earnings'. They have $120 million of debt net of cash.",
      "You have five listed snack and packaged-food companies to compare it with, and four deals from the last few years. Your job is a valuation range the family can take into a negotiation, and an honest answer about their number.",
    ],
    tasks: [
      "Build the WACC from the peer betas, then run the DCF with it. What share of the value sits in the terminal value?",
      "Read the trading comparables and the precedent transactions. Why do the two ranges differ?",
      "Look at the football field. Where do the methods overlap, and which deserves the most weight for a sale?",
      "Tell the family whether $700 million is reasonable, in three sentences, and what would move the price.",
    ],
    notice: [
      "Precedent multiples sit above trading multiples: buyers pay for control and for cost savings. For a sale, precedents are the more relevant yardstick.",
      "Most of the DCF's value is the terminal value, so the growth rate and discount rate drive the answer. Show the sensitivity table, not one number.",
      "'Ten times earnings' confuses net income with EBITDA. Find out which the family means before reacting to the number.",
      "Every method here puts the company's enterprise value above $700 million, so the family's number looks low, not high. Say so, and ask whether they mean the price for the whole company or what they keep.",
      "Enterprise value is not what the family takes home: debt comes off first.",
    ],
    models: ["WACC", "DCF", "Comparables", "Precedents"],
    load: () => ({
      wacc: {
        ...defaultWacc(), riskFree: "4.2", erp: "5", sizePremium: "1", beta: "0.9", fromPeers: true, costOfDebt: "6.5", tax: "25", equity: "550", debt: "120",
        peers: [
          { id: "pb-1", name: "Harvest Table Foods", beta: "0.75", debtToEquity: "35", tax: "24" },
          { id: "pb-2", name: "Crestline Brands", beta: "0.85", debtToEquity: "50", tax: "25" },
          { id: "pb-3", name: "Golden Mill Co.", beta: "0.70", debtToEquity: "20", tax: "23" },
          { id: "pb-4", name: "Northfield Snacks", beta: "0.95", debtToEquity: "45", tax: "25" },
          { id: "pb-5", name: "Blue Ridge Bakers", beta: "0.80", debtToEquity: "30", tax: "24" },
        ],
      },
      dcf: { ...defaultDcf(), revenue: "420", growth: ["6", "5", "5", "4", "4"], ebitMargin: "14", tax: "25", da: "3", capex: "4", nwc: "8", wacc: "8.1", terminalGrowth: "2.5", exitMultiple: "10", netDebt: "120", shares: "10", price: "", midYear: true },
      comps: {
        ...defaultComps(), basis: "ebitda", targetRevenue: "420", targetEbitda: "71.4", targetNetIncome: "40", netDebt: "120", shares: "10",
        rows: [comp("Harvest Table Foods", 5200, 2600, 468, 250, 4300), comp("Crestline Brands", 3100, 1700, 290, 140, 2300), comp("Golden Mill Co.", 1900, 950, 180, 95, 1650), comp("Northfield Snacks", 2400, 1300, 215, 100, 1800), comp("Blue Ridge Bakers", 1200, 640, 105, 52, 980)],
      },
      precedents: {
        rows: [deal("Prairie Crisp", "Harvest Table Foods", 2023, 980, 520, 82, 34), deal("Sunmill Bakery", "Crestline Brands", 2024, 640, 330, 49, ""), deal("Coastal Chips", "A private equity firm", 2024, 1450, 700, 112, 28), deal("Oak & Rye Foods", "Northfield Snacks", 2025, 760, 410, 61, 31)],
        targetRevenue: "420", targetEbitda: "71.4", netDebt: "120", shares: "10", price: "", basis: "ebitda",
      },
    }),
  },
  {
    id: "buyout",
    title: "Should the fund bid?",
    level: "Intermediate",
    role: "Private equity associate",
    summary: "A gym chain is for sale at ten times EBITDA. Does a buyout earn the fund its 20 percent?",
    brief: [
      "Harbor Fitness runs 60 gyms and earns $80 million of EBITDA, growing about 7 percent a year. The seller's bank has said bids below ten times EBITDA will not be considered.",
      "Lenders will provide debt of 5.5 times EBITDA at 9.5 percent. The gyms need steady reinvestment: capital spending runs at a quarter of EBITDA.",
      "Your fund aims for a 20 percent return and expects to sell in five years, probably at a lower multiple than it pays. Your partner wants one page: bid or pass, and at what price.",
    ],
    tasks: [
      "Run the buyout at the asking price. What is the IRR, and where does the return come from?",
      "Use the sensitivity table: how much does the return depend on the exit multiple and on how long you hold?",
      "Find the highest price that still earns 20 percent. The football field shows it as the ability to pay.",
      "Write the recommendation: bid or pass, the price, and the two things that would change your mind.",
    ],
    notice: [
      "At the asking price the return is about 13 percent, well short of 20. The most the fund could pay and still earn 20 percent is about 8.7 times EBITDA, below the seller's floor: bid there and expect to lose, or pass.",
      "With heavy capital spending, little cash is left to repay debt, so less of the return comes from paydown than in a typical buyout.",
      "Selling at a lower multiple than you paid takes value away. A plan that only works if the multiple holds is a bet on the market, not on the business.",
      "More debt lifts the return and the risk together. In the first year EBITDA covers interest only about twice: a weak year would leave little room.",
    ],
    models: ["LBO"],
    load: () => ({ lbo: { ...defaultLbo(), ebitda: "80", entryMultiple: "10", leverage: "5.5", interest: "9.5", fees: "2", growth: "7", da: "20", capex: "25", nwc: "3", tax: "25", years: "5", exitMultiple: "9" } }),
  },
  {
    id: "merger",
    title: "Does the deal add to earnings?",
    level: "Advanced",
    role: "Adviser to the acquirer",
    summary: "A larger company wants to buy a smaller rival. How should it pay, and what must go right?",
    brief: [
      "Northwind Industries (share price $60, 300 million shares, $900 million of net income) wants to buy Lakeshore Components (share price $25, 80 million shares, $110 million of net income).",
      "Lakeshore's board has signalled it would accept a 30 percent premium. Northwind can borrow at 6 percent, and management believes combining the two would save $40 million a year before tax.",
      "Northwind's chief executive has promised shareholders the deal will add to earnings per share in the first year. You are asked how to pay for it so that promise holds, and how much of it rests on the savings.",
    ],
    tasks: [
      "Run the deal three ways: all stock, all cash, and half of each. Which adds most to earnings per share?",
      "Set synergies to zero. Is the deal still accretive? What does that tell you?",
      "Find the break-even synergies for the mix you would recommend.",
      "Explain to the chief executive, in plain words, why adding to earnings per share is not the same as creating value.",
    ],
    notice: [
      "At a 30 percent premium Northwind pays a higher multiple of earnings for Lakeshore than its own shares trade at, so paying in stock dilutes earnings without the savings.",
      "Cash dilutes less than stock: borrowing at 6 percent costs 4.5 percent after tax, close to the 4.2 percent of earnings Lakeshore brings per dollar paid, while new shares are issued at a lower multiple than the one being paid.",
      "Without the savings the deal reduces earnings per share however it is paid for. The whole promise rests on the synergies.",
      "Show the break-even: paid in cash, about $9 million of the $40 million must arrive; paid in stock, about $27 million.",
      "A deal can add to earnings per share and still destroy value if the price exceeds what the target is worth. Accretion is arithmetic, not a verdict.",
    ],
    models: ["Accretion and dilution"],
    load: () => ({ merger: { ...defaultMerger(), acqPrice: "60", acqShares: "300", acqNetIncome: "900", tgtPrice: "25", tgtShares: "80", tgtNetIncome: "110", premium: "30", stockPct: "50", costOfCash: "6", synergies: "40", tax: "25" } }),
  },
];

export const ibCase = (id: string) => IB_CASES.find((c) => c.id === id);
