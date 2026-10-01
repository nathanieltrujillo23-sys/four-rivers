export interface TotalBar {
  label: string;
  value: string;
  amount: number;
  color: string;
}

const WIDTH = 500;
const HEIGHT = 170;
const BAR_W = 70;
const GAP = 40;
const BASE_Y = 140;
const MAX_BAR_H = 100;

/**
 * A quick "shape of your stewardship" snapshot: one bar per river, height
 * proportional to its own total relative to the largest of the four. The
 * four totals are different units (a monthly rate vs. cumulative sums), so
 * this is a glance-at-the-proportions visual, not a literal unit comparison
 * — each bar's own value is still labeled in full above it.
 */
export function RiverTotalsChart({ bars }: { bars: TotalBar[] }) {
  const maxAmount = Math.max(1, ...bars.map((b) => b.amount));
  const startX = (WIDTH - (bars.length * BAR_W + (bars.length - 1) * GAP)) / 2;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={bars.map((b) => `${b.label}: ${b.value}`).join(", ")}
    >
      <line x1={20} y1={BASE_Y} x2={WIDTH - 20} y2={BASE_Y} stroke="#e6dcc7" strokeWidth={1} />
      {bars.map((b, i) => {
        const x = startX + i * (BAR_W + GAP);
        const h = Math.max(4, (b.amount / maxAmount) * MAX_BAR_H);
        const y = BASE_Y - h;
        return (
          <g key={b.label}>
            <text
              x={x + BAR_W / 2}
              y={y - 10}
              textAnchor="middle"
              fontSize={13}
              fontWeight={600}
              fill={b.color}
              fontFamily="var(--font-ui)"
            >
              {b.value}
            </text>
            <rect x={x} y={y} width={BAR_W} height={h} rx={8} fill={b.color} fillOpacity={0.85} />
            <text
              x={x + BAR_W / 2}
              y={BASE_Y + 20}
              textAnchor="middle"
              fontSize={12}
              fill="#5c5347"
              fontFamily="var(--font-ui)"
            >
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
