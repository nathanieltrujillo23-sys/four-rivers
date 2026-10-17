import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useCopy } from "../../lib/copy";
import { useWealthClients } from "../../state/useWealth";
import { useWealthPrep } from "../../state/useWealthPrep";
import { useWealthCommunity } from "../../state/useWealthCommunity";
import { REVIEW_RUBRIC, averageScores, caseByline, pathStatus, reviewComplete } from "../../lib/wealthCommunity";
import { normalizePlan } from "../../lib/wealthMath";
import type { WealthCase, WealthCaseReview } from "../../types";
import { Button } from "../ui/Button";
import { TextArea } from "../ui/Field";
import { LoadError } from "../ui/LoadError";
import { PageSkeleton } from "../ui/Skeleton";
import { Bar, Empty, Panel } from "./parts";

type Tab = "path" | "library" | "reviews";
const TABS: { id: Tab; label: string }[] = [
  { id: "path", label: "Learning path" },
  { id: "library", label: "Case library" },
  { id: "reviews", label: "Reviews" },
];

const labelCls = "flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft";

/** The community side of the wealth track: a learning path, a library of anonymized cases, and private peer review. */
export function CasesPage() {
  const { snapshot } = useCourse();
  const profile = snapshot?.profile;
  const allowed = profile?.wealthStatus === "approved" || profile?.role === "admin";
  if (!snapshot || !profile) return <PageSkeleton cards={2} />;
  if (!allowed) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-10 text-center">
        <h1 className="t-h1">Case library</h1>
        <Link to="/community">
          <Button variant="secondary">Back to Community</Button>
        </Link>
      </div>
    );
  }
  return <Cases userId={profile.userId} isAdmin={profile.role === "admin"} />;
}

function Cases({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const { repository } = useCourse();
  const community = useWealthCommunity(repository);
  const wealth = useWealthClients(repository, userId);
  const prep = useWealthPrep(repository, userId);
  const [tab, setTab] = useState<Tab>("path");

  const mine = useMemo(() => (community.cases ?? []).filter((c) => c.authorId === userId), [community.cases, userId]);
  const reviewsGiven = useMemo(() => community.reviews.filter((r) => r.reviewerId === userId), [community.reviews, userId]);

  if (community.error && !community.cases) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <LoadError message={community.error} onRetry={() => void community.reload()} />
      </div>
    );
  }
  if (!community.cases || !prep.data || !wealth.clients) return <PageSkeleton cards={3} />;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 py-2">
      <header className="flex flex-col gap-3">
        <Link to="/community/wealth" className="w-fit font-[family-name:var(--font-ui)] text-sm text-water-deep hover:underline">
          ← Wealth Tools
        </Link>
        <p className="t-eyebrow">Daily Bread wealth management track</p>
        <h1 className="t-h1">Learn, share, and review</h1>
        <p className="max-w-2xl font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          Everything here is for people in the track only. Cases are anonymized by the person who shares them, and a review is seen only by the person who wrote it and the case's author.
        </p>
      </header>

      <div role="tablist" aria-label="Track community" className="flex gap-1 overflow-x-auto rounded-xl bg-parchment-deep p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`cases-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`cases-panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`min-w-[120px] flex-1 whitespace-nowrap rounded-lg px-3 py-2 font-[family-name:var(--font-ui)] text-sm font-medium transition-colors ${tab === t.id ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`cases-panel-${tab}`} aria-labelledby={`cases-tab-${tab}`}>
        {tab === "path" && <PathTab ctx={{ clients: wealth.clients, prep: prep.data, casesShared: mine.length, reviewsGiven: reviewsGiven.length }} />}
        {tab === "library" && <LibraryTab cases={community.cases} reviews={community.reviews} userId={userId} isAdmin={isAdmin} reload={community.reload} />}
        {tab === "reviews" && <ReviewsTab cases={community.cases} reviews={community.reviews} userId={userId} reload={community.reload} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PathTab({ ctx }: { ctx: Parameters<typeof pathStatus>[0] }) {
  const status = pathStatus(ctx);
  return (
    <div className="flex flex-col gap-4">
      <Panel title={`${status.done} of ${status.total} steps done`} subtitle="Each step is checked from the work you have actually done in Wealth Tools, so there is nothing to tick by hand.">
        <Bar value={status.done / status.total} label="Learning path progress" />
      </Panel>
      <ol className="flex flex-col gap-3">
        {status.steps.map(({ step, done, text }, i) => (
          <li key={step.id} className="panel flex flex-wrap items-start gap-4 p-4">
            <span
              aria-hidden="true"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-ui)] text-sm font-semibold ${done ? "bg-water-deep text-white" : "border border-line text-ink-soft"}`}
            >
              {done ? "✓" : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="t-h4">
                {step.title}
                {done && <span className="sr-only"> (done)</span>}
              </h3>
              <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{step.body}</p>
              <p className="mt-2 font-[family-name:var(--font-ui)] text-xs text-ink-soft">{text}</p>
            </div>
            <Link to={step.to} className="font-[family-name:var(--font-ui)] text-sm text-water-deep underline underline-offset-2">
              {step.linkLabel}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function LibraryTab({ cases, reviews, userId, isAdmin, reload }: { cases: WealthCase[]; reviews: WealthCaseReview[]; userId: string; isAdmin: boolean; reload: () => Promise<void> }) {
  const { repository } = useCourse();
  const navigate = useNavigate();
  const copy = useCopy();
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function run(id: string, job: () => Promise<void>) {
    setBusy(id);
    setError(null);
    setNote(null);
    try {
      await job();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  const copyToMine = (c: WealthCase) =>
    run(c.id, async () => {
      const made = await repository.createWealthClient(c.plan);
      for (const [toolId, state] of Object.entries(c.tools)) await repository.saveWealthClientTool(made.id, toolId, state);
      navigate(`/community/wealth/${made.id}`);
    });

  const deck = (c: WealthCase) =>
    run(c.id, async () => {
      const { buildDeck } = await import("../../lib/wealthDeck");
      const { pres, filename } = await buildDeck({ plan: normalizePlan(c.plan), tools: c.tools, copy, anonymous: true });
      await pres.writeFile({ fileName: filename });
      void repository.bumpWealthStat("decks").catch(() => {});
    });

  const remove = (c: WealthCase) =>
    run(c.id, async () => {
      await repository.deleteWealthCase(c.id);
      await reload();
      setNote("Removed from the library.");
    });

  return (
    <div className="flex flex-col gap-4">
      <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
        Share a case from the <b className="text-ink">Presentation</b> step of any client plan, after removing what could identify the client.
      </p>
      {error && (
        <p role="alert" className="font-[family-name:var(--font-ui)] text-sm text-red-700">
          {error}
        </p>
      )}
      {note && (
        <p role="status" className="font-[family-name:var(--font-ui)] text-sm text-water-deep">
          {note}
        </p>
      )}
      {cases.length === 0 && <Empty>No cases yet. Be the first: open one of your client plans, go to Presentation, and share an anonymized case.</Empty>}
      <ul className="flex flex-col gap-3">
        {cases.map((c) => {
          const own = c.authorId === userId;
          const myReview = reviews.find((r) => r.caseId === c.id && r.reviewerId === userId);
          const plan = normalizePlan(c.plan);
          return (
            <li key={c.id} className="panel flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="t-h4">{c.title}</h3>
                  <p className="mt-0.5 font-[family-name:var(--font-ui)] text-xs text-ink-soft">{caseByline(c)}</p>
                </div>
                <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                  {plan.goals.length} goal{plan.goals.length === 1 ? "" : "s"}, {Object.keys(c.tools).length} tool{Object.keys(c.tools).length === 1 ? "" : "s"}
                  {plan.portfolio.started ? ", portfolio" : ""}
                </p>
              </div>
              {c.summary && <p className="font-[family-name:var(--font-ui)] text-sm text-ink">{c.summary}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={() => void deck(c)} disabled={busy === c.id} aria-label={`Download the deck for ${c.title}`}>
                  {busy === c.id ? "Working…" : "Download deck"}
                </Button>
                <Button variant="secondary" onClick={() => void copyToMine(c)} disabled={busy === c.id} aria-label={`Copy ${c.title} into my clients`}>
                  Copy to my clients
                </Button>
                {!own && (
                  <Button variant="secondary" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id} aria-label={`${myReview ? "Edit your review of" : "Review"} ${c.title}`}>
                    {myReview ? "Edit my review" : "Review it"}
                  </Button>
                )}
                {(own || isAdmin) && (
                  <Button variant="ghost" onClick={() => void remove(c)} disabled={busy === c.id} aria-label={`Remove ${c.title}${own ? "" : " (admin)"}`}>
                    Remove{own ? "" : " (admin)"}
                  </Button>
                )}
              </div>
              {open === c.id && !own && (
                <ReviewForm
                  key={c.id}
                  existing={myReview}
                  onSaved={async () => {
                    setOpen(null);
                    await reload();
                    setNote("Review saved. Only you and the case's author can read it.");
                  }}
                  caseId={c.id}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ReviewForm({ caseId, existing, onSaved }: { caseId: string; existing?: WealthCaseReview; onSaved: () => Promise<void> }) {
  const { repository } = useCourse();
  const [scores, setScores] = useState<Record<string, number>>(existing?.scores ?? {});
  const [strengths, setStrengths] = useState(existing?.strengths ?? "");
  const [improve, setImprove] = useState(existing?.improve ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await repository.reviewWealthCase(caseId, { scores, strengths: strengths.trim(), improve: improve.trim() });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-xl bg-parchment-deep p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">Score each line from 1 to 4, then say one thing that worked and one thing to change. Be specific and kind: a reviewer is helping a classmate get better.</p>
      {REVIEW_RUBRIC.map((line) => (
        <fieldset key={line.id} className="flex flex-col gap-2">
          <legend className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">{line.label}</legend>
          <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{line.hint}</p>
          <div className="grid gap-2 sm:grid-cols-4">
            {line.levels.map((text, i) => {
              const n = i + 1;
              const on = scores[line.id] === n;
              return (
                <label key={n} className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-2 font-[family-name:var(--font-ui)] text-xs ${on ? "border-water-deep bg-surface text-ink" : "border-line text-ink-soft"}`}>
                  <span className="flex items-center gap-2 font-semibold">
                    <input type="radio" name={`score-${caseId}-${line.id}`} checked={on} onChange={() => setScores({ ...scores, [line.id]: n })} className="accent-[var(--color-water-deep)]" />
                    <span aria-hidden="true">{n}</span>
                    <span className="sr-only">
                      {line.label} {n} of 4
                    </span>
                  </span>
                  <span>{text}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <label className={labelCls}>
        What worked well
        <TextArea rows={2} value={strengths} maxLength={1500} onChange={(e) => setStrengths(e.target.value)} className="min-h-16 !text-sm" />
      </label>
      <label className={labelCls}>
        What I would change
        <TextArea rows={2} value={improve} maxLength={1500} onChange={(e) => setImprove(e.target.value)} className="min-h-16 !text-sm" />
      </label>
      {error && (
        <p role="alert" className="font-[family-name:var(--font-ui)] text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy || !reviewComplete(scores)}>
          {busy ? "Saving…" : existing ? "Update my review" : "Send my review"}
        </Button>
        {!reviewComplete(scores) && <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">Score all six lines to send.</span>}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function ReviewsTab({ cases, reviews, userId, reload }: { cases: WealthCase[]; reviews: WealthCaseReview[]; userId: string; reload: () => Promise<void> }) {
  const { repository } = useCourse();
  const [error, setError] = useState<string | null>(null);
  const titleOf = (id: string) => cases.find((c) => c.id === id)?.title ?? "A case that was removed";
  const onMine = reviews.filter((r) => r.reviewerId !== userId);
  const written = reviews.filter((r) => r.reviewerId === userId);
  const mineCases = cases.filter((c) => c.authorId === userId);

  async function remove(id: string) {
    setError(null);
    try {
      await repository.deleteWealthCaseReview(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="font-[family-name:var(--font-ui)] text-sm text-red-700">
          {error}
        </p>
      )}
      <Panel title="Feedback on my cases" subtitle="Private to you. Reviewers are shown by name.">
        {mineCases.length === 0 && <Empty>You have not shared a case yet.</Empty>}
        {mineCases.map((c) => {
          const rs = onMine.filter((r) => r.caseId === c.id);
          const avg = averageScores(rs);
          return (
            <div key={c.id} className="flex flex-col gap-3 border-t border-line pt-4 first:border-t-0 first:pt-0">
              <h4 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">{c.title}</h4>
              {!avg && <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">No reviews yet.</p>}
              {avg && (
                <>
                  <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                    {rs.length} review{rs.length === 1 ? "" : "s"}, average <b className="text-ink">{avg.overall.toFixed(1)}</b> out of 4
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {REVIEW_RUBRIC.map((l) => (
                      <div key={l.id} className="flex flex-col gap-1">
                        <div className="flex justify-between font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                          <span>{l.label}</span>
                          <span className="text-ink">{avg.byLine[l.id].toFixed(1)}</span>
                        </div>
                        <Bar value={avg.byLine[l.id] / 4} label={`${l.label}, average ${avg.byLine[l.id].toFixed(1)} of 4`} />
                      </div>
                    ))}
                  </div>
                  <ul className="flex flex-col gap-2">
                    {rs.map((r) => (
                      <li key={r.id} className="rounded-lg bg-parchment-deep p-3 font-[family-name:var(--font-ui)] text-sm text-ink">
                        <p className="text-xs font-semibold text-ink-soft">{r.reviewerName || "A student"}</p>
                        {r.strengths && (
                          <p className="mt-1">
                            <b>Worked:</b> {r.strengths}
                          </p>
                        )}
                        {r.improve && (
                          <p className="mt-1">
                            <b>Change:</b> {r.improve}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          );
        })}
      </Panel>

      <Panel title="Reviews I have written" subtitle="Open the case in the library to change one.">
        {written.length === 0 && <Empty>You have not reviewed anyone's case yet. Two reviews complete a step of the learning path.</Empty>}
        <ul className="flex flex-col gap-2">
          {written.map((r) => {
            const avg = averageScores([r]);
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-parchment-deep p-3 font-[family-name:var(--font-ui)] text-sm text-ink">
                <span>
                  {titleOf(r.caseId)}
                  <span className="ml-2 text-xs text-ink-soft">scored {avg?.overall.toFixed(1)} of 4</span>
                </span>
                <Button variant="ghost" onClick={() => void remove(r.id)} aria-label={`Delete my review of ${titleOf(r.caseId)}`}>
                  Delete
                </Button>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
