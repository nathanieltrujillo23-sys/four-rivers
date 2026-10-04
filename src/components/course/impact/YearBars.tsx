import type { YearRow } from "../../../utils/incomeProjection";
import { formatCurrency } from "../../../utils/format";
import { useT } from "../../../i18n/LanguageContext";

const WIDTH = 600;
const HEIGHT = 190;
const PAD_X = 8;
const TOP = 18;
const BOTTOM = 24;

/** One bar per year: income, split into the expenses it covers and what is left over. */
export function YearBars({
  rows,
  accent,
}: {
  rows: YearRow[];
  accent: string;
}) {
  const t = useT();
  const maxIncome = Math.max(
    1,
    ...rows.map((r) => Math.max(r.income, r.expenses)),
  );
  const plotH = HEIGHT - TOP - BOTTOM;
  const slot = (WIDTH - PAD_X * 2) / Math.max(1, rows.length);
  const barW = Math.min(34, slot * 0.7);
  const labelEvery = rows.length > 12 ? 2 : 1;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={t("yp.barsAria")}
    >
      <line
        x1={PAD_X}
        y1={HEIGHT - BOTTOM}
        x2={WIDTH - PAD_X}
        y2={HEIGHT - BOTTOM}
        stroke="#e6dcc7"
      />
      {rows.map((r, i) => {
        const x = PAD_X + i * slot + (slot - barW) / 2;
        const expensePart = Math.min(r.income, r.expenses);
        const discretionary = Math.max(0, r.income - r.expenses);
        const expH = (expensePart / maxIncome) * plotH;
        const disH = (discretionary / maxIncome) * plotH;
        const baseY = HEIGHT - BOTTOM;
        return (
          <g key={r.year}>
            <rect
              x={x}
              y={baseY - expH}
              width={barW}
              height={expH}
              fill="#c9c2ae"
            />
            <rect
              x={x}
              y={baseY - expH - disH}
              width={barW}
              height={disH}
              fill={accent}
            />
            {(r.year - 1) % labelEvery === 0 && (
              <text
                x={x + barW / 2}
                y={HEIGHT - 8}
                textAnchor="middle"
                fontSize={10}
                fill="#5c5347"
                fontFamily="var(--font-ui)"
              >
                {r.year}
              </text>
            )}
          </g>
        );
      })}
      <text
        x={WIDTH - PAD_X}
        y={11}
        textAnchor="end"
        fontSize={11}
        fill="#5c5347"
        fontFamily="var(--font-ui)"
      >
        {formatCurrency(maxIncome, true)}/yr
      </text>
    </svg>
  );
}
