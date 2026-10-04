import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { RIVERS, riverByNumber } from "../../theme/theme";
import type { RiverNumber } from "../../types";
import { lessonReadingMinutes } from "../../content/lessons";
import { useContent } from "../../state/ContentContext";
import {
  canOpenQuiz,
  canTakeFinalExam,
  deriveRiverStatus,
  entryCountForRiver,
  hasPassedRiverQuiz,
  isCourseComplete,
  isRiverUnlocked,
  progressForRiver,
} from "../../state/progress";
import {
  QUIZ_PASS_THRESHOLD,
  QUIZ_QUESTION_COUNT,
} from "../../content/quizzes";
import { formatPercent } from "../../utils/format";
import { EXAM_PASS_THRESHOLD, EXAM_QUESTION_COUNT } from "../../content/exam";
import { useModuleProgress } from "../../state/useModuleProgress";
import { useLang } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";
import { localizeReference } from "../../i18n/books";
import { EDEN_RIVER_REFS } from "../../content/scripture";
import { Button } from "../ui/Button";
import { ScriptureList } from "../ui/Scripture";
import { ProgressBar } from "../ui/ProgressBar";
import { Card, CardBody } from "../ui/Card";
import { LoadError } from "../ui/LoadError";
import { LockIcon, QuizIcon } from "../ui/RiverIcons";
import { RiverProgress } from "../layout/RiverProgress";

/**
 * A river's overview: its introduction and a list of modules. The companion
 * tracker no longer lives here — it's optional, and only offered on the
 * river's practice module (its last one).
 */
export function RiverPage() {
  const { n } = useParams();
  const riverNumber = Number(n) as RiverNumber;
  const { snapshot, loading, loadError, reload, markLessonViewed } =
    useCourse();

    const { getLesson, getRiver } = useContent();
  const { lang, t } = useLang();
  const valid = [1, 2, 3, 4].includes(riverNumber);
  // Computed before any early return so the hook below always runs in the
  // same order, regardless of which guard (if any) ends up firing.
  const content = valid ? getRiver(riverNumber) : undefined;
  const moduleProgress = useModuleProgress(
    riverNumber,
    content?.lessons.length ?? 0,
  );
  
  useEffect(() => {
    if (valid && snapshot) void markLessonViewed(riverNumber);
    // mark once per river visit; markLessonViewed is idempotent
  }, [valid, riverNumber, snapshot, markLessonViewed]);

  if (!valid) return <Navigate to="/course" replace />;
  if (loading && !snapshot)
    return (
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
        {t("common.loading")}
      </p>
    );
  if (loadError) return <LoadError message={loadError} onRetry={reload} />;
  if (!snapshot) return null;

  const river = riverByNumber(riverNumber)!;
  const riverContent = content!;

  if (!isRiverUnlocked(snapshot, riverNumber)) {
    const prev = riverByNumber(riverNumber - 1)!;
    return (
      <Card>
        <CardBody className="text-center">
          <h1 className="text-xl font-semibold text-ink">
                        {t("river.locked", { n: riverNumber })}

          </h1>
          <p className="mx-auto mt-2 max-w-sm font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                        {t("river.lockedText", { prev: prev.number, title: t(`river.${prev.number}.title` as StringKey) })}

          </p>
          <Link
            to={`/course/river/${prev.number}`}
            className="mt-4 inline-block"
          >
                        <Button>{t("river.goTo", { n: prev.number })}</Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  const status = deriveRiverStatus(snapshot, riverNumber);
  const lessonViewed = !!progressForRiver(snapshot.progress, riverNumber)
    .lessonViewedAt;
  const hasEntry = entryCountForRiver(snapshot, riverNumber) > 0;
  const quizPassed = hasPassedRiverQuiz(snapshot.progress, riverNumber);
  // Once the quiz has been taken, the list shows the best score instead of the question count.
  const quizBestScore = progressForRiver(
    snapshot.progress,
    riverNumber,
  ).quizBestScore;
  const quizLabel =
    quizBestScore === null
            ? t("river.quizQuestions", { n: QUIZ_QUESTION_COUNT })
      : formatPercent(quizBestScore / QUIZ_QUESTION_COUNT);
  const nextRiver = RIVERS.find((r) => r.number === riverNumber + 1);
  const courseComplete = isCourseComplete(snapshot);
  const examUnlocked = canTakeFinalExam(snapshot);
  const practiceModuleNumber = riverContent.lessons.length; // the tracker lives on the last module
  const examPassed = !!snapshot.profile.examPassedAt;

  return (
    <div className="flex flex-col gap-8">
      <RiverProgress snapshot={snapshot} activeRiver={riverNumber} />

      <article className="flex flex-col gap-6">
        <header>
          <p
            className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.18em]"
            style={{ color: river.accent }}
          >
                        {t("river.eyebrow", {
              n: river.number,
              name: t(`eden.${river.number}` as StringKey),
              ref: localizeReference(EDEN_RIVER_REFS[river.number], lang),
            })}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">
            {riverContent.title}
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-ink-soft">
            {riverContent.intro}
          </p>
        </header>
        <ScriptureList verses={riverContent.introScripture} />
      </article>

      <section className="flex flex-col gap-4">
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-2xl font-semibold text-ink">{t("river.modules")}</h2>
            <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                            {t("river.read", { n: moduleProgress.viewedCount, total: moduleProgress.totalModules })}

            </span>
          </div>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                        {t("river.hint")}

          </p>
          <div className="mt-3">
            <ProgressBar
              fraction={moduleProgress.fraction}
              accent={river.accent}
              label={t("home.moduleLabel", { n: moduleProgress.viewedCount, total: moduleProgress.totalModules, r: riverNumber })}
            />
          </div>
        </div>
        <ol data-tour="river-modules" className="flex flex-col gap-3">
          {riverContent.lessons.map((_, i) => {
            const module_ = getLesson(riverNumber, i);
            const done = moduleProgress.isViewed(i);
            return (
              <li key={i}>
                <Link to={`/course/river/${riverNumber}/module/${i + 1}`}>
                  <Card
                    accent={river.accent}
                    className="transition-colors hover:bg-parchment-deep/30"
                  >
                    <CardBody className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-ui)] text-sm font-semibold ${
                            done
                              ? "text-white"
                              : "border-2 bg-surface text-ink-soft"
                          }`}
                          style={
                            done
                              ? { backgroundColor: river.accent }
                              : { borderColor: river.accent }
                          }
                        >
                          {done ? "✓" : i + 1}
                        </span>
                        <span className="font-medium text-ink">
                          {module_.title}
                        </span>
                      </div>
                      <span className="shrink-0 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                                                {t("river.minutes", { n: lessonReadingMinutes(module_) })}

                      </span>
                    </CardBody>
                  </Card>
                </Link>
              </li>
            );
          })}
          <li>
            {canOpenQuiz(snapshot, riverNumber) ? (
              <Link to={`/course/river/${riverNumber}/quiz`}>
                <Card
                  accent={river.accent}
                  className="transition-colors hover:bg-parchment-deep/30"
                >
                  <CardBody className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-ui)] text-sm font-semibold ${
                          quizPassed
                            ? "text-white"
                            : "border-2 bg-surface text-ink-soft"
                        }`}
                        style={
                          quizPassed
                            ? { backgroundColor: river.accent }
                            : { borderColor: river.accent }
                        }
                      >
                        {quizPassed ? (
                          "✓"
                        ) : (
                          <QuizIcon color={river.accent} size={16} />
                        )}
                      </span>
                      <span className="font-medium text-ink">
                                                {t("river.quiz", { title: riverContent.title })}

                      </span>
                    </div>
                    <span className="shrink-0 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                      {quizLabel}
                    </span>
                  </CardBody>
                </Card>
              </Link>
            ) : (
              <Card className="opacity-60">
                <CardBody className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-line bg-surface text-ink-soft">
                      <LockIcon color="var(--color-ink-soft)" size={15} />
                    </span>
                    <span className="font-medium text-ink-soft">
                                            {t("river.quiz", { title: riverContent.title })}

                    </span>
                  </div>
                  <span className="shrink-0 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                                        {t("river.quizLocked")}

                  </span>
                </CardBody>
              </Card>
            )}
          </li>
          {riverNumber === 4 && (
            <li>
              {examUnlocked ? (
                <Link to="/course/exam">
                  <Card
                    accent={river.accent}
                    className="transition-colors hover:bg-parchment-deep/30"
                  >
                    <CardBody className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-ui)] text-sm font-semibold ${
                            examPassed
                              ? "text-white"
                              : "border-2 bg-surface text-ink-soft"
                          }`}
                          style={
                            examPassed
                              ? { backgroundColor: river.accent }
                              : { borderColor: river.accent }
                          }
                        >
                          {examPassed ? (
                            "✓"
                          ) : (
                            <QuizIcon color={river.accent} size={16} />
                          )}
                        </span>
                        <span className="font-medium text-ink">
                                                    {t("home.exam")}

                        </span>
                      </div>
                      <span className="shrink-0 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                                                {t("river.examToPass", { count: EXAM_QUESTION_COUNT, pass: EXAM_PASS_THRESHOLD })}

                      </span>
                    </CardBody>
                  </Card>
                </Link>
              ) : (
                <Card className="opacity-60">
                  <CardBody className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-line bg-surface text-ink-soft">
                        <LockIcon color="var(--color-ink-soft)" size={15} />
                      </span>
                      <span className="font-medium text-ink-soft">
                                                {t("home.exam")}

                      </span>
                    </div>
                    <span className="shrink-0 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                                            {t("river.examLocked")}

                    </span>
                  </CardBody>
                </Card>
              )}
            </li>
          )}
        </ol>
      </section>

      <Card accent={river.accent} className="bg-parchment-deep/40">
        <CardBody>
          <h3 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
                        {status === "complete" && quizPassed
              ? t("river.complete")
              : t("river.toComplete")}
          </h3>
          <ul className="mt-2 flex flex-col gap-1 font-[family-name:var(--font-ui)] text-sm">
            <li
              className={
                lessonViewed || status === "complete"
                  ? "text-olive"
                  : "text-ink-soft"
              }
            >
              {lessonViewed || status === "complete" ? "✓" : "○"} {t("river.step1")}
            </li>
            <li
              className={
                hasEntry || status === "complete"
                  ? "text-olive"
                  : "text-ink-soft"
              }
            >
              {hasEntry || status === "complete" ? "✓" : "○"} {t("river.step2")}
            </li>
            <li className={quizPassed ? "text-olive" : "text-ink-soft"}>
              {quizPassed ? "✓" : "○"} {t("river.step3", { pass: QUIZ_PASS_THRESHOLD })}
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            {!hasEntry && status !== "complete" && (
              <Link
                to={`/course/river/${riverNumber}/module/${practiceModuleNumber}`}
              >
                                <Button>{t("river.goPractice")}</Button>
              </Link>
            )}
            {status === "complete" && !quizPassed && (
              <Link to={`/course/river/${riverNumber}/quiz`}>
                <Button>
                                    {snapshot.profile.fullAccess
                    ? t("river.viewQuiz")
                    : t("river.takeQuiz", { n: riverNumber })}
                </Button>
              </Link>
            )}
            {status === "complete" && quizPassed && nextRiver && (
              <Link to={`/course/river/${nextRiver.number}`}>
                <Button>
                                    {t("river.next", { n: nextRiver.number, title: t(`river.${nextRiver.number}.title` as StringKey) })}

                </Button>
              </Link>
            )}
            {status === "complete" && quizPassed && !nextRiver && (
              <Link to={`/course/river/${riverNumber}/quiz`}>
                <Button variant="secondary">
                                    {snapshot.profile.fullAccess
                    ? t("river.viewQuiz")
                    : t("river.retake")}
                </Button>
              </Link>
            )}
            {courseComplete && (
              <Link to="/dashboard">
                <Button variant={nextRiver ? "secondary" : "primary"}>
                                    {t("river.openDashboard")}

                </Button>
              </Link>
            )}
            <Link to="/course">
                            <Button variant="ghost">{t("river.backAll")}</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
