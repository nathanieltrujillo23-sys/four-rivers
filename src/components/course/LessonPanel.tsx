import type { Lesson, ModuleSection } from "../../types";
import { segKey } from "../../lib/lessonSegments";
import { useLang } from "../../i18n/LanguageContext";
import { withGlossary } from "../../lib/glossaryText";
import { ScriptureList } from "../ui/Scripture";
import { ContentEditPencil } from "./ContentEditPencil";

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
    <article className="relative flex flex-col gap-6 pb-10">
      {editable && <ContentEditPencil section={editable.section} moduleIndex={editable.moduleIndex} />}
      <header>
        {eyebrow && (
          <p
            className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.18em]"
            style={{ color: river.accent }}
          >
            {eyebrow}
          </p>
        )}
        <h1 data-seg={segKey.title} className={`mt-1 text-3xl font-semibold text-ink ${cls(segKey.title)}`}>
          {lesson.title}
        </h1>
      </header>

      {paragraphs.map((para, p) => (
        <p
          key={p}
          data-seg={segKey.para(p)}
          className={`leading-relaxed text-ink-soft ${cls(segKey.para(p))}`}
        >
          {para}
        </p>
      ))}
      {seen.size > 0 && (
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft/80">{t("glossary.hint")}</p>
      )}

      <div
        className="rounded-xl bg-parchment-deep/50 p-4"
        style={{ borderLeft: `4px solid ${river.accent}` }}
      >
        <h3 className="mb-3 font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">
          Scripture
        </h3>
        <ScriptureList verses={lesson.scriptureRefs} segPrefix={segKey.versePrefix} activeKey={activeKey} />
      </div>
    </article>
  );
}
