import { Link, Navigate, useParams } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useContent } from "../../state/ContentContext";
import { riverByNumber } from "../../theme/theme";
import type { RiverNumber } from "../../types";
import { LESSONS, lessonReadingMinutes } from "../../content/lessons";
import { canOpenQuiz, isRiverUnlocked } from "../../state/progress";
import { useAudioLessonReader } from "../../state/useAudioLessonReader";
import { useModuleProgress } from "../../state/useModuleProgress";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { ProgressBar } from "../ui/ProgressBar";
import { LoadError } from "../ui/LoadError";
import { LessonReader } from "./LessonReader";
import { LessonPanel } from "./LessonPanel";
import { GrowthCalculator } from "./GrowthCalculator";
import { TVMExplainer } from "./TVMExplainer";
import { IncomeImpactCalculator } from "./impact/IncomeImpactCalculator";
import { PracticeSection } from "./PracticeSection";
import { MarkCompleteButton } from "./MarkCompleteButton";
import { ModuleNoteForm } from "./ModuleNoteForm";
import { FEATURES } from "../../lib/features";

/** One module within a river: `/course/river/:n/module/:m` (m is 1-based). */
export function ModuleDetailPage() {
  const { n, m } = useParams();
  const riverNumber = Number(n) as RiverNumber;
  const moduleIndex = Number(m) - 1; // 0-based into river.lessons
  const { snapshot, loading, loadError, reload } = useCourse();
  const { getLesson } = useContent();

  const validRiver = [1, 2, 3, 4].includes(riverNumber);
  const river = validRiver ? LESSONS[riverNumber] : undefined;
  const total = river?.lessons.length ?? 0;
  const validModule =
    !!river &&
    Number.isInteger(moduleIndex) &&
    moduleIndex >= 0 &&
    moduleIndex < total;

  // The reader hook must run every render (rules of hooks), so give it a
  // harmless placeholder module when the route itself is invalid — the
  // invalid-route redirect below fires before this value is ever used.
  const module_ = validModule
    ? getLesson(riverNumber, moduleIndex)
    : { title: "", body: [], scriptureRefs: [] };
  const reader = useAudioLessonReader(riverNumber, moduleIndex + 1);
  const moduleProgress = useModuleProgress(riverNumber, total);

  if (!validRiver || !validModule) return <Navigate to="/course" replace />;
  if (loading && !snapshot)
    return (
      <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
        Loading…
      </p>
    );
  if (loadError) return <LoadError message={loadError} onRetry={reload} />;
  if (!snapshot) return null;

  if (!isRiverUnlocked(snapshot, riverNumber))
    return <Navigate to={`/course/river/${riverNumber}`} replace />;

  const riverTheme = riverByNumber(riverNumber)!;
  // Every river's last module is its practice module (titled "The practice: …");
  // that's the only place the companion tracker appears.
  const isLastModule = moduleIndex === total - 1;
  const prev = moduleIndex > 0 ? moduleIndex - 1 : null;
  const next = moduleIndex < total - 1 ? moduleIndex + 1 : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            to={`/course/river/${riverNumber}`}
            className="font-[family-name:var(--font-ui)] text-sm text-ink-soft hover:text-ink"
          >
            ← All River {riverNumber} modules
          </Link>
          <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
            {moduleProgress.viewedCount} of {moduleProgress.totalModules} read
          </span>
        </div>
        <ProgressBar
          fraction={moduleProgress.fraction}
          accent={riverTheme.accent}
          label={`${moduleProgress.viewedCount} of ${moduleProgress.totalModules} modules read`}
        />
      </div>

      <LessonReader reader={reader} />

      <LessonPanel
        lesson={module_}
        river={riverTheme}
        eyebrow={`River ${riverNumber} · Module ${moduleIndex + 1} of ${total} · ≈ ${lessonReadingMinutes(module_)} min read`}
        activeKey={reader.activeKey}
        editable={{ section: riverNumber, moduleIndex }}
      />

      {riverNumber === 3 && moduleIndex === 3 && (
        <TVMExplainer accent={riverTheme.accent} />
      )}

      {isLastModule && riverNumber === 1 && (
        <IncomeImpactCalculator accent={riverTheme.accent} />
      )}
      {isLastModule && riverNumber === 2 && (
        <GrowthCalculator variant="savings" accent={riverTheme.accent} />
      )}
      {isLastModule && riverNumber === 3 && (
        <GrowthCalculator variant="investing" accent={riverTheme.accent} />
      )}

      {isLastModule && (
        <div data-tour="practice">
          <PracticeSection
            riverNumber={riverNumber}
            accent={riverTheme.accent}
            prompt={river!.practicePrompt}
            scripture={river!.practiceScripture}
          />
        </div>
      )}

      {FEATURES.journal && (
        <ModuleNoteForm
          riverNumber={riverNumber}
          moduleTitle={module_.title}
          accent={riverTheme.accent}
        />
      )}

      <Card accent={riverTheme.accent} className="bg-parchment-deep/40">
        <CardBody className="grid grid-cols-1 items-center gap-3 sm:grid-cols-3">
          <div className="flex justify-center sm:justify-start">
            {prev !== null && (
              <Link to={`/course/river/${riverNumber}/module/${prev + 1}`}>
                <Button variant="secondary">
                  ← {getLesson(riverNumber, prev).title}
                </Button>
              </Link>
            )}
          </div>
          <div className="flex justify-center">
            <MarkCompleteButton
              completed={moduleProgress.isViewed(moduleIndex)}
              onComplete={() => moduleProgress.markViewed(moduleIndex)}
              accent={riverTheme.accent}
            />
          </div>
          <div className="flex justify-center sm:justify-end">
            {next !== null ? (
              <Link to={`/course/river/${riverNumber}/module/${next + 1}`}>
                <Button>{getLesson(riverNumber, next).title} →</Button>
              </Link>
            ) : canOpenQuiz(snapshot, riverNumber) ? (
              <Link to={`/course/river/${riverNumber}/quiz`}>
                <Button>
                  {snapshot.profile.fullAccess
                    ? "View the quiz"
                    : "Take the quiz"}
                </Button>
              </Link>
            ) : (
              <div className="flex flex-col items-center gap-1 sm:items-end">
                <Button disabled>Take the quiz</Button>
                <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                  Log an entry in the tracker above to unlock it.
                </span>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
