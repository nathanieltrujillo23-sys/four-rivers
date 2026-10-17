import { useMemo } from "react";
import { LineChartMulti } from "./charts";
import { MoneyField, Panel, Tile } from "./parts";
import type { ModuleProps } from "./PlanModules";
import { fmtK, fmtPct, fmtUsd, num } from "../../lib/wealthMath";
import { runLifecycle } from "../../lib/wealthPortfolio";

/** Saving until retirement, then spending: does the money last? Run in today's dollars so spending can be compared at face value. */
export function RetirementTab({ plan, set }: ModuleProps) {
  const r = plan.retirement;
  const setR = (patch: Partial<typeof r>) => set({ ...plan, retirement: { ...r, ...patch } });
  const age = num(plan.client.age);
  const retireAge = num(r.age);
  const spend = num(r.spend);
  const ready = age > 0 && retireAge > age && spend > 0;
  const m = plan.model;
  const sim = useMemo(
    () =>
      ready
        ? runLifecycle({
            currentAge: age,
            retireAge,
            lengthYears: num(r.length) || 30,
            initial: num(m.initial),
            monthly: num(m.monthly),
            ret: num(m.ret),
            vol: num(m.vol),
            inflation: num(m.inflation),
            spend,
            income: num(r.income),
          })
        : null,
    [ready, age, retireAge, r.length, m.initial, m.monthly, m.ret, m.vol, m.inflation, spend, r.income],
  );
  const tone = !sim ? undefined : sim.success >= 0.85 ? "good" : sim.success >= 0.65 ? "warn" : "bad";
  const at = sim?.points ?? [];
  const guide = sim?.withdrawalRate;

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <Panel title="Retirement inputs" subtitle="Everything is in today's dollars. Saving and spending are assumed to keep up with inflation.">
        <MoneyField label="Client's age now" value={plan.client.age} onChange={(v) => set({ ...plan, client: { ...plan.client, age: v.replace(/[^0-9]/g, "") } })} hint="From the Client step." />
        <MoneyField label="Retirement age" value={r.age} onChange={(v) => setR({ age: v.replace(/[^0-9]/g, "") })} />
        <MoneyField label="Yearly spending in retirement" prefix="$" value={r.spend} onChange={(v) => setR({ spend: v })} placeholder="60,000" />
        <MoneyField label="Social Security or pension, per year" prefix="$" value={r.income} onChange={(v) => setR({ income: v })} placeholder="20,000" hint="Starts at retirement." />
        <MoneyField label="Years retirement should last" value={r.length} onChange={(v) => setR({ length: v.replace(/[^0-9]/g, "") })} hint="Plan to 90 or 95 to be safe." />
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">Uses the starting balance, monthly saving, return and volatility from the Projection tab.</p>
      </Panel>

      <div className="flex min-w-0 flex-col gap-6">
        {!sim ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            Enter the client's age (in the Client step), a retirement age later than that, and the yearly spending to see whether the money lasts.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Tile label="Chance the money lasts" value={fmtPct(sim.success)} sub={`to age ${retireAge + (num(r.length) || 30)}`} tone={tone} />
              <Tile label="At retirement (median)" value={fmtK(sim.atRetirement.p50)} sub={`${fmtK(sim.atRetirement.p10)} to ${fmtK(sim.atRetirement.p90)}`} />
              <Tile label="First year's withdrawal" value={guide == null ? "n/a" : `${(Math.round(guide * 10) / 10).toString()}%`} sub={guide == null ? "income covers spending" : "of the median balance; 4% is a common guide"} tone={guide == null ? undefined : guide <= 4 ? "good" : guide <= 5.5 ? "warn" : "bad"} />
              <Tile label="Needed from savings" value={`${fmtUsd(Math.max(0, spend - num(r.income)))} a year`} sub="spending less other income" />
            </div>
            <Panel title="Balance from now through retirement" subtitle="Median, and the best and worst tenth, in today's dollars. The turn downward is when withdrawals begin.">
              <LineChartMulti
                labels={at.map((p) => `Age ${p.age}`)}
                series={[
                  { name: "90th percentile", values: at.map((p) => p.p90), color: "var(--color-river-1)" },
                  { name: "Median", values: at.map((p) => p.p50), color: "var(--color-ink)", width: 3 },
                  { name: "10th percentile", values: at.map((p) => p.p10), color: "#d9534f" },
                ]}
                caption={`Balance by age: median ${fmtUsd(sim.atRetirement.p50)} at retirement`}
                every={10}
              />
            </Panel>
            <Panel title="What it means">
              <ul className="flex list-disc flex-col gap-2 pl-5 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                <li>
                  In {fmtPct(sim.success)} of {1000} simulated markets the money lasted the whole retirement. {sim.success < 0.8 ? "Below about 80%, advisors usually look at saving more, retiring later, spending less, or all three." : "That is a comfortable margin."}
                </li>
                <li>
                  <b className="text-ink">Sequence risk:</b> a market fall in the first years of withdrawals does far more damage than the same fall later, because money is taken out while prices are low. That is why the worst tenth of paths falls so quickly after retirement.
                </li>
                <li>Social Security claiming age, taxes on withdrawals, health care costs and long-term care are not modeled here; each can change the answer.</li>
              </ul>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
