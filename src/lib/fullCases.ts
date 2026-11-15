/**
 * Two full consulting cases with exhibits: longer than the mock cases, with a chart or table handed over part-way through,
 * the way a final-round case runs. Each number in the answer key is worked out here from the same figures the exhibits show,
 * so the story and the math cannot drift apart. The companies are invented for practice.
 */
import type { MockCase } from "./mockCases";

const m1 = (x: number) => Math.round(x * 10) / 10;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/* ---- Case A: Summit Outfitters, a retailer told to close its mall stores ---- */
const SO = {
  formats: ["Flagship", "Mall", "Outlet"],
  stores: [10, 40, 30],
  /** Revenue per store, $M, and store-level profit margin. */
  revenue: [12, 4, 5],
  margin: [0.12, -0.02, 0.09],
  years: ["2022", "2023", "2024", "2025"],
  storeSales: [500, 480, 455, 430],
  online: [60, 85, 115, 150],
  onlineMargin: 0.15,
  /** Share of online sales that come from customers near a mall store, and the share of those lost if the store closes. */
  nearMall: 0.6,
  lostIfClosed: 0.25,
  /** Of the 40 mall stores: 15 lose money, 25 make a little. Profit per store, $M. */
  worst: { count: 15, each: -0.4 },
  rest: { count: 25, each: 0.112 },
};
const soProfit = SO.stores.map((n, i) => n * SO.revenue[i] * SO.margin[i]);
const soStoreProfit = sum(soProfit);
const soOnlineLostAll = SO.online[3] * SO.nearMall * SO.lostIfClosed;
const soCloseAll = -soProfit[1] - soOnlineLostAll * SO.onlineMargin;
const soWorstLoss = SO.worst.count * SO.worst.each;
const soOnlineLostWorst = soOnlineLostAll * (SO.worst.count / SO.stores[1]);
const soCloseWorst = -soWorstLoss - soOnlineLostWorst * SO.onlineMargin;

/* ---- Case B: CloudDesk, a software company deciding where growth should come from ---- */
const CD = {
  segments: ["Small business", "Mid-market", "Enterprise"],
  customers: [4000, 600, 80],
  /** Yearly revenue per customer, $K. */
  arpc: [6, 40, 300],
  churn: [0.25, 0.1, 0.04],
  /** Cost to win one customer, $K. */
  cac: [9, 50, 400],
  grossMargin: 0.8,
  /** Sales and marketing spend by segment, $M. */
  spend: [18, 7.5, 4.5],
};
const cdRevenue = CD.customers.map((n, i) => (n * CD.arpc[i]) / 1000);
const cdLife = CD.churn.map((c) => 1 / c);
const cdLtv = CD.arpc.map((a, i) => a * CD.grossMargin * cdLife[i]);
const cdRatio = cdLtv.map((v, i) => v / CD.cac[i]);
const cdNewMid = 1000 / CD.cac[1];
const cdNewMidValue = (cdNewMid * cdLtv[1]) / 1000;
const cdNewSmall = 1000 / CD.cac[0];
const cdNewSmallValue = (cdNewSmall * cdLtv[0]) / 1000;

export const FULL_CASES: MockCase[] = [
  {
    id: "summit",
    title: "Summit Outfitters: should it close its mall stores?",
    framework: "turn",
    intro: "Our client is Summit Outfitters, an outdoor clothing and gear retailer with 80 stores and a growing website. Profit has fallen by a third in three years. The board believes the mall stores are the problem and wants to close all 40. The CEO has asked us whether that is right. Where would you start?",
    data: [
      { id: "formats", ask: "How many stores of each kind there are, and how they differ", reply: `There are ${SO.stores[0]} flagship stores in city centres, ${SO.stores[1]} mall stores, and ${SO.stores[2]} outlet stores. A flagship sells about $${SO.revenue[0]} million a year, a mall store $${SO.revenue[1]} million, and an outlet $${SO.revenue[2]} million.` },
      { id: "online", ask: "How online sales relate to the stores", reply: `About ${SO.nearMall * 100} percent of online sales come from customers who live near a mall store. A study after earlier closures found that when a store closes, about ${SO.lostIfClosed * 100} percent of the online sales from its area are lost: people who collected or returned orders there stop buying.` },
      { id: "margin", ask: "The profit margin online", reply: `Online sales earn about ${SO.onlineMargin * 100} percent after fulfilment and returns.` },
      { id: "spread", ask: "Whether all mall stores perform alike", reply: `No. ${SO.worst.count} of the ${SO.stores[1]} mall stores lose about $${Math.abs(SO.worst.each)} million a year each; the other ${SO.rest.count} make a small profit of about $${SO.rest.each} million each.` },
      { id: "leases", ask: "The leases", reply: "Most mall leases run another two to four years. Leaving early costs about a year of rent per store; twelve of the fifteen weakest stores have leases ending within eighteen months." },
      { id: "comp", ask: "What competitors are doing", reply: "Two competitors closed most of their mall stores and moved to larger stores outside malls. Mall foot traffic in the client's regions is down about 20 percent in three years." },
    ],
    steps: [
      { id: "s1", kind: "clarify", prompt: "Before you structure it, what do you want to know?", points: ["What 'profit' means here: store-level profit, or company profit after head office costs", "Whether the goal is profit next year or the health of the business in five years", "What closing a store costs: leases, staff, stock", "Whether the stores and the website serve the same customers"] },
      { id: "s2", kind: "structure", prompt: "Lay out how you would decide.", points: ["What each store format earns today", "What closing mall stores would save, and what it would cost (leases, lost online sales)", "Whether all mall stores are alike, or a few drive the loss", "Alternatives to closing: smaller stores, relocation, renegotiated rent", "A recommendation with its risks"] },
      {
        id: "s3", kind: "quant", prompt: "Here is the first exhibit. What does it tell you, and what is the total profit the stores earn?",
        exhibit: { title: "Store-level profit by format ($ millions a year)", kind: "bars", labels: SO.formats, series: [{ name: "Profit", values: soProfit.map(m1) }], unit: "$M" },
        points: [`Flagship: ${SO.stores[0]} × $${SO.revenue[0]}M × ${SO.margin[0] * 100}% = $${m1(soProfit[0])}M`, `Mall: ${SO.stores[1]} × $${SO.revenue[1]}M × ${SO.margin[1] * 100}% = $${m1(soProfit[1])}M, a loss`, `Outlet: ${SO.stores[2]} × $${SO.revenue[2]}M × ${SO.margin[2] * 100}% = $${m1(soProfit[2])}M`, `Total $${m1(soStoreProfit)}M. The mall loss is small next to what the other formats earn: it cannot explain a one-third fall in profit on its own`],
        calc: { question: "Total store-level profit, in $ millions?", answer: soStoreProfit, unit: "$M", working: `${m1(soProfit[0])} − ${m1(-soProfit[1])} + ${m1(soProfit[2])} = ${m1(soStoreProfit)}` },
      },
      {
        id: "s4", kind: "quant", prompt: "Here is the second exhibit, and remember what I told you about online sales near mall stores. If all 40 mall stores close, what happens to profit?",
        exhibit: { title: "Sales by channel, 2022 to 2025 ($ millions)", kind: "lines", labels: SO.years, series: [{ name: "Stores", values: SO.storeSales }, { name: "Online", values: SO.online }], unit: "$M" },
        points: [`Closing removes the mall loss: +$${m1(-soProfit[1])}M`, `Online sales near mall stores: $${SO.online[3]}M × ${SO.nearMall * 100}% = $${m1(SO.online[3] * SO.nearMall)}M; ${SO.lostIfClosed * 100}% of that is lost = $${m1(soOnlineLostAll)}M`, `At a ${SO.onlineMargin * 100}% margin that is $${m1(soOnlineLostAll * SO.onlineMargin)}M of profit lost`, `Net: about $${m1(soCloseAll)}M, roughly nothing, before lease costs. Closing every mall store does not help`],
        calc: { question: "Change in yearly profit from closing all 40 mall stores, in $ millions (negative for a fall)?", answer: soCloseAll, unit: "$M", working: `${m1(-soProfit[1])} − ${m1(soOnlineLostAll)} × ${SO.onlineMargin} = ${m1(soCloseAll)}` },
      },
      {
        id: "s5", kind: "insight", prompt: "So the board's plan does not work. Is there a better version of it?",
        points: [`The mall stores are not alike: ${SO.worst.count} lose $${m1(-soWorstLoss)}M between them; the other ${SO.rest.count} are slightly profitable`, `Closing only the ${SO.worst.count} weakest saves $${m1(-soWorstLoss)}M and loses about $${m1(soOnlineLostWorst)}M of online sales, worth $${m1(soOnlineLostWorst * SO.onlineMargin)}M of profit`, `Net gain about $${m1(soCloseWorst)}M a year`, "Twelve of those leases end within eighteen months, so most can close without a penalty", "The stores that stay double as collection and return points for a website growing 30% a year"],
        calc: { question: "Change in yearly profit from closing only the 15 weakest mall stores, in $ millions?", answer: soCloseWorst, unit: "$M", working: `${m1(-soWorstLoss)} − ${m1(soOnlineLostWorst)} × ${SO.onlineMargin} = ${m1(soCloseWorst)}` },
      },
      { id: "s6", kind: "recommend", prompt: "The CEO walks in. You have thirty seconds.", points: [`Do not close all 40: it gains nothing, because the mall stores support online sales`, `Close the ${SO.worst.count} weakest as their leases end, for about $${m1(soCloseWorst)}M a year`, "Treat the remaining mall stores as small collection points: less floor space, lower rent", "Risks: the study of lost online sales came from earlier closures and may not hold; test with the first few closures", "Next: rank the 40 stores by profit and lease end date this month"] },
    ],
    story: {
      client: "Summit Outfitters (an invented client)",
      situation: `Summit Outfitters runs ${sum(SO.stores)} stores and a website whose sales grew from $${SO.online[0]} million to $${SO.online[3]} million in three years.`,
      complication: `Profit has fallen by a third, the ${SO.stores[1]} mall stores lose $${m1(-soProfit[1])} million a year between them, and the board wants to close all of them.`,
      question: "Should Summit close its mall stores?",
    },
  },
  {
    id: "clouddesk",
    title: "CloudDesk: where should growth come from?",
    framework: "growth",
    intro: "Our client is CloudDesk, which sells help-desk software to businesses of every size. Revenue is 72 million dollars and has stopped growing, although the company wins more new customers every year. The CEO wants to return to 20 percent growth and asks where to put the sales and marketing budget. How would you approach it?",
    data: [
      { id: "segments", ask: "The customer segments and how much each pays", reply: `Three segments: ${CD.customers[0].toLocaleString("en-US")} small businesses paying about $${CD.arpc[0]},000 a year, ${CD.customers[1]} mid-market companies paying $${CD.arpc[1]},000, and ${CD.customers[2]} enterprises paying $${CD.arpc[2]},000.` },
      { id: "churn", ask: "How many customers leave each year", reply: `Each year ${CD.churn[0] * 100} percent of small businesses cancel, ${CD.churn[1] * 100} percent of mid-market customers, and ${CD.churn[2] * 100} percent of enterprises.` },
      { id: "cac", ask: "What it costs to win a customer", reply: `About $${CD.cac[0]},000 for a small business, $${CD.cac[1]},000 for a mid-market company, and $${CD.cac[2]},000 for an enterprise.` },
      { id: "margin", ask: "The gross margin", reply: `About ${CD.grossMargin * 100} percent in every segment.` },
      { id: "limits", ask: "Whether there are limits to selling more in each segment", reply: "There are about 2,000 enterprises that could buy, and each sale takes nine to twelve months. The mid-market has roughly 30,000 companies and a three-month sale. Small businesses number in the millions." },
      { id: "why", ask: "Why small businesses leave", reply: "Most cancel within a year: they go out of business, or switch to a free tool. Product usage in the first month predicts who stays." },
    ],
    steps: [
      { id: "d1", kind: "clarify", prompt: "What do you want to pin down first?", points: ["What 'growth' is measured on: revenue, customers or profit", "The time frame for 20 percent", "Whether the budget is fixed or could rise", "Whether new products or prices are in scope, or only where to sell"] },
      { id: "d2", kind: "structure", prompt: "Structure it for me.", points: ["Why revenue is flat although new customers are rising: what is being lost", "What a customer is worth in each segment, against what it costs to win", "Where the budget goes today", "Limits in each segment: how many customers exist, how long a sale takes", "Where to move the budget, and what to fix in the product"] },
      {
        id: "d3", kind: "quant", prompt: "Here is the first exhibit. Each segment brings in the same revenue. What is a small-business customer worth over its life, in gross profit?",
        exhibit: { title: "Customers by segment", kind: "table", labels: CD.segments, series: [{ name: "Customers", values: CD.customers }, { name: "Revenue per customer ($ thousands a year)", values: CD.arpc }, { name: "Customers leaving each year (%)", values: CD.churn.map((c) => c * 100) }, { name: "Cost to win one ($ thousands)", values: CD.cac }], unit: "" },
        points: [`Each segment brings in $${m1(cdRevenue[0])}M: ${CD.customers[0]} × $${CD.arpc[0]}K, ${CD.customers[1]} × $${CD.arpc[1]}K, ${CD.customers[2]} × $${CD.arpc[2]}K`, `A customer stays about 1 ÷ the share leaving each year: ${cdLife[0]}, ${cdLife[1]} and ${cdLife[2]} years`, `Small business: $${CD.arpc[0]}K × ${CD.grossMargin * 100}% × ${cdLife[0]} years = $${m1(cdLtv[0])}K of gross profit`, `That is only about ${m1(cdRatio[0])} times the $${CD.cac[0]}K it costs to win one`],
        calc: { question: "Lifetime gross profit of one small-business customer, in $ thousands?", answer: cdLtv[0], unit: "K", working: `${CD.arpc[0]} × ${CD.grossMargin} × (1 ÷ ${CD.churn[0]}) = ${m1(cdLtv[0])}` },
      },
      {
        id: "d4", kind: "quant", prompt: "Now the second exhibit: where the budget goes. For a mid-market customer, how many times its cost to win does it earn back?",
        exhibit: { title: "Sales and marketing spend by segment ($ millions a year)", kind: "bars", labels: CD.segments, series: [{ name: "Spend", values: CD.spend }], unit: "$M" },
        points: [`Mid-market: $${CD.arpc[1]}K × ${CD.grossMargin * 100}% × ${cdLife[1]} years = $${m1(cdLtv[1])}K, against $${CD.cac[1]}K to win: ${m1(cdRatio[1])} times`, `Enterprise: $${m1(cdLtv[2])}K against $${CD.cac[2]}K: ${m1(cdRatio[2])} times`, `Small business: ${m1(cdRatio[0])} times`, `Yet ${Math.round((CD.spend[0] / sum(CD.spend)) * 100)}% of the budget goes to small business, the segment that pays back least`],
        calc: { question: "Lifetime gross profit of a mid-market customer divided by the cost to win one?", answer: cdRatio[1], unit: "x", working: `(${CD.arpc[1]} × ${CD.grossMargin} × ${cdLife[1]}) ÷ ${CD.cac[1]} = ${m1(cdRatio[1])}` },
      },
      {
        id: "d5", kind: "insight", prompt: "Suppose we move one million dollars of spend from small business to mid-market. What do we gain?",
        points: [`$1M wins ${Math.round(cdNewSmall)} small businesses worth $${m1(cdNewSmallValue)}M over their lives, or ${cdNewMid} mid-market customers worth $${m1(cdNewMidValue)}M`, `That is about ${m1(cdNewMidValue / cdNewSmallValue)} times the value for the same money`, "Revenue is flat because a quarter of small-business revenue walks out every year: the company is refilling a leaking bucket", "Enterprise pays back best but there are few targets and sales take a year, so it cannot absorb the whole budget quickly", "The fastest fix for small business is keeping customers, not winning more: first-month usage predicts who stays"],
        calc: { question: "Lifetime gross profit from $1 million spent on winning mid-market customers, in $ millions?", answer: cdNewMidValue, unit: "$M", working: `(1,000 ÷ ${CD.cac[1]}) × ${m1(cdLtv[1])}K = ${m1(cdNewMidValue)}M` },
      },
      { id: "d6", kind: "recommend", prompt: "What do you tell the CEO?", points: ["Move budget from small business toward mid-market, in steps, and add enterprise sales capacity that will pay off next year", `Each dollar moved to mid-market earns about ${m1(cdNewMidValue / cdNewSmallValue)} times what it earns in small business`, "Stop the leak: improve first-month onboarding for small businesses before spending more to win them", "Risks: mid-market cost to win may rise as spend grows; enterprise has only about 2,000 targets", "Next: test the shift in one region for a quarter and track cost to win and first-year cancellations"] },
    ],
    story: {
      client: "CloudDesk (an invented client)",
      situation: `CloudDesk earns $${m1(sum(cdRevenue))} million from three customer segments that each bring in a third of revenue.`,
      complication: `Revenue has stopped growing even though new customers rise every year, and ${Math.round((CD.spend[0] / sum(CD.spend)) * 100)} percent of the sales and marketing budget goes to small businesses, a quarter of whom cancel each year.`,
      question: "Where should CloudDesk put its sales and marketing budget to return to 20 percent growth?",
    },
  },
];

/** The figures behind the answer keys, for the tests. */
export const FULL_CASE_FACTS = { soStoreProfit, soCloseAll, soCloseWorst, cdLtv, cdRatio, cdNewMidValue, cdNewSmallValue };
