import { useState } from "react";
import { Link } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useWealthPrep } from "../../state/useWealthPrep";
import { applyHouse, marketFilled, type Indicator } from "../../lib/wealthHouse";
import { defaultProcess, processSteps, type ProcessStep } from "../../lib/wealthProcess";
import { QUESTION_SECTIONS, resolvedQuestions, standardQuestions, type QA } from "../../lib/wealthQuestions";
import { uid, type WealthPlan } from "../../lib/wealthMath";
import { Button } from "../ui/Button";
import { TextArea, TextInput } from "../ui/Field";
import { Panel } from "./parts";

const labelCls = "flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft";

interface P {
  plan: WealthPlan;
  set: (next: WealthPlan) => void;
}

/** Copies the analyst's house view into this plan: its assumptions, its market snapshot, or both. */
export function HouseApply({ plan, set, assumptions = true, market = true, label = "Apply my house view" }: P & { assumptions?: boolean; market?: boolean; label?: string }) {
  const { repository, snapshot } = useCourse();
  const userId = snapshot?.profile.userId ?? "";
  const prep = useWealthPrep(repository, userId);
  const [done, setDone] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          disabled={!prep.data}
          onClick={() => {
            if (!prep.data) return;
            set(applyHouse(plan, prep.data.house, { assumptions, market }));
            setDone(`Applied${assumptions ? ": inflation, return and volatility for this client's risk profile, the fee, state tax and filing status" : ""}${assumptions && market ? ", and" : ""}${market ? `${assumptions ? "" : ":"} the market snapshot` : ""}. You can change any of it for this client.`);
          }}
        >
          {label}
        </Button>
        <Link to="/community/wealth/house" className="font-[family-name:var(--font-ui)] text-xs text-water-deep underline underline-offset-2">
          Edit my house view
        </Link>
      </div>
      {done && (
        <p role="status" className="font-[family-name:var(--font-ui)] text-xs text-water-deep">
          {done}
        </p>
      )}
    </div>
  );
}

/** The market snapshot slide: copied from the house view or written for this client. */
export function MarketPanel({ plan, set }: P) {
  const m = plan.market;
  const setM = (patch: Partial<typeof m>) => set({ ...plan, market: { ...m, ...patch } });
  const setInd = (id: string, patch: Partial<Indicator>) => setM({ indicators: m.indicators.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const bullets = [...m.bullets, "", "", "", ""].slice(0, 4);
  return (
    <Panel title="Market snapshot" subtitle="A dated view of the markets for the Market snapshot slide. Copy it from your house view, then adjust it for this client, or write it here. Leave it blank to leave the slide out.">
      <HouseApply plan={plan} set={set} assumptions={false} market label="Copy market view from my house view" />
      <label className={labelCls}>
        Headline
        <TextInput value={m.headline} maxLength={140} onChange={(e) => setM({ headline: e.target.value })} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {bullets.map((b, i) => (
          <label key={i} className={labelCls}>
            What we are watching {i + 1}
            <TextInput
              value={b}
              maxLength={170}
              onChange={(e) => {
                const next = [...bullets];
                next[i] = e.target.value;
                let end = next.length;
                while (end > 0 && !next[end - 1].trim()) end--;
                setM({ bullets: next.slice(0, end) });
              }}
            />
          </label>
        ))}
      </div>
      <label className={labelCls}>
        What would change this view
        <TextInput value={m.changeMind} maxLength={300} onChange={(e) => setM({ changeMind: e.target.value })} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelCls}>
          View as of
          <TextInput type="date" value={m.asOf} onChange={(e) => setM({ asOf: e.target.value })} />
        </label>
        <label className={labelCls}>
          Source of the view
          <TextInput value={m.source} onChange={(e) => setM({ source: e.target.value })} />
        </label>
      </div>
      <details className="rounded-lg border border-line px-4 py-3 font-[family-name:var(--font-ui)] text-sm">
        <summary className="cursor-pointer font-medium text-ink">Indicators ({m.indicators.filter((i) => i.value.trim()).length} filled in)</summary>
        <div className="mt-3 flex flex-col gap-2">
          {m.indicators.map((i, n) => (
            <div key={i.id} className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
              <TextInput aria-label={`Indicator ${n + 1} name`} value={i.name} onChange={(e) => setInd(i.id, { name: e.target.value })} className="!py-1.5 !text-sm" />
              <TextInput aria-label={`${i.name || `Indicator ${n + 1}`} latest value`} value={i.value} onChange={(e) => setInd(i.id, { value: e.target.value })} className="!py-1.5 !text-sm" placeholder="Latest" />
              <TextInput aria-label={`${i.name || `Indicator ${n + 1}`} as of`} type="date" value={i.asOf} onChange={(e) => setInd(i.id, { asOf: e.target.value })} className="!py-1.5 !text-sm" />
              <TextInput aria-label={`${i.name || `Indicator ${n + 1}`} source`} value={i.source} onChange={(e) => setInd(i.id, { source: e.target.value })} className="!py-1.5 !text-sm" placeholder="Source" />
            </div>
          ))}
        </div>
      </details>
      <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{marketFilled(m) ? "The Market snapshot slide is included." : "Nothing entered yet, so the slide is left out."} Write what you see and why it matters; do not predict where markets are going.</p>
    </Panel>
  );
}

/** The "How we will work together" steps, in your words. */
export function ProcessPanel({ plan, set }: P) {
  const steps = processSteps(plan.process, plan.client.cadence);
  const custom = plan.process.steps.length > 0;
  const setSteps = (next: ProcessStep[]) => set({ ...plan, process: { ...plan.process, steps: next } });
  const upd = (id: string, patch: Partial<ProcessStep>) => setSteps(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  return (
    <Panel
      title="How we will work together"
      subtitle="The steps of your engagement with this client, for the process slide. Rename them, rewrite them, or add your own. Keep the wording about what you are: a student doing an educational exercise."
      actions={
        custom ? (
          <Button variant="ghost" onClick={() => set({ ...plan, process: { steps: [], promise: defaultProcess().promise } })}>
            Back to the standard five
          </Button>
        ) : undefined
      }
    >
      <ol className="flex flex-col gap-3">
        {steps.map((s, i) => (
          <li key={s.id} className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
            <TextInput aria-label={`Step ${i + 1} title`} value={s.title} maxLength={24} onChange={(e) => upd(s.id, { title: e.target.value })} />
            <TextInput aria-label={`Step ${i + 1} description`} value={s.text} maxLength={190} onChange={(e) => upd(s.id, { text: e.target.value })} />
            <Button
              variant="ghost"
              disabled={steps.length <= 2}
              onClick={() => setSteps(steps.filter((x) => x.id !== s.id))}
              aria-label={`Remove step ${i + 1}`}
            >
              Remove
            </Button>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        {steps.length < 6 && (
          <Button variant="secondary" onClick={() => setSteps([...steps, { id: uid(), title: "New step", text: "" }])}>
            Add a step
          </Button>
        )}
      </div>
      <label className={labelCls}>
        Closing line about the relationship
        <TextArea rows={2} value={plan.process.promise} maxLength={300} onChange={(e) => set({ ...plan, process: { ...plan.process, promise: e.target.value } })} className="min-h-16 !text-sm" />
      </label>
    </Panel>
  );
}

/** Anticipated client questions: shown in the speaker notes of the slide they belong to; edit, hide, or add your own. */
export function QuestionsPanel({ plan, set }: P) {
  const [section, setSection] = useState(QUESTION_SECTIONS[0][0]);
  const t = plan.talk;
  const std = standardQuestions(plan, section);
  const shown = resolvedQuestions(plan, section);
  const custom = t.custom[section] ?? [];
  const setT = (patch: Partial<typeof t>) => set({ ...plan, talk: { ...t, ...patch } });
  const edit = (id: string, patch: { q?: string; a?: string }) => setT({ edits: { ...t.edits, [id]: { ...t.edits[id], ...patch } } });
  const setCustom = (list: QA[]) => setT({ custom: { ...t.custom, [section]: list } });
  const count = QUESTION_SECTIONS.reduce((n, [id]) => n + resolvedQuestions(plan, id).length, 0);
  return (
    <Panel
      title="Anticipated questions"
      subtitle={`Likely questions for each part of the deck, answered from this client's numbers, go into that slide's speaker notes so you can rehearse them. ${count} in all right now. Edit any answer in your own words, hide one, or add your own.`}
    >
      <label className={labelCls}>
        Part of the deck
        <select value={section} onChange={(e) => setSection(e.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2 font-[family-name:var(--font-ui)] text-sm text-ink focus:border-water focus:outline-none">
          {QUESTION_SECTIONS.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
      {std.length === 0 && custom.length === 0 && <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">No standard questions for this part yet (fill in its numbers first), but you can add your own.</p>}
      <ul className="flex flex-col gap-4">
        {std.map((x) => {
          const hidden = t.hidden.includes(x.id);
          const cur = shown.find((y) => y.id === x.id);
          return (
            <li key={x.id} className="flex flex-col gap-2 rounded-lg border border-line p-3">
              <div className="flex items-start justify-between gap-3">
                <TextInput aria-label={`Question: ${x.q}`} value={t.edits[x.id]?.q ?? x.q} onChange={(e) => edit(x.id, { q: e.target.value })} disabled={hidden} className="!py-1.5 !text-sm font-semibold" />
                <Button variant="ghost" onClick={() => setT({ hidden: hidden ? t.hidden.filter((h) => h !== x.id) : [...t.hidden, x.id] })} aria-label={`${hidden ? "Show" : "Hide"} the question: ${x.q}`}>
                  {hidden ? "Show" : "Hide"}
                </Button>
              </div>
              <TextArea aria-label={`Answer to: ${x.q}`} rows={3} value={t.edits[x.id]?.a ?? x.a} disabled={hidden || !cur} onChange={(e) => edit(x.id, { a: e.target.value })} className="min-h-16 !text-sm" />
              {t.edits[x.id] && (
                <div>
                  <Button variant="ghost" onClick={() => { const e = { ...t.edits }; delete e[x.id]; setT({ edits: e }); }}>
                    Restore the standard wording
                  </Button>
                </div>
              )}
            </li>
          );
        })}
        {custom.map((x) => (
          <li key={x.id} className="flex flex-col gap-2 rounded-lg border border-line p-3">
            <div className="flex items-start justify-between gap-3">
              <TextInput aria-label="Your question" value={x.q} placeholder="Your question" onChange={(e) => setCustom(custom.map((y) => (y.id === x.id ? { ...y, q: e.target.value } : y)))} className="!py-1.5 !text-sm font-semibold" />
              <Button variant="ghost" onClick={() => setCustom(custom.filter((y) => y.id !== x.id))} aria-label="Remove your question">
                Remove
              </Button>
            </div>
            <TextArea aria-label="Your answer" rows={3} value={x.a} placeholder="Your answer. Keep it educational: do not tell the client what to buy." onChange={(e) => setCustom(custom.map((y) => (y.id === x.id ? { ...y, a: e.target.value } : y)))} className="min-h-16 !text-sm" />
          </li>
        ))}
      </ul>
      {custom.length < 6 && (
        <div>
          <Button variant="secondary" onClick={() => setCustom([...custom, { id: uid(), q: "", a: "" }])}>
            Add my own question
          </Button>
        </div>
      )}
    </Panel>
  );
}
