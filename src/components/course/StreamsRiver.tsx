import { useEffect, useState } from "react";
import { formatCurrency } from "../../utils/format";

export interface StreamInput {
  label: string;
  value: number;
}

const WIDTH = 420;
const HEIGHT = 170;
const LEFT_X = 76;
const RIGHT_X = 400;
const TOP_Y = 20;
const BOTTOM_Y = 150;
const MOUTH_Y = 85;

function yFor(i: number, n: number): number {
  if (n <= 1) return MOUTH_Y;
  return TOP_Y + (i / (n - 1)) * (BOTTOM_Y - TOP_Y);
}

/**
 * Several thin bands converging into one — a visual for "multiple streams of
 * income." Each band's thickness is proportional to its value; all of them
 * bend toward the same point on the right, where the combined total is
 * labeled. Reused for both real logged streams (IncomeStreamTracker) and the
 * hypothetical "what if" calculator, so it only ever takes plain
 * label/value pairs, never anything ledger-specific.
 */
export function StreamsRiver({ streams, accent }: { streams: StreamInput[]; accent: string }) {
  const active = streams.filter((s) => s.value > 0);
  const total = active.reduce((s, x) => s + x.value, 0);
  const maxValue = Math.max(1, ...active.map((s) => s.value));
  const signature = active.map((s) => `${s.label}:${s.value}`).join("|");

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(false);
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [signature]);

  if (active.length === 0) {
    return (
      <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
        Add a stream to see it flow in.
      </p>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`${active.length} income streams converging into ${formatCurrency(total)} combined per month`}
    >
      {active.map((s, i) => {
        const y = yFor(i, active.length);
        const width = mounted ? Math.max(3, (s.value / maxValue) * 22) : 0;
        const opacity = 0.85 - (i % 5) * 0.1;
        return (
          <g key={`${s.label}-${i}`}>
            <path
              d={`M${LEFT_X},${y} C${LEFT_X + 140},${y} ${RIGHT_X - 140},${MOUTH_Y} ${RIGHT_X - 20},${MOUTH_Y}`}
              fill="none"
              stroke={accent}
              strokeOpacity={opacity}
              strokeLinecap="round"
              strokeWidth={width}
              style={{ transition: "stroke-width 700ms ease-out" }}
            />
            <text
              x={LEFT_X - 8}
              y={y + 4}
              textAnchor="end"
              fontSize={10}
              fill="#5c5347"
              fontFamily="var(--font-ui)"
            >
              {s.label.length > 15 ? `${s.label.slice(0, 14)}…` : s.label}
            </text>
          </g>
        );
      })}
      <text
        x={RIGHT_X - 10}
        y={MOUTH_Y - 24}
        textAnchor="end"
        fontSize={13}
        fontWeight={600}
        fill={accent}
        fontFamily="var(--font-ui)"
      >
        {formatCurrency(total)}/mo
      </text>
    </svg>
  );
}
