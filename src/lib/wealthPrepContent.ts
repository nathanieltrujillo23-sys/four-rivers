/**
 * Material for preparing to interview in wealth management: technical questions with model answers, behavioral prompts, and a
 * readiness checklist. The answers are concise teaching answers, not scripts: say them in your own words, and check any figure that
 * changes (tax limits, rates) before using it. Nothing here is investment, tax or legal advice.
 */

export type TechCategory = "Planning and clients" | "Investments" | "Taxes and accounts" | "Private banking" | "Markets";
export const TECH_CATEGORIES: TechCategory[] = ["Planning and clients", "Investments", "Taxes and accounts", "Private banking", "Markets"];

export interface TechQuestion {
  id: string;
  category: TechCategory;
  q: string;
  a: string;
}

export const TECH_QUESTIONS: TechQuestion[] = [
  // Planning and clients
  { id: "p1", category: "Planning and clients", q: "Walk me through the wealth management process.", a: "It starts with discovery: who the client is, what they want, and their full financial picture. Then goals are set and prioritized, data is gathered (assets, debts, cash flow, insurance, taxes, estate), and the situation is analyzed. The advisor recommends a plan, helps implement it, and then monitors and reviews it regularly, because life and markets change." },
  { id: "p2", category: "Planning and clients", q: "What is the difference between risk tolerance, risk capacity and the risk required?", a: "Tolerance is willingness: how the client feels about losses. Capacity is ability: how much loss they could absorb without derailing their goals (time horizon, income stability, cushion). Required risk is what their goals demand. The plan is built on the lower of tolerance and capacity, and if the goals need more, the honest answers are to save more, allow more time, or lower the target." },
  { id: "p3", category: "Planning and clients", q: "What is an investment policy statement and why does it matter?", a: "It is the written agreement between advisor and client on objectives (return and risk), constraints (time horizon, liquidity, taxes, legal, unique circumstances), the target allocation, and how the portfolio is monitored and rebalanced. It keeps decisions consistent when markets are emotional, and gives a standard to measure the advisor against." },
  { id: "p4", category: "Planning and clients", q: "What does KYC mean and why is it required?", a: "Know Your Customer: verifying who the client is and understanding their financial situation, objectives and risk profile. It supports suitability or best-interest recommendations and anti-money-laundering rules." },
  { id: "p5", category: "Planning and clients", q: "Explain the fiduciary standard compared with a best-interest standard.", a: "A fiduciary, such as a registered investment adviser, owes a duty of care and a duty of loyalty and must put the client's interest first. Broker-dealers recommending to retail customers must act in the customer's best interest under Regulation Best Interest, which focuses on the recommendation at the time it is made. The details differ; say you would check the firm's status." },
  { id: "p6", category: "Planning and clients", q: "How would you explain a Monte Carlo simulation to a client?", a: "We run thousands of possible futures for the market, each a little different, and see how often the plan reaches the goal. If 8,000 of 10,000 paths succeed, the chance of success is 80%. It shows a range of outcomes instead of one average, but it depends on the assumptions and cannot predict the future." },
  { id: "p7", category: "Planning and clients", q: "What is sequence of returns risk?", a: "The order of returns matters when money is being withdrawn. A market fall in the first years of retirement hurts far more than the same fall later, because withdrawals sell shares at low prices and the portfolio has less left to recover. Ways to manage it: a cash or bond buffer for early years, flexible spending, and a lower starting withdrawal rate." },
  { id: "p8", category: "Planning and clients", q: "What is the 4% rule and what are its limits?", a: "It comes from historical research suggesting a retiree could withdraw about 4% of the starting portfolio in year one, then adjust for inflation, and have money last about 30 years. Limits: it is based on past U.S. returns, assumes a 30-year horizon and a fixed mix, ignores taxes and fees, and does not adapt to bad markets. It is a starting guide, not a promise." },
  { id: "p9", category: "Planning and clients", q: "How big should an emergency fund be?", a: "Commonly three to six months of essential expenses, in cash or a high-yield savings account. More for irregular or single-income households, less where income is very stable and other liquid assets exist." },
  // Investments
  { id: "i1", category: "Investments", q: "What is the relationship between bond prices and interest rates?", a: "They move in opposite directions. When rates rise, existing bonds with lower coupons become less attractive and their prices fall; when rates fall, prices rise. Longer-maturity bonds move more." },
  { id: "i2", category: "Investments", q: "What is duration?", a: "A measure of a bond's sensitivity to interest rate changes. As a rule of thumb, a bond with a duration of 6 years falls about 6% if rates rise by one percentage point. It is also roughly the weighted average time to receive the bond's cash flows." },
  { id: "i3", category: "Investments", q: "Why does diversification work?", a: "Because assets that are not perfectly correlated do not all fall at the same time, so the portfolio's volatility is lower than the average of its parts for about the same expected return. It does not remove market risk, and correlations tend to rise in a crisis." },
  { id: "i4", category: "Investments", q: "Explain the Sharpe ratio.", a: "The excess return over the risk-free rate divided by the portfolio's volatility: return per unit of risk. Higher is better when comparing portfolios, but it treats upside and downside swings alike and depends on the period measured." },
  { id: "i5", category: "Investments", q: "What is beta?", a: "A measure of how much an investment moves with the market. A beta of 1.2 means it has tended to move 20% more than the market; below 1, less. It captures market sensitivity, not all risk." },
  { id: "i6", category: "Investments", q: "What are the pros and cons of active and passive investing?", a: "Passive index funds are low cost and match the market; because costs are certain and few managers beat their benchmarks after fees over long periods, many advisors use them as a core. Active management can add value in less efficient areas or for risk control, but costs more and most do not outperform consistently." },
  { id: "i7", category: "Investments", q: "How do ETFs differ from mutual funds?", a: "ETFs trade all day at market prices and usually have lower costs and better tax efficiency because of how shares are created and redeemed in kind. Mutual funds trade once a day at net asset value and may have minimums. Both can be index or active." },
  { id: "i8", category: "Investments", q: "Why is asset allocation important?", a: "Research on portfolio returns finds that the mix of stocks, bonds and cash explains most of the variation in a portfolio's returns over time, more than picking individual securities or timing. That is why advisors start with the allocation and the client's risk profile." },
  { id: "i9", category: "Investments", q: "How and when would you rebalance a portfolio?", a: "Set a rule up front: on a calendar (annually) or when an asset class drifts beyond a band (often five percentage points). Use new contributions first, then sell what has grown and buy what lagged. In taxable accounts, weigh the tax cost." },
  { id: "i10", category: "Investments", q: "What does a P/E ratio tell you, and what are its limits?", a: "Price divided by earnings per share: how much investors pay for a dollar of earnings. A high ratio can mean high expected growth or an expensive stock. Limits: earnings can be manipulated or cyclical, it ignores debt, and it is not comparable across very different industries." },
  { id: "i11", category: "Investments", q: "How does inflation affect bonds, and what are TIPS?", a: "Inflation erodes the fixed payments of ordinary bonds, so rising inflation usually hurts their prices. Treasury Inflation-Protected Securities adjust their principal with inflation, which protects purchasing power if inflation is higher than expected." },
  { id: "i12", category: "Investments", q: "Dollar-cost averaging or a lump sum?", a: "Historically, investing a lump sum has beaten spreading it out more often than not, because markets rise more often than they fall. Dollar-cost averaging reduces the regret of investing right before a drop, which matters to some clients. The choice depends on the client's temperament." },
  // Taxes and accounts
  { id: "t1", category: "Taxes and accounts", q: "Roth or traditional: how do you choose?", a: "Traditional contributions may lower taxable income now and are taxed on withdrawal; Roth contributions are taxed now and grow and are withdrawn tax-free. A Roth often favors someone in a low bracket now who expects a higher bracket later (a young earner); traditional may favor someone in a high bracket now. Many people use both. Check current limits and income rules." },
  { id: "t2", category: "Taxes and accounts", q: "What is a 401(k) match and what should an employee do about it?", a: "An employer contributes money alongside the employee's contributions, often up to a percentage of pay. It is an immediate return on the employee's money, so contributing at least enough to get the full match is usually the first priority after a basic cushion." },
  { id: "t3", category: "Taxes and accounts", q: "What is tax-loss harvesting and the wash-sale rule?", a: "Selling an investment at a loss in a taxable account to offset capital gains (and a limited amount of ordinary income), while staying invested in something similar. The wash-sale rule disallows the loss if you buy the same or a substantially identical security within 30 days before or after the sale." },
  { id: "t4", category: "Taxes and accounts", q: "What is asset location?", a: "Placing investments in the account type where they are taxed least: for example, holding tax-inefficient assets (taxable bonds, REITs) in tax-deferred or Roth accounts, and tax-efficient assets (broad stock index funds) in taxable accounts. It is separate from asset allocation." },
  { id: "t5", category: "Taxes and accounts", q: "What is the difference between short-term and long-term capital gains?", a: "Gains on assets held one year or less are taxed at ordinary income rates; gains on assets held longer than a year get lower preferential rates. That is one reason to avoid unnecessary short-term trading in taxable accounts." },
  { id: "t6", category: "Taxes and accounts", q: "Why might someone give appreciated stock to charity instead of cash?", a: "Donating long-held appreciated stock directly to a charity or a donor-advised fund can let the donor deduct the fair market value (if they itemize, within limits) and avoid the capital gains tax they would pay by selling first. Rules and limits apply; confirm with a tax professional." },
  { id: "t7", category: "Taxes and accounts", q: "How does FDIC insurance work?", a: "Deposits at an insured bank are covered up to $250,000 per depositor, per insured bank, per ownership category, so more coverage is possible with different ownership categories or banks. It covers deposits, not investments." },
  { id: "t8", category: "Taxes and accounts", q: "What are the basic estate planning documents?", a: "A will, a durable power of attorney for finances, a health care power of attorney, and a living will or advance directive. Beneficiary designations on retirement accounts and life insurance override a will, so they must be kept current. Trusts can avoid probate and add control." },
  // Private banking
  { id: "b1", category: "Private banking", q: "What does a private bank offer beyond investment management?", a: "Typically banking and credit (including lending against portfolios and mortgages), trust and estate services, planning, access to specialist teams (such as tax, philanthropy and business owners), and coordination of the client's other advisors. The relationship is built around the whole balance sheet." },
  { id: "b2", category: "Private banking", q: "What is securities-based lending and what is its main risk?", a: "Borrowing against an investment portfolio as collateral, often at lower rates than unsecured loans and without selling. The main risk is that a market fall lowers the collateral's value and the lender may require more collateral or sell holdings, so the loan must be sized conservatively." },
  { id: "b3", category: "Private banking", q: "What is concentration risk and how can it be managed?", a: "Having too much of net worth in one stock, sector or employer. Options include selling gradually with tax awareness, giving appreciated shares, using pre-arranged sale plans, hedging strategies, or exchange funds, each with trade-offs and rules that a specialist should review." },
  { id: "b4", category: "Private banking", q: "How do you think about serving a client with much more wealth than you have experience with?", a: "Stay curious and honest: the principles (goals, risk, time horizon, taxes, family) are the same, the complexity is higher. Listen more than I talk, say when I do not know, bring in specialists, and make sure the client's priorities, not the product, drive the plan." },
  // Markets
  { id: "m1", category: "Markets", q: "What does the Federal Reserve do and how do rate changes affect markets?", a: "It sets monetary policy: a target for short-term interest rates and tools such as balance sheet policy, with a goal of stable prices and maximum employment. Higher rates tend to lower bond prices and raise borrowing costs, which can pressure stocks and housing; lower rates tend to do the opposite." },
  { id: "m2", category: "Markets", q: "What is an inverted yield curve?", a: "When short-term Treasury yields are higher than long-term yields. It has often preceded recessions, though not perfectly and with long, variable lags, so it is a signal to watch, not a prediction." },
  { id: "m3", category: "Markets", q: "What would you say to a client who wants to sell everything after a big drop?", a: "Acknowledge the fear, then go back to the plan: why the portfolio is built as it is, what their time horizon is, and how past downturns recovered. Show what selling locks in and the cost of missing the rebound, and ask whether their goals or situation have changed. If they have, adjust the plan; if they have not, stay disciplined." },
  { id: "m4", category: "Markets", q: "What is a market view you hold today, and how would you test it?", a: "Pick one view from your market journal, state it in a sentence, give the evidence for it, what would change your mind, and how it would (or would not) change a client's plan. The point is the reasoning and humility, not being right." },
];

export interface BehavioralPrompt {
  id: string;
  prompt: string;
  hint: string;
}

export const BEHAVIORAL_PROMPTS: BehavioralPrompt[] = [
  { id: "b1", prompt: "Walk me through your resume.", hint: "Two minutes. Present, then past, then why this role. Pick two or three threads and connect them." },
  { id: "b2", prompt: "Why wealth management, and why private banking?", hint: "Name what draws you to helping people with their whole financial lives, with a real example from your own experience." },
  { id: "b3", prompt: "Why this firm?", hint: "Be specific: something about its approach, people you spoke with, or its clients. Avoid repeating the website." },
  { id: "b4", prompt: "Tell me about a time you led a group.", hint: "Situation, task, action, result. Say what you personally did, and what you learned." },
  { id: "b5", prompt: "Tell me about a time you failed or made a mistake.", hint: "Own it, say what you changed, and show it did not repeat." },
  { id: "b6", prompt: "Describe a difficult conversation you had to have.", hint: "Show listening and care before solutions. Wealth management is mostly hard conversations." },
  { id: "b7", prompt: "Tell me about a time you worked under a tight deadline or pressure.", hint: "What you prioritized, who you asked for help, and the outcome." },
  { id: "b8", prompt: "Tell me about an investment idea you like.", hint: "Thesis, evidence, risks, and what would make you wrong. Your market journal is the source." },
  { id: "b9", prompt: "How do you handle confidential information?", hint: "Describe how you treated peers' financial information in your own client plans: consent, privacy, and anonymizing." },
  { id: "b10", prompt: "What is your greatest strength, and a weakness you are working on?", hint: "Honest, specific, with evidence of progress on the weakness." },
  { id: "b11", prompt: "Where do you see yourself in five years?", hint: "Growing skills, credentials and client responsibility. Show ambition without sounding like you are leaving." },
];

export interface ReadinessGroup {
  id: string;
  title: string;
  items: { id: string; text: string; note?: string }[];
}

export const READINESS: ReadinessGroup[] = [
  {
    id: "skills",
    title: "Technical skills",
    items: [
      { id: "s1", text: "Can explain time value of money, compounding and present value without notes" },
      { id: "s2", text: "Comfortable in Excel: formulas, lookups, charts, and a simple financial model built from scratch" },
      { id: "s3", text: "Can build and explain a goals-based plan (the Four Rivers tools)", note: "The plans you build here count as practice." },
      { id: "s4", text: "Can explain risk, return, correlation and diversification in plain words" },
      { id: "s5", text: "Knows the basic account types and tax rules (Roth, traditional, 401(k), HSA, 529)" },
      { id: "s6", text: "Reads a company's financial statements at a basic level" },
    ],
  },
  {
    id: "markets",
    title: "Markets and communication",
    items: [
      { id: "m1", text: "Keeps a weekly market journal with a view and an idea" },
      { id: "m2", text: "Can pitch one stock or fund idea in two minutes, with risks" },
      { id: "m3", text: "Reads a business or markets publication most days" },
      { id: "m4", text: "Can explain a market event to a friend with no finance background" },
    ],
  },
  {
    id: "credentials",
    title: "Credentials and learning",
    items: [
      { id: "c1", text: "Looked into the Securities Industry Essentials (SIE) exam", note: "Run by FINRA (finra.org). Check the current eligibility and timing." },
      { id: "c2", text: "Looked into the CFA Program and CFP education pathways", note: "cfainstitute.org and cfp.net. Check what UF coursework counts." },
      { id: "c3", text: "Explored a market data certification such as Bloomberg Market Concepts", note: "Check whether your university provides access." },
      { id: "c4", text: "Found the finance and investment clubs, courses and advisors at UF that help with recruiting", note: "Look at your college's career office and student organizations." },
    ],
  },
  {
    id: "experience",
    title: "Experience",
    items: [
      { id: "e1", text: "Has built and presented at least three client plans for peers (education only)" },
      { id: "e2", text: "Has received feedback from someone more experienced and changed the work" },
      { id: "e3", text: "Has led or organized something with real responsibility" },
      { id: "e4", text: "Has an experience that shows service to clients or customers" },
    ],
  },
  {
    id: "network",
    title: "Network and applications",
    items: [
      { id: "n1", text: "Has spoken with at least three people working in wealth management or private banking" },
      { id: "n2", text: "Has asked an alumnus or professional to review a resume" },
      { id: "n3", text: "Knows each target firm's program names and application windows", note: "Verify on the firm's careers page and note the date you checked." },
      { id: "n4", text: "Resume, cover letter and LinkedIn are current and consistent" },
      { id: "n5", text: "Has done at least two mock interviews" },
    ],
  },
];
