import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RIVERS } from "../../theme/theme";
import type { CourseSnapshot, RiverNumber } from "../../types";
import { deriveRiverStatus, hasPassedRiverQuiz, isModuleViewed, isRiverUnlocked } from "../../state/progress";
import { useLang } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";
import { END_Y, H, SPLIT, SRC, W, branch } from "../../lib/courseMapGeometry";

/**
 * The course map (Update 39): Genesis 2:10 drawn as the course. One river, the Introduction, flows from the source and
 * divides into four: income, saving, investing and giving. Each river fills with its color as its lessons are read,
 * every lesson is a stop along it, and the quiz is the last stop. The drawing is decoration for sighted readers; the
 * labels underneath carry the same information as text and links.
 */

export function CourseMap({ snapshot, introCount, lessonCounts }: { snapshot: CourseSnapshot; introCount: number; lessonCounts: Record<RiverNumber, number> }) {
  const { t } = useLang();
  // Draw from empty on first view; the motion settings switch the transition off.
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const introRead = Array.from({ length: introCount }, (_, i) => isModuleViewed(snapshot, "introduction", i));
  const introFraction = introCount ? introRead.filter(Boolean).length / introCount : 0;
  const rivers = RIVERS.map((r, i) => {
    const n = lessonCounts[r.number];
    const read = Array.from({ length: n }, (_, m) => isModuleViewed(snapshot, r.number, m));
    const quiz = hasPassedRiverQuiz(snapshot.progress, r.number);
    const steps = n + 1;
    const fraction = (read.filter(Boolean).length + (quiz ? 1 : 0)) / steps;
    return {
      r,
      b: branch(i),
      read,
      quiz,
      fraction,
      status: deriveRiverStatus(snapshot, r.number),
      unlocked: isRiverUnlocked(snapshot, r.number),
    };
  });
  const done = rivers.filter((x) => x.status === "complete").length;

  return (
    <section aria-labelledby="course-map-title" data-tour="course-map" className="cm-card overflow-hidden px-4 pb-5 pt-5 sm:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="course-map-title" className="cm-label">
          {t("map.title")}
        </h2>
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("map.verse")}</p>
      </div>

      <p className="mt-3 text-center font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
        <Link to="/course/introduction" className="hover:text-water-deep">
          {t("map.intro")}
        </Link>
        <span className="ml-2 font-normal text-ink-soft">
          {t("map.read", { n: introRead.filter(Boolean).length, total: introCount })}
        </span>
      </p>

      <svg viewBox={`0 0 ${W} ${H}`} className="cmap block h-auto w-full" aria-hidden="true" focusable="false">
        {/* the source and the one river */}
        <circle cx={SRC.x} cy={SRC.y} r="7" className="fill-water-deep" />
        <path d={`M ${SRC.x} ${SRC.y} L ${SPLIT.x} ${SPLIT.y}`} className="stroke-line" strokeWidth="6" strokeLinecap="round" fill="none" />
        <path
          d={`M ${SRC.x} ${SRC.y} L ${SPLIT.x} ${SPLIT.y}`}
          className="cmap-flow stroke-water-deep"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={drawn ? 1 - introFraction : 1}
        />
        {introRead.map((isRead, i) => {
          const y = SRC.y + ((i + 1) / (introCount + 1)) * (SPLIT.y - SRC.y);
          return <circle key={i} cx={SRC.x} cy={y} r="3.2" fill="var(--color-surface)" stroke={isRead ? "none" : "var(--color-line)"} strokeWidth="1.5" />;
        })}

        {/* the four rivers */}
        {rivers.map(({ r, b, read, quiz, fraction, unlocked }, i) => {
          const steps = read.length + 1;
          return (
            <g key={r.number} opacity={unlocked ? 1 : 0.45}>
              <path d={b.d} className="stroke-line" strokeWidth="6" strokeLinecap="round" fill="none" />
              <path
                d={b.d}
                className="cmap-flow"
                stroke={r.accent}
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset={drawn ? 1 - fraction : 1}
                style={{ transitionDelay: `${0.35 + i * 0.12}s` }}
              />
              {read.map((isRead, m) => {
                const p = b.at(0.14 + (0.86 * (m + 1)) / steps);
                return (
                  <circle
                    key={m}
                    cx={p.x}
                    cy={p.y}
                    r="5"
                    strokeWidth="2"
                    stroke={isRead ? r.accent : "var(--color-line)"}
                    fill={isRead ? r.accent : "var(--color-surface)"}
                  />
                );
              })}
              {/* the quiz: a small square at the river's end */}
              <rect
                x={b.at(1).x - 7}
                y={END_Y - 7}
                width="14"
                height="14"
                rx="3"
                strokeWidth="2"
                stroke={quiz ? r.accent : "var(--color-line)"}
                fill={quiz ? r.accent : "var(--color-surface)"}
              />
              {quiz && <path d={`M ${b.at(1).x - 4} ${END_Y} l 3 3 l 5 -6`} stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
            </g>
          );
        })}
      </svg>

      <ol className="mt-1 grid grid-cols-4 gap-1 text-center">
        {rivers.map(({ r, read, quiz, status, unlocked }) => {
          const name = t(`hero.${r.key}` as StringKey);
          const readCount = read.filter(Boolean).length;
          const summary = t("map.riverSummary", { n: readCount, total: read.length }) + (quiz ? ` · ${t("map.quizPassed")}` : "");
          const inner = (
            <>
              <span className="block font-[family-name:var(--font-ui)] text-[11px] font-medium tabular-nums text-ink-soft">{r.number}</span>
              <span className="block font-[family-name:var(--font-display)] text-[15px] font-semibold leading-tight text-ink sm:text-lg">{name}</span>
              <span className="mt-0.5 block font-[family-name:var(--font-ui)] text-[11px] text-ink-soft">
                {status === "complete" ? t("badge.complete") : unlocked ? t("map.readShort", { n: readCount, total: read.length }) : t("badge.locked")}
              </span>
              <span className="sr-only">{summary}</span>
            </>
          );
          return (
            <li key={r.number}>
              {unlocked ? (
                <Link to={`/course/river/${r.number}`} className="block rounded-md px-1 py-1.5 transition-colors hover:bg-parchment-deep/50">
                  {inner}
                </Link>
              ) : (
                <span className="block px-1 py-1.5">{inner}</span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="sr-only">{t("progress.aria", { n: done })}</p>
    </section>
  );
}
