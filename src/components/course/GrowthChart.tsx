import { useEffect, useRef, useState } from "react";
import { formatCurrency } from "../../utils/format";

export interface ChartLine {
  color: string;
  /** Dashed lines (e.g. "money you put in") render flat, without a draw-in animation. */
  dashed?: boolean;
  points: { year: number; value: number }[];
}

const WIDTH = 600;
const HEIGHT = 200;
const PAD_X = 10;
const PAD_Y = 14;

function scalePoints(points: { year: number; value: number }[], maxYear: number, maxValue: number) {
  return points.map((p) => {
    const x = PAD_X + (p.year / maxYear) * (WIDTH - PAD_X * 2);
    const y = HEIGHT - PAD_Y - (p.value / maxValue) * (HEIGHT - PAD_Y * 2);
    return [x, y] as const;
  });
}

function linePath(coords: readonly (readonly [number, number])[]): string {
  return coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

function areaPath(coords: readonly (readonly [number, number])[]): string {
  if (coords.length === 0) return "";
  const bottomY = HEIGHT - PAD_Y;
  const top = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L");
  const lastX = coords[coords.length - 1][0].toFixed(1);
  const firstX = coords[0][0].toFixed(1);
  return `M${top} L${lastX},${bottomY} L${firstX},${bottomY} Z`;
}

/** A line that draws itself in (left to right) whenever its path changes. */
function DrawnLine({ d, color, dashed }: { d: string; color: string; dashed?: boolean }) {
  const ref = useRef<SVGPathElement>(null);
  const [length, setLength] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (dashed || !ref.current) return;
    setLength(ref.current.getTotalLength());
    setRevealed(false);
    const raf = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(raf);
  }, [d, dashed]);

  if (dashed) {
    return <path d={d} fill="none" stroke={color} strokeWidth={2} strokeDasharray="5 5" opacity={0.6} />;
  }

  return (
    <path
      ref={ref}
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={length ?? undefined}
      strokeDashoffset={length ? (revealed ? 0 : length) : undefined}
      style={{ transition: "stroke-dashoffset 700ms ease-out" }}
    />
  );
}

/** A filled area under the primary line, fading in whenever the data changes. */
function DrawnArea({ d, color }: { d: string; color: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [d]);
  return (
    <path d={d} fill={color} opacity={visible ? 0.16 : 0} style={{ transition: "opacity 500ms ease-out" }} />
  );
}

/**
 * A small hand-rolled SVG line/area chart for illustrating compound growth —
 * no charting library, since the app avoids adding dependencies for
 * something this simple. `lines[0]` is treated as the primary series and
 * gets the filled area under it; any others (a comparison scenario, a flat
 * "contributed" baseline) are drawn as lines only.
 */
export function GrowthChart({ lines, ariaLabel }: { lines: ChartLine[]; ariaLabel: string }) {
  const allPoints = lines.flatMap((l) => l.points);
  const maxYear = Math.max(1, ...allPoints.map((p) => p.year));
  const maxValue = Math.max(1, ...allPoints.map((p) => p.value));

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={ariaLabel}>
      <line x1={PAD_X} y1={HEIGHT - PAD_Y} x2={WIDTH - PAD_X} y2={HEIGHT - PAD_Y} stroke="#e6dcc7" strokeWidth={1} />
      {lines[0] && lines[0].points.length > 1 && (
        <DrawnArea d={areaPath(scalePoints(lines[0].points, maxYear, maxValue))} color={lines[0].color} />
      )}
      {lines.map((line, i) =>
        line.points.length > 1 ? (
          <DrawnLine
            key={i}
            d={linePath(scalePoints(line.points, maxYear, maxValue))}
            color={line.color}
            dashed={line.dashed}
          />
        ) : null
      )}
      <ChartTopLabel value={maxValue} />
    </svg>
  );
}

function ChartTopLabel({ value }: { value: number }) {
  return (
    <text x={WIDTH - PAD_X} y={PAD_Y - 2} textAnchor="end" fontSize={11} fill="#5c5347" fontFamily="var(--font-ui)">
      {formatCurrency(value, true)}
    </text>
  );
}
