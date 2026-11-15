/**
 * A walkthrough for pulling what the banking models need out of S&P Capital IQ, which UF licenses for students.
 *
 * The menu names come from university library guides to Capital IQ (Carnegie Mellon, UBC, IESE, UT San Antonio) and the UF
 * Business Library's own pages, read in November 2026. S&P renames things, and Capital IQ Pro is laid out differently from
 * the older site, so each step says what to look for rather than promising an exact click path.
 */

export interface CiqStep {
  id: string;
  title: string;
  /** Which model in these tools the numbers go into. */
  feeds: string;
  /** Menu and tab names to look for. */
  look: string[];
  /** The figures to write down, and where each goes. */
  take: string[];
  /** What trips people up. */
  watch: string;
}

export const CIQ_NOTE =
  "Menu names differ between the older Capital IQ site and Capital IQ Pro, and S&P changes them from time to time. If a name here has moved, search the page for it.";

export const CIQ_STEPS: CiqStep[] = [
  {
    id: "access",
    title: "Get in through the UF Business Library",
    feeds: "Everything below",
    look: [
      "Start from the UF Business Library site (businesslibrary.uflib.ufl.edu), not from a search engine: open the Finance menu and choose Capital IQ, so the library's license is recognized.",
      "You may be asked to create a personal Capital IQ login with your UF email the first time.",
      "The Excel plug-in is offered under My Capital IQ, then My Profile, then Downloads. At some schools it runs only on campus computers; ask the Business Library which applies at UF.",
    ],
    take: ["Nothing yet. Decide the company you are valuing and write down its ticker."],
    watch: "The license is for coursework and learning. Keep downloaded data in your own private models; do not post it, and use invented or public figures when you share a model for peer review.",
  },
  {
    id: "comps",
    title: "Comparable companies",
    feeds: "Comparables",
    look: [
      "Open the company's page and find Peer Analysis, then Quick Comps. Capital IQ proposes a list of peers.",
      "Edit the list down to four to eight companies with a similar business, size and growth. A long list of loose matches says little.",
      "Use the Financial Data and Trading Multiples tabs to read each peer's figures.",
    ],
    take: [
      "Total enterprise value, into EV.",
      "Revenue and EBITDA for the last twelve months, into Revenue and EBITDA.",
      "Net income and market capitalization, into Net income and Equity value (for the P/E).",
      "In Source write \"Capital IQ, Quick Comps\", and set Date pulled to today.",
    ],
    watch: "Check that every peer is in the same currency and the same period (last twelve months, not a mix of fiscal years), and that figures are in millions. Then compare one company against its own annual report to be sure you are reading the screen correctly.",
  },
  {
    id: "precedents",
    title: "Precedent transactions",
    feeds: "Precedents",
    look: [
      "Open Screening and build a screen of transactions (mergers and acquisitions) instead of companies.",
      "Filter by the target's industry, geography and deal size, and keep to closed deals from the last three to five years.",
      "A single company's deals are also listed on its page under M&A/Private Placements, and a deal's own page shows comparable deals.",
    ],
    take: [
      "Target, acquirer and the year announced.",
      "Transaction (implied) enterprise value, into Deal EV.",
      "The target's revenue and EBITDA for the twelve months before the deal.",
      "For a public target, the premium paid over the share price before the announcement, into Premium.",
      "In Source write \"Capital IQ, transaction screen\", and set Date pulled.",
    ],
    watch: "Many private deals disclose no EBITDA; leave it blank rather than guessing, and the model will skip that multiple. Read the announcement for anything unusual (a distressed sale, a minority stake) before you include a deal.",
  },
  {
    id: "wacc",
    title: "Beta and capital structure",
    feeds: "WACC",
    look: [
      "Each peer's beta is shown with its market data on the company page; note the period it is measured over (two or five years).",
      "Under Financials/Valuation, Capital Structure gives total debt; divide it by market capitalization for debt to equity.",
      "The effective tax rate can be read from the Income Statement (tax expense divided by pre-tax income).",
    ],
    take: [
      "Each peer's beta, debt to equity (as a percent) and tax rate, into Comparable betas.",
      "The company's own market value of equity and of debt, into Equity value and Debt.",
      "The risk-free rate and the equity risk premium do not come from Capital IQ: use the 10-year Treasury yield from the U.S. Treasury site and the premium Professor Damodaran publishes, and name both.",
    ],
    watch: "Use the same beta period for every peer. A beta near zero or above two usually means a thinly traded stock or a recent shock: read why before you keep it.",
  },
  {
    id: "dcf",
    title: "Financial statements for the DCF and the three-statement model",
    feeds: "DCF and Three statements",
    look: [
      "Under Financials/Valuation open Key Stats, the Income Statement, the Balance Sheet and the Cash Flow statement.",
      "Estimates shows what analysts expect for the next few years, as a cross-check on your own growth rates.",
    ],
    take: [
      "Last year's revenue, and EBIT as a share of it (the EBIT margin).",
      "Depreciation and amortization, and capital expenditure, each as a share of revenue.",
      "Receivables, inventory, payables, cash and debt for the opening balance sheet.",
      "Net debt (debt less cash) and diluted shares outstanding.",
    ],
    watch: "Your growth rates and margins are your own judgment, not Capital IQ's. Use analyst estimates to test them, and be ready to say why yours differ.",
  },
  {
    id: "habits",
    title: "Before you close the tab",
    feeds: "Deal log and your notes",
    look: ["Write the date beside every number you took.", "Save or screenshot the screen each set of figures came from.", "Check one figure per company against the company's own filing on SEC EDGAR."],
    take: ["A two-line note in your Deal log on anything you noticed while pulling the data: a peer that looks expensive, a deal with an unusually high premium, and why."],
    watch: "\"Capital IQ says so\" is not an answer in an interview. Know what each number is, the period it covers, and how it was calculated.",
  },
];
