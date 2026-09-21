/**
 * 4 Rivers — tone configuration.
 *
 * This is the single source of truth for the visual direction (palette, type,
 * iconography, the river/flow motif). The design tone for v1 is deliberately
 * "warm, scripture-forward" — earthy clay and olive on parchment, with deep
 * water blues for the river motif — but that decision is NOT final.
 *
 * To re-skin the app, change values here and the matching CSS custom properties
 * in `src/index.css` (the `@theme` block). Components read colors through
 * Tailwind tokens / CSS vars, never as hardcoded hex, so a tone change should
 * not require touching component files.
 *
 * The `rivers` array also drives per-river accent colors used by the flowing
 * progress indicator (`RiverProgress`) and each river's tracker screen.
 */

export type RiverNumber = 1 | 2 | 3 | 4;

export interface RiverTheme {
  number: RiverNumber;
  /** Machine key, used in routes, data rows, and content lookups. */
  key: "income" | "saving" | "investing" | "giving";
  title: string;
  /** One-line principle summary for cards and nav. */
  principle: string;
  /** The Eden river this stream is named for (Genesis 2:10–14). */
  edenRiver: string;
  /** Accent color for this river — used in the progress flow + tracker UI. */
  accent: string;
  accentSoft: string;
}

export const RIVERS: RiverTheme[] = [
  {
    number: 1,
    key: "income",
    title: "Multiple Streams of Income",
    principle: "Cultivate more than one source of provision.",
    edenRiver: "Pishon",
    accent: "#2f6f4f", // headwater green
    accentSoft: "#e4efe6",
  },
  {
    number: 2,
    key: "saving",
    title: "Saving",
    principle: "Store in advance for what is ahead.",
    edenRiver: "Gihon",
    accent: "#1f6f8b", // still water
    accentSoft: "#e0eef2",
  },
  {
    number: 3,
    key: "investing",
    title: "Investing",
    principle: "Put what you have to faithful work over time.",
    edenRiver: "Hiddekel (Tigris)",
    accent: "#3a5a9b", // deep current
    accentSoft: "#e3e8f4",
  },
  {
    number: 4,
    key: "giving",
    title: "Giving",
    principle: "Let the stream flow back out to others.",
    edenRiver: "Euphrates",
    accent: "#a9743b", // warm clay — the river returns to the land
    accentSoft: "#f4e9dc",
  },
];

export const THEME = {
  name: "warm-scripture-forward",
  palette: {
    parchment: "#faf5ec",
    parchmentDeep: "#f2e9d8",
    ink: "#2c2620",
    inkSoft: "#5c5347",
    clay: "#a9743b",
    olive: "#5a6446",
    water: "#1f6f8b",
    waterDeep: "#274b6d",
    gold: "#c9a24b",
    line: "#e6dcc7",
  },
  fonts: {
    /** Display / headings — a warm transitional serif. */
    display: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
    /** Body copy. */
    body: '"Iowan Old Style", Georgia, "Times New Roman", serif',
    /** UI chrome, labels, numbers in trackers. */
    ui: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  motif: {
    /** The four-rivers flow: one source splitting into four channels. */
    sourceColor: "#274b6d",
    /** Gradient stops for the progress "river" as it moves 1 -> 4. */
    flow: ["#2f6f4f", "#1f6f8b", "#3a5a9b", "#a9743b"],
  },
} as const;

export function riverByNumber(n: number): RiverTheme | undefined {
  return RIVERS.find((r) => r.number === n);
}

export function riverByKey(key: RiverTheme["key"]): RiverTheme {
  const r = RIVERS.find((x) => x.key === key);
  if (!r) throw new Error(`Unknown river key: ${key}`);
  return r;
}
