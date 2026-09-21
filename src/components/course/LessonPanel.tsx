import type { Lesson } from "../../types";
import type { RiverTheme } from "../../theme/theme";
import { EDEN_RIVER_REFS } from "../../content/scripture";
import { ScriptureList } from "../ui/Scripture";

export function LessonPanel({ lesson, river }: { lesson: Lesson; river: RiverTheme }) {
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div>
          <p
            className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.18em]"
            style={{ color: river.accent }}
          >
            River {river.number} · named for the {river.edenRiver} (
            {EDEN_RIVER_REFS[river.number]})
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">{lesson.title}</h1>
          <p className="mt-3 text-lg leading-relaxed text-ink-soft">{lesson.intro}</p>
        </div>
        <ScriptureList verses={lesson.introScripture} />
      </header>

      {lesson.sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-ink">{section.heading}</h2>
          {section.body.map((para, i) => (
            <p key={i} className="leading-relaxed text-ink-soft">
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
            <ScriptureList verses={section.scriptureRefs} />
          </div>
        </section>
      ))}
    </article>
  );
}
