import { useCallback, useEffect, useState } from "react";
import { useCourse } from "../../state/CourseContext";
import { MODEL_KINDS, MODEL_RUBRIC, kindLabel, modelAverages, reviewReady, summarize } from "../../lib/modelReview";
import type { ModelReview, ModelShare, ToolTrack } from "../../types";
import { Button } from "../ui/Button";
import { Select, TextArea, TextInput } from "../ui/Field";
import { labelCls } from "../ib/ibParts";
import { Empty, Panel } from "../wealth/parts";

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** A shared model's headline numbers (recalculated from its inputs) and anything longer to read. */
function Summary({ share }: { share: ModelShare }) {
  const s = summarize(share);
  if (s.problem) return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">The inputs do not give a result yet: {s.problem}</p>;
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {s.facts.map(([k, v]) => (
          <div key={k} className="border-b border-line/60 pb-1.5">
            <dt className="font-[family-name:var(--font-ui)] text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{k}</dt>
            <dd className="font-[family-name:var(--font-ui)] text-sm font-semibold tabular-nums text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {s.lines.length > 0 && (
        <ul className="flex flex-col gap-0.5 rounded-lg bg-parchment-deep p-3 font-[family-name:var(--font-ui)] text-sm text-ink">
          {s.lines.slice(0, 40).map((l, i) => (
            <li key={i} className="whitespace-pre-wrap">
              {l}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReviewForm({ share, mine, onSave, onCancel }: { share: ModelShare; mine: ModelReview | undefined; onSave: (r: { scores: Record<string, number>; strengths: string; improve: string }) => Promise<void>; onCancel: () => void }) {
  const [scores, setScores] = useState<Record<string, number>>(mine?.scores ?? {});
  const [strengths, setStrengths] = useState(mine?.strengths ?? "");
  const [improve, setImprove] = useState(mine?.improve ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="flex flex-col gap-4 rounded-xl border border-line p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await onSave({ scores, strengths, improve });
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
          setBusy(false);
        }
      }}
    >
      {MODEL_RUBRIC.map((line) => (
        <fieldset key={line.id} className="flex flex-col gap-1.5">
          <legend className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">{line.label}</legend>
          <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{line.hint}</p>
          <div className="flex flex-wrap gap-2">
            {line.levels.map((level, i) => (
              <label key={level} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 font-[family-name:var(--font-ui)] text-xs ${scores[line.id] === i + 1 ? "border-water-deep bg-parchment-deep text-ink" : "border-line text-ink-soft"}`}>
                <input type="radio" name={`${share.id}-${line.id}`} checked={scores[line.id] === i + 1} onChange={() => setScores({ ...scores, [line.id]: i + 1 })} />
                <span>
                  {i + 1}. {level}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <label className={labelCls}>
        What works
        <TextArea rows={2} maxLength={1500} value={strengths} onChange={(e) => setStrengths(e.target.value)} />
      </label>
      <label className={labelCls}>
        What I would look at again, and why
        <TextArea rows={2} maxLength={1500} value={improve} onChange={(e) => setImprove(e.target.value)} />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={busy || !reviewReady(scores)}>
          {busy ? "Saving…" : mine ? "Update my review" : "Send my review"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {!reviewReady(scores) && <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">Score all four lines first.</span>}
      </div>
      {error && (
        <p role="alert" className="font-[family-name:var(--font-ui)] text-xs text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}

/**
 * Peer review for one tool set: share a copy of one of your models, read what others shared (with the headline numbers
 * recalculated from their inputs), and review it on four lines. A review is seen only by its writer and the model's author.
 */
export function ModelReviewTab({ track, userId, snapshot }: { track: ToolTrack; userId: string; snapshot: (kind: string) => Record<string, unknown> | null }) {
  const { repository } = useCourse();
  const [shares, setShares] = useState<ModelShare[] | null>(null);
  const [reviews, setReviews] = useState<ModelReview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState(MODEL_KINDS[track][0].id);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [showName, setShowName] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([repository.listModelShares(track), repository.listModelReviews()]);
      setShares(s);
      setReviews(r);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [repository, track]);
  useEffect(() => {
    void load();
  }, [load]);

  if (error && !shares) {
    const missing = /(model_shares|model_reviews|model_review_counts)/.test(error) && /(schema cache|does not exist|Could not find)/i.test(error);
    return <Empty>{missing ? "Peer review needs a one-time database update (supabase/migrations/20261114000200_daily_bread_addins.sql). Once the site admin runs it, reload this page." : `Peer review could not be loaded: ${error}`}</Empty>;
  }
  if (!shares) return <Empty>Loading…</Empty>;

  const data = snapshot(kind);
  const mine = shares.filter((s) => s.authorId === userId);
  const others = shares.filter((s) => s.authorId !== userId);

  async function share() {
    if (!data || !title.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      await repository.shareModel({ track, kind, title: title.trim(), note: note.trim(), data, showName });
      setTitle("");
      setNote("");
      setMsg("Shared. Others in this tool set can now review it.");
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Share a model for review" subtitle="A copy of the model as it is now is shared with people approved for this tool set. Later changes to your own model do not change the copy. Use invented or public figures only.">
        <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
          <label className={labelCls}>
            Which model
            <Select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setMsg(null);
              }}
            >
              {MODEL_KINDS[track].map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </Select>
          </label>
          <label className={labelCls}>
            Title
            <TextInput value={title} maxLength={120} placeholder="e.g. DCF of a regional retailer" onChange={(e) => setTitle(e.target.value)} />
          </label>
        </div>
        <label className={labelCls}>
          What you would like a reviewer to look at (optional)
          <TextArea rows={2} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <label className="flex items-start gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
          <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} className="mt-1" />
          <span>Show my name with it</span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={share} disabled={busy || !data || !title.trim()}>
            {busy ? "Sharing…" : "Share for review"}
          </Button>
          <p role="status" className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
            {msg ?? (!data ? "There is nothing in that model to share yet. Build it first." : "")}
          </p>
        </div>
      </Panel>

      <section className="flex flex-col gap-3" aria-labelledby={`review-others-${track}`}>
        <h3 id={`review-others-${track}`} className="t-h3">
          Shared by others
        </h3>
        {others.length === 0 ? (
          <Empty>Nothing to review yet. When someone shares a model it appears here.</Empty>
        ) : (
          <ul className="flex flex-col gap-4">
            {others.map((s) => {
              const my = reviews.find((r) => r.shareId === s.id && r.reviewerId === userId);
              return (
                <li key={s.id} className="panel flex flex-col gap-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="t-eyebrow">{kindLabel(track, s.kind)}</p>
                      <h4 className="mt-1 t-h4">{s.title}</h4>
                      <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                        {s.authorName || "A member"} · {fmtDay(s.createdAt)} · {s.reviewCount} {s.reviewCount === 1 ? "review" : "reviews"}
                      </p>
                    </div>
                    {reviewing !== s.id && (
                      <Button variant={my ? "secondary" : "primary"} onClick={() => setReviewing(s.id)} aria-label={`${my ? "Edit my review of" : "Review"} ${s.title}`}>
                        {my ? "Edit my review" : "Review this"}
                      </Button>
                    )}
                  </div>
                  {s.note && (
                    <p className="font-[family-name:var(--font-ui)] text-sm text-ink">
                      <b>They asked:</b> {s.note}
                    </p>
                  )}
                  <Summary share={s} />
                  {reviewing === s.id && (
                    <ReviewForm
                      share={s}
                      mine={my}
                      onCancel={() => setReviewing(null)}
                      onSave={async (r) => {
                        await repository.reviewModel(s.id, r);
                        setReviewing(null);
                        await load();
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby={`review-mine-${track}`}>
        <h3 id={`review-mine-${track}`} className="t-h3">
          Your shared models
        </h3>
        {mine.length === 0 ? (
          <Empty>You have not shared a model yet.</Empty>
        ) : (
          <ul className="flex flex-col gap-4">
            {mine.map((s) => {
              const got = reviews.filter((r) => r.shareId === s.id);
              const avg = modelAverages(got);
              return (
                <li key={s.id} className="panel flex flex-col gap-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="t-eyebrow">{kindLabel(track, s.kind)}</p>
                      <h4 className="mt-1 t-h4">{s.title}</h4>
                      <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                        Shared {fmtDay(s.createdAt)} · {got.length} {got.length === 1 ? "review" : "reviews"}
                        {avg ? ` · average ${avg.overall} of 4` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      aria-label={`Stop sharing ${s.title}`}
                      onClick={async () => {
                        await repository.deleteModelShare(s.id);
                        await load();
                      }}
                    >
                      Stop sharing
                    </Button>
                  </div>
                  {got.map((r) => (
                    <div key={r.id} className="rounded-lg border border-line p-3 font-[family-name:var(--font-ui)] text-sm text-ink">
                      <p className="text-xs text-ink-soft">
                        {r.reviewerName || "A member"} · {MODEL_RUBRIC.map((l) => `${l.label} ${r.scores[l.id] ?? "-"}`).join(" · ")}
                      </p>
                      {r.strengths && (
                        <p className="mt-1">
                          <b>What works:</b> {r.strengths}
                        </p>
                      )}
                      {r.improve && (
                        <p className="mt-1">
                          <b>Look again at:</b> {r.improve}
                        </p>
                      )}
                    </div>
                  ))}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">A review is seen only by the person who wrote it and the model's author. Reviews are practice feedback between students, not professional advice.</p>
    </div>
  );
}
