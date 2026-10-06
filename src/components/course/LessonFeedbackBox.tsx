import { useEffect, useRef, useState } from "react";
import { useCourse } from "../../state/CourseContext";
import { useLang } from "../../i18n/LanguageContext";
import type { ModuleSection } from "../../types";
import { Button } from "../ui/Button";
import { TextArea } from "../ui/Field";

const SKIP_KEY = "four-rivers:feedback-skipped";

function readSkipped(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SKIP_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function writeSkipped(set: Set<string>) {
  try {
    localStorage.setItem(SKIP_KEY, JSON.stringify([...set]));
  } catch {
    /* it just comes back next time */
  }
}

/**
 * "Did this lesson help you personally?" with an optional note. One answer per learner per lesson, and it can be
 * changed. A Skip button puts the box away for that lesson (it remembers), so nobody feels obliged to answer every one.
 */
export function LessonFeedbackBox({ section, moduleIndex }: { section: ModuleSection; moduleIndex: number }) {
  const { repository } = useCourse();
  const { t } = useLang();
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // Once the learner has answered, a slower "load my earlier answer" must not overwrite what they just chose.
  const touched = useRef(false);
  const lessonKey = `${section}:${moduleIndex}`;
  const [skipped, setSkipped] = useState(() => readSkipped().has(lessonKey));

  useEffect(() => {
    setSkipped(readSkipped().has(lessonKey));
  }, [lessonKey]);

  const setSkip = (value: boolean) => {
    const all = readSkipped();
    if (value) all.add(lessonKey);
    else all.delete(lessonKey);
    writeSkipped(all);
    setSkipped(value);
  };

  useEffect(() => {
    touched.current = false;
    let alive = true;
    repository
      .getLessonFeedback(section, moduleIndex)
      .then((f) => {
        if (!alive || touched.current) return;
        setHelpful(f ? f.helpful : null);
        setNote(f?.note ?? "");
        setState(f ? "saved" : "idle");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [repository, section, moduleIndex]);

  async function save(next: boolean | null = helpful, text = note) {
    if (next === null) return;
    setState("saving");
    try {
      await repository.saveLessonFeedback(section, moduleIndex, next, text);
      setState("saved");
    } catch {
      setState("error");
    }
  }

  const pick = (value: boolean) => {
    touched.current = true;
    setHelpful(value);
    void save(value);
  };

  // Skipped and never answered: just a quiet link to come back to it.
  if (skipped && helpful === null) {
    return (
      <p className="mt-2 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
        <button type="button" onClick={() => setSkip(false)} className="underline hover:text-ink">
          {t("fb.reopen")}
        </button>
      </p>
    );
  }

  return (
    <section
      aria-labelledby="lesson-feedback-title"
      className="mt-2 flex flex-col gap-3 rounded-xl border border-line bg-surface/60 p-4 font-[family-name:var(--font-ui)]"
    >
      <h3 id="lesson-feedback-title" className="text-sm font-semibold text-ink">
        {t("fb.title")}
      </h3>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("fb.title")}>
        {[
          { value: true, label: t("fb.yes") },
          { value: false, label: t("fb.no") },
        ].map((o) => (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={helpful === o.value}
            onClick={() => pick(o.value)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              helpful === o.value
                ? "border-water-deep bg-water-deep text-white"
                : "border-line bg-surface text-ink-soft hover:bg-parchment-deep"
            }`}
          >
            {o.label}
          </button>
        ))}
        {helpful === null && (
          <button
            type="button"
            onClick={() => setSkip(true)}
            className="rounded-full px-3 py-1.5 text-sm text-ink-soft underline-offset-2 hover:text-ink hover:underline"
          >
            {t("fb.skip")}
          </button>
        )}
      </div>
      {helpful !== null && (
        <div className="flex flex-col gap-2">
          <label htmlFor="lesson-feedback-note" className="text-xs text-ink-soft">
            {helpful ? t("fb.noteYes") : t("fb.noteNo")}
          </label>
          <TextArea
            id="lesson-feedback-note"
            value={note}
            maxLength={600}
            rows={helpful ? 2 : 3}
            onChange={(e) => {
              setNote(e.target.value);
              if (state === "saved") setState("idle");
            }}
          />
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              disabled={state === "saving" || state === "saved"}
              onClick={() => void save()}
            >
              {t("fb.send")}
            </Button>
            <span role="status" className="text-xs text-ink-soft">
              {state === "saved" ? t("fb.thanks") : state === "error" ? t("fb.error") : ""}
            </span>
          </div>
        </div>
      )}
      {helpful === true && <p className="text-[11px] leading-snug text-ink-soft">{t("fb.impact")}</p>}
    </section>
  );
}
