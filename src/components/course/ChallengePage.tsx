import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import {
  activityDates,
  currentChallengeDay,
  currentStreak,
  generateChallengePlan,
  isDayComplete,
  CHALLENGE_LENGTH_DAYS,
} from "../../state/challenge";
import { THEME } from "../../theme/theme";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { ProgressBar } from "../ui/ProgressBar";
import { LoadError } from "../ui/LoadError";

const ACCENT = THEME.palette.gold;

/**
 * An optional, opt-in 30-day pace for the course: every module, tracker
 * entry, and quiz spread across the first 29 days, with the final exam alone
 * on day 30. Nothing here gates anything — it's a pacing aid layered over
 * the real completion rules in state/progress.ts, not a replacement for
 * them. "Day" and "streak" are both computed from real activity timestamps,
 * never stored, so skipping around or falling behind never breaks anything.
 */
export function ChallengePage() {
  const { snapshot, loading, loadError, reload, startChallenge, resetChallenge } = useCourse();
  const plan = useMemo(() => generateChallengePlan(), []);
  const [busy, setBusy] = useState(false);

  if (loading && !snapshot)
    return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading…</p>;
  if (loadError) return <LoadError message={loadError} onRetry={reload} />;
  if (!snapshot) return null;

  const startedAt = snapshot.profile.challengeStartedAt;

  if (!startedAt) {
    return (
      <Card accent={ACCENT} className="mx-auto max-w-lg">
        <CardBody className="flex flex-col items-center gap-4 py-10 text-center">
          <h1 className="text-2xl font-semibold text-ink">The 30-Day Challenge</h1>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            Every module, tracker entry, and quiz in the course, paced across 29 days — with the final
            exam waiting alone on day 30. Entirely optional; it doesn't change what's required to
            complete the course, just gives you a rhythm to follow if you want one.
          </p>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await startChallenge();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Starting…" : "Start the 30-Day Challenge"}
          </Button>
        </CardBody>
      </Card>
    );
  }

  const today = currentChallengeDay(startedAt);
  const dates = activityDates(snapshot);
  const streak = currentStreak(dates);
  const completedDays = plan.filter((d) => isDayComplete(d, snapshot)).length;

  return (
    <div className="flex flex-col gap-6">
      <header data-tour="challenge-header" className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p
            className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.18em]"
            style={{ color: ACCENT }}
          >
            30-Day Challenge
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">Day {today} of {CHALLENGE_LENGTH_DAYS}</h1>
          <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            {completedDays} of {CHALLENGE_LENGTH_DAYS} days fully done · started{" "}
            {new Date(startedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className="rounded-full px-3 py-1 font-[family-name:var(--font-ui)] text-sm font-semibold"
            style={{ backgroundColor: `${ACCENT}22`, color: ACCENT }}
          >
            🔥 {streak} day streak
          </span>
          <button
            type="button"
            className="font-[family-name:var(--font-ui)] text-xs text-ink-soft underline"
            onClick={async () => {
              if (!confirm("Restart the 30-day challenge from day 1?")) return;
              await resetChallenge();
            }}
          >
            Restart challenge
          </button>
        </div>
      </header>

      <ProgressBar
        fraction={completedDays / CHALLENGE_LENGTH_DAYS}
        accent={ACCENT}
        label={`${completedDays} of ${CHALLENGE_LENGTH_DAYS} days complete`}
      />

      <div className="flex flex-col gap-3">
        {plan.map((day) => {
          const done = isDayComplete(day, snapshot);
          const isToday = day.day === today;
          return (
            <Card
              key={day.day}
              accent={done || isToday ? ACCENT : undefined}
              className={isToday ? "bg-gold/10" : done ? "opacity-70" : undefined}
            >
              <CardBody className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
                    {day.title}
                    {isToday && (
                      <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-clay">
                        Today
                      </span>
                    )}
                  </span>
                  {done && <span className="text-sm text-olive">✓ Done</span>}
                </div>
                <ul className="flex flex-col gap-1">
                  {day.items.map((item) => {
                    const itemDone = item.isDone(snapshot);
                    return (
                      <li key={item.label} className="flex items-center justify-between gap-2">
                        <span
                          className={`font-[family-name:var(--font-ui)] text-sm ${
                            itemDone ? "text-ink-soft line-through" : "text-ink"
                          }`}
                        >
                          {itemDone ? "✓" : "○"} {item.label}
                        </span>
                        {!itemDone && (
                          <Link
                            to={item.to}
                            className="shrink-0 font-[family-name:var(--font-ui)] text-xs text-water underline"
                          >
                            Go
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
