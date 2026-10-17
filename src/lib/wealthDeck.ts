/**
 * The Wealth Tools presentation: a client's plan, and the toolkit tools chosen for them, as a PowerPoint deck in a
 * professional finance format (native, editable charts and tables, a consistent frame, and speaker notes that explain
 * each slide to a student presenting it).
 *
 * `deckOutline` lists the slides cheaply (for the screen); `buildDeck` draws them.
 */
import type PptxGenJS from "pptxgenjs";
import { CATALOG, isToolId, type ToolId } from "../components/community/workshop/toolCatalog";
import { summarizeTool, type ToolSnapshot } from "../components/community/workshop/toolSummaries";
import { MISSION_VERSE, TOPICS, topicLabel } from "../components/community/workshop/workshopContent";
import type { CopyFn } from "./copy";
import { INCOME_COLS, INCOME_ROWS, TOPIC_WHY, VEHICLES } from "./wealthContent";
import { toolDeckChart, toolResults, type DeckChart } from "./wealthDeckTools";
import { allocationRange, buildIps } from "./wealthIps";
import { assessRisk } from "./wealthRisk";
import {
  DAYS,
  GOAL_CATEGORIES,
  PHASES,
  PRIORITIES,
  RISK_PROFILES,
  SCHED_CATS,
  SWOT_KEYS,
  SWOT_TITLES,
  fmtDate,
  fmtK,
  fmtPct,
  fmtUsd,
  goalOutlooks,
  num,
  planFacts,
  scenarioGrid,
  snapshotMetrics,
  solveMonthlyFor,
  vehicleGrowth,
  type WealthPlan,
} from "./wealthMath";

/* ------------------------------------------------------------------ */
/* What can be in the deck                                             */
/* ------------------------------------------------------------------ */

/** The parts of the deck a presenter can leave out. Tool slides are chosen separately. */
export const DECK_SECTIONS: { id: string; label: string; text: string }[] = [
  { id: "summary", label: "Executive summary", text: "The headline numbers and what they mean, on one slide." },
  { id: "recommendation", label: "Recommendation", text: "What we recommend, up front: the few actions that matter most." },
  { id: "profile", label: "Client profile", text: "Who the client is, what they value, and their risk profile." },
  { id: "snapshot", label: "Balance sheet", text: "What the client owns and owes, and the ratios advisors check first." },
  { id: "vision", label: "Vision and money mission", text: "Where they are headed and the one sentence that guides decisions." },
  { id: "goals", label: "Goals", text: "Each goal with its horizon, target, and how funded it is." },
  { id: "goalstatus", label: "Goal funding status", text: "Each goal's bucket, saving, and chance of being reached on time." },
  { id: "swot", label: "SWOT", text: "Strengths, weaknesses, opportunities, and threats." },
  { id: "strategy", label: "Strategy", text: "How to build on strengths, defend against threats, and fix the foundation." },
  { id: "risk", label: "Risk profile", text: "Risk tolerance, capacity, and the return the goals require." },
  { id: "ips", label: "Investment policy statement", text: "The written policy: objectives, constraints, allocation and review." },
  { id: "model", label: "Projection and assumptions", text: "The Monte Carlo projection with its assumptions." },
  { id: "scenarios", label: "Scenario comparison", text: "What saving more, or taking more or less risk, does to the outcome." },
  { id: "education", label: "Accounts and growth", text: "Where each dollar can live and how the same deposit grows after tax." },
  { id: "cashflow", label: "Cash flow", text: "Where each month goes, set against the 50/30/20 guideline." },
  { id: "schedule", label: "Weekly time", text: "How the week is spent, and the time protected for money." },
  { id: "focus", label: "Focus areas", text: "The 2 or 3 areas the client most wants to learn about." },
  { id: "roadmap", label: "Roadmap", text: "Milestones from 30 days to 3 years." },
  { id: "next", label: "Next steps", text: "What to do in the next 90 days." },
  { id: "disclosures", label: "Assumptions and disclosures", text: "The limits and the not-advice statement." },
  { id: "methodology", label: "Methodology appendix", text: "How each number was worked out, and where to check it." },
];

export interface DeckInput {
  plan: WealthPlan;
  /** The client's saved numbers for each toolkit tool, keyed by tool id. */
  tools: Record<string, unknown>;
  copy?: CopyFn;
}

export interface OutlineItem {
  id: string;
  /** "section" for a part of the plan, "tool" for a toolkit tool slide, "frame" for the title and closing slides. */
  kind: "section" | "tool" | "frame";
  title: string;
  /** False when the person left it out. */
  included: boolean;
  /** False when there is nothing in the plan to put on it yet. */
  available: boolean;
  /** Why it has nothing to show. */
  reason?: string;
  tool?: ToolId;
}

/** The toolkit tools in the deck: each focus area's tool first, then any extras the presenter added. */
export function deckToolIds(plan: WealthPlan): ToolId[] {
  const fromFocus = plan.focus.map((id) => TOPICS.find((t) => t.id === id)?.tool).filter((t): t is string => !!t);
  const all = [...fromFocus, ...plan.deck.tools].filter((t, i, a) => isToolId(t) && a.indexOf(t) === i);
  return all as ToolId[];
}

function availability(plan: WealthPlan): Record<string, { ok: boolean; reason?: string }> {
  const c = plan.client;
  const hasSwot = SWOT_KEYS.some((k) => plan.swot[k].length > 0);
  const hours = Object.keys(plan.schedule).length;
  return {
    summary: { ok: true },
    recommendation: { ok: plan.goals.length > 0 || snapshotMetrics(plan).hasAny, reason: "Add goals or the financial snapshot first." },
    snapshot: { ok: snapshotMetrics(plan).hasAny, reason: "Fill in the Snapshot step." },
    goalstatus: { ok: plan.goals.length > 0, reason: "Add at least one goal." },
    risk: { ok: assessRisk(plan, 0).recommended !== null, reason: "Answer the risk questions in the Risk and IPS step." },
    ips: { ok: assessRisk(plan, 0).recommended !== null || plan.goals.length > 0, reason: "Fill in goals or the risk questions first." },
    methodology: { ok: true },
    profile: { ok: !!(c.name || c.occupation || c.values.length), reason: "Add the client's profile in step 1." },
    vision: { ok: !!(plan.mission.vision || plan.mission.custom || plan.mission.values.length || c.values.length), reason: "Write the mission in the Mission step." },
    goals: { ok: plan.goals.length > 0, reason: "Add at least one goal." },
    swot: { ok: hasSwot, reason: "Add items to the SWOT." },
    strategy: { ok: hasSwot, reason: "The strategy is built from the SWOT." },
    model: { ok: num(plan.model.initial) + num(plan.model.monthly) > 0, reason: "Enter a starting balance or a monthly amount in the model." },
    scenarios: { ok: num(plan.model.initial) + num(plan.model.monthly) > 0, reason: "Enter a starting balance or a monthly amount in the model." },
    education: { ok: true },
    cashflow: { ok: num(c.income) > 0, reason: "Enter the monthly take-home income." },
    schedule: { ok: hours > 0, reason: "Fill in the weekly schedule." },
    focus: { ok: plan.focus.length > 0, reason: "Choose 2 or 3 focus areas." },
    roadmap: { ok: plan.roadmap.length > 0, reason: "Build the roadmap." },
    next: { ok: true },
    disclosures: { ok: true },
  };
}

/** The slides in order, with whether each is included and whether there is anything to put on it. */
export function deckOutline(input: DeckInput): OutlineItem[] {
  const { plan } = input;
  const av = availability(plan);
  const skipped = new Set(plan.deck.skip);
  const out: OutlineItem[] = [{ id: "title", kind: "frame", title: "Title", included: true, available: true }];
  const section = (id: string, title: string) => {
    const meta = DECK_SECTIONS.find((s) => s.id === id)!;
    out.push({ id, kind: "section", title: title || meta.label, included: !skipped.has(id) && av[id].ok, available: av[id].ok, reason: av[id].ok ? undefined : av[id].reason });
  };
  for (const s of DECK_SECTIONS) {
    if (s.id === "next" || s.id === "disclosures" || s.id === "methodology") continue;
    section(s.id, s.label);
    if (s.id === "focus") {
      for (const id of deckToolIds(plan)) {
        out.push({ id: `tool:${id}`, kind: "tool", tool: id, title: input.copy ? input.copy(`toolkit:tool:${id}:title`, CATALOG[id].title) : CATALOG[id].title, included: true, available: true });
      }
    }
  }
  section("next", "Next steps");
  out.push({ id: "closing", kind: "frame", title: "Questions and discussion", included: true, available: true });
  section("disclosures", "Assumptions and disclosures");
  section("methodology", "Methodology appendix");
  return out;
}

/* ------------------------------------------------------------------ */
/* Look                                                                */
/* ------------------------------------------------------------------ */

const W = 13.333;
const MX = 0.6;
const CW = W - 2 * MX;
const HEAD = "Cambria";
const BODY = "Calibri";

const C = {
  navy: "1F3F5E",
  deep: "162C42",
  ink: "1B2733",
  slate: "55616C",
  gold: "C9A24B",
  goldText: "7C5E12",
  green: "2F6F4F",
  red: "B24A3F",
  blue: "1F6F8B",
  panel: "F3F6F9",
  line: "D8DEE5",
  white: "FFFFFF",
  mute: "8A97A3",
};
const CHART_COLORS = [C.navy, C.gold, C.green, C.red, C.blue, C.mute];

type Slide = PptxGenJS.Slide;
type Pres = PptxGenJS;

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const money = fmtUsd;
const axisFormat = (max: number) => (max >= 2_000_000 ? '$0.0,,"M"' : max >= 20_000 ? '$#,##0,"K"' : "$#,##0");

interface Ctx {
  pres: Pres;
  plan: WealthPlan;
  input: DeckInput;
  client: string;
  facts: ReturnType<typeof planFacts>;
  years: number;
  /** The exhibit number last used (each chart or table that stands as evidence is numbered). */
  ex: number;
  /** The monthly saving that gives an 80% chance of reaching the target, worked out once on first use. */
  need80?: number | null;
}

/* ---- small drawing helpers ---- */

function text(s: Slide, t: string | PptxGenJS.TextProps[], o: PptxGenJS.TextPropsOptions) {
  // A bullet hangs 18pt, close to its text, instead of the library's wider default.
  if (Array.isArray(t)) t = t.map((r) => (r.options?.bullet === true ? { ...r, options: { ...r.options, bullet: { indent: 18 } } } : r));
  s.addText(t, { isTextBox: true, fontFace: BODY, color: C.ink, margin: 0, valign: "top", ...o });
}

function card(s: Ctx["pres"], slide: Slide, x: number, y: number, w: number, h: number, fill: string = C.panel) {
  slide.addShape(s.ShapeType.roundRect, { x, y, w, h, fill: { color: fill }, line: { color: C.line, width: 0.75 }, rectRadius: 0.06 });
}

function kpi(c: Ctx, s: Slide, x: number, y: number, w: number, label: string, value: string, sub?: string, tone: "navy" | "green" | "red" | "gold" = "navy") {
  card(c.pres, s, x, y, w, 1.15);
  const color = tone === "green" ? C.green : tone === "red" ? C.red : tone === "gold" ? C.goldText : C.navy;
  text(s, label.toUpperCase(), { x: x + 0.18, y: y + 0.12, w: w - 0.36, h: 0.25, fontSize: 10, bold: true, color: C.slate });
  text(s, value, { x: x + 0.18, y: y + 0.38, w: w - 0.36, h: 0.45, fontSize: 24, bold: true, fontFace: HEAD, color });
  if (sub) text(s, clip(sub, 44), { x: x + 0.18, y: y + 0.84, w: w - 0.36, h: 0.25, fontSize: 11, color: C.slate });
}

/**
 * The slide's topic as a small label, and the takeaway as the title: an advisor's slide states its conclusion, not just its subject.
 * A slide with no takeaway shows its topic as the title.
 */
function header(s: Slide, title: string, takeaway?: string) {
  if (takeaway) {
    text(s, title.toUpperCase(), { x: MX, y: 0.3, w: CW, h: 0.26, fontSize: 11, bold: true, color: C.goldText, charSpacing: 1.5 });
    text(s, takeaway, { x: MX, y: 0.58, w: CW, h: 0.95, fontSize: 24, bold: true, fontFace: HEAD, color: C.navy, valign: "top" });
  } else {
    text(s, title, { x: MX, y: 0.4, w: CW, h: 0.6, fontSize: 28, bold: true, fontFace: HEAD, color: C.navy, valign: "middle" });
  }
}

/** Numbers an exhibit and gives its source and date, as an advisor's deck does under every chart or table. */
function exhibit(c: Ctx, s: Slide, what: string, source = "4 Rivers Wealth Tools, from client-provided figures and the analyst's assumptions") {
  c.ex += 1;
  const when = c.plan.deck.meetingDate ? fmtDate(c.plan.deck.meetingDate) : "";
  text(s, `Exhibit ${c.ex}: ${what}. Source: ${source}${when ? `; as of ${when}` : ""}.`, { x: MX, y: 6.74, w: CW, h: 0.24, fontSize: 10, color: C.slate });
}

/** Dollars the way a finance table shows them: a loss or shortfall in parentheses. */
const acct = (n: number) => (n < 0 ? `(${money(Math.abs(n))})` : money(n));

function newSlide(c: Ctx, o: { title: string; takeaway?: string; notes?: string; section?: string }): Slide {
  const s = c.pres.addSlide({ masterName: "CONTENT", sectionTitle: o.section });
  header(s, o.title, o.takeaway);
  if (o.notes) s.addNotes(o.notes);
  return s;
}

type Row = PptxGenJS.TableRow;
const th = (t: string, align: "left" | "right" | "center" = "left") => ({
  text: t,
  options: { bold: true, color: C.white, fill: { color: C.navy }, align, fontFace: BODY, fontSize: 12 },
});
const td = (t: string, o: { bold?: boolean; color?: string; align?: "left" | "right" | "center"; fill?: string; italic?: boolean } = {}) => ({
  text: t,
  options: { fontFace: BODY, fontSize: 12, color: o.color ?? C.ink, bold: o.bold, italic: o.italic, align: o.align ?? "left", fill: o.fill ? { color: o.fill } : undefined },
});
const tableBase: Pick<PptxGenJS.TableProps, "border" | "margin" | "valign"> = {
  border: { type: "solid", color: C.line, pt: 0.75 },
  margin: [0.05, 0.1, 0.05, 0.1],
  valign: "middle",
};

function lineChart(c: Ctx, s: Slide, x: number, y: number, w: number, h: number, labels: string[], series: { name: string; values: number[]; dash?: boolean }[], colors: string[]) {
  const max = Math.max(1, ...series.flatMap((v) => v.values));
  s.addChart(c.pres.ChartType.line, series.map((v) => ({ name: v.name, labels, values: v.values })), {
    x,
    y,
    w,
    h,
    chartColors: colors,
    lineSize: 2.5,
    lineDataSymbol: "none",
    showLegend: true,
    legendPos: "b",
    legendFontSize: 11,
    legendFontFace: BODY,
    legendColor: C.slate,
    catAxisLabelFontSize: 11,
    catAxisLabelFontFace: BODY,
    catAxisLabelColor: C.slate,
    valAxisLabelFontSize: 11,
    valAxisLabelFontFace: BODY,
    valAxisLabelColor: C.slate,
    valAxisLabelFormatCode: axisFormat(max),
    valGridLine: { color: "E3E8ED", size: 0.75 },
    catGridLine: { style: "none" },
    valAxisLineShow: false,
    showTitle: false,
  });
}

function barChart(
  c: Ctx,
  s: Slide,
  x: number,
  y: number,
  w: number,
  h: number,
  labels: string[],
  series: { name: string; values: number[] }[],
  o: { horizontal?: boolean; stacked?: boolean; colors?: string[]; legend?: boolean; format?: string; labelFormat?: string } = {},
) {
  const max = Math.max(1, ...series.flatMap((v) => v.values));
  s.addChart(c.pres.ChartType.bar, series.map((v) => ({ name: v.name, labels, values: v.values })), {
    x,
    y,
    w,
    h,
    barDir: o.horizontal ? "bar" : "col",
    barGrouping: o.stacked ? "stacked" : "clustered",
    chartColors: o.colors ?? CHART_COLORS,
    showLegend: o.legend ?? series.length > 1,
    legendPos: "b",
    legendFontSize: 11,
    legendFontFace: BODY,
    legendColor: C.slate,
    catAxisLabelFontSize: 11,
    catAxisLabelFontFace: BODY,
    catAxisLabelColor: C.slate,
    valAxisLabelFontSize: 11,
    valAxisLabelFontFace: BODY,
    valAxisLabelColor: C.slate,
    valAxisLabelFormatCode: o.format ?? axisFormat(max),
    valGridLine: { color: "E3E8ED", size: 0.75 },
    catGridLine: { style: "none" },
    valAxisLineShow: false,
    showValue: true,
    dataLabelFontSize: 11,
    dataLabelFontFace: BODY,
    dataLabelColor: o.stacked ? C.white : C.ink,
    dataLabelFormatCode: o.labelFormat ?? axisFormat(max),
    dataLabelPosition: o.stacked ? "ctr" : "outEnd",
    barGapWidthPct: 60,
    showTitle: false,
  });
}

function doughnut(c: Ctx, s: Slide, x: number, y: number, w: number, h: number, labels: string[], values: number[], colors: string[]) {
  s.addChart(c.pres.ChartType.doughnut, [{ name: "Share", labels, values }], {
    x,
    y,
    w,
    h,
    chartColors: colors,
    holeSize: 58,
    showLegend: true,
    legendPos: "r",
    legendFontSize: 12,
    legendFontFace: BODY,
    legendColor: C.ink,
    showPercent: true,
    showValue: false,
    dataLabelColor: C.white,
    dataLabelFontSize: 12,
    dataLabelFontFace: BODY,
    showTitle: false,
  });
}

function deckChart(c: Ctx, s: Slide, ch: DeckChart, x: number, y: number, w: number, h: number) {
  text(s, ch.title, { x, y, w, h: 0.3, fontSize: 12, bold: true, color: C.slate });
  const top = y + 0.32;
  const hh = h - 0.32;
  if (ch.kind === "line") lineChart(c, s, x, top, w, hh, ch.labels, ch.series.map((v, i) => ({ ...v, dash: i > 0 && /target/i.test(v.name) })), CHART_COLORS);
  else if (ch.kind === "bar") barChart(c, s, x, top, w, hh, ch.labels, ch.series, { colors: [C.navy] });
  else doughnut(c, s, x, top, w, hh, ch.labels, ch.series[0].values, CHART_COLORS);
}

/* ------------------------------------------------------------------ */
/* Slides                                                              */
/* ------------------------------------------------------------------ */

function titleSlide(c: Ctx) {
  const s = c.pres.addSlide({ masterName: "TITLE" });
  const p = c.plan;
  text(s, "DAILY BREAD WEALTH MANAGEMENT TRACK", { x: 0.9, y: 0.9, w: 9, h: 0.35, fontSize: 13, bold: true, color: C.gold, charSpacing: 2 });
  text(s, "Wealth Plan and Scenario Walkthrough", { x: 0.9, y: 2.3, w: 8.4, h: 1.7, fontSize: 44, bold: true, fontFace: HEAD, color: C.white, valign: "top" });
  text(s, `Prepared for ${c.client}`, { x: 0.9, y: 4.25, w: 9, h: 0.5, fontSize: 24, color: C.white });
  const by = [p.deck.presenter && `Presented by ${p.deck.presenter}`, p.deck.meetingDate && fmtDate(p.deck.meetingDate)].filter(Boolean).join("   ·   ");
  if (by) text(s, by, { x: 0.9, y: 4.85, w: 9, h: 0.4, fontSize: 16, color: "C9D6E2" });
  text(s, "4 Rivers · One source. Four streams.", { x: 0.9, y: 6.6, w: 6, h: 0.3, fontSize: 12, color: "C9D6E2" });
  // Four overlapping rings, one for each river.
  const ring = (x: number, y: number, d: number, color: string) =>
    s.addShape(c.pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color, transparency: 100 }, line: { color, width: 2.25, transparency: 35 } });
  ring(9.6, 0.9, 3.0, "4F9873");
  ring(10.4, 1.9, 2.4, "4A9BB8");
  ring(9.2, 3.2, 3.2, "7A94D1");
  ring(10.5, 4.3, 2.2, "C08A52");
  s.addNotes(
    "Open by thanking the client for the discovery meeting and saying what today is: a walk through their own plan, built from what they told you, with the numbers behind it. Remind them this is education, not financial advice.",
  );
}

const HORIZON_SHORT: Record<string, string> = { "Short-Term": "Short term", "Medium-Term": "Medium term", "Long-Term Retirement/Wealth": "Long term", "Giving / Generosity": "Giving" };

/** Funded and still-to-fund dollars for each time horizon that has goals. */
function horizonData(plan: WealthPlan) {
  return GOAL_CATEGORIES.map((cat) => {
    const gs = plan.goals.filter((g) => g.category === cat);
    const t = gs.reduce((x, g) => x + num(g.amount), 0);
    const f = gs.reduce((x, g) => x + Math.min(num(g.current), num(g.amount)), 0);
    return { label: HORIZON_SHORT[cat], funded: Math.round(f), left: Math.round(Math.max(0, t - f)) };
  }).filter((x) => x.funded + x.left > 0);
}

function summarySlide(c: Ctx) {
  const { facts, plan } = c;
  const { sim, target } = facts;
  const funded = facts.total ? facts.saved / facts.total : 0;
  const s = newSlide(c, {
    title: "Executive summary",
    takeaway: `${c.client}: ${money(facts.saved)} of ${money(facts.total)} in goals funded today, with a clear order to work in.`,
    notes:
      "Lead with these four numbers. Total needed is the sum of every goal; funded is what is already saved toward them. The projection is a range, not a promise: say the median first, then the chance of reaching the target. End on the takeaways, which are the story of the rest of the deck.",
  });
  const gap = sim.final.p50 - target;
  const tile = (i: number, label: string, value: string, sub: string, tone?: "navy" | "green" | "red" | "gold") =>
    kpi(c, s, MX + i * (CW / 4), 1.85, CW / 4 - 0.2, label, value, sub, tone);
  tile(0, "Total needed", fmtK(facts.total), `${plan.goals.length} goal${plan.goals.length === 1 ? "" : "s"}`);
  tile(1, "Funded today", fmtPct(funded, funded < 0.1 ? 1 : 0), `${money(facts.saved)} saved`, funded >= 0.5 ? "green" : "gold");
  tile(2, `Median in ${sim.years} years`, fmtK(sim.final.p50), target ? `${gap >= 0 ? "Above" : "Below"} the ${fmtK(target)} goal` : "No target selected", target ? (gap >= 0 ? "green" : "red") : "navy");
  tile(3, "Chance of success", sim.prob == null ? "n/a" : fmtPct(sim.prob), target ? `Reaching ${fmtK(target)}` : "Pick a target goal", sim.prob == null ? "navy" : sim.prob >= 0.8 ? "green" : sim.prob >= 0.6 ? "gold" : "red");

  const blockers = facts.insights.blockers;
  const points: string[] = [
    blockers.length
      ? `Foundation first: ${blockers.length} item${blockers.length > 1 ? "s" : ""} to settle before aiming at big targets (${clip(blockers.join("; "), 110)}).`
      : "The foundation is clear: no high-interest debt or emergency fund gap was flagged.",
    facts.monthlyNeed > 0
      ? `Funding every goal in a straight line needs about ${money(facts.monthlyNeed)} a month, before any investment growth.`
      : "Add goals to see what each one needs per month.",
    num(plan.model.monthly) > 0
      ? `Investing ${money(num(plan.model.monthly))} a month at ${plan.model.ret}% (${plan.client.risk.toLowerCase()} profile) gives a median of ${money(sim.final.p50)} after ${sim.years} years.`
      : "Enter a monthly amount in the model to see the projection.",
    facts.insights.growth[0] ? clip(facts.insights.growth[0].headline, 150) : "Add opportunities in the SWOT to find the growth lever.",
  ];
  text(s, "What to take away", { x: MX, y: 3.4, w: CW, h: 0.35, fontSize: 18, bold: true, fontFace: HEAD, color: C.navy });
  text(
    s,
    points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 8 } })),
    { x: MX, y: 3.85, w: 7.1, h: 2.5, fontSize: 15, color: C.ink },
  );
  const hz = horizonData(plan);
  if (hz.length) {
    text(s, "Goals: funded and still to fund", { x: 8.1, y: 3.45, w: 4.6, h: 0.3, fontSize: 12, bold: true, color: C.slate });
    barChart(c, s, 8.1, 3.8, 4.63, 2.55, hz.map((x) => x.label), [
      { name: "Funded", values: hz.map((x) => x.funded) },
      { name: "Still to fund", values: hz.map((x) => x.left) },
    ], { stacked: true, colors: [C.green, C.line], labelFormat: "$#,##0" });
  }
  if (plan.focus.length) {
    const labels = plan.focus.map((id) => TOPICS.find((t) => t.id === id)).filter(Boolean).map((t) => topicLabel(t!));
    text(s, `Focus areas today: ${labels.join("  ·  ")}`, { x: MX, y: 6.4, w: CW, h: 0.35, fontSize: 14, bold: true, color: C.goldText });
  }
}

/** A numbered table of contents with the page each part starts on. */
function contentsSlide(c: Ctx, entries: { title: string; page: number; tool?: boolean }[]) {
  const s = newSlide(c, {
    title: "Contents",
    takeaway: "From who you are, to where you are headed, to the numbers that get you there.",
    notes: "Say the contents in your own words and point out the focus areas the client chose, because those get the most time.",
  });
  const perCol = Math.ceil(entries.length / 2);
  [entries.slice(0, perCol), entries.slice(perCol)].forEach((list, ci) => {
    const x = MX + ci * (CW / 2 + 0.1);
    const w = CW / 2 - 0.2;
    const rows: Row[] = list.map((e) => {
      const n = entries.indexOf(e) + 1;
      return [
        td(String(n).padStart(2, "0"), { bold: true, color: e.tool ? C.mute : C.gold, fill: C.white }),
        td(e.tool ? `Tool: ${e.title}` : e.title, { bold: !e.tool, color: e.tool ? C.slate : C.ink, fill: C.white }),
        td(String(e.page), { align: "right", color: C.slate, fill: C.white }),
      ];
    });
    s.addTable(rows, { x, y: 1.85, w, colW: [0.6, w - 1.3, 0.7], rowH: 0.36, border: { type: "solid", color: C.line, pt: 0.5 }, margin: [0.03, 0.1, 0.03, 0.1], valign: "middle" });
  });
}

function profileSlide(c: Ctx) {
  const { plan } = c;
  const cl = plan.client;
  const profile = RISK_PROFILES.find((r) => r.name === cl.risk);
  const s = newSlide(c, {
    title: "Client profile",
    takeaway: `${cl.name || "The client"}${cl.age ? `, ${cl.age}` : ""}${cl.occupation ? `: ${clip(cl.occupation, 90)}` : ""}`,
    notes:
      "Confirm the basics before the numbers. The risk profile sets the return and swings assumed in the projection later, so make sure the client agrees it describes them. Read the money psychology note back to them: how someone feels about money drives results more than the spreadsheet does.",
  });
  const rows: Row[] = [
    [td("Age", { bold: true }), td(cl.age || "Not added")],
    [td("Occupation", { bold: true }), td(clip(cl.occupation || "Not added", 70))],
    [td("Monthly take-home", { bold: true }), td(num(cl.income) ? money(num(cl.income)) : "Not added")],
    [td("Review rhythm", { bold: true }), td(cl.cadence || "Not added")],
    [td("Plan date", { bold: true }), td(fmtDate(cl.date) || "Not added")],
  ];
  s.addTable(rows, { x: MX, y: 1.9, w: 5.4, colW: [2.0, 3.4], rowH: 0.48, ...tableBase });
  text(s, "Core values", { x: MX, y: 4.55, w: 5.4, h: 0.3, fontSize: 14, bold: true, color: C.navy });
  const values = cl.values.slice(0, 8);
  let vx = MX;
  let vy = 4.95;
  values.forEach((v) => {
    const w = Math.max(0.9, 0.2 + v.length * 0.1);
    if (vx + w > MX + 5.4) {
      vx = MX;
      vy += 0.5;
    }
    s.addShape(c.pres.ShapeType.roundRect, { x: vx, y: vy, w, h: 0.38, fill: { color: C.panel }, line: { color: C.line, width: 0.75 }, rectRadius: 0.19 });
    text(s, v, { x: vx, y: vy, w, h: 0.38, fontSize: 12, color: C.ink, align: "center", valign: "middle" });
    vx += w + 0.12;
  });
  if (!values.length) text(s, "No values added yet.", { x: MX, y: 4.95, w: 5.4, h: 0.3, fontSize: 13, color: C.slate });

  const rx = 6.5;
  const rw = W - MX - rx;
  text(s, "Risk profile", { x: rx, y: 1.9, w: rw, h: 0.3, fontSize: 14, bold: true, color: C.navy });
  const bw = rw / RISK_PROFILES.length;
  RISK_PROFILES.forEach((r, i) => {
    const on = r.name === cl.risk;
    s.addShape(c.pres.ShapeType.rect, { x: rx + i * bw, y: 2.3, w: bw - 0.08, h: 0.95, fill: { color: on ? C.navy : C.panel }, line: { color: on ? C.navy : C.line, width: 0.75 } });
    text(s, r.name, { x: rx + i * bw + 0.06, y: 2.36, w: bw - 0.2, h: 0.5, fontSize: 11, bold: true, color: on ? C.white : C.ink, align: "center", valign: "middle" });
    text(s, `${r.ret}%`, { x: rx + i * bw + 0.06, y: 2.86, w: bw - 0.2, h: 0.3, fontSize: 13, color: on ? C.white : C.slate, align: "center" });
  });
  if (profile) text(s, `${profile.desc} Planning assumption: ${profile.ret}% a year, with swings of about ${profile.vol}%.`, { x: rx, y: 3.4, w: rw, h: 0.8, fontSize: 14, color: C.slate });
  text(s, "Money psychology", { x: rx, y: 4.35, w: rw, h: 0.3, fontSize: 14, bold: true, color: C.navy });
  card(c.pres, s, rx, 4.75, rw, 1.85);
  text(s, cl.psychology ? `“${clip(cl.psychology, 330)}”` : "Not added yet.", { x: rx + 0.2, y: 4.85, w: rw - 0.4, h: 1.65, fontSize: 14, italic: true, color: C.ink });
}

function visionSlide(c: Ctx) {
  const { plan, facts } = c;
  const m = plan.mission;
  const s = newSlide(c, {
    title: "Vision and money mission",
    takeaway: "One sentence to return to when a money decision gets hard.",
    notes:
      "Read the mission statement aloud, then ask: does this still sound like you? Use it as a filter for every purchase, trade, or job offer in the coming months. If they want different words, change them now; it is their sentence.",
  });
  s.addShape(c.pres.ShapeType.roundRect, { x: MX, y: 1.85, w: CW, h: 2.3, fill: { color: C.navy }, line: { color: C.navy, width: 0 }, rectRadius: 0.08 });
  text(s, facts.mission ? `“${clip(facts.mission, 260)}”` : "The mission statement has not been written yet.", {
    x: MX + 0.5,
    y: 2.0,
    w: CW - 1.0,
    h: 2.0,
    fontSize: 24,
    italic: true,
    fontFace: HEAD,
    color: C.white,
    valign: "middle",
  });
  const cols: [string, string][] = [
    ["Working toward", m.vision || "Financial independence"],
    ["Providing for", m.beneficiaries || "Not added"],
    ["Legacy", `${m.legacy || "Not added"}${m.age ? `, by age ${m.age}` : ""}`],
  ];
  cols.forEach(([label, value], i) => {
    const w = CW / 3 - 0.2;
    const x = MX + i * (CW / 3);
    card(c.pres, s, x, 4.45, w, 1.35);
    text(s, label.toUpperCase(), { x: x + 0.2, y: 4.58, w: w - 0.4, h: 0.25, fontSize: 10, bold: true, color: C.slate });
    text(s, clip(value, 80), { x: x + 0.2, y: 4.9, w: w - 0.4, h: 0.8, fontSize: 16, bold: true, color: C.navy });
  });
  const vals = (m.values.length ? m.values : plan.client.values).slice(0, 6);
  if (vals.length) text(s, `Guided by: ${vals.join("  ·  ")}`, { x: MX, y: 6.15, w: CW, h: 0.4, fontSize: 15, color: C.slate });
}

function goalsSlide(c: Ctx) {
  const { plan, facts } = c;
  const sorted = [...plan.goals].sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority));
  const shown = sorted.slice(0, 8);
  const s = newSlide(c, {
    title: "Goals",
    takeaway: `${money(facts.saved)} funded of ${money(facts.total)} needed; about ${money(facts.monthlyNeed)} a month funds all of it in a straight line.`,
    notes:
      "Walk the table from the top: the highest-priority goals first. 'Per month' is simply what is left to fund divided by the months available, with no investment growth, so it is the cautious number. The chart shows which time horizon is furthest behind.",
  });
  const rows: Row[] = [[th("Goal"), th("Horizon"), th("Priority"), th("Target", "right"), th("Saved", "right"), th("Funded", "right"), th("Per month", "right")]];
  shown.forEach((g) => {
    const amt = num(g.amount);
    const funded = amt ? Math.min(1, num(g.current) / amt) : 0;
    const need = Math.max(0, amt - num(g.current)) / Math.max(1, num(g.horizon) * 12);
    rows.push([
      td(clip(g.name, 34), { bold: true }),
      td(`${num(g.horizon)} yr`),
      td(g.priority),
      td(money(amt), { align: "right" }),
      td(money(num(g.current)), { align: "right" }),
      td(fmtPct(funded), { align: "right", color: funded >= 0.5 ? C.green : C.ink, bold: true }),
      td(money(need), { align: "right" }),
    ]);
  });
  if (sorted.length > shown.length) rows.push([td(`and ${sorted.length - shown.length} more`, { italic: true, color: C.slate }), td(""), td(""), td(""), td(""), td(""), td("")]);
  s.addTable(rows, { x: MX, y: 1.85, w: 7.9, colW: [2.45, 0.8, 0.85, 1.0, 0.9, 0.8, 1.1], rowH: 0.42, ...tableBase });
  const cats = horizonData(plan);
  if (cats.length) {
    text(s, "Funded and still to fund, by time horizon", { x: 8.75, y: 1.85, w: 4.0, h: 0.3, fontSize: 12, bold: true, color: C.slate });
    barChart(c, s, 8.75, 2.2, 4.0, 4.4, cats.map((x) => x.label), [
      { name: "Funded", values: cats.map((x) => x.funded) },
      { name: "Still to fund", values: cats.map((x) => x.left) },
    ], { stacked: true, colors: [C.green, C.line], labelFormat: "$#,##0" });
  }
  exhibit(c, s, "Goals, with progress by time horizon");
}

function swotSlide(c: Ctx) {
  const { plan } = c;
  const s = newSlide(c, {
    title: "SWOT analysis",
    takeaway: "What is working for you and what to watch, personally and financially.",
    notes:
      "Strengths and weaknesses are inside the client's control; opportunities and threats are outside it. Ask which two items they think matter most in each box. Those answers shape the strategy on the next slide.",
  });
  const color: Record<string, string> = { S: C.green, W: C.red, O: C.blue, T: C.goldText };
  SWOT_KEYS.forEach((k, i) => {
    const w = CW / 2 - 0.15;
    const x = MX + (i % 2) * (w + 0.3);
    const y = 1.85 + Math.floor(i / 2) * 2.45;
    card(c.pres, s, x, y, w, 2.3);
    text(s, SWOT_TITLES[k], { x: x + 0.25, y: y + 0.15, w: w - 0.5, h: 0.4, fontSize: 18, bold: true, fontFace: HEAD, color: color[k] });
    const items = plan.swot[k].slice(0, 4).map((it) => clip(it.text, 78));
    text(s, items.length ? items.map((t, j) => ({ text: t, options: { bullet: true, breakLine: j < items.length - 1, paraSpaceAfter: 3 } })) : "Nothing added yet.", {
      x: x + 0.25,
      y: y + 0.62,
      w: w - 0.5,
      h: 1.6,
      fontSize: 14,
    });
  });
}

function strategySlide(c: Ctx) {
  const { facts } = c;
  const s = newSlide(c, {
    title: "Strategy: from SWOT to action",
    takeaway: "Build on strengths, defend against threats, and fix the foundation in order of urgency.",
    notes:
      "Each column pairs what the client has with what they face. Growth pairs a strength with an opportunity; Defend pairs a strength with a threat; Fix lists weaknesses most urgent first (debt, then emergency cushion, then irregular income). Start with the third column if there is a foundation warning.",
  });
  const cols: { name: string; sub: string; items: { headline: string; tactic: string }[]; color: string }[] = [
    { name: "Grow", sub: "Strengths × opportunities", items: facts.insights.growth, color: C.blue },
    { name: "Defend", sub: "Strengths × threats", items: facts.insights.risk, color: C.goldText },
    { name: "Fix the foundation", sub: "Weaknesses, most urgent first", items: facts.insights.remediate, color: C.red },
  ];
  cols.forEach((col, i) => {
    const w = CW / 3 - 0.2;
    const x = MX + i * (CW / 3);
    card(c.pres, s, x, 1.85, w, 4.8);
    text(s, col.name, { x: x + 0.22, y: 1.98, w: w - 0.44, h: 0.4, fontSize: 18, bold: true, fontFace: HEAD, color: col.color });
    text(s, col.sub, { x: x + 0.22, y: 2.4, w: w - 0.44, h: 0.3, fontSize: 12, color: C.slate });
    const items = col.items.slice(0, 2);
    const runs: PptxGenJS.TextProps[] = [];
    items.forEach((it, j) => {
      runs.push({ text: clip(it.headline, 140), options: { bold: true, breakLine: true, fontSize: 13, color: C.ink, paraSpaceAfter: 2 } });
      runs.push({ text: clip(it.tactic, 130), options: { breakLine: j < items.length - 1, fontSize: 13, color: C.slate, paraSpaceAfter: 12 } });
    });
    text(s, runs.length ? runs : "Add items in the SWOT to build this column.", { x: x + 0.22, y: 2.85, w: w - 0.44, h: 3.7, fontSize: 13 });
  });
}

function modelSlide(c: Ctx) {
  const { plan, facts } = c;
  const { sim, target } = facts;
  const m = plan.model;
  const s = newSlide(c, {
    title: "Financial model: where the plan could lead",
    takeaway: `${money(num(m.initial))} to start and ${money(num(m.monthly))} a month gives a median of ${money(sim.final.p50)} after ${sim.years} years${
      sim.prob != null ? `, with a ${fmtPct(sim.prob)} chance of reaching ${fmtK(target)}` : ""
    }.`,
    notes:
      "Explain the chart in plain words: we ran 2,000 possible futures for the market, each a little different. The middle line is the median outcome; the top line is what happened in the best tenth of futures and the bottom line the worst tenth. The dashed line is what was actually put in, so the gap above it is growth. This is an illustration to learn from, not a prediction.",
  });
  const assumptions: Row[] = [
    [td("Starting balance", { bold: true }), td(money(num(m.initial)), { align: "right" })],
    [td("Monthly contribution", { bold: true }), td(money(num(m.monthly)), { align: "right" })],
    [td("Time horizon", { bold: true }), td(`${sim.years} years`, { align: "right" })],
    [td("Expected return", { bold: true }), td(`${m.ret}% a year`, { align: "right" })],
    [td("Volatility", { bold: true }), td(`${m.vol}%`, { align: "right" })],
    [td(m.real ? "Dollars" : "Dollars", { bold: true }), td(m.real ? `Today's (${m.inflation}% inflation)` : "Future", { align: "right" })],
    [td("Goal", { bold: true }), td(target ? money(target) : "None selected", { align: "right" })],
  ];
  s.addTable(assumptions, { x: MX, y: 1.9, w: 3.9, colW: [1.9, 2.0], rowH: 0.45, ...tableBase });
  const step = Math.max(1, Math.round(sim.years / 7));
  const labels = sim.data.map((d) => (d.year % step === 0 || d.year === sim.years ? `Yr ${d.year}` : ""));
  const series = [
    { name: "90th percentile", values: sim.data.map((d) => d.p90) },
    { name: "Median", values: sim.data.map((d) => d.p50) },
    { name: "10th percentile", values: sim.data.map((d) => d.p10) },
    { name: "Total contributed", values: sim.data.map((d) => d.contributed), dash: true },
  ];
  const colors = [C.green, C.navy, C.red, C.mute];
  if (target > 0) {
    series.push({ name: "Goal", values: sim.data.map(() => target), dash: true });
    colors.push(C.gold);
  }
  lineChart(c, s, 4.8, 1.8, W - MX - 4.8, 3.55, labels, series, colors);
  const tiles: [string, string, string, "navy" | "green" | "red" | "gold"][] = [
    ["10th percentile", fmtK(sim.final.p10), "Conservative", "red"],
    ["Median", fmtK(sim.final.p50), "Expected", "navy"],
    ["90th percentile", fmtK(sim.final.p90), "Optimistic", "green"],
    ["Chance of success", sim.prob == null ? "n/a" : fmtPct(sim.prob), target ? `of reaching ${fmtK(target)}` : "no target", "gold"],
  ];
  tiles.forEach(([l, v, sub, tone], i) => kpi(c, s, MX + i * (CW / 4), 5.5, CW / 4 - 0.2, l, v, sub, tone));
  exhibit(c, s, `Projected balance over ${sim.years} years (2,000 simulated paths)`);
}

function scenariosSlide(c: Ctx) {
  const { plan } = c;
  const g = scenarioGrid(plan);
  const need = solveMonthlyFor(0.8, {
    initial: num(plan.model.initial),
    monthly: 0,
    years: g.years,
    ret: num(plan.model.ret),
    vol: num(plan.model.vol),
    target: g.target,
    inflation: num(plan.model.inflation),
    real: !!plan.model.real,
  });
  const cur = num(plan.model.monthly);
  const s = newSlide(c, {
    title: "Scenario comparison: what changes the outcome",
    takeaway: g.target
      ? need
        ? `An 80% chance of reaching ${fmtK(g.target)} takes about ${money(need)} a month (the plan has ${money(cur)}).`
        : "At these assumptions the target is out of reach in this time; consider a longer horizon or a smaller target."
      : "Saving more, or taking more or less risk, moves the whole range.",
    notes:
      "This is the 'what if' slide. Read across a row to see risk; read down a column to see saving. Percentages are the chance of reaching the goal in 2,000 simulated futures. Point out that more saving is a decision they control, while the market is not. If the 80% amount is far above what they can afford, talk about time, target, or both.",
  });
  const header: Row = [th("Monthly saving"), ...g.profiles.map((p) => th(`${p.name} (${p.ret}%)`, "center"))];
  const rows: Row[] = [header];
  g.monthly.forEach((mo, r) => {
    const cells = g.cells[r].map((cell) => {
      const p = cell.prob;
      const color = p == null ? C.ink : p >= 0.8 ? C.green : p >= 0.6 ? C.goldText : C.red;
      return td(`${fmtK(cell.median)}${p == null ? "" : `  ·  ${fmtPct(p)}`}`, { align: "center", bold: true, color });
    });
    rows.push([td(`${money(mo)}${mo === cur ? "  (plan)" : ""}`, { bold: true }), ...cells]);
  });
  s.addTable(rows, { x: MX, y: 1.9, w: 7.6, colW: [1.9, 1.9, 1.9, 1.9], rowH: 0.55, ...tableBase });
  text(s, g.target ? "Each cell: median ending balance · chance of reaching the goal" : "Each cell: median ending balance", { x: MX, y: 4.8, w: 7.6, h: 0.3, fontSize: 12, color: C.slate });
  // The median at each saving level for the plan's own risk profile (the middle column is Moderate).
  const mid = Math.min(1, g.profiles.length - 1);
  text(s, `Median after ${g.years} years by monthly saving (${g.profiles[mid].name})`, { x: 8.55, y: 1.85, w: 4.2, h: 0.3, fontSize: 12, bold: true, color: C.slate });
  barChart(c, s, 8.55, 2.2, 4.2, 3.0, g.monthly.map((m) => money(m)), [{ name: "Median", values: g.cells.map((r) => Math.round(r[mid].median)) }], { colors: [C.navy] });
  card(c.pres, s, MX, 5.35, CW, 1.2);
  text(s, g.target && need ? `To have an 80% chance of reaching ${money(g.target)}, save about ${money(need)} a month.` : "Choose a target goal in the model to see the monthly amount that gives an 80% chance.", {
    x: MX + 0.3,
    y: 5.5,
    w: CW - 0.6,
    h: 0.5,
    fontSize: 18,
    bold: true,
    fontFace: HEAD,
    color: C.navy,
  });
  text(s, "Green is an 80% chance or better, gold is 60 to 80%, and red is under 60%.", { x: MX + 0.3, y: 6.05, w: CW - 0.6, h: 0.35, fontSize: 13, color: C.slate });
  exhibit(c, s, "Median outcome and chance of success by monthly saving and risk profile (500 paths each)");
}

function accountsSlide(c: Ctx) {
  const s = newSlide(c, {
    title: "Where each dollar can live",
    takeaway: "The account holding the money, and how it is taxed, changes how much of the growth you keep.",
    notes:
      "Do not memorize the limits; the point is the pattern. Roth: pay tax now, grow and withdraw tax free. Traditional 401(k): skip tax now, pay later, and always capture the employer match first. Brokerage: flexible but taxed along the way. High yield savings: safe, for goals under three years. Limits shown are 2026 federal figures.",
  });
  const keys = ["2026 limit", "Going in", "Growth", "Coming out", "Best for"];
  const order = ["Roth IRA", "Traditional 401(k)", "Taxable brokerage", "High yield savings"];
  const vs = order.map((n) => VEHICLES.find((v) => v.name === n)!);
  const rows: Row[] = [[th(""), ...vs.map((v) => th(v.name))]];
  keys.forEach((k) => rows.push([td(k, { bold: true, color: C.navy }), ...vs.map((v) => td(clip(v.rows[k], 70), { color: C.ink }))]));
  s.addTable(rows, { x: MX, y: 1.85, w: CW, colW: [1.7, 2.75, 2.75, 2.75, 2.18], ...tableBase, fontSize: 12 });
  exhibit(c, s, "Four kinds of accounts compared", "IRS 2026 limits and rules, summarized; verify before relying on them");
}

function growthSlide(c: Ctx) {
  const { plan, years } = c;
  const horizon = Math.max(10, Math.min(40, years || 30));
  const ret = num(plan.model.ret) || 7;
  const g = vehicleGrowth(horizon, ret);
  const best = g.reduce((a, b) => (b.value > a.value ? b : a));
  const s = newSlide(c, {
    title: `The same $5,000 after ${horizon} years`,
    takeaway: `${best.name} keeps the most: ${money(best.value)} after tax, at ${ret}% a year.`,
    notes:
      "Same deposit, same market return, four different tax treatments. The gap is not talent or luck; it is just tax. Be clear about the assumptions printed at the bottom: traditional withdrawals taxed at 15%, brokerage tax drag of 0.8% a year plus 15% on gains, savings at 4% with interest taxed at 12%.",
  });
  text(s, "Value after tax of a single $5,000 deposit", { x: MX, y: 1.85, w: 7.4, h: 0.3, fontSize: 12, bold: true, color: C.slate });
  barChart(c, s, MX, 2.2, 7.4, 3.85, g.map((x) => x.name), [{ name: "After tax", values: g.map((x) => x.value) }], { colors: [C.navy], legend: false });
  card(c.pres, s, 8.4, 2.2, W - MX - 8.4, 3.85);
  text(s, "How to read it", { x: 8.65, y: 2.35, w: 3.9, h: 0.35, fontSize: 16, bold: true, fontFace: HEAD, color: C.navy });
  text(
    s,
    [
      { text: "A dollar in a Roth grows and comes out tax free.", options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
      { text: "A traditional account defers tax, then pays it on the way out.", options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
      { text: "A brokerage account is flexible but taxed along the way.", options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
      { text: "Savings are safest, and the slowest.", options: { bullet: true } },
    ],
    { x: 8.65, y: 2.8, w: 3.9, h: 3.2, fontSize: 14 },
  );
  text(s, "Assumes traditional withdrawals taxed at 15%; brokerage tax drag of 0.8% a year and 15% tax on gains at sale; savings at 4% with interest taxed at 12%. Illustrative only.", {
    x: MX,
    y: 6.2,
    w: CW,
    h: 0.42,
    fontSize: 11,
    color: C.slate,
  });
  exhibit(c, s, "Value after tax of one $5,000 deposit", "4 Rivers Wealth Tools; stated tax assumptions; illustrative, not a forecast");
}

function incomeCompareSlide(c: Ctx) {
  const s = newSlide(c, {
    title: "Trading time for money, and letting money work",
    takeaway: "Each kind of income has a different tax treatment, time demand, and risk; the plan uses all four.",
    notes: "Use this when the client asks how to earn more. Equity compounding is the only column that keeps working when they stop, which is why the first dollars invested matter most.",
  });
  const rows: Row[] = [[th(""), ...INCOME_COLS.map((x) => th(x.k))]];
  INCOME_ROWS.filter((_, i) => [0, 1, 2, 4, 5].includes(i)).forEach((label) => {
    const i = INCOME_ROWS.indexOf(label);
    rows.push([td(label, { bold: true, color: C.navy }), ...INCOME_COLS.map((x) => td(clip(x.rows[i], 64)))]);
  });
  s.addTable(rows, { x: MX, y: 1.85, w: CW, colW: [1.9, 2.7, 2.7, 2.7, 2.13], ...tableBase });
  exhibit(c, s, "Four kinds of income compared", "IRS 2026 rules, summarized; not tax advice");
}

function cashflowSlide(c: Ctx) {
  const m = snapshotMetrics(c.plan);
  const income = num(c.plan.client.income);
  // With the client's own spending entered, show it against the guideline; otherwise teach the guideline itself.
  if (m.spent > 0 && income > 0) return actualCashflowSlide(c);
  const s = newSlide(c, {
    title: "Cash flow",
    takeaway: `Of ${money(income)} a month: ${money(income * 0.5)} for needs, ${money(income * 0.3)} for wants, ${money(income * 0.2)} to save and invest.`,
    notes:
      "The 50/30/20 split is a starting point, not a rule. The real lesson is the order: the transfer to savings and investing fires first on payday, then fixed bills, then whatever is left is spending money. For irregular income, build the budget from the lowest month on record and sweep any surplus to goals.",
  });
  doughnut(c, s, MX, 1.85, 6.0, 4.6, ["Needs 50%", "Wants 30%", "Save and invest 20%"], [50, 30, 20], [C.navy, C.gold, C.green]);
  const rows: Row[] = [
    [th("Bucket"), th("Per month", "right")],
    [td("Needs: rent, utilities, groceries, insurance, minimum payments"), td(money(income * 0.5), { align: "right", bold: true })],
    [td("Wants: dining out, travel, subscriptions, upgrades"), td(money(income * 0.3), { align: "right", bold: true })],
    [td("Save and invest: emergency fund, extra debt payoff, Roth IRA"), td(money(income * 0.2), { align: "right", bold: true })],
  ];
  s.addTable(rows, { x: 6.9, y: 1.95, w: W - MX - 6.9, colW: [4.0, 1.83], rowH: 0.62, ...tableBase });
  text(s, "Order to pay in", { x: 6.9, y: 4.65, w: 5.8, h: 0.35, fontSize: 16, bold: true, fontFace: HEAD, color: C.navy });
  text(
    s,
    [
      { text: "Payday: the transfer to savings and investing fires first.", options: { bullet: { type: "number" }, breakLine: true, paraSpaceAfter: 5 } },
      { text: "Fixed overhead: rent, insurance, phone, minimum payments.", options: { bullet: { type: "number" }, breakLine: true, paraSpaceAfter: 5 } },
      { text: "Variable spending: what remains, guilt free.", options: { bullet: { type: "number" } } },
    ],
    { x: 6.9, y: 5.05, w: 5.8, h: 1.5, fontSize: 14 },
  );
  exhibit(c, s, "The 50/30/20 guideline applied to take-home pay", "the 50/30/20 budgeting guideline; client take-home pay");
}

/** The client's own month against the 50/30/20 guideline. */
function actualCashflowSlide(c: Ctx) {
  const m = snapshotMetrics(c.plan);
  const income = m.income;
  const future = m.giving + m.saving;
  const pctOf = (v: number) => Math.round((v / income) * 100);
  const s = newSlide(c, {
    title: "Cash flow",
    takeaway:
      m.surplus < 0
        ? `${c.client} spends ${acct(m.spent)} against ${money(income)} of take-home: ${money(Math.abs(m.surplus))} a month more is going out than coming in.`
        : `${pctOf(m.needs)}% of take-home goes to needs, ${pctOf(m.wants)}% to wants and ${pctOf(future)}% to giving and saving; ${money(m.surplus)} a month is still unassigned.`,
    notes:
      "Compare the client's actual month with the 50/30/20 guideline: roughly half to needs, thirty percent to wants, twenty percent to the future. The guideline counts giving and saving together as the future. Where the actual bar is far from the guideline, that is the conversation. Unassigned money is money with no job: give it one before the month starts.",
  });
  text(s, "Share of take-home pay: actual and guideline", { x: MX, y: 1.85, w: 6.2, h: 0.3, fontSize: 12, bold: true, color: C.slate });
  barChart(c, s, MX, 2.2, 6.2, 4.3, ["Needs", "Wants", "Giving and saving"], [
    { name: "Actual", values: [pctOf(m.needs), pctOf(m.wants), pctOf(future)] },
    { name: "Guideline", values: [50, 30, 20] },
  ], { colors: [C.navy, C.gold], format: '0"%"', labelFormat: '0"%"' });
  const lines = c.plan.snapshot.expenses.filter((e) => num(e.amount) > 0).slice(0, 8);
  const rows: Row[] = [[th("Line"), th("Category"), th("Per month", "right")]];
  lines.forEach((e) => rows.push([td(clip(e.name, 28)), td(e.category), td(money(num(e.amount)), { align: "right" })]));
  rows.push([td("Unassigned", { bold: true }), td(""), td(acct(m.surplus), { align: "right", bold: true, color: m.surplus < 0 ? C.red : C.ink })]);
  s.addTable(rows, { x: 7.1, y: 1.9, w: W - MX - 7.1, colW: [2.7, 1.5, 1.43], rowH: 0.42, ...tableBase });
  exhibit(c, s, "Monthly cash flow against the 50/30/20 guideline", "client-provided spending and take-home pay; the 50/30/20 budgeting guideline");
}

function scheduleSlide(c: Ctx) {
  const { plan } = c;
  const counts = SCHED_CATS.map((cat) => ({ cat, hours: Object.values(plan.schedule).filter((v) => v === cat.key).length })).filter((x) => x.hours > 0);
  const wealth = counts.find((x) => x.cat.key === "wealth")?.hours ?? 0;
  const days = new Set(Object.keys(plan.schedule).map((k) => Number(k.split("-")[0]))).size;
  const s = newSlide(c, {
    title: "A real week: time protected for money",
    takeaway: wealth >= 2 ? `${wealth} hours a week are set aside for the plan, about ${wealth * 52} hours a year.` : "Protect at least one recurring money date a week so the plan has time to run.",
    notes: "A plan only runs if it has time on the calendar. Ask the client to name the day and hour of their weekly money date and put it in their phone before they leave.",
  });
  text(s, "Hours per week by category", { x: MX, y: 1.85, w: 7.4, h: 0.3, fontSize: 12, bold: true, color: C.slate });
  barChart(c, s, MX, 2.2, 7.4, 4.3, counts.map((x) => x.cat.label), [{ name: "Hours", values: counts.map((x) => x.hours) }], {
    horizontal: true,
    colors: [C.navy],
    legend: false,
    format: "0",
    labelFormat: '0"h"',
  });
  const total = counts.reduce((a, x) => a + x.hours, 0);
  kpi(c, s, 8.4, 2.2, W - MX - 8.4, "Scheduled", `${total}h`, `across ${days} day${days === 1 ? "" : "s"}`);
  kpi(c, s, 8.4, 3.6, W - MX - 8.4, "Wealth planning", `${wealth}h`, wealth >= 2 ? "protected each week" : "aim for at least 2", wealth >= 2 ? "green" : "gold");
  exhibit(c, s, "Hours per week by category", "the client's weekly schedule");
  text(s, `Days used: ${DAYS.filter((_, i) => Object.keys(plan.schedule).some((k) => k.startsWith(`${i}-`))).join(", ")}`, { x: 8.4, y: 5.0, w: W - MX - 8.4, h: 0.5, fontSize: 13, color: C.slate });
}

function focusSlide(c: Ctx) {
  const { plan } = c;
  const topics = plan.focus.map((id) => TOPICS.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t);
  const s = newSlide(c, {
    title: "The areas you chose to learn about",
    takeaway: topics.length === 1 ? "One area gets our full attention today." : `${topics.length} areas get our full attention today; each one has its own tool and numbers.`,
    notes:
      "These came from the client in the discovery meeting. For each one, say why it matters, then open its slide and put in their real numbers. If a card says the numbers are not entered, use the starting example to teach the idea and say it is an example.",
  });
  const w = CW / Math.max(1, topics.length) - 0.25;
  topics.forEach((t, i) => {
    const x = MX + i * (w + 0.25);
    card(c.pres, s, x, 1.9, w, 4.7);
    s.addShape(c.pres.ShapeType.ellipse, { x: x + 0.25, y: 2.1, w: 0.55, h: 0.55, fill: { color: C.gold }, line: { color: C.gold, width: 0 } });
    text(s, String(i + 1), { x: x + 0.25, y: 2.1, w: 0.55, h: 0.55, fontSize: 18, bold: true, color: C.deep, align: "center", valign: "middle" });
    text(s, topicLabel(t), { x: x + 0.95, y: 2.1, w: w - 1.15, h: 0.55, fontSize: 20, bold: true, fontFace: HEAD, color: C.navy, valign: "middle" });
    text(s, TOPIC_WHY[t.id] ?? "", { x: x + 0.25, y: 2.95, w: w - 0.5, h: 1.5, fontSize: 14, color: C.ink });
    const tool = t.tool as ToolId;
    const snap = isToolId(t.tool) ? summarizeTool(tool, c.input.tools[t.tool], c.input.copy) : null;
    text(s, "WE WILL WORK THROUGH", { x: x + 0.25, y: 4.6, w: w - 0.5, h: 0.25, fontSize: 10, bold: true, color: C.slate });
    text(s, CATALOG[tool]?.title ?? t.tool, { x: x + 0.25, y: 4.88, w: w - 0.5, h: 0.4, fontSize: 16, bold: true, color: C.navy });
    const head = snap ? snap.sections[snap.sections.length - 1]?.rows[0] : null;
    if (head) text(s, `${head[0]}: ${clip(head[1], 110)}${snap!.filledIn ? "" : " (example)"}`, { x: x + 0.25, y: 5.35, w: w - 0.5, h: 0.9, fontSize: 13, color: C.slate });
  });
}

function toolSlide(c: Ctx, id: ToolId) {
  const copy = c.input.copy;
  const saved = c.input.tools[id];
  const snap: ToolSnapshot = summarizeTool(id, saved, copy);
  const chart = toolDeckChart(id, saved);
  const results = toolResults(id, saved);
  const lead = results.find((r) => r.value) ?? results[0];
  const s = newSlide(c, {
    title: snap.title,
    takeaway: lead ? `${lead.label}: ${clip(lead.value, 110)}${snap.filledIn ? "" : "   (starting example numbers)"}` : CATALOG[id].text,
    notes: `${CATALOG[id].text} ${snap.filledIn ? "These are the client's own numbers." : "These are the tool's starting example numbers; say so, then replace them with the client's real figures before presenting."} ${
      snap.notes[0] ?? ""
    }`.trim(),
  });
  // Left: the numbers used.
  const inputs = snap.sections[0]?.rows ?? [];
  text(s, snap.sections[0]?.heading ?? "Numbers used", { x: MX, y: 1.8, w: 5.0, h: 0.3, fontSize: 13, bold: true, color: C.navy });
  const rows: Row[] = inputs.slice(0, 10).map(([k, v]) => [td(clip(k, 52), { color: C.slate }), td(clip(v, 64), { bold: true, align: "right" })]);
  if (rows.length) s.addTable(rows, { x: MX, y: 2.15, w: 5.2, colW: [2.5, 2.7], rowH: 0.36, ...tableBase });

  // Right: what it shows, as tiles, with the chart under them when there is one.
  const rx = 6.1;
  const rw = W - MX - rx;
  const tiles = results.slice(0, chart ? 4 : 6);
  const tw = rw / 2 - 0.1;
  const th2 = chart ? 1.05 : 1.45;
  tiles.forEach((r, i) => {
    const x = rx + (i % 2) * (tw + 0.2);
    const y = 1.8 + Math.floor(i / 2) * (th2 + 0.12);
    card(c.pres, s, x, y, tw, th2);
    const long = r.label.length > 30;
    text(s, clip(r.label, 56).toUpperCase(), { x: x + 0.15, y: y + 0.08, w: tw - 0.3, h: long ? 0.36 : 0.22, fontSize: 10, bold: true, color: C.slate });
    const vy = y + (long ? 0.46 : 0.34);
    text(s, clip(r.value, 80), {
      x: x + 0.15,
      y: vy,
      w: tw - 0.3,
      h: chart ? 0.5 : 0.55,
      fontSize: r.value.length > 40 ? 12 : r.value.length > 22 ? 14 : 20,
      bold: true,
      fontFace: HEAD,
      color: C.navy,
    });
    if (r.note && !chart) text(s, clip(r.note, 70), { x: x + 0.15, y: y + th2 - 0.4, w: tw - 0.3, h: 0.34, fontSize: 10, color: C.slate });
  });
  if (chart) {
    const cy = 1.8 + Math.ceil(tiles.length / 2) * (th2 + 0.12) + 0.08;
    deckChart(c, s, chart, rx, cy, rw, 6.65 - cy);
  }
  const note = snap.notes[0];
  if (note && !chart) text(s, clip(note, 300), { x: MX, y: 5.95, w: CW, h: 0.7, fontSize: 11, italic: true, color: C.slate });
  exhibit(c, s, `${snap.title}: the client's numbers and results`, snap.filledIn ? "client-provided figures; 4 Rivers Wealth Tools" : "starting example numbers; 4 Rivers Wealth Tools");
}

function roadmapSlide(c: Ctx) {
  const { plan } = c;
  const items = plan.roadmap;
  const done = items.filter((i) => i.status === "Completed").length;
  const s = newSlide(c, {
    title: "Roadmap: from 30 days to 3 years",
    takeaway: `${items.length} milestones; ${done} complete. Short steps first, so progress shows early.`,
    notes:
      "Walk left to right. The first 30 days are the easiest and the most important: they build the habits and clear the foundation. Ask the client to pick the one milestone they will do this week.",
  });
  const w = CW / PHASES.length - 0.15;
  PHASES.forEach((p, i) => {
    const x = MX + i * (CW / PHASES.length);
    const ph = items.filter((it) => it.phase === p);
    const d = ph.filter((it) => it.status === "Completed").length;
    s.addShape(c.pres.ShapeType.roundRect, { x, y: 1.85, w, h: 0.75, fill: { color: C.navy }, line: { color: C.navy, width: 0 }, rectRadius: 0.06 });
    text(s, p, { x: x + 0.15, y: 1.9, w: w - 0.3, h: 0.4, fontSize: 16, bold: true, fontFace: HEAD, color: C.white });
    text(s, `${d} of ${ph.length} done`, { x: x + 0.15, y: 2.28, w: w - 0.3, h: 0.28, fontSize: 11, color: "D5E0EA" });
    card(c.pres, s, x, 2.7, w, 3.95);
    const list = ph.slice(0, 4);
    text(
      s,
      list.length
        ? list.map((it, j) => ({
            text: clip(it.text, 68),
            options: { bullet: true, breakLine: j < list.length - 1, paraSpaceAfter: 6, color: it.status === "Completed" ? C.mute : C.ink },
          }))
        : "None yet.",
      { x: x + 0.15, y: 2.85, w: w - 0.3, h: 3.7, fontSize: 12 },
    );
  });
}

function nextSlide(c: Ctx) {
  const { plan } = c;
  const open = plan.roadmap.filter((r) => r.status !== "Completed" && (r.phase === "30 Days" || r.phase === "90 Days")).slice(0, 7);
  const s = newSlide(c, {
    title: "Next steps: the next 90 days",
    takeaway: "Small, specific actions with a date beat a big plan with no start.",
    notes: "End by agreeing on two or three of these and the date of the next meeting. Write them down together; the client leaves with a list, not an impression.",
  });
  card(c.pres, s, MX, 1.85, 7.4, 4.8);
  text(s, "Commitments", { x: MX + 0.3, y: 2.0, w: 6.8, h: 0.4, fontSize: 18, bold: true, fontFace: HEAD, color: C.navy });
  const list = open.length ? open : [];
  list.forEach((r, i) => {
    const y = 2.6 + i * 0.58;
    s.addShape(c.pres.ShapeType.rect, { x: MX + 0.3, y: y + 0.04, w: 0.26, h: 0.26, fill: { color: C.white }, line: { color: C.slate, width: 1.25 } });
    text(s, `${r.phase}: ${clip(r.text, 80)}`, { x: MX + 0.75, y, w: 6.3, h: 0.45, fontSize: 14, valign: "middle" });
  });
  if (!list.length) text(s, "Build the roadmap to fill in the commitments.", { x: MX + 0.3, y: 2.7, w: 6.8, h: 0.4, fontSize: 14, color: C.slate });
  const rx = 8.35;
  const rw = W - MX - rx;
  card(c.pres, s, rx, 1.85, rw, 2.2);
  text(s, "FROM THE DISCOVERY MEETING", { x: rx + 0.25, y: 2.0, w: rw - 0.5, h: 0.25, fontSize: 10, bold: true, color: C.slate });
  text(s, plan.notes.discovery ? clip(plan.notes.discovery, 230) : "No meeting notes added.", { x: rx + 0.25, y: 2.35, w: rw - 0.5, h: 1.6, fontSize: 13, color: C.ink });
  card(c.pres, s, rx, 4.25, rw, 2.4);
  text(s, "HOW WE WILL KEEP GOING", { x: rx + 0.25, y: 4.4, w: rw - 0.5, h: 0.25, fontSize: 10, bold: true, color: C.slate });
  text(s, `Review: ${plan.client.cadence || "monthly"}.\nRefresh the SWOT and re-run the model once a year.`, { x: rx + 0.25, y: 4.75, w: rw - 0.5, h: 1.7, fontSize: 14 });
}

function closingSlide(c: Ctx) {
  const s = c.pres.addSlide({ masterName: "TITLE" });
  text(s, "Questions and discussion", { x: 0.9, y: 2.3, w: 9.6, h: 1.2, fontSize: 44, bold: true, fontFace: HEAD, color: C.white });
  text(s, `“${MISSION_VERSE.text}”`, { x: 0.9, y: 3.9, w: 9.4, h: 1.5, fontSize: 16, italic: true, color: "D5E0EA" });
  text(s, `${MISSION_VERSE.reference} (${MISSION_VERSE.version})`, { x: 0.9, y: 5.5, w: 6, h: 0.35, fontSize: 14, color: C.gold });
  text(s, c.plan.deck.presenter ? `${c.plan.deck.presenter}  ·  Daily Bread Wealth Management Track` : "Daily Bread Wealth Management Track", { x: 0.9, y: 6.6, w: 9, h: 0.3, fontSize: 12, color: "C9D6E2" });
  s.addNotes("Invite questions. If time allows, ask which one number or idea they will remember tomorrow.");
}

function disclosuresSlide(c: Ctx) {
  const { plan } = c;
  const s = newSlide(c, {
    title: "Assumptions and disclosures",
    notes: "Read this once, plainly. It protects the client and you: this is education, the projections are illustrations, and they should check specifics with a professional.",
  });
  const items = [
    "Education only. Nothing in this presentation is financial, tax, legal, or investment advice, and no advisory, fiduciary, or client relationship is created. It was prepared by a student as a learning exercise.",
    `Projections are hypothetical. They use a Monte Carlo model (2,000 simulated paths, ${plan.model.ret}% expected return, ${plan.model.vol}% volatility) and are not guaranteed; actual results will differ, and investments can lose value. Past performance does not guarantee future results.`,
    "Risk profiles come from a short questionnaire and the client's own figures. They start a conversation and are not a suitability determination.",
    "Account limits, deductions and tax rules shown reflect 2026 federal rules and change every year. Confirm details with a tax professional before acting. State taxes are not included unless stated.",
    "Toolkit tools use the numbers entered for the client, with simple assumptions. Where a tool shows starting example numbers, it says so. Estate planning pages are organizers, not legal documents.",
    "Any capital market assumptions are entered by the analyst with their source and are not a forecast. The client's information is confidential and was shared for this plan only.",
  ];
  text(s, items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1, paraSpaceAfter: 10 } })), { x: MX, y: 1.5, w: CW, h: 5.2, fontSize: 14 });
}

/* ---- Phase 1 slides: recommendation, balance sheet, goal status, risk, policy, methodology ---- */

/** The monthly saving that gives an 80% chance of reaching the target (null when there is no target or it is out of reach). */
function need80(c: Ctx): number | null {
  if (c.need80 !== undefined) return c.need80;
  const m = c.plan.model;
  c.need80 = c.facts.target > 0
    ? solveMonthlyFor(0.8, { initial: num(m.initial), monthly: 0, years: c.years, ret: num(m.ret), vol: num(m.vol), target: c.facts.target, inflation: num(m.inflation), real: !!m.real })
    : null;
  return c.need80;
}

function recommendations(c: Ctx): { head: string; detail: string; tag: string }[] {
  const { plan, facts } = c;
  const m = snapshotMetrics(plan);
  const out: { head: string; detail: string; tag: string }[] = [];
  const topDebt = [...plan.snapshot.liabilities].filter((l) => num(l.balance) > 0).sort((a, b) => num(b.apr) - num(a.apr))[0];
  if (topDebt && num(topDebt.apr) >= 8) {
    out.push({
      head: `Clear the ${topDebt.name.toLowerCase()} first`,
      detail: `At ${num(topDebt.apr)}% interest it is a guaranteed cost that no portfolio reliably beats. Send extra dollars to the ${money(num(topDebt.balance))} balance before investing more.`,
      tag: `${num(topDebt.apr)}% APR`,
    });
  } else if (m.emergencyMonths != null && m.emergencyMonths < 3) {
    out.push({
      head: "Build the cash cushion",
      detail: `Cash covers ${Math.round(m.emergencyMonths * 10) / 10} months of needs. Build to ${money(m.needs * 3)} to ${money(m.needs * 6)} before taking market risk with money needed soon.`,
      tag: `${Math.round(m.emergencyMonths * 10) / 10} months`,
    });
  } else {
    out.push({ head: "Protect the foundation", detail: "No high-interest debt or cushion gap stands out. Keep three to six months of needs in cash and the highest-interest debts at zero.", tag: "Steady" });
  }
  const cur = num(plan.model.monthly);
  const need = need80(c);
  if (facts.target > 0 && need != null && need > cur * 1.05) {
    out.push({
      head: `Raise saving to about ${money(need)} a month`,
      detail: `At ${money(cur)} a month the chance of reaching ${fmtK(facts.target)} is ${facts.sim.prob == null ? "n/a" : fmtPct(facts.sim.prob)}. About ${money(need)} gives an 80% chance; more time or a smaller target also closes the gap.`,
      tag: `${money(cur)} to ${money(need)}`,
    });
  } else if (facts.target > 0) {
    out.push({ head: `Keep saving ${money(cur)} a month`, detail: `That gives a ${facts.sim.prob == null ? "n/a" : fmtPct(facts.sim.prob)} chance of reaching ${fmtK(facts.target)}. Automate it so it happens first.`, tag: `${money(cur)} a month` });
  } else {
    out.push({ head: "Set a target and a monthly amount", detail: "Choose the goal the model should aim at, and a monthly amount, so the plan can say how likely it is to work.", tag: "Next" });
  }
  const risk = assessRisk(plan, facts.target);
  const profile = risk.inUse ?? plan.client.risk;
  out.push({
    head: `Invest in a ${profile.toLowerCase()} portfolio`,
    detail: `${allocationRange(profile)}. The plan assumes ${plan.model.ret}% a year with swings of about ${plan.model.vol}%.`,
    tag: profile,
  });
  const topics = plan.focus.map((id) => TOPICS.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t);
  if (topics.length) {
    out.push({ head: `Go deeper on ${topics.map((t) => topicLabel(t).toLowerCase()).slice(0, 2).join(" and ")}`, detail: TOPIC_WHY[topics[0].id] ?? "", tag: `${topics.length} focus area${topics.length > 1 ? "s" : ""}` });
  }
  return out.slice(0, 4);
}

function recommendationSlide(c: Ctx) {
  const recs = recommendations(c);
  const s = newSlide(c, {
    title: "Recommendation",
    takeaway: `${c.client}: ${recs.length} actions, in this order, matter most.`,
    notes:
      "State the recommendation first, then spend the rest of the meeting proving it. Each card is one action; the tag on the right is the number behind it. Ask which one the client would start this week. The slides that follow are the evidence for each card.",
  });
  recs.forEach((r, i) => {
    const w = (CW - 0.3) / 2;
    const x = MX + (i % 2) * (w + 0.3);
    const y = 1.85 + Math.floor(i / 2) * 2.3;
    card(c.pres, s, x, y, w, 2.15);
    s.addShape(c.pres.ShapeType.ellipse, { x: x + 0.25, y: y + 0.22, w: 0.5, h: 0.5, fill: { color: C.navy }, line: { color: C.navy, width: 0 } });
    text(s, String(i + 1), { x: x + 0.25, y: y + 0.22, w: 0.5, h: 0.5, fontSize: 16, bold: true, color: C.white, align: "center", valign: "middle" });
    text(s, r.head, { x: x + 0.95, y: y + 0.18, w: w - 1.2, h: 0.6, fontSize: 18, bold: true, fontFace: HEAD, color: C.navy, valign: "middle" });
    text(s, clip(r.detail, 230), { x: x + 0.3, y: y + 0.9, w: w - 0.6, h: 0.95, fontSize: 13, color: C.ink });
    text(s, r.tag.toUpperCase(), { x: x + 0.3, y: y + 1.78, w: w - 0.6, h: 0.25, fontSize: 10, bold: true, color: C.goldText });
  });
}

function balanceSheetSlide(c: Ctx) {
  const { plan } = c;
  const m = snapshotMetrics(plan);
  const word = (l: "good" | "ok" | "low" | null) => (l === "good" ? "On track" : l === "ok" ? "Watch" : l === "low" ? "Needs work" : "n/a");
  const s = newSlide(c, {
    title: "Balance sheet",
    takeaway:
      m.netWorth >= 0
        ? `Net worth is ${acct(m.netWorth)}: ${money(m.totalAssets)} owned against ${money(m.totalDebt)} owed${m.emergencyMonths != null && m.emergencyMonths < 3 ? ", with a thin cash cushion" : ""}.`
        : `Net worth is ${acct(m.netWorth)}: debts of ${money(m.totalDebt)} exceed what is owned.`,
    notes:
      "Every plan starts with the balance sheet. Net worth is what is owned minus what is owed. Then check four ratios advisors always look at: the cash cushion (months of needs), the savings rate, debt payments as a share of take-home, and the average interest rate on debt. The status words are rules of thumb, not laws.",
  });
  const byKind = (kinds: string[]) => plan.snapshot.assets.filter((a) => kinds.includes(a.kind)).reduce((t, a) => t + num(a.value), 0);
  const cats: [string, number][] = [
    ["Cash", byKind(["cash"])],
    ["Brokerage", byKind(["brokerage"])],
    ["Retirement", byKind(["retirement"])],
    ["Education", byKind(["education"])],
    ["Home", byKind(["home"])],
    ["Other assets", byKind(["other"])],
    ["Debts", m.totalDebt],
  ].filter(([, v]) => (v as number) > 0) as [string, number][];
  text(s, "What is owned, and what is owed", { x: MX, y: 1.85, w: 6.2, h: 0.3, fontSize: 12, bold: true, color: C.slate });
  if (cats.length) barChart(c, s, MX, 2.2, 6.2, 4.3, cats.map(([n]) => n), [{ name: "Amount", values: cats.map(([, v]) => Math.round(v)) }], { colors: cats.map(([n]) => (n === "Debts" ? C.red : C.navy)), legend: false });
  const rows: Row[] = [
    [th("Measure"), th("Result", "right"), th("Guideline"), th("Status")],
    [td("Net worth", { bold: true }), td(acct(m.netWorth), { align: "right", bold: true }), td("Positive and rising"), td(m.netWorth >= 0 ? "On track" : "Needs work", { bold: true, color: m.netWorth >= 0 ? C.green : C.red })],
    [td("Cash cushion", { bold: true }), td(m.emergencyMonths == null ? "n/a" : `${Math.round(m.emergencyMonths * 10) / 10} months`, { align: "right" }), td("3 to 6 months of needs"), td(word(m.light.emergency), { bold: true, color: m.light.emergency === "good" ? C.green : m.light.emergency === "low" ? C.red : C.goldText })],
    [td("Savings rate", { bold: true }), td(m.savingsRate == null ? "n/a" : fmtPct(m.savingsRate), { align: "right" }), td("15% to 20% of take-home"), td(word(m.light.savings), { bold: true, color: m.light.savings === "good" ? C.green : m.light.savings === "low" ? C.red : C.goldText })],
    [td("Debt payments", { bold: true }), td(m.debtShare == null ? "n/a" : fmtPct(m.debtShare), { align: "right" }), td("Under 15% of take-home"), td(word(m.light.debt), { bold: true, color: m.light.debt === "good" ? C.green : m.light.debt === "low" ? C.red : C.goldText })],
    [td("Average debt rate", { bold: true }), td(m.totalDebt > 0 ? `${Math.round(m.weightedApr * 10) / 10}%` : "none", { align: "right" }), td("Below expected return"), td(m.totalDebt === 0 ? "On track" : m.weightedApr >= 8 ? "Needs work" : "Watch", { bold: true, color: m.totalDebt === 0 ? C.green : m.weightedApr >= 8 ? C.red : C.goldText })],
    [td("Monthly surplus", { bold: true }), td(acct(m.surplus), { align: "right" }), td("Zero or more, with a job"), td(m.surplus >= 0 ? "On track" : "Needs work", { bold: true, color: m.surplus >= 0 ? C.green : C.red })],
  ];
  s.addTable(rows, { x: 7.1, y: 1.9, w: W - MX - 7.1, colW: [1.55, 1.15, 1.9, 1.03], rowH: 0.5, ...tableBase });
  exhibit(c, s, "Balance sheet and key ratios");
}

function goalStatusSlide(c: Ctx) {
  const rows = goalOutlooks(c.plan);
  const behind = rows.filter((r) => r.status === "Behind");
  const s = newSlide(c, {
    title: "Goal funding status",
    takeaway: behind.length
      ? `${behind.length} of ${rows.length} goals ${behind.length === 1 ? "is" : "are"} behind at the current saving${c.facts.monthlyNeed > 0 ? `; funding all of them on time would take about ${money(c.facts.monthlyNeed)} a month` : ""}.`
      : `All ${rows.length} goals are on track or close, at the saving shown.`,
    notes:
      "Goals are sorted into buckets: essential (must happen), important (should happen), aspirational (nice to have). Each goal's chance is simulated with assumptions that fit its time horizon: money needed within a year is assumed to sit in cash, so its return is low and steady; money for decades uses the plan's portfolio. A goal marked behind needs more saving, more time, or a smaller target.",
  });
  const order = { Essential: 0, Important: 1, Aspirational: 2 } as const;
  const sorted = [...rows].sort((a, b) => order[a.bucket] - order[b.bucket]).slice(0, 8);
  const table: Row[] = [[th("Goal"), th("Bucket"), th("Target", "right"), th("Saving / mo", "right"), th("Chance", "right"), th("Status")]];
  sorted.forEach((r) => {
    table.push([
      td(clip(r.goal.name, 34), { bold: true }),
      td(r.bucket),
      td(money(num(r.goal.amount)), { align: "right" }),
      td(money(r.monthly), { align: "right" }),
      td(r.prob == null ? "n/a" : fmtPct(r.prob), { align: "right" }),
      td(r.status, { bold: true, color: r.status === "On track" ? C.green : r.status === "Behind" ? C.red : C.goldText }),
    ]);
  });
  s.addTable(table, { x: MX, y: 1.9, w: 8.0, colW: [2.7, 1.2, 1.05, 1.15, 0.8, 1.1], rowH: 0.45, ...tableBase });
  text(s, "Chance of reaching each goal on time", { x: 8.9, y: 1.85, w: 3.85, h: 0.3, fontSize: 12, bold: true, color: C.slate });
  barChart(c, s, 8.9, 2.2, 3.85, 4.3, sorted.map((r) => clip(r.goal.name, 18)), [{ name: "Chance", values: sorted.map((r) => Math.round((r.prob ?? 0) * 100)) }], {
    horizontal: true,
    colors: [C.navy],
    legend: false,
    format: '0"%"',
    labelFormat: '0"%"',
  });
  exhibit(c, s, "Goal funding status, with horizon-appropriate assumptions");
}

function riskSlide(c: Ctx) {
  const a = assessRisk(c.plan, c.facts.target);
  const s = newSlide(c, {
    title: "Risk profile",
    takeaway: a.recommended
      ? `The plan uses a ${a.inUse?.toLowerCase()} profile: the more cautious of what ${c.client} will accept and can afford.`
      : "Risk tolerance and capacity have not been assessed yet.",
    notes:
      "Advisors separate three things. Tolerance is how the client feels about swings; capacity is how much loss they could absorb without derailing their life; required return is what the goals need. Build on the lowest of tolerance and capacity. If the goals need more than that, do not simply add risk: the honest options are to save more, allow more time, or lower the target.",
  });
  const rows: [string, number | null, string][] = [
    ["Risk tolerance", a.toleranceIndex, a.tolerance == null ? "not assessed" : `${Math.round(a.tolerance)} of 100`],
    ["Risk capacity", a.capacityIndex, a.capacity == null ? "not assessed" : `${Math.round(a.capacity)} of 100`],
    ["Return the goals require", a.requiredIndex == null ? null : Math.min(a.requiredIndex, RISK_PROFILES.length - 1), a.required == null ? "no target" : `${a.required}% a year${a.requiredIndex === RISK_PROFILES.length ? ", beyond every profile" : ""}`],
  ];
  const bw = (CW - 3.0) / RISK_PROFILES.length;
  rows.forEach(([label, idx, detail], r) => {
    const y = 1.95 + r * 1.2;
    text(s, label, { x: MX, y, w: 2.9, h: 0.35, fontSize: 15, bold: true, color: C.navy });
    text(s, detail, { x: MX, y: y + 0.38, w: 2.9, h: 0.3, fontSize: 12, color: C.slate });
    RISK_PROFILES.forEach((p, i) => {
      const on = idx === i;
      s.addShape(c.pres.ShapeType.rect, { x: MX + 3.0 + i * bw, y, w: bw - 0.08, h: 0.8, fill: { color: on ? C.navy : C.panel }, line: { color: on ? C.navy : C.line, width: 0.75 } });
      text(s, p.name, { x: MX + 3.0 + i * bw + 0.05, y: y + 0.05, w: bw - 0.18, h: 0.45, fontSize: 11, bold: on, color: on ? C.white : C.slate, align: "center", valign: "middle" });
      text(s, `${p.ret}% / ${p.vol}%`, { x: MX + 3.0 + i * bw + 0.05, y: y + 0.5, w: bw - 0.18, h: 0.25, fontSize: 10, color: on ? "D5E0EA" : C.mute, align: "center" });
    });
  });
  card(c.pres, s, MX, 5.6, CW, 1.0);
  text(s, a.gap ?? "Answer the risk questions to see how the goals compare with the risk the client can take.", { x: MX + 0.3, y: 5.72, w: CW - 0.6, h: 0.8, fontSize: 14, color: C.ink, valign: "middle" });
  text(s, "Each box shows the profile's assumed return and yearly swings.", { x: MX, y: 6.74, w: CW, h: 0.24, fontSize: 10, color: C.slate });
}

function ipsSlide(c: Ctx) {
  const ips = buildIps(c.plan, c.facts.target);
  const pick = ["return", "risk", "horizon", "liquidity", "taxes", "allocation", "rebalance"];
  const s = newSlide(c, {
    title: "Investment policy statement",
    takeaway: "The written policy that guides every decision: what we are trying to do, what we will and will not risk, and how we stay on course.",
    notes:
      "The investment policy statement is the document that keeps decisions consistent when markets are noisy. Walk the rows in order: return objective, risk objective, horizon, liquidity, taxes, allocation, and the rebalancing rule. Ask the client to confirm each. The full statement is in the plan and can be printed or copied.",
  });
  const rows: Row[] = [[th("Section"), th("Statement")]];
  pick.forEach((id) => {
    const sec = ips.find((x) => x.id === id)!;
    rows.push([td(sec.title, { bold: true, color: C.navy }), td(clip(sec.text, 330))]);
  });
  s.addTable(rows, { x: MX, y: 1.85, w: CW, colW: [2.1, CW - 2.1], ...tableBase, fontSize: 12 });
  exhibit(c, s, "Investment policy statement (summary)");
}

function methodologySlide(c: Ctx) {
  const s = newSlide(c, {
    title: "Methodology appendix",
    takeaway: "How each number in this presentation was worked out, so it can be checked.",
    notes: "Use this slide if someone asks how a number was produced. Every figure traces to client-provided inputs and the stated assumptions; none comes from a hidden source.",
  });
  const m = c.plan.model;
  const rows: Row[] = [
    [th("Number"), th("How it was worked out")],
    [td("Projection and chance of success", { bold: true }), td(`Monte Carlo: 2,000 simulated paths of monthly geometric Brownian motion at ${m.ret}% expected return and ${m.vol}% volatility, with contributions added at each month end. The chance is the share of paths ending at or above the target.`)],
    [td("Scenario comparison", { bold: true }), td("The same model re-run at four monthly savings amounts and three risk profiles (500 paths each, fixed seed), so rows and columns can be compared.")],
    [td("Goal funding status", { bold: true }), td("Each goal simulated over its own horizon with a return that fits it: cash-like for a year or less, a bond-heavy mix to five years, the plan's portfolio beyond that.")],
    [td("Risk profile", { bold: true }), td("Tolerance and capacity are scored 0 to 100 from the questionnaire and the snapshot, then mapped to five profiles; the required return is solved from the goals with no swings. The plan uses the lower of tolerance and capacity.")],
    [td("Taxes", { bold: true }), td("2026 federal brackets and standard deductions, with Social Security and Medicare where stated; state tax is excluded unless entered by hand.")],
    [td("Balance sheet ratios", { bold: true }), td("Cash cushion is cash divided by monthly needs; savings rate is monthly saving over take-home pay; debt payments are monthly payments over take-home pay.")],
  ];
  s.addTable(rows, { x: MX, y: 1.85, w: CW, colW: [2.6, CW - 2.6], ...tableBase, fontSize: 12 });
  text(s, "Not shown here: any proprietary data. Capital market assumptions, where used, are entered by the analyst with their source.", { x: MX, y: 6.74, w: CW, h: 0.24, fontSize: 10, color: C.slate });
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

const safe = (s: string) => s.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "Client";

/**
 * Builds the presentation. `only` (1-based) draws just that slide, which is how the slides are checked one at a time.
 * Returns the document: the caller saves it with `writeFile`, or `write` in a test.
 */
export async function buildDeck(input: DeckInput, opts: { only?: number } = {}): Promise<{ pres: PptxGenJS; filename: string; titles: string[] }> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE";
  pres.theme = { headFontFace: HEAD, bodyFontFace: BODY };
  pres.title = `Wealth plan for ${input.plan.client.name || "client"}`;
  pres.author = input.plan.deck.presenter || "Daily Bread Wealth Management Track";
  pres.company = "4 Rivers";

  pres.defineSlideMaster({
    title: "CONTENT",
    background: { color: C.white },
    objects: [
      { text: { text: "Daily Bread Wealth Management Track  ·  4 Rivers  ·  Education only, not advice", options: { x: MX, y: 7.05, w: 9, h: 0.28, fontSize: 10, fontFace: BODY, color: C.slate, margin: 0 } } },
    ],
    slideNumber: { x: W - MX - 1, y: 7.05, w: 1, h: 0.28, fontSize: 10, fontFace: BODY, color: C.slate, align: "right" },
  });
  pres.defineSlideMaster({ title: "TITLE", background: { color: C.deep } });

  const facts = planFacts(input.plan);
  const ctx: Ctx = {
    pres,
    plan: input.plan,
    input,
    client: input.plan.client.name.trim() || "the client",
    facts,
    years: facts.sim.years,
    ex: 0,
  };
  const outline = deckOutline(input);
  const draws: Record<string, (c: Ctx) => void> = {
    title: titleSlide,
    summary: summarySlide,
    recommendation: recommendationSlide,
    snapshot: balanceSheetSlide,
    goalstatus: goalStatusSlide,
    risk: riskSlide,
    ips: ipsSlide,
    methodology: methodologySlide,
    profile: profileSlide,
    vision: visionSlide,
    goals: goalsSlide,
    swot: swotSlide,
    strategy: strategySlide,
    model: modelSlide,
    scenarios: scenariosSlide,
    education: accountsSlide,
    cashflow: cashflowSlide,
    schedule: scheduleSlide,
    focus: focusSlide,
    roadmap: roadmapSlide,
    next: nextSlide,
    closing: closingSlide,
    disclosures: disclosuresSlide,
  };

  const titles: string[] = [];
  const included = outline.filter((o) => o.included);
  // The contents slide goes after the title and lists what is actually in the deck, with the page each part starts on.
  const contents: { title: string; page: number; tool?: boolean }[] = [];
  const steps: { title: string; run: () => void; toc?: string; tool?: boolean }[] = [];
  for (const o of included) {
    if (o.id === "title") {
      steps.push({ title: "Title", run: () => titleSlide(ctx) });
      steps.push({ title: "Contents", run: () => contentsSlide(ctx, contents) });
    } else if (o.kind === "tool" && o.tool) {
      const id = o.tool;
      steps.push({ title: o.title, run: () => toolSlide(ctx, id), toc: o.title, tool: true });
    } else if (o.id === "education") {
      // One section, three slides: the accounts, how a deposit grows in each, and the kinds of income.
      steps.push({ title: "Where each dollar can live", run: () => accountsSlide(ctx), toc: "Accounts and growth" });
      steps.push({ title: "The same $5,000 after tax", run: () => growthSlide(ctx) });
      steps.push({ title: "Trading time for money", run: () => incomeCompareSlide(ctx) });
    } else if (draws[o.id]) {
      const run = draws[o.id];
      steps.push({ title: o.title, run: () => run(ctx), toc: o.id === "closing" ? undefined : o.title });
    }
  }
  steps.forEach((st, i) => {
    if (st.toc) contents.push({ title: st.toc, page: i + 1, tool: st.tool });
  });
  let n = 0;
  for (const st of steps) {
    n += 1;
    if (opts.only && opts.only !== n) continue;
    st.run();
    titles.push(st.title);
  }
  return { pres, filename: `${safe(input.plan.client.name || "Client")}-Wealth-Plan.pptx`, titles };
}

/** How many slides the deck has, from its outline. */
export function deckSlideCount(items: OutlineItem[]): number {
  let n = 0;
  for (const o of items) {
    if (!o.included) continue;
    n += o.id === "education" ? 3 : 1;
    if (o.id === "title") n += 1; // the contents slide
  }
  return n;
}
