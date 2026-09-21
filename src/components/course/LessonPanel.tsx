import type { Lesson } from "../../types";
import type { RiverTheme } from "../../theme/theme";
import { EDEN_RIVER_REFS } from "../../content/scripture";
import { lessonReadingMinutes } from "../../content/lessons";
import { segKey } from "../../lib/lessonSegments";
import { ScriptureList } from "../ui/Scripture";

const HIGHLIGHT = "rounded-lg bg-gold/15 transition-colors";
const IDLE = "rounded-lg transition-colors";

export function LessonPanel({
  lesson,
  river,
  activeKey = null,
}: {
  lesson: Lesson;
  river: RiverTheme;
  /** Read-aloud segment currently being spoken, if any. */
  activeKey?: string | null;
}) {
  const cls = (key: string) => (activeKey === key ? HIGHLIGHT : IDLE);

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div>
          <p
            className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.18em]"
            style={{ color: river.accent }}
          >
            River {river.number} · named for the {river.edenRiver} (
            {EDEN_RIVER_REFS[river.number]}) · ≈ {lessonReadingMinutes(lesson)} min read
          </p>
          <h1 data-seg={segKey.title} className={`mt-1 text-3xl font-semibold text-ink ${cls(segKey.title)}`}>
            {lesson.title}
          </h1>
          <p
            data-seg={segKey.intro}
            className={`mt-3 text-lg leading-relaxed text-ink-soft ${cls(segKey.intro)}`}
          >
            {lesson.intro}
          </p>
        </div>
        <ScriptureList
          verses={lesson.introScripture}
          segPrefix={segKey.introVersePrefix}
          activeKey={activeKey}
        />
      </header>

      {lesson.sections.map((section, s) => (
        <section key={section.heading} className="flex flex-col gap-3">
          <h2
            data-seg={segKey.heading(s)}
            className={`text-xl font-semibold text-ink ${cls(segKey.heading(s))}`}
          >
            {section.heading}
          </h2>
          {section.body.map((para, p) => (
            <p
              key={p}
              data-seg={segKey.para(s, p)}
              className={`leading-relaxed text-ink-soft ${cls(segKey.para(s, p))}`}
            >
              {para}
            </p>
          ))}
          <div
            className="rounded-xl bg-parchment-deep/50 p-4"
            style={{ borderLeft: `4px solid ${river.accent}` }}
          >
            <h3 className="mb-3 font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">
              Scripture
            </h3>
            <ScriptureList
              verses={section.scriptureRefs}
              segPrefix={segKey.versePrefix(s)}
              activeKey={activeKey}
            />
          </div>
        </section>
      ))}
    </article>
  );
}
