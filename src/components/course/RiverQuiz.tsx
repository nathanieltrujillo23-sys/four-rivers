import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { riverByNumber, RIVERS, readable } from "../../theme/theme";
import type { QuestionSection, RiverNumber } from "../../types";
import { QUIZ_PASS_THRESHOLD } from "../../content/quizzes";
import { localizedQuiz } from "../../content/localized";
import { useContent } from "../../state/ContentContext";
import { useLang } from "../../i18n/LanguageContext";
import { canOpenQuiz, hasPassedRiverQuiz } from "../../state/progress";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { ExplanationBox } from "./ExplanationBox";
import { ScoreMeter } from "../ui/ScoreMeter";

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
  const { snapshot, recordQuizResult, repository } = useCourse();
  const { lang, t } = useLang();
  const { getRiver } = useContent();

  const questions = valid ? localizedQuiz(riverNumber, lang) : [];
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Practice mode: only the questions that were missed, not scored and not saved.
  const [practice, setPractice] = useState<number[] | null>(null);

  if (!valid) return <Navigate to="/course" replace />;
  if (!snapshot) return null;

  const river = riverByNumber(riverNumber)!;
  if (!canOpenQuiz(snapshot, riverNumber)) return <Navigate to={`/course/river/${riverNumber}`} replace />;

  const alreadyPassed = hasPassedRiverQuiz(snapshot.progress, riverNumber);
  const nextRiver = RIVERS.find((r) => r.number === riverNumber + 1);
  const visible = practice ?? questions.map((_, i) => i);
  const allAnswered = visible.every((i) => answers[i] !== null);
  const passed = !practice && score >= QUIZ_PASS_THRESHOLD;
  const missedNow = visible.filter((i) => answers[i] !== questions[i].correctIndex);

  async function handleSubmit() {
    if (!allAnswered || busy) return;
    if (practice) {
      // Practice never touches the saved score.
      setScore(visible.length - missedNow.length);
      setSubmitted(true);
      window.scrollTo(0, 0);
      return;
    }
    const finalScore = answers.reduce<number>(
      (sum, a, i) => sum + (a === questions[i].correctIndex ? 1 : 0),
      0,
    );
    setBusy(true);
    setSaveError(null);
    try {
      await recordQuizResult(riverNumber, finalScore);
      const missed = answers.flatMap((a, i) => (a === questions[i].correctIndex ? [] : [i]));
      void repository
        .recordQuestionStats(`q${riverNumber}` as QuestionSection, questions.length, missed)
        .catch(() => {});
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("quiz.saveFail"));
    } finally {
      setScore(finalScore);
      setSubmitted(true);
      setBusy(false);
      window.scrollTo(0, 0);
    }
  }

  function retake() {
    setPractice(null);
    setAnswers(questions.map(() => null));
    setSubmitted(false);
    setSaveError(null);
    window.scrollTo(0, 0);
  }

  function practiceMissed() {
    const again = missedNow;
    setPractice(again);
    setAnswers((prev) => prev.map((a, i) => (again.includes(i) ? null : a)));
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
          {t("quiz.back", { n: riverNumber })}
        </Link>
        <p
          className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.18em]"
          style={{ color: readable(river.accent) }}
        >
          {t("quiz.eyebrow", { n: riverNumber })}
        </p>
        <h1 className="t-h1">{getRiver(riverNumber).title}</h1>
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          {nextRiver
            ? t("quiz.introNext", { pass: QUIZ_PASS_THRESHOLD, n: nextRiver.number })
            : t("quiz.introLast", { pass: QUIZ_PASS_THRESHOLD })}
        </p>
      </div>

      {submitted && practice && (
        <Card accent={river.accent}>
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="t-h3">{t("quiz.practiceResult", { right: score, total: practice.length })}</h2>
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("quiz.practiceNote")}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {missedNow.length > 0 && (
                <Button variant="secondary" onClick={practiceMissed}>
                  {t("quiz.practiceAgain", { n: missedNow.length })}
                </Button>
              )}
              <Button onClick={retake}>{t("quiz.practiceFull")}</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {submitted && !practice && (
        <Card accent={river.accent} className={passed ? "bg-parchment-deep/40" : undefined}>
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="t-h3">
                {passed ? t("quiz.passed") : t("quiz.notYet")}
              </h2>
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                {passed
                  ? nextRiver
                    ? t("quiz.scoredPassNext", { score, total: questions.length, n: nextRiver.number })
                    : t("quiz.scoredPassLast", { score, total: questions.length })
                  : t("quiz.scoredFail", { score, total: questions.length, pass: QUIZ_PASS_THRESHOLD })}
              </p>
              <ScoreMeter score={score} total={questions.length} pass={QUIZ_PASS_THRESHOLD} passed={passed} />
            </div>
            <div className="flex flex-wrap gap-3">
              {missedNow.length > 0 && (
                <Button variant="secondary" onClick={practiceMissed}>
                  {t("quiz.practiceMissed", { n: missedNow.length })}
                </Button>
              )}
              <Button variant="secondary" onClick={retake}>
                {passed ? t("quiz.retake") : t("quiz.tryAgain")}
              </Button>
              {passed && (
                <Link to={nextRiver ? `/course/river/${nextRiver.number}` : "/course"}>
                  <Button>
                    {nextRiver ? t("quiz.startRiver", { n: nextRiver.number }) : t("river.backAll")}
                  </Button>
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

      {practice && !submitted && (
        <p className="rounded-lg bg-gold/10 px-3 py-2 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          {t("quiz.practiceNote")}
        </p>
      )}

      {alreadyPassed && !submitted && !practice && (
        <p className="rounded-lg bg-gold/10 px-3 py-2 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          {nextRiver ? t("quiz.alreadyNext", { n: nextRiver.number }) : t("quiz.alreadyLast")}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {visible.map((qi) => {
          const q = questions[qi];
          const chosen = answers[qi];
          return (
            <div key={qi} data-tour={qi === 0 ? "quiz" : undefined}>
              <Card accent={river.accent}>
                <CardBody className="flex flex-col gap-3">
                  <p className="font-medium text-ink">
                    <span className="text-ink-soft">{qi + 1}.</span> {q.question}
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
                          ? "answer-correct border-olive bg-olive/10"
                          : isChosen
                            ? "answer-wrong border-red-400 bg-red-50"
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
                            onChange={() => setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)))}
                            className="accent-[var(--color-water-deep)]"
                          />
                          {option}
                          {showResult && isCorrect && (
                            <span className="ml-auto text-xs font-semibold text-olive">
                              {t("quiz.correct")}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {submitted && (
                    <ExplanationBox set={String(riverNumber) as "1"} index={qi} correct={chosen === q.correctIndex} />
                  )}
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
              {t("quiz.answered", { n: visible.filter((i) => answers[i] !== null).length, total: visible.length })}
            </span>
            <Button onClick={handleSubmit} disabled={!allAnswered || busy}>
              {busy ? t("quiz.submitting") : practice ? t("quiz.practiceCheck") : t("quiz.submit")}
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
