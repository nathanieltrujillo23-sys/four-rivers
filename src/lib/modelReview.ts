/**
 * Peer review of models in Investment Banking and Consulting Tools: which models can be shared, a short summary of a shared
 * model worked out from its saved inputs (with the same functions the tools use), and the four-line rubric.
 */
import type { ModelReview, ModelShare, ReviewTrack } from "../types";
import { backtest, estate, normalizeModels, withdrawStudy } from "./wealthModels";
import { precedents, wacc } from "./ibCapital";
import { comps, dcf, lbo, merger } from "./ibMath";
import { statements } from "./ibStatements";
import { normalizeIb } from "./ibWorkspace";
import { plain, profit, sizing } from "./consultingMath";
import { checkStory, checkTree, normalizeStorylines, normalizeTrees, outline } from "./consultingStory";
import { normalizeConsulting } from "./consultingWorkspace";

export const MODEL_RUBRIC: { id: string; label: string; hint: string; levels: [string, string, string, string] }[] = [
  { id: "structure", label: "Structure", hint: "Is it laid out so someone else can follow it, in a sensible order, with nothing missing?", levels: ["Hard to follow", "Followable with effort", "Clear and complete", "Clear, complete, and easy to check"] },
  { id: "assumptions", label: "Assumptions", hint: "Are the inputs reasonable, consistent with each other, and could the author defend each one?", levels: ["Several look arbitrary", "Mostly plausible, some unexplained", "Reasonable and consistent", "Reasonable, sourced, and the sensitive ones are flagged"] },
  { id: "accuracy", label: "Accuracy", hint: "Do the numbers tie? Does the conclusion follow from them?", levels: ["Errors change the answer", "Small slips", "Ties out", "Ties out and cross-checks agree"] },
  { id: "communication", label: "Communication", hint: "Could the author explain the result in two sentences, and is the takeaway stated?", levels: ["No clear takeaway", "A takeaway, loosely stated", "A clear takeaway", "A clear takeaway with what would change it"] },
];
export const MODEL_KEYS = MODEL_RUBRIC.map((r) => r.id);

export const MODEL_KINDS: Record<ReviewTrack, { id: string; label: string }[]> = {
  ib: [
    { id: "dcf", label: "DCF" },
    { id: "wacc", label: "WACC" },
    { id: "comps", label: "Trading comparables" },
    { id: "precedents", label: "Precedent transactions" },
    { id: "lbo", label: "LBO" },
    { id: "merger", label: "Accretion and dilution" },
    { id: "statements", label: "Three-statement model" },
  ],
  consulting: [
    { id: "storyline", label: "Storyline (recommendation)" },
    { id: "tree", label: "Issue tree" },
    { id: "sizing", label: "Market sizing" },
    { id: "profit", label: "Profit and break-even" },
  ],
  wealth: [
    { id: "backtest", label: "Portfolio backtest" },
    { id: "withdraw", label: "Withdrawal strategies" },
    { id: "estate", label: "Estate snapshot" },
  ],
};
export const kindLabel = (track: ReviewTrack, kind: string) => MODEL_KINDS[track].find((k) => k.id === kind)?.label ?? kind;

const f1 = (x: number) => (Math.round(x * 10) / 10).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const mil = (x: number) => "$" + f1(x) + "M";
const p1 = (x: number) => f1(x * 100) + "%";
const usd = (x: number) => "$" + Math.round(x).toLocaleString("en-US");
const times = (x: number) => f1(x) + "x";

export interface ShareSummary {
  /** Headline figures, worked out from the shared inputs. */
  facts: [string, string][];
  /** Longer text to read (an outline, the slide titles), if any. */
  lines: string[];
  /** Set when the saved inputs do not make a result. */
  problem: string;
}

/** What a reviewer sees first: the model's headline numbers, recalculated here from the inputs the author shared. */
export function summarize(share: Pick<ModelShare, "track" | "kind" | "data">): ShareSummary {
  const out: ShareSummary = { facts: [], lines: [], problem: "" };
  if (share.track === "ib") {
    const d = normalizeIb(share.data);
    if (share.kind === "dcf") {
      const r = dcf(d.dcf);
      if (!r.valid) return { ...out, problem: r.problem };
      out.facts = [
        ["Enterprise value, perpetuity", mil(r.evPerpetuity)],
        ["Enterprise value, exit multiple", mil(r.evExit)],
        ["Value per share", "$" + f1(r.perSharePerpetuity)],
        ["WACC and terminal growth", d.dcf.wacc + "% and " + d.dcf.terminalGrowth + "%"],
        ["Terminal value share of EV", p1(r.terminalShare)],
        ["Implied exit multiple", times(r.impliedMultiple)],
      ];
    } else if (share.kind === "wacc") {
      const r = wacc(d.wacc);
      if (!r.valid) return { ...out, problem: r.problem };
      out.facts = [
        ["WACC", p1(r.wacc)],
        ["Cost of equity", p1(r.costOfEquity)],
        ["After-tax cost of debt", p1(r.afterTaxDebt)],
        ["Beta used", (Math.round(r.beta * 100) / 100).toFixed(2)],
        ["Equity and debt weights", p1(r.weightEquity) + " and " + p1(r.weightDebt)],
        ["Peers behind the beta", String(d.wacc.fromPeers ? d.wacc.peers.length : 0)],
      ];
    } else if (share.kind === "comps") {
      const r = comps(d.comps);
      out.facts = [
        ["Companies", String(d.comps.rows.length)],
        ["Median EV/EBITDA", r.evEbitda ? times(r.evEbitda.median) : "n/a"],
        ["Median EV/Revenue", r.evRevenue ? times(r.evRevenue.median) : "n/a"],
        ["Implied enterprise value", r.range ? mil(r.range.ev[0]) + " to " + mil(r.range.ev[2]) : "n/a"],
      ];
      out.lines = d.comps.rows.map((c) => c.name).filter(Boolean);
    } else if (share.kind === "precedents") {
      const r = precedents(d.precedents);
      out.facts = [
        ["Deals", String(d.precedents.rows.length)],
        ["Median EV/EBITDA", r.evEbitda ? times(r.evEbitda.median) : "n/a"],
        ["Median premium", r.premium ? p1(r.premium.median) : "n/a"],
        ["Implied enterprise value", r.range ? mil(r.range.ev[0]) + " to " + mil(r.range.ev[2]) : "n/a"],
      ];
      out.lines = d.precedents.rows.map((c) => [c.target, c.acquirer ? "bought by " + c.acquirer : "", c.year].filter(Boolean).join(", ")).filter(Boolean);
    } else if (share.kind === "lbo") {
      const r = lbo(d.lbo);
      if (!r.valid) return { ...out, problem: r.problem };
      out.facts = [
        ["IRR", p1(r.irr)],
        ["Multiple of money", times(r.moic)],
        ["Purchase price", mil(r.price)],
        ["Debt and equity", mil(r.debt) + " and " + mil(r.equity)],
        ["Entry and exit multiple", d.lbo.entryMultiple + "x and " + d.lbo.exitMultiple + "x"],
        ["Debt left at exit", mil(r.exitDebt)],
      ];
    } else if (share.kind === "merger") {
      const r = merger(d.merger);
      if (!r.valid) return { ...out, problem: r.problem };
      out.facts = [
        ["Accretion (dilution)", p1(r.accretion)],
        ["Pro forma EPS", "$" + (Math.round(r.proFormaEps * 100) / 100).toFixed(2)],
        ["Purchase price", mil(r.purchasePrice)],
        ["Paid in stock", d.merger.stockPct + "%"],
        ["Break-even synergies", mil(r.breakEvenSynergies)],
      ];
    } else {
      const r = statements(d.statements);
      const y = r.years[4];
      out.facts = [
        ["Balances in every year", r.balances ? "Yes" : "No"],
        ["Revenue, year 5", mil(y.revenue)],
        ["Net income, year 5", mil(y.netIncome)],
        ["Cash, year 5", mil(y.cash)],
        ["Debt, year 5", mil(y.debt)],
        ["Years short of cash", r.shortfallYears.length ? r.shortfallYears.join(", ") : "None"],
      ];
    }
    return out;
  }
  if (share.track === "wealth") {
    const w = normalizeModels(share.data);
    if (share.kind === "backtest") {
      const r = backtest(w.backtest);
      if (!r.valid) return { ...out, problem: r.problem };
      const mix = Object.entries(w.backtest.weights).filter(([, v]) => Number(v) > 0).map(([k, v]) => v + "% " + k).join(", ");
      out.facts = [
        ["Period", w.backtest.start + " to " + w.backtest.end + (w.backtest.real ? ", after inflation" : "")],
        ["Compound return", p1(r.cagr)],
        ["Volatility", p1(r.vol)],
        ["Deepest fall between year-ends", p1(r.maxDrawdown)],
        ["Ending value", usd(r.ending)],
        ["All stocks over the same years", p1(r.stocksCagr)],
      ];
      out.lines = ["Mix: " + mix, w.backtest.rebalance ? "Rebalanced every year" : "Never rebalanced"];
    } else if (share.kind === "withdraw") {
      const r = withdrawStudy(w.withdraw);
      if (!r.valid) return { ...out, problem: r.problem };
      out.facts = [
        ["First year's spending", usd(Number(w.withdraw.spend)) + " (" + p1(r.rate) + " of the balance)"],
        ["Years, and share in stocks", w.withdraw.years + " years, " + w.withdraw.stockPct + "%"],
        ["Constant dollar lasted", p1(r.strategies[0].success)],
        ["Guardrails lasted", p1(r.strategies[2].success)],
        ["Fixed percent, lowest income", usd(r.strategies[1].worstLowIncome)],
        ["Starting years tested", String(r.strategies[0].windows)],
      ];
    } else {
      const r = estate(w.estate);
      out.facts = [
        ["Net estate", usd(r.net)],
        ["Passing through probate", p1(r.probateShare)],
        ["Federal estate tax shown", usd(r.tax)],
        ["Documents not yet in place", String(r.missing.length)],
        ["Household", w.estate.married ? "Married" : "Single"],
      ];
      out.lines = r.routes.filter((x) => x.amount > 0).map((x) => x.label + ": " + usd(x.amount));
    }
    return out;
  }
  if (share.kind === "storyline") {
    const s = normalizeStorylines([share.data.storyline])[0];
    if (!s) return { ...out, problem: "The storyline could not be read." };
    const c = checkStory(s);
    out.facts = [
      ["Client", s.client || "not named"],
      ["Question", s.question || "not stated"],
      ["Reasons given", String(s.arguments.filter((a) => a.claim.trim()).length)],
    ];
    out.lines = [...c.titles.map((t, i) => "Slide " + (i + 1) + ": " + (t || "(no title)")), ...s.arguments.filter((a) => a.claim.trim()).map((a, i) => "Reason " + (i + 1) + ": " + a.claim.trim())];
  } else if (share.kind === "tree") {
    const t = normalizeTrees([share.data.tree])[0];
    if (!t) return { ...out, problem: "The issue tree could not be read." };
    const c = checkTree(t);
    out.facts = [
      ["Top branches", String(c.branches)],
      ["Levels", String(c.depth)],
      ["End points", String(c.leaves)],
      ["Marked to test first", String(c.hypotheses)],
    ];
    out.lines = outline(t).split("\n");
  } else if (share.kind === "sizing") {
    const e = normalizeConsulting({ sizing: [share.data.sizing] }).sizing[0];
    if (!e) return { ...out, problem: "The estimate could not be read." };
    const r = sizing(e);
    out.facts = [
      ["Estimate", plain(r.total) + " " + e.unit],
      ["Against the known figure", r.vsCheck == null ? "no check given" : r.vsCheck.toFixed(2) + "x"],
    ];
    out.lines = e.factors.filter((f) => f.value.trim()).map((f) => (f.op === "x" ? "times " : "divided by ") + (f.label || "factor") + ": " + Number(f.value).toLocaleString("en-US"));
  } else {
    const d = normalizeConsulting({ profit: share.data.profit }).profit;
    const r = profit(d);
    out.facts = [
      ["Profit", usd(r.profit)],
      ["Margin", p1(r.margin)],
      ["Break-even units", r.breakEvenUnits == null ? "none" : Math.ceil(r.breakEvenUnits).toLocaleString("en-US")],
      ["Margin of safety", r.marginOfSafety == null ? "n/a" : p1(r.marginOfSafety)],
      ["Price and variable cost", "$" + d.price + " and $" + d.variableCost],
    ];
  }
  return out;
}

/** Average of each rubric line and overall across reviews, to one decimal; null when there are none. */
export function modelAverages(reviews: Pick<ModelReview, "scores">[]): { byLine: Record<string, number>; overall: number } | null {
  if (!reviews.length) return null;
  const byLine: Record<string, number> = {};
  for (const k of MODEL_KEYS) {
    const v = reviews.map((r) => Number(r.scores[k])).filter((x) => Number.isFinite(x) && x >= 1 && x <= 4);
    byLine[k] = v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : 0;
  }
  const lines = Object.values(byLine).filter((x) => x > 0);
  return { byLine, overall: lines.length ? Math.round((lines.reduce((a, b) => a + b, 0) / lines.length) * 10) / 10 : 0 };
}
export const reviewReady = (scores: Record<string, number>) => MODEL_KEYS.every((k) => scores[k] >= 1 && scores[k] <= 4);
