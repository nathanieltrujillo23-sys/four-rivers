import { Link } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { RIVERS } from "../../theme/theme";
import type { RiverStatus } from "../../types";
import { deriveRiverStatus, isCourseComplete, isRiverUnlocked } from "../../state/progress";
import { PRINCIPLE_SCRIPTURE } from "../../content/scripture";
import { ScriptureQuote } from "../ui/Scripture";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
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
  const { snapshot, loading, loadError } = useCourse();

  if (loading && !snapshot)
    return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading your course…</p>;
  if (loadError)
    return (
      <p className="font-[family-name:var(--font-ui)] text-sm text-red-700">
        Couldn't load your course: {loadError}
      </p>
    );
  if (!snapshot) return null;

  const completeCount = RIVERS.filter(
    (r) => deriveRiverStatus(snapshot, r.number) === "complete"
  ).length;
  const courseComplete = isCourseComplete(snapshot);
  const greeting = snapshot.profile.displayName ? `, ${snapshot.profile.displayName}` : "";

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold text-ink">The four rivers{greeting}</h1>
        <p className="mt-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          {completeCount} of 4 complete. Work through them in order — revisit any you've finished
          whenever you like.
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

      <div className="grid gap-4">
        {RIVERS.map((r) => {
          const status = deriveRiverStatus(snapshot, r.number);
          const unlocked = isRiverUnlocked(snapshot, r.number);
          const b = badge(status, unlocked);
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
                  <h3 className="mt-1 text-xl font-semibold text-ink">{r.title}</h3>
                  <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                    {r.principle}
                  </p>
                  <div className="mt-2 max-w-xl">
                    <ScriptureQuote verse={PRINCIPLE_SCRIPTURE[r.number]} compact />
                  </div>
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
    </div>
  );
}
