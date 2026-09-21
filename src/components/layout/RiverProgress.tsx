import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RIVERS, THEME } from "../../theme/theme";
import type { CourseSnapshot, RiverNumber, RiverStatus } from "../../types";
import { deriveRiverStatus, isRiverUnlocked } from "../../state/progress";

/**
 * The four-rivers flow: one source (left) that runs through four stations. The
 * "water" fills from the source as rivers are completed — a complete river fills
 * its whole segment, an in-progress one fills half. Stations are clickable when
 * unlocked. This is the course's primary progress indicator, so the flow motif
 * is functional here, not decoration.
 */

const W = 720;
const H = 132;
const PAD = 46;
const BASELINE = 52;
const AMP = 12;

function wavePath(): string {
  const span = W - PAD * 2;
  const pts: string[] = [`M ${PAD} ${BASELINE}`];
  const steps = 24;
  for (let i = 1; i <= steps; i++) {
    const x = PAD + (span * i) / steps;
    const y = BASELINE + Math.sin((i / steps) * Math.PI * 4) * AMP;
    pts.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

function stationX(index: number): number {
  const span = W - PAD * 2;
  return PAD + (span * (index + 0.5)) / RIVERS.length;
}

function stationY(index: number): number {
  const span = W - PAD * 2;
  const frac = (stationX(index) - PAD) / span;
  return BASELINE + Math.sin(frac * Math.PI * 4) * AMP;
}

function fillFraction(statuses: RiverStatus[]): number {
  let filled = 0;
  for (let i = 0; i < statuses.length; i++) {
    if (statuses[i] === "complete") filled = i + 1;
    else if (statuses[i] === "in_progress") {
      filled = i + 0.5;
      break;
    } else break;
  }
  return filled / statuses.length;
}

export function RiverProgress({
  snapshot,
  activeRiver,
}: {
  snapshot: CourseSnapshot;
  activeRiver?: RiverNumber;
}) {
  const navigate = useNavigate();
  const path = useMemo(() => wavePath(), []);

  const statuses = RIVERS.map((r) => deriveRiverStatus(snapshot, r.number));
  const frac = fillFraction(statuses);

  // Approx path length for the dash trick (polyline of ~equal segments).
  const approxLen = W - PAD * 2 + AMP * 4;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full max-w-3xl"
      role="img"
      aria-label={`Course progress: ${statuses.filter((s) => s === "complete").length} of 4 rivers complete`}
    >
      <defs>
        <linearGradient id="riverFlow" x1="0" y1="0" x2="1" y2="0">
          {THEME.motif.flow.map((c, i) => (
            <stop key={c} offset={`${(i / (THEME.motif.flow.length - 1)) * 100}%`} stopColor={c} />
          ))}
        </linearGradient>
      </defs>

      {/* source */}
      <circle cx={PAD - 14} cy={BASELINE} r="7" fill={THEME.motif.sourceColor} />
      <text
        x={PAD - 14}
        y={BASELINE + 26}
        textAnchor="middle"
        className="fill-ink-soft"
        style={{ font: "11px var(--font-ui)" }}
      >
        Eden
      </text>

      {/* dry riverbed */}
      <path d={path} fill="none" stroke={THEME.palette.line} strokeWidth="6" strokeLinecap="round" />
      {/* flowing water, filled to progress */}
      <path
        d={path}
        fill="none"
        stroke="url(#riverFlow)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={approxLen}
        strokeDashoffset={approxLen * (1 - frac)}
      />

      {RIVERS.map((river, i) => {
        const status = statuses[i];
        const unlocked = isRiverUnlocked(snapshot, river.number);
        const x = stationX(i);
        const y = stationY(i);
        const isActive = activeRiver === river.number;
        const fill =
          status === "complete" ? river.accent : status === "in_progress" ? "#fff" : "#fff";
        return (
          <g
            key={river.number}
            className={unlocked ? "cursor-pointer" : "cursor-not-allowed"}
            onClick={() => unlocked && navigate(`/course/river/${river.number}`)}
          >
            <circle
              cx={x}
              cy={y}
              r={isActive ? 13 : 10}
              fill={fill}
              stroke={unlocked ? river.accent : THEME.palette.line}
              strokeWidth={isActive ? 4 : 3}
            />
            {status === "complete" && (
              <path
                d={`M ${x - 4} ${y} l 3 3 l 6 -7`}
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {!unlocked && (
              <text x={x} y={y + 4} textAnchor="middle" style={{ font: "10px var(--font-ui)" }} className="fill-ink-soft">
                ✦
              </text>
            )}
            <text
              x={x}
              y={H - 34}
              textAnchor="middle"
              className={isActive ? "fill-ink" : "fill-ink-soft"}
              style={{ font: `${isActive ? "600 " : ""}12px var(--font-ui)` }}
            >
              {river.number}. {shortTitle(river.key)}
            </text>
            <text
              x={x}
              y={H - 18}
              textAnchor="middle"
              className="fill-ink-soft"
              style={{ font: "10px var(--font-ui)" }}
            >
              {statusLabel(status, unlocked)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function shortTitle(key: string): string {
  switch (key) {
    case "income":
      return "Income";
    case "saving":
      return "Saving";
    case "investing":
      return "Investing";
    default:
      return "Giving";
  }
}

function statusLabel(s: RiverStatus, unlocked: boolean): string {
  if (s === "complete") return "Complete";
  if (s === "in_progress") return "In progress";
  return unlocked ? "Not started" : "Locked";
}
