/**
 * The compliance posture of the Wealth Tools: this is a learning workbench used by a student, not an advisory practice. Giving
 * personalized investment advice for pay generally requires registration (for example Series 65 or 66 and state or SEC adviser
 * registration), and the CFP® mark may be used only by people the CFP Board has certified. Passing the FINRA SIE exam is not a
 * license and does not allow anyone to give advice. So the presentation says what the presenter is, avoids the words and titles
 * that imply otherwise, and carries the disclosures a reader needs. This is guidance for a learning exercise, not legal advice.
 */

export const DEFAULT_ROLE = "Student, Daily Bread Wealth Management Track";

export interface PresenterStatus {
  presenter: string;
  /** How the presenter is described: a student, never an adviser or planner. */
  role: string;
  /** The presenter has passed the FINRA SIE exam (it is not a license). */
  sie: boolean;
}

/** One line for the title slide: who is presenting and in what capacity. */
export function presenterLine(p: PresenterStatus): string {
  const role = p.role.trim() || DEFAULT_ROLE;
  return p.presenter.trim() ? `Presented by ${p.presenter.trim()}  ·  ${role}` : role;
}

/** Words and titles that suggest a license, registration or designation the presenter does not hold. */
const TITLE_RE = /\b(financial\s+(advis[eo]r|planner)|wealth\s+(advis[eo]r|manager)|investment\s+(advis[eo]r|adviser|representative)|advis[eo]r|planner|CFP|CFA|CPA|licensed|registered|fiduciary|broker|series\s*(6[3-7]|7|24))\b/i;

/** The words in a role line that need a second look, or null. */
export function roleProblem(role: string): string | null {
  const m = role.match(TITLE_RE);
  return m ? `"${m[0]}" suggests a license, registration or designation. Describe the presenter as a student unless that is exactly true and the presenter is acting within a registered firm's supervision.` : null;
}

/** Phrases that promise results or tell a person what to buy, which an educational presentation should not contain. */
const PROMISE_RE = /\b(guarantee[sd]?|risk[- ]free|can'?t lose|cannot lose|no risk|sure thing|will (earn|return|make|grow to)|always (beat|outperform)|you should (buy|sell|invest in)|i recommend (buying|selling)|we recommend (buying|selling)|best (stock|fund|investment))\b/i;

export interface TextFlag {
  where: string;
  phrase: string;
}

/** Free text in the plan that promises results or names a purchase as advice. */
export function scanForPromises(fields: { where: string; text: string }[]): TextFlag[] {
  const out: TextFlag[] = [];
  for (const f of fields) {
    const m = f.text.match(PROMISE_RE);
    if (m) out.push({ where: f.where, phrase: m[0] });
  }
  return out;
}

/** The disclosure paragraphs for the last slide, in the order a reader should meet them. */
export function disclosureItems(o: { status: PresenterStatus; anonymous: boolean; modelRet: string; modelVol: string }): string[] {
  const { status } = o;
  const items = [
    "Education only. This presentation is an educational exercise. It is not investment, financial, tax, legal or insurance advice, it is not an offer or a solicitation to buy or sell any security or product, and it creates no advisory, fiduciary or client relationship.",
    `About the presenter. ${status.presenter.trim() || "The presenter"} is a student and is not a registered investment adviser, investment adviser representative, broker-dealer representative, insurance producer, tax preparer or CFP® professional, and is not paid for this work.${status.sie ? " The presenter has passed the FINRA Securities Industry Essentials (SIE) exam, which is not a license or registration and does not permit giving investment advice." : ""}`,
    `Illustrative and hypothetical. Allocations, portfolios, policy statements and projections are illustrations of how a professional might think about a situation, not a suitability determination or a recommendation of any security, fund or strategy. Projections use a Monte Carlo model (2,000 simulated paths, ${o.modelRet}% expected return, ${o.modelVol}% volatility); they are hypothetical, are not guarantees, and actual results will differ. Investing involves risk, including loss of principal. Past performance does not guarantee future results.`,
    "Assumptions. Capital market assumptions are entered by the presenter with a stated source and date and are not a forecast. Risk profiles come from a short questionnaire and the client's own figures and start a conversation; they are not a suitability determination.",
    "Taxes and insurance. Tax figures reflect 2026 federal rules, are rounded estimates and change every year; state taxes are not included unless stated. Insurance amounts are rules of thumb, not quotes. Consult a licensed tax professional or insurance agent before acting.",
    "Next steps. Anyone who wants personalized advice should consult a registered investment adviser, a CFP® professional, a CPA, an attorney or a licensed insurance agent.",
    o.anonymous
      ? "Confidentiality. This is an anonymized case study: names and identifying details were changed or removed, and it describes educational work for a peer, not a professional engagement."
      : "Confidentiality. The client's information is confidential and was shared for this plan only, with the client's agreement.",
  ];
  return items;
}
