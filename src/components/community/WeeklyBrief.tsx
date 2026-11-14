import { useCallback, useEffect, useState } from "react";
import { useCourse } from "../../state/CourseContext";
import type { Brief } from "../../types";
import { Button } from "../ui/Button";
import { Select, TextArea, TextInput } from "../ui/Field";
import { labelCls } from "../ib/ibParts";

const TRANSLATIONS: Brief["verseTranslation"][] = ["KJV", "NIV", "NLT", "ESV"];
const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const today = () => new Date().toISOString().slice(0, 10);
type Draft = Omit<Brief, "authorName" | "updatedAt" | "id"> & { id: string | null };
const blank = (): Draft => ({ id: null, weekOf: today(), title: "", market: "", reflection: "", verseReference: "", verseTranslation: "ESV", verseText: "" });

function BriefBody({ b }: { b: Brief }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <div className="flex flex-col gap-3">
        {b.market && (
          <div>
            <h4 className="font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">Markets this week</h4>
            <p className="mt-1 whitespace-pre-wrap font-[family-name:var(--font-ui)] text-sm leading-relaxed text-ink">{b.market}</p>
          </div>
        )}
        {b.reflection && (
          <div>
            <h4 className="font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">For the week</h4>
            <p className="mt-1 whitespace-pre-wrap font-[family-name:var(--font-ui)] text-sm leading-relaxed text-ink">{b.reflection}</p>
          </div>
        )}
      </div>
      {b.verseText && (
        <blockquote className="self-start rounded-xl bg-parchment-deep/60 p-5">
          <p className="font-[family-name:var(--font-display)] text-lg leading-snug text-ink">“{b.verseText}”</p>
          <footer className="mt-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            — {b.verseReference} ({b.verseTranslation})
          </footer>
        </blockquote>
      )}
    </div>
  );
}

/**
 * The weekly brief: a short market note, a reflection and a verse, written by an admin and read by every member.
 * The newest is open; earlier ones fold away underneath. Nothing shows for members until the first brief exists.
 */
export function WeeklyBrief({ isAdmin }: { isAdmin: boolean }) {
  const { repository } = useCourse();
  const [briefs, setBriefs] = useState<Brief[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBriefs(await repository.listBriefs());
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      setMissing(/daily_bread_briefs/.test(m) && /(schema cache|does not exist|Could not find)/i.test(m));
      setBriefs([]);
    }
  }, [repository]);
  useEffect(() => {
    void load();
  }, [load]);

  if (!briefs) return null;
  const [latest, ...older] = briefs;
  if (!latest && !isAdmin) return null;
  const up = (patch: Partial<Draft>) => draft && setDraft({ ...draft, ...patch });

  async function save() {
    if (!draft || !draft.title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await repository.saveBrief(draft);
      setDraft(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="dbp-brief" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface/80 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="t-eyebrow">Weekly brief{latest ? ` · week of ${day(latest.weekOf)}` : ""}</p>
          <h2 id="dbp-brief" className="mt-1 t-h2">
            {latest ? latest.title : "No brief yet"}
          </h2>
        </div>
        {isAdmin && !draft && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setDraft(blank())}>
              Write a new brief
            </Button>
            {latest && (
              <Button variant="ghost" onClick={() => setDraft({ id: latest.id, weekOf: latest.weekOf, title: latest.title, market: latest.market, reflection: latest.reflection, verseReference: latest.verseReference, verseTranslation: latest.verseTranslation, verseText: latest.verseText })}>
                Edit this one
              </Button>
            )}
          </div>
        )}
      </div>
      {missing && isAdmin && <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">The brief needs a one-time database update first: run supabase/migrations/20261114000200_daily_bread_addins.sql, then reload.</p>}
      {draft ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <label className={labelCls}>
              Week of
              <TextInput type="date" value={draft.weekOf} onChange={(e) => up({ weekOf: e.target.value })} />
            </label>
            <label className={labelCls}>
              Title
              <TextInput value={draft.title} maxLength={120} onChange={(e) => up({ title: e.target.value })} />
            </label>
          </div>
          <label className={labelCls}>
            Markets this week (what happened, with your source; education, not a recommendation)
            <TextArea rows={4} maxLength={2000} value={draft.market} onChange={(e) => up({ market: e.target.value })} />
          </label>
          <label className={labelCls}>
            For the week (a reflection or a challenge)
            <TextArea rows={3} maxLength={2000} value={draft.reflection} onChange={(e) => up({ reflection: e.target.value })} />
          </label>
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <label className={labelCls}>
              Verse reference
              <TextInput value={draft.verseReference} maxLength={60} placeholder="e.g. Luke 16:10" onChange={(e) => up({ verseReference: e.target.value })} />
            </label>
            <label className={labelCls}>
              Translation
              <Select value={draft.verseTranslation} onChange={(e) => up({ verseTranslation: e.target.value as Brief["verseTranslation"] })}>
                {TRANSLATIONS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </label>
          </div>
          <label className={labelCls}>
            Verse text, copied exactly from that translation
            <TextArea rows={2} maxLength={1200} value={draft.verseText} onChange={(e) => up({ verseText: e.target.value })} />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={busy || !draft.title.trim()}>
              {busy ? "Saving…" : draft.id ? "Save changes" : "Publish to members"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            {draft.id && (
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  await repository.deleteBrief(draft.id!);
                  setDraft(null);
                  await load();
                }}
              >
                Delete this brief
              </Button>
            )}
          </div>
          {error && (
            <p role="alert" className="font-[family-name:var(--font-ui)] text-xs text-red-700">
              {error}
            </p>
          )}
        </form>
      ) : latest ? (
        <>
          <BriefBody b={latest} />
          <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
            {latest.authorName ? `Written by ${latest.authorName}. ` : ""}A student's note for learning. It is not investment advice or a recommendation to buy or sell anything.
          </p>
          {older.length > 0 && (
            <details className="rounded-xl border border-line px-4 py-3">
              <summary className="cursor-pointer font-[family-name:var(--font-ui)] text-sm font-medium text-ink">Earlier briefs ({older.length})</summary>
              <ul className="mt-3 flex flex-col gap-5">
                {older.map((b) => (
                  <li key={b.id} className="flex flex-col gap-2 border-t border-line pt-4">
                    <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">Week of {day(b.weekOf)}</p>
                    <h3 className="t-h4">{b.title}</h3>
                    <BriefBody b={b} />
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      ) : (
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Members see nothing here until the first brief is published.</p>
      )}
    </section>
  );
}
