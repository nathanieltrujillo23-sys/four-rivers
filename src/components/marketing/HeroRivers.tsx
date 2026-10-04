import { RIVERS } from "../../theme/theme";
import { useT } from "../../i18n/LanguageContext";

const WIDTH = 600;
const HEIGHT = 190;
const SOURCE = { x: 300, y: 10 };
const ENDPOINTS = [90, 230, 370, 510];

/**
 * A larger, labeled version of the brand mark's "one source, four streams"
 * motif, for the landing page hero. Doubles as a quick instructional diagram
 * (each stream is named) rather than being purely decorative.
 */
export function HeroRivers() {
  const t = useT();
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="mx-auto w-full max-w-xl"
      role="img"
      aria-label={t("hero.aria")}
    >
      {RIVERS.map((r, i) => {
        const endX = ENDPOINTS[i];
        const midY = SOURCE.y + (HEIGHT - 30 - SOURCE.y) * 0.55;
        return (
          <g key={r.number}>
            <path
              d={`M${SOURCE.x},${SOURCE.y} C${SOURCE.x},${midY} ${endX},${midY} ${endX},${HEIGHT - 30}`}
              fill="none"
              stroke={r.accent}
              strokeWidth={7}
              strokeOpacity={0.85}
              strokeLinecap="round"
            />
            <circle cx={endX} cy={HEIGHT - 30} r={4} fill={r.accent} />
            <text
              x={endX}
              y={HEIGHT - 8}
              textAnchor="middle"
              fontSize={13}
              fontWeight={600}
              fill={r.accent}
              fontFamily="var(--font-ui)"
            >
              {t(`hero.${r.key}` as const)}
            </text>
          </g>
        );
      })}
      <circle cx={SOURCE.x} cy={SOURCE.y} r={6} fill="var(--color-gold)" />
    </svg>
  );
}
