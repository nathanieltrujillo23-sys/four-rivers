/**
 * Style templates for the presentation. A template is a whole look: fonts, the shape of the title and closing slides, how each slide's
 * heading is drawn, the style of cards and tables, and a starting palette (which can still be changed). They are the presenter's own
 * designs in the general conventions of wealth management decks; none copies a firm's logo, colors or layout.
 */
import type { ThemeChoice } from "./wealthTheme";

/** The title and closing slides: dark with art, a light accent bar, a split panel, a centered double frame, geometric blocks, or spare and low. */
export type TitleStyle = "dark" | "light" | "split" | "frame" | "blocks" | "minimal";
export type HeaderStyle = "kicker" | "band" | "rule";
export type CardStyle = "panel" | "outline" | "flat";
export type TableHead = "fill" | "rule";
/** The page: plain white, warm ivory, or a faint tint of the main color. */
export type PageBg = "white" | "ivory" | "mist";
/** A decoration on every content slide: none, a bar down the left edge, a bar across the top, or a small tab in the corner. */
export type Rail = "none" | "left" | "top" | "tab";
/** The topic label over a headline: small capitals, or a filled pill. */
export type KickerStyle = "caps" | "pill";
/** How a key number is shown: in a box, beside an accent bar, or plain over a thin rule. */
export type KpiStyle = "card" | "bar" | "plain";
/** The foot of each content slide. */
export type FooterStyle = "text" | "rule" | "band" | "minimal";

export interface DeckTemplate {
  id: string;
  name: string;
  blurb: string;
  /** The palette the template starts with. */
  palette: ThemeChoice;
  head: string;
  body: string;
  title: TitleStyle;
  /** The picture on a dark title slide: the track's four rings, or two quiet arcs. */
  art: "rings" | "arcs";
  header: HeaderStyle;
  cards: CardStyle;
  tableHead: TableHead;
  bg: PageBg;
  rail: Rail;
  kicker: KickerStyle;
  /** Headings centered on the page, or left. */
  center: boolean;
  kpi: KpiStyle;
  footer: FooterStyle;
  /** Headline size relative to the usual, so one template can run lighter and another heavier. */
  scale: number;
  /** Fonts are named in the preview as well. */
  fontNote: string;
}

export const TEMPLATES: DeckTemplate[] = [
  {
    id: "daily-bread",
    name: "Daily Bread",
    blurb: "The track's own look: deep navy and gold, a dark title slide with four rings, topic label over a headline, boxed key numbers.",
    palette: { id: "classic", primary: "1F3F5E", accent: "C9A24B" },
    head: "Cambria",
    body: "Calibri",
    title: "dark",
    art: "rings",
    header: "kicker",
    cards: "panel",
    tableHead: "fill",
    bg: "white",
    rail: "none",
    kicker: "caps",
    center: false,
    kpi: "card",
    footer: "text",
    scale: 1,
    fontNote: "Cambria and Calibri",
  },
  {
    id: "private-bank",
    name: "Private Bank",
    blurb: "Formal and traditional: warm ivory pages, a centered double-framed title, centered serif headings over a fine rule, ruled tables, numbers set plain.",
    palette: { id: "heritage", primary: "1E4D3A", accent: "B8963E" },
    head: "Georgia",
    body: "Calibri",
    title: "frame",
    art: "rings",
    header: "rule",
    cards: "outline",
    tableHead: "rule",
    bg: "ivory",
    rail: "none",
    kicker: "caps",
    center: true,
    kpi: "plain",
    footer: "rule",
    scale: 0.95,
    fontNote: "Georgia and Calibri",
  },
  {
    id: "research-note",
    name: "Research Note",
    blurb: "Like a research report: a solid color band carries each headline, a color bar runs across the foot, a split title slide, in Times and Arial.",
    palette: { id: "classic", primary: "1F3F5E", accent: "C9A24B" },
    head: "Times New Roman",
    body: "Arial",
    title: "split",
    art: "rings",
    header: "band",
    cards: "outline",
    tableHead: "fill",
    bg: "white",
    rail: "none",
    kicker: "caps",
    center: false,
    kpi: "card",
    footer: "band",
    scale: 1,
    fontNote: "Times New Roman and Arial",
  },
  {
    id: "modern-advisory",
    name: "Modern Advisory",
    blurb: "Bold and contemporary: a title built from color blocks, a colored bar down every page, topic labels as pills, key numbers beside an accent bar, in Trebuchet.",
    palette: { id: "modern", primary: "0F4C5C", accent: "E36414" },
    head: "Trebuchet MS",
    body: "Trebuchet MS",
    title: "blocks",
    art: "rings",
    header: "kicker",
    cards: "flat",
    tableHead: "fill",
    bg: "mist",
    rail: "left",
    kicker: "pill",
    center: false,
    kpi: "bar",
    footer: "text",
    scale: 1.05,
    fontNote: "Trebuchet MS",
  },
  {
    id: "boutique",
    name: "Boutique Minimal",
    blurb: "Spare and quiet: white space, a low-set title, light headings over a hairline, plain numbers and ruled tables, and almost nothing at the foot.",
    palette: { id: "slate", primary: "2D3A45", accent: "B87333" },
    head: "Century Gothic",
    body: "Century Gothic",
    title: "minimal",
    art: "rings",
    header: "rule",
    cards: "flat",
    tableHead: "rule",
    bg: "white",
    rail: "none",
    kicker: "caps",
    center: false,
    kpi: "plain",
    footer: "minimal",
    scale: 0.9,
    fontNote: "Century Gothic",
  },
  {
    id: "family-office",
    name: "Family Office",
    blurb: "Rich and private: a dark title with two quiet arcs, ivory pages with a gold tab in the corner, tinted cards, rules at the foot, in Palatino.",
    palette: { id: "plum", primary: "4A2C59", accent: "D4A24C" },
    head: "Palatino Linotype",
    body: "Palatino Linotype",
    title: "dark",
    art: "arcs",
    header: "kicker",
    cards: "panel",
    tableHead: "fill",
    bg: "ivory",
    rail: "tab",
    kicker: "caps",
    center: false,
    kpi: "card",
    footer: "rule",
    scale: 1,
    fontNote: "Palatino Linotype",
  },
];

export const DEFAULT_TEMPLATE = TEMPLATES[0].id;

export function templateOf(id: unknown): DeckTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
export const normalizeTemplateId = (v: unknown): string => templateOf(v).id;
