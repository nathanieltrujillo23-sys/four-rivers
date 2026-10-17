import { fmtK } from "../../lib/wealthMath";
import type { FrontierPoint } from "../../lib/wealthPortfolio";

export interface LineSeries {
  name: string;
  values: number[];
  color: string;
  width?: number;
  dash?: string;
}

const W = 640;
const PAD = { l: 56, r: 14, t: 12, b: 28 };

/** Several lines over the same labels, with the dollar scale on the left and a legend underneath. */
export function LineChartMulti({
  labels,
  series,
  caption,
  height = 260,
  every,
  format = fmtK,
}: {
  labels: string[];
  series: LineSeries[];
  caption: string;
  height?: number;
  /** Show every nth label on the axis. */
  every?: number;
  format?: (n: number) => string;
}) {
  const n = Math.max(2, labels.length);
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const min = Math.min(0, ...series.flatMap((s) => s.values));
  const span = max - min || 1;
  const x = (i: number) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => height - PAD.b - ((v - min) / span) * (height - PAD.t - PAD.b);
  const step = every ?? Math.max(1, Math.ceil(n / 7));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => min + f * span);
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={caption} className="w-full">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth="1" />
            <text x={PAD.l - 6} y={y(t) + 3} fontSize="10" textAnchor="end" fill="var(--color-ink-soft)">
              {format(t)}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          i % step === 0 || i === n - 1 ? (
            <text key={i} x={x(i)} y={height - 8} fontSize="10" textAnchor="middle" fill="var(--color-ink-soft)">
              {l}
            </text>
          ) : null,
        )}
        {series.map((s) => (
          <path
            key={s.name}
            d={s.values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ")}
            fill="none"
            stroke={s.color}
            strokeWidth={s.width ?? 2.2}
            strokeDasharray={s.dash}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: s.color }} aria-hidden="true" />
            {s.name}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

const SH = 300;
const SP = { l: 46, r: 16, t: 14, b: 34 };

/** Risk (across) against return (up): the efficient frontier, each asset class, and the portfolio chosen and its reference. */
export function FrontierChart({
  cloud,
  frontier,
  assets,
  selected,
  reference,
  caption,
}: {
  cloud: FrontierPoint[];
  frontier: FrontierPoint[];
  assets: (FrontierPoint & { id: string; name: string })[];
  selected: FrontierPoint | null;
  reference: FrontierPoint | null;
  caption: string;
}) {
  const all = [...cloud, ...frontier, ...assets, ...(selected ? [selected] : []), ...(reference ? [reference] : [])];
  const maxV = Math.max(5, ...all.map((p) => p.vol)) * 1.05;
  const maxR = Math.max(5, ...all.map((p) => p.ret)) * 1.08;
  const minR = Math.min(0, ...all.map((p) => p.ret));
  const x = (v: number) => SP.l + (v / maxV) * (W - SP.l - SP.r);
  const y = (r: number) => SH - SP.b - ((r - minR) / (maxR - minR || 1)) * (SH - SP.t - SP.b);
  const xt = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxV);
  const yt = [0, 0.25, 0.5, 0.75, 1].map((f) => minR + f * (maxR - minR));
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${SH}`} role="img" aria-label={caption} className="w-full">
        {yt.map((t) => (
          <g key={`y${t}`}>
            <line x1={SP.l} x2={W - SP.r} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth="1" />
            <text x={SP.l - 6} y={y(t) + 3} fontSize="10" textAnchor="end" fill="var(--color-ink-soft)">
              {t.toFixed(1)}%
            </text>
          </g>
        ))}
        {xt.map((t) => (
          <text key={`x${t}`} x={x(t)} y={SH - 16} fontSize="10" textAnchor="middle" fill="var(--color-ink-soft)">
            {t.toFixed(0)}%
          </text>
        ))}
        <text x={(SP.l + W - SP.r) / 2} y={SH - 3} fontSize="10" textAnchor="middle" fill="var(--color-ink-soft)">
          Risk (volatility)
        </text>
        {cloud.map((p, i) => (
          <circle key={i} cx={x(p.vol)} cy={y(p.ret)} r="1.6" fill="var(--color-ink-soft)" opacity="0.22" />
        ))}
        <path d={frontier.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.vol).toFixed(1)} ${y(p.ret).toFixed(1)}`).join(" ")} fill="none" stroke="var(--color-water-deep)" strokeWidth="2.6" strokeLinecap="round" />
        {assets.map((a) => (
          <g key={a.id}>
            <rect x={x(a.vol) - 4} y={y(a.ret) - 4} width="8" height="8" fill="var(--color-clay)" />
            <text x={x(a.vol) + 7} y={y(a.ret) + 3} fontSize="9" fill="var(--color-ink-soft)">
              {a.id.toUpperCase()}
            </text>
          </g>
        ))}
        {reference && <circle cx={x(reference.vol)} cy={y(reference.ret)} r="5.5" fill="none" stroke="var(--color-ink)" strokeWidth="2" />}
        {selected && <circle cx={x(selected.vol)} cy={y(selected.ret)} r="6" fill="var(--color-gold)" stroke="var(--color-ink)" strokeWidth="1.5" />}
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: "var(--color-water-deep)" }} aria-hidden="true" />
          Efficient frontier
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 bg-clay" aria-hidden="true" />
          Each asset class
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-ink bg-gold" aria-hidden="true" />
          This portfolio
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink" aria-hidden="true" />
          60/40 reference
        </span>
      </figcaption>
    </figure>
  );
}
