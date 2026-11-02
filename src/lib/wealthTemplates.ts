/**
 * Style templates for the presentation. A template is a whole look: fonts, the shape of the title and closing slides, how each slide's
 * heading is drawn, the style of cards and tables, and a starting palette (which can still be changed). They are the presenter's own
 * designs in the general conventions of wealth management decks; none copies a firm's logo, colors or layout.
 */
import type { ThemeChoice } from "./wealthTheme";

export type TitleStyle = "dark" | "light" | "split";
export type HeaderStyle = "kicker" | "band" | "rule";
export type CardStyle = "panel" | "outline" | "flat";
export type TableHead = "fill" | "rule";

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
  /** Fonts are named in the preview as well. */
  fontNote: string;
}

export const TEMPLATES: DeckTemplate[] = [
  {
    id: "daily-bread",
    name: "Daily Bread",
    blurb: "The track's own look: deep navy and gold, a dark title slide with four rings, topic label over a headline.",
    palette: { id: "classic", primary: "1F3F5E", accent: "C9A24B" },
    head: "Cambria",
    body: "Calibri",
    title: "dark",
    art: "rings",
    header: "kicker",
    cards: "panel",
    tableHead: "fill",
    fontNote: "Cambria and Calibri",
  },
  {
    id: "private-bank",
    name: "Private Bank",
    blurb: "Quiet and traditional: forest green and brass, a light title slide, serif headlines with a fine rule, and ruled tables.",
    palette: { id: "heritage", primary: "1E4D3A", accent: "B8963E" },
    head: "Georgia",
    body: "Calibri",
    title: "light",
    art: "rings",
    header: "rule",
    cards: "outline",
    tableHead: "rule",
    fontNote: "Georgia and Calibri",
  },
  {
    id: "research-note",
    name: "Research Note",
    blurb: "Like a research report: a solid color band carries each headline, with a split title slide and filled table headers.",
    palette: { id: "classic", primary: "1F3F5E", accent: "C9A24B" },
    head: "Cambria",
    body: "Calibri",
    title: "split",
    art: "rings",
    header: "band",
    cards: "outline",
    tableHead: "fill",
    fontNote: "Cambria and Calibri",
  },
  {
    id: "modern-advisory",
    name: "Modern Advisory",
    blurb: "Clean and contemporary: teal with an orange accent, all sans-serif, soft flat cards, and a split title slide.",
    palette: { id: "modern", primary: "0F4C5C", accent: "E36414" },
    head: "Arial",
    body: "Arial",
    title: "split",
    art: "rings",
    header: "kicker",
    cards: "flat",
    tableHead: "fill",
    fontNote: "Arial",
  },
  {
    id: "boutique",
    name: "Boutique Minimal",
    blurb: "Restrained and spare: charcoal and copper, lots of white, thin rules, and flat cards. Lets the numbers speak.",
    palette: { id: "slate", primary: "2D3A45", accent: "B87333" },
    head: "Georgia",
    body: "Arial",
    title: "light",
    art: "rings",
    header: "rule",
    cards: "flat",
    tableHead: "rule",
    fontNote: "Georgia and Arial",
  },
  {
    id: "family-office",
    name: "Family Office",
    blurb: "Rich and private: deep plum with soft gold, a dark title slide, topic labels over headlines, and tinted cards.",
    palette: { id: "plum", primary: "4A2C59", accent: "D4A24C" },
    head: "Cambria",
    body: "Calibri",
    title: "dark",
    art: "arcs",
    header: "kicker",
    cards: "panel",
    tableHead: "fill",
    fontNote: "Cambria and Calibri",
  },
];

export const DEFAULT_TEMPLATE = TEMPLATES[0].id;

export function templateOf(id: unknown): DeckTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
export const normalizeTemplateId = (v: unknown): string => templateOf(v).id;
