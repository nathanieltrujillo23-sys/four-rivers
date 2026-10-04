import { useEffect, useState } from "react";
import { formatCurrency } from "../../utils/format";
import { RIVERS } from "../../theme/theme";
import { useLang } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";

export interface StreamInput {
  label: string;
  value: number;
}

export interface BulletItem {
  label: string;
  percent?: number;
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

/** Shown only until real investments are logged — see `wells` prop. */
const DEFAULT_WELLS: { key: StringKey }[] = [
  { key: "streams.well.hysa" },
  { key: "streams.well.retirement" },
  { key: "streams.well.realEstate" },
  { key: "streams.well.bonds" },
];

/** The giving side stays illustrative — recipients are free text, not a fixed set of
 * categories, so there's nothing sensible to compute here. */
const NEIGHBORS: { key: StringKey }[] = [
  { key: "streams.nb.church" },
  { key: "streams.nb.neighbors" },
  { key: "streams.nb.friends" },
];

const ATTACH_TOP = TANK_Y + 18;
const ATTACH_BOTTOM = TANK_BOTTOM - 18;

function yFor(i: number, n: number, pitch: number): number {
  if (n <= 1) return MOUTH_Y;
  return TOP_Y + i * pitch;
}

/** Where stream i attaches to the reservoir's left edge — spread out like the
 * investing/giving branches attach at their own distinct points, rather than
 * every stream funneling into one shared spot. */
function attachYFor(i: number, n: number): number {
  if (n <= 1) return MOUTH_Y;
  return ATTACH_TOP + (i / (n - 1)) * (ATTACH_BOTTOM - ATTACH_TOP);
}

const LINE_H = 11;

/** Splits a label into stacked lines of at most `max` characters, breaking at
 * spaces (and only mid-word for a word longer than a whole line), so no label
 * is ever cut off — it just takes more lines. */
function wrapLabel(label: string, max: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of label.trim().split(/\s+/)) {
    for (let w = word; w.length > 0;) {
      const chunk = w.length > max ? w.slice(0, max) : w;
      w = w.slice(chunk.length);
      if (!current) current = chunk;
      else if (current.length + 1 + chunk.length <= max) current += ` ${chunk}`;
      else {
        lines.push(current);
        current = chunk;
      }
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

/** A stack of centered-on-y text lines; `anchorY` is the baseline of a single line. */
function StackedText({
  x,
  y,
  lines,
  ...props
}: { x: number; y: number; lines: string[] } & Omit<
  React.SVGProps<SVGTextElement>,
  "x" | "y"
>) {
  return (
    <text x={x} y={y - ((lines.length - 1) * LINE_H) / 2} {...props}>
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : LINE_H}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

/**
 * The whole stewardship flow in one small diagram: income streams converge
 * into a savings "reservoir," which then feeds out to investing and to
 * giving (blessing others' reservoirs — named here as friends, neighbors,
 * church). The reservoir is always a constant illustration; investing shows
 * the caller's real logged investment names when there are any (via `wells`)
 * and falls back to a static example list otherwise; giving is always the
 * same three illustrative categories, since real recipients are free text
 * with nothing sensible to group by. Percentages are left off both lists
 * for now. Reused for both real logged streams (IncomeStreamTracker) and the
 * hypothetical "what if" calculator.
 */
export function StreamsRiver({
  streams,
  accent,
  wells,
}: {
  streams: StreamInput[];
  accent: string;
  /** Real investment names, when any are logged; falls back to
   * `DEFAULT_WELLS` when omitted or empty. */
  wells?: BulletItem[];
}) {
  const { t } = useLang();
  const active = streams.filter((s) => s.value > 0);
  const investingItems: BulletItem[] =
    wells && wells.length > 0 ? wells : DEFAULT_WELLS.map((w) => ({ label: t(w.key) }));
  const neighbors: BulletItem[] = NEIGHBORS.map((n) => ({ label: t(n.key) }));
  const total = active.reduce((s, x) => s + x.value, 0);
  const signature = active.map((s) => `${s.label}:${s.value}`).join("|");

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(false);
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [signature]);

  // Labels wrap onto extra lines instead of being cut off, so the diagram
  // makes room: streams spread further apart, and the giving branch slides down
  // when the investing list runs long.
  const streamLines = active.map((s) => wrapLabel(s.label, 16));
  const streamNeed =
    Math.max(0, ...streamLines.map((l) => l.length)) * LINE_H + 8;
  const pitch =
    active.length > 1
      ? Math.max((BOTTOM_Y - TOP_Y) / (active.length - 1), streamNeed)
      : 0;
  const leftExtra =
    active.length > 1
      ? Math.max(0, TOP_Y + pitch * (active.length - 1) - BOTTOM_Y)
      : 0;

  let cursor = TANK_Y + 14;
  const investingLayout = investingItems.map((item) => {
    const lines = wrapLabel(item.label, 20);
    const top = cursor;
    cursor += lines.length * LINE_H + 4;
    return { item, lines, cy: top + (lines.length * LINE_H) / 2 };
  });
  const giveShift = Math.max(0, cursor - (TANK_BOTTOM - 4));
  const svgHeight = HEIGHT + Math.max(leftExtra, giveShift);

  const ariaLabel =
    active.length > 0
      ? `${t("streams.aria")} (${active.length}: ${formatCurrency(total)}/${t("time.mo")})`
      : t("streams.aria");

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${svgHeight}`}
      className="w-full"
      role="img"
      aria-label={ariaLabel}
    >
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
          const y = yFor(i, active.length, pitch);
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
              <StackedText
                x={6}
                y={y + 4}
                lines={streamLines[i]}
                textAnchor="start"
                fontSize={10}
                fill="#5c5347"
                fontFamily="var(--font-ui)"
              />
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
        {t("streams.savings")}
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
      <text
        x={LABEL_X}
        y={TANK_Y - 4}
        fontSize={12}
        fontWeight={700}
        fill={INVESTING_COLOR}
        fontFamily="var(--font-ui)"
      >
        {t("streams.investing")}
      </text>
      {investingLayout.map(({ item, lines, cy }) => (
        <g key={item.label}>
          <circle cx={BULLET_CX} cy={cy} r={2.5} fill={INVESTING_COLOR} />
          <StackedText
            x={BULLET_TEXT_X}
            y={cy + 4}
            lines={lines}
            fontSize={10}
            fill="#5c5347"
            fontFamily="var(--font-ui)"
          />
        </g>
      ))}

      {/* Out to giving */}
      <path
        d={`M${TANK_RIGHT},${TANK_BOTTOM - 22} C${TANK_RIGHT + 32},${TANK_BOTTOM - 22} ${TANK_RIGHT + 42},${TANK_BOTTOM + 8 + giveShift} ${BRANCH_X},${TANK_BOTTOM + 8 + giveShift}`}
        fill="none"
        stroke={GIVING_COLOR}
        strokeWidth={2}
        strokeOpacity={0.7}
      />
      <circle
        cx={BRANCH_X}
        cy={TANK_BOTTOM + 8 + giveShift}
        r={3.5}
        fill={GIVING_COLOR}
      />
      <text
        x={LABEL_X}
        y={TANK_BOTTOM + 12 + giveShift}
        fontSize={12}
        fontWeight={700}
        fill={GIVING_COLOR}
        fontFamily="var(--font-ui)"
      >
        {t("streams.giving")}
      </text>
      {neighbors.map((item, i) => (
        <g key={item.label}>
          <circle
            cx={BULLET_CX}
            cy={TANK_BOTTOM + 28 + giveShift + i * 15}
            r={2.5}
            fill={GIVING_COLOR}
          />
          <text
            x={BULLET_TEXT_X}
            y={TANK_BOTTOM + 32 + giveShift + i * 15}
            fontSize={10}
            fill="#5c5347"
            fontFamily="var(--font-ui)"
          >
            {item.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
