/**
 * Looks for the presentation: a few designed palettes and a custom one built from two colors. Every palette keeps text readable:
 * the main color is darkened until white text on it passes the contrast guideline, and the accent used for small text on white
 * is darkened the same way. These are the presenter's own designs; no firm's branding is used or imitated.
 */

export interface ThemeChoice {
  id: string;
  /** Main color (headings, table headers, the title background), a 6-digit hex without "#". */
  primary: string;
  /** Accent color (rules, highlights), a 6-digit hex without "#". */
  accent: string;
}

export const THEMES: { id: string; name: string; primary: string; accent: string; text: string }[] = [
  { id: "classic", name: "Classic navy and gold", primary: "1F3F5E", accent: "C9A24B", text: "The default: deep navy with a gold accent." },
  { id: "modern", name: "Modern teal", primary: "0F4C5C", accent: "E36414", text: "Teal with a warm orange accent; a more contemporary feel." },
  { id: "heritage", name: "Heritage green", primary: "1E4D3A", accent: "B8963E", text: "Forest green and brass; calm and traditional." },
  { id: "slate", name: "Charcoal and copper", primary: "2D3A45", accent: "B87333", text: "Neutral charcoal with a copper accent." },
  { id: "plum", name: "Deep plum", primary: "4A2C59", accent: "D4A24C", text: "Plum with a soft gold accent." },
];

export const DEFAULT_THEME: ThemeChoice = { id: "classic", primary: "1F3F5E", accent: "C9A24B" };

const HEX = /^[0-9a-fA-F]{6}$/;
export const isHex = (v: unknown): v is string => typeof v === "string" && HEX.test(v);

export function normalizeTheme(raw: unknown): ThemeChoice {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return DEFAULT_THEME;
  const r = raw as Record<string, unknown>;
  const preset = THEMES.find((t) => t.id === r.id);
  if (preset) return { id: preset.id, primary: preset.primary, accent: preset.accent };
  if (r.id === "custom" && isHex(r.primary) && isHex(r.accent)) return { id: "custom", primary: r.primary.toUpperCase(), accent: r.accent.toUpperCase() };
  return DEFAULT_THEME;
}

/* ---- color math ---- */

const parse = (h: string): [number, number, number] => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
const hex = (rgb: number[]) => rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
export const mix = (a: string, b: string, t: number) => {
  const x = parse(a);
  const y = parse(b);
  return hex(x.map((v, i) => v + (y[i] - v) * t));
};
const lin = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (h: string) => {
  const [r, g, b] = parse(h);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
/** WCAG contrast ratio between two colors. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** Moves a color toward black (or white) until it reaches the contrast ratio against a background. */
function ensure(color: string, bg: string, ratio: number, toward: "black" | "white"): string {
  let c = color;
  for (let i = 0; i < 20 && contrast(c, bg) < ratio; i++) c = mix(c, toward === "black" ? "000000" : "FFFFFF", 0.1);
  return c;
}

export interface Palette {
  navy: string;
  deep: string;
  gold: string;
  goldText: string;
  panel: string;
  line: string;
}

/** The colors a deck uses for a theme. The default theme returns the original colors exactly. */
export function resolvePalette(t: ThemeChoice): Palette {
  if (t.id === "classic") return { navy: "1F3F5E", deep: "162C42", gold: "C9A24B", goldText: "7C5E12", panel: "F3F6F9", line: "D8DEE5" };
  const navy = ensure(t.primary, "FFFFFF", 7, "black");
  const deep = mix(navy, "000000", 0.35);
  return {
    navy,
    deep,
    // The accent also sits on the dark title background, so it must read there.
    gold: ensure(t.accent, deep, 4.5, "white"),
    goldText: ensure(t.accent, "FFFFFF", 4.5, "black"),
    panel: mix(navy, "FFFFFF", 0.95),
    line: mix(navy, "FFFFFF", 0.85),
  };
}
