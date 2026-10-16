import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/Field";
import { Bar, Empty, ModuleHead, MoneyField, Panel, ProjectionChart, Tile } from "./parts";
import type { ModuleProps } from "./PlanModules";
import {
  DAYS,
  HOURS,
  PHASES,
  RISK_PROFILES,
  SCHED_CATS,
  STATUSES,
  fmtK,
  fmtPct,
  fmtUsd,
  generateRoadmap,
  hourLabel,
  num,
  solveMonthlyFor,
  uid,
  vehicleGrowth,
  type McResult,
  type Phase,
  type Status,
  type WealthPlan,
} from "../../lib/wealthMath";
import { INCOME_COLS, INCOME_ROWS, VEHICLES } from "../../lib/wealthContent";

type Tab = "model" | "edu" | "sched" | "road";
const TABS: { id: Tab; label: string }[] = [
  { id: "model", label: "Projection" },
  { id: "edu", label: "Education hub" },
  { id: "sched", label: "Weekly schedule" },
  { id: "road", label: "Roadmap" },
];

const labelCls = "flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft";

export function ModuleExecution({
  plan,
  set,
  sim,
  target,
  tab,
  setTab,
}: ModuleProps & { sim: McResult; target: number; tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <ModuleHead step={7} title="Model, learn, and act" desc="Stress test the plan, show how accounts work, fit it into a real week, and commit to next steps." />
      <div role="tablist" aria-label="Step 7 sections" className="flex gap-1 overflow-x-auto rounded-xl bg-parchment-deep p-1">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`exec-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`exec-panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`min-w-[120px] flex-1 whitespace-nowrap rounded-lg px-3 py-2 font-[family-name:var(--font-ui)] text-sm font-medium transition-colors ${
              tab === t.id ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"
            }`}
          >
            <span className="mr-1.5 text-xs text-clay-text">{String.fromCharCode(65 + i)}</span>
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`exec-panel-${tab}`} aria-labelledby={`exec-tab-${tab}`}>
        {tab === "model" && <ModelTab plan={plan} set={set} sim={sim} target={target} />}
        {tab === "edu" && <EducationTab plan={plan} />}
        {tab === "sched" && <ScheduleTab plan={plan} set={set} />}
        {tab === "road" && <RoadmapTab plan={plan} set={set} sim={sim} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* A: the projection                                                   */
/* ------------------------------------------------------------------ */

function ModelTab({ plan, set, sim, target }: ModuleProps & { sim: McResult; target: number }) {
  const m = plan.model;
  const setModel = (patch: Partial<typeof m>) => set({ ...plan, model: { ...m, ...patch } });
  const [solve, setSolve] = useState<number | null | undefined>(undefined);
  // A solved amount is only true for the inputs it was solved with.
  const inputsKey = [m.initial, m.monthly, m.years, m.ret, m.vol, m.goalId, m.customTarget, m.real, m.inflation].join("|");
  const [solvedFor, setSolvedFor] = useState("");
  const answer = solvedFor === inputsKey ? solve : undefined;

  const goal = plan.goals.find((g) => g.id === m.goalId);
  const prob = sim.prob;
  const probTone = prob == null ? undefined : prob >= 0.8 ? "good" : prob >= 0.6 ? "warn" : "bad";
  const gap = sim.final.p50 - target;
  const profile = RISK_PROFILES.find((r) => r.name === plan.client.risk);
  const params = {
    initial: num(m.initial),
    monthly: num(m.monthly),
    years: num(m.years) || 1,
    ret: num(m.ret),
    vol: num(m.vol),
    target,
    inflation: num(m.inflation),
    real: !!m.real,
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <Panel title="Model inputs">
        <MoneyField label="Starting balance" prefix="$" value={m.initial} onChange={(v) => setModel({ initial: v })} />
        <MoneyField label="Monthly contribution" prefix="$" value={m.monthly} onChange={(v) => setModel({ monthly: v })} />
        <MoneyField label="Time horizon" suffix="yrs" value={m.years} onChange={(v) => setModel({ years: v })} hint="1 to 60 years" />
        <div className="grid grid-cols-2 gap-3">
          <MoneyField label="Expected return" suffix="%" value={m.ret} onChange={(v) => setModel({ ret: v })} />
          <MoneyField label="Volatility" suffix="%" value={m.vol} onChange={(v) => setModel({ vol: v })} />
        </div>
        {profile && (
          <button
            type="button"
            onClick={() => setModel({ ret: profile.ret, vol: profile.vol })}
            className="rounded-lg border border-line px-3 py-2 text-left font-[family-name:var(--font-ui)] text-xs text-ink-soft hover:bg-parchment-deep hover:text-ink"
          >
            Use the <strong className="text-ink">{profile.name}</strong> assumptions ({profile.ret}% return, {profile.vol}% swings)
          </button>
        )}
        <label className={labelCls}>
          Target goal (from step 2)
          <select
            value={m.goalId}
            onChange={(e) => setModel({ goalId: e.target.value })}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink focus:border-water focus:outline-none"
          >
            <option value="">No target</option>
            {plan.goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({fmtK(num(g.amount))})
              </option>
            ))}
            <option value="custom">Custom target...</option>
          </select>
        </label>
        {m.goalId === "custom" && <MoneyField label="Custom target" prefix="$" value={m.customTarget} onChange={(v) => setModel({ customTarget: v })} />}
        {goal && num(goal.horizon) > 0 && num(goal.horizon) !== num(m.years) && (
          <button type="button" onClick={() => setModel({ years: Math.round(num(goal.horizon)) })} className="text-left font-[family-name:var(--font-ui)] text-xs text-water-deep underline underline-offset-2">
            Match the horizon to the goal ({goal.horizon} yrs)
          </button>
        )}
        <div className="flex items-center justify-between gap-3 rounded-lg bg-parchment-deep px-3 py-2 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          <label className="flex items-center gap-2 text-ink">
            <input type="checkbox" checked={!!m.real} onChange={(e) => setModel({ real: e.target.checked })} className="h-4 w-4 accent-[var(--color-water-deep)]" />
            Today's dollars
          </label>
          <label className="flex items-center gap-1">
            inflation
            <input
              aria-label="Inflation percent"
              value={m.inflation}
              onChange={(e) => setModel({ inflation: e.target.value })}
              className="w-12 rounded border border-line bg-surface px-1.5 py-0.5 text-right tabular-nums text-ink"
            />
            %
          </label>
        </div>
        <Button variant="secondary" onClick={() => setModel({ seed: Math.floor(Math.random() * 1e9) })}>
          Redraw the market paths
        </Button>
      </Panel>

      <div className="flex min-w-0 flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Tile label="10th percentile" value={fmtK(sim.final.p10)} sub="Conservative" tone="bad" />
          <Tile label="Median" value={fmtK(sim.final.p50)} sub="Expected" />
          <Tile label="90th percentile" value={fmtK(sim.final.p90)} sub="Optimistic" tone="good" />
          <Tile label="Chance of success" value={prob == null ? "n/a" : fmtPct(prob)} sub={target ? `Paths ending at ${fmtK(target)} or more` : "Pick a target goal"} tone={probTone} />
        </div>
        <Panel title={`Projected balance over ${sim.years} years`} subtitle={`2,000 simulated market paths · ${m.real ? "today's dollars" : "future dollars"}`}>
          <ProjectionChart data={sim.data} target={target} caption={`Projected balance over ${sim.years} years: median ${fmtUsd(sim.final.p50)}`} />
        </Panel>
        <Panel title="What it means">
          <div className="grid gap-5 font-[family-name:var(--font-ui)] text-sm text-ink-soft md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <p>
                In 9 of 10 simulated markets the balance finishes above <b className="text-ink">{fmtUsd(sim.final.p10)}</b>. The median path reaches{" "}
                <b className="text-ink">{fmtUsd(sim.final.p50)}</b> from <b className="text-ink">{fmtUsd(sim.contributed)}</b> put in.
              </p>
              {target > 0 && (
                <p>
                  Against the {fmtUsd(target)} target, the median shows a{" "}
                  <b className={gap >= 0 ? "text-river-1" : "text-red-700"}>
                    {gap >= 0 ? "surplus" : "shortfall"} of {fmtUsd(Math.abs(gap))}
                  </b>
                  .
                </p>
              )}
            </div>
            <div className="rounded-lg bg-parchment-deep p-4">
              <p className="mb-1 font-semibold text-ink">Monthly amount for an 80% chance</p>
              {target > 0 ? (
                answer === undefined ? (
                  <Button
                    onClick={() => {
                      setSolve(solveMonthlyFor(0.8, params));
                      setSolvedFor(inputsKey);
                    }}
                  >
                    Work it out
                  </Button>
                ) : answer === null ? (
                  <p className="text-red-700">Not reachable in this time with these assumptions.</p>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <p>
                      <b className="text-2xl tabular-nums text-ink">{fmtUsd(answer)}</b>
                      <span> a month</span>
                    </p>
                    <Button variant="secondary" onClick={() => setModel({ monthly: String(answer) })}>
                      Use this
                    </Button>
                  </div>
                )
              ) : (
                <p>Choose a target goal to work this out.</p>
              )}
            </div>
          </div>
          <p className="font-[family-name:var(--font-ui)] text-[11px] text-ink-soft">
            Method: monthly geometric Brownian motion with contributions added at each month end. A hypothetical illustration for learning, not a promise of future
            results.
          </p>
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* B: the education hub                                                */
/* ------------------------------------------------------------------ */

function EducationTab({ plan }: { plan: WealthPlan }) {
  const [years, setYears] = useState("30");
  const [rate, setRate] = useState("7");
  const [income, setIncome] = useState(plan.client.income || "2600");
  const growth = vehicleGrowth(num(years) || 1, num(rate));
  const topValue = Math.max(1, ...growth.map((g) => g.value));
  const inc = num(income);
  const split = [
    { k: "Needs", p: 0.5, c: "var(--color-water-deep)", d: "Rent, utilities, groceries, insurance, minimum payments" },
    { k: "Wants", p: 0.3, c: "var(--color-gold)", d: "Dining out, travel, subscriptions, upgrades" },
    { k: "Save and invest", p: 0.2, c: "var(--color-river-1)", d: "Emergency fund, debt payoff beyond minimums, Roth IRA" },
  ];
  const rowKeys = Object.keys(VEHICLES[0].rows);

  return (
    <div className="flex flex-col gap-6">
      <Panel title="1. Investment vehicles" subtitle="Where each dollar can live, and why">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <caption className="sr-only">Four kinds of accounts compared</caption>
            <thead>
              <tr className="border-b border-line text-left">
                <td className="w-28" />
                {VEHICLES.map((v) => (
                  <th key={v.name} scope="col" className="px-3 py-2 font-semibold text-ink">
                    {v.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowKeys.map((rk) => (
                <tr key={rk} className="border-b border-line last:border-0">
                  <th scope="row" className="px-3 py-2 text-left align-top font-[family-name:var(--font-ui)] text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                    {rk}
                  </th>
                  {VEHICLES.map((v) => (
                    <td key={v.name} className="px-3 py-2 align-top font-[family-name:var(--font-ui)] text-ink-soft">
                      {v.rows[rk]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid items-center gap-6 border-t border-line pt-5 md:grid-cols-[1fr_240px]">
          <div>
            <p className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">Growth mechanics: one $5,000 deposit, after tax</p>
            <ul className="mt-3 flex flex-col gap-2">
              {growth.map((g) => (
                <li key={g.name} className="grid grid-cols-[130px_1fr_64px] items-center gap-3 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                  <span>{g.name}</span>
                  <Bar value={g.value / topValue} label={`${g.name} after ${years} years`} />
                  <span className="text-right font-semibold tabular-nums text-ink">{fmtK(g.value)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <MoneyField label="Years" value={years} onChange={setYears} />
            <MoneyField label="Market return" suffix="%" value={rate} onChange={setRate} />
            <p className="font-[family-name:var(--font-ui)] text-[11px] text-ink-soft">
              Assumes traditional withdrawals taxed at 15%, brokerage tax drag of 0.8% a year plus 15% on gains at sale, and savings at 4% with interest taxed at 12%.
              Illustrative only.
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="2. Cash flow and budgeting" subtitle="Two frameworks, one rule: pay the future first">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-3">
              <p className="font-semibold text-ink">50/30/20 framework</p>
              <div className="w-40">
                <MoneyField label="Monthly take-home" prefix="$" value={income} onChange={setIncome} />
              </div>
            </div>
            <div className="flex h-4 overflow-hidden rounded-full" aria-hidden="true">
              {split.map((s) => (
                <div key={s.k} style={{ width: `${s.p * 100}%`, background: s.c }} />
              ))}
            </div>
            <ul className="flex flex-col gap-2">
              {split.map((s) => (
                <li key={s.k} className="flex items-start justify-between gap-3 font-[family-name:var(--font-ui)] text-sm">
                  <span>
                    <span className="flex items-center gap-2 font-medium text-ink">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.c }} aria-hidden="true" />
                      {s.k}
                    </span>
                    <span className="ml-[18px] block text-xs text-ink-soft">{s.d}</span>
                  </span>
                  <span className="font-semibold tabular-nums text-ink">
                    {fmtUsd(inc * s.p)}
                    <span className="ml-1 font-normal text-ink-soft">({s.p * 100}%)</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-1 font-semibold text-ink">Zero based budgeting</p>
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                Income minus every assigned dollar equals zero. Each dollar gets a job before the month starts. It works well for irregular income: build the plan from
                the lowest month, then assign any windfall to goals in priority order.
              </p>
            </div>
            <div className="rounded-lg bg-parchment-deep p-4">
              <p className="mb-2 font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wider text-ink-soft">Investing first or bills first</p>
              <ol className="flex flex-col gap-1.5 font-[family-name:var(--font-ui)] text-sm">
                {(
                  [
                    ["Payday", "An automatic transfer to savings and investing fires first"],
                    ["Fixed overhead", "Rent, insurance, phone, minimum debt payments"],
                    ["Variable spending", "Whatever remains funds wants, guilt free"],
                  ] as [string, string][]
                ).map(([a, b], i) => (
                  <li key={a} className="flex gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-water-deep text-[11px] text-white">{i + 1}</span>
                    <span>
                      <b className="text-ink">{a}:</b> <span className="text-ink-soft">{b}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-2 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                Paying bills first and investing "what's left" usually means investing nothing. Many people give first (for example 10% off the top) and run 50/30/20 on
                what remains.
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="3. Income and opportunity comparison" subtitle="Trading time for money, and letting money work">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <caption className="sr-only">Four kinds of income compared</caption>
            <thead>
              <tr className="border-b border-line text-left">
                <td className="w-32" />
                {INCOME_COLS.map((c) => (
                  <th key={c.k} scope="col" className="px-3 py-2 font-semibold text-ink">
                    {c.k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INCOME_ROWS.map((rk, ri) => (
                <tr key={rk} className="border-b border-line last:border-0">
                  <th scope="row" className="px-3 py-2 text-left align-top font-[family-name:var(--font-ui)] text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                    {rk}
                  </th>
                  {INCOME_COLS.map((c) => (
                    <td key={c.k} className="px-3 py-2 align-top font-[family-name:var(--font-ui)] text-ink-soft">
                      {c.rows[ri]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="font-[family-name:var(--font-ui)] text-[11px] text-ink-soft">
          An educational overview, not tax advice. Limits and deductions reflect 2026 federal rules; confirm details with a tax professional.
        </p>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* C: the weekly schedule                                              */
/* ------------------------------------------------------------------ */

function ScheduleTab({ plan, set }: ModuleProps) {
  const sched = plan.schedule;
  const [brush, setBrush] = useState<string>("wealth");
  const painting = useRef<{ mode: string | null } | null>(null);
  const live = useRef(sched);
  useEffect(() => {
    live.current = sched;
  }, [sched]);
  const catByKey = useMemo(() => Object.fromEntries(SCHED_CATS.map((c) => [c.key, c])), []);

  useEffect(() => {
    const up = () => {
      painting.current = null;
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  const paint = (key: string, mode: string | null) => {
    const cur = live.current;
    if ((cur[key] ?? null) === mode) return;
    const next = { ...cur };
    if (mode === null) delete next[key];
    else next[key] = mode;
    live.current = next;
    set({ ...plan, schedule: next });
  };
  const cellAt = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    return el?.closest<HTMLElement>("[data-cell]")?.dataset.cell ?? null;
  };

  const counts = SCHED_CATS.map((c) => ({ ...c, hours: Object.values(sched).filter((v) => v === c.key).length }));
  const total = counts.reduce((s, c) => s + c.hours, 0);
  const max = Math.max(1, ...counts.map((c) => c.hours));
  const wealth = counts.find((c) => c.key === "wealth")!.hours;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <Panel
        title="Weekly time blocks"
        subtitle="Pick a category, then tap or drag across the hours. Tap a filled hour with the same category to clear it."
        actions={
          <Button variant="ghost" onClick={() => set({ ...plan, schedule: {} })}>
            Clear all
          </Button>
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {SCHED_CATS.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-pressed={brush === c.key}
              onClick={() => setBrush(c.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-[family-name:var(--font-ui)] text-xs font-medium transition-colors ${
                brush === c.key ? "border-water-deep bg-water-deep text-white" : "border-line text-ink-soft hover:bg-parchment-deep"
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} aria-hidden="true" />
              {c.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={brush === "erase"}
            onClick={() => setBrush("erase")}
            className={`rounded-full border px-3 py-1.5 font-[family-name:var(--font-ui)] text-xs font-medium ${
              brush === "erase" ? "border-water-deep bg-water-deep text-white" : "border-line text-ink-soft hover:bg-parchment-deep"
            }`}
          >
            Erase
          </button>
        </div>
        <div className="select-none overflow-x-auto" style={{ touchAction: "pan-y" }}>
          <div
            className="grid min-w-[560px]"
            style={{ gridTemplateColumns: "40px repeat(7, minmax(0, 1fr))" }}
            onPointerDown={(e) => {
              const key = cellAt(e.clientX, e.clientY);
              if (!key) return;
              const mode = brush === "erase" || live.current[key] === brush ? null : brush;
              painting.current = { mode };
              paint(key, mode);
            }}
            onPointerMove={(e) => {
              if (!painting.current) return;
              const key = cellAt(e.clientX, e.clientY);
              if (key) paint(key, painting.current.mode);
            }}
          >
            <div />
            {DAYS.map((d) => (
              <div key={d} className="pb-1.5 text-center font-[family-name:var(--font-ui)] text-xs font-semibold text-ink-soft">
                {d}
              </div>
            ))}
            {HOURS.map((h) => (
              <div key={h} className="contents">
                <div className="pr-2 text-right font-[family-name:var(--font-ui)] text-[10px] leading-6 tabular-nums text-ink-soft">{hourLabel(h)}</div>
                {DAYS.map((d, di) => {
                  const key = `${di}-${h}`;
                  const cat = sched[key] ? catByKey[sched[key]] : null;
                  return (
                    <button
                      key={key}
                      type="button"
                      data-cell={key}
                      aria-label={`${d} ${hourLabel(h)}${cat ? `: ${cat.label}` : ": open"}`}
                      aria-pressed={!!cat}
                      // Pointer drags are handled above; a click with no pointer (the keyboard) toggles the hour.
                      onClick={(e) => {
                        if (e.detail !== 0) return;
                        paint(key, brush === "erase" || live.current[key] === brush ? null : brush);
                      }}
                      className={`m-[1.5px] h-6 rounded-[4px] ${cat ? "" : "bg-parchment-deep hover:bg-line"}`}
                      style={cat ? { background: cat.color } : undefined}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Panel>
      <div className="flex flex-col gap-6">
        <Panel title="Hours per week">
          <ul className="flex flex-col gap-3">
            {counts.map((c) => (
              <li key={c.key}>
                <p className="mb-1 flex justify-between font-[family-name:var(--font-ui)] text-sm">
                  <span className="text-ink-soft">{c.label}</span>
                  <span className="font-semibold tabular-nums text-ink">{c.hours}h</span>
                </p>
                <Bar value={c.hours / max} color={c.color} label={c.label} />
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2 border-t border-line pt-3 font-[family-name:var(--font-ui)] text-sm">
            <p>
              <span className="block text-xs text-ink-soft">Scheduled</span>
              <b className="tabular-nums text-ink">{total}h</b>
            </p>
            <p>
              <span className="block text-xs text-ink-soft">Open (6a to midnight)</span>
              <b className="tabular-nums text-ink">{HOURS.length * 7 - total}h</b>
            </p>
          </div>
        </Panel>
        <p role="status" className={`rounded-xl border bg-parchment-deep p-4 font-[family-name:var(--font-ui)] text-sm text-ink ${wealth >= 2 ? "border-river-1" : "border-clay"}`}>
          {wealth >= 2 ? (
            <>
              <b>{wealth} wealth hours a week.</b> That is about {wealth * 52} hours a year spent on the plan itself.
            </>
          ) : (
            <>
              <b>Under 2 wealth hours a week.</b> Protect at least one recurring money date so the plan has time to run.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* D: the roadmap                                                      */
/* ------------------------------------------------------------------ */

const SOURCE_LABEL: Record<string, string> = {
  Strength: "Strength",
  Weakness: "Weakness",
  Opportunity: "Opportunity",
  Threat: "Threat",
  Goal: "Goal",
  Model: "Model",
  Habit: "Habit",
};

function RoadmapTab({ plan, set, sim }: ModuleProps & { sim: McResult }) {
  const items = plan.roadmap;
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const done = items.filter((i) => i.status === "Completed").length;
  const setItems = (next: typeof items) => set({ ...plan, roadmap: next });
  const generate = () => {
    const existing = new Set(items.map((i) => i.text));
    setItems([...items, ...generateRoadmap(plan, sim).filter((i) => !existing.has(i.text))]);
  };
  const update = (id: string, status: Status) => setItems(items.map((i) => (i.id === id ? { ...i, status } : i)));

  // Moving a milestone to another time frame, by dragging its handle, with the arrow keys, or from its "Move to" menu.
  const [drag, setDrag] = useState<{ id: string; text: string; x: number; y: number; over: Phase | null; index: number } | null>(null);
  const [moved, setMoved] = useState("");
  const moveTo = (id: string, phase: Phase, index = Number.MAX_SAFE_INTEGER) => {
    const moving = items.find((i) => i.id === id);
    if (!moving) return;
    const others = items.filter((i) => i.id !== id);
    const target = others.filter((i) => i.phase === phase);
    let at = others.length;
    if (index < target.length) at = others.indexOf(target[index]);
    else if (target.length) at = others.indexOf(target[target.length - 1]) + 1;
    setItems([...others.slice(0, at), { ...moving, phase }, ...others.slice(at)]);
    setMoved(`Moved "${moving.text}" to ${phase}.`);
  };
  /** Which time frame, and which place in it, is under a point on the screen. */
  const slotAt = (x: number, y: number, dragging: string): { over: Phase | null; index: number } => {
    const col = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>("[data-phase]");
    if (!col) return { over: null, index: 0 };
    const cards = [...col.querySelectorAll<HTMLElement>("[data-card]")].filter((c) => c.dataset.card !== dragging);
    const index = cards.filter((c) => {
      const r = c.getBoundingClientRect();
      return r.top + r.height / 2 < y;
    }).length;
    return { over: col.dataset.phase as Phase, index };
  };
  // While a milestone is held near the top or bottom of the screen the page scrolls, so a far-off time frame (on a phone the
  // time frames stack) can still be reached.
  const dragging = drag?.id;
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (!dragging) return;
    let frame = 0;
    const tick = () => {
      const { x, y } = pointer.current;
      const edge = 90;
      const dy = y < edge ? -Math.ceil((edge - y) / 6) : y > window.innerHeight - edge ? Math.ceil((y - (window.innerHeight - edge)) / 6) : 0;
      if (dy) {
        window.scrollBy(0, dy);
        setDrag((d) => (d ? { ...d, ...slotAt(x, y, d.id) } : d));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // slotAt only reads the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);
  const startDrag = (e: React.PointerEvent<HTMLButtonElement>, id: string, text: string) => {
    pointer.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ id, text, x: e.clientX, y: e.clientY, over: null, index: 0 });
  };
  const moveDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    pointer.current = { x: e.clientX, y: e.clientY };
    setDrag({ ...drag, x: e.clientX, y: e.clientY, ...slotAt(e.clientX, e.clientY, drag.id) });
  };
  const endDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const slot = slotAt(e.clientX, e.clientY, drag.id);
    if (slot.over) moveTo(drag.id, slot.over, slot.index);
    setDrag(null);
  };
  const addItem = (phase: (typeof PHASES)[number]) => {
    const t = (drafts[phase] || "").trim();
    if (!t) return;
    setItems([...items, { id: uid(), phase, text: t, source: "Habit", status: "Pending" }]);
    setDrafts({ ...drafts, [phase]: "" });
  };
  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Milestone roadmap"
        subtitle="Built from the SWOT, goals, model and schedule. Tap a status to change it, and drag a milestone by its handle to another time frame."
        actions={<Button onClick={generate}>Build from my plan</Button>}
      >
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Bar value={items.length ? done / items.length : 0} color="var(--color-river-1)" label="Milestones complete" />
          </div>
          <p className="whitespace-nowrap font-[family-name:var(--font-ui)] text-sm tabular-nums text-ink-soft">
            <b className="text-ink">{done}</b> of {items.length} complete
          </p>
        </div>
        <ol className="grid grid-cols-5 gap-1 font-[family-name:var(--font-ui)]">
          {PHASES.map((p) => {
            const ph = items.filter((i) => i.phase === p);
            const allDone = ph.length > 0 && ph.every((i) => i.status === "Completed");
            const started = ph.some((i) => i.status !== "Pending");
            return (
              <li key={p} className="flex flex-col items-center text-center">
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-xs ${allDone ? "bg-river-1 text-white" : started ? "bg-gold text-ink" : "bg-line text-ink-soft"}`}
                  aria-hidden="true"
                >
                  {allDone ? "✓" : ""}
                </span>
                <span className="mt-1.5 text-xs font-semibold text-ink">{p}</span>
                <span className="text-[11px] tabular-nums text-ink-soft">
                  {ph.filter((i) => i.status === "Completed").length}/{ph.length}
                </span>
              </li>
            );
          })}
        </ol>
      </Panel>
      <p role="status" aria-live="polite" className="sr-only">
        {moved}
      </p>
      {drag && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-50 max-w-[14rem] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-water-deep bg-surface px-3 py-2 font-[family-name:var(--font-ui)] text-xs text-ink shadow-lg"
          style={{ left: drag.x, top: drag.y }}
        >
          {drag.text}
        </div>
      )}
      {items.length === 0 && <Empty>No milestones yet. Choose "Build from my plan" to create them from the earlier modules.</Empty>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {PHASES.map((p) => {
          const ph = items.filter((i) => i.phase === p);
          return (
            <section
              key={p}
              aria-label={p}
              data-phase={p}
              className={`flex flex-col rounded-xl border bg-parchment-deep/60 p-3 transition-colors ${drag?.over === p ? "border-water-deep ring-2 ring-water-deep/40" : "border-line"}`}
            >
              <header className="mb-2 flex items-center justify-between px-1">
                <h4 className="font-[family-name:var(--font-display)] text-sm font-semibold text-ink">{p}</h4>
                <span className="font-[family-name:var(--font-ui)] text-[11px] text-ink-soft">{ph.length}</span>
              </header>
              <ul className="flex min-h-12 flex-1 flex-col gap-2">
                {(() => {
                  const out: React.ReactNode[] = [];
                  let k = 0;
                  const holder = (key: string) => (
                    <li key={key} aria-hidden="true" className="h-12 rounded-lg border-2 border-dashed border-water-deep/50 bg-water-deep/5" />
                  );
                  for (const i of ph) {
                    const dragged = drag?.id === i.id;
                    if (drag?.over === p && !dragged && k === drag.index) out.push(holder(`hold-${k}`));
                    if (!dragged) k += 1;
                    out.push(
                      <li key={i.id} data-card={i.id} className={`rounded-lg border border-line bg-surface p-3 shadow-sm ${dragged ? "opacity-40" : ""}`}>
                        <div className="flex items-start justify-between gap-2">
                          <span className="flex items-center gap-1.5">
                            <button
                              type="button"
                              aria-label={`Move milestone: ${i.text}. Drag it to another time frame, or press the left or right arrow key.`}
                              onPointerDown={(e) => startDrag(e, i.id, i.text)}
                              onPointerMove={moveDrag}
                              onPointerUp={endDrag}
                              onPointerCancel={() => setDrag(null)}
                              onKeyDown={(e) => {
                                const at = PHASES.indexOf(i.phase);
                                if (e.key === "ArrowRight" && at < PHASES.length - 1) {
                                  e.preventDefault();
                                  moveTo(i.id, PHASES[at + 1]);
                                } else if (e.key === "ArrowLeft" && at > 0) {
                                  e.preventDefault();
                                  moveTo(i.id, PHASES[at - 1]);
                                } else if (e.key === "Escape") setDrag(null);
                              }}
                              style={{ touchAction: "none" }}
                              className="cursor-grab select-none rounded px-1 py-0.5 font-[family-name:var(--font-ui)] text-sm leading-none text-ink-soft hover:bg-parchment-deep hover:text-ink active:cursor-grabbing"
                            >
                              <span aria-hidden="true">⠿</span>
                            </button>
                            <span className="rounded bg-parchment-deep px-1.5 py-0.5 font-[family-name:var(--font-ui)] text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                              {SOURCE_LABEL[i.source] ?? i.source}
                            </span>
                          </span>
                          <button
                            type="button"
                            aria-label={`Remove milestone: ${i.text}`}
                            onClick={() => setItems(items.filter((x) => x.id !== i.id))}
                            className="rounded px-1.5 text-ink-soft hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                        <p className={`mt-1.5 font-[family-name:var(--font-ui)] text-sm text-ink ${i.status === "Completed" ? "line-through" : ""}`}>{i.text}</p>
                        <div className="mt-2 grid grid-cols-3 gap-0.5 rounded-md bg-parchment-deep p-0.5" role="group" aria-label="Status">
                          {STATUSES.map((st) => (
                            <button
                              key={st}
                              type="button"
                              aria-pressed={i.status === st}
                              onClick={() => update(i.id, st)}
                              className={`rounded px-1 py-1 font-[family-name:var(--font-ui)] text-[10px] font-medium leading-tight transition-colors ${
                                i.status === st ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                        <label className="mt-2 flex items-center gap-1.5 font-[family-name:var(--font-ui)] text-[11px] text-ink-soft">
                          Move to
                          <select
                            aria-label={`Move to a different time frame: ${i.text}`}
                            value={i.phase}
                            onChange={(e) => moveTo(i.id, e.target.value as Phase)}
                            className="min-w-0 flex-1 rounded border border-line bg-surface px-1.5 py-1 text-[11px] text-ink focus:border-water focus:outline-none"
                          >
                            {PHASES.map((ph2) => (
                              <option key={ph2}>{ph2}</option>
                            ))}
                          </select>
                        </label>
                      </li>,
                    );
                  }
                  if (drag?.over === p && k <= drag.index) out.push(holder("hold-end"));
                  return out;
                })()}
                {ph.length === 0 && drag?.over !== p && <li className="rounded-lg border border-dashed border-line px-3 py-4 text-center font-[family-name:var(--font-ui)] text-xs text-ink-soft">Drop a milestone here</li>}
              </ul>
              <div className="mt-2 flex gap-1.5">
                <TextInput
                  aria-label={`Add a step to ${p}`}
                  placeholder="Add step"
                  value={drafts[p] || ""}
                  onChange={(e) => setDrafts({ ...drafts, [p]: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && addItem(p)}
                  className="min-w-0 flex-1 !px-2 !py-1.5 !text-xs"
                />
                <button
                  type="button"
                  aria-label={`Add step to ${p}`}
                  onClick={() => addItem(p)}
                  className="rounded-md bg-water-deep px-2.5 text-white hover:opacity-90"
                >
                  +
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

