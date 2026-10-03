import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { RIVERS, riverByNumber } from "../../theme/theme";
import type { RiverNumber } from "../../types";
import { LESSONS, lessonReadingMinutes } from "../../content/lessons";
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
import { QUIZ_PASS_THRESHOLD } from "../../content/quizzes";
import { EXAM_PASS_THRESHOLD, EXAM_QUESTION_COUNT } from "../../content/exam";
import { useModuleProgress } from "../../state/useModuleProgress";
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
  const { snapshot, loading, loadError, reload, markLessonViewed } = useCourse();

  const valid = [1, 2, 3, 4].includes(riverNumber);
  // Computed before any early return so the hook below always runs in the
  // same order, regardless of which guard (if any) ends up firing.
  const content = valid ? LESSONS[riverNumber] : undefined;
  const moduleProgress = useModuleProgress(riverNumber, content?.lessons.length ?? 0);
  const { getLesson } = useContent();

  useEffect(() => {
    if (valid && snapshot) void markLessonViewed(riverNumber);
    // mark once per river visit; markLessonViewed is idempotent
  }, [valid, riverNumber, snapshot, markLessonViewed]);

  if (!valid) return <Navigate to="/course" replace />;
  if (loading && !snapshot)
    return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading…</p>;
  if (loadError) return <LoadError message={loadError} onRetry={reload} />;
  if (!snapshot) return null;

  const river = riverByNumber(riverNumber)!;
  const riverContent = content!;

  if (!isRiverUnlocked(snapshot, riverNumber)) {
    const prev = riverByNumber(riverNumber - 1)!;
    return (
      <Card>
        <CardBody className="text-center">
          <h1 className="text-xl font-semibold text-ink">River {riverNumber} is still locked</h1>
          <p className="mx-auto mt-2 max-w-sm font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            Finish River {prev.number}, {prev.title}, first: work through its modules, log at
            least one entry in its tracker, and pass its quiz.
          </p>
          <Link to={`/course/river/${prev.number}`} className="mt-4 inline-block">
            <Button>Go to River {prev.number}</Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  const status = deriveRiverStatus(snapshot, riverNumber);
  const lessonViewed = !!progressForRiver(snapshot.progress, riverNumber).lessonViewedAt;
  const hasEntry = entryCountForRiver(snapshot, riverNumber) > 0;
  const quizPassed = hasPassedRiverQuiz(snapshot.progress, riverNumber);
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
            River {river.number} · named for the {river.edenRiver} ({EDEN_RIVER_REFS[river.number]})
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">{riverContent.title}</h1>
          <p className="mt-3 text-lg leading-relaxed text-ink-soft">{riverContent.intro}</p>
        </header>
        <ScriptureList verses={riverContent.introScripture} />
      </article>

      <section className="flex flex-col gap-4">
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-2xl font-semibold text-ink">Modules</h2>
            <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              {moduleProgress.viewedCount} of {moduleProgress.totalModules} read
            </span>
          </div>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            Work through them in order, or jump around freely. They're always here to revisit.
          </p>
          <div className="mt-3">
            <ProgressBar
              fraction={moduleProgress.fraction}
              accent={river.accent}
              label={`${moduleProgress.viewedCount} of ${moduleProgress.totalModules} modules read`}
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
                  <Card accent={river.accent} className="transition-colors hover:bg-parchment-deep/30">
                    <CardBody className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-ui)] text-sm font-semibold ${
                            done ? "text-white" : "border-2 bg-surface text-ink-soft"
                          }`}
                          style={
                            done
                              ? { backgroundColor: river.accent }
                              : { borderColor: river.accent }
                          }
                        >
                          {done ? "✓" : i + 1}
                        </span>
                        <span className="font-medium text-ink">{module_.title}</span>
                      </div>
                      <span className="shrink-0 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                        ≈ {lessonReadingMinutes(module_)} min
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
                <Card accent={river.accent} className="transition-colors hover:bg-parchment-deep/30">
                  <CardBody className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-ui)] text-sm font-semibold ${
                          quizPassed ? "text-white" : "border-2 bg-surface text-ink-soft"
                        }`}
                        style={quizPassed ? { backgroundColor: river.accent } : { borderColor: river.accent }}
                      >
                        {quizPassed ? "✓" : <QuizIcon color={river.accent} size={16} />}
                      </span>
                      <span className="font-medium text-ink">Quiz: {riverContent.title}</span>
                    </div>
                    <span className="shrink-0 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                      10 questions
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
                    <span className="font-medium text-ink-soft">Quiz: {riverContent.title}</span>
                  </div>
                  <span className="shrink-0 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                    Finish the lessons and tracker first
                  </span>
                </CardBody>
              </Card>
            )}
          </li>
          {riverNumber === 4 && (
            <li>
              {examUnlocked ? (
                <Link to="/course/exam">
                  <Card accent={river.accent} className="transition-colors hover:bg-parchment-deep/30">
                    <CardBody className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-ui)] text-sm font-semibold ${
                            examPassed ? "text-white" : "border-2 bg-surface text-ink-soft"
                          }`}
                          style={examPassed ? { backgroundColor: river.accent } : { borderColor: river.accent }}
                        >
                          {examPassed ? "✓" : <QuizIcon color={river.accent} size={16} />}
                        </span>
                        <span className="font-medium text-ink">4 Rivers Final Exam</span>
                      </div>
                      <span className="shrink-0 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                        {EXAM_QUESTION_COUNT} questions · {EXAM_PASS_THRESHOLD} to pass
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
                      <span className="font-medium text-ink-soft">4 Rivers Final Exam</span>
                    </div>
                    <span className="shrink-0 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                      Mark every module complete and pass all four quizzes first
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
            {status === "complete" && quizPassed ? "River complete" : "To complete this river"}
          </h3>
          <ul className="mt-2 flex flex-col gap-1 font-[family-name:var(--font-ui)] text-sm">
            <li className={lessonViewed || status === "complete" ? "text-olive" : "text-ink-soft"}>
              {lessonViewed || status === "complete" ? "✓" : "○"} Open this river's overview
            </li>
            <li className={hasEntry || status === "complete" ? "text-olive" : "text-ink-soft"}>
              {hasEntry || status === "complete" ? "✓" : "○"} Log at least one entry in the tracker
              (found on the last module)
            </li>
            <li className={quizPassed ? "text-olive" : "text-ink-soft"}>
              {quizPassed ? "✓" : "○"} Pass the river quiz ({QUIZ_PASS_THRESHOLD}/10)
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            {!hasEntry && status !== "complete" && (
              <Link to={`/course/river/${riverNumber}/module/${practiceModuleNumber}`}>
                <Button>Go to the practice module</Button>
              </Link>
            )}
            {status === "complete" && !quizPassed && (
              <Link to={`/course/river/${riverNumber}/quiz`}>
                <Button>Take the River {riverNumber} quiz</Button>
              </Link>
            )}
            {status === "complete" && quizPassed && nextRiver && (
              <Link to={`/course/river/${nextRiver.number}`}>
                <Button>Next: River {nextRiver.number}, {nextRiver.title}</Button>
              </Link>
            )}
            {status === "complete" && quizPassed && !nextRiver && (
              <Link to={`/course/river/${riverNumber}/quiz`}>
                <Button variant="secondary">Retake the quiz</Button>
              </Link>
            )}
            {courseComplete && (
              <Link to="/dashboard">
                <Button variant={nextRiver ? "secondary" : "primary"}>Open your dashboard</Button>
              </Link>
            )}
            <Link to="/course">
              <Button variant="ghost">Back to all rivers</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
