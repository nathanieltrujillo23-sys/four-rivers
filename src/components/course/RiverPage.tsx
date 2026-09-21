import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { RIVERS, riverByNumber } from "../../theme/theme";
import type { RiverNumber } from "../../types";
import { LESSONS } from "../../content/lessons";
import {
  deriveRiverStatus,
  entryCountForRiver,
  isCourseComplete,
  isRiverUnlocked,
  progressForRiver,
} from "../../state/progress";
import { Button } from "../ui/Button";
import { ScriptureList } from "../ui/Scripture";
import { Card, CardBody } from "../ui/Card";
import { RiverProgress } from "../layout/RiverProgress";
import { LessonPanel } from "./LessonPanel";
import { IncomeStreamTracker } from "../trackers/IncomeStreamTracker";
import { SavingsTracker } from "../trackers/SavingsTracker";
import { InvestmentTracker } from "../trackers/InvestmentTracker";
import { GivingTracker } from "../trackers/GivingTracker";

function Tracker({ river }: { river: RiverNumber }) {
  switch (river) {
    case 1:
      return <IncomeStreamTracker />;
    case 2:
      return <SavingsTracker />;
    case 3:
      return <InvestmentTracker />;
    case 4:
      return <GivingTracker />;
  }
}

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
  const lesson = LESSONS[riverNumber];

  if (!isRiverUnlocked(snapshot, riverNumber)) {
    const prev = riverByNumber(riverNumber - 1)!;
    return (
      <Card>
        <CardBody className="text-center">
          <h1 className="text-xl font-semibold text-ink">River {riverNumber} is still locked</h1>
          <p className="mx-auto mt-2 max-w-sm font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            Finish River {prev.number} — {prev.title} — first: read the lesson and log at least one
            entry in its tracker.
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

  return (
    <div className="flex flex-col gap-8">
      <RiverProgress snapshot={snapshot} activeRiver={riverNumber} />

      <LessonPanel lesson={lesson} river={river} />

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Practice</h2>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            {lesson.practicePrompt}
          </p>
          <ScriptureList verses={lesson.practiceScripture} compact className="mt-3" />
        </div>
        <Tracker river={riverNumber} />
      </section>

      <Card accent={river.accent} className="bg-parchment-deep/40">
        <CardBody>
          <h3 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
            {status === "complete" ? "River complete" : "To complete this river"}
          </h3>
          <ul className="mt-2 flex flex-col gap-1 font-[family-name:var(--font-ui)] text-sm">
            <li className={lessonViewed || status === "complete" ? "text-olive" : "text-ink-soft"}>
              {lessonViewed || status === "complete" ? "✓" : "○"} Read the lesson
            </li>
            <li className={hasEntry || status === "complete" ? "text-olive" : "text-ink-soft"}>
              {hasEntry || status === "complete" ? "✓" : "○"} Log at least one entry in the tracker
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
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
