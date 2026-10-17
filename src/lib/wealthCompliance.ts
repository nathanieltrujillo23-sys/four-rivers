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

/** Free text in the plan that promises results or names a purchase as advice. A promise that is being denied ("not guaranteed") is fine. */
export function scanForPromises(fields: { where: string; text: string }[]): TextFlag[] {
  const out: TextFlag[] = [];
  const re = new RegExp(PROMISE_RE.source, "gi");
  for (const f of fields) {
    for (const m of f.text.matchAll(re)) {
      const before = f.text.slice(Math.max(0, (m.index ?? 0) - 14), m.index ?? 0);
      if (/\b(not|no|never|without|n't|isn't|aren't)\s+$/i.test(before) || /n't\s+$/i.test(before)) continue;
      out.push({ where: f.where, phrase: m[0] });
      break;
    }
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

/* ------------------------------------------------------------------ */
/* The compliance checklist                                            */
/* ------------------------------------------------------------------ */

export interface ChecklistItem {
  id: string;
  text: string;
  why: string;
}

/** What a student presenter confirms before a plan is shown to someone. Each one is the presenter's own confirmation. */
export const CHECKLIST: ChecklistItem[] = [
  { id: "educational", text: "I told the client this is an educational exercise by a student, not advice.", why: "No advisory relationship is created, and the client knows it." },
  { id: "title", text: "I described myself as a student and used no title or designation I do not hold (advisor, planner, CFP, CFA, licensed, registered).", why: "Titles and marks such as CFP® are protected, and calling yourself an adviser can itself be a violation." },
  { id: "unpaid", text: "I am not being paid, and did not ask for payment, for this work.", why: "Giving investment advice for compensation generally requires registration." },
  { id: "nosecurity", text: "I did not recommend any specific security, fund, annuity or insurance product. Examples are labelled illustrative.", why: "A recommendation of a specific product is the core of regulated advice." },
  { id: "nopromises", text: "I made no promises or guarantees of results; projections are labelled hypothetical.", why: "Hypothetical performance must be explained and never promised." },
  { id: "consent", text: "The client agreed to share their information for this plan and knows how it is stored and who can see it.", why: "Peers' finances are sensitive, and consent is the minimum." },
  { id: "minimal", text: "I collected no Social Security numbers, account numbers, passwords or login details.", why: "A plan does not need them, and holding them creates risk." },
  { id: "professionals", text: "I told the client to confirm anything they act on with a licensed professional (adviser, CPA, attorney, insurance agent).", why: "The client's decisions belong with people who are licensed to advise." },
  { id: "estimates", text: "Tax and insurance figures are labelled as estimates, with the year and sources stated.", why: "Rules change every year and depend on details this tool leaves out." },
  { id: "sources", text: "Assumptions have a source and a date (capital market assumptions, market indicators).", why: "A number without a source cannot be checked." },
  { id: "nofunds", text: "I do not hold, move or manage the client's money or accounts, and have no discretion over anything.", why: "Handling client assets is a regulated activity." },
  { id: "conflicts", text: "I told the client about any relationship or interest that could color the discussion (friend, family, referral, a product I like).", why: "Disclosing conflicts is basic professional practice." },
  { id: "policy", text: "My track leader or university knows I am doing this, and I followed their rules.", why: "A program's own policies may be stricter than the law." },
];

export interface ComplianceData {
  /** Checklist item id to the date it was confirmed ("2026-10-17"). */
  done: Record<string, string>;
  notes: Record<string, string>;
  custom: { id: string; text: string; done: boolean }[];
}
export const emptyCompliance = (): ComplianceData => ({ done: {}, notes: {}, custom: [] });

export function normalizeCompliance(raw: unknown): ComplianceData {
  const b = emptyCompliance();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return b;
  const r = raw as Record<string, unknown>;
  const strMap = (v: unknown, pick: (x: unknown) => x is string) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([k, x]) => CHECKLIST.some((c) => c.id === k) && pick(x))) as Record<string, string> : {});
  const isStr = (x: unknown): x is string => typeof x === "string";
  const custom = Array.isArray(r.custom)
    ? (r.custom as unknown[]).filter((c): c is Record<string, unknown> => !!c && typeof c === "object").slice(0, 10).map((c, i) => ({ id: typeof c.id === "string" ? c.id : `c${i}`, text: typeof c.text === "string" ? c.text : "", done: c.done === true }))
    : [];
  return { done: strMap(r.done, isStr), notes: strMap(r.notes, isStr), custom };
}

/** How many of the checklist (and the presenter's own items) are confirmed. */
export function checklistProgress(c: ComplianceData) {
  const std = CHECKLIST.filter((i) => c.done[i.id]).length;
  const own = c.custom.filter((x) => x.text.trim());
  const ownDone = own.filter((x) => x.done).length;
  return { done: std + ownDone, total: CHECKLIST.length + own.length };
}
