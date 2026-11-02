import { useCallback, useEffect, useState } from "react";
import { useCourse } from "../../state/CourseContext";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { TextInput } from "../ui/Field";
import { Empty, Panel, Tile } from "../wealth/parts";
import type { RecruitingWindow, ToolTrack, ToolUsage } from "../../types";

const today = () => new Date().toISOString().slice(0, 10);
const labelCls = "flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft";
const blank = (track: ToolTrack): Omit<RecruitingWindow, "id"> & { id?: string } => ({ track, firm: "", role: "", opens: "", closes: "", checkedOn: today(), url: "", notes: "" });

/** Application windows for banking and consulting recruiting, for students to see in their trackers. Take each from the firm's own careers page. */
export function RecruitingAdmin() {
  const { repository } = useCourse();
  const [track, setTrack] = useState<ToolTrack>("ib");
  const [list, setList] = useState<RecruitingWindow[] | null>(null);
  const [draft, setDraft] = useState(blank("ib"));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setList(await repository.listRecruitingWindows(track));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setList([]);
    }
  }, [repository, track]);
  useEffect(() => {
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
      <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
        Enter application windows from each firm's own careers page, with the day you checked it. Students see them in their Recruiting tab, with how old each check is. Dates change often, so recheck them.
      </p>
      <div role="group" aria-label="Which tool" className="flex gap-2">
        {(["ib", "consulting"] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={track === t}
            onClick={() => {
              setTrack(t);
              setDraft(blank(t));
            }}
            className={`rounded-full border px-4 py-1.5 font-[family-name:var(--font-ui)] text-sm transition-colors ${track === t ? "border-water-deep bg-water-deep text-white" : "border-line text-ink-soft hover:bg-parchment-deep hover:text-ink"}`}
          >
            {t === "ib" ? "Investment banking" : "Consulting"}
          </button>
        ))}
      </div>
      <Panel title={draft.id ? "Edit the window" : "Add a window"}>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={labelCls}>
            Firm
            <TextInput value={draft.firm} maxLength={120} onChange={(e) => setDraft({ ...draft, firm: e.target.value })} />
          </label>
          <label className={labelCls}>
            Role
            <TextInput value={draft.role} maxLength={120} placeholder="e.g. Summer analyst" onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
          </label>
          <label className={labelCls}>
            Careers page address
            <TextInput value={draft.url} maxLength={300} placeholder="https://" onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
          </label>
          <label className={labelCls}>
            Opens
            <TextInput type="date" value={draft.opens ?? ""} onChange={(e) => setDraft({ ...draft, opens: e.target.value })} />
          </label>
          <label className={labelCls}>
            Closes
            <TextInput type="date" value={draft.closes ?? ""} onChange={(e) => setDraft({ ...draft, closes: e.target.value })} />
          </label>
          <label className={labelCls}>
            Checked on
            <TextInput type="date" value={draft.checkedOn} onChange={(e) => setDraft({ ...draft, checkedOn: e.target.value })} />
          </label>
        </div>
        <label className={labelCls}>
          Notes for students
          <TextInput value={draft.notes} maxLength={300} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
        </label>
        <div className="flex gap-2">
          <Button
            disabled={busy || !draft.firm.trim()}
            onClick={() =>
              void run(async () => {
                await repository.saveRecruitingWindow(draft);
                setDraft(blank(track));
              })
            }
          >
            {draft.id ? "Save changes" : "Add the window"}
          </Button>
          {draft.id && (
            <Button variant="ghost" onClick={() => setDraft(blank(track))}>
              Cancel
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="font-[family-name:var(--font-ui)] text-sm text-red-700">
            {error}
          </p>
        )}
      </Panel>
      {!list ? (
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading…</p>
      ) : list.length === 0 ? (
        <Empty>No windows yet for this tool.</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((w) => (
            <li key={w.id}>
              <Card>
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">
                      {w.firm}
                      {w.role && <span className="font-normal text-ink-soft"> · {w.role}</span>}
                    </p>
                    <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                      Opens {w.opens ?? "n/a"} · closes {w.closes ?? "n/a"} · checked {w.checkedOn}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setDraft({ ...w })} aria-label={`Edit ${w.firm}`}>
                      Edit
                    </Button>
                    <Button variant="ghost" disabled={busy} onClick={() => void run(() => repository.deleteRecruitingWindow(w.id))} aria-label={`Delete ${w.firm}`}>
                      Delete
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** How the tool spaces are being used: counts only, never who. */
export function UsageAdmin() {
  const { repository } = useCourse();
  const [u, setU] = useState<ToolUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let off = false;
    repository
      .toolUsage()
      .then((x) => !off && setU(x))
      .catch((e: unknown) => !off && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      off = true;
    };
  }, [repository]);
  if (error) return <p role="alert" className="font-[family-name:var(--font-ui)] text-sm text-red-700">The usage summary is not available yet: {error}</p>;
  if (!u) return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading…</p>;
  const rows: { name: string; key: string; detail: string[] }[] = [
    { name: "Wealth Tools", key: "wealth", detail: [`${u.wealth.plans ?? 0} client plans`, `${u.wealth.versions ?? 0} saved versions`, `${u.wealth.cases ?? 0} shared cases`, `${u.wealth.reviews ?? 0} peer reviews`] },
    { name: "Investment Banking Tools", key: "ib", detail: [`${u.ib.deals ?? 0} deals logged`, `${u.ib.questionsRated ?? 0} questions rated`, `${u.ib.firms ?? 0} firms tracked`] },
    { name: "Consulting Tools", key: "consulting", detail: [`${u.consulting.cases ?? 0} practice cases logged`, `${u.consulting.drills ?? 0} math drills`, `${u.consulting.firms ?? 0} firms tracked`] },
  ];
  const max = Math.max(1, ...rows.map((r) => u.approved[r.key] ?? 0));
  return (
    <div className="flex flex-col gap-6">
      <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Counts only: this page never shows who did what. "Active" means a workspace changed in the last 30 days.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Group leaders" value={String(u.approved.leader ?? 0)} sub={`${u.waiting.leader ?? 0} waiting`} />
        <Tile label="Practice requests open" value={String(u.practice.open ?? 0)} sub={`${u.practice.offers ?? 0} offers made`} />
        <Tile label="Recruiting windows" value={String(u.windows ?? 0)} sub="entered by admins" />
        <Tile label="Requests waiting" value={String(Object.values(u.waiting).reduce((a, b) => a + b, 0))} sub="across all four" />
      </div>
      {rows.map((r) => {
        const approved = u.approved[r.key] ?? 0;
        const active = u.active30[r.key] ?? 0;
        return (
          <Panel key={r.key} title={r.name} subtitle={r.detail.join(" · ")}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Tile label="Approved" value={String(approved)} sub={`${u.waiting[r.key] ?? 0} waiting`} />
              <Tile label="Active, last 30 days" value={String(active)} sub={approved ? `${Math.round((active / approved) * 100)}% of those approved` : "no one approved yet"} tone={approved && active / approved < 0.3 ? "warn" : undefined} />
            </div>
            <div
              role="img"
              aria-label={`${r.name}: ${approved} approved and ${active} active`}
              className="flex h-3 overflow-hidden rounded-full bg-parchment-deep"
            >
              <div className="bg-water-deep" style={{ width: `${(active / max) * 100}%` }} />
              <div className="bg-gold" style={{ width: `${(Math.max(0, approved - active) / max) * 100}%` }} />
            </div>
            <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">Dark: active in the last 30 days. Gold: approved but quiet.</p>
          </Panel>
        );
      })}
    </div>
  );
}

