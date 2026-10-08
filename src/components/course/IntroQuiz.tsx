import { useState } from "react";
import { Link } from "react-router-dom";
import { INTRO_QUIZ_PASS_THRESHOLD } from "../../content/introQuiz";
import { localizedIntroQuiz } from "../../content/localized";
import { useLang } from "../../i18n/LanguageContext";
import { useIntroQuizResult } from "../../state/useIntroQuizResult";
import { THEME, readable } from "../../theme/theme";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";

const ACCENT = THEME.palette.gold;

/**
 * The introduction's own quiz — same ten-questions-on-one-page shape as the
 * river quizzes, but purely for reinforcement. The introduction was never
 * part of the unlock chain (River 1 is always open), so this doesn't gate
 * anything either; it just gives a "did this stick?" checkpoint.
 */
export function IntroQuiz() {
  const { passedAt, recordResult } = useIntroQuizResult();
  const { lang, t } = useLang();
  const INTRO_QUIZ = localizedIntroQuiz(lang);
  const [answers, setAnswers] = useState<(number | null)[]>(() => INTRO_QUIZ.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const allAnswered = answers.every((a) => a !== null);
  const passed = score >= INTRO_QUIZ_PASS_THRESHOLD;
  const alreadyPassed = !!passedAt;

  function handleSubmit() {
    if (!allAnswered) return;
    const finalScore = answers.reduce<number>(
      (sum, a, i) => sum + (a === INTRO_QUIZ[i].correctIndex ? 1 : 0),
      0,
    );
    recordResult(finalScore);
    setScore(finalScore);
    setSubmitted(true);
    window.scrollTo(0, 0);
  }

  function retake() {
    setAnswers(INTRO_QUIZ.map(() => null));
    setSubmitted(false);
    window.scrollTo(0, 0);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/course/introduction"
          className="font-[family-name:var(--font-ui)] text-sm text-ink-soft hover:text-ink"
        >
          {t("introquiz.back")}
        </Link>
        <p
          className="mt-2 font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.18em]"
          style={{ color: readable(ACCENT) }}
        >
          {t("introquiz.eyebrow")}
        </p>
        <h1 className="mt-1 t-h1">{t("introquiz.title")}</h1>
        <p className="mt-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("introquiz.text")}</p>
      </div>

      {alreadyPassed && !submitted && (
        <p className="rounded-lg bg-gold/10 px-3 py-2 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          {t("introquiz.already")}
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
                  ? t("introquiz.scoredPass", { score, total: INTRO_QUIZ.length })
                  : t("introquiz.scoredFail", {
                      score,
                      total: INTRO_QUIZ.length,
                      pass: INTRO_QUIZ_PASS_THRESHOLD,
                    })}
              </p>
            </div>
            <Button variant="secondary" onClick={retake}>
              {passed ? t("quiz.retake") : t("quiz.tryAgain")}
            </Button>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {INTRO_QUIZ.map((q, qi) => {
          const chosen = answers[qi];
          return (
            <Card key={qi} accent={ACCENT}>
              <CardBody className="flex flex-col gap-3">
                <p className="font-medium text-ink">
                  <span className="text-ink-soft">{qi + 1}.</span> {q.question}
                </p>
                <div className="flex flex-col gap-2">
                  {q.options.map((option, oi) => {
                    const isChosen = chosen === oi;
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
                          name={`iq${qi}`}
                          disabled={submitted}
                          checked={isChosen}
                          onChange={() => setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)))}
                          className="accent-[var(--color-water-deep)]"
                        />
                        {option}
                        {submitted && isCorrect && (
                          <span className="ml-auto text-xs font-semibold text-olive">
                            {t("quiz.correct")}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {!submitted && (
        <Card accent={ACCENT} className="bg-parchment-deep/40">
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              {t("quiz.answered", { n: answers.filter((a) => a !== null).length, total: INTRO_QUIZ.length })}
            </span>
            <Button onClick={handleSubmit} disabled={!allAnswered}>
              {t("quiz.submit")}
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
