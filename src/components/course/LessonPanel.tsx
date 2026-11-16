import type { Lesson, ModuleSection } from "../../types";
import { readable } from "../../theme/theme";
import { segKey } from "../../lib/lessonSegments";
import { useLang } from "../../i18n/LanguageContext";
import { withGlossary } from "../../lib/glossaryText";
import { ScriptureList } from "../ui/Scripture";
import { ContentEditPencil } from "./ContentEditPencil";
import { LessonFeedbackBox } from "./LessonFeedbackBox";

const HIGHLIGHT = "rounded-lg bg-gold/15 transition-colors";
const IDLE = "rounded-lg transition-colors";

/** Renders one lesson: title, body paragraphs, then its supporting scripture. */
export function LessonPanel({
  lesson,
  river,
  eyebrow,
  activeKey = null,
  editable,
}: {
  lesson: Lesson;
  /** Only the accent color is used — a full RiverTheme or a plain `{ accent }` both work. */
  river: { accent: string };
  /** Small context line above the title, e.g. "River 1 · Lesson 2 of 7 · ≈ 3 min read". */
  eyebrow?: string;
  /** Read-aloud segment currently being spoken, if any. */
  activeKey?: string | null;
  /** When set, shows the admin-only edit pencil for this exact module. */
  editable?: { section: ModuleSection; moduleIndex: number };
}) {
  const cls = (key: string) => (activeKey === key ? HIGHLIGHT : IDLE);
  const { lang, t } = useLang();
  // Shared across paragraphs so each term is marked only where it first appears.
  const seen = new Set<string>();
  const paragraphs = lesson.body.map((para) => withGlossary(para, seen, lang));

  return (
    <article className="relative flex flex-col gap-6 pb-6">
      {editable && <ContentEditPencil section={editable.section} moduleIndex={editable.moduleIndex} />}
      <header>
        {eyebrow && (
          <p
            className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.18em]"
            style={{ color: readable(river.accent) }}
          >
            {eyebrow}
          </p>
        )}
        <h1
          data-seg={segKey.title}
          className={`mt-2 font-[family-name:var(--font-display)] text-[2.1rem] font-semibold leading-tight tracking-tight text-ink sm:text-[2.5rem] ${cls(segKey.title)}`}
        >
          {lesson.title}
        </h1>
        <span aria-hidden="true" className="grow-x mt-5 block h-px w-16" style={{ backgroundColor: river.accent }} />
      </header>

      {paragraphs.map((para, p) => (
        <p
          key={p}
          data-seg={segKey.para(p)}
          className={`text-[1.0625rem] leading-[1.8] text-ink/90 ${cls(segKey.para(p))}`}
        >
          {para}
        </p>
      ))}
      {seen.size > 0 && (
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("glossary.hint")}</p>
      )}

      <section className="cm-card relative overflow-hidden p-5 pl-6 sm:p-6 sm:pl-7">
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: river.accent }} />
        <h2 className="cm-label mb-4">{t("lesson.scripture")}</h2>
        <ScriptureList verses={lesson.scriptureRefs} segPrefix={segKey.versePrefix} activeKey={activeKey} />
      </section>
      {editable && <LessonFeedbackBox section={editable.section} moduleIndex={editable.moduleIndex} />}
    </article>
  );
}
