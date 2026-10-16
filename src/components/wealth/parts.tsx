import type { ReactNode } from "react";
import { fmtK } from "../../lib/wealthMath";
import type { McPoint } from "../../lib/wealthMath";

/** A titled card with an optional line under the title and actions on the right. */
export function Panel({
  title,
  subtitle,
  actions,
  children,
  className = "",
  headingLevel = 3,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  headingLevel?: 3 | 4;
}) {
  const H = `h${headingLevel}` as "h3" | "h4";
  return (
    <section className={`panel flex flex-col gap-4 p-5 ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <H className="t-h4">{title}</H>}
            {subtitle && <p className="mt-0.5 font-[family-name:var(--font-ui)] text-xs text-ink-soft">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

/** The heading block at the top of a module. */
export function ModuleHead({ step, title, desc, children }: { step?: number; title: string; desc?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {step && <p className="t-eyebrow">Step {step}</p>}
        <h2 className="t-h2 mt-1">{title}</h2>
        {desc && <p className="mt-1.5 max-w-2xl font-[family-name:var(--font-ui)] text-sm text-ink-soft">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

/** A number tile. `tone` colours the value (positive, negative, or plain). */
export function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" | "warn" }) {
  const color = tone === "good" ? "text-river-1" : tone === "bad" ? "text-red-700" : tone === "warn" ? "text-clay-text" : "text-ink";
  return (
    <div className="panel-inner px-4 py-3">
      <p className="font-[family-name:var(--font-ui)] text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center font-[family-name:var(--font-ui)] text-sm text-ink-soft">{children}</p>
  );
}

/** A thin fill bar. `value` is 0 to 1. */
export function Bar({ value, color = "var(--color-water-deep)", label }: { value: number; color?: string; label: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-2 w-full overflow-hidden rounded-full bg-parchment-deep">
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

/** A labelled box for a typed number (kept as the text the person typed, like the rest of the plan). */
export function MoneyField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
  placeholder,
  className = "",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft ${className}`}>
      <span>{label}</span>
      <span className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink focus-within:border-water">
        {prefix && <span className="text-ink-soft">{prefix}</span>}
        <input
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 bg-transparent tabular-nums outline-none placeholder:text-ink-soft/70"
        />
        {suffix && <span className="text-ink-soft">{suffix}</span>}
      </span>
      {hint && <span className="font-normal">{hint}</span>}
    </label>
  );
}

/** A small round-cornered pill. */
export function Pill({ children, active, onClick, label, disabled }: { children: ReactNode; active?: boolean; onClick?: () => void; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      disabled={disabled}
      className={`rounded-full border px-3 py-1 font-[family-name:var(--font-ui)] text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? "border-water-deep bg-water-deep text-white" : "border-line text-ink-soft hover:bg-parchment-deep hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* The projection chart                                                */
/* ------------------------------------------------------------------ */

const W = 640;
const H = 280;
const PAD = { l: 52, r: 14, t: 14, b: 26 };

/** The 10th, 50th and 90th percentile paths, and what was put in, with the goal as a dashed line. */
export function ProjectionChart({ data, target, caption, compact = false }: { data: McPoint[]; target: number; caption: string; compact?: boolean }) {
  const h = compact ? 190 : H;
  const years = data.length - 1;
  const max = Math.max(1, target * 1.05, ...data.map((d) => d.p90));
  const x = (y: number) => PAD.l + (y / Math.max(1, years)) * (W - PAD.l - PAD.r);
  const y = (v: number) => h - PAD.b - (v / max) * (h - PAD.t - PAD.b);
  const path = (key: keyof McPoint) => data.map((d, i) => `${i === 0 ? "M" : "L"}${x(d.year).toFixed(1)} ${y(d[key] as number).toFixed(1)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const xTicks = Array.from(new Set([0, Math.round(years / 4), Math.round(years / 2), Math.round((years * 3) / 4), years]));
  const lines: { key: keyof McPoint; label: string; color: string; w: number; dash?: string }[] = [
    { key: "p90", label: "90th percentile (optimistic)", color: "var(--color-river-1)", w: 2 },
    { key: "p50", label: "Median", color: "var(--color-ink)", w: 3 },
    { key: "p10", label: "10th percentile (conservative)", color: "#d9534f", w: 2 },
    { key: "contributed", label: "Total contributed", color: "var(--color-ink-soft)", w: 1.5, dash: "4 4" },
  ];
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${h}`} role="img" aria-label={caption} className="w-full">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth="1" />
            <text x={PAD.l - 6} y={y(t) + 3} fontSize="10" textAnchor="end" fill="var(--color-ink-soft)">
              {fmtK(t)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t} x={x(t)} y={h - 8} fontSize="10" textAnchor="middle" fill="var(--color-ink-soft)">
            Yr {t}
          </text>
        ))}
        {target > 0 && (
          <g>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(target)} y2={y(target)} stroke="var(--color-clay)" strokeWidth="1.5" strokeDasharray="5 4" />
            <text x={PAD.l + 4} y={y(target) - 4} fontSize="10" fill="var(--color-clay-text)">
              Goal {fmtK(target)}
            </text>
          </g>
        )}
        {lines.map((l) => (
          <path key={l.key} d={path(l.key)} fill="none" stroke={l.color} strokeWidth={l.w} strokeDasharray={l.dash} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
      {!compact && (
        <figcaption className="flex flex-wrap gap-x-4 gap-y-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          {lines.map((l) => (
            <span key={l.key} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: l.color }} aria-hidden="true" />
              {l.label}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
