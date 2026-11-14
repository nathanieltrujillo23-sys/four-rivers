/**
 * The software each track's industry actually runs on, what it is for, and which in-house tool practices the same idea.
 * This is a reference so members can speak to the tools firms use; nothing here is copied from, affiliated with or endorsed
 * by any of these products, and their names belong to their owners.
 */
import type { DailyBreadTool } from "./dailyBread";

export type SoftwareAccess = "uf" | "none" | "varies" | "public";

export interface SoftwareEntry {
  id: string;
  track: DailyBreadTool;
  name: string;
  /** The kind of tool, in a few words. */
  kind: string;
  /** What people at a firm do with it. */
  use: string;
  /** How to practice the same idea here. */
  here: string;
  access: SoftwareAccess;
  /** A line about getting access, when there is something specific to say. */
  accessNote: string;
}

export const ACCESS_LABEL: Record<SoftwareAccess, string> = {
  uf: "Available through UF",
  none: "Not offered at UF",
  varies: "Access varies",
  public: "Anyone can get it",
};

export const SOFTWARE: SoftwareEntry[] = [
  // Investment banking
  { id: "capiq", track: "ib", name: "S&P Capital IQ", kind: "Financial data platform", use: "Company financials, trading comparables, precedent transaction screens, betas and ownership, with an Excel plug-in that pulls figures straight into a model.", here: "Pull enterprise value, revenue and EBITDA into Comparables and Precedents, and peer betas into the WACC builder. Write the date you pulled each number.", access: "uf", accessNote: "UF gives students access. Look for it in the UF Libraries database list and sign in with your UF account." },
  { id: "bloomberg", track: "ib", name: "Bloomberg Terminal", kind: "Market data terminal", use: "Live prices, news, bond and rate data, and company financials, driven by typed functions (for example a company's description, financial analysis and comparables screens).", here: "The same inputs feed the DCF and WACC builder: a risk-free rate, a beta and a cost of debt. Use Capital IQ and public Treasury data for them.", access: "none", accessNote: "Not part of UF's student access. Learn what it does so you can speak to it in an interview." },
  { id: "factset", track: "ib", name: "FactSet", kind: "Financial data platform", use: "Much the same ground as Capital IQ: financials, estimates, screening and an Excel plug-in. Firms usually standardize on one or two of these.", here: "Anything you would screen in FactSet can be entered by hand in Comparables and Precedents.", access: "none", accessNote: "Not part of UF's student access." },
  { id: "pitchbook", track: "ib", name: "PitchBook", kind: "Private-market data", use: "Private company financings, private equity and venture deals, fund data and buyer lists.", here: "Private deals with disclosed terms belong in Precedents; leave the premium blank for a private target.", access: "varies", accessNote: "Some schools license it; check the library's database list." },
  { id: "lseg", track: "ib", name: "LSEG Workspace", kind: "Market data platform", use: "Formerly Refinitiv Eikon: market data, deal league tables, estimates and news.", here: "League tables and deal lists are a source for your Deal log and Precedents.", access: "varies", accessNote: "Check the library's database list." },
  { id: "macabacus", track: "ib", name: "Macabacus", kind: "Excel and PowerPoint add-in", use: "Keyboard shortcuts, formatting standards (blue inputs, black formulas), formula auditing and links between Excel and PowerPoint.", here: "Every Excel export here follows the same colour convention: blue cells are inputs, black cells are formulas.", access: "public", accessNote: "A paid add-in with a free trial; check its site for student pricing." },
  { id: "wsp", track: "ib", name: "Wall Street Prep, BIWS and CFI", kind: "Modeling courses", use: "Step-by-step courses that build a three-statement model, DCF, LBO and merger model in Excel, used by banks to train analysts.", here: "Export a model to Excel and rebuild it yourself next to one of their templates to check your structure.", access: "public", accessNote: "Paid courses; each publishes free sample lessons." },
  // Wealth management
  { id: "emoney", track: "wealth", name: "eMoney Advisor", kind: "Financial planning software", use: "Cash-flow based plans: every account, income and expense modeled year by year, with a client portal and what-if scenarios.", here: "A client plan here does the same job at teaching scale: the snapshot, goals, projections and scenarios.", access: "none", accessNote: "Sold to advisory firms, not students." },
  { id: "mgp", track: "wealth", name: "MoneyGuidePro", kind: "Financial planning software", use: "Goals-based planning: the chance of funding each goal, shown as a probability of success.", here: "Goal funding status and the retirement income tools use the same idea: a modeled chance of reaching each goal.", access: "none", accessNote: "Sold to advisory firms. Some university financial planning programs license it." },
  { id: "addepar", track: "wealth", name: "Addepar", kind: "Portfolio reporting", use: "Pulls every account and holding of a wealthy family into one view, including private investments, and reports performance and exposure.", here: "The balance sheet and asset allocation steps of a client plan are the small version of that single view.", access: "none", accessNote: "Sold to wealth firms and family offices." },
  { id: "orion", track: "wealth", name: "Orion", kind: "Portfolio accounting and trading", use: "Performance reporting, billing, rebalancing and trading across many client accounts for independent advisory firms.", here: "The rebalancing and fees tools show the two calculations it automates.", access: "none", accessNote: "Sold to advisory firms." },
  { id: "mstar", track: "wealth", name: "Morningstar Direct", kind: "Investment research", use: "Fund and manager research, performance attribution and portfolio analytics.", here: "The backtester and asset allocation tools use the same measures: return, volatility, drawdown and correlation.", access: "varies", accessNote: "Many business schools license it; check the library's database list." },
  { id: "nitrogen", track: "wealth", name: "Nitrogen", kind: "Risk tolerance scoring", use: "Formerly Riskalyze: scores a client's risk tolerance and compares it with the risk in their portfolio.", here: "The risk profile step does this by hand: tolerance, capacity and the return the goals need.", access: "none", accessNote: "Sold to advisory firms." },
  // Consulting
  { id: "thinkcell", track: "consulting", name: "think-cell", kind: "PowerPoint charting add-in", use: "Waterfall, Marimekko and Gantt charts built in PowerPoint in seconds; the standard at the large strategy firms.", here: "The storyline builder exports slides with action titles; redraw its charts in think-cell if your school offers it.", access: "varies", accessNote: "It has offered free academic licenses to students; check its site and apply with a school email." },
  { id: "tableau", track: "consulting", name: "Tableau", kind: "Data visualization", use: "Interactive dashboards from client data, for finding and showing the pattern behind a recommendation.", here: "The exhibit drills practice the reading side: what a chart says, in one sentence.", access: "public", accessNote: "It has offered students a free one-year license through its academic program; check its site." },
  { id: "powerbi", track: "consulting", name: "Microsoft Power BI", kind: "Data visualization", use: "Dashboards and data models inside the Microsoft world; common at corporate clients.", here: "Same skill as above: one takeaway per chart.", access: "public", accessNote: "The desktop app is free on Windows." },
  { id: "alteryx", track: "consulting", name: "Alteryx", kind: "Data preparation", use: "Drag-and-drop workflows that clean, join and reshape large data sets without code.", here: "Market sizing and profit trees are the thinking that decides which data to prepare.", access: "public", accessNote: "It has offered free student licenses through its academic program; check its site." },
  { id: "caseprep", track: "consulting", name: "Case in Point, CaseCoach and PrepLounge", kind: "Case interview preparation", use: "A standard casebook and two practice platforms: frameworks, drills, and live partners.", here: "The frameworks, mock case, issue tree and practice partner board cover the same ground with people you know.", access: "public", accessNote: "A book and two sites with free and paid tiers." },
];

export const softwareFor = (track: DailyBreadTool) => SOFTWARE.filter((s) => s.track === track);
