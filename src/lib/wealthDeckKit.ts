/**
 * The drawing kit shared by every slide of the Wealth Tools presentation: the page frame, the colors (which a theme can change),
 * and small helpers for text, cards, tables, charts and numbered exhibits.
 */
import type PptxGenJS from "pptxgenjs";
import type { DeckChart } from "./wealthDeckTools";
import type { DeckInput } from "./wealthDeck";
import type { CardStyle, DeckTemplate, FooterStyle, HeaderStyle, KickerStyle, KpiStyle, PageBg, Rail, TableHead, TitleStyle } from "./wealthTemplates";
import { mix, type Palette } from "./wealthTheme";
import { fmtDate, fmtUsd, type planFacts, type WealthPlan } from "./wealthMath";

export const W = 13.333;
export const MX = 0.6;
export const CW = W - 2 * MX;
// The fonts and the look of the template in use; applyTemplate sets them at the start of each build.
export let HEAD = "Cambria";
export let BODY = "Calibri";
export const TPL: {
  title: TitleStyle; art: "rings" | "arcs"; header: HeaderStyle; cards: CardStyle; tableHead: TableHead;
  bg: PageBg; rail: Rail; kicker: KickerStyle; center: boolean; kpi: KpiStyle; footer: FooterStyle; scale: number; lightHead: boolean;
} = { title: "dark", art: "rings", header: "kicker", cards: "panel", tableHead: "fill", bg: "white", rail: "none", kicker: "caps", center: false, kpi: "card", footer: "text", scale: 1, lightHead: false };

export function applyTemplate(t: DeckTemplate) {
  HEAD = t.head;
  BODY = t.body;
  Object.assign(TPL, { title: t.title, art: t.art, header: t.header, cards: t.cards, tableHead: t.tableHead, bg: t.bg, rail: t.rail, kicker: t.kicker, center: t.center, kpi: t.kpi, footer: t.footer, scale: t.scale, lightHead: !!t.lightHead });
}

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

/** Switches the deck's colors to a theme. Called once at the start of each build, before any slide is drawn. */
export function applyPalette(p: Palette) {
  Object.assign(C, p);
  CHART_COLORS[0] = C.navy;
  CHART_COLORS[1] = C.gold;
}

/** The color of a content page for the template in use. */
export function pageColor(): string {
  if (TPL.bg === "ivory") return mix("FFFFFF", C.gold, 0.1);
  if (TPL.bg === "mist") return mix("FFFFFF", C.navy, 0.045);
  if (TPL.bg === "paper") return "F9F9F9";
  return C.white;
}

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
  /** Anticipated questions for the slide about to be drawn; added to its speaker notes. */
  questions?: string;
}

/* ---- small drawing helpers ---- */

export function text(s: Slide, t: string | PptxGenJS.TextProps[], o: PptxGenJS.TextPropsOptions) {
  // A bullet hangs 18pt, close to its text, instead of the library's wider default.
  if (Array.isArray(t)) t = t.map((r) => (r.options?.bullet === true ? { ...r, options: { ...r.options, bullet: { indent: 18 } } } : r));
  s.addText(t, { isTextBox: true, fontFace: BODY, color: C.ink, margin: 0, valign: "top", ...o });
}

export function card(s: Ctx["pres"], slide: Slide, x: number, y: number, w: number, h: number, fill: string = C.panel) {
  // A card the template has softened: outlined cards are white with a fine line, flat cards are tinted with no line.
  const t = TPL.cards;
  const color = t === "outline" && fill === C.panel ? C.white : fill;
  const line = t === "flat" && fill === C.panel ? { color: fill, width: 0 } : { color: C.line, width: t === "outline" ? 1 : 0.75 };
  if (t === "panel") slide.addShape(s.ShapeType.roundRect, { x, y, w, h, fill: { color }, line, rectRadius: 0.06 });
  else slide.addShape(s.ShapeType.rect, { x, y, w, h, fill: { color }, line });
}

export function kpi(c: Ctx, s: Slide, x: number, y: number, w: number, label: string, value: string, sub?: string, tone: "navy" | "green" | "red" | "gold" = "navy") {
  const color = tone === "green" ? C.green : tone === "red" ? C.red : tone === "gold" ? C.goldText : C.navy;
  if (TPL.kpi === "bar") {
    // An accent bar beside the figure, no box.
    s.addShape(c.pres.ShapeType.rect, { x, y: y + 0.05, w: 0.07, h: 1.05, fill: { color: tone === "navy" ? C.gold : color }, line: { color: tone === "navy" ? C.gold : color, width: 0 } });
    text(s, label.toUpperCase(), { x: x + 0.25, y: y + 0.1, w: w - 0.3, h: 0.25, fontSize: 10, bold: true, color: C.slate });
    text(s, value, { x: x + 0.25, y: y + 0.36, w: w - 0.3, h: 0.5, fontSize: 26, bold: true, fontFace: HEAD, color });
    if (sub) text(s, clip(sub, 44), { x: x + 0.25, y: y + 0.86, w: w - 0.3, h: 0.25, fontSize: 11, color: C.slate });
    return;
  }
  if (TPL.kpi === "plain") {
    // Just the figure over a thin rule, set apart by space.
    s.addShape(c.pres.ShapeType.rect, { x, y: y + 0.02, w, h: 0.02, fill: { color: C.navy }, line: { color: C.navy, width: 0 } });
    text(s, label.toUpperCase(), { x, y: y + 0.12, w, h: 0.25, fontSize: 9, color: C.slate, charSpacing: 1 });
    text(s, value, { x, y: y + 0.4, w, h: 0.5, fontSize: 24, fontFace: HEAD, bold: false, color });
    if (sub) text(s, clip(sub, 44), { x, y: y + 0.88, w, h: 0.25, fontSize: 11, color: C.slate });
    return;
  }
  card(c.pres, s, x, y, w, 1.15);
  text(s, label.toUpperCase(), { x: x + 0.18, y: y + 0.12, w: w - 0.36, h: 0.25, fontSize: 10, bold: true, color: C.slate });
  text(s, value, { x: x + 0.18, y: y + 0.38, w: w - 0.36, h: 0.45, fontSize: 24, bold: true, fontFace: HEAD, color });
  if (sub) text(s, clip(sub, 44), { x: x + 0.18, y: y + 0.84, w: w - 0.36, h: 0.25, fontSize: 11, color: C.slate });
}

/**
 * The slide's topic as a small label, and the takeaway as the title: an advisor's slide states its conclusion, not just its subject.
 * A slide with no takeaway shows its topic as the title.
 */
export function header(pres: Ctx["pres"], s: Slide, title: string, takeaway?: string) {
  const band = TPL.header === "band";
  const rule = TPL.header === "rule";
  const align = TPL.center ? "center" : "left";
  if (band) s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: W, h: 1.55, fill: { color: C.navy }, line: { color: C.navy, width: 0 } });
  const ink = band ? C.white : C.navy;
  const kickerColor = band ? C.gold : C.goldText;
  const size = (takeaway ? 24 : 28) * TPL.scale;
  const bold = !rule && TPL.scale >= 1 && !TPL.lightHead;
  const tx = TPL.rail === "left" ? MX + 0.15 : MX;
  const tw = TPL.rail === "left" ? CW - 0.15 : CW;
  if (takeaway) {
    if (TPL.kicker === "pill" && !band) {
      // A filled pill sized to its words.
      const label = title.toUpperCase();
      const pw = Math.min(tw, 0.45 + label.length * 0.095);
      const px = TPL.center ? tx + (tw - pw) / 2 : tx;
      s.addShape(pres.ShapeType.roundRect, { x: px, y: 0.27, w: pw, h: 0.3, fill: { color: C.navy }, line: { color: C.navy, width: 0 }, rectRadius: 0.15 });
      text(s, label, { x: px, y: 0.27, w: pw, h: 0.3, fontSize: 10, bold: true, color: C.white, charSpacing: 1, align: "center", valign: "middle" });
    } else {
      if (TPL.kicker === "plain") text(s, title, { x: tx, y: 0.3, w: tw, h: 0.26, fontSize: 13, color: C.slate, align });
      else text(s, title.toUpperCase(), { x: tx, y: 0.3, w: tw, h: 0.26, fontSize: 11, bold: true, color: kickerColor, charSpacing: 1.5, align });
    }
    text(s, takeaway, { x: tx, y: 0.62, w: tw, h: 0.95, fontSize: size, bold, fontFace: HEAD, color: ink, valign: "top", align });
  } else {
    text(s, title, { x: tx, y: band ? 0.45 : 0.4, w: tw, h: 0.6, fontSize: size, bold, fontFace: HEAD, color: ink, valign: "middle", align });
  }
  if (rule) {
    const ruleX = TPL.center ? MX + (CW - 1.1) / 2 : MX;
    s.addShape(pres.ShapeType.rect, { x: MX, y: 1.58, w: CW, h: 0.012, fill: { color: C.line }, line: { color: C.line, width: 0 } });
    s.addShape(pres.ShapeType.rect, { x: ruleX, y: 1.555, w: 1.1, h: 0.05, fill: { color: C.gold }, line: { color: C.gold, width: 0 } });
  }
}

/** The shapes and footer that every content page carries, for the template in use. */
export function masterObjects(): PptxGenJS.SlideMasterProps["objects"] {
  const objs: NonNullable<PptxGenJS.SlideMasterProps["objects"]> = [];
  const foot = "Daily Bread Wealth Management Track  ·  4 Rivers  ·  Education only, not advice";
  const rect = (x: number, y: number, w: number, h: number, color: string) => ({ rect: { x, y, w, h, fill: { color }, line: { color, width: 0 } } });
  if (TPL.rail === "left") objs.push(rect(0, 0, 0.16, 7.5, C.gold));
  if (TPL.rail === "top") objs.push(rect(0, 0, W, 0.12, C.navy));
  if (TPL.rail === "tab") objs.push(rect(MX, 0, 1.3, 0.12, C.gold));
  if (TPL.footer === "band") {
    objs.push(rect(0, 7.02, W, 0.48, C.navy));
    objs.push({ text: { text: foot, options: { x: MX, y: 7.1, w: 9, h: 0.3, fontSize: 10, fontFace: BODY, color: C.white, margin: 0 } } });
  } else if (TPL.footer === "rule") {
    objs.push(rect(MX, 7.0, CW, 0.012, C.line));
    objs.push({ text: { text: foot, options: { x: MX, y: 7.08, w: 9, h: 0.28, fontSize: 10, fontFace: BODY, color: C.slate, margin: 0 } } });
  } else if (TPL.footer === "top") {
    // The running title sits across the top edge with the page number; the foot keeps one small line.
    objs.push({ text: { text: "Daily Bread", options: { x: MX, y: 0.1, w: 4, h: 0.2, fontSize: 9, fontFace: BODY, color: C.navy, margin: 0 } } });
    objs.push({ text: { text: foot, options: { x: MX, y: 7.12, w: 9, h: 0.25, fontSize: 9, fontFace: BODY, color: C.slate, margin: 0 } } });
  } else if (TPL.footer === "text") {
    objs.push({ text: { text: foot, options: { x: MX, y: 7.05, w: 9, h: 0.28, fontSize: 10, fontFace: BODY, color: C.slate, margin: 0 } } });
  } else {
    objs.push({ text: { text: "Education only, not advice", options: { x: MX, y: 7.08, w: 4, h: 0.25, fontSize: 8, fontFace: BODY, color: C.mute, margin: 0 } } });
  }
  return objs;
}

/** Where the page number sits, and its color, for the footer in use. */
export function slideNumberProps(): { x: number; y: number; w: number; h: number; fontSize: number; fontFace: string; color: string; align: "right" } {
  const band = TPL.footer === "band";
  return { x: W - MX - 1, y: band ? 7.1 : TPL.footer === "top" ? 0.1 : TPL.footer === "minimal" ? 7.08 : 7.05, w: 1, h: 0.28, fontSize: TPL.footer === "top" ? 9 : 10, fontFace: BODY, color: band ? C.white : C.slate, align: "right" };
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
  header(c.pres, s, o.title, o.takeaway);
  const notes = [o.notes, c.questions].filter(Boolean).join("\n\n");
  if (notes) s.addNotes(notes);
  return s;
}

export type Row = PptxGenJS.TableRow;
type Border4 = [PptxGenJS.BorderProps, PptxGenJS.BorderProps, PptxGenJS.BorderProps, PptxGenJS.BorderProps];
export const th = (t: string, align: "left" | "right" | "center" = "left") =>
  TPL.tableHead === "rule"
    ? { text: t, options: { bold: true, color: C.navy, align, fontFace: BODY, fontSize: 12, border: [{ type: "none" }, { type: "none" }, { type: "solid", color: C.navy, pt: 1.5 }, { type: "none" }] as Border4 } }
    : { text: t, options: { bold: true, color: C.white, fill: { color: C.navy }, align, fontFace: BODY, fontSize: 12 } };
export const td = (t: string, o: { bold?: boolean; color?: string; align?: "left" | "right" | "center"; fill?: string; italic?: boolean } = {}) => ({
  text: t,
  options: { fontFace: BODY, fontSize: 12, color: o.color ?? C.ink, bold: o.bold, italic: o.italic, align: o.align ?? "left", fill: o.fill ? { color: o.fill } : undefined },
});
export const tableBase = {
  // A getter so the border follows the theme in use when each table is drawn.
  get border(): PptxGenJS.BorderProps | Border4 {
    // Ruled tables keep only the horizontal lines.
    if (TPL.tableHead === "rule") return [{ type: "none" }, { type: "none" }, { type: "solid", color: C.line, pt: 0.75 }, { type: "none" }] as Border4;
    return { type: "solid", color: C.line, pt: 0.75 };
  },
  margin: [0.05, 0.1, 0.05, 0.1] as [number, number, number, number],
  valign: "middle" as const,
} satisfies Pick<PptxGenJS.TableProps, "border" | "margin" | "valign">;

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
export function noteBox(c: Ctx, s: Slide, note: string | undefined, x: number, y: number, w: number, h: number, label = "For discussion") {
  const t = (note ?? "").trim();
  if (!t) return;
  card(c.pres, s, x, y, w, h, C.white);
  s.addShape(c.pres.ShapeType.rect, { x, y, w: 0.08, h, fill: { color: C.gold }, line: { color: C.gold, width: 0 } });
  text(s, label.toUpperCase(), { x: x + 0.25, y: y + 0.1, w: w - 0.4, h: 0.22, fontSize: 10, bold: true, color: C.goldText, charSpacing: 1 });
  text(s, clip(t, 420), { x: x + 0.25, y: y + 0.36, w: w - 0.4, h: h - 0.44, fontSize: 12, color: C.ink });
}
