import { useEffect, useState } from "react";
import { formatCurrency } from "../../utils/format";
import { RIVERS } from "../../theme/theme";

export interface StreamInput {
  label: string;
  value: number;
}

const WIDTH = 500;
const HEIGHT = 222;
const LEFT_X = 100;
const TOP_Y = 30;
const BOTTOM_Y = 175;

const TANK_X = 230;
const TANK_Y = 55;
const TANK_W = 58;
const TANK_H = 90;
const TANK_RIGHT = TANK_X + TANK_W;
const TANK_BOTTOM = TANK_Y + TANK_H;
const MOUTH_X = TANK_X;
const MOUTH_Y = TANK_Y + TANK_H / 2;

const BRANCH_X = TANK_RIGHT + 74;
const LABEL_X = TANK_RIGHT + 84;
const BULLET_CX = TANK_RIGHT + 88;
const BULLET_TEXT_X = TANK_RIGHT + 96;

const SAVING_COLOR = RIVERS[1].accent;
const INVESTING_COLOR = RIVERS[2].accent;
const GIVING_COLOR = RIVERS[3].accent;

const WELLS = ["HYSA", "Retirement", "Real estate", "Bonds"];
const NEIGHBORS = ["Friends", "Neighbors", "Church"];

const ATTACH_TOP = TANK_Y + 18;
const ATTACH_BOTTOM = TANK_BOTTOM - 18;

function yFor(i: number, n: number): number {
  if (n <= 1) return MOUTH_Y;
  return TOP_Y + (i / (n - 1)) * (BOTTOM_Y - TOP_Y);
}

/** Where stream i attaches to the reservoir's left edge — spread out like the
 * investing/giving branches attach at their own distinct points, rather than
 * every stream funneling into one shared spot. */
function attachYFor(i: number, n: number): number {
  if (n <= 1) return MOUTH_Y;
  return ATTACH_TOP + (i / (n - 1)) * (ATTACH_BOTTOM - ATTACH_TOP);
}

function truncate(label: string, max = 14): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

/**
 * The whole stewardship flow in one small diagram: income streams converge
 * into a savings "reservoir," which then feeds out to investing (a short
 * list of vehicles) and to giving (blessing others' reservoirs — named here
 * as friends, neighbors, church). The reservoir/investing/giving side is a
 * constant illustration of the course's four-river teaching, not live data;
 * only the input streams on the left reflect whatever is passed in. Reused
 * for both real logged streams (IncomeStreamTracker) and the hypothetical
 * "what if" calculator, so it only ever takes plain label/value pairs.
 */
export function StreamsRiver({ streams, accent }: { streams: StreamInput[]; accent: string }) {
  const active = streams.filter((s) => s.value > 0);
  const total = active.reduce((s, x) => s + x.value, 0);
  const signature = active.map((s) => `${s.label}:${s.value}`).join("|");

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(false);
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [signature]);

  const ariaLabel =
    active.length > 0
      ? `${active.length} income streams totaling ${formatCurrency(total)} per month, flowing into savings, then out to investing and giving`
      : "Income flowing into savings, then out to investing and giving";

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={ariaLabel}>
      {active.length === 0 ? (
        <line
          x1={LEFT_X}
          y1={MOUTH_Y}
          x2={MOUTH_X}
          y2={MOUTH_Y}
          stroke="#c9c2ae"
          strokeWidth={2}
          strokeDasharray="4 4"
        />
      ) : (
        active.map((s, i) => {
          const y = yFor(i, active.length);
          const attachY = attachYFor(i, active.length);
          const width = mounted ? 2 : 0;
          return (
            <g key={`${s.label}-${i}`}>
              <path
                d={`M${LEFT_X},${y} C${LEFT_X + 90},${y} ${MOUTH_X - 40},${attachY} ${MOUTH_X},${attachY}`}
                fill="none"
                stroke={accent}
                strokeOpacity={0.7}
                strokeLinecap="round"
                strokeWidth={width}
                style={{ transition: "stroke-width 700ms ease-out" }}
              />
              <circle cx={LEFT_X} cy={y} r={3.5} fill={accent} />
              <text x={6} y={y + 4} textAnchor="start" fontSize={10} fill="#5c5347" fontFamily="var(--font-ui)">
                {truncate(s.label)}
              </text>
            </g>
          );
        })
      )}

      {total > 0 && (
        <text
          x={TANK_X + TANK_W / 2}
          y={TANK_Y - 12}
          textAnchor="middle"
          fontSize={13}
          fontWeight={600}
          fill={accent}
          fontFamily="var(--font-ui)"
        >
          {formatCurrency(total)}/mo
        </text>
      )}

      {/* The reservoir — savings */}
      <rect
        x={TANK_X}
        y={TANK_Y}
        width={TANK_W}
        height={TANK_H}
        rx={10}
        fill={SAVING_COLOR}
        fillOpacity={0.18}
        stroke={SAVING_COLOR}
        strokeWidth={2}
      />
      <path
        d={`M${TANK_X + 6},${TANK_Y + 26} Q${TANK_X + TANK_W / 4},${TANK_Y + 20} ${TANK_X + TANK_W / 2},${TANK_Y + 26} T${TANK_RIGHT - 6},${TANK_Y + 26}`}
        fill="none"
        stroke={SAVING_COLOR}
        strokeWidth={1.5}
        strokeOpacity={0.6}
      />
      <text
        x={TANK_X + TANK_W / 2}
        y={TANK_BOTTOM + 18}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill={SAVING_COLOR}
        fontFamily="var(--font-ui)"
      >
        Savings
      </text>

      {/* Out to investing */}
      <path
        d={`M${TANK_RIGHT},${TANK_Y + 22} C${TANK_RIGHT + 32},${TANK_Y + 22} ${TANK_RIGHT + 42},${TANK_Y - 8} ${BRANCH_X},${TANK_Y - 8}`}
        fill="none"
        stroke={INVESTING_COLOR}
        strokeWidth={2}
        strokeOpacity={0.7}
      />
      <circle cx={BRANCH_X} cy={TANK_Y - 8} r={3.5} fill={INVESTING_COLOR} />
      <text x={LABEL_X} y={TANK_Y - 4} fontSize={12} fontWeight={700} fill={INVESTING_COLOR} fontFamily="var(--font-ui)">
        Investing
      </text>
      {WELLS.map((label, i) => (
        <g key={label}>
          <circle cx={BULLET_CX} cy={TANK_Y + 14 + i * 15} r={2.5} fill={INVESTING_COLOR} />
          <text x={BULLET_TEXT_X} y={TANK_Y + 18 + i * 15} fontSize={10} fill="#5c5347" fontFamily="var(--font-ui)">
            {label}
          </text>
        </g>
      ))}

      {/* Out to giving */}
      <path
        d={`M${TANK_RIGHT},${TANK_BOTTOM - 22} C${TANK_RIGHT + 32},${TANK_BOTTOM - 22} ${TANK_RIGHT + 42},${TANK_BOTTOM + 8} ${BRANCH_X},${TANK_BOTTOM + 8}`}
        fill="none"
        stroke={GIVING_COLOR}
        strokeWidth={2}
        strokeOpacity={0.7}
      />
      <circle cx={BRANCH_X} cy={TANK_BOTTOM + 8} r={3.5} fill={GIVING_COLOR} />
      <text x={LABEL_X} y={TANK_BOTTOM + 12} fontSize={12} fontWeight={700} fill={GIVING_COLOR} fontFamily="var(--font-ui)">
        Giving
      </text>
      {NEIGHBORS.map((label, i) => (
        <g key={label}>
          <circle cx={BULLET_CX} cy={TANK_BOTTOM + 28 + i * 15} r={2.5} fill={GIVING_COLOR} />
          <text x={BULLET_TEXT_X} y={TANK_BOTTOM + 32 + i * 15} fontSize={10} fill="#5c5347" fontFamily="var(--font-ui)">
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}
