// The six logo marks an admin can choose between. One drawing of each, shared by the app (header, certificate,
// celebration), the Admin chooser, and tools/dev/make_logo_assets.mjs (favicons, app icons, link-preview card).
// Plain .mjs so that Node can run it directly; logoMarks.d.mts gives it types.

export const LOGO_IDS = ["current", "droplet", "tile", "monogram", "ribbons", "orb"];
export const DEFAULT_LOGO = "current";

export const LOGOS = {
  current: { name: "Current", note: "Four lines from one point. The original mark." },
  droplet: { name: "Droplet", note: "A drop of water with four river layers." },
  tile: { name: "River tile", note: "A navy tile with four flowing lines." },
  monogram: { name: "Monogram", note: "A serif 4 over a gold river line." },
  ribbons: { name: "Ribbons", note: "Four parallel streams flowing together." },
  orb: { name: "Water orb", note: "A round seal of four layered waters." },
};

/** Fixed colors, for files and print. */
export const FIXED_PALETTE = {
  navy: "#274b6d",
  gold: "#c9a24b",
  cream: "#faf5ec",
  rivers: ["#2f6f4f", "#1f6f8b", "#3a5a9b", "#a9743b"],
  light: ["#7fcf9f", "#6cc0dc", "#9db3ee", "#e8b070"],
};

/** The app's palette: follows the light and dark themes through CSS variables. */
export const APP_PALETTE = {
  ...FIXED_PALETTE,
  navy: "var(--color-water-deep)",
  rivers: ["var(--color-river-1)", "var(--color-river-2)", "var(--color-river-3)", "var(--color-river-4)"],
};

function wave(y, x0, seg, n, color, width) {
  let d = `M${x0} ${y} q${seg / 2} -5 ${seg} 0`;
  for (let i = 1; i < n; i++) d += ` t${seg} 0`;
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
}

const DROP = "M32 4 C32 4 11 27 11 40 a21 21 0 0 0 42 0 C53 27 32 4 32 4Z";

/**
 * The mark as an <svg> string. `uid` makes clip-path ids unique when several marks share one page.
 * Marks that sit on a tile of their own (tile, monogram) keep it; the others are drawn on a transparent background.
 */
export function logoSvg(id, { size = 64, uid = "m", palette = FIXED_PALETTE, label = "" } = {}) {
  const p = palette;
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  const open = (box) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${box} ${box}" ${a11y}>`;
  switch (id) {
    case "droplet":
      return (
        open(64) +
        `<defs><clipPath id="${uid}"><path d="${DROP}"/></clipPath></defs><path d="${DROP}" fill="${p.navy}"/>` +
        `<g clip-path="url(#${uid})">${[30, 39, 48, 57].map((y, i) => wave(y, -4, 16, 6, p.light[i], 6.5)).join("")}</g></svg>`
      );
    case "tile":
      return (
        open(64) +
        `<rect width="64" height="64" rx="14" fill="${FIXED_PALETTE.navy}"/>` +
        [18, 29, 40, 51].map((y, i) => wave(y, 10, 11, 4, FIXED_PALETTE.light[i], 5)).join("") +
        "</svg>"
      );
    case "monogram":
      return (
        open(64) +
        `<circle cx="32" cy="32" r="30" fill="${FIXED_PALETTE.navy}"/>` +
        `<text x="32" y="45" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="40" fill="${FIXED_PALETTE.cream}">4</text>` +
        wave(53, 19, 6.5, 4, FIXED_PALETTE.gold, 2.6) +
        "</svg>"
      );
    case "ribbons":
      return (
        open(64) +
        [14, 26, 38, 50]
          .map((x, i) => `<path d="M${x} 6 c9 14 -9 28 0 52" fill="none" stroke="${p.rivers[i]}" stroke-width="7.5" stroke-linecap="round"/>`)
          .join("") +
        "</svg>"
      );
    case "orb":
      return (
        open(64) +
        `<defs><clipPath id="${uid}"><circle cx="32" cy="32" r="28"/></clipPath></defs>` +
        `<g clip-path="url(#${uid})"><rect width="64" height="64" fill="${p.rivers[3]}"/>` +
        [11, 25, 39].map((y, i) => wave(y + 3, -8, 16, 6, p.rivers[i], 15)).join("") +
        `</g><circle cx="32" cy="32" r="28" fill="none" stroke="${p.navy}" stroke-width="3"/></svg>`
      );
    default: {
      const curves = [
        [13, 2, 13, 8, 5, 9, 4, 24],
        [13, 2, 13, 9, 10, 12, 9, 24],
        [13, 2, 13, 9, 16, 12, 17, 24],
        [13, 2, 13, 8, 21, 9, 22, 24],
      ];
      return (
        open(26) +
        curves
          .map((c, i) => `<path d="M${c[0]} ${c[1]} C${c[2]} ${c[3]}, ${c[4]} ${c[5]}, ${c[6]} ${c[7]}" fill="none" stroke="${p.rivers[i]}" stroke-width="2.2" stroke-linecap="round"/>`)
          .join("") +
        "</svg>"
      );
    }
  }
}
