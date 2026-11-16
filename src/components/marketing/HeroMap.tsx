import { RIVERS } from "../../theme/theme";
import { useLang } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";
import { END_Y, H, SPLIT, SRC, W, branch } from "../../lib/courseMapGeometry";

/** How far along each river the sample learner is, and how many lessons each river has. */
const SAMPLE = [
  { fill: 1, lessons: 7 },
  { fill: 0.72, lessons: 7 },
  { fill: 0.34, lessons: 9 },
  { fill: 0.1, lessons: 8 },
];

/**
 * The home page's opening picture (Update 39): the same course map learners see, drawn for a sample learner partway
 * through. The source, the Introduction and the four rivers draw in one after another and the lesson stops fill as the
 * water reaches them; with reduced motion it simply shows the finished picture.
 */
export function HeroMap() {
  const { t } = useLang();
  return (
    <figure className="hero-map cm-card relative overflow-hidden px-4 pb-4 pt-5 sm:px-6">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="cm-label">{t("heroMap.label")}</span>
        <span className="font-[family-name:var(--font-ui)] text-[11px] text-ink-soft">{t("heroMap.note")}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 block h-auto w-full" role="img" aria-label={t("hero.aria")}>
        <circle cx={SRC.x} cy={SRC.y} r="7" className="fill-water-deep" />
        <path
          d={`M ${SRC.x} ${SRC.y} L ${SPLIT.x} ${SPLIT.y}`}
          className="hm-flow stroke-water-deep"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          pathLength={1}
          style={{ ["--to" as string]: 0, ["--d" as string]: "0.2s" }}
        />
        {RIVERS.map((r, i) => {
          const b = branch(i);
          const s = SAMPLE[i];
          const steps = s.lessons + 1;
          const delay = 0.9 + i * 0.22;
          return (
            <g key={r.number}>
              <path d={b.d} className="stroke-line" strokeWidth="6" strokeLinecap="round" fill="none" />
              <path
                d={b.d}
                className="hm-flow"
                stroke={r.accent}
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                pathLength={1}
                style={{ ["--to" as string]: 1 - s.fill, ["--d" as string]: `${delay}s` }}
              />
              {Array.from({ length: s.lessons }, (_, m) => {
                const at = 0.14 + (0.86 * (m + 1)) / steps;
                const p = b.at(at);
                const read = at <= s.fill + 0.001;
                return (
                  <circle
                    key={m}
                    cx={p.x}
                    cy={p.y}
                    r="5"
                    strokeWidth="2"
                    stroke={read ? r.accent : "var(--color-line)"}
                    fill={read ? r.accent : "var(--color-surface)"}
                    className={read ? "hm-stop" : undefined}
                    style={read ? { ["--d" as string]: `${delay + at * 1.2}s` } : undefined}
                  />
                );
              })}
              <rect
                x={b.at(1).x - 7}
                y={END_Y - 7}
                width="14"
                height="14"
                rx="3"
                strokeWidth="2"
                stroke={s.fill >= 1 ? r.accent : "var(--color-line)"}
                fill={s.fill >= 1 ? r.accent : "var(--color-surface)"}
              />
            </g>
          );
        })}
      </svg>
      <ol className="mt-1 grid grid-cols-4 gap-1 text-center" aria-hidden="true">
        {RIVERS.map((r) => (
          <li key={r.number}>
            <span className="block font-[family-name:var(--font-ui)] text-[10px] tabular-nums text-ink-soft">{r.number}</span>
            <span className="block font-[family-name:var(--font-display)] text-sm font-semibold text-ink sm:text-base">{t(`hero.${r.key}` as StringKey)}</span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
