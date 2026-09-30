import { Link, Navigate, useParams } from "react-router-dom";
import { INTRODUCTION, lessonReadingMinutes } from "../../content/lessons";
import { useModuleProgress } from "../../state/useModuleProgress";
import { THEME } from "../../theme/theme";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { ProgressBar } from "../ui/ProgressBar";
import { LessonPanel } from "./LessonPanel";
import { MarkCompleteButton } from "./MarkCompleteButton";

const ACCENT = THEME.palette.gold;

/**
 * One module of the introduction: `/course/introduction/module/:m` (m is
 * 1-based). Deliberately simpler than a river's ModuleDetailPage — no lock
 * check (the introduction is never gated), no practice/tracker section, and
 * no read-aloud audio (none has been generated for this content yet).
 */
export function IntroductionModulePage() {
  const { m } = useParams();
  const moduleIndex = Number(m) - 1;
  const total = INTRODUCTION.lessons.length;
  const validModule = Number.isInteger(moduleIndex) && moduleIndex >= 0 && moduleIndex < total;

  const moduleProgress = useModuleProgress("introduction", total);

  if (!validModule) return <Navigate to="/course/introduction" replace />;

  const module_ = INTRODUCTION.lessons[moduleIndex];
  const isLastModule = moduleIndex === total - 1;
  const prev = moduleIndex > 0 ? moduleIndex - 1 : null;
  const next = moduleIndex < total - 1 ? moduleIndex + 1 : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            to="/course/introduction"
            className="font-[family-name:var(--font-ui)] text-sm text-ink-soft hover:text-ink"
          >
            ← All introduction modules
          </Link>
          <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
            {moduleProgress.viewedCount} of {moduleProgress.totalModules} read
          </span>
        </div>
        <ProgressBar
          fraction={moduleProgress.fraction}
          accent={ACCENT}
          label={`${moduleProgress.viewedCount} of ${moduleProgress.totalModules} introduction modules read`}
        />
      </div>

      <LessonPanel
        lesson={module_}
        river={{ accent: ACCENT }}
        eyebrow={`Introduction · Module ${moduleIndex + 1} of ${total} · ≈ ${lessonReadingMinutes(module_)} min read`}
      />

      <Card accent={ACCENT} className="bg-parchment-deep/40">
        <CardBody className="grid grid-cols-1 items-center gap-3 sm:grid-cols-3">
          <div className="flex justify-center sm:justify-start">
            {prev !== null && (
              <Link to={`/course/introduction/module/${prev + 1}`}>
                <Button variant="secondary">← {INTRODUCTION.lessons[prev].title}</Button>
              </Link>
            )}
          </div>
          <div className="flex justify-center">
            <MarkCompleteButton
              completed={moduleProgress.isViewed(moduleIndex)}
              onComplete={() => moduleProgress.markViewed(moduleIndex)}
              accent={ACCENT}
            />
          </div>
          <div className="flex justify-center sm:justify-end">
            {next !== null ? (
              <Link to={`/course/introduction/module/${next + 1}`}>
                <Button>{INTRODUCTION.lessons[next].title} →</Button>
              </Link>
            ) : isLastModule ? (
              <Link to="/course/river/1">
                <Button>Start River 1 →</Button>
              </Link>
            ) : null}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
