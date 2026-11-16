import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useLang } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";
import { localizedQuiz } from "../../content/localized";
import { hasPassedRiverQuiz } from "../../state/progress";
import { REVIEW_DAYS, dueReviews, reviewQuestions, type DueReview, type QuizReview } from "../../state/review";
import { RIVERS } from "../../theme/theme";
import type { RiverNumber } from "../../types";
import { Button } from "../ui/Button";
import { FeatureIcon } from "../ui/FeatureIcons";
import { PageSkeleton } from "../ui/Skeleton";
import { ExplanationBox } from "./ExplanationBox";

/**
 * A spaced review (Update 40): three questions from a river's quiz, 1, 7 or 30 days after it was passed. Answer, check,
 * see why with the lesson's verse, and it's marked done. Nothing is locked or unlocked by it; it's for remembering.
 */
export function ReviewPage() {
  const { river: r, round: rd } = useParams();
  const river = Number(r) as RiverNumber;
  const round = Number(rd) as 1 | 2 | 3;
  const { snapshot, repository } = useCourse();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  if (![1, 2, 3, 4].includes(river) || ![1, 2, 3].includes(round)) return <Navigate to="/course" replace />;
  if (!snapshot) return <PageSkeleton label={t("common.loading")} />;
  if (!hasPassedRiverQuiz(snapshot.progress, river)) return <Navigate to="/course" replace />;

  const quiz = localizedQuiz(river, lang);
  const picks = reviewQuestions(round, quiz.length);
  const theme = RIVERS[river - 1];
  const score = picks.filter((i) => answers[i] === quiz[i].correctIndex).length;
  const allAnswered = picks.every((i) => answers[i] !== undefined);

  async function finish() {
    setSaving(true);
    try {
      await repository.saveQuizReview(river, round, score);
    } finally {
      setSaving(false);
    }
    navigate("/course");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 py-4">
      <header className="rise-in">
        <Link to="/course" className="font-[family-name:var(--font-ui)] text-sm text-ink-soft hover:text-ink">
          {t("review.back")}
        </Link>
        <p className="cm-label mt-4">{t(round === 1 ? "review.eyebrow1" : "review.eyebrow", { n: river, days: REVIEW_DAYS[round - 1] })}</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-ink">
          {t(`river.${river}.title` as StringKey)}
        </h1>
        <span aria-hidden="true" className="grow-x mt-4 block h-px w-16" style={{ backgroundColor: theme.accent }} />
        <p className="mt-4 font-[family-name:var(--font-ui)] text-sm leading-relaxed text-ink-soft">{t("review.intro")}</p>
      </header>

      <ol className="flex flex-col gap-4">
        {picks.map((qi, n) => {
          const q = quiz[qi];
          const chosen = answers[qi];
          return (
            <li key={qi} className="cm-card p-5 sm:p-6">
              <fieldset>
                <legend className="font-[family-name:var(--font-display)] text-lg font-semibold leading-snug text-ink">
                  <span className="mr-2 font-[family-name:var(--font-ui)] text-sm tabular-nums text-ink-soft">{n + 1}.</span>
                  {q.question}
                </legend>
                <div className="mt-4 flex flex-col gap-2">
                  {q.options.map((opt, oi) => {
                    const right = checked && oi === q.correctIndex;
                    const wrong = checked && chosen === oi && oi !== q.correctIndex;
                    return (
                      <label
                        key={oi}
                        className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 font-[family-name:var(--font-ui)] text-sm transition-colors ${
                          right ? "border-olive bg-olive/10 text-ink" : wrong ? "border-red-700/60 bg-red-700/5 text-ink" : chosen === oi ? "border-water-deep bg-water-deep/5 text-ink" : "border-line text-ink hover:bg-parchment-deep/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q${qi}`}
                          className="mt-0.5"
                          checked={chosen === oi}
                          disabled={checked}
                          onChange={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                        />
                        <span className="flex-1">{opt}</span>
                        {right && <FeatureIcon name="tick" size={16} className="shrink-0 text-olive" />}
                      </label>
                    );
                  })}
                </div>
                {checked && (
                  <div className="mt-3">
                    <ExplanationBox set={String(river) as "1"} index={qi} correct={chosen === q.correctIndex} />
                  </div>
                )}
              </fieldset>
            </li>
          );
        })}
      </ol>

      <div className="cm-card flex flex-wrap items-center justify-between gap-3 p-5">
        {checked ? (
          <>
            <p role="status" className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
              {t(score === picks.length ? "review.allRight" : "review.score", { score, total: picks.length })}
            </p>
            <Button onClick={finish} disabled={saving}>
              {saving ? t("review.saving") : t("review.done")}
            </Button>
          </>
        ) : (
          <>
            <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("review.note")}</p>
            <Button onClick={() => setChecked(true)} disabled={!allAnswered}>
              {t("review.check")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/** The course home's card: the next review that's due, if any. */
export function ReviewCard() {
  const { snapshot, repository } = useCourse();
  const { t } = useLang();
  const [done, setDone] = useState<QuizReview[] | null>(null);
  useEffect(() => {
    let live = true;
    repository
      .listQuizReviews()
      .then((list) => live && setDone(list))
      .catch(() => live && setDone([]));
    return () => {
      live = false;
    };
  }, [repository]);
  if (!snapshot || !done) return null;
  const due: DueReview[] = dueReviews(snapshot, done);
  if (due.length === 0) return null;
  const next = due[0];
  return (
    <Link
      to={`/course/review/${next.river}/${next.round}`}
      data-tour="review-card"
      className="cm-card cm-lift group relative flex flex-wrap items-center justify-between gap-3 overflow-hidden p-5 pl-6"
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: RIVERS[next.river - 1].accent }} />
      <span className="min-w-0">
        <span className="block font-[family-name:var(--font-display)] text-lg font-semibold text-ink">{t("review.cardTitle")}</span>
        <span className="block font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          {t(next.round === 1 ? "review.cardText1" : "review.cardText", { n: next.river, title: t(`river.${next.river}.title` as StringKey), days: REVIEW_DAYS[next.round - 1] })}
          {due.length > 1 && ` ${t("review.more", { n: due.length - 1 })}`}
        </span>
      </span>
      <span className="inline-flex items-center gap-1.5 font-[family-name:var(--font-ui)] text-sm font-medium text-water-deep">
        {t("review.start")}
        <FeatureIcon name="arrow" size={16} className="cm-arrow" />
      </span>
    </Link>
  );
}
