import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { Select, TextArea, TextInput } from "../ui/Field";
import { Empty, Panel, Pill } from "./parts";
import { PERSONAS, type Persona } from "../../lib/wealthPersonas";
import { APP_STATUSES, resumeBullets, type AppStatus, type PrepData, type TechRating } from "../../lib/wealthPrep";
import { BEHAVIORAL_PROMPTS, READINESS, TECH_CATEGORIES, TECH_QUESTIONS, type TechCategory } from "../../lib/wealthPrepContent";
import { today, uid } from "../../lib/wealthMath";
import type { WealthClient } from "../../types";

interface TabProps {
  data: PrepData;
  update: (fn: (d: PrepData) => PrepData) => void;
}

const labelCls = "flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft";

/* ------------------------------------------------------------------ */

const RATINGS: [TechRating, string][] = [
  ["confident", "Confident"],
  ["getting", "Getting there"],
  ["needs", "Needs work"],
];

export function TechTab({ data, update }: TabProps) {
  const [category, setCategory] = useState<TechCategory | "all">("all");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const list = TECH_QUESTIONS.filter((q) => (category === "all" || q.category === category) && (!onlyOpen || data.tech[q.id] !== "confident"));
  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="Technical questions"
        subtitle="Read the question, answer it out loud before you reveal the answer, then rate yourself honestly. The answers are teaching answers: say them in your own words."
      >
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter the questions">
          <Pill active={category === "all"} onClick={() => setCategory("all")}>
            All ({TECH_QUESTIONS.length})
          </Pill>
          {TECH_CATEGORIES.map((c) => (
            <Pill key={c} active={category === c} onClick={() => setCategory(c)}>
              {c}
            </Pill>
          ))}
          <label className="ml-auto flex items-center gap-2 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
            <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} className="h-4 w-4 accent-[var(--color-water-deep)]" />
            Hide the ones I am confident about
          </label>
        </div>
      </Panel>
      {list.length === 0 && <Empty>Nothing left here. Nice work.</Empty>}
      <ul className="flex flex-col gap-3">
        {list.map((q) => {
          const open = !!shown[q.id];
          return (
            <li key={q.id} className="panel p-4">
              <p className="font-[family-name:var(--font-ui)] text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{q.category}</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-base font-semibold text-ink">{q.q}</p>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setShown((s) => ({ ...s, [q.id]: !open }))}
                className="mt-2 font-[family-name:var(--font-ui)] text-sm text-water-deep underline underline-offset-2"
              >
                {open ? "Hide the answer" : "Show the answer"}
              </button>
              {open && (
                <div className="mt-2 flex flex-col gap-3">
                  <p className="font-[family-name:var(--font-ui)] text-sm leading-relaxed text-ink-soft">{q.a}</p>
                  <div role="group" aria-label={`How well do you know: ${q.q}`} className="flex flex-wrap gap-2">
                    {RATINGS.map(([value, label]) => (
                      <Pill key={value} active={data.tech[q.id] === value} onClick={() => update((d) => ({ ...d, tech: { ...d.tech, [q.id]: value } }))}>
                        {label}
                      </Pill>
                    ))}
                  </div>
                </div>
              )}
              {!open && data.tech[q.id] && <p className="mt-2 font-[family-name:var(--font-ui)] text-xs text-ink-soft">Rated: {RATINGS.find(([v]) => v === data.tech[q.id])![1]}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function BehavioralTab({ data, update }: TabProps) {
  return (
    <div className="flex flex-col gap-4">
      <Panel title="Behavioral and fit questions" subtitle="Write your answer, then say it aloud. About 90 to 120 seconds is 200 to 250 words. For stories use Situation, Task, Action, Result, and say what you personally did.">
        <div className="flex flex-col gap-6">
          {BEHAVIORAL_PROMPTS.map((p) => {
            const text = data.behavioral[p.id] ?? "";
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            return (
              <div key={p.id} className="flex flex-col gap-1.5">
                <label htmlFor={`bh-${p.id}`} className="font-[family-name:var(--font-display)] text-sm font-semibold text-ink">
                  {p.prompt}
                </label>
                <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{p.hint}</p>
                <TextArea id={`bh-${p.id}`} rows={4} value={text} onChange={(e) => update((d) => ({ ...d, behavioral: { ...d.behavioral, [p.id]: e.target.value } }))} className="min-h-24 !text-sm" />
                <p className="font-[family-name:var(--font-ui)] text-[11px] tabular-nums text-ink-soft">{words} words</p>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PersonaDrill({ persona, data, update, onStart }: TabProps & { persona: Persona; onStart: (p: Persona) => void }) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const drill = data.drills[persona.id] ?? { notes: "", checks: {} };
  const set = (patch: Partial<typeof drill>) => update((d) => ({ ...d, drills: { ...d.drills, [persona.id]: { ...drill, ...patch } } }));
  const score = persona.rubric.filter((_, i) => drill.checks[String(i)]).length;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="t-h3">{persona.title}</h3>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{persona.blurb}</p>
        </div>
        <Button onClick={() => onStart(persona)}>Start a plan for {persona.name.split(" ")[0]}</Button>
      </div>
      <div>
        <p className="font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wider text-ink-soft">You will practice</p>
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {persona.objectives.map((o) => (
            <li key={o} className="rounded-full bg-parchment-deep px-2.5 py-0.5 font-[family-name:var(--font-ui)] text-xs text-ink">
              {o}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">Role-play the discovery meeting</p>
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">One person plays the client and reads the answers; the other asks the questions in their own words. Reveal an answer only when it has been asked.</p>
        <ul className="mt-2 flex flex-col gap-2">
          {persona.facts.map((f, i) => (
            <li key={f.q} className="panel-inner p-3">
              <p className="font-[family-name:var(--font-ui)] text-sm font-medium text-ink">{f.q}</p>
              {revealed[i] ? (
                <p className="mt-1 font-[family-name:var(--font-ui)] text-sm italic text-ink-soft">“{f.a}”</p>
              ) : (
                <button type="button" onClick={() => setRevealed((r) => ({ ...r, [i]: true }))} className="mt-1 font-[family-name:var(--font-ui)] text-xs text-water-deep underline underline-offset-2">
                  Reveal what the client says
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`drill-${persona.id}`} className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
          Your recommendation, in a paragraph
        </label>
        <TextArea id={`drill-${persona.id}`} rows={5} value={drill.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="What do you recommend, in what order, and why? Name the numbers you would use." className="!text-sm" />
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
          Score yourself <span className="font-normal text-ink-soft">({score} of {persona.rubric.length} covered)</span>
        </legend>
        {persona.rubric.map((r, i) => (
          <label key={r} className="flex cursor-pointer items-start gap-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            <input type="checkbox" checked={!!drill.checks[String(i)]} onChange={(e) => set({ checks: { ...drill.checks, [String(i)]: e.target.checked } })} className="mt-0.5 h-4 w-4 accent-[var(--color-water-deep)]" />
            <span>My recommendation: {r.charAt(0).toLowerCase() + r.slice(1)}</span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}

export function DrillsTab({ data, update, onStart }: TabProps & { onStart: (p: Persona) => void }) {
  const [id, setId] = useState(PERSONAS[0].id);
  const persona = PERSONAS.find((p) => p.id === id)!;
  return (
    <div className="flex flex-col gap-4">
      <Panel title="Practice clients" subtitle="Invented people for rehearsing a discovery meeting and a recommendation without using anyone's real finances. Start a plan from any of them and work it through to a presentation.">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Practice clients">
          {PERSONAS.map((p) => (
            <Pill key={p.id} active={id === p.id} onClick={() => setId(p.id)}>
              {p.name} · {p.level}
            </Pill>
          ))}
        </div>
      </Panel>
      <Panel>
        <PersonaDrill key={persona.id} persona={persona} data={data} update={update} onStart={onStart} />
      </Panel>
    </div>
  );
}

/** Starts a plan from a practice client and opens it. */
export function useStartPersona(create: (plan: unknown) => Promise<{ id: string }>) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return {
    busy,
    error,
    start: async (p: Persona) => {
      setBusy(true);
      setError(null);
      try {
        const made = await create(p.plan());
        navigate(`/community/wealth/${made.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
  };
}

/* ------------------------------------------------------------------ */

export function JournalTab({ data, update }: TabProps) {
  const [draft, setDraft] = useState({ date: today(), view: "", read: "", idea: "", client: "" });
  const add = () => {
    if (!draft.view.trim() && !draft.idea.trim()) return;
    update((d) => ({ ...d, journal: [{ id: uid(), ...draft }, ...d.journal] }));
    setDraft({ date: today(), view: "", read: "", idea: "", client: "" });
  };
  const field = (key: keyof typeof draft, label: string, ph: string, rows = 3) => (
    <label className={labelCls}>
      {label}
      <TextArea rows={rows} value={draft[key]} placeholder={ph} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} className="min-h-16 !text-sm" />
    </label>
  );
  return (
    <div className="flex flex-col gap-4">
      <Panel title="Market journal" subtitle="One entry a week builds the habit interviewers ask about: a clear view, an idea with its risks, and how you would explain it to a client.">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelCls}>
            Date
            <TextInput type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </label>
          <span />
          {field("view", "My view of the markets this week", "Rates, inflation, earnings, the Fed. What do I think is going on, and why?")}
          {field("read", "What I read or watched", "Sources and one thing I learned.")}
          {field("idea", "One idea (stock, fund, or theme)", "Thesis, evidence, what would make me wrong, the main risks.")}
          {field("client", "What I would tell a client", "In plain words, without jargon.")}
        </div>
        <div>
          <Button onClick={add} disabled={!draft.view.trim() && !draft.idea.trim()}>
            Add the entry
          </Button>
        </div>
      </Panel>
      {data.journal.length === 0 ? (
        <Empty>No entries yet.</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.journal.map((e) => (
            <li key={e.id} className="panel p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-ink">{new Date(`${e.date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                <button type="button" aria-label={`Delete the entry from ${e.date}`} onClick={() => update((d) => ({ ...d, journal: d.journal.filter((x) => x.id !== e.id) }))} className="font-[family-name:var(--font-ui)] text-xs text-ink-soft hover:text-red-700">
                  Delete
                </button>
              </div>
              <dl className="mt-2 grid gap-3 font-[family-name:var(--font-ui)] text-sm sm:grid-cols-2">
                {(
                  [
                    ["View", e.view],
                    ["Read", e.read],
                    ["Idea", e.idea],
                    ["For a client", e.client],
                  ] as [string, string][]
                )
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{k}</dt>
                      <dd className="whitespace-pre-wrap text-ink">{v}</dd>
                    </div>
                  ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function ReadinessTab({ data, update }: TabProps) {
  const [text, setText] = useState("");
  return (
    <div className="flex flex-col gap-4">
      {READINESS.map((g) => (
        <Panel key={g.id} title={g.title}>
          <ul className="flex flex-col gap-2">
            {g.items.map((i) => (
              <li key={i.id}>
                <label className="flex cursor-pointer items-start gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
                  <input type="checkbox" checked={!!data.ready[i.id]} onChange={(e) => update((d) => ({ ...d, ready: { ...d.ready, [i.id]: e.target.checked } }))} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-water-deep)]" />
                  <span>
                    {i.text}
                    {i.note && <span className="block text-xs text-ink-soft">{i.note}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Panel>
      ))}
      <Panel title="My own items">
        {data.custom.length === 0 && <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Add anything else you want to be ready for.</p>}
        <ul className="flex flex-col gap-2">
          {data.custom.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <input aria-label={`Done: ${c.text}`} type="checkbox" checked={c.done} onChange={(e) => update((d) => ({ ...d, custom: d.custom.map((x) => (x.id === c.id ? { ...x, done: e.target.checked } : x)) }))} className="h-4 w-4 accent-[var(--color-water-deep)]" />
              <span className="flex-1 font-[family-name:var(--font-ui)] text-sm text-ink">{c.text}</span>
              <button type="button" aria-label={`Remove ${c.text}`} onClick={() => update((d) => ({ ...d, custom: d.custom.filter((x) => x.id !== c.id) }))} className="px-2 text-ink-soft hover:text-red-700">
                ×
              </button>
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            update((d) => ({ ...d, custom: [...d.custom, { id: uid(), text: text.trim(), done: false }] }));
            setText("");
          }}
        >
          <TextInput aria-label="Add your own item" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Finish the Bloomberg Market Concepts modules" className="flex-1" />
          <Button type="submit" disabled={!text.trim()}>
            Add
          </Button>
        </form>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function AppsTab({ data, update }: TabProps) {
  const [d, setD] = useState({ firm: "", program: "", deadline: "" });
  const edit = (id: string, patch: Record<string, string>) => update((x) => ({ ...x, apps: x.apps.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  const cell = "w-full min-w-0 rounded-lg border border-line bg-surface px-2 py-1.5 font-[family-name:var(--font-ui)] text-sm text-ink focus:border-water focus:outline-none";
  return (
    <div className="flex flex-col gap-4">
      <Panel title="Application tracker" subtitle="Programs, deadlines and where each stands. Fill in the dates yourself from each firm's careers page, and note the day you checked: windows change.">
        <form
          className="grid gap-3 sm:grid-cols-[1fr_1fr_10rem_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!d.firm.trim()) return;
            update((x) => ({ ...x, apps: [...x.apps, { id: uid(), firm: d.firm.trim(), program: d.program.trim(), deadline: d.deadline, status: "Researching", notes: "" }] }));
            setD({ firm: "", program: "", deadline: "" });
          }}
        >
          <label className={labelCls}>
            Firm
            <TextInput value={d.firm} onChange={(e) => setD({ ...d, firm: e.target.value })} />
          </label>
          <label className={labelCls}>
            Program
            <TextInput value={d.program} onChange={(e) => setD({ ...d, program: e.target.value })} placeholder="e.g. Summer analyst, wealth management" />
          </label>
          <label className={labelCls}>
            Deadline
            <TextInput type="date" value={d.deadline} onChange={(e) => setD({ ...d, deadline: e.target.value })} />
          </label>
          <Button type="submit" disabled={!d.firm.trim()}>
            Add
          </Button>
        </form>
      </Panel>
      {data.apps.length === 0 ? (
        <Empty>No applications tracked yet.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <caption className="sr-only">Applications</caption>
            <thead>
              <tr className="border-b border-line text-left font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-wider text-ink-soft">
                {["Firm", "Program", "Deadline", "Status", "Notes"].map((h) => (
                  <th key={h} scope="col" className="px-2 py-2 font-semibold">
                    {h}
                  </th>
                ))}
                <th scope="col" className="px-2 py-2">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.apps.map((a) => (
                <tr key={a.id} className="border-b border-line last:border-0">
                  <td className="px-2 py-1.5">
                    <input aria-label={`Firm: ${a.firm}`} className={cell} value={a.firm} onChange={(e) => edit(a.id, { firm: e.target.value })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input aria-label={`Program at ${a.firm}`} className={cell} value={a.program} onChange={(e) => edit(a.id, { program: e.target.value })} />
                  </td>
                  <td className="w-36 px-2 py-1.5">
                    <input aria-label={`Deadline at ${a.firm}`} type="date" className={cell} value={a.deadline} onChange={(e) => edit(a.id, { deadline: e.target.value })} />
                  </td>
                  <td className="w-36 px-2 py-1.5">
                    <Select aria-label={`Status at ${a.firm}`} className="!px-2 !py-1.5 !text-sm" value={a.status} onChange={(e) => edit(a.id, { status: e.target.value as AppStatus })}>
                      {APP_STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input aria-label={`Notes for ${a.firm}`} className={cell} value={a.notes} onChange={(e) => edit(a.id, { notes: e.target.value })} placeholder="Contacts, checked on..." />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button type="button" aria-label={`Remove ${a.firm}`} onClick={() => update((x) => ({ ...x, apps: x.apps.filter((r) => r.id !== a.id) }))} className="px-2 text-ink-soft hover:text-red-700">
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function ResumeTab({ clients, data }: { clients: WealthClient[]; data: PrepData }) {
  const bullets = resumeBullets(clients, data);
  const [copied, setCopied] = useState<number | null>(null);
  const copy = async (text: string, i: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(i);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <Panel title="Resume bullets from your work" subtitle="Drafted from what you have actually done in Wealth Tools, in plain counts. Edit them to fit your resume and keep them true.">
        {bullets.length === 0 ? (
          <Empty>Build a client plan, present a deck, or add a journal entry and bullets will appear here.</Empty>
        ) : (
          <ul className="flex flex-col gap-3">
            {bullets.map((b, i) => (
              <li key={b} className="panel-inner flex items-start justify-between gap-3 p-3">
                <p className="font-[family-name:var(--font-ui)] text-sm text-ink">{b}</p>
                <Button variant="ghost" onClick={() => void copy(b, i)} aria-label={`Copy bullet ${i + 1}`}>
                  {copied === i ? "Copied" : "Copy"}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          Honesty rules: describe this as educational work for peers (not a professional engagement), do not name clients, and do not claim results or a title you did not hold. Interviewers will ask you to walk through anything on your resume.
        </p>
      </Panel>
    </div>
  );
}
