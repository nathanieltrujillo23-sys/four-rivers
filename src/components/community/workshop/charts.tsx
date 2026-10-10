import { useEffect, useRef, useState } from "react";
import { motionReduced } from "../../../lib/motion";
import { formatCurrency } from "../../../utils/format";

export interface Series {
  label: string;
  points: number[];
  color: string;
  /** Draw as a dashed straight line (for a target). */
  dashed?: boolean;
}

const W = 320;
const H = 120;
const PAD = { l: 6, r: 6, t: 10, b: 18 };

/**
 * A small line chart whose lines draw themselves across the screen the first time it appears. The first series is also
 * filled underneath. Every series spans the same width, so a shorter list ends early (like a loan paid off sooner).
 */
export function SeriesChart({ series, startLabel, endLabel, caption }: { series: Series[]; startLabel: string; endLabel: string; caption: string }) {
  const longest = Math.max(2, ...series.map((s) => s.points.length));
  const max = Math.max(1, ...series.flatMap((s) => s.points));
  const x = (i: number) => PAD.l + (i / (longest - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (v / max) * (H - PAD.t - PAD.b);
  const path = (pts: number[]) => pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const first = series[0];
  return (
    <figure className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md" role="img" aria-label={caption}>
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="var(--color-line)" strokeWidth="1" />
        {first && first.points.length > 1 && (
          <path
            className="fade-in-late"
            d={`${path(first.points)} L${x(first.points.length - 1).toFixed(1)} ${H - PAD.b} L${x(0).toFixed(1)} ${H - PAD.b} Z`}
            fill={first.color}
            fillOpacity="0.12"
          />
        )}
        {series.map((s) =>
          s.points.length > 1 ? (
            <path key={s.label} className="draw-slow" pathLength={1} d={path(s.points)} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={s.dashed ? "4 4" : undefined} />
          ) : null,
        )}
        <text x={PAD.l} y={H - 3} fontSize="9" fill="var(--color-ink-soft)">{startLabel}</text>
        <text x={W - PAD.r} y={H - 3} fontSize="9" textAnchor="end" fill="var(--color-ink-soft)">{endLabel}</text>
        <text x={W - PAD.r} y={PAD.t - 1} fontSize="9" textAnchor="end" fill="var(--color-ink-soft)">{formatCurrency(max, true)}</text>
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: s.color }} aria-hidden="true" />
            {s.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** Two payoff methods racing to zero: each bar fills in proportion to how long it takes, and the quicker one finishes first. */
export function PayoffRace({ a, b }: { a: { label: string; months: number | null }; b: { label: string; months: number | null } }) {
  const [run, setRun] = useState(0);
  const [go, setGo] = useState(motionReduced());
  const timer = useRef<number | undefined>(undefined);
  const longest = Math.max(1, a.months ?? 0, b.months ?? 0);
  const total = motionReduced() ? 0 : 4200;

  useEffect(() => {
    if (motionReduced()) return setGo(true);
    setGo(false);
    timer.current = window.setTimeout(() => setGo(true), 80);
    return () => window.clearTimeout(timer.current);
  }, [run, a.months, b.months]);

  const bar = (r: { label: string; months: number | null }, color: string) => {
    const ms = r.months === null ? total : (r.months / longest) * total;
    return (
      <div key={r.label} className="flex items-center gap-3">
        <span className="w-28 shrink-0 text-xs text-ink-soft">{r.label}</span>
        <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-parchment-deep">
          <div
            className="h-full rounded-full"
            style={{ width: go ? (r.months === null ? "100%" : "100%") : "0%", backgroundColor: color, opacity: r.months === null ? 0.35 : 1, transition: go ? `width ${ms}ms linear` : "none" }}
          />
        </div>
      </div>
    );
  };
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line p-3 font-[family-name:var(--font-ui)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-soft">The race to debt-free</span>
        <button type="button" onClick={() => setRun((n) => n + 1)} className="text-xs text-water underline underline-offset-2">
          Replay
        </button>
      </div>
      <div className="flex flex-col gap-2" aria-hidden="true">
        {bar(a, "var(--color-river-4)")}
        {bar(b, "var(--color-river-2)")}
      </div>
    </div>
  );
}
