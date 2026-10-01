import { Link } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { RIVERS, THEME } from "../../theme/theme";
import type { RiverStatus } from "../../types";
import { canTakeFinalExam, deriveRiverStatus, isCourseComplete, isRiverUnlocked } from "../../state/progress";
import { useModuleProgress } from "../../state/useModuleProgress";
import { PRINCIPLE_SCRIPTURE } from "../../content/scripture";
import {
  INTRODUCTION,
  LESSONS,
  courseReadingMinutes,
  introductionReadingMinutes,
  riverReadingMinutes,
} from "../../content/lessons";
import { EXAM_PASS_THRESHOLD, EXAM_QUESTION_COUNT } from "../../content/exam";
import { ScriptureQuote } from "../ui/Scripture";
import { ProgressBar } from "../ui/ProgressBar";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { LoadError } from "../ui/LoadError";
import { LockIcon, QuizIcon } from "../ui/RiverIcons";
import { RiverProgress } from "../layout/RiverProgress";

function ctaLabel(status: RiverStatus): string {
  if (status === "complete") return "Review";
  if (status === "in_progress") return "Continue";
  return "Start";
}

function badge(status: RiverStatus, unlocked: boolean): { text: string; className: string } {
  if (status === "complete")
    return { text: "Complete", className: "bg-river-1/15 text-olive" };
  if (status === "in_progress")
    return { text: "In progress", className: "bg-gold/20 text-clay" };
  return unlocked
    ? { text: "Not started", className: "bg-parchment-deep text-ink-soft" }
    : { text: "Locked", className: "bg-parchment-deep text-ink-soft" };
}

export function CourseHome() {
  const { snapshot, loading, loadError, reload } = useCourse();

  // Called unconditionally, once per river (a fixed count), so hook order
  // never depends on load state or which rivers are unlocked.
  const introProgress = useModuleProgress("introduction", INTRODUCTION.lessons.length);
  const progress1 = useModuleProgress(1, LESSONS[1].lessons.length);
  const progress2 = useModuleProgress(2, LESSONS[2].lessons.length);
  const progress3 = useModuleProgress(3, LESSONS[3].lessons.length);
  const progress4 = useModuleProgress(4, LESSONS[4].lessons.length);
  const moduleProgressByRiver = { 1: progress1, 2: progress2, 3: progress3, 4: progress4 } as const;

  if (loading && !snapshot)
    return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading your course…</p>;
  if (loadError) return <LoadError message={loadError} onRetry={reload} />;
  if (!snapshot) return null;

  const completeCount = RIVERS.filter(
    (r) => deriveRiverStatus(snapshot, r.number) === "complete"
  ).length;
  const courseComplete = isCourseComplete(snapshot);
  const examUnlocked = canTakeFinalExam(snapshot);
  const greeting = snapshot.profile.displayName ? `, ${snapshot.profile.displayName}` : "";

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold text-ink">The four rivers{greeting}</h1>
        <p className="mt-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          {completeCount} of 4 complete. Work through them in order, and revisit any you've finished
          whenever you like. About {courseReadingMinutes()} minutes of reading in all, and every
          module can be read aloud.
        </p>
      </header>

      <div className="flex justify-center">
        <RiverProgress snapshot={snapshot} />
      </div>

      {courseComplete && (
        <Card accent={RIVERS[3].accent} className="bg-parchment-deep/50">
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">You've completed all four rivers.</h2>
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                Your dashboard pulls together everything you've logged and is where you keep tracking.
              </p>
            </div>
            <Link to="/dashboard">
              <Button>Open dashboard</Button>
            </Link>
          </CardBody>
        </Card>
      )}

      <Link to="/course/introduction">
        <Card accent={THEME.palette.gold} className="transition-colors hover:bg-parchment-deep/30">
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <span
                className="font-[family-name:var(--font-ui)] text-sm font-semibold"
                style={{ color: THEME.palette.gold }}
              >
                Before River 1
              </span>
              <h3 className="mt-1 text-xl font-semibold text-ink">
                {INTRODUCTION.title}
                <span className="ml-2 font-[family-name:var(--font-ui)] text-xs font-normal text-ink-soft">
                  ≈ {introductionReadingMinutes()} min
                </span>
              </h3>
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                A handful of brief looks at stewardship in Scripture, plus a few practical modules. No
                tracker, not one of the four rivers, just a foundation.
              </p>
              <div className="mt-3 max-w-xs">
                <div className="mb-1 flex items-center justify-between font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                  <span>Modules read</span>
                  <span>
                    {introProgress.viewedCount}/{introProgress.totalModules}
                  </span>
                </div>
                <ProgressBar
                  fraction={introProgress.fraction}
                  accent={THEME.palette.gold}
                  label={`${introProgress.viewedCount} of ${introProgress.totalModules} introduction modules read`}
                />
              </div>
            </div>
            <Button variant="secondary">{introProgress.viewedCount > 0 ? "Continue" : "Start"}</Button>
          </CardBody>
        </Card>
      </Link>

      <div className="grid gap-4">
        {RIVERS.map((r) => {
          const status = deriveRiverStatus(snapshot, r.number);
          const unlocked = isRiverUnlocked(snapshot, r.number);
          const b = badge(status, unlocked);
          const rp = moduleProgressByRiver[r.number];
          return (
            <Card key={r.number} accent={unlocked ? r.accent : undefined}>
              <CardBody className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-[family-name:var(--font-ui)]">
                    <span className="text-sm font-semibold" style={{ color: r.accent }}>
                      River {r.number}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${b.className}`}>
                      {b.text}
                    </span>
                  </div>
                  <h3 className="mt-1 text-xl font-semibold text-ink">
                    {r.title}
                    <span className="ml-2 font-[family-name:var(--font-ui)] text-xs font-normal text-ink-soft">
                      ≈ {riverReadingMinutes(LESSONS[r.number])} min
                    </span>
                  </h3>
                  <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                    {r.principle}
                  </p>
                  <div className="mt-2 max-w-xl">
                    <ScriptureQuote verse={PRINCIPLE_SCRIPTURE[r.number]} compact />
                  </div>
                  {unlocked && (
                    <div className="mt-3 max-w-xs">
                      <div className="mb-1 flex items-center justify-between font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                        <span>Modules read</span>
                        <span>
                          {rp.viewedCount}/{rp.totalModules}
                        </span>
                      </div>
                      <ProgressBar
                        fraction={rp.fraction}
                        accent={r.accent}
                        label={`${rp.viewedCount} of ${rp.totalModules} modules read in River ${r.number}`}
                      />
                    </div>
                  )}
                </div>
                {unlocked ? (
                  <Link to={`/course/river/${r.number}`}>
                    <Button variant={status === "complete" ? "secondary" : "primary"}>
                      {ctaLabel(status)}
                    </Button>
                  </Link>
                ) : (
                  <Button variant="secondary" disabled>
                    Locked
                  </Button>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {courseComplete && (examUnlocked ? (
        <Link to="/course/exam">
          <Card accent={THEME.palette.gold} className="transition-colors hover:bg-parchment-deep/30">
            <CardBody className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-ui)] text-sm font-semibold ${
                    snapshot.profile.examPassedAt ? "text-white" : "border-2 bg-surface text-ink-soft"
                  }`}
                  style={
                    snapshot.profile.examPassedAt
                      ? { backgroundColor: THEME.palette.gold }
                      : { borderColor: THEME.palette.gold }
                  }
                >
                  {snapshot.profile.examPassedAt ? (
                    "✓"
                  ) : (
                    <QuizIcon color={THEME.palette.gold} size={18} />
                  )}
                </span>
                <div>
                  <h3 className="text-xl font-semibold text-ink">4 Rivers Final Exam</h3>
                  <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                    {EXAM_QUESTION_COUNT} questions covering all four rivers · {EXAM_PASS_THRESHOLD} to pass ·
                    unlocks your certificate
                  </p>
                </div>
              </div>
              <Button variant={snapshot.profile.examPassedAt ? "secondary" : "primary"}>
                {snapshot.profile.examPassedAt ? "Retake" : "Take the exam"}
              </Button>
            </CardBody>
          </Card>
        </Link>
      ) : (
        <Card className="opacity-60">
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-line bg-surface text-ink-soft">
                <LockIcon color="var(--color-ink-soft)" size={18} />
              </span>
              <div>
                <h3 className="text-xl font-semibold text-ink-soft">4 Rivers Final Exam</h3>
                <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                  Mark every module complete and pass all four river quizzes to unlock the final exam.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
