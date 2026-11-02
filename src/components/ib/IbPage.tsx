import { useState } from "react";
import { Link } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useTrackWorkspace } from "../../state/useTrackWorkspace";
import { IB_CATEGORIES, IB_QUESTIONS, IB_READINESS } from "../../lib/ibContent";
import { emptyIb, ibProgress, normalizeIb, type Deal, type IbData, type Rating } from "../../lib/ibWorkspace";
import { uid } from "../../lib/wealthMath";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/Field";
import { LoadError } from "../ui/LoadError";
import { PageSkeleton } from "../ui/Skeleton";
import { Empty, Panel, Tile } from "../wealth/parts";
import { SAVE_TEXT } from "../wealth/wealthText";
import { EducationNote, SubTabs, TabPanel, labelCls } from "./ibParts";
import { Note, Recruiting } from "./Recruiting";
import { ValuationTools } from "./ValuationTools";

type Tab = "val" | "tech" | "deals" | "recruit";
const TABS: { id: Tab; label: string }[] = [
  { id: "val", label: "Valuation models" },
  { id: "tech", label: "Technical questions" },
  { id: "deals", label: "Deal log" },
  { id: "recruit", label: "Recruiting" },
];

/** Investment Banking Tools: a private, educational workspace, for people an admin has approved. */
export function IbPage() {
  const { snapshot } = useCourse();
  const profile = snapshot?.profile;
  const allowed = profile?.ibStatus === "approved" || profile?.role === "admin";
  if (!snapshot || !profile) return <PageSkeleton cards={2} />;
  if (!allowed) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-10 text-center">
        <h1 className="t-h1">Investment Banking Tools</h1>
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">This space is for people an admin has approved. You can ask from the Community page.</p>
        <Link to="/community">
          <Button variant="secondary">Back to Community</Button>
        </Link>
      </div>
    );
  }
  return <Ib userId={profile.userId} />;
}

function Ib({ userId }: { userId: string }) {
  const { repository } = useCourse();
  const ws = useTrackWorkspace<IbData>(repository, userId, "ib", normalizeIb, emptyIb);
  const [tab, setTab] = useState<Tab>("val");
  if (ws.error && !ws.data) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <LoadError message={ws.error} onRetry={() => window.location.reload()} />
      </div>
    );
  }
  if (!ws.data) return <PageSkeleton cards={3} />;
  const data = ws.data;
  const p = ibProgress(data);
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 py-2">
      <header className="flex flex-col gap-3">
        <Link to="/community" className="w-fit font-[family-name:var(--font-ui)] text-sm text-water-deep hover:underline">
          ← Community
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="t-eyebrow">Tools group</p>
            <h1 className="t-h1 mt-1">Investment Banking Tools</h1>
            <p className="mt-2 max-w-2xl font-[family-name:var(--font-ui)] text-sm text-ink-soft">Practice valuation, work through technical questions, keep a deal log, and track recruiting. Only you can see what you put in.</p>
          </div>
          <p role="status" aria-live="polite" className={`rounded-full border px-3 py-1 font-[family-name:var(--font-ui)] text-xs ${ws.save === "error" ? "border-clay text-ink" : "border-line text-ink-soft"}`}>
            {SAVE_TEXT[ws.save]}
          </p>
        </div>
      </header>
      <EducationNote>Educational practice tools built from numbers you enter. They are not investment advice, a valuation of any real security, or a recommendation of any transaction.</EducationNote>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Technical" value={`${p.confident} of ${p.total}`} sub={`confident; ${p.rated} rated`} />
        <Tile label="Deals logged" value={String(p.deals)} sub="in your deal log" />
        <Tile label="Readiness" value={`${p.ready} of ${p.readyTotal}`} sub="checklist items" />
        <Tile label="Firms tracked" value={String(p.recruits)} sub="in recruiting" />
      </div>
      <SubTabs label="Investment banking sections" tabs={TABS} value={tab} onChange={setTab} prefix="ib" />
      <TabPanel prefix="ib" id={tab}>
        {tab === "val" && <ValuationTools data={data} update={ws.update} />}
        {tab === "tech" && <TechTab data={data} update={ws.update} />}
        {tab === "deals" && <DealsTab data={data} update={ws.update} />}
        {tab === "recruit" && <Recruiting recruits={data.recruits} ready={data.ready} readiness={IB_READINESS} groupLabel="Group (M&A, coverage...)" onRecruits={(recruits) => ws.update((d) => ({ ...d, recruits }))} onReady={(ready) => ws.update((d) => ({ ...d, ready }))} />}
      </TabPanel>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const RATINGS: [Rating, string][] = [
  ["needs", "Needs work"],
  ["getting", "Getting there"],
  ["confident", "Confident"],
];

function TechTab({ data, update }: { data: IbData; update: (fn: (d: IbData) => IbData) => void }) {
  const [category, setCategory] = useState<string>("all");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const list = IB_QUESTIONS.filter((q) => category === "all" || q.category === category);
  return (
    <div className="flex flex-col gap-4">
      <Panel title="Technical questions" subtitle="Answer out loud first, then reveal the model answer, then rate yourself. The answers are standard textbook ones for practice.">
        <div role="group" aria-label="Category" className="flex flex-wrap gap-2">
          {["all", ...IB_CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1 font-[family-name:var(--font-ui)] text-xs transition-colors ${category === c ? "border-water-deep bg-water-deep text-white" : "border-line text-ink-soft hover:bg-parchment-deep hover:text-ink"}`}
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
      </Panel>
      <ul className="flex flex-col gap-3">
        {list.map((q) => (
          <li key={q.id} className="panel flex flex-col gap-3 p-4">
            <p className="font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-ink-soft">{q.category}</p>
            <p className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">{q.q}</p>
            {open[q.id] ? (
              <p className="rounded-lg bg-parchment-deep p-3 font-[family-name:var(--font-ui)] text-sm text-ink">{q.a}</p>
            ) : (
              <div>
                <Button variant="secondary" onClick={() => setOpen({ ...open, [q.id]: true })} aria-label={`Show the answer: ${q.q}`}>
                  Show the answer
                </Button>
              </div>
            )}
            <div role="group" aria-label={`Rate yourself: ${q.q}`} className="flex flex-wrap gap-2">
              {RATINGS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={data.tech[q.id] === id}
                  onClick={() => update((d) => ({ ...d, tech: { ...d.tech, [q.id]: id } }))}
                  className={`rounded-full border px-3 py-1 font-[family-name:var(--font-ui)] text-xs transition-colors ${data.tech[q.id] === id ? "border-water-deep bg-water-deep text-white" : "border-line text-ink-soft hover:bg-parchment-deep hover:text-ink"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const DEAL_KINDS = ["Merger or acquisition", "IPO", "Follow-on offering", "Debt financing", "Leveraged buyout", "Restructuring", "Other"];

function DealsTab({ data, update }: { data: IbData; update: (fn: (d: IbData) => IbData) => void }) {
  const [draft, setDraft] = useState<Deal>({ id: "", date: "", company: "", kind: DEAL_KINDS[0], size: "", why: "", takeaway: "", source: "" });
  const add = () => {
    if (!draft.company.trim()) return;
    update((d) => ({ ...d, deals: [{ ...draft, id: uid() }, ...d.deals].slice(0, 100) }));
    setDraft({ id: "", date: "", company: "", kind: DEAL_KINDS[0], size: "", why: "", takeaway: "", source: "" });
  };
  return (
    <div className="flex flex-col gap-6">
      <Panel title="Log a deal you have followed" subtitle="Interviewers ask what you have been reading. For each deal: what happened, why, and what you took from it. Name where you read it.">
        <div className="grid gap-3 sm:grid-cols-4">
          <label className={labelCls}>
            Company or deal
            <TextInput value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} maxLength={120} />
          </label>
          <label className={labelCls}>
            Type
            <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} className="rounded-lg border border-line bg-surface px-3 py-2 font-[family-name:var(--font-ui)] text-sm text-ink focus:border-water focus:outline-none">
              {DEAL_KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label className={labelCls}>
            Size ($ millions)
            <TextInput inputMode="decimal" value={draft.size} onChange={(e) => setDraft({ ...draft, size: e.target.value.replace(/[^0-9.]/g, "") })} />
          </label>
          <label className={labelCls}>
            Date announced
            <TextInput type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </label>
        </div>
        <Note label="Why it happened (the strategic logic)" rows={2} value={draft.why} onChange={(v) => setDraft({ ...draft, why: v })} />
        <Note label="What I took from it, and what I would ask" rows={2} value={draft.takeaway} onChange={(v) => setDraft({ ...draft, takeaway: v })} />
        <label className={labelCls}>
          Where I read it
          <TextInput value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} maxLength={160} />
        </label>
        <div>
          <Button onClick={add} disabled={!draft.company.trim()}>
            Add to the log
          </Button>
        </div>
      </Panel>
      {data.deals.length === 0 ? (
        <Empty>No deals yet. Log three to start.</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.deals.map((d) => (
            <li key={d.id} className="panel flex flex-col gap-1 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
                  {d.company} <span className="font-normal text-ink-soft">· {d.kind}{d.size ? ` · $${Number(d.size).toLocaleString("en-US")}M` : ""}{d.date ? ` · ${d.date}` : ""}</span>
                </p>
                <Button variant="ghost" onClick={() => update((x) => ({ ...x, deals: x.deals.filter((y) => y.id !== d.id) }))} aria-label={`Remove ${d.company}`}>
                  Remove
                </Button>
              </div>
              {d.why && <p className="font-[family-name:var(--font-ui)] text-sm text-ink"><b>Why:</b> {d.why}</p>}
              {d.takeaway && <p className="font-[family-name:var(--font-ui)] text-sm text-ink"><b>Takeaway:</b> {d.takeaway}</p>}
              {d.source && <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">Source: {d.source}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
