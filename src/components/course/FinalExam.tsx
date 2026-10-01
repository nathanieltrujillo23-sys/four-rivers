import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { canTakeFinalExam } from "../../state/progress";
import { EXAM_PASS_THRESHOLD, EXAM_QUESTIONS, EXAM_QUESTION_COUNT } from "../../content/exam";
import { THEME } from "../../theme/theme";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { ProgressBar } from "../ui/ProgressBar";
import { LoadError } from "../ui/LoadError";

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
  const { snapshot, loading, loadError, reload, recordExamResult } = useCourse();
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => EXAM_QUESTIONS.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (loading && !snapshot)
    return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading…</p>;
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
      0
    );
    setBusy(true);
    setSaveError(null);
    try {
      await recordExamResult(finalScore);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save your score.");
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
          ← Back to River 4 overview
        </Link>
        <p
          className="mt-2 font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.18em]"
          style={{ color: ACCENT }}
        >
          Final exam
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-ink">4 Rivers Final Exam</h1>
        <p className="mt-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          {EXAM_QUESTION_COUNT} questions covering all four rivers. Score {EXAM_PASS_THRESHOLD}/
          {EXAM_QUESTION_COUNT} ({passPercent}%) or better to unlock your certificate. Retake it as many times as
          you like.
        </p>
      </div>

      {alreadyPassed && !submitted && (
        <p className="rounded-lg bg-gold/10 px-3 py-2 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          You've already passed the final exam — your certificate is unlocked. Retaking it won't change that.
        </p>
      )}

      {submitted && (
        <Card accent={ACCENT} className={passed ? "bg-parchment-deep/40" : undefined}>
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">{passed ? "You passed!" : "Not quite yet"}</h2>
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                You scored {score} of {EXAM_QUESTION_COUNT}
                {passed
                  ? ". Your certificate is unlocked."
                  : `. You need ${EXAM_PASS_THRESHOLD} to pass — review your answers below and try again whenever you're ready.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={retake}>
                {passed ? "Retake" : "Try again"}
              </Button>
              {passed && (
                <Link to="/certificate">
                  <Button>View your certificate</Button>
                </Link>
              )}
            </div>
          </CardBody>
          {saveError && (
            <CardBody className="border-t border-line pt-3">
              <p className="font-[family-name:var(--font-ui)] text-xs text-red-700">
                Your score shows here, but saving it didn't go through ({saveError}). It may not stick after you
                leave this page — try submitting again in a moment.
              </p>
            </CardBody>
          )}
        </Card>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          <span>
            Question {page + 1} of {EXAM_QUESTION_COUNT}
          </span>
          <span>
            {answeredCount} of {EXAM_QUESTION_COUNT} answered
          </span>
        </div>
        <ProgressBar
          fraction={(page + 1) / EXAM_QUESTION_COUNT}
          accent={ACCENT}
          label={`Question ${page + 1} of ${EXAM_QUESTION_COUNT}`}
        />
      </div>

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
                    <span className="ml-auto text-xs font-semibold text-olive">Correct</span>
                  )}
                </label>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-col items-center gap-2">
        <div className="flex w-full items-center justify-between">
          <Button variant="secondary" onClick={() => goTo(page - 1)} disabled={page === 0}>
            ← Previous
          </Button>
          {page < EXAM_QUESTION_COUNT - 1 ? (
            <Button onClick={() => goTo(page + 1)}>Next →</Button>
          ) : !submitted ? (
            <Button onClick={handleSubmit} disabled={!allAnswered || busy}>
              {busy ? "Submitting…" : "Submit exam"}
            </Button>
          ) : (
            <Link to="/certificate">
              <Button variant="secondary">Done</Button>
            </Link>
          )}
        </div>
        {page === EXAM_QUESTION_COUNT - 1 && !allAnswered && !submitted && (
          <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
            Answer every question to submit ({answeredCount} of {EXAM_QUESTION_COUNT} so far).
          </p>
        )}
      </div>
    </div>
  );
}
