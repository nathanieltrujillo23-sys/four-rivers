/**
 * The drawing kit shared by every slide of the Wealth Tools presentation: the page frame, the colors (which a theme can change),
 * and small helpers for text, cards, tables, charts and numbered exhibits.
 */
import type PptxGenJS from "pptxgenjs";
import type { DeckChart } from "./wealthDeckTools";
import type { DeckInput } from "./wealthDeck";
import { fmtDate, fmtUsd, type planFacts, type WealthPlan } from "./wealthMath";

export const W = 13.333;
export const MX = 0.6;
export const CW = W - 2 * MX;
export const HEAD = "Cambria";
export const BODY = "Calibri";

export const C = {
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
export const CHART_COLORS = [C.navy, C.gold, C.green, C.red, C.blue, C.mute];

export type Slide = PptxGenJS.Slide;
export type Pres = PptxGenJS;

export const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
export const money = fmtUsd;
export const axisFormat = (max: number) => (max >= 2_000_000 ? '$0.0,,"M"' : max >= 20_000 ? '$#,##0,"K"' : "$#,##0");

export interface Ctx {
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

export function text(s: Slide, t: string | PptxGenJS.TextProps[], o: PptxGenJS.TextPropsOptions) {
  // A bullet hangs 18pt, close to its text, instead of the library's wider default.
  if (Array.isArray(t)) t = t.map((r) => (r.options?.bullet === true ? { ...r, options: { ...r.options, bullet: { indent: 18 } } } : r));
  s.addText(t, { isTextBox: true, fontFace: BODY, color: C.ink, margin: 0, valign: "top", ...o });
}

export function card(s: Ctx["pres"], slide: Slide, x: number, y: number, w: number, h: number, fill: string = C.panel) {
  slide.addShape(s.ShapeType.roundRect, { x, y, w, h, fill: { color: fill }, line: { color: C.line, width: 0.75 }, rectRadius: 0.06 });
}

export function kpi(c: Ctx, s: Slide, x: number, y: number, w: number, label: string, value: string, sub?: string, tone: "navy" | "green" | "red" | "gold" = "navy") {
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
export function header(s: Slide, title: string, takeaway?: string) {
  if (takeaway) {
    text(s, title.toUpperCase(), { x: MX, y: 0.3, w: CW, h: 0.26, fontSize: 11, bold: true, color: C.goldText, charSpacing: 1.5 });
    text(s, takeaway, { x: MX, y: 0.58, w: CW, h: 0.95, fontSize: 24, bold: true, fontFace: HEAD, color: C.navy, valign: "top" });
  } else {
    text(s, title, { x: MX, y: 0.4, w: CW, h: 0.6, fontSize: 28, bold: true, fontFace: HEAD, color: C.navy, valign: "middle" });
  }
}

/** Numbers an exhibit and gives its source and date, as an advisor's deck does under every chart or table. */
export function exhibit(c: Ctx, s: Slide, what: string, source = "4 Rivers Wealth Tools, from client-provided figures and the analyst's assumptions") {
  c.ex += 1;
  const when = c.plan.deck.meetingDate ? fmtDate(c.plan.deck.meetingDate) : "";
  text(s, `Exhibit ${c.ex}: ${what}. Source: ${source}${when ? `; as of ${when}` : ""}.`, { x: MX, y: 6.74, w: CW, h: 0.24, fontSize: 10, color: C.slate });
}

/** Dollars the way a finance table shows them: a loss or shortfall in parentheses. */
export const acct = (n: number) => (n < 0 ? `(${money(Math.abs(n))})` : money(n));

export function newSlide(c: Ctx, o: { title: string; takeaway?: string; notes?: string; section?: string }): Slide {
  const s = c.pres.addSlide({ masterName: "CONTENT", sectionTitle: o.section });
  header(s, o.title, o.takeaway);
  if (o.notes) s.addNotes(o.notes);
  return s;
}

export type Row = PptxGenJS.TableRow;
export const th = (t: string, align: "left" | "right" | "center" = "left") => ({
  text: t,
  options: { bold: true, color: C.white, fill: { color: C.navy }, align, fontFace: BODY, fontSize: 12 },
});
export const td = (t: string, o: { bold?: boolean; color?: string; align?: "left" | "right" | "center"; fill?: string; italic?: boolean } = {}) => ({
  text: t,
  options: { fontFace: BODY, fontSize: 12, color: o.color ?? C.ink, bold: o.bold, italic: o.italic, align: o.align ?? "left", fill: o.fill ? { color: o.fill } : undefined },
});
export const tableBase: Pick<PptxGenJS.TableProps, "border" | "margin" | "valign"> = {
  border: { type: "solid", color: C.line, pt: 0.75 },
  margin: [0.05, 0.1, 0.05, 0.1],
  valign: "middle",
};

export function lineChart(c: Ctx, s: Slide, x: number, y: number, w: number, h: number, labels: string[], series: { name: string; values: number[]; dash?: boolean }[], colors: string[]) {
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

export function barChart(
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

export function doughnut(c: Ctx, s: Slide, x: number, y: number, w: number, h: number, labels: string[], values: number[], colors: string[]) {
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

export function deckChart(c: Ctx, s: Slide, ch: DeckChart, x: number, y: number, w: number, h: number) {
  text(s, ch.title, { x, y, w, h: 0.3, fontSize: 12, bold: true, color: C.slate });
  const top = y + 0.32;
  const hh = h - 0.32;
  if (ch.kind === "line") lineChart(c, s, x, top, w, hh, ch.labels, ch.series.map((v, i) => ({ ...v, dash: i > 0 && /target/i.test(v.name) })), CHART_COLORS);
  else if (ch.kind === "bar") barChart(c, s, x, top, w, hh, ch.labels, ch.series, { colors: [C.navy] });
  else doughnut(c, s, x, top, w, hh, ch.labels, ch.series[0].values, CHART_COLORS);
}


/** The analyst's own words about a slide, set off in a box with a gold edge. Nothing is drawn when there are none. */
export function noteBox(c: Ctx, s: Slide, note: string | undefined, x: number, y: number, w: number, h: number, label = "Our recommendation") {
  const t = (note ?? "").trim();
  if (!t) return;
  card(c.pres, s, x, y, w, h, C.white);
  s.addShape(c.pres.ShapeType.rect, { x, y, w: 0.08, h, fill: { color: C.gold }, line: { color: C.gold, width: 0 } });
  text(s, label.toUpperCase(), { x: x + 0.25, y: y + 0.1, w: w - 0.4, h: 0.22, fontSize: 10, bold: true, color: C.goldText, charSpacing: 1 });
  text(s, clip(t, 420), { x: x + 0.25, y: y + 0.36, w: w - 0.4, h: h - 0.44, fontSize: 12, color: C.ink });
}
