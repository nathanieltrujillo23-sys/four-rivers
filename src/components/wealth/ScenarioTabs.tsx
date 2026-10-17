import { useMemo } from "react";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/Field";
import { LineChartMulti, TornadoChart } from "./charts";
import { HowCalculated, Panel, Tile } from "./parts";
import type { ModuleProps } from "./PlanModules";
import { fmtK, fmtPct, fmtUsd, num, uid } from "../../lib/wealthMath";
import { SCENARIO_FIELDS, defaultScenarios, runScenarios, sensitivity, type Scenario } from "../../lib/wealthScenarios";

const COLORS = ["var(--color-ink)", "var(--color-river-1)", "#d9534f", "var(--color-gold)", "var(--color-water-deep)", "var(--color-clay)"];
const cell =
  "w-full min-w-0 rounded-lg border border-line bg-surface px-2 py-1.5 font-[family-name:var(--font-ui)] text-sm tabular-nums text-ink focus:border-water focus:outline-none";

/** Saved versions of the client's model, run side by side. */
export function ScenariosTab({ plan, set }: ModuleProps) {
  const list = plan.scenarios.list;
  const setList = (next: Scenario[]) => set({ ...plan, scenarios: { list: next } });
  const results = useMemo(() => runScenarios(plan), [plan]);
  const upd = (id: string, patch: Partial<Scenario>) => setList(list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const setOverride = (id: string, key: string, v: string) => {
    const s = list.find((x) => x.id === id)!;
    const overrides = { ...s.overrides };
    if (v.trim()) overrides[key as keyof typeof overrides] = v.replace(/[^0-9.]/g, "");
    else delete overrides[key as keyof typeof overrides];
    upd(id, { overrides });
  };
  const years = Math.max(1, Math.round(num(plan.model.years) || 1));
  const labels = Array.from({ length: Math.max(...results.map((r) => r.sim.data.length), 2) }, (_, i) => `Yr ${i}`);

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Scenarios"
        subtitle="Keep versions of the model (the plan as it is, a better market, a worse one, or your own) and compare them side by side. A blank box means the same as the plan's model."
        actions={
          <div className="flex flex-wrap gap-2">
            {list.length === 0 && <Button onClick={() => setList(defaultScenarios(plan.model, uid))}>Create base, upside and downside</Button>}
            {list.length < 6 && list.length > 0 && (
              <Button variant="secondary" onClick={() => setList([...list, { id: uid(), name: `Scenario ${list.length + 1}`, overrides: {}, note: "" }])}>
                Add a scenario
              </Button>
            )}
          </div>
        }
      >
        {list.length === 0 ? (
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">No scenarios yet. Start with the usual three, then change any number.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse font-[family-name:var(--font-ui)] text-sm">
              <caption className="sr-only">Scenario inputs</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-soft">
                  <th className="py-2 pr-2 font-medium">Name</th>
                  {SCENARIO_FIELDS.map(([k, label]) => (
                    <th key={k} className="py-2 pr-2 font-medium">
                      {label}
                    </th>
                  ))}
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {list.map((s, i) => (
                  <tr key={s.id} className="border-b border-line/60 align-top">
                    <td className="py-1.5 pr-2">
                      <TextInput aria-label={`Scenario ${i + 1} name`} value={s.name} maxLength={40} onChange={(e) => upd(s.id, { name: e.target.value })} className="!py-1.5 !text-sm" />
                    </td>
                    {SCENARIO_FIELDS.map(([k, label]) => (
                      <td key={k} className="py-1.5 pr-2">
                        <input
                          aria-label={`${s.name} ${label}`}
                          inputMode="decimal"
                          value={s.overrides[k] ?? ""}
                          placeholder={String(plan.model[k] ?? "")}
                          onChange={(e) => setOverride(s.id, k, e.target.value)}
                          className={cell}
                        />
                      </td>
                    ))}
                    <td className="py-1.5 text-right">
                      <Button variant="ghost" onClick={() => setList(list.filter((x) => x.id !== s.id))} aria-label={`Remove ${s.name}`}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {results.length > 0 && (
        <>
          <div className={`grid gap-4 ${results.length === 1 ? "sm:grid-cols-1" : results.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
            {results.map((r, i) => (
              <div key={r.scenario.id} className="panel flex flex-col gap-1 p-4">
                <p className="flex items-center gap-2 font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
                  <span aria-hidden="true" className="inline-block h-2.5 w-4 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {r.scenario.name}
                </p>
                <p className="font-[family-name:var(--font-ui)] text-2xl font-semibold tabular-nums text-ink">{fmtUsd(r.sim.final.p50)}</p>
                <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                  median after {Math.round(num(r.model.years))} years; {fmtK(r.sim.final.p10)} to {fmtK(r.sim.final.p90)} in the middle 80%
                </p>
                <p className="font-[family-name:var(--font-ui)] text-xs text-ink">
                  {r.target > 0 ? `Chance of reaching ${fmtK(r.target)}: ${r.sim.prob == null ? "n/a" : fmtPct(r.sim.prob)}` : "Pick a goal in the Projection tab to see the chance of reaching it."}
                </p>
                <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{r.changes.length ? r.changes.join("; ") : "The plan as it is."}</p>
              </div>
            ))}
          </div>
          <Panel title="Median balance in each scenario">
            <LineChartMulti
              labels={labels}
              series={results.map((r, i) => ({ name: r.scenario.name, values: r.sim.data.map((p) => p.p50), color: COLORS[i % COLORS.length], width: i === 0 ? 3 : 2.2 }))}
              caption={`Median balance by year for ${results.map((r) => r.scenario.name).join(", ")}`}
              every={Math.max(1, Math.round(years / 6))}
            />
          </Panel>
          <Panel title="What each scenario stands for" subtitle="Your words, shown on the Base, upside and downside slide.">
            <div className="grid gap-3 md:grid-cols-3">
              {list.map((s) => (
                <label key={s.id} className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
                  {s.name}
                  <textarea
                    rows={3}
                    value={s.note}
                    maxLength={200}
                    onChange={(e) => upd(s.id, { note: e.target.value })}
                    className="min-h-16 resize-y rounded-lg border border-line bg-surface px-3 py-2 font-[family-name:var(--font-ui)] text-sm text-ink focus:border-water focus:outline-none"
                  />
                </label>
              ))}
            </div>
          </Panel>
          <HowCalculated
            steps={[
              "Each scenario runs the plan's Monte Carlo model (1,000 simulated paths, the plan's seed) with the inputs it changes; every other input is the plan's own.",
              "Using the same seed means a difference between two scenarios comes from the inputs, not from random draws.",
              "The chance of reaching the goal is the share of paths that end at or above it. A scenario is an illustration of 'what if', not a forecast.",
            ]}
          />
        </>
      )}
    </div>
  );
}

/** Which assumptions move the outcome most. */
export function SensitivityTab({ plan }: Pick<ModuleProps, "plan">) {
  const r = useMemo(() => sensitivity(plan), [plan]);
  const ready = num(plan.model.initial) + num(plan.model.monthly) > 0;
  return (
    <div className="flex flex-col gap-6">
      {!ready ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center font-[family-name:var(--font-ui)] text-sm text-ink-soft">Enter a starting balance or a monthly amount in the Projection tab to see which assumptions matter most.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <Tile label="Median ending balance" value={fmtUsd(r.baseMedian)} sub={`after ${Math.round(num(plan.model.years) || 1)} years`} />
            <Tile label="Biggest swing" value={r.rows[0]?.label ?? "n/a"} sub={r.rows[0] ? `${fmtK(r.rows[0].swing)} between adverse and favorable` : ""} />
            <Tile label="Chance of the goal" value={r.baseProb == null ? "n/a" : fmtPct(r.baseProb)} sub="in the base case" />
          </div>
          <Panel title="What moves the outcome most" subtitle="One assumption at a time, to an adverse and a favorable value, with everything else held at the plan's numbers. The longest bars are the assumptions worth discussing first.">
            <TornadoChart
              rows={r.rows.map((x) => ({ label: x.label, adverse: x.adverseMedian, favorable: x.favorableMedian, adverseText: x.adverse, favorableText: x.favorable }))}
              base={r.baseMedian}
              caption="Tornado chart of the median ending balance for each assumption"
            />
          </Panel>
          <Panel title="The same, in numbers">
            <table className="w-full border-collapse font-[family-name:var(--font-ui)] text-sm">
              <caption className="sr-only">Sensitivity of the outcome to each assumption</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-soft">
                  <th className="py-2 pr-3 font-medium">Assumption</th>
                  <th className="py-2 pr-3 text-right font-medium">Adverse</th>
                  <th className="py-2 pr-3 text-right font-medium">Median</th>
                  <th className="py-2 pr-3 text-right font-medium">Favorable</th>
                  <th className="py-2 text-right font-medium">Median</th>
                </tr>
              </thead>
              <tbody>
                {r.rows.map((x) => (
                  <tr key={x.id} className="border-b border-line/60">
                    <td className="py-2 pr-3">{x.label}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{x.adverse}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmtUsd(x.adverseMedian)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{x.favorable}</td>
                    <td className="py-2 text-right tabular-nums">{fmtUsd(x.favorableMedian)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <HowCalculated
            steps={[
              "Return moves 1.5 points either way, volatility 4 points, monthly saving and starting balance 25%, the time invested 5 years, and inflation 1.5 points (only when the projection is in today's dollars).",
              "Each case reruns the plan's Monte Carlo model (1,000 paths, the plan's seed) with only that one input changed, and records the median ending balance.",
              "The swing is the gap between the favorable and adverse medians; rows are sorted by it. Changing one input at a time ignores how inputs interact.",
            ]}
          />
        </>
      )}
    </div>
  );
}
