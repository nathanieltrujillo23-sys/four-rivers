/** Technical questions and the recruiting checklist for Investment Banking Tools. Plain, standard textbook answers for practice. */

export interface TechQ {
  id: string;
  category: string;
  q: string;
  a: string;
}

export const IB_CATEGORIES = ["Accounting", "Valuation", "DCF and WACC", "M&A", "LBO", "Markets and deals"] as const;

export const IB_QUESTIONS: TechQ[] = [
  { id: "ac1", category: "Accounting", q: "Walk me through the three financial statements and how they connect.", a: "The income statement shows revenue, expenses and net income over a period. Net income flows to retained earnings on the balance sheet, which lists assets, liabilities and equity at a point in time. The cash flow statement starts from net income, adds back non-cash items (such as depreciation), adjusts for changes in working capital, then adds investing and financing cash flows; its ending cash is the balance sheet's cash." },
  { id: "ac2", category: "Accounting", q: "If depreciation increases by $10, how do the three statements change (25% tax rate)?", a: "Income statement: pre-tax income falls $10, taxes fall $2.50, net income falls $7.50. Cash flow: net income is down $7.50, depreciation is added back +$10, so cash rises $2.50. Balance sheet: cash is up $2.50, PP&E is down $10, so assets fall $7.50; retained earnings fall $7.50, so the sheet balances." },
  { id: "ac3", category: "Accounting", q: "What is goodwill, and when is it created?", a: "Goodwill is the premium paid in an acquisition over the fair value of the target's identifiable net assets. It is recorded on the acquirer's balance sheet, is not amortized under US GAAP, and is tested for impairment each year." },
  { id: "ac4", category: "Accounting", q: "How does a $100 increase in accounts receivable affect cash flow?", a: "Revenue was recorded but cash has not arrived, so cash flow from operations falls by $100: an increase in an asset other than cash is a use of cash." },
  { id: "ac5", category: "Accounting", q: "What is the difference between cash flow and EBITDA?", a: "EBITDA is operating profit before depreciation and amortization, a proxy for operating cash earnings. Cash flow also reflects interest, taxes, capex, changes in working capital and financing, so it can differ widely from EBITDA." },
  { id: "ac6", category: "Accounting", q: "What are the main working capital items?", a: "Current operating assets (accounts receivable, inventory, prepaid expenses) minus current operating liabilities (accounts payable, accrued expenses, deferred revenue). Cash and debt are usually excluded." },
  { id: "va1", category: "Valuation", q: "What is the difference between enterprise value and equity value?", a: "Equity value is the value of the shareholders' stake (market cap). Enterprise value is the value of the whole business to all capital providers: equity value + debt + preferred stock + non-controlling interest − cash. EV is independent of capital structure." },
  { id: "va2", category: "Valuation", q: "Why do we subtract cash when going from equity value to enterprise value?", a: "Cash is an asset an acquirer would take, effectively reducing the price paid for the operating business. EV measures what the operations alone are worth, so non-operating cash is removed." },
  { id: "va3", category: "Valuation", q: "What are the main valuation methods?", a: "Discounted cash flow (intrinsic), trading comparables (relative to similar public companies), precedent transactions (what acquirers have paid), and for LBO analysis, what a financial buyer could pay to earn a target return." },
  { id: "va4", category: "Valuation", q: "Which multiple would you use for a company with negative earnings?", a: "EV/Revenue (or a sector metric such as EV/subscribers) because earnings multiples are not meaningful when EBITDA or net income is negative." },
  { id: "va5", category: "Valuation", q: "Why would one company trade at a higher multiple than a peer?", a: "Faster growth, higher margins and returns on capital, lower risk or cyclicality, a stronger competitive position, or market sentiment. Multiples capture expected growth and risk." },
  { id: "va6", category: "Valuation", q: "Why use the EV/EBITDA multiple instead of P/E?", a: "EV/EBITDA is unaffected by capital structure, tax differences and non-cash items, so it compares companies with different leverage more fairly. P/E mixes in financing and accounting choices." },
  { id: "va7", category: "Valuation", q: "Would a precedent transaction multiple usually be higher or lower than a trading multiple, and why?", a: "Usually higher, because an acquirer pays a control premium and may value synergies, whereas trading multiples reflect minority stakes." },
  { id: "dc1", category: "DCF and WACC", q: "Walk me through a DCF.", a: "Project unlevered free cash flow for 5 to 10 years, estimate a terminal value (perpetuity growth or exit multiple), discount all of it at the WACC to present value to get enterprise value, subtract net debt for equity value, and divide by shares for a per-share value." },
  { id: "dc2", category: "DCF and WACC", q: "How do you calculate unlevered free cash flow?", a: "EBIT × (1 − tax rate) + depreciation and amortization − capital expenditures − increase in net working capital." },
  { id: "dc3", category: "DCF and WACC", q: "How do you calculate WACC?", a: "WACC = (E ÷ (D+E)) × cost of equity + (D ÷ (D+E)) × cost of debt × (1 − tax rate). Cost of equity comes from CAPM: risk-free rate + beta × equity risk premium." },
  { id: "dc4", category: "DCF and WACC", q: "How does a higher beta affect the DCF value?", a: "A higher beta raises the cost of equity, so WACC rises, discount factors fall, and the DCF value falls." },
  { id: "dc5", category: "DCF and WACC", q: "Why is the cost of debt tax-affected in WACC?", a: "Interest is tax-deductible, so the after-tax cost to the company is lower: cost of debt × (1 − tax rate)." },
  { id: "dc6", category: "DCF and WACC", q: "What are the weaknesses of a DCF?", a: "The answer is very sensitive to assumptions, especially the discount rate and terminal value, which is often most of the value. Forecasts far into the future are uncertain." },
  { id: "dc7", category: "DCF and WACC", q: "What is the mid-year convention?", a: "Cash flows arrive through the year, not on December 31, so they are discounted from the middle of each year. It raises the value slightly compared with end-of-year discounting." },
  { id: "ma1", category: "M&A", q: "Why do companies acquire other companies?", a: "Revenue or cost synergies, entering new markets or products, buying growth or technology, removing a competitor, or acquiring assets at a price below their worth." },
  { id: "ma2", category: "M&A", q: "How do you determine whether a deal is accretive or dilutive?", a: "Compare pro forma EPS (combined net income, plus after-tax synergies, less after-tax financing costs, divided by the new total shares) with the acquirer's standalone EPS. Higher is accretive; lower is dilutive." },
  { id: "ma3", category: "M&A", q: "Is an all-stock deal accretive if the acquirer's P/E is higher than the target's P/E at the offer price?", a: "Yes, ignoring synergies: the acquirer is issuing richly valued stock to buy earnings at a lower multiple." },
  { id: "ma4", category: "M&A", q: "What are synergies, and what are the two kinds?", a: "Savings or extra profit from combining. Cost synergies (cutting duplicate overhead, sourcing) are more reliable; revenue synergies (cross-selling, new markets) are harder to achieve." },
  { id: "ma5", category: "M&A", q: "Why might an acquirer prefer to pay in cash rather than stock?", a: "Cash costs only after-tax interest or lost interest income, avoids diluting ownership, and signals confidence. It requires cash or debt capacity, and adds leverage." },
  { id: "ma6", category: "M&A", q: "What is a control premium?", a: "The extra over the market price an acquirer pays to gain control, typically 20% to 40%, reflecting the value of control and expected synergies." },
  { id: "lb1", category: "LBO", q: "Walk me through a basic LBO.", a: "A sponsor buys a company using mostly debt and some equity. The company's cash flow pays interest and repays debt during the holding period. At exit (usually 3 to 7 years) the sponsor sells at an exit multiple, repays the remaining debt, and the equity proceeds against the equity invested give the IRR and multiple of money." },
  { id: "lb2", category: "LBO", q: "What makes a good LBO candidate?", a: "Stable, predictable cash flows, low capital needs, a strong market position, room to cut costs or grow, an asset base that supports borrowing, and a sensible entry price with a clear exit." },
  { id: "lb3", category: "LBO", q: "What are the main drivers of LBO returns?", a: "EBITDA growth, multiple expansion (or contraction), and debt paydown (deleveraging). Leverage amplifies the return on the equity but also the risk." },
  { id: "lb4", category: "LBO", q: "How does raising leverage affect IRR?", a: "Less equity is needed for the same purchase, so returns usually rise if the business does well, but interest costs and risk rise too; too much debt can make returns worse if cash flow disappoints." },
  { id: "lb5", category: "LBO", q: "Rule of thumb: about what IRR do sponsors target?", a: "Often 20% to 25% or more, which is about a 2.5x multiple of money in five years." },
  { id: "mk1", category: "Markets and deals", q: "Pitch me a stock or a deal you have followed.", a: "Structure it: the company, the thesis in one sentence, two or three supporting points (market, advantage, financials), valuation versus peers, key risks, and what would change your view. Use a real example you can defend." },
  { id: "mk2", category: "Markets and deals", q: "What is going on in the markets right now?", a: "Have a view with numbers: the direction of rates, the S&P 500, a notable deal or sector trend, and why it matters. Read a daily news source and be ready to cite one specific figure." },
  { id: "mk3", category: "Markets and deals", q: "What happens to bond prices when interest rates rise?", a: "They fall, because existing bonds pay lower coupons than new ones; the longer the maturity, the larger the fall." },
  { id: "mk4", category: "Markets and deals", q: "What is the difference between an IPO and a follow-on offering?", a: "An IPO is a company's first sale of shares to the public; a follow-on is a later sale of additional shares by an already-public company." },
  { id: "mk5", category: "Markets and deals", q: "What does an investment banking analyst do day to day?", a: "Build financial models and valuation, prepare pitch books and presentations, research companies and industries, support clients' transactions with due diligence and documents, and take direction from associates and vice presidents on tight deadlines." },
];

export const IB_READINESS: { group: string; items: { id: string; text: string }[] }[] = [
  {
    group: "Skills",
    items: [
      { id: "excel", text: "I can build a three-statement model and a DCF in Excel from a blank sheet" },
      { id: "shortcuts", text: "I use Excel with the keyboard and know the common shortcuts" },
      { id: "valuation", text: "I can explain EV versus equity value, WACC, and the main valuation methods without notes" },
      { id: "lbo", text: "I can walk through a basic LBO and an accretion and dilution analysis" },
      { id: "pitch", text: "I can pitch a stock or a deal clearly in two minutes" },
    ],
  },
  {
    group: "Markets",
    items: [
      { id: "news", text: "I read a daily markets and deals source" },
      { id: "deals", text: "I follow at least three recent deals and can discuss them" },
      { id: "numbers", text: "I know where major indices, rates and the yield curve stand" },
    ],
  },
  {
    group: "Credentials and experience",
    items: [
      { id: "sie", text: "I know whether my target firms expect the SIE exam, and when to take it" },
      { id: "bmc", text: "I have looked at a market-training course (such as Bloomberg Market Concepts or a modelling course)" },
      { id: "club", text: "I am active in a finance or investing club" },
      { id: "intern", text: "I have relevant experience or a project I can discuss (a valuation, a pitch, a case competition)" },
    ],
  },
  {
    group: "Network and process",
    items: [
      { id: "resume", text: "My resume has been reviewed by someone who works in finance" },
      { id: "calls", text: "I have spoken with at least five people in banking this year" },
      { id: "dates", text: "I have recorded each firm's application dates from its own careers page, with the date I checked" },
      { id: "behavioral", text: "I can answer why banking, why this firm, and walk through my resume" },
    ],
  },
];
