import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { RIVERS, riverByNumber } from "../../theme/theme";
import type { RiverNumber } from "../../types";
import { LESSONS, lessonReadingMinutes } from "../../content/lessons";
import {
  deriveRiverStatus,
  entryCountForRiver,
  isCourseComplete,
  isRiverUnlocked,
  progressForRiver,
} from "../../state/progress";
import { EDEN_RIVER_REFS } from "../../content/scripture";
import { Button } from "../ui/Button";
import { ScriptureList } from "../ui/Scripture";
import { Card, CardBody } from "../ui/Card";
import { RiverProgress } from "../layout/RiverProgress";

/**
 * A river's overview: its introduction and a list of modules. The companion
 * tracker no longer lives here — it's optional, and only offered on the
 * river's practice module (its last one).
 */
export function RiverPage() {
  const { n } = useParams();
  const riverNumber = Number(n) as RiverNumber;
  const { snapshot, loading, loadError, markLessonViewed } = useCourse();

  const valid = [1, 2, 3, 4].includes(riverNumber);

  useEffect(() => {
    if (valid && snapshot) void markLessonViewed(riverNumber);
    // mark once per river visit; markLessonViewed is idempotent
  }, [valid, riverNumber, snapshot, markLessonViewed]);

  if (!valid) return <Navigate to="/course" replace />;
  if (loading && !snapshot)
    return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading…</p>;
  if (loadError)
    return (
      <p className="font-[family-name:var(--font-ui)] text-sm text-red-700">
        Couldn't load your course: {loadError}
      </p>
    );
  if (!snapshot) return null;

  const river = riverByNumber(riverNumber)!;
  const content = LESSONS[riverNumber];

  if (!isRiverUnlocked(snapshot, riverNumber)) {
    const prev = riverByNumber(riverNumber - 1)!;
    return (
      <Card>
        <CardBody className="text-center">
          <h1 className="text-xl font-semibold text-ink">River {riverNumber} is still locked</h1>
          <p className="mx-auto mt-2 max-w-sm font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            Finish River {prev.number} — {prev.title} — first: work through its modules and log at
            least one entry in its tracker.
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
  const nextRiver = RIVERS.find((r) => r.number === riverNumber + 1);
  const courseComplete = isCourseComplete(snapshot);
  const practiceModuleNumber = content.lessons.length; // the tracker lives on the last module

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
          <h1 className="mt-1 text-3xl font-semibold text-ink">{content.title}</h1>
          <p className="mt-3 text-lg leading-relaxed text-ink-soft">{content.intro}</p>
        </header>
        <ScriptureList verses={content.introScripture} />
      </article>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Modules</h2>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            Work through them in order, or jump around freely — they're always here to revisit.
          </p>
        </div>
        <ol className="flex flex-col gap-3">
          {content.lessons.map((module_, i) => (
            <li key={module_.title}>
              <Link to={`/course/river/${riverNumber}/module/${i + 1}`}>
                <Card accent={river.accent} className="transition-colors hover:bg-parchment-deep/30">
                  <CardBody className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-ui)] text-sm font-semibold text-white"
                        style={{ backgroundColor: river.accent }}
                      >
                        {i + 1}
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
          ))}
        </ol>
      </section>

      <Card accent={river.accent} className="bg-parchment-deep/40">
        <CardBody>
          <h3 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
            {status === "complete" ? "River complete" : "To complete this river"}
          </h3>
          <ul className="mt-2 flex flex-col gap-1 font-[family-name:var(--font-ui)] text-sm">
            <li className={lessonViewed || status === "complete" ? "text-olive" : "text-ink-soft"}>
              {lessonViewed || status === "complete" ? "✓" : "○"} Open this river's overview
            </li>
            <li className={hasEntry || status === "complete" ? "text-olive" : "text-ink-soft"}>
              {hasEntry || status === "complete" ? "✓" : "○"} Log at least one entry in the tracker
              (found on the last module)
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            {!hasEntry && status !== "complete" && (
              <Link to={`/course/river/${riverNumber}/module/${practiceModuleNumber}`}>
                <Button>Go to the practice module</Button>
              </Link>
            )}
            {status === "complete" && nextRiver && (
              <Link to={`/course/river/${nextRiver.number}`}>
                <Button>Next: River {nextRiver.number} — {nextRiver.title}</Button>
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
