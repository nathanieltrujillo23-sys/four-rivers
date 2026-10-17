import { Panel } from "./parts";
import { DEFAULT_THEME, THEMES, contrast, isHex, resolvePalette, type ThemeChoice } from "../../lib/wealthTheme";

/** Chooses the deck's colors: a designed palette, or two colors of your own. Text stays readable whatever is picked. */
export function DeckLook({ theme, onChange }: { theme: ThemeChoice; onChange: (t: ThemeChoice) => void }) {
  const custom = theme.id === "custom";
  const palette = resolvePalette(theme);
  const hexField = (label: string, key: "primary" | "accent") => (
    <label className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
      {label}
      <span className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} color picker`}
          value={`#${theme[key]}`}
          onChange={(e) => onChange({ ...theme, id: "custom", [key]: e.target.value.slice(1).toUpperCase() })}
          className="h-9 w-12 cursor-pointer rounded border border-line bg-surface p-0.5"
        />
        <input
          aria-label={`${label} hex code`}
          value={theme[key]}
          maxLength={6}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
            if (isHex(v)) onChange({ ...theme, id: "custom", [key]: v });
          }}
          className="w-24 rounded-lg border border-line bg-surface px-2 py-1.5 font-mono text-sm uppercase text-ink focus:border-water focus:outline-none"
        />
      </span>
    </label>
  );
  const adjusted = custom && contrast(theme.primary, "FFFFFF") < 7;
  return (
    <Panel title="Look of the deck" subtitle="Pick a palette, or choose your own two colors. These are designs of your own: do not copy a firm's logo or colors.">
      <div role="group" aria-label="Deck palette" className="flex flex-wrap gap-2">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={theme.id === t.id}
            title={t.text}
            onClick={() => onChange({ id: t.id, primary: t.primary, accent: t.accent })}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 font-[family-name:var(--font-ui)] text-xs transition-colors ${theme.id === t.id ? "border-water-deep bg-parchment-deep text-ink" : "border-line text-ink-soft hover:bg-parchment-deep hover:text-ink"}`}
          >
            <span aria-hidden="true" className="flex">
              <span className="h-4 w-4 rounded-l-full" style={{ backgroundColor: `#${t.primary}` }} />
              <span className="h-4 w-4 rounded-r-full" style={{ backgroundColor: `#${t.accent}` }} />
            </span>
            {t.name}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={custom}
          onClick={() => onChange({ id: "custom", primary: theme.primary || DEFAULT_THEME.primary, accent: theme.accent || DEFAULT_THEME.accent })}
          className={`rounded-full border px-3 py-1.5 font-[family-name:var(--font-ui)] text-xs transition-colors ${custom ? "border-water-deep bg-parchment-deep text-ink" : "border-line text-ink-soft hover:bg-parchment-deep hover:text-ink"}`}
        >
          Custom colors
        </button>
      </div>
      {custom && (
        <div className="flex flex-wrap items-end gap-4">
          {hexField("Main color", "primary")}
          {hexField("Accent color", "accent")}
        </div>
      )}
      {adjusted && <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">The main color was darkened a little in the deck so white text on it stays easy to read.</p>}
      <div className="flex h-10 overflow-hidden rounded-lg border border-line" aria-label="Preview of the deck colors" role="img">
        <div className="flex-1" style={{ backgroundColor: `#${palette.deep}` }} />
        <div className="flex-1" style={{ backgroundColor: `#${palette.navy}` }} />
        <div className="flex-1" style={{ backgroundColor: `#${palette.gold}` }} />
        <div className="flex-1" style={{ backgroundColor: `#${palette.panel}` }} />
      </div>
    </Panel>
  );
}
