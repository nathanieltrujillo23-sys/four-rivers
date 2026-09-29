import { Link, Navigate, useParams } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { riverByNumber } from "../../theme/theme";
import type { RiverNumber } from "../../types";
import { LESSONS, lessonReadingMinutes } from "../../content/lessons";
import { isRiverUnlocked } from "../../state/progress";
import { useLessonReader } from "../../state/useLessonReader";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { LessonReader } from "./LessonReader";
import { LessonPanel } from "./LessonPanel";
import { GrowthCalculator } from "./GrowthCalculator";
import { PracticeSection } from "./PracticeSection";

/** One module within a river: `/course/river/:n/module/:m` (m is 1-based). */
export function ModuleDetailPage() {
  const { n, m } = useParams();
  const riverNumber = Number(n) as RiverNumber;
  const moduleIndex = Number(m) - 1; // 0-based into river.lessons
  const { snapshot, loading, loadError } = useCourse();

  const validRiver = [1, 2, 3, 4].includes(riverNumber);
  const river = validRiver ? LESSONS[riverNumber] : undefined;
  const total = river?.lessons.length ?? 0;
  const validModule = !!river && Number.isInteger(moduleIndex) && moduleIndex >= 0 && moduleIndex < total;

  // The reader hook must run every render (rules of hooks), so give it a
  // harmless placeholder module when the route itself is invalid — the
  // invalid-route redirect below fires before this value is ever used.
  const module_ = validModule ? river!.lessons[moduleIndex] : { title: "", body: [], scriptureRefs: [] };
  const reader = useLessonReader(module_);

  if (!validRiver || !validModule) return <Navigate to="/course" replace />;
  if (loading && !snapshot)
    return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading…</p>;
  if (loadError)
    return (
      <p className="font-[family-name:var(--font-ui)] text-sm text-red-700">
        Couldn't load your course: {loadError}
      </p>
    );
  if (!snapshot) return null;

  if (!isRiverUnlocked(snapshot, riverNumber)) return <Navigate to={`/course/river/${riverNumber}`} replace />;

  const riverTheme = riverByNumber(riverNumber)!;
  // Every river's last module is its practice module (titled "The practice: …");
  // that's the only place the companion tracker appears.
  const isLastModule = moduleIndex === total - 1;
  const prev = moduleIndex > 0 ? moduleIndex - 1 : null;
  const next = moduleIndex < total - 1 ? moduleIndex + 1 : null;

  return (
    <div className="flex flex-col gap-6">
      <Link
        to={`/course/river/${riverNumber}`}
        className="self-start font-[family-name:var(--font-ui)] text-sm text-ink-soft hover:text-ink"
      >
        ← All River {riverNumber} modules
      </Link>

      <LessonReader reader={reader} />

      <LessonPanel
        lesson={module_}
        river={riverTheme}
        eyebrow={`River ${riverNumber} · Module ${moduleIndex + 1} of ${total} · ≈ ${lessonReadingMinutes(module_)} min read`}
        activeKey={reader.activeKey}
      />

      {isLastModule && riverNumber === 2 && <GrowthCalculator variant="savings" accent={riverTheme.accent} />}
      {isLastModule && riverNumber === 3 && <GrowthCalculator variant="investing" accent={riverTheme.accent} />}

      {isLastModule && (
        <PracticeSection
          riverNumber={riverNumber}
          accent={riverTheme.accent}
          prompt={river!.practicePrompt}
          scripture={river!.practiceScripture}
        />
      )}

      <Card accent={riverTheme.accent} className="bg-parchment-deep/40">
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          {prev !== null ? (
            <Link to={`/course/river/${riverNumber}/module/${prev + 1}`}>
              <Button variant="secondary">← {river!.lessons[prev].title}</Button>
            </Link>
          ) : (
            <span />
          )}
          {next !== null ? (
            <Link to={`/course/river/${riverNumber}/module/${next + 1}`}>
              <Button>{river!.lessons[next].title} →</Button>
            </Link>
          ) : (
            <Link to={`/course/river/${riverNumber}`}>
              <Button>Back to River {riverNumber} overview</Button>
            </Link>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
