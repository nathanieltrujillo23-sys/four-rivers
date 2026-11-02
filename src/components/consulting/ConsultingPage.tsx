import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useTrackWorkspace } from "../../state/useTrackWorkspace";
import { CONSULTING_READINESS, FRAMEWORKS, STORY_PROMPTS } from "../../lib/consultingContent";
import { DRILL_KINDS, drillSet, isClose, plain, profit, profitGrid, sizing, SIZING_TEMPLATES, type Factor, type SizingEstimate } from "../../lib/consultingMath";
import { CASE_RUBRIC, caseAverages, consultingProgress, emptyConsulting, normalizeConsulting, type CaseLog, type ConsultingData } from "../../lib/consultingWorkspace";
import { uid } from "../../lib/wealthMath";
import { Button } from "../ui/Button";
import { Select, TextInput } from "../ui/Field";
import { LoadError } from "../ui/LoadError";
import { PageSkeleton } from "../ui/Skeleton";
import { EducationNote, NumTable, SubTabs, TabPanel, cellCls, labelCls } from "../ib/ibParts";
import { PracticeBoard } from "../ib/PracticeBoard";
import { Note, Recruiting } from "../ib/Recruiting";
import { CaseTimer, MockCaseTab } from "./MockCase";
import { Empty, HowCalculated, MoneyField, Panel, Tile } from "../wealth/parts";
import { SAVE_TEXT } from "../wealth/wealthText";

type Update = (fn: (d: ConsultingData) => ConsultingData) => void;
type Tab = "frameworks" | "mock" | "sizing" | "profit" | "drills" | "stories" | "log" | "practice" | "recruit";
const TABS: { id: Tab; label: string }[] = [
  { id: "frameworks", label: "Case frameworks" },
  { id: "mock", label: "Mock case" },
  { id: "sizing", label: "Market sizing" },
  { id: "profit", label: "Profit and break-even" },
  { id: "drills", label: "Math drills" },
  { id: "stories", label: "Fit stories" },
  { id: "log", label: "Practice log" },
  { id: "practice", label: "Practice partners" },
  { id: "recruit", label: "Recruiting" },
];

/** Consulting Tools: a private, educational workspace, for people an admin has approved. */
export function ConsultingPage() {
  const { snapshot } = useCourse();
  const profile = snapshot?.profile;
  const allowed = profile?.consultingStatus === "approved" || profile?.role === "admin";
  if (!snapshot || !profile) return <PageSkeleton cards={2} />;
  if (!allowed) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-10 text-center">
        <h1 className="t-h1">Consulting Tools</h1>
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">This space is for people an admin has approved. You can ask from the Community page.</p>
        <Link to="/community">
          <Button variant="secondary">Back to Community</Button>
        </Link>
      </div>
    );
  }
  return <Consulting userId={profile.userId} />;
}

function Consulting({ userId }: { userId: string }) {
  const { repository } = useCourse();
  const ws = useTrackWorkspace<ConsultingData>(repository, userId, "consulting", normalizeConsulting, emptyConsulting);
  const [tab, setTab] = useState<Tab>("frameworks");
  if (ws.error && !ws.data) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <LoadError message={ws.error} onRetry={() => window.location.reload()} />
      </div>
    );
  }
  if (!ws.data) return <PageSkeleton cards={3} />;
  const data = ws.data;
  const p = consultingProgress(data);
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 py-2">
      <header className="flex flex-col gap-3">
        <Link to="/community" className="w-fit font-[family-name:var(--font-ui)] text-sm text-water-deep hover:underline">
          ← Community
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="t-eyebrow">Tools group</p>
            <h1 className="t-h1 mt-1">Consulting Tools</h1>
            <p className="mt-2 max-w-2xl font-[family-name:var(--font-ui)] text-sm text-ink-soft">Practice case frameworks, market sizing, mental math and your stories, and log every practice case. Only you can see what you put in.</p>
          </div>
          <p role="status" aria-live="polite" className={`rounded-full border px-3 py-1 font-[family-name:var(--font-ui)] text-xs ${ws.save === "error" ? "border-clay text-ink" : "border-line text-ink-soft"}`}>
            {SAVE_TEXT[ws.save]}
          </p>
        </div>
      </header>
      <EducationNote>Educational practice tools. The frameworks are general structures widely used to organize a problem, not any firm's method, and the numbers are yours.</EducationNote>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Frameworks" value={`${p.frameworks} of ${p.frameworksTotal}`} sub="marked confident" />
        <Tile label="Practice cases" value={String(p.cases)} sub="in your log" />
        <Tile label="Fit stories" value={`${p.stories} of ${p.storiesTotal}`} sub="written" />
        <Tile label="Readiness" value={`${p.ready} of ${p.readyTotal}`} sub="checklist items" />
      </div>
      <SubTabs label="Consulting sections" tabs={TABS} value={tab} onChange={setTab} prefix="cs" />
      <TabPanel prefix="cs" id={tab}>
        {tab === "frameworks" && <FrameworksTab data={data} update={ws.update} />}
        {tab === "mock" && <MockCaseTab update={ws.update} />}
        {tab === "sizing" && <SizingTab data={data} update={ws.update} />}
        {tab === "profit" && <ProfitTab data={data} update={ws.update} />}
        {tab === "drills" && <DrillsTab data={data} update={ws.update} />}
        {tab === "stories" && <StoriesTab data={data} update={ws.update} />}
        {tab === "log" && <LogTab data={data} update={ws.update} />}
        {tab === "practice" && <PracticeBoard track="consulting" />}
        {tab === "recruit" && <Recruiting recruits={data.recruits} ready={data.ready} readiness={CONSULTING_READINESS} groupLabel="Office or practice" track="consulting" onRecruits={(recruits) => ws.update((d) => ({ ...d, recruits }))} onReady={(ready) => ws.update((d) => ({ ...d, ready }))} />}
      </TabPanel>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function FrameworksTab({ data, update }: { data: ConsultingData; update: Update }) {
  const [id, setId] = useState(FRAMEWORKS[0].id);
  const f = FRAMEWORKS.find((x) => x.id === id)!;
  const mine = data.frameworks[id] ?? { mine: "", confident: false };
  const set = (patch: Partial<typeof mine>) => update((d) => ({ ...d, frameworks: { ...d.frameworks, [id]: { ...mine, ...patch } } }));
  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <div role="group" aria-label="Case types" className="flex gap-2 overflow-x-auto lg:flex-col">
        {FRAMEWORKS.map((x) => (
          <button
            key={x.id}
            type="button"
            aria-pressed={id === x.id}
            onClick={() => setId(x.id)}
            className={`whitespace-nowrap rounded-lg border px-3 py-2 text-left font-[family-name:var(--font-ui)] text-sm transition-colors ${id === x.id ? "border-water-deep bg-water-deep text-white" : "border-line text-ink hover:bg-parchment-deep"}`}
          >
            {x.name}
            {data.frameworks[x.id]?.confident && <span className="sr-only"> (marked confident)</span>}
            {data.frameworks[x.id]?.confident && <span aria-hidden="true"> ✓</span>}
          </button>
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <Panel title={f.name} subtitle={f.when}>
          <div className="grid gap-4 sm:grid-cols-2">
            {f.structure.map((b) => (
              <div key={b.head} className="rounded-lg bg-parchment-deep p-3">
                <p className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">{b.head}</p>
                <ul className="mt-1 list-disc pl-5 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                  {b.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-ink-soft">Questions to ask first</p>
              <ul className="mt-1 list-disc pl-5 font-[family-name:var(--font-ui)] text-sm text-ink">
                {f.clarify.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-ink-soft">Common mistakes</p>
              <ul className="mt-1 list-disc pl-5 font-[family-name:var(--font-ui)] text-sm text-ink">
                {f.pitfalls.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">A framework is a starting point. Tailor the buckets to the case, state a hypothesis, and drop what does not apply.</p>
        </Panel>
        <Panel title="Practice it" subtitle="Try the case below out loud with a timer, then write your own structure and compare.">
          <p className="rounded-lg border border-line px-4 py-3 font-[family-name:var(--font-ui)] text-sm text-ink">{f.drill}</p>
          <CaseTimer />
          <Note label="My structure for this case" rows={5} value={mine.mine} onChange={(v) => set({ mine: v })} placeholder="Clarifying questions, my buckets, and my first hypothesis" />
          <label className="flex cursor-pointer items-center gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
            <input type="checkbox" checked={mine.confident} onChange={(e) => set({ confident: e.target.checked })} className="h-4 w-4 accent-[var(--color-water-deep)]" />
            I can set this up from memory
          </label>
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SizingTab({ data, update }: { data: ConsultingData; update: Update }) {
  const setEst = (id: string, patch: Partial<SizingEstimate>) => update((d) => ({ ...d, sizing: d.sizing.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const addBlank = () => update((d) => ({ ...d, sizing: [...d.sizing, { id: uid(), title: "My estimate", unit: "per year", checkLabel: "", check: "", factors: [{ id: uid(), label: "", value: "", op: "x" as const }] }].slice(0, 30) }));
  const addTemplate = (i: number) => {
    const t = SIZING_TEMPLATES[i];
    update((d) => ({ ...d, sizing: [...d.sizing, { id: uid(), title: t.title, unit: t.unit, checkLabel: t.checkLabel, check: "", factors: t.factors.map(([label, value, op]): Factor => ({ id: uid(), label, value, op })) }].slice(0, 30) }));
  };
  return (
    <div className="flex flex-col gap-6">
      <Panel title="Market sizing" subtitle="Break the question into factors you can estimate, multiply them, then check the answer against something you know. Start from an example or a blank estimate.">
        <div className="flex flex-wrap gap-2">
          {SIZING_TEMPLATES.map((t, i) => (
            <Button key={t.title} variant="secondary" onClick={() => addTemplate(i)}>
              Start from: {t.title}
            </Button>
          ))}
          <Button onClick={addBlank}>Blank estimate</Button>
        </div>
      </Panel>
      {data.sizing.length === 0 && <Empty>No estimates yet. Start from an example, change the numbers to what you believe, and add a figure you know to check against.</Empty>}
      {data.sizing.map((e) => (
        <SizingCard key={e.id} e={e} onChange={(patch) => setEst(e.id, patch)} onRemove={() => update((d) => ({ ...d, sizing: d.sizing.filter((x) => x.id !== e.id) }))} />
      ))}
    </div>
  );
}

function SizingCard({ e, onChange, onRemove }: { e: SizingEstimate; onChange: (p: Partial<SizingEstimate>) => void; onRemove: () => void }) {
  const r = useMemo(() => sizing(e), [e]);
  const setFactor = (id: string, patch: Partial<Factor>) => onChange({ factors: e.factors.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  return (
    <Panel
      title={e.title}
      actions={
        <Button variant="ghost" onClick={onRemove} aria-label={`Remove the estimate ${e.title}`}>
          Remove
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelCls}>
          Title
          <TextInput value={e.title} maxLength={120} onChange={(ev) => onChange({ title: ev.target.value })} />
        </label>
        <label className={labelCls}>
          The answer is in
          <TextInput value={e.unit} maxLength={40} onChange={(ev) => onChange({ unit: ev.target.value })} />
        </label>
      </div>
      <ul className="flex flex-col gap-2">
        {e.factors.map((f, i) => (
          <li key={f.id} className="grid items-center gap-2 sm:grid-cols-[80px_1fr_150px_auto]">
            <Select aria-label={`Factor ${i + 1}: multiply or divide`} value={f.op} onChange={(ev) => setFactor(f.id, { op: ev.target.value as Factor["op"] })} className="!py-1.5 !text-sm">
              <option value="x">× by</option>
              <option value="÷">÷ by</option>
            </Select>
            <TextInput aria-label={`Factor ${i + 1} description`} value={f.label} maxLength={80} placeholder="What it is" onChange={(ev) => setFactor(f.id, { label: ev.target.value })} className="!py-1.5 !text-sm" />
            <input aria-label={`Factor ${i + 1} value`} inputMode="decimal" value={f.value} onChange={(ev) => setFactor(f.id, { value: ev.target.value.replace(/[^0-9.-]/g, "") })} className={cellCls} />
            <Button variant="ghost" disabled={e.factors.length <= 1} onClick={() => onChange({ factors: e.factors.filter((x) => x.id !== f.id) })} aria-label={`Remove factor ${i + 1}`}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <div>
        <Button variant="secondary" disabled={e.factors.length >= 10} onClick={() => onChange({ factors: [...e.factors, { id: uid(), label: "", value: "", op: "x" as const }] })}>
          Add a factor
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelCls}>
          A figure I know, to check against
          <TextInput value={e.checkLabel} maxLength={120} placeholder="e.g. Reported total US coffee sales" onChange={(ev) => onChange({ checkLabel: ev.target.value })} />
        </label>
        <MoneyField label="Its value" value={e.check} onChange={(v) => onChange({ check: v.replace(/[^0-9.]/g, "") })} />
      </div>
      <p role="status" className="rounded-lg bg-parchment-deep px-4 py-3 font-[family-name:var(--font-ui)] text-sm text-ink">
        <b>{r.total > 0 ? `${plain(r.total)} ${e.unit}` : "No estimate yet"}.</b> {r.verdict}
      </p>
      <HowCalculated steps={r.steps} />
    </Panel>
  );
}

/* ------------------------------------------------------------------ */

const money = (x: number) => (x < 0 ? `($${Math.abs(Math.round(x)).toLocaleString("en-US")})` : `$${Math.round(x).toLocaleString("en-US")}`);

function ProfitTab({ data, update }: { data: ConsultingData; update: Update }) {
  const d = data.profit;
  const r = useMemo(() => profit(d), [d]);
  const grid = useMemo(() => profitGrid(d), [d]);
  const up = (patch: Partial<typeof d>) => update((x) => ({ ...x, profit: { ...d, ...patch } }));
  const clean = (v: string) => v.replace(/[^0-9.]/g, "");
  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <Panel title="Inputs" subtitle="A simple product business.">
        <MoneyField label="Price per unit" prefix="$" value={d.price} onChange={(v) => up({ price: clean(v) })} />
        <MoneyField label="Variable cost per unit" prefix="$" value={d.variableCost} onChange={(v) => up({ variableCost: clean(v) })} />
        <MoneyField label="Fixed costs per year" prefix="$" value={d.fixedCost} onChange={(v) => up({ fixedCost: clean(v) })} />
        <MoneyField label="Units sold per year" value={d.volume} onChange={(v) => up({ volume: clean(v) })} />
      </Panel>
      <div className="flex min-w-0 flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Tile label="Profit" value={money(r.profit)} sub={`${(r.margin * 100).toFixed(1)}% margin`} tone={r.profit >= 0 ? "good" : "bad"} />
          <Tile label="Contribution per unit" value={money(r.contributionPerUnit)} sub={`${(r.contributionMargin * 100).toFixed(0)}% of price`} />
          <Tile label="Break-even volume" value={r.breakEvenUnits == null ? "none" : Math.ceil(r.breakEvenUnits).toLocaleString("en-US")} sub="units a year" />
          <Tile label="Margin of safety" value={r.marginOfSafety == null ? "n/a" : `${(r.marginOfSafety * 100).toFixed(0)}%`} sub="sales could fall this far" tone={r.marginOfSafety == null ? undefined : r.marginOfSafety > 0.2 ? "good" : "warn"} />
        </div>
        <Panel title="Profit: price against volume">
          <NumTable caption="Profit at different prices and volumes" corner="Price \ units" head={grid.volumes.map((v) => v.toLocaleString("en-US"))} rows={grid.prices.map((p, i) => ({ label: `$${p}`, cells: grid.values[i].map(money), bold: i === 2 }))} />
        </Panel>
        <HowCalculated steps={r.steps} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function DrillsTab({ data, update }: { data: ConsultingData; update: Update }) {
  const [run, setRun] = useState<{ seed: number; answers: string[]; checked: boolean; seconds: number } | null>(null);
  const started = useRef(0);
  const qs = useMemo(() => (run ? drillSet(run.seed) : []), [run?.seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const score = run?.checked ? qs.filter((q, i) => isClose(parseFloat(run.answers[i]), q.answer)).length : 0;
  const history = [...data.drills].reverse().slice(0, 8);
  const avg = data.drills.length ? data.drills.reduce((a, b) => a + b.score / Math.max(1, b.total), 0) / data.drills.length : null;
  return (
    <div className="flex flex-col gap-6">
      <Panel title="Mental math drill" subtitle={`Ten questions across ${DRILL_KINDS.join(", ").toLowerCase()}. Answer without a calculator; anything within 3% counts. Time yourself: the clock starts when you press Start.`}>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => {
              started.current = Date.now();
              setRun({ seed: Math.floor(Math.random() * 1_000_000), answers: Array(10).fill(""), checked: false, seconds: 0 });
            }}
          >
            {run ? "Start a new set" : "Start"}
          </Button>
          {avg != null && <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{data.drills.length} drill{data.drills.length === 1 ? "" : "s"} so far, average {(avg * 100).toFixed(0)}% correct.</span>}
        </div>
      </Panel>
      {run && (
        <Panel title={run.checked ? `Score: ${score} of ${qs.length} in ${run.seconds} seconds` : "Your answers"}>
          <ol className="flex flex-col gap-3">
            {qs.map((q, i) => {
              const ok = run.checked && isClose(parseFloat(run.answers[i]), q.answer);
              return (
                <li key={q.id} className="flex flex-col gap-1">
                  <label className="flex flex-wrap items-center gap-3 font-[family-name:var(--font-ui)] text-sm text-ink">
                    <span className="min-w-[280px] flex-1">
                      {i + 1}. {q.prompt}
                    </span>
                    <input
                      aria-label={`Answer to question ${i + 1}`}
                      inputMode="decimal"
                      value={run.answers[i]}
                      disabled={run.checked}
                      onChange={(e) => setRun({ ...run, answers: run.answers.map((a, j) => (j === i ? e.target.value.replace(/[^0-9.-]/g, "") : a)) })}
                      className={`${cellCls} !w-28`}
                    />
                    {q.unit && <span className="text-ink-soft">{q.unit}</span>}
                  </label>
                  {run.checked && (
                    <p className={`font-[family-name:var(--font-ui)] text-xs ${ok ? "text-water-deep" : "text-clay-text"}`}>
                      <span className="sr-only">{ok ? "Correct. " : "Not quite. "}</span>
                      {ok ? "Correct." : `Answer: ${Math.round(q.answer * 100) / 100}${q.unit}.`} Shortcut: {q.tip}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
          {!run.checked && (
            <div>
              <Button
                onClick={() => {
                  const seconds = Math.max(1, Math.round((Date.now() - started.current) / 1000));
                  const got = qs.filter((q, i) => isClose(parseFloat(run.answers[i]), q.answer)).length;
                  setRun({ ...run, checked: true, seconds });
                  update((d) => ({ ...d, drills: [...d.drills, { date: new Date().toISOString().slice(0, 10), score: got, total: qs.length, seconds }].slice(-60) }));
                }}
              >
                Check my answers
              </Button>
            </div>
          )}
        </Panel>
      )}
      {history.length > 0 && (
        <Panel title="Recent drills">
          <NumTable caption="Recent mental math drills" corner="Date" head={["Score", "Time"]} rows={history.map((h, i) => ({ label: `${h.date || "earlier"} (${i + 1})`, cells: [`${h.score} of ${h.total}`, `${h.seconds}s`] }))} />
        </Panel>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StoriesTab({ data, update }: { data: ConsultingData; update: Update }) {
  return (
    <div className="flex flex-col gap-4">
      <Panel title="Fit stories" subtitle="Write each one as Situation (one sentence), Task, Action (the most time), Result (with a number if you can). Aim for about two minutes spoken, then say it aloud until it sounds natural.">
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">Only write true stories, and keep names of other people out of them.</p>
      </Panel>
      {STORY_PROMPTS.map((s) => {
        const v = data.stories[s.id] ?? "";
        const words = v.trim() ? v.trim().split(/\s+/).length : 0;
        return (
          <Panel key={s.id} title={s.theme} subtitle={s.prompt}>
            <Note label={`My story: ${s.theme}`} rows={6} value={v} onChange={(x) => update((d) => ({ ...d, stories: { ...d.stories, [s.id]: x } }))} placeholder="Situation, Task, Action, Result" />
            <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
              {words} words (about {Math.max(1, Math.round(words / 130))} minute{words > 190 ? "s" : ""} spoken). {s.tip}
            </p>
          </Panel>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function LogTab({ data, update }: { data: ConsultingData; update: Update }) {
  const blank = (): CaseLog => ({ id: "", date: new Date().toISOString().slice(0, 10), kind: FRAMEWORKS[0].name, partner: "", notes: "", scores: { structure: 0, quant: 0, insight: 0, communication: 0 } });
  const [draft, setDraft] = useState<CaseLog>(blank);
  const { averages, count } = caseAverages(data.cases);
  return (
    <div className="flex flex-col gap-6">
      <Panel title="Log a practice case" subtitle="Score yourself, or have your partner score you, from 1 (needs work) to 4 (excellent) on each line. Leave a line at 0 if it was not scored.">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={labelCls}>
            Date
            <TextInput type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </label>
          <label className={labelCls}>
            Type of case
            <Select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}>
              {FRAMEWORKS.map((f) => (
                <option key={f.id}>{f.name}</option>
              ))}
              <option>Other</option>
            </Select>
          </label>
          <label className={labelCls}>
            Practice partner
            <TextInput value={draft.partner} maxLength={60} onChange={(e) => setDraft({ ...draft, partner: e.target.value })} />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          {CASE_RUBRIC.map(([k, label, hint]) => (
            <label key={k} className={labelCls}>
              {label}
              <Select value={String(draft.scores[k])} onChange={(e) => setDraft({ ...draft, scores: { ...draft.scores, [k]: Number(e.target.value) } })}>
                <option value="0">Not scored</option>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
              <span className="font-normal">{hint}</span>
            </label>
          ))}
        </div>
        <Note label="What went well, and what to work on" rows={3} value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} />
        <div>
          <Button
            onClick={() => {
              update((d) => ({ ...d, cases: [{ ...draft, id: uid() }, ...d.cases].slice(0, 200) }));
              setDraft(blank());
            }}
          >
            Add to the log
          </Button>
        </div>
      </Panel>
      {count > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CASE_RUBRIC.map(([k, label]) => (
            <Tile key={k} label={label} value={averages[k] == null ? "n/a" : `${averages[k]} of 4`} sub={`average over ${count} case${count === 1 ? "" : "s"}`} />
          ))}
        </div>
      )}
      {data.cases.length === 0 ? (
        <Empty>No cases logged yet. Ten is a good goal before interviews.</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.cases.map((c) => (
            <li key={c.id} className="panel flex flex-col gap-1 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
                  {c.kind} <span className="font-normal text-ink-soft">· {c.date || "undated"}{c.partner ? ` · with ${c.partner}` : ""}</span>
                </p>
                <Button variant="ghost" onClick={() => update((d) => ({ ...d, cases: d.cases.filter((x) => x.id !== c.id) }))} aria-label={`Remove the ${c.kind} case of ${c.date}`}>
                  Remove
                </Button>
              </div>
              <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{CASE_RUBRIC.map(([k, label]) => `${label} ${c.scores[k] || "–"}`).join(" · ")}</p>
              {c.notes && <p className="font-[family-name:var(--font-ui)] text-sm text-ink">{c.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
