import { useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { Select, TextInput } from "../ui/Field";
import { FrontierChart, LineChartMulti } from "./charts";
import { ModuleHead, Panel, Pill, Tile } from "./parts";
import type { ModuleProps } from "./PlanModules";
import { stepNo } from "./steps";
import { CMA_GUIDELINES, CMA_REFERENCES, STRESS_NOTE } from "../../lib/wealthReferences";
import { assessRisk } from "../../lib/wealthRisk";
import { RISK_PROFILES, fmtK, fmtUsd, num, simulatePlan, snapshotMetrics, type WealthPlan } from "../../lib/wealthMath";
import {
  BENCHMARK_WEIGHTS,
  CLASS_IDS,
  MODEL_PORTFOLIOS,
  STRESS_DEFAULTS,
  corrKey,
  correlationsAdjusted,
  efficientFrontier,
  emptyPortfolio,
  feeDragSeries,
  portfolioStats,
  rebalanceAfter,
  scenarioReturns,
  stressTests,
  weightTotal,
  weightsOf,
  withWeights,
  type ClassId,
  type PortfolioData,
} from "../../lib/wealthPortfolio";

type Tab = "assumptions" | "allocation" | "frontier" | "stress" | "fees";
const TABS: { id: Tab; label: string }[] = [
  { id: "assumptions", label: "Assumptions and sources" },
  { id: "allocation", label: "Allocation" },
  { id: "frontier", label: "Efficient frontier" },
  { id: "stress", label: "Stress tests" },
  { id: "fees", label: "Fees and rebalancing" },
];

const cell =
  "w-full min-w-0 rounded-lg border border-line bg-surface px-2 py-1.5 font-[family-name:var(--font-ui)] text-sm tabular-nums text-ink focus:border-water focus:outline-none";
const pct1 = (n: number) => `${(Math.round(n * 10) / 10).toString()}%`;

/** The portfolio value the stress tests and the rebalancing example are run on: the client's investments, or the model's start. */
function testValue(plan: ModuleProps["plan"]): number {
  const m = snapshotMetrics(plan);
  return m.investable > 0 ? m.investable : num(plan.model.initial) > 0 ? num(plan.model.initial) : 10000;
}

/** The step where the investment layer is built: assumptions, allocation, the frontier, stress tests, and costs. */
export function PortfolioStep({ plan, set }: ModuleProps) {
  const [tab, setTab] = useState<Tab>("assumptions");
  const pf = plan.portfolio;
  const setPf = (next: PortfolioData) => set({ ...plan, portfolio: next });
  const risk = assessRisk(plan, simulatePlan(plan).target);
  const profileName = risk.inUse ?? plan.client.risk;

  return (
    <div className="flex flex-col gap-6">
      <ModuleHead
        step={stepNo("portfolio")}
        title="Portfolio"
        desc="Build the investments from capital market assumptions you enter and cite, then test them: risk and return, the efficient frontier, historical stress, and what costs and drift do."
      />
      {!pf.started && (
        <Panel title="Start a portfolio" subtitle="Begin from a model portfolio for a risk profile, then change any weight. Nothing here is advice; it is a way to practice the work.">
          <div className="flex flex-wrap gap-2">
            {RISK_PROFILES.map((p) => (
              <Button key={p.name} variant={p.name === profileName ? "primary" : "secondary"} onClick={() => setPf(withWeights(pf, MODEL_PORTFOLIOS[p.name]))}>
                {p.name}
                {p.name === profileName ? " (the plan's profile)" : ""}
              </Button>
            ))}
          </div>
        </Panel>
      )}

      <div role="tablist" aria-label="Portfolio sections" className="flex gap-1 overflow-x-auto rounded-xl bg-parchment-deep p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`pf-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`pf-panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`min-w-[120px] flex-1 whitespace-nowrap rounded-lg px-3 py-2 font-[family-name:var(--font-ui)] text-sm font-medium transition-colors ${tab === t.id ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`pf-panel-${tab}`} aria-labelledby={`pf-tab-${tab}`}>
        {tab === "assumptions" && <AssumptionsTab pf={pf} setPf={setPf} />}
        {tab === "allocation" && <AllocationTab plan={plan} set={set} pf={pf} setPf={setPf} profileName={profileName} />}
        {tab === "frontier" && <FrontierTab pf={pf} />}
        {tab === "stress" && <StressTab plan={plan} pf={pf} setPf={setPf} />}
        {tab === "fees" && <FeesTab plan={plan} pf={pf} setPf={setPf} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AssumptionsTab({ pf, setPf }: { pf: PortfolioData; setPf: (p: PortfolioData) => void }) {
  const [confirm, setConfirm] = useState(false);
  const setClass = (id: ClassId, patch: Partial<PortfolioData["classes"][number]>) => setPf({ ...pf, classes: pf.classes.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const adjusted = correlationsAdjusted(pf);
  return (
    <div className="flex flex-col gap-6">
      <p role="note" className="rounded-xl border border-clay bg-parchment-deep px-5 py-4 font-[family-name:var(--font-ui)] text-sm text-ink">
        <strong>The starting numbers are round, illustrative placeholders.</strong> They are not a forecast and not any firm's view. Replace them with a published set, and record the source below. The guidelines under the tables explain how.
      </p>

      <Panel title="Capital market assumptions" subtitle="Expected compound return and volatility for each asset class, as published by your source.">
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
          <label className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
            Source (name and year)
            <TextInput value={pf.source} onChange={(e) => setPf({ ...pf, source: e.target.value })} placeholder="e.g. the firm's 2026 long-term capital market assumptions" />
          </label>
          <label className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
            As of
            <TextInput type="date" value={pf.asOf} onChange={(e) => setPf({ ...pf, asOf: e.target.value })} />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <caption className="sr-only">Expected return and volatility by asset class</caption>
            <thead>
              <tr className="border-b border-line text-left font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-wider text-ink-soft">
                <th scope="col" className="px-2 py-2 font-semibold">
                  Asset class
                </th>
                <th scope="col" className="w-32 px-2 py-2 font-semibold">
                  Return (% a year)
                </th>
                <th scope="col" className="w-32 px-2 py-2 font-semibold">
                  Volatility (%)
                </th>
              </tr>
            </thead>
            <tbody>
              {pf.classes.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <th scope="row" className="px-2 py-1.5 text-left font-[family-name:var(--font-ui)] text-sm font-medium text-ink">
                    {c.name}
                  </th>
                  <td className="px-2 py-1.5">
                    <input aria-label={`Expected return of ${c.name}`} inputMode="decimal" className={cell} value={c.ret} onChange={(e) => setClass(c.id, { ret: e.target.value })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input aria-label={`Volatility of ${c.name}`} inputMode="decimal" className={cell} value={c.vol} onChange={(e) => setClass(c.id, { vol: e.target.value })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Correlations" subtitle="How closely two classes move together: 1 is in step, 0 is unrelated, below 0 is opposite. Fill in the top right; the rest mirrors.">
        <div className="overflow-x-auto">
          <table className="min-w-[640px] text-xs">
            <caption className="sr-only">Correlation of each asset class with each other</caption>
            <thead>
              <tr>
                <td />
                {pf.classes.map((c) => (
                  <th key={c.id} scope="col" className="px-1 pb-1 text-center font-[family-name:var(--font-ui)] font-semibold uppercase text-ink-soft">
                    {c.id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pf.classes.map((a, i) => (
                <tr key={a.id}>
                  <th scope="row" className="pr-2 text-right font-[family-name:var(--font-ui)] font-semibold uppercase text-ink-soft">
                    {a.id}
                  </th>
                  {pf.classes.map((b, j) => {
                    if (i === j) return <td key={b.id} className="px-1 py-0.5 text-center font-[family-name:var(--font-ui)] text-ink-soft">1</td>;
                    const key = corrKey(a.id, b.id);
                    const v = pf.corr[key];
                    if (i > j) return <td key={b.id} className="px-1 py-0.5 text-center font-[family-name:var(--font-ui)] tabular-nums text-ink-soft">{v}</td>;
                    return (
                      <td key={b.id} className="px-0.5 py-0.5">
                        <input
                          aria-label={`Correlation of ${a.name} with ${b.name}`}
                          inputMode="decimal"
                          className={`${cell} !px-1 !py-1 text-center !text-xs`}
                          value={v}
                          onChange={(e) => setPf({ ...pf, corr: { ...pf.corr, [key]: e.target.value } })}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {adjusted && (
          <p role="status" className="font-[family-name:var(--font-ui)] text-xs text-clay-text">
            These correlations cannot all hold at once, so the tool pulls them slightly toward zero when it calculates. Revisit the ones that are most extreme.
          </p>
        )}
        <div>
          {confirm ? (
            <span className="inline-flex items-center gap-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
              Replace everything above with the illustrative numbers?
              <Button
                variant="danger"
                onClick={() => {
                  const fresh = emptyPortfolio();
                  setPf({ ...fresh, started: pf.started, classes: fresh.classes.map((c) => ({ ...c, weight: pf.classes.find((x) => x.id === c.id)?.weight ?? "0" })), source: pf.source, asOf: pf.asOf, fee: pf.fee, customName: pf.customName });
                  setConfirm(false);
                }}
              >
                Yes, reset
              </Button>
              <Button variant="ghost" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
            </span>
          ) : (
            <Button variant="ghost" onClick={() => setConfirm(true)}>
              Reset to the illustrative numbers
            </Button>
          )}
        </div>
      </Panel>

      <Panel title="How to choose assumptions" subtitle="Guidelines an analyst follows.">
        <ol className="flex flex-col gap-3">
          {CMA_GUIDELINES.map((g, i) => (
            <li key={g.title} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-water-deep font-[family-name:var(--font-ui)] text-xs font-semibold text-white">{i + 1}</span>
              <div className="font-[family-name:var(--font-ui)] text-sm">
                <p className="font-medium text-ink">{g.title}</p>
                <p className="mt-0.5 text-ink-soft">{g.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Where to find them" subtitle="Look up the current figures yourself; these are pointers, not endorsements, and the sites change.">
        <ul className="flex flex-col gap-3">
          {CMA_REFERENCES.map((r) => (
            <li key={r.name} className="font-[family-name:var(--font-ui)] text-sm">
              <p className="font-medium text-ink">{r.name}</p>
              <p className="text-ink-soft">{r.use}</p>
              <p className="text-xs text-ink-soft">Where: {r.where}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AllocationTab({ plan, set, pf, setPf, profileName }: ModuleProps & { pf: PortfolioData; setPf: (p: PortfolioData) => void; profileName: string }) {
  const stats = useMemo(() => portfolioStats(pf), [pf]);
  const bench = useMemo(() => portfolioStats(withWeights(pf, BENCHMARK_WEIGHTS)), [pf]);
  const total = weightTotal(pf);
  const palette = ["var(--color-water-deep)", "var(--color-river-2)", "var(--color-river-3)", "var(--color-clay)", "var(--color-river-1)", "var(--color-gold)", "var(--color-olive)", "var(--color-line)"];
  const applied = num(plan.model.ret) === Math.round(stats.arithmetic * 10) / 10 && num(plan.model.vol) === Math.round(stats.vol * 10) / 10;
  const setWeight = (id: ClassId, weight: string) => setPf({ ...pf, started: true, classes: pf.classes.map((c) => (c.id === id ? { ...c, weight } : c)) });
  const normalize = () => {
    if (total <= 0) return;
    setPf({ ...pf, classes: pf.classes.map((c) => ({ ...c, weight: String(Math.round((Math.max(0, num(c.weight)) / total) * 1000) / 10) })) });
  };
  const w = weightsOf(pf);
  return (
    <div className="flex flex-col gap-6">
      <Panel title="Start from a model portfolio" subtitle="Load a model for a risk profile or the 60/40 reference, then change any weight.">
        <div className="flex flex-wrap gap-2">
          {RISK_PROFILES.map((p) => (
            <Pill key={p.name} onClick={() => setPf(withWeights(pf, MODEL_PORTFOLIOS[p.name]))} active={pf.started && CLASS_IDS.every((id) => num(pf.classes.find((c) => c.id === id)!.weight) === MODEL_PORTFOLIOS[p.name][id])}>
              {p.name}
              {p.name === profileName ? " (plan)" : ""}
            </Pill>
          ))}
          <Pill onClick={() => setPf(withWeights(pf, BENCHMARK_WEIGHTS))}>60/40 reference</Pill>
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Tile label="Expected return" value={pct1(stats.geometric)} sub={`compound; ${pct1(stats.arithmetic)} average`} />
        <Tile label="Volatility" value={pct1(stats.vol)} sub="yearly swings" />
        <Tile label="Return per unit of risk" value={stats.sharpe.toFixed(2)} sub={`60/40: ${bench.sharpe.toFixed(2)}`} />
        <Tile label="Stocks and real estate" value={pct1(stats.equity)} sub="of the portfolio" />
        <Tile label="A bad year (1 in 10)" value={pct1(stats.badYear)} sub="average less 1.28 swings" tone={stats.badYear < 0 ? "bad" : undefined} />
      </div>

      <Panel
        title="Weights"
        subtitle="What share of the money goes in each class, in percent."
        actions={
          <span className="flex items-center gap-2">
            <span className={`font-[family-name:var(--font-ui)] text-xs tabular-nums ${Math.abs(total - 100) < 0.05 ? "text-river-1" : "text-red-700"}`} role="status">
              Total {pct1(total)}
            </span>
            {Math.abs(total - 100) >= 0.05 && total > 0 && (
              <Button variant="secondary" onClick={normalize}>
                Scale to 100%
              </Button>
            )}
          </span>
        }
      >
        <div className="flex h-5 overflow-hidden rounded-full bg-parchment-deep" role="img" aria-label={`Allocation: ${pf.classes.filter((c) => num(c.weight) > 0).map((c) => `${c.name} ${num(c.weight)}%`).join(", ")}`}>
          {pf.classes.map((c, i) => (num(c.weight) > 0 ? <div key={c.id} style={{ width: `${(Math.max(0, num(c.weight)) / (total || 1)) * 100}%`, backgroundColor: palette[i] }} /> : null))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">Portfolio weights and each class's share of the risk</caption>
            <thead>
              <tr className="border-b border-line text-left font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-wider text-ink-soft">
                <th scope="col" className="px-2 py-2 font-semibold">Asset class</th>
                <th scope="col" className="w-28 px-2 py-2 font-semibold">Weight %</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">Share of risk</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">60/40</th>
              </tr>
            </thead>
            <tbody>
              {pf.classes.map((c, i) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <th scope="row" className="px-2 py-1.5 text-left font-[family-name:var(--font-ui)] text-sm font-medium text-ink">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ backgroundColor: palette[i] }} aria-hidden="true" />
                    {c.name}
                  </th>
                  <td className="px-2 py-1.5">
                    <input aria-label={`Weight of ${c.name}`} inputMode="decimal" className={cell} value={c.weight} onChange={(e) => setWeight(c.id, e.target.value)} />
                  </td>
                  <td className="px-2 py-1.5 text-right font-[family-name:var(--font-ui)] tabular-nums text-ink-soft">{w[i] > 0 ? pct1(stats.riskShare[i] * 100) : "0%"}</td>
                  <td className="px-2 py-1.5 text-right font-[family-name:var(--font-ui)] tabular-nums text-ink-soft">{BENCHMARK_WEIGHTS[c.id]}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          Share of risk shows where the swings come from. A class with a small weight can still carry most of the risk, which is why a mix that is 70% stocks gets over 90% of its swings from them.
        </p>
      </Panel>

      <Panel title="Against the 60/40 reference" subtitle="A plain 60% U.S. large cap stocks and 40% U.S. bonds mix, on the same assumptions.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-line text-left font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-wider text-ink-soft">
                <th scope="col" className="px-2 py-2 font-semibold">Measure</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">This portfolio</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">60/40</th>
              </tr>
            </thead>
            <tbody className="font-[family-name:var(--font-ui)] tabular-nums">
              {(
                [
                  ["Compound return", pct1(stats.geometric), pct1(bench.geometric)],
                  ["Volatility", pct1(stats.vol), pct1(bench.vol)],
                  ["Return per unit of risk", stats.sharpe.toFixed(2), bench.sharpe.toFixed(2)],
                  ["A bad year (1 in 10)", pct1(stats.badYear), pct1(bench.badYear)],
                  ["Diversification ratio", stats.diversification.toFixed(2), bench.diversification.toFixed(2)],
                ] as [string, string, string][]
              ).map(([k, a, b]) => (
                <tr key={k} className="border-b border-line last:border-0">
                  <th scope="row" className="px-2 py-1.5 text-left font-medium text-ink">{k}</th>
                  <td className="px-2 py-1.5 text-right text-ink">{a}</td>
                  <td className="px-2 py-1.5 text-right text-ink-soft">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => set({ ...plan, model: { ...plan.model, ret: Math.round(stats.arithmetic * 10) / 10, vol: Math.round(stats.vol * 10) / 10 } })}
            disabled={applied || total <= 0}
          >
            {applied ? "These assumptions are in the model" : "Use this portfolio in the model"}
          </Button>
          <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">Sets the projection's average return to {pct1(stats.arithmetic)} and volatility to {pct1(stats.vol)}.</span>
        </div>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function FrontierTab({ pf }: { pf: PortfolioData }) {
  const f = useMemo(() => efficientFrontier(pf, 6000), [pf]);
  const sel = portfolioStats(pf);
  const bench = portfolioStats(withWeights(pf, BENCHMARK_WEIGHTS));
  const nearest = f.frontier.reduce((best, p) => (Math.abs(p.vol - sel.vol) < Math.abs(best.vol - sel.vol) ? p : best), f.frontier[0]);
  const gap = nearest ? nearest.ret - sel.geometric : 0;
  return (
    <div className="flex flex-col gap-6">
      <Panel title="Risk and return of every mix" subtitle="Each dot is a mix of the asset classes. The line is the best return found for each level of risk.">
        <FrontierChart
          cloud={f.cloud}
          frontier={f.frontier}
          assets={f.assets}
          selected={weightTotal(pf) > 0 ? { vol: sel.vol, ret: sel.geometric } : null}
          reference={{ vol: bench.vol, ret: bench.geometric }}
          caption="Efficient frontier: compound return against volatility, with each asset class and the chosen portfolio marked"
        />
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          {weightTotal(pf) > 0 ? (
            <>
              This portfolio sits {gap > 0.15 ? <b className="text-ink">about {gap.toFixed(1)} points of return below the frontier at its level of risk</b> : <b className="text-ink">on or very near the frontier</b>}.
              {gap > 0.15 ? " A different mix of the same classes could earn more for the same swings, or take fewer swings for the same return." : " Mixes on the line cannot earn more without taking more risk."}
            </>
          ) : (
            "Choose weights in the Allocation tab to place a portfolio on the chart."
          )}
        </p>
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          Built from 6,000 random long-only mixes using your assumptions, so it moves when you change them. The frontier is only as good as the assumptions behind it: small changes in expected returns can swing the best mix a lot, which is why advisors set limits on the weights.
        </p>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StressTab({ plan, pf, setPf }: { plan: WealthPlan; pf: PortfolioData; setPf: (p: PortfolioData) => void }) {
  const [value, setValue] = useState(String(Math.round(testValue(plan))));
  const v = num(value) || 10000;
  const results = useMemo(() => stressTests(pf, v), [pf, v]);
  const worst = Math.min(...results.map((r) => r.loss), -1);
  const setEdit = (sid: string, id: ClassId, val: string) => setPf({ ...pf, stress: { ...pf.stress, [sid]: { ...(pf.stress[sid] ?? {}), [id]: val } } });
  return (
    <div className="flex flex-col gap-6">
      <Panel title="How the portfolio would have done" subtitle="The portfolio's weights applied to the returns of four periods and one scenario of your own.">
        <label className="flex max-w-xs flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
          Portfolio value to test
          <span className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink focus-within:border-water">
            <span className="text-ink-soft">$</span>
            <input aria-label="Portfolio value to test" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className="w-full min-w-0 bg-transparent tabular-nums outline-none" />
          </span>
        </label>
        {weightTotal(pf) <= 0 && <p className="font-[family-name:var(--font-ui)] text-sm text-clay-text">Set weights in the Allocation tab first.</p>}
        <ul className="flex flex-col gap-3">
          {results.map((r) => (
            <li key={r.scenario.id} className="panel-inner p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-ink">
                  {r.scenario.name} <span className="font-[family-name:var(--font-ui)] text-xs font-normal text-ink-soft">({r.scenario.basis})</span>
                </p>
                <p className={`font-[family-name:var(--font-ui)] text-lg font-semibold tabular-nums ${r.loss < 0 ? "text-red-700" : "text-river-1"}`}>
                  {r.loss > 0 ? "+" : ""}
                  {pct1(r.loss)} <span className="text-sm font-normal text-ink-soft">{r.dollars < 0 ? `(${fmtUsd(Math.abs(r.dollars))})` : fmtUsd(r.dollars)}</span>
                </p>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-parchment-deep" aria-hidden="true">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (Math.abs(r.loss) / Math.abs(worst)) * 100)}%`, backgroundColor: r.loss < 0 ? "#d9534f" : "var(--color-river-1)" }} />
              </div>
              <p className="mt-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                {r.recoveryYears == null ? "No loss to recover." : `At the portfolio's expected return it would take about ${(Math.round(r.recoveryYears * 10) / 10).toString()} years to get back to where it started.`}
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer font-[family-name:var(--font-ui)] text-xs text-water-deep">Edit the returns in this scenario</summary>
                {r.scenario.id === "custom" && (
                  <label className="mt-2 flex max-w-xs flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
                    Name of your scenario
                    <TextInput value={pf.customName} onChange={(e) => setPf({ ...pf, customName: e.target.value })} />
                  </label>
                )}
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {pf.classes.map((c) => {
                    const base = STRESS_DEFAULTS.find((s) => s.id === r.scenario.id)!;
                    const cur = scenarioReturns(pf, base)[c.id];
                    return (
                      <label key={c.id} className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-[11px] font-medium text-ink-soft">
                        {c.name} (%)
                        <input aria-label={`${r.scenario.name}: return of ${c.name}`} inputMode="decimal" className={cell} value={pf.stress[r.scenario.id]?.[c.id] ?? String(cur)} onChange={(e) => setEdit(r.scenario.id, c.id, e.target.value)} />
                      </label>
                    );
                  })}
                </div>
              </details>
            </li>
          ))}
        </ul>
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{STRESS_NOTE}</p>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const FEE_LEVELS = [0.05, 0.25, 0.75, 1.25];

function FeesTab({ plan, pf, setPf }: { plan: WealthPlan; pf: PortfolioData; setPf: (p: PortfolioData) => void }) {
  const years = Math.max(5, Math.min(40, Math.round(num(plan.model.years) || 30)));
  const initial = num(plan.model.initial);
  const monthly = num(plan.model.monthly);
  const ret = portfolioStats(pf).geometric || num(plan.model.ret) || 6;
  const yourFee = num(pf.fee);
  const levels = Array.from(new Set([...FEE_LEVELS, yourFee].filter((x) => x >= 0))).sort((a, b) => a - b);
  const series = levels.map((f) => ({ fee: f, values: feeDragSeries(initial, monthly, years, ret, f) }));
  const best = series[0].values[years];
  const colors = ["var(--color-river-1)", "var(--color-river-2)", "var(--color-gold)", "#d9534f", "var(--color-ink)"];

  const [scenarioId, setScenarioId] = useState("gfc");
  const [band, setBand] = useState("5");
  const value = testValue(plan);
  const base = STRESS_DEFAULTS.find((s) => s.id === scenarioId)!;
  const returns = scenarioReturns(pf, base);
  const rows = useMemo(() => rebalanceAfter(pf, returns, value, num(band) || 5), [pf, returns, value, band]);

  return (
    <div className="flex flex-col gap-6">
      <Panel title="What fees cost over time" subtitle={`The same plan (${fmtUsd(initial)} to start, ${fmtUsd(monthly)} a month, ${pct1(ret)} a year before fees) over ${years} years, at different yearly fees.`}>
        <label className="flex max-w-xs flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
          Your fee assumption (% a year, advisory plus fund costs)
          <TextInput inputMode="decimal" value={pf.fee} onChange={(e) => setPf({ ...pf, fee: e.target.value })} />
        </label>
        <LineChartMulti
          labels={Array.from({ length: years + 1 }, (_, i) => `Yr ${i}`)}
          series={series.map((s, i) => ({ name: `${s.fee}% fee`, values: s.values, color: colors[i % colors.length], width: s.fee === yourFee ? 3 : 1.8 }))}
          caption={`Balance over ${years} years at fees from ${levels[0]}% to ${levels[levels.length - 1]}%`}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <caption className="sr-only">Ending balance and cost of each fee level</caption>
            <thead>
              <tr className="border-b border-line text-left font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-wider text-ink-soft">
                <th scope="col" className="px-2 py-2 font-semibold">Yearly fee</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">Ending balance</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">Lost to fees</th>
              </tr>
            </thead>
            <tbody className="font-[family-name:var(--font-ui)] tabular-nums">
              {series.map((s) => (
                <tr key={s.fee} className="border-b border-line last:border-0">
                  <th scope="row" className="px-2 py-1.5 text-left font-medium text-ink">
                    {s.fee}%{s.fee === yourFee ? " (yours)" : ""}
                  </th>
                  <td className="px-2 py-1.5 text-right text-ink">{fmtK(s.values[years])}</td>
                  <td className="px-2 py-1.5 text-right text-ink-soft">{s.values[years] === best ? "-" : fmtK(best - s.values[years])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">A steady return is used so only the fee differs. A fee is charged every year, whether the market is up or down, so it compounds against the client like interest.</p>
      </Panel>

      <Panel title="Drift and rebalancing" subtitle="After a market move, the weights drift from target. This shows the drift and the trades that would put it back.">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
            After a year like
            <Select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
              {STRESS_DEFAULTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id === "custom" ? pf.customName : s.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
            Rebalance when a class is off by more than (points)
            <TextInput inputMode="decimal" value={band} onChange={(e) => setBand(e.target.value)} />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">Drift from target and the trades to rebalance on {fmtUsd(value)}</caption>
            <thead>
              <tr className="border-b border-line text-left font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-wider text-ink-soft">
                <th scope="col" className="px-2 py-2 font-semibold">Asset class</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">Target</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">After</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">Trade on {fmtUsd(value)}</th>
                <th scope="col" className="px-2 py-2 font-semibold">Band</th>
              </tr>
            </thead>
            <tbody className="font-[family-name:var(--font-ui)] tabular-nums">
              {rows
                .filter((r) => r.target > 0 || r.drifted > 0.05)
                .map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <th scope="row" className="px-2 py-1.5 text-left font-medium text-ink">{r.name}</th>
                    <td className="px-2 py-1.5 text-right text-ink-soft">{pct1(r.target)}</td>
                    <td className="px-2 py-1.5 text-right text-ink">{pct1(r.drifted)}</td>
                    <td className={`px-2 py-1.5 text-right ${r.trade < 0 ? "text-red-700" : "text-river-1"}`}>{r.trade < 0 ? `sell ${fmtUsd(-r.trade)}` : `buy ${fmtUsd(r.trade)}`}</td>
                    <td className={`px-2 py-1.5 font-medium ${r.outsideBand ? "text-clay-text" : "text-ink-soft"}`}>{r.outsideBand ? "Outside" : "Within"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          Rebalancing sells what has grown and buys what has fallen, which keeps the risk the client agreed to. Using new savings to rebalance first avoids selling and taxes. In a taxable account, selling winners can create taxable gains.
        </p>
      </Panel>
    </div>
  );
}
