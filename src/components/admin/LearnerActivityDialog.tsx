import { useEffect, useRef, useState } from "react";
import { useCourse } from "../../state/CourseContext";
import { useContent } from "../../state/ContentContext";
import type { Learner, LearnerActivity } from "../../types";
import { INTRODUCTION, LESSONS } from "../../content/lessons";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";

const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const dateOnly = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

const show = (iso: string | null, withTime = false) =>
  iso ? (withTime ? dateTime : dateOnly).format(new Date(iso)) : "Never";

/** The relative time next to a date, such as "3 days ago", so staleness is clear at a glance. */
function ago(iso: string | null): string {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  return days === 1 ? "yesterday" : `${days} days ago`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-t border-line py-1.5 first:border-t-0">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}

/** One learner's activity and progress, opened from the three-dot menu in the Learners list. */
export function LearnerActivityDialog({ learner, onClose }: { learner: Learner; onClose: () => void }) {
  const { repository } = useCourse();
  const { getIntroduction, getRiver } = useContent();
  const [data, setData] = useState<LearnerActivity | null>(null);
  const [error, setError] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);

  // Escape closes the panel wherever focus is, and focus starts inside it.
  useEffect(() => {
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;
    repository
      .getLearnerActivity(learner.userId)
      .then((d) => alive && setData(d))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [repository, learner.userId]);

  const totalModules =
    INTRODUCTION.lessons.length + ([1, 2, 3, 4] as const).reduce((n, r) => n + LESSONS[r].lessons.length, 0);
  const titleOf = (section: string, index: number) => {
    const lessons = section === "introduction" ? getIntroduction().lessons : getRiver(Number(section) as 1).lessons;
    const label = section === "introduction" ? "Introduction" : `River ${section}`;
    return `${label}: ${lessons[index]?.title ?? `lesson ${index + 1}`}`;
  };
  const name = learner.fullName || learner.displayName || learner.email;
  const lastActive = data ? (data.lastSeenAt ?? data.lastSignInAt) : null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Activity for ${name}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <Card className="my-auto w-full max-w-2xl !bg-surface">
        <CardBody className="flex flex-col gap-5 font-[family-name:var(--font-ui)] text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="t-h3">{name}</h2>
              <p className="break-all text-ink-soft">{learner.email}</p>
            </div>
            <Button ref={closeButton} variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>

          {error && (
            <p role="alert" className="text-red-700">
              Couldn&apos;t load this learner&apos;s activity. If the latest database update hasn&apos;t been run
              yet, run supabase/migrations/20261006000100_activity_analytics_digest.sql, then try again.
            </p>
          )}
          {!data && !error && <p className="text-ink-soft">Loading…</p>}

          {data && (
            <>
              <dl>
                <Row
                  label="Last opened the app"
                  value={lastActive ? `${show(lastActive, true)} (${ago(lastActive)})` : "Never"}
                />
                <Row label="Last signed in" value={show(data.lastSignInAt, true)} />
                <Row label="Signed up" value={show(data.signedUpAt)} />
                <Row label="Modules read" value={`${data.modulesRead} of ${totalModules}`} />
                <Row
                  label="Final exam"
                  value={
                    data.examPassedAt
                      ? `Passed ${show(data.examPassedAt)} (${data.examBestScore ?? "?"}/50)`
                      : "Not passed yet"
                  }
                />
                <Row
                  label="30-Day Challenge"
                  value={data.challengeStartedAt ? `Started ${show(data.challengeStartedAt)}` : "Not started"}
                />
                {data.leaderStatus !== "none" && (
                  <Row label="Group leader" value={data.leaderStatus === "approved" ? "Approved" : "Requested"} />
                )}
              </dl>

              <div>
                <h3 className="mb-1 font-semibold text-ink">Rivers</h3>
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[30rem] border-collapse text-left">
                    <thead>
                      <tr className="bg-parchment-deep/40 text-xs uppercase tracking-wide text-ink-soft">
                        <th className="px-3 py-1.5 font-medium">River</th>
                        <th className="px-3 py-1.5 font-medium">Started</th>
                        <th className="px-3 py-1.5 font-medium">Completed</th>
                        <th className="px-3 py-1.5 font-medium">Quiz</th>
                      </tr>
                    </thead>
                    <tbody>
                      {([1, 2, 3, 4] as const).map((n) => {
                        const r = data.rivers.find((x) => x.river === n);
                        return (
                          <tr key={n} className="border-t border-line text-ink">
                            <td className="px-3 py-1.5">River {n}</td>
                            <td className="px-3 py-1.5 text-ink-soft">{show(r?.lessonViewedAt ?? null)}</td>
                            <td className="px-3 py-1.5 text-ink-soft">{show(r?.completedAt ?? null)}</td>
                            <td className="px-3 py-1.5 text-ink-soft">
                              {r?.quizPassedAt
                                ? `Passed (best ${r.quizBestScore ?? "?"}/10)`
                                : r?.quizBestScore != null
                                  ? `Best ${r.quizBestScore}/10`
                                  : "Not taken"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="mb-1 font-semibold text-ink">Tracker entries</h3>
                <p className="text-ink-soft">
                  {data.entries.income} income streams, {data.entries.savings} savings deposits,{" "}
                  {data.entries.investing} investments, {data.entries.giving} gifts
                </p>
              </div>

              {data.groups.length > 0 && (
                <div>
                  <h3 className="mb-1 font-semibold text-ink">Groups</h3>
                  <ul className="flex flex-col gap-1 text-ink-soft">
                    {data.groups.map((g, i) => (
                      <li key={i}>
                        <span className="text-ink">{g.name}</span> · {g.role} · joined {show(g.joinedAt)} ·{" "}
                        {g.readingsChecked} readings checked
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.recent.length > 0 && (
                <div>
                  <h3 className="mb-1 font-semibold text-ink">Recently read</h3>
                  <ul className="flex flex-col gap-1 text-ink-soft">
                    {data.recent.map((r, i) => (
                      <li key={i}>
                        {show(r.at, true)}: {titleOf(r.section, r.index)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
