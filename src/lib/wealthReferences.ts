/** Guidance for choosing capital market assumptions, and where to find published ones. Pointers only: look up the current figures yourself. */

export const CMA_GUIDELINES: { title: string; text: string }[] = [
  {
    title: "Use one published set, and say which",
    text: "Copy the return, volatility and correlation for each asset class from a single published source (for example a firm's long-term capital market assumptions), and record its name and year. Mixing sources makes the numbers inconsistent with each other.",
  },
  {
    title: "Enter compound (geometric) returns",
    text: "Most published assumptions are compound annual returns. This tool converts them: each class's average return is its compound return plus half its variance, and the portfolio's compound return is its average less half its variance. Do not add the adjustment yourself.",
  },
  {
    title: "Match the time frame",
    text: "Published sets usually look 10 to 15 years ahead and are updated every year. They are poor guides to next year, and a plan for 35 years should be re-run when the source updates.",
  },
  {
    title: "Check that the numbers are reasonable",
    text: "Stocks should earn roughly 2 to 5 percentage points more than cash over the long run, bonds should sit near today's yield, stock volatility is usually 15% to 22% and bond volatility 3% to 8%. Stocks move together strongly (correlations 0.7 to 0.95), while bonds and stocks have been much lower, and have changed sign over time.",
  },
  {
    title: "Stay consistent about inflation",
    text: "If the assumptions are nominal (before inflation), leave the model's \"today's dollars\" box off, or turn it on and set inflation. Do not mix real and nominal figures.",
  },
  {
    title: "Show the uncertainty",
    text: "These are estimates, not forecasts. Run the scenario comparison and the stress tests so the client sees a range, and prefer round, defensible numbers over precise-looking ones.",
  },
  {
    title: "Record the source and date",
    text: "Fill in the source and as-of date. They print under every exhibit, which is how an analyst's work can be checked.",
  },
];

export const CMA_REFERENCES: { name: string; use: string; where: string }[] = [
  { name: "J.P. Morgan Asset Management: Long-Term Capital Market Assumptions", use: "Forward-looking returns, volatility and correlations by asset class, with the method explained. Published each year.", where: "am.jpmorgan.com (search for Long-Term Capital Market Assumptions)" },
  { name: "Vanguard Capital Markets Model and Economic and Market Outlook", use: "Ten-year return ranges by asset class, with the reasoning.", where: "corporate.vanguard.com (research and insights)" },
  { name: "BlackRock Capital Market Assumptions", use: "Another published set, useful for checking yours against.", where: "blackrock.com (search for Capital Market Assumptions)" },
  { name: "Research Affiliates: Asset Allocation Interactive", use: "Return and risk assumptions with an interactive frontier.", where: "researchaffiliates.com" },
  { name: "Aswath Damodaran, NYU Stern: historical returns on stocks, bonds and bills", use: "Long histories of annual returns to sanity-check any assumption against the past.", where: "pages.stern.nyu.edu/~adamodar (Data, historical returns)" },
  { name: "Kenneth French Data Library, Dartmouth", use: "Historical returns for equity portfolios and factors.", where: "mba.tuck.dartmouth.edu (Faculty, Ken French, Data Library)" },
  { name: "FRED, Federal Reserve Bank of St. Louis", use: "Interest rates, inflation, Treasury yields and many economic series.", where: "fred.stlouisfed.org" },
  { name: "Index provider fact sheets (S&P, MSCI, Bloomberg, FTSE Nareit, ICE BofA)", use: "Official historical returns and volatility for the indexes behind each asset class, and for checking the stress-test figures.", where: "each provider's website" },
];

export const STRESS_NOTE =
  "The three historical periods use approximate, rounded index returns for the matching asset classes (a U.S. large cap index, a small cap index, developed and emerging market indexes, a U.S. aggregate bond index, TIPS, a listed real estate index, and Treasury bills). Check them against the index providers before presenting, and edit any figure.";
