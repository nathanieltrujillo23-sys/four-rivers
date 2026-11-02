import { useCallback, useEffect, useState } from "react";
import { useCourse } from "../../state/CourseContext";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/Field";
import { Empty, Panel } from "../wealth/parts";
import { labelCls } from "./ibParts";
import type { PracticePost, ToolTrack } from "../../types";

const TOPICS: Record<ToolTrack, string[]> = {
  ib: ["Technical questions", "Walk through a DCF", "Walk through an LBO", "Accretion and dilution", "Pitch a stock or a deal", "Behavioral and why banking"],
  consulting: ["A profitability case", "A market entry case", "Market sizing", "Mental math", "A fit interview", "A case with a data table"],
};

/** A board for finding someone to practice with. Names are display names; contact details show only to the poster and to people who offer. */
export function PracticeBoard({ track }: { track: ToolTrack }) {
  const { repository } = useCourse();
  const [posts, setPosts] = useState<PracticePost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState(TOPICS[track][0]);
  const [whenText, setWhen] = useState("");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState<Record<string, string>>({});
  const [offers, setOffers] = useState<Record<string, { name: string; note: string }[]>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await repository.practiceBoard(track);
      setPosts(list);
      const mine = list.filter((p) => p.mine && p.offers > 0);
      const got = await Promise.all(mine.map(async (p) => [p.id, await repository.practiceResponders(p.id)] as const));
      setOffers(Object.fromEntries(got));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPosts((p) => p ?? []);
    }
  }, [repository, track]);
  useEffect(() => {
    // Loading ends in setState once the request returns, the same shape as the other hooks.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function run(job: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await job();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Practice partners" subtitle="Post what you want to practice, or offer to practice with someone. Practice partners are other people approved for this tool. Share only the contact details you are comfortable sharing: they are shown only to you and to people who offer to practice.">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={labelCls}>
            What to practice
            <select value={topic} onChange={(e) => setTopic(e.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2 font-[family-name:var(--font-ui)] text-sm text-ink focus:border-water focus:outline-none">
              {TOPICS[track].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className={labelCls}>
            When works for you
            <TextInput value={whenText} maxLength={140} placeholder="e.g. Thursday evenings" onChange={(e) => setWhen(e.target.value)} />
          </label>
          <label className={labelCls}>
            How to reach you
            <TextInput value={contact} maxLength={160} placeholder="e.g. campus email or a group chat" onChange={(e) => setContact(e.target.value)} />
          </label>
        </div>
        <div>
          <Button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await repository.postPractice(track, topic, whenText, contact);
                setWhen("");
                setContact("");
              })
            }
          >
            Post my request
          </Button>
        </div>
        {error && (
          <p role="alert" className="font-[family-name:var(--font-ui)] text-sm text-red-700">
            {error}
          </p>
        )}
      </Panel>
      {!posts ? (
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading…</p>
      ) : posts.length === 0 ? (
        <Empty>No open requests. Post the first one.</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((p) => (
            <li key={p.id} className="panel flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
                    {p.topic} <span className="font-normal text-ink-soft">· {p.mine ? "you" : p.author}</span>
                  </p>
                  <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                    {p.whenText || "No time given"} · posted {new Date(p.createdAt).toLocaleDateString()} · {p.offers} offer{p.offers === 1 ? "" : "s"}
                  </p>
                  {p.contact && (
                    <p className="font-[family-name:var(--font-ui)] text-xs text-ink">
                      <b>Contact:</b> {p.contact}
                    </p>
                  )}
                </div>
                {p.mine ? (
                  <Button variant="ghost" disabled={busy} onClick={() => void run(() => repository.closePractice(p.id))} aria-label={`Close my request: ${p.topic}`}>
                    Close
                  </Button>
                ) : p.iOffered ? (
                  <Button variant="secondary" disabled={busy} onClick={() => void run(() => repository.withdrawPracticeResponse(p.id))} aria-label={`Withdraw my offer for ${p.topic}`}>
                    Withdraw my offer
                  </Button>
                ) : null}
              </div>
              {p.mine && (offers[p.id]?.length ?? 0) > 0 && (
                <ul className="rounded-lg bg-parchment-deep p-3 font-[family-name:var(--font-ui)] text-sm text-ink" aria-label="People who offered">
                  {offers[p.id].map((o, i) => (
                    <li key={i}>
                      <b>{o.name}</b>
                      {o.note && `: ${o.note}`}
                    </li>
                  ))}
                </ul>
              )}
              {!p.mine && !p.iOffered && (
                <div className="flex flex-wrap items-end gap-2">
                  <label className={`${labelCls} min-w-[220px] flex-1`}>
                    A note with your offer (optional)
                    <TextInput value={note[p.id] ?? ""} maxLength={160} onChange={(e) => setNote({ ...note, [p.id]: e.target.value })} placeholder="e.g. I can do Thursday at 7" />
                  </label>
                  <Button disabled={busy} onClick={() => void run(() => repository.respondPractice(p.id, note[p.id] ?? ""))} aria-label={`Offer to practice: ${p.topic}`}>
                    Offer to practice
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
