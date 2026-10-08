import { useEffect, useMemo, useState } from "react";
import { useCourse } from "../../state/CourseContext";
import type { AdminAnalytics, QuestionSection, QuestionStat } from "../../types";
import { QUIZZES } from "../../content/quizzes";
import { EXAM_QUESTIONS } from "../../content/exam";
import { RIVERS } from "../../theme/theme";
import { Card, CardBody } from "../ui/Card";
import { loadStatsSetting, saveStatsSetting } from "../../lib/siteText";
import type { AdminOverview } from "../../types";
import { PageSkeleton } from "../ui/Skeleton";

const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0);

function Bar({ label, value, of, color }: { label: string; value: number; of: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 text-ink-soft">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-parchment-deep">
        <div className="h-full rounded-full" style={{ width: `${pct(value, of)}%`, backgroundColor: color }} />
      </div>
      <span className="w-24 shrink-0 text-right tabular-nums text-ink">
        {value} <span className="text-ink-soft">({pct(value, of)}%)</span>
      </span>
    </div>
  );
}

function questionText(section: QuestionSection, idx: number): string {
  if (section === "exam") return EXAM_QUESTIONS[idx]?.question ?? `Exam question ${idx + 1}`;
  const river = Number(section.slice(1)) as 1 | 2 | 3 | 4;
  return QUIZZES[river]?.[idx]?.question ?? `River ${river} question ${idx + 1}`;
}

const sectionLabel = (s: QuestionSection) => (s === "exam" ? "Final exam" : `River ${s.slice(1)} quiz`);

/** How learners move through the course, and which questions they miss most. */
export function AnalyticsAdmin() {
  const { repository } = useCourse();
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [stats, setStats] = useState<QuestionStat[]>([]);
  const [error, setError] = useState(false);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [stripOn, setStripOn] = useState<boolean | null>(null);
  const [stripMsg, setStripMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    repository
      .getAnalytics()
      .then((d) => alive && setData(d))
      .catch(() => alive && setError(true));
    repository
      .getAdminOverview()
      .then((o) => alive && setOverview(o))
      .catch(() => {});
    loadStatsSetting()
      .then((on) => alive && setStripOn(on))
      .catch(() => alive && setStripOn(false));
    repository
      .getQuestionStats()
      .then((s) => alive && setStats(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [repository]);

  const hardest = useMemo(
    () =>
      stats
        .filter((s) => s.attempts >= 5)
        .map((s) => ({ ...s, rate: s.misses / s.attempts }))
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 10),
    [stats],
  );

  if (error)
    return (
      <Card accent="var(--color-gold)">
        <CardBody>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            Run supabase/migrations/20261006000100_activity_analytics_digest.sql in the Supabase SQL editor,
            then reload.
          </p>
        </CardBody>
      </Card>
    );
  if (!data) return <PageSkeleton cards={2} />;

  const maxWeek = Math.max(1, ...data.signupsByWeek.map((w) => w.count));
  const weekFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const tiles: [string, string | number][] = [
    ["Learners", data.learners],
    ["New this week", data.new7d],
    ["Active, last 7 days", data.active7d],
    ["Active, last 30 days", data.active30d],
  ];

  return (
    <div className="flex flex-col gap-6 font-[family-name:var(--font-ui)] text-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(([label, value]) => (
          <Card key={label}>
            <CardBody>
              <p className="text-xs uppercase tracking-[0.12em] text-ink-soft">{label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-ink">{value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card accent="var(--color-gold)">
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-xl">
              <h2 className="t-h4">Numbers on the home page</h2>
              <p className="text-ink-soft">
                A small “by the numbers” row under the course overview. While it is on, anyone can see these three counts, and
                a count of zero is left out.
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-ink">
              <input
                type="checkbox"
                role="switch"
                checked={!!stripOn}
                disabled={stripOn === null}
                onChange={async (e) => {
                  const next = e.target.checked;
                  setStripOn(next);
                  setStripMsg(null);
                  try {
                    await saveStatsSetting(next);
                    setStripMsg(next ? "On. Visitors can see it now." : "Off.");
                  } catch {
                    setStripOn(!next);
                    setStripMsg("Couldn't change it. Run the latest database update (20261006000200) and try again.");
                  }
                }}
                className="h-5 w-5 accent-[var(--color-water-deep)]"
              />
              <span className="font-medium">{stripOn ? "On" : "Off"}</span>
            </label>
          </div>
          <dl className="grid grid-cols-3 gap-3 text-center">
            {[
              ["Learners", data.learners],
              ["Certificates earned", data.examPassed],
              ["Groups", overview?.groups ?? "…"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-parchment-deep/40 px-2 py-3">
                <dd className="text-2xl font-semibold tabular-nums text-ink">{value}</dd>
                <dt className="text-xs uppercase tracking-wide text-ink-soft">{label}</dt>
              </div>
            ))}
          </dl>
          {stripMsg && (
            <p role="status" className="text-ink-soft">
              {stripMsg}
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-3">
          <h2 className="t-h4">The path through the course</h2>
          <Bar label="Signed up" value={data.learners} of={data.learners} color="var(--color-water-deep)" />
          <Bar label="Read a lesson" value={data.started} of={data.learners} color="var(--color-water-deep)" />
          {RIVERS.map((r) => {
            const row = data.rivers.find((x) => x.river === r.number);
            return (
              <Bar
                key={r.number}
                label={`Finished River ${r.number}`}
                value={row?.completed ?? 0}
                of={data.learners}
                color={r.accent}
              />
            );
          })}
          <Bar label="Passed the final exam" value={data.examPassed} of={data.learners} color="var(--color-olive)" />
          <Bar label="Started the 30-Day Challenge" value={data.challengeStarted} of={data.learners} color="var(--color-gold)" />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="mb-2 t-h4">Rivers and their quizzes</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-ink-soft">
                  <th className="py-1.5 pr-3 font-medium">River</th>
                  <th className="py-1.5 pr-3 font-medium">Started</th>
                  <th className="py-1.5 pr-3 font-medium">Finished</th>
                  <th className="py-1.5 pr-3 font-medium">Quiz passed</th>
                  <th className="py-1.5 font-medium">Average best score</th>
                </tr>
              </thead>
              <tbody>
                {data.rivers.map((r) => (
                  <tr key={r.river} className="border-t border-line text-ink">
                    <td className="py-1.5 pr-3">River {r.river}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{r.started}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{r.completed}</td>
                    <td className="py-1.5 pr-3 tabular-nums">
                      {r.quizPassed}{" "}
                      <span className="text-ink-soft">({pct(r.quizPassed, r.started)}% of started)</span>
                    </td>
                    <td className="py-1.5 tabular-nums">{r.avgBestScore == null ? "n/a" : `${r.avgBestScore} / 10`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {data.signupsByWeek.length > 0 && (
        <Card>
          <CardBody>
            <h2 className="mb-3 t-h4">New learners by week</h2>
            <ul className="flex h-32 items-end gap-2" aria-label="New learners by week">
              {data.signupsByWeek.map((w) => (
                <li key={w.week} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs tabular-nums text-ink-soft">{w.count}</span>
                  <div
                    className="w-full rounded-t bg-water-deep"
                    style={{ height: `${Math.max(4, (w.count / maxWeek) * 80)}px` }}
                  />
                  <span className="text-[10px] text-ink-soft">{weekFmt.format(new Date(w.week))}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <h2 className="t-h4">Questions learners miss most</h2>
          <p className="mb-3 text-ink-soft">
            Quiz and exam questions with at least 5 attempts, by how often they are answered wrong. A very high
            number can mean the lesson, or the question itself, needs another look.
          </p>
          {hardest.length === 0 ? (
            <p className="text-ink-soft">Not enough quiz attempts yet.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {hardest.map((q) => (
                <li key={`${q.section}-${q.idx}`} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                  <p className="text-xs uppercase tracking-wide text-ink-soft">
                    {sectionLabel(q.section)} · question {q.idx + 1} · missed {Math.round(q.rate * 100)}% ({q.misses}{" "}
                    of {q.attempts})
                  </p>
                  <p className="text-ink">{questionText(q.section, q.idx)}</p>
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
