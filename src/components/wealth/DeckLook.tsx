import { Panel } from "./parts";
import { TEMPLATES, templateOf, type DeckTemplate } from "../../lib/wealthTemplates";
import { DEFAULT_THEME, THEMES, contrast, isHex, mix, resolvePalette, type ThemeChoice } from "../../lib/wealthTheme";

/** A tiny picture of a template's title slide and a content slide, in its own colors, layout and type. */
function Mini({ t }: { t: DeckTemplate }) {
  const p = resolvePalette(t.palette);
  const c = (h: string) => `#${h}`;
  const page = t.bg === "paper" ? "F9F9F9" : t.bg === "ivory" ? mix("FFFFFF", p.gold, 0.1) : t.bg === "mist" ? mix("FFFFFF", p.navy, 0.045) : "FFFFFF";
  const bar = (cls: string, color: string) => <div className={`absolute ${cls}`} style={{ backgroundColor: c(color) }} />;
  const title =
    t.title === "duo" ? (
      <div className="relative flex h-full w-full" style={{ backgroundColor: c(p.navy) }}>
        <div className="w-1/2">
          <div className="mx-auto mt-5 h-1.5 w-10 rounded-sm bg-white/90" />
          <div className="mx-auto mt-1 h-1.5 w-7 rounded-sm bg-white/60" />
          <div className="mx-auto mt-3 h-1 w-8 rounded-sm bg-white/40" />
        </div>
        <div className="flex w-1/2 items-center justify-center" style={{ backgroundColor: c(p.gold) }}>
          <div className="h-1.5 w-10 rounded-sm" style={{ backgroundColor: c(p.deep) }} />
        </div>
      </div>
    ) : t.title === "dark" ? (
      <div className="relative h-full w-full" style={{ backgroundColor: c(p.deep) }}>
        {bar("left-2 top-2 h-0.5 w-6", p.gold)}
        <div className="absolute left-2 top-5 h-1.5 w-12 rounded-sm bg-white/90" />
        <div className="absolute left-2 top-8 h-1.5 w-8 rounded-sm bg-white/60" />
        <div className={`absolute right-2 top-2 h-7 w-7 rounded-full border-2 ${t.art === "arcs" ? "scale-125" : ""}`} style={{ borderColor: c(p.gold) }} />
      </div>
    ) : t.title === "light" ? (
      <div className="relative h-full w-full bg-white">
        {bar("inset-x-0 top-0 h-1", p.navy)}
        {bar("left-2 top-5 h-0.5 w-6", p.gold)}
        {bar("left-2 top-8 h-1.5 w-12 rounded-sm", p.navy)}
        {bar("left-2 top-11 h-1 w-8 rounded-sm", p.line)}
      </div>
    ) : t.title === "split" ? (
      <div className="relative flex h-full w-full bg-white">
        <div className="h-full w-[42%]" style={{ backgroundColor: c(p.navy) }}>
          <div className="ml-2 mt-4 h-1.5 w-8 rounded-sm bg-white/90" />
          <div className="ml-2 mt-1 h-1 w-6 rounded-sm bg-white/60" />
        </div>
        <div className="h-full w-0.5" style={{ backgroundColor: c(p.gold) }} />
        <div className="ml-2 mt-6 h-1 w-8 rounded-sm" style={{ backgroundColor: c(p.navy) }} />
      </div>
    ) : t.title === "frame" ? (
      <div className="relative h-full w-full" style={{ backgroundColor: c(page) }}>
        <div className="absolute inset-1 border" style={{ borderColor: c(p.gold) }} />
        <div className="absolute inset-[7px] border" style={{ borderColor: c(p.gold), opacity: 0.5 }} />
        {bar("left-1/2 top-4 h-0.5 w-6 -translate-x-1/2", p.gold)}
        {bar("left-1/2 top-7 h-1.5 w-14 -translate-x-1/2 rounded-sm", p.navy)}
        {bar("left-1/2 top-11 h-1 w-8 -translate-x-1/2 rounded-sm", p.line)}
      </div>
    ) : t.title === "blocks" ? (
      <div className="relative h-full w-full bg-white">
        {bar("right-0 top-0 h-full w-[36%]", p.navy)}
        {bar("right-[28%] bottom-1 h-5 w-5", p.gold)}
        {bar("left-2 top-3 h-0.5 w-6", p.gold)}
        {bar("left-2 top-7 h-2.5 w-14 rounded-sm", p.navy)}
        {bar("left-2 top-12 h-1 w-9 rounded-sm", p.line)}
      </div>
    ) : (
      <div className="relative h-full w-full bg-white">
        {bar("left-2 top-2 h-4 w-0.5", p.gold)}
        {bar("inset-x-2 top-8 h-px", p.line)}
        {bar("left-2 top-10 h-1.5 w-14 rounded-sm", p.navy)}
        {bar("left-2 top-14 h-1 w-8 rounded-sm", p.line)}
      </div>
    );
  const card = (i: number) =>
    t.kpi === "card" ? (
      <div key={i} className="h-4 flex-1" style={{ backgroundColor: t.cards === "outline" ? "#fff" : c(p.panel), border: t.cards === "flat" ? "none" : `1px solid ${c(p.line)}`, borderRadius: t.cards === "panel" ? 3 : 0 }} />
    ) : t.kpi === "bar" ? (
      <div key={i} className="flex h-4 flex-1 gap-0.5">
        <div className="w-0.5" style={{ backgroundColor: c(p.gold) }} />
        <div className="mt-1 h-1.5 flex-1 rounded-sm" style={{ backgroundColor: c(p.navy), opacity: 0.8 }} />
      </div>
    ) : (
      <div key={i} className="h-4 flex-1 border-t-2" style={{ borderColor: c(p.navy) }}>
        <div className="mt-1 h-1.5 w-3/4 rounded-sm" style={{ backgroundColor: c(p.navy), opacity: 0.7 }} />
      </div>
    );
  const kickerPill = t.kicker === "pill" && t.header !== "band";
  const content = (
    <div className="relative h-full w-full" style={{ backgroundColor: c(page) }}>
      {t.rail === "left" && bar("left-0 top-0 h-full w-1", p.gold)}
      {t.rail === "top" && bar("inset-x-0 top-0 h-1", p.navy)}
      {t.rail === "tab" && bar("left-2 top-0 h-1 w-6", p.gold)}
      {t.header === "band" && bar("inset-x-0 top-0 h-5", p.navy)}
      {t.footer === "top" && (
        <>
          {bar("left-2 top-0.5 h-0.5 w-3", p.navy)}
          {bar("right-2 top-0.5 h-0.5 w-1", p.navy)}
        </>
      )}
      {kickerPill ? <div className="absolute left-2 top-1 h-1.5 w-8 rounded-full" style={{ backgroundColor: c(p.navy) }} /> : bar(`${t.center ? "left-1/2 -translate-x-1/2" : "left-2"} top-1.5 h-0.5 w-5`, t.header === "band" ? p.gold : p.goldText)}
      {bar(`${t.center ? "left-1/2 -translate-x-1/2" : "left-2"} top-2.5 h-1.5 ${t.scale < 1 ? "w-12" : "w-14"} rounded-sm`, t.header === "band" ? "FFFFFF" : p.navy)}
      {t.header === "rule" && bar("inset-x-2 top-6 h-px", p.line)}
      <div className="absolute inset-x-2 top-8 flex gap-1">{[0, 1, 2].map(card)}</div>
      {bar("inset-x-2 top-14 h-1", t.tableHead === "fill" ? p.navy : p.line)}
      {bar("inset-x-2 top-16 h-px", p.line)}
      {t.footer === "band" && bar("inset-x-0 bottom-0 h-1.5", p.navy)}
      {t.footer === "rule" && bar("inset-x-2 bottom-2 h-px", p.line)}
    </div>
  );
  return (
    <span aria-hidden="true" className="flex gap-1.5">
      <span className="block h-[72px] w-[100px] overflow-hidden rounded border border-line">{title}</span>
      <span className="block h-[72px] w-[100px] overflow-hidden rounded border border-line">{content}</span>
    </span>
  );
}

/** Chooses the deck's style template (fonts, title slide, headings, cards, tables) and its colors. */
export function DeckLook({ template, theme, onChange }: { template: string; theme: ThemeChoice; onChange: (next: { template: string; theme: ThemeChoice }) => void }) {
  const current = templateOf(template);
  return (
    <div className="flex flex-col gap-6">
      <Panel title="Style template" subtitle="The whole look of the presentation: fonts, the title slide, how each heading is drawn, cards and tables. Each one starts with its own colors, which you can change below.">
        <div role="group" aria-label="Style template" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={current.id === t.id}
              onClick={() => onChange({ template: t.id, theme: t.palette })}
              className={`flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors ${current.id === t.id ? "border-water-deep bg-parchment-deep" : "border-line hover:bg-parchment-deep/60"}`}
            >
              <Mini t={t} />
              <span className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
                {t.name}
                {current.id === t.id && <span className="ml-2 rounded-full bg-water-deep px-2 py-0.5 text-[11px] font-medium text-white">In use</span>}
              </span>
              <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t.blurb}</span>
              <span className="font-[family-name:var(--font-ui)] text-[11px] text-ink-soft">Fonts: {t.fontNote}</span>
            </button>
          ))}
        </div>
      </Panel>
      <ColorPanel theme={theme} onChange={(th) => onChange({ template: current.id, theme: th })} />
    </div>
  );
}

function ColorPanel({ theme, onChange }: { theme: ThemeChoice; onChange: (t: ThemeChoice) => void }) {
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
    <Panel title="Colors" subtitle="Keep the template's colors, pick another palette, or choose your own two. These are designs of your own: do not copy a firm's logo or colors.">
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
