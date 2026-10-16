import { useState } from "react";
import { Button } from "../ui/Button";
import { Select, TextArea, TextInput } from "../ui/Field";
import { FILING_OPTIONS, asFilingStatus, takeHomeEstimate } from "../../lib/taxMath";
import { Bar, Empty, MoneyField, ModuleHead, Panel, Pill, Tile } from "./parts";
import {
  GOAL_CATEGORIES,
  PRIORITIES,
  RISK_PROFILES,
  SWOT_KEYS,
  SWOT_TITLES,
  VALUE_SUGGESTIONS,
  fmtDate,
  fmtPct,
  fmtUsd,
  num,
  uid,
  type Goal,
  type GoalCategory,
  type Insight,
  type Insights,
  type Priority,
  type SwotKey,
  type WealthPlan,
} from "../../lib/wealthMath";

export interface ModuleProps {
  plan: WealthPlan;
  set: (next: WealthPlan) => void;
}

const CATEGORY_COLOR: Record<GoalCategory, string> = {
  "Short-Term": "var(--color-river-2)",
  "Medium-Term": "var(--color-gold)",
  "Long-Term Retirement/Wealth": "var(--color-water-deep)",
  "Giving / Generosity": "var(--color-clay)",
};

const labelCls = "flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft";

/** Works out monthly take-home pay from yearly pay before tax, with fine print on how, and fills the take-home box on request. */
function TakeHomeEstimator({ onUse }: { onUse: (monthly: number) => void }) {
  const [gross, setGross] = useState("");
  const [filing, setFiling] = useState("single");
  const est = takeHomeEstimate(num(gross), asFilingStatus(filing));
  return (
    <details className="sm:col-span-2 rounded-lg border border-line bg-parchment-deep/50 px-4 py-3">
      <summary className="cursor-pointer font-[family-name:var(--font-ui)] text-xs font-medium text-ink">Estimate take-home pay from pay before tax</summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <MoneyField label="Pay per year, before tax" prefix="$" value={gross} onChange={setGross} placeholder="45,000" />
        <label className={labelCls}>
          Filing status
          <Select value={filing} onChange={(e) => setFiling(e.target.value)}>
            {FILING_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex flex-col justify-end gap-1">
          <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">Estimated take-home</p>
          <p className="text-xl font-semibold tabular-nums text-ink">{num(gross) > 0 ? `${fmtUsd(est.monthly)} a month` : "Add the pay"}</p>
        </div>
      </div>
      {num(gross) > 0 && (
        <>
          <p className="mt-2 font-[family-name:var(--font-ui)] text-[11px] leading-snug text-ink-soft">{est.note}</p>
          <Button className="mt-2" variant="secondary" onClick={() => onUse(Math.round(est.monthly))}>
            Use {fmtUsd(est.monthly)} a month as take-home
          </Button>
        </>
      )}
    </details>
  );
}

/* ------------------------------------------------------------------ */
/* Step 1: About the client                                               */
/* ------------------------------------------------------------------ */

export function ModuleBasics({ plan, set }: ModuleProps) {
  const c = plan.client;
  const [draft, setDraft] = useState("");
  const setClient = (patch: Partial<typeof c>) => set({ ...plan, client: { ...c, ...patch } });
  const addValue = (v: string) => {
    const t = v.trim();
    if (!t || c.values.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    setClient({ values: [...c.values, t] });
    setDraft("");
  };
  const profile = RISK_PROFILES.find((r) => r.name === c.risk);
  return (
    <div className="flex flex-col gap-6">
      <ModuleHead step={1} title="About the client" desc="Start with who the client is, what they value, and how they think about money before talking numbers. Fill this in from the discovery meeting." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Panel title="Profile">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelCls}>
                Name
                <TextInput value={c.name} onChange={(e) => setClient({ name: e.target.value })} placeholder="Full name" />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className={labelCls}>
                  Age
                  <TextInput inputMode="numeric" value={c.age} onChange={(e) => setClient({ age: e.target.value.replace(/[^0-9]/g, "") })} placeholder="21" />
                </label>
                <label className={labelCls}>
                  Plan date
                  <TextInput type="date" value={c.date} onChange={(e) => setClient({ date: e.target.value })} />
                </label>
              </div>
              <label className={`${labelCls} sm:col-span-2`}>
                What they do (student, server, analyst...)
                <TextInput value={c.occupation} onChange={(e) => setClient({ occupation: e.target.value })} placeholder="Student, server, analyst..." />
              </label>
              <label className={labelCls}>
                Contact
                <TextInput value={c.contact} onChange={(e) => setClient({ contact: e.target.value })} placeholder="Email or phone, preferred way" />
              </label>
              <label className={labelCls}>
                How often to review together
                <TextInput value={c.cadence} onChange={(e) => setClient({ cadence: e.target.value })} placeholder="Weekly, monthly..." />
              </label>
              <MoneyField label="Monthly take-home income" prefix="$" value={c.income} onChange={(v) => setClient({ income: v })} placeholder="2,600" hint="Feeds the budget split in step 7." />
              <TakeHomeEstimator onUse={(monthly) => setClient({ income: String(monthly) })} />
            </div>
          </Panel>

          <Panel title="Discovery meeting notes" subtitle="What you heard: their story, what is on their mind, and what they want. These appear in the presentation's next steps.">
            <TextArea
              rows={4}
              aria-label="Discovery meeting notes"
              value={plan.notes.discovery}
              onChange={(e) => set({ ...plan, notes: { ...plan.notes, discovery: e.target.value } })}
              placeholder="Met after the study. Wants to stop living paycheck to paycheck and start investing before graduation..."
            />
          </Panel>

          <Panel title="Core values" subtitle="What matters most to them. These feed the money mission in step 5.">
            <div className="flex flex-wrap gap-2">
              {c.values.length === 0 && <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">No values added yet.</span>}
              {c.values.map((v) => (
                <span key={v} className="inline-flex items-center gap-1 rounded-full border border-line bg-parchment-deep py-1 pl-3 pr-1.5 font-[family-name:var(--font-ui)] text-sm text-ink">
                  {v}
                  <button
                    type="button"
                    aria-label={`Remove ${v}`}
                    onClick={() => setClient({ values: c.values.filter((x) => x !== v) })}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-ink-soft hover:bg-line hover:text-ink"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <TextInput
                value={draft}
                aria-label="Add a value"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addValue(draft)}
                placeholder="Type a value and press Enter"
                className="flex-1"
              />
              <Button onClick={() => addValue(draft)}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {VALUE_SUGGESTIONS.filter((s) => !c.values.includes(s)).map((s) => (
                <Pill key={s} onClick={() => addValue(s)}>
                  + {s}
                </Pill>
              ))}
            </div>
          </Panel>

          <Panel title="Risk profile and money psychology">
            <div className="grid gap-2 sm:grid-cols-5">
              {RISK_PROFILES.map((r) => (
                <button
                  key={r.name}
                  type="button"
                  aria-pressed={c.risk === r.name}
                  onClick={() => setClient({ risk: r.name })}
                  className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    c.risk === r.name ? "border-water-deep bg-water-deep text-white" : "border-line text-ink hover:bg-parchment-deep"
                  }`}
                >
                  <span className="block font-[family-name:var(--font-ui)] text-[13px] font-semibold leading-tight">{r.name}</span>
                  <span className={`mt-1 block font-[family-name:var(--font-ui)] text-[11px] ${c.risk === r.name ? "text-white" : "text-ink-soft"}`}>
                    {r.ret}% return, {r.vol}% swings
                  </span>
                </button>
              ))}
            </div>
            {profile && <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{profile.desc}</p>}
            <label className={labelCls}>
              Money psychology notes
              <TextArea
                rows={3}
                value={c.psychology}
                onChange={(e) => setClient({ psychology: e.target.value })}
                placeholder="How do they feel and act around money? What did they learn about money growing up?"
              />
              <span className="font-normal">Money scripts, emotional triggers, past experiences, how they decide.</span>
            </label>
          </Panel>
        </div>

        <aside className="self-start rounded-2xl bg-water-deep p-6 text-white shadow-md" aria-label="Client snapshot">
          <p className="font-[family-name:var(--font-ui)] text-[11px] font-semibold uppercase tracking-[0.2em] text-white">Client snapshot</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-black/20 text-lg font-semibold">
              {(c.name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
            </span>
            <div>
              <p className="text-xl leading-tight">{c.name || "Client name"}</p>
              <p className="font-[family-name:var(--font-ui)] text-sm text-white">{c.age ? `Age ${c.age}` : "Age not set"}</p>
            </div>
          </div>
          <dl className="mt-5 flex flex-col gap-3 font-[family-name:var(--font-ui)] text-sm">
            {(
              [
                ["Role", c.occupation],
                ["Contact", c.contact],
                ["Review", c.cadence],
                ["Income", c.income ? `${fmtUsd(num(c.income))}/mo` : ""],
                ["Plan date", fmtDate(c.date)],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[72px_1fr] gap-2">
                <dt className="text-white">{k}</dt>
                <dd>{v || <span className="text-white">Not added</span>}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 border-t border-white/20 pt-4 font-[family-name:var(--font-ui)] text-sm">
            <span className="text-white">Risk profile: </span>
            {c.risk}
          </p>
          {c.values.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.values.map((v) => (
                <span key={v} className="rounded-full bg-black/20 px-2.5 py-1 font-[family-name:var(--font-ui)] text-xs">
                  {v}
                </span>
              ))}
            </div>
          )}
          {c.psychology && <p className="mt-4 text-xs italic leading-relaxed text-white">“{c.psychology}”</p>}
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Module 2: Goals                                                     */
/* ------------------------------------------------------------------ */

const blankGoal = { name: "", category: "Short-Term" as GoalCategory, amount: "", horizon: "", priority: "High" as Priority, current: "" };

export function ModuleGoals({ plan, set }: ModuleProps) {
  const goals = plan.goals;
  const [draft, setDraft] = useState(blankGoal);
  const setGoals = (next: Goal[]) => set({ ...plan, goals: next });
  const add = () => {
    if (!draft.name.trim() || num(draft.amount) <= 0) return;
    setGoals([...goals, { ...draft, id: uid(), name: draft.name.trim() }]);
    setDraft(blankGoal);
  };
  const update = (id: string, patch: Partial<Goal>) => setGoals(goals.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  const total = goals.reduce((s, g) => s + num(g.amount), 0);
  const saved = goals.reduce((s, g) => s + Math.min(num(g.current), num(g.amount)), 0);
  const monthlyNeed = goals.reduce((s, g) => s + Math.max(0, num(g.amount) - num(g.current)) / Math.max(1, num(g.horizon) * 12), 0);
  const byCat = GOAL_CATEGORIES.map((cat) => {
    const gs = goals.filter((g) => g.category === cat);
    return {
      cat,
      total: gs.reduce((s, g) => s + num(g.amount), 0),
      saved: gs.reduce((s, g) => s + Math.min(num(g.current), num(g.amount)), 0),
      n: gs.length,
    };
  });
  const sorted = [...goals].sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority));
  const cell =
    "w-full rounded border border-transparent bg-transparent px-1.5 py-1 font-[family-name:var(--font-ui)] text-sm text-ink hover:border-line focus:border-water focus:bg-surface focus:outline-none";

  return (
    <div className="flex flex-col gap-6">
      <ModuleHead step={2} title="Vision and goals" desc="Turn the client's vision into specific, funded targets, each with a time horizon and a priority." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Total needed" value={fmtUsd(total)} sub={`${goals.length} goal${goals.length === 1 ? "" : "s"}`} />
        <Tile label="Funded today" value={fmtUsd(saved)} sub={total ? `${fmtPct(saved / total, 1)} of the target` : "Add goals to track"} tone="good" />
        <Tile label="Still to fund" value={fmtUsd(total - saved)} tone="bad" />
        <Tile label="Straight line per month" value={fmtUsd(monthlyNeed)} sub="Before any growth" />
      </div>

      <Panel title="Progress by time horizon">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {byCat.map(({ cat, total: t, saved: s, n }) => (
            <div key={cat}>
              <p className="mb-1.5 flex justify-between font-[family-name:var(--font-ui)] text-sm">
                <span className="flex items-center gap-2 font-medium text-ink">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CATEGORY_COLOR[cat] }} aria-hidden="true" />
                  {cat}
                </span>
                <span className="tabular-nums text-ink-soft">{n}</span>
              </p>
              <Bar value={t ? s / t : 0} color={CATEGORY_COLOR[cat]} label={`${cat} funded`} />
              <p className="mt-1 font-[family-name:var(--font-ui)] text-xs tabular-nums text-ink-soft">
                {fmtUsd(s)} of {fmtUsd(t)}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Add a goal">
        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-12">
          <label className={`${labelCls} lg:col-span-3`}>
            Goal name
            <TextInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Emergency fund" />
          </label>
          <label className={`${labelCls} lg:col-span-3`}>
            Time horizon
            <Select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as GoalCategory })}>
              {GOAL_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </label>
          <MoneyField className="lg:col-span-2" label="Target" prefix="$" value={draft.amount} onChange={(v) => setDraft({ ...draft, amount: v })} placeholder="6,000" />
          <MoneyField className="lg:col-span-1" label="Years" value={draft.horizon} onChange={(v) => setDraft({ ...draft, horizon: v })} placeholder="1" />
          <MoneyField className="lg:col-span-1" label="Saved" prefix="$" value={draft.current} onChange={(v) => setDraft({ ...draft, current: v })} placeholder="0" />
          <label className={`${labelCls} lg:col-span-1`}>
            Priority
            <Select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })}>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </label>
          <Button className="lg:col-span-1" onClick={add} disabled={!draft.name.trim() || num(draft.amount) <= 0}>
            Add
          </Button>
        </div>
      </Panel>

      <Panel title="Goal register" subtitle="Edit any cell in place. Sorted by priority.">
        {goals.length === 0 ? (
          <Empty>No goals yet. Add one above.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <caption className="sr-only">The client's goals</caption>
              <thead>
                <tr className="border-b border-line text-left font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-wider text-ink-soft">
                  {["Goal", "Horizon", "Target", "Saved", "Yrs", "Priority", "Funded", "Per month"].map((h) => (
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
                {sorted.map((g) => {
                  const funded = num(g.amount) ? Math.min(1, num(g.current) / num(g.amount)) : 0;
                  const need = Math.max(0, num(g.amount) - num(g.current)) / Math.max(1, num(g.horizon) * 12);
                  return (
                    <tr key={g.id} className="border-b border-line last:border-0">
                      <td className="px-2 py-1.5">
                        <input aria-label={`Name of ${g.name}`} className={`${cell} font-medium`} value={g.name} onChange={(e) => update(g.id, { name: e.target.value })} />
                      </td>
                      <td className="px-2 py-1.5">
                        <select aria-label={`Horizon of ${g.name}`} className={cell} value={g.category} onChange={(e) => update(g.id, { category: e.target.value as GoalCategory })}>
                          {GOAL_CATEGORIES.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="w-28 px-2 py-1.5">
                        <input aria-label={`Target of ${g.name}`} className={`${cell} tabular-nums`} value={g.amount} onChange={(e) => update(g.id, { amount: e.target.value })} />
                      </td>
                      <td className="w-24 px-2 py-1.5">
                        <input aria-label={`Saved toward ${g.name}`} className={`${cell} tabular-nums`} value={g.current} onChange={(e) => update(g.id, { current: e.target.value })} />
                      </td>
                      <td className="w-16 px-2 py-1.5">
                        <input aria-label={`Years for ${g.name}`} className={`${cell} tabular-nums`} value={g.horizon} onChange={(e) => update(g.id, { horizon: e.target.value })} />
                      </td>
                      <td className="px-2 py-1.5">
                        <select aria-label={`Priority of ${g.name}`} className={cell} value={g.priority} onChange={(e) => update(g.id, { priority: e.target.value as Priority })}>
                          {PRIORITIES.map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                        </select>
                      </td>
                      <td className="w-36 px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <Bar value={funded} color={CATEGORY_COLOR[g.category]} label={`${g.name} funded`} />
                          </div>
                          <span className="w-9 text-right font-[family-name:var(--font-ui)] text-xs tabular-nums text-ink-soft">{fmtPct(funded)}</span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right font-[family-name:var(--font-ui)] tabular-nums text-ink-soft">{fmtUsd(need)}</td>
                      <td className="px-2 py-1.5 text-right">
                        <button
                          type="button"
                          aria-label={`Remove ${g.name}`}
                          onClick={() => setGoals(goals.filter((x) => x.id !== g.id))}
                          className="rounded px-2 py-1 text-ink-soft hover:bg-parchment-deep hover:text-red-700"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-[family-name:var(--font-ui)] font-semibold text-ink">
                  <td className="px-2 py-2" colSpan={2}>
                    Total
                  </td>
                  <td className="px-2 py-2 tabular-nums">{fmtUsd(total)}</td>
                  <td className="px-2 py-2 tabular-nums">{fmtUsd(saved)}</td>
                  <td colSpan={3} />
                  <td className="px-2 py-2 text-right tabular-nums">{fmtUsd(monthlyNeed)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Module 3: SWOT                                                      */
/* ------------------------------------------------------------------ */

const SWOT_META: Record<SwotKey, { sub: string; color: string; examples: string[] }> = {
  S: {
    sub: "Internal assets: savings rate, discipline, skills",
    color: "var(--color-river-1)",
    examples: ["High savings rate", "Disciplined spending habits", "Strong earning skill set", "No high interest debt"],
  },
  W: {
    sub: "Internal gaps: debt, missing safety nets",
    color: "#d9534f",
    examples: ["High interest credit card debt", "No emergency fund", "Irregular income", "No retirement account opened"],
  },
  O: {
    sub: "External levers: match, side income, compounding",
    color: "var(--color-river-2)",
    examples: ["Employer 401(k) match", "Side income potential", "Long runway for market compounding", "Roth IRA in a low tax bracket"],
  },
  T: {
    sub: "External risks: job market, lifestyle creep, big expenses",
    color: "var(--color-clay)",
    examples: ["Job market volatility", "Lifestyle creep", "Upcoming large expenses", "Medical or car repair surprise"],
  },
};

function SwotQuadrant({ k, plan, set }: { k: SwotKey } & ModuleProps) {
  const meta = SWOT_META[k];
  const title = SWOT_TITLES[k];
  const items = plan.swot[k];
  const [draft, setDraft] = useState("");
  const setItems = (next: typeof items) => set({ ...plan, swot: { ...plan.swot, [k]: next } });
  const submit = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setItems([...items, { id: uid(), text: t }]);
    setDraft("");
  };
  return (
    <section className="panel flex flex-col gap-3 p-4" style={{ borderTop: `4px solid ${meta.color}` }} aria-label={title}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="t-h4">{title}</h3>
          <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{meta.sub}</p>
        </div>
        <span className="rounded-full bg-parchment-deep px-2 py-0.5 font-[family-name:var(--font-ui)] text-xs font-semibold tabular-nums text-ink">{items.length}</span>
      </header>
      <ul className="flex min-h-[110px] flex-col gap-1">
        {items.length === 0 && <li className="px-1 py-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">Nothing added yet.</li>}
        {items.map((it) => (
          <li key={it.id} className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-parchment-deep/60">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
            <span className="flex-1 font-[family-name:var(--font-ui)] text-sm text-ink">{it.text}</span>
            <button
              type="button"
              aria-label={`Remove ${it.text}`}
              onClick={() => setItems(items.filter((x) => x.id !== it.id))}
              className="rounded px-1.5 text-ink-soft hover:text-red-700"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <TextInput
          value={draft}
          aria-label={`Add to ${title}`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit(draft)}
          placeholder={`Add a ${title.slice(0, -1).toLowerCase()}`}
          className="flex-1"
        />
        <Button onClick={() => submit(draft)}>Add</Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {meta.examples
          .filter((e) => !items.some((i) => i.text === e))
          .map((e) => (
            <Pill key={e} onClick={() => submit(e)}>
              + {e}
            </Pill>
          ))}
      </div>
    </section>
  );
}

export function ModuleSwot({ plan, set }: ModuleProps) {
  return (
    <div className="flex flex-col gap-6">
      <ModuleHead
        step={3}
        title="SWOT analysis"
        desc="Internal factors (strengths and weaknesses) and external ones (opportunities and threats). Press Enter to add quickly, or tap a suggestion."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {SWOT_KEYS.map((k) => (
          <SwotQuadrant key={k} k={k} plan={plan} set={set} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Module 4: Strategic reflection                                      */
/* ------------------------------------------------------------------ */

function InsightList({ items, empty }: { items: Insight[]; empty: string }) {
  if (!items.length) return <Empty>{empty}</Empty>;
  return (
    <ol className="flex flex-col gap-3">
      {items.map((x, i) => (
        <li key={i} className="flex gap-3">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-water-deep font-[family-name:var(--font-ui)] text-xs font-semibold text-white">{i + 1}</span>
          <div className="font-[family-name:var(--font-ui)] text-sm">
            <p className="font-medium text-ink">{x.headline}</p>
            <p className="mt-0.5 text-ink-soft">{x.tactic}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ModuleReflection({ plan, set, insights }: ModuleProps & { insights: Insights }) {
  const { growth, risk, remediate, blockers } = insights;
  const note = (k: keyof WealthPlan["notes"]) => (
    <label className={`${labelCls} mt-1`}>
      My notes
      <TextArea
        rows={2}
        value={plan.notes[k]}
        onChange={(e) => set({ ...plan, notes: { ...plan.notes, [k]: e.target.value } })}
        placeholder="What will the client actually do about this?"
        className="min-h-16"
      />
    </label>
  );
  return (
    <div className="flex flex-col gap-6">
      <ModuleHead step={4} title="Strategy" desc="The SWOT becomes three strategy tracks. They update on their own whenever the SWOT changes." />
      <p
        role="status"
        className={`rounded-xl border bg-parchment-deep px-5 py-4 font-[family-name:var(--font-ui)] text-sm text-ink ${blockers.length ? "border-clay" : "border-river-1"}`}
      >
        <strong>
          {blockers.length
            ? `Foundation first: ${blockers.length} item${blockers.length > 1 ? "s" : ""} to resolve before aiming at big targets`
            : "Foundation clear: no high interest debt or emergency fund gaps flagged"}
        </strong>
        {blockers.length > 0 && <span className="mt-0.5 block text-ink-soft">{blockers.join(" · ")}</span>}
      </p>
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Growth strategy" subtitle="Strengths x Opportunities">
          <InsightList items={growth} empty="Add opportunities in the SWOT to build growth moves." />
          {note("growth")}
        </Panel>
        <Panel title="Risk mitigation" subtitle="Strengths x Threats">
          <InsightList items={risk} empty="Add threats in the SWOT to build defenses." />
          {note("risk")}
        </Panel>
        <Panel title="Fix the foundation" subtitle="Weaknesses, most urgent first">
          <InsightList items={remediate} empty="Add weaknesses in the SWOT to build a fix-it order." />
          {note("remediate")}
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Module 5: Money mission                                             */
/* ------------------------------------------------------------------ */

export function MissionCard({ text, name }: { text: string; name?: string }) {
  return (
    <figure className="rounded-2xl bg-water-deep p-6 text-white shadow-md md:p-8">
      <figcaption className="font-[family-name:var(--font-ui)] text-[11px] font-semibold uppercase tracking-[0.25em] text-white">Money mission statement</figcaption>
      <blockquote className="mt-4 text-xl leading-snug md:text-2xl">{text ? <>“{text}”</> : <span className="text-white">Build the statement on the left to see it here.</span>}</blockquote>
      {name && <p className="mt-5 font-[family-name:var(--font-ui)] text-sm text-white">— {name}</p>}
    </figure>
  );
}

export function ModuleMission({ plan, set, missionText }: ModuleProps & { missionText: string }) {
  const m = plan.mission;
  const setMission = (patch: Partial<typeof m>) => set({ ...plan, mission: { ...m, ...patch } });
  const pool = Array.from(new Set([...plan.client.values, ...m.values]));
  const toggle = (v: string) => setMission({ values: m.values.includes(v) ? m.values.filter((x) => x !== v) : [...m.values, v] });
  return (
    <div className="flex flex-col gap-6">
      <ModuleHead step={5} title="Money mission statement" desc="Combine the client's values with their vision into one sentence they can come back to when decisions get hard." />
      <div className="grid gap-6 lg:grid-cols-5">
        <Panel title="Guided builder" className="lg:col-span-2">
          <label className={labelCls}>
            1. Opening word
            <Select value={m.verb} onChange={(e) => setMission({ verb: e.target.value })}>
              {["Stewarding", "Building", "Growing", "Directing", "Multiplying"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </Select>
          </label>
          <div>
            <p className="mb-1.5 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">2. Guiding values (from step 1)</p>
            {pool.length === 0 ? (
              <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">Add core values in step 1.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {pool.map((v) => (
                  <Pill key={v} active={m.values.includes(v)} onClick={() => toggle(v)}>
                    {v}
                  </Pill>
                ))}
              </div>
            )}
          </div>
          <label className={labelCls}>
            3. What are they working toward?
            <TextInput value={m.vision} onChange={(e) => setMission({ vision: e.target.value })} placeholder="financial independence" />
          </label>
          {plan.goals.length > 0 && (
            <div className="-mt-2 flex flex-wrap gap-1">
              {plan.goals.slice(0, 5).map((g) => (
                <Pill key={g.id} onClick={() => setMission({ vision: g.name.toLowerCase() })}>
                  use: {g.name}
                </Pill>
              ))}
            </div>
          )}
          <label className={labelCls}>
            4. Who it provides for
            <TextInput value={m.beneficiaries} onChange={(e) => setMission({ beneficiaries: e.target.value })} placeholder="my family and community" />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className={`${labelCls} col-span-2`}>
              5. Legacy
              <TextInput value={m.legacy} onChange={(e) => setMission({ legacy: e.target.value })} placeholder="generational impact" />
            </label>
            <label className={labelCls}>
              By age
              <TextInput inputMode="numeric" value={m.age} onChange={(e) => setMission({ age: e.target.value.replace(/[^0-9]/g, "") })} placeholder="45" />
            </label>
          </div>
          <label className={labelCls}>
            Final wording (optional)
            <TextArea rows={3} value={m.custom} onChange={(e) => setMission({ custom: e.target.value })} placeholder="Edit the final statement in the client's own words..." />
            <span className="font-normal">Leave blank to use the sentence built above.</span>
          </label>
          {!m.custom && missionText && (
            <Button variant="secondary" onClick={() => setMission({ custom: missionText })}>
              Copy the built sentence into the editor
            </Button>
          )}
        </Panel>
        <div className="flex flex-col gap-5 lg:col-span-3">
          <MissionCard text={missionText} name={plan.client.name} />
          <Panel title="How to use it">
            <ul className="flex list-disc flex-col gap-2 pl-5 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              <li>Read it at the start of every money date, before looking at balances.</li>
              <li>Use it as a filter: does this purchase, trade, or job offer move you toward the sentence?</li>
              <li>Revisit it every year alongside the SWOT refresh in the roadmap.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
