import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { riverByNumber, RIVERS } from "../../theme/theme";
import type { RiverNumber } from "../../types";
import { LESSONS } from "../../content/lessons";
import { QUIZZES, QUIZ_PASS_THRESHOLD } from "../../content/quizzes";
import { canOpenQuiz, hasPassedRiverQuiz } from "../../state/progress";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";

/**
 * The gate between rivers: ten questions drawn straight from the river's own
 * lessons, with QUIZ_PASS_THRESHOLD (7/10) required to unlock the next one.
 * Can be retaken immediately and as many times as needed — nothing about a
 * failed attempt is held against you, it just doesn't unlock the next river
 * yet. Requires the river's lesson + tracker to already be complete, same as
 * the rest of this course's "read it, then do it" order.
 */
export function RiverQuiz() {
  const { n } = useParams();
  const riverNumber = Number(n) as RiverNumber;
  const valid = [1, 2, 3, 4].includes(riverNumber);
  const { snapshot, recordQuizResult } = useCourse();

  const questions = valid ? QUIZZES[riverNumber] : [];
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    questions.map(() => null),
  );
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!valid) return <Navigate to="/course" replace />;
  if (!snapshot) return null;

  const river = riverByNumber(riverNumber)!;
  if (!canOpenQuiz(snapshot, riverNumber))
    return <Navigate to={`/course/river/${riverNumber}`} replace />;

  const alreadyPassed = hasPassedRiverQuiz(snapshot.progress, riverNumber);
  const nextRiver = RIVERS.find((r) => r.number === riverNumber + 1);
  const allAnswered = answers.every((a) => a !== null);
  const passed = score >= QUIZ_PASS_THRESHOLD;

  async function handleSubmit() {
    if (!allAnswered || busy) return;
    const finalScore = answers.reduce<number>(
      (sum, a, i) => sum + (a === questions[i].correctIndex ? 1 : 0),
      0,
    );
    setBusy(true);
    setSaveError(null);
    try {
      await recordQuizResult(riverNumber, finalScore);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Couldn't save your score.",
      );
    } finally {
      setScore(finalScore);
      setSubmitted(true);
      setBusy(false);
      window.scrollTo(0, 0);
    }
  }

  function retake() {
    setAnswers(questions.map(() => null));
    setSubmitted(false);
    setSaveError(null);
    window.scrollTo(0, 0);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          to={`/course/river/${riverNumber}`}
          className="font-[family-name:var(--font-ui)] text-sm text-ink-soft hover:text-ink"
        >
          ← Back to River {riverNumber} overview
        </Link>
        <p
          className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.18em]"
          style={{ color: river.accent }}
        >
          River {riverNumber} quiz
        </p>
        <h1 className="text-3xl font-semibold text-ink">
          {LESSONS[riverNumber].title}
        </h1>
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          Ten questions from this river's lessons. Score {QUIZ_PASS_THRESHOLD}
          /10 or better to
          {nextRiver
            ? ` unlock River ${nextRiver.number}.`
            : " finish it off."}{" "}
          You can retake it as many times as you like.
        </p>
      </div>

      {submitted && (
        <Card
          accent={river.accent}
          className={passed ? "bg-parchment-deep/40" : undefined}
        >
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">
                {passed ? "You passed!" : "Not quite yet"}
              </h2>
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                You scored {score} of {questions.length}
                {passed
                  ? nextRiver
                    ? `. River ${nextRiver.number} is now unlocked.`
                    : ". Nice work finishing out the quizzes."
                  : `. You need ${QUIZ_PASS_THRESHOLD} to pass. Review the lessons below and try again whenever you're ready.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={retake}>
                {passed ? "Retake" : "Try again"}
              </Button>
              {passed && (
                <Link
                  to={
                    nextRiver ? `/course/river/${nextRiver.number}` : "/course"
                  }
                >
                  <Button>
                    {nextRiver
                      ? `Start River ${nextRiver.number}`
                      : "Back to all rivers"}
                  </Button>
                </Link>
              )}
            </div>
          </CardBody>
          {saveError && (
            <CardBody className="border-t border-line pt-3">
              <p className="font-[family-name:var(--font-ui)] text-xs text-red-700">
                Your score shows here, but saving it didn't go through (
                {saveError}). It may not stick after you leave this page, so try
                submitting again in a moment.
              </p>
            </CardBody>
          )}
        </Card>
      )}

      {alreadyPassed && !submitted && (
        <p className="rounded-lg bg-gold/10 px-3 py-2 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          You've already passed this quiz
          {nextRiver ? `, so River ${nextRiver.number} is unlocked.` : "."}{" "}
          Retaking it won't change anything already unlocked.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {questions.map((q, qi) => {
          const chosen = answers[qi];
          return (
            <div key={qi} data-tour={qi === 0 ? "quiz" : undefined}>
              <Card accent={river.accent}>
                <CardBody className="flex flex-col gap-3">
                  <p className="font-medium text-ink">
                    <span className="text-ink-soft">{qi + 1}.</span>{" "}
                    {q.question}
                  </p>
                  <div className="flex flex-col gap-2">
                    {q.options.map((option, oi) => {
                      const isChosen = chosen === oi;
                      const isCorrect = oi === q.correctIndex;
                      const showResult = submitted;
                      const stateClass = !showResult
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
                            name={`q${qi}`}
                            disabled={submitted}
                            checked={isChosen}
                            onChange={() =>
                              setAnswers((prev) =>
                                prev.map((a, i) => (i === qi ? oi : a)),
                              )
                            }
                            className="accent-[var(--color-water-deep)]"
                          />
                          {option}
                          {showResult && isCorrect && (
                            <span className="ml-auto text-xs font-semibold text-olive">
                              Correct
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            </div>
          );
        })}
      </div>

      {!submitted && (
        <Card accent={river.accent} className="bg-parchment-deep/40">
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              {answers.filter((a) => a !== null).length} of {questions.length}{" "}
              answered
            </span>
            <Button onClick={handleSubmit} disabled={!allAnswered || busy}>
              {busy ? "Submitting…" : "Submit quiz"}
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
