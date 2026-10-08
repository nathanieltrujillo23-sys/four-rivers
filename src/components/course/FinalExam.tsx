import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { canTakeFinalExam } from "../../state/progress";
import { EXAM_PASS_THRESHOLD, EXAM_QUESTION_COUNT } from "../../content/exam";
import { localizedExam } from "../../content/localized";
import { useLang } from "../../i18n/LanguageContext";
import { THEME, readable } from "../../theme/theme";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { ProgressBar } from "../ui/ProgressBar";
import { LoadError } from "../ui/LoadError";
import { PageSkeleton } from "../ui/Skeleton";

const ACCENT = THEME.palette.gold;

/**
 * The 50-question final exam: one question per page, arrows to move between
 * pages, four options each. Requires all four rivers complete, every module
 * explicitly marked read, and every river quiz passed (`canTakeFinalExam`) —
 * this is the course's capstone, not another river step. Passing (35/50)
 * unlocks the certificate. Retakes are unlimited, same as the per-river
 * quizzes.
 */
export function FinalExam() {
  const { snapshot, loading, loadError, reload, recordExamResult, repository } = useCourse();
  const { lang, t } = useLang();
  const EXAM_QUESTIONS = localizedExam(lang);
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => EXAM_QUESTIONS.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (loading && !snapshot)
    return <PageSkeleton label={t("common.loading")} />;
  if (loadError) return <LoadError message={loadError} onRetry={reload} />;
  if (!snapshot) return null;
  if (!canTakeFinalExam(snapshot)) return <Navigate to="/course" replace />;

  const q = EXAM_QUESTIONS[page];
  const allAnswered = answers.every((a) => a !== null);
  const answeredCount = answers.filter((a) => a !== null).length;
  const passed = score >= EXAM_PASS_THRESHOLD;
  const alreadyPassed = !!snapshot.profile.examPassedAt;
  const passPercent = Math.round((EXAM_PASS_THRESHOLD / EXAM_QUESTION_COUNT) * 100);

  async function handleSubmit() {
    if (!allAnswered || busy) return;
    const finalScore = answers.reduce<number>(
      (sum, a, i) => sum + (a === EXAM_QUESTIONS[i].correctIndex ? 1 : 0),
      0,
    );
    setBusy(true);
    setSaveError(null);
    try {
      await recordExamResult(finalScore);
      const missed = answers.flatMap((a, i) => (a === EXAM_QUESTIONS[i].correctIndex ? [] : [i]));
      void repository.recordQuestionStats("exam", EXAM_QUESTIONS.length, missed).catch(() => {});
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("quiz.saveFail"));
    } finally {
      setScore(finalScore);
      setSubmitted(true);
      setBusy(false);
      setPage(0);
      window.scrollTo(0, 0);
    }
  }

  function retake() {
    setAnswers(EXAM_QUESTIONS.map(() => null));
    setSubmitted(false);
    setSaveError(null);
    setPage(0);
    window.scrollTo(0, 0);
  }

  function selectAnswer(oi: number) {
    if (submitted) return;
    setAnswers((prev) => prev.map((a, i) => (i === page ? oi : a)));
  }

  function goTo(next: number) {
    setPage(Math.max(0, Math.min(EXAM_QUESTION_COUNT - 1, next)));
    window.scrollTo(0, 0);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/course/river/4"
          className="font-[family-name:var(--font-ui)] text-sm text-ink-soft hover:text-ink"
        >
          {t("exam.back")}
        </Link>
        <p
          className="mt-2 font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.18em]"
          style={{ color: readable(ACCENT) }}
        >
          {t("exam.eyebrow")}
        </p>
        <h1 className="mt-1 t-h1">{t("home.exam")}</h1>
        <p className="mt-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          {t("exam.intro", { count: EXAM_QUESTION_COUNT, pass: EXAM_PASS_THRESHOLD, pct: passPercent })}
        </p>
      </div>

      {alreadyPassed && !submitted && (
        <p className="rounded-lg bg-gold/10 px-3 py-2 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          {t("exam.already")}
        </p>
      )}

      {submitted && (
        <Card accent={ACCENT} className={passed ? "bg-parchment-deep/40" : undefined}>
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="t-h3">
                {passed ? t("quiz.passed") : t("quiz.notYet")}
              </h2>
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                {passed
                  ? t("exam.scoredPass", { score, count: EXAM_QUESTION_COUNT })
                  : t("exam.scoredFail", { score, count: EXAM_QUESTION_COUNT, pass: EXAM_PASS_THRESHOLD })}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={retake}>
                {passed ? t("quiz.retake") : t("quiz.tryAgain")}
              </Button>
              {passed && (
                <Link to="/certificate">
                  <Button>{t("exam.viewCert")}</Button>
                </Link>
              )}
            </div>
          </CardBody>
          {saveError && (
            <CardBody className="border-t border-line pt-3">
              <p className="font-[family-name:var(--font-ui)] text-xs text-red-700">
                {t("quiz.saveError", { error: saveError })}
              </p>
            </CardBody>
          )}
        </Card>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          <span>{t("exam.qOf", { n: page + 1, count: EXAM_QUESTION_COUNT })}</span>
          <span>{t("exam.answeredOf", { n: answeredCount, count: EXAM_QUESTION_COUNT })}</span>
        </div>
        <ProgressBar
          fraction={(page + 1) / EXAM_QUESTION_COUNT}
          accent={ACCENT}
          label={t("exam.qOf", { n: page + 1, count: EXAM_QUESTION_COUNT })}
        />
      </div>

      <div data-tour="exam-card">
        <Card accent={ACCENT}>
          <CardBody className="flex flex-col gap-3">
            <p className="font-medium text-ink">{q.question}</p>
            <div className="flex flex-col gap-2">
              {q.options.map((option, oi) => {
                const isChosen = answers[page] === oi;
                const isCorrect = oi === q.correctIndex;
                const stateClass = !submitted
                  ? isChosen
                    ? "border-water-deep bg-water-deep/10"
                    : "border-line bg-surface hover:bg-parchment-deep/40"
                  : isCorrect
                    ? "border-olive bg-olive/10"
                    : isChosen
                      ? "border-red-400 bg-red-50"
                      : "border-line bg-surface opacity-70";
                return (
                  <label
                    key={oi}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 font-[family-name:var(--font-ui)] text-sm text-ink transition-colors ${stateClass} ${
                      submitted ? "cursor-default" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name={`exam-q${page}`}
                      disabled={submitted}
                      checked={isChosen}
                      onChange={() => selectAnswer(oi)}
                      className="accent-[var(--color-water-deep)]"
                    />
                    {option}
                    {submitted && isCorrect && (
                      <span className="ml-auto text-xs font-semibold text-olive">{t("quiz.correct")}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex w-full items-center justify-between">
          <Button variant="secondary" onClick={() => goTo(page - 1)} disabled={page === 0}>
            {t("exam.prev")}
          </Button>
          {page < EXAM_QUESTION_COUNT - 1 ? (
            <Button onClick={() => goTo(page + 1)}>{t("exam.next")}</Button>
          ) : !submitted ? (
            <Button onClick={handleSubmit} disabled={!allAnswered || busy}>
              {busy ? t("quiz.submitting") : t("exam.submit")}
            </Button>
          ) : (
            <Link to="/certificate">
              <Button variant="secondary">{t("exam.done")}</Button>
            </Link>
          )}
        </div>
        {page === EXAM_QUESTION_COUNT - 1 && !allAnswered && !submitted && (
          <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
            {t("exam.answerAll", { n: answeredCount, count: EXAM_QUESTION_COUNT })}
          </p>
        )}
      </div>
    </div>
  );
}
