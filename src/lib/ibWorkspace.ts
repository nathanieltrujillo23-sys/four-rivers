/** The Investment Banking workspace: one private document per person. */
import { IB_QUESTIONS, IB_READINESS } from "./ibContent";
import { defaultStatements, type StatementInputs } from "./ibStatements";
import { defaultPrecedents, defaultWacc, type BetaPeer, type PaperRun, type PrecedentInputs, type PrecedentRow, type WaccInputs } from "./ibCapital";
import { defaultComps, defaultDcf, defaultLbo, defaultMerger, type CompRow, type CompsInputs, type DcfInputs, type LboInputs, type MergerInputs } from "./ibMath";

export type Rating = "confident" | "getting" | "needs";

export interface Deal {
  id: string;
  /** "2026-10-12" or "". */
  date: string;
  company: string;
  kind: string;
  /** Size in millions of dollars, as typed. */
  size: string;
  /** What the deal was for, and what you took from it, in your words. */
  why: string;
  takeaway: string;
  source: string;
}
export interface Recruit {
  id: string;
  firm: string;
  group: string;
  status: string;
  deadline: string;
  notes: string;
}
export const RECRUIT_STATUSES = ["Researching", "Networking", "Preparing", "Applied", "Interviewing", "Offer", "Declined"] as const;

export interface IbData {
  dcf: DcfInputs;
  comps: CompsInputs;
  lbo: LboInputs;
  merger: MergerInputs;
  statements: StatementInputs;
  wacc: WaccInputs;
  precedents: PrecedentInputs;
  /** Paper LBO drill attempts, newest first. */
  paper: PaperRun[];
  tech: Record<string, Rating>;
  deals: Deal[];
  recruits: Recruit[];
  ready: Record<string, boolean>;
}

export const emptyIb = (): IbData => ({ dcf: defaultDcf(), comps: defaultComps(), lbo: defaultLbo(), merger: defaultMerger(), statements: defaultStatements(), wacc: defaultWacc(), precedents: defaultPrecedents(), paper: [], tech: {}, deals: [], recruits: [], ready: {} });

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);

/** Copies the strings a saved object has onto a default object of the same shape. */
function strings<T extends object>(base: T, saved: unknown): T {
  if (!isObj(saved)) return base;
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(base)) if (typeof v === "string" && typeof saved[k] === "string") out[k] = saved[k];
  return out as T;
}

export function normalizeIb(raw: unknown): IbData {
  const b = emptyIb();
  if (!isObj(raw)) return b;
  const dcf = strings(b.dcf, raw.dcf);
  if (isObj(raw.dcf)) {
    if (Array.isArray(raw.dcf.growth)) dcf.growth = b.dcf.growth.map((g, i) => (typeof (raw.dcf as Record<string, unknown[]>).growth[i] === "string" ? ((raw.dcf as Record<string, string[]>).growth[i] as string) : g));
    if (typeof raw.dcf.midYear === "boolean") dcf.midYear = raw.dcf.midYear;
  }
  const statements = strings(b.statements, raw.statements);
  if (isObj(raw.statements) && Array.isArray(raw.statements.growth)) statements.growth = b.statements.growth.map((g, i) => (typeof (raw.statements as Record<string, unknown[]>).growth[i] === "string" ? ((raw.statements as Record<string, string[]>).growth[i] as string) : g));
  const comps = strings(b.comps, raw.comps);
  if (isObj(raw.comps)) {
    comps.basis = raw.comps.basis === "revenue" || raw.comps.basis === "pe" ? raw.comps.basis : "ebitda";
    comps.rows = Array.isArray(raw.comps.rows)
      ? (raw.comps.rows as unknown[]).filter(isObj).slice(0, 15).map((r, i): CompRow => ({ id: str(r.id, `c${i}`), name: str(r.name), ev: str(r.ev), revenue: str(r.revenue), ebitda: str(r.ebitda), netIncome: str(r.netIncome), equity: str(r.equity) }))
      : [];
  }
  const wacc = strings(b.wacc, raw.wacc);
  if (isObj(raw.wacc)) {
    wacc.fromPeers = raw.wacc.fromPeers === true;
    wacc.peers = Array.isArray(raw.wacc.peers)
      ? (raw.wacc.peers as unknown[]).filter(isObj).slice(0, 15).map((r, i): BetaPeer => ({ id: str(r.id, `b${i}`), name: str(r.name), beta: str(r.beta), debtToEquity: str(r.debtToEquity), tax: str(r.tax, "25") }))
      : [];
  }
  const precedents = strings(b.precedents, raw.precedents);
  if (isObj(raw.precedents)) {
    precedents.basis = raw.precedents.basis === "revenue" ? "revenue" : "ebitda";
    precedents.rows = Array.isArray(raw.precedents.rows)
      ? (raw.precedents.rows as unknown[]).filter(isObj).slice(0, 20).map((r, i): PrecedentRow => ({ id: str(r.id, `p${i}`), target: str(r.target), acquirer: str(r.acquirer), year: str(r.year), ev: str(r.ev), revenue: str(r.revenue), ebitda: str(r.ebitda), premium: str(r.premium) }))
      : [];
  }
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const paper: PaperRun[] = Array.isArray(raw.paper) ? (raw.paper as unknown[]).filter(isObj).slice(0, 30).map((r) => ({ date: str(r.date), seed: num(r.seed), correct: num(r.correct), seconds: num(r.seconds) })) : [];
  const tech: IbData["tech"] = {};
  if (isObj(raw.tech)) for (const [k, v] of Object.entries(raw.tech)) if ((v === "confident" || v === "getting" || v === "needs") && IB_QUESTIONS.some((q) => q.id === k)) tech[k] = v;
  const ready: IbData["ready"] = {};
  const ids = IB_READINESS.flatMap((g) => g.items.map((i) => i.id));
  if (isObj(raw.ready)) for (const [k, v] of Object.entries(raw.ready)) if (typeof v === "boolean" && ids.includes(k)) ready[k] = v;
  return {
    dcf,
    comps,
    lbo: strings(b.lbo, raw.lbo),
    merger: strings(b.merger, raw.merger),
    statements,
    wacc,
    precedents,
    paper,
    tech,
    deals: Array.isArray(raw.deals) ? (raw.deals as unknown[]).filter(isObj).slice(0, 100).map((d, i) => ({ id: str(d.id, `d${i}`), date: str(d.date), company: str(d.company), kind: str(d.kind), size: str(d.size), why: str(d.why), takeaway: str(d.takeaway), source: str(d.source) })) : [],
    recruits: Array.isArray(raw.recruits) ? (raw.recruits as unknown[]).filter(isObj).slice(0, 60).map((r, i) => ({ id: str(r.id, `r${i}`), firm: str(r.firm), group: str(r.group), status: RECRUIT_STATUSES.includes(r.status as never) ? (r.status as string) : "Researching", deadline: str(r.deadline), notes: str(r.notes) })) : [],
    ready,
  };
}

export function ibProgress(d: IbData) {
  const total = IB_QUESTIONS.length;
  const items = IB_READINESS.flatMap((g) => g.items);
  return { confident: Object.values(d.tech).filter((v) => v === "confident").length, rated: Object.keys(d.tech).length, total, deals: d.deals.length, ready: items.filter((i) => d.ready[i.id]).length, readyTotal: items.length, recruits: d.recruits.length };
}
