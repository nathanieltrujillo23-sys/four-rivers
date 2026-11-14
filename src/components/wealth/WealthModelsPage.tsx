import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useWealthPrep } from "../../state/useWealthPrep";
import { HISTORY_FIRST, HISTORY_LAST, HISTORY_SOURCE } from "../../lib/marketHistory";
import { ASSETS, ESTATE_DOCS, PRESETS, STRATEGIES, TITLING, backtest, estate, presetWeights, withdrawStudy, type BacktestInputs, type EstateAsset, type EstateInputs, type TitlingId, type WealthModels, type WithdrawInputs } from "../../lib/wealthModels";
import { wealthBook } from "../../lib/wealthExcel";
import { fmtK, uid } from "../../lib/wealthMath";
import { Button } from "../ui/Button";
import { Select, TextArea, TextInput } from "../ui/Field";
import { LoadError } from "../ui/LoadError";
import { PageSkeleton } from "../ui/Skeleton";
import { SoftwareGuide } from "../community/SoftwareGuide";
import { EducationNote, ExportButton, NumTable, SubTabs, TabPanel, cellCls, labelCls } from "../ib/ibParts";
import { LineChartMulti } from "./charts";
import { HowCalculated, MoneyField, Panel, Tile } from "./parts";
import { SAVE_TEXT } from "./wealthText";

const num0 = (v: string) => v.replace(/[^0-9.]/g, "");
const usd = (x: number) => `$${Math.round(x).toLocaleString("en-US")}`;
const pc = (x: number) => `${(Math.round(x * 1000) / 10).toFixed(1)}%`;

type Tab = "backtest" | "withdraw" | "estate" | "statements" | "software";
const TABS: { id: Tab; label: string }[] = [
  { id: "backtest", label: "Portfolio backtester" },
  { id: "withdraw", label: "Withdrawal strategies" },
  { id: "estate", label: "Estate snapshot" },
  { id: "statements", label: "Financial statements" },
  { id: "software", label: "Industry software" },
];

/** Stand-alone wealth models, not tied to one client: test an idea here, then use it in a client's plan. */
export function WealthModelsPage() {
  const { snapshot } = useCourse();
  const profile = snapshot?.profile;
  const allowed = profile?.wealthStatus === "approved" || profile?.role === "admin";
  if (!snapshot || !profile) return <PageSkeleton cards={2} />;
  if (!allowed) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-10 text-center">
        <h1 className="t-h1">Wealth models</h1>
        <Link to="/community">
          <Button variant="secondary">Back to Community</Button>
        </Link>
      </div>
    );
  }
  return <Models userId={profile.userId} />;
}

function Models({ userId }: { userId: string }) {
  const { repository } = useCourse();
  const prep = useWealthPrep(repository, userId);
  const [tab, setTab] = useState<Tab>("backtest");
  if (prep.error && !prep.data) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <LoadError message={prep.error} onRetry={() => window.location.reload()} />
      </div>
    );
  }
  if (!prep.data) return <PageSkeleton cards={3} />;
  const m = prep.data.models;
  const set = (patch: Partial<WealthModels>) => prep.update((d) => ({ ...d, models: { ...d.models, ...patch } }));
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 py-2">
      <header className="flex flex-col gap-3">
        <Link to="/community/wealth" className="w-fit font-[family-name:var(--font-ui)] text-sm text-water-deep hover:underline">
          ← Wealth Tools
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="t-eyebrow">Daily Bread wealth management track</p>
            <h1 className="t-h1 mt-1">Wealth models</h1>
            <p className="mt-2 max-w-2xl font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              Models that stand on their own: test a mix against {HISTORY_LAST - HISTORY_FIRST + 1} years of history, compare ways to draw down a portfolio, and see the shape of an estate. Only you can see what you put in.
            </p>
          </div>
          <p role="status" aria-live="polite" className={`rounded-full border px-3 py-1 font-[family-name:var(--font-ui)] text-xs ${prep.save === "error" ? "border-clay text-ink" : "border-line text-ink-soft"}`}>
            {SAVE_TEXT[prep.save]}
          </p>
        </div>
      </header>
      <EducationNote>Educational models. History is not a forecast, the estate figures are illustrative, and none of this is investment, tax or legal advice or a recommendation for any person.</EducationNote>
      <SubTabs label="Wealth models" tabs={TABS} value={tab} onChange={setTab} prefix="wm" />
      <TabPanel prefix="wm" id={tab}>
        {tab === "backtest" && <BacktestTool d={m.backtest} set={(backtest) => set({ backtest })} models={m} />}
        {tab === "withdraw" && <WithdrawTool d={m.withdraw} set={(withdraw) => set({ withdraw })} models={m} />}
        {tab === "estate" && <EstateTool d={m.estate} set={(estate) => set({ estate })} models={m} />}
        {tab === "statements" && (
          <Panel title="Personal financial statements" subtitle="A client's balance sheet, monthly and yearly cash flow and key ratios, as an Excel workbook with live formulas.">
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink">
              These are made from a client's plan, so the figures are entered once. Open a client, go to the <b>Snapshot</b> step, fill in what they own, owe and spend, and press <b>Export financial statements to Excel</b>.
            </p>
            <div>
              <Link to="/community/wealth">
                <Button variant="secondary">Go to your clients</Button>
              </Link>
            </div>
          </Panel>
        )}
        {tab === "software" && <SoftwareGuide track="wealth" />}
      </TabPanel>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function BacktestTool({ d, set, models }: { d: BacktestInputs; set: (d: BacktestInputs) => void; models: WealthModels }) {
  const r = useMemo(() => backtest(d), [d]);
  const up = (patch: Partial<BacktestInputs>) => set({ ...d, ...patch });
  const years = Array.from({ length: HISTORY_LAST - HISTORY_FIRST + 1 }, (_, k) => String(HISTORY_FIRST + k));
  const total = ASSETS.reduce((a, x) => a + (parseFloat(d.weights[x.id]) || 0), 0);
  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <div className="flex min-w-0 flex-col gap-6">
        <Panel title="The mix" subtitle="Percent in each asset. Start from a preset, then change it.">
          <div role="group" aria-label="Preset mixes" className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => up({ weights: presetWeights(p.weights) })}
                className="rounded-full border border-line px-3 py-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft transition-colors hover:bg-parchment-deep hover:text-ink"
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {ASSETS.map((a) => (
              <MoneyField key={a.id} label={a.label} suffix="%" hint={a.note} value={d.weights[a.id]} onChange={(v) => up({ weights: { ...d.weights, [a.id]: num0(v) } })} />
            ))}
          </div>
          <p className={`font-[family-name:var(--font-ui)] text-xs ${Math.abs(total - 100) > 0.5 ? "text-red-700" : "text-ink-soft"}`}>Total: {Math.round(total * 10) / 10}%</p>
        </Panel>
        <Panel title="The test">
          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}>
              From the start of
              <Select value={d.start} onChange={(e) => up({ start: e.target.value })}>
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </Select>
            </label>
            <label className={labelCls}>
              To the end of
              <Select value={d.end} onChange={(e) => up({ end: e.target.value })}>
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </Select>
            </label>
            <MoneyField label="Starting amount" prefix="$" value={d.initial} onChange={(v) => up({ initial: num0(v) })} />
            <MoneyField label="Added each year" prefix="$" value={d.yearly} onChange={(v) => up({ yearly: num0(v) })} />
          </div>
          <label className="flex items-start gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
            <input type="checkbox" checked={d.rebalance} onChange={(e) => up({ rebalance: e.target.checked })} className="mt-1" />
            <span>Rebalance to the target mix every year</span>
          </label>
          <label className="flex items-start gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
            <input type="checkbox" checked={d.real} onChange={(e) => up({ real: e.target.checked })} className="mt-1" />
            <span>Show everything after inflation</span>
          </label>
        </Panel>
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        {!r.valid ? (
          <p role="alert" className="rounded-lg border border-clay px-4 py-4 font-[family-name:var(--font-ui)] text-sm text-ink">
            {r.problem}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Tile label="Ending value" value={fmtK(r.ending)} sub={`${usd(r.contributed)} put in`} />
              <Tile label="Compound return" value={pc(r.cagr)} sub={`all stocks ${pc(r.stocksCagr)} · 60/40 ${pc(r.balancedCagr)}`} />
              <Tile label="Volatility" value={pc(r.vol)} sub={`${r.downYears} down years of ${r.years.length}`} />
              <Tile label="Deepest fall" value={pc(r.maxDrawdown)} sub={r.maxDrawdown > 0 ? `end of ${r.drawdownFrom} to end of ${r.drawdownTo}` : "between year-ends"} tone={r.maxDrawdown > 0.3 ? "bad" : r.maxDrawdown > 0.15 ? "warn" : undefined} />
            </div>
            <div>
              <ExportButton build={() => wealthBook(models, "backtest")!} label="Export the backtest to Excel" />
            </div>
            <Panel title={`Growth of $1${d.real ? ", after inflation" : ""}`} subtitle="With nothing added, so the three lines can be compared.">
              <LineChartMulti
                labels={r.years.map((y) => String(y.year))}
                caption={`Growth of one dollar from ${d.start} to ${d.end}: this mix ${r.years.at(-1)!.index.toFixed(2)}, all stocks ${r.years.at(-1)!.stocksIndex.toFixed(2)}, 60/40 ${r.years.at(-1)!.balancedIndex.toFixed(2)}`}
                format={(v) => `$${v >= 100 ? Math.round(v) : v.toFixed(1)}`}
                series={[
                  { name: "This mix", values: r.years.map((y) => y.index), color: "var(--color-water-deep)", width: 2.5 },
                  { name: "All stocks", values: r.years.map((y) => y.stocksIndex), color: "var(--color-gold-text)" },
                  { name: "60 / 40", values: r.years.map((y) => y.balancedIndex), color: "var(--color-river-1)", dash: "4 3" },
                ]}
              />
            </Panel>
            <Panel title="The hardest and the best years">
              <NumTable
                caption="The five worst and five best years for this mix"
                corner="Year"
                head={["Return"]}
                rows={[...r.years].sort((a, b) => a.ret - b.ret).filter((_, k, all) => k < 5 || k >= all.length - 5).map((y) => ({ label: String(y.year), cells: [pc(y.ret)] }))}
              />
            </Panel>
            <HowCalculated steps={r.steps} />
            <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{HISTORY_SOURCE}</p>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function WithdrawTool({ d, set, models }: { d: WithdrawInputs; set: (d: WithdrawInputs) => void; models: WealthModels }) {
  const r = useMemo(() => withdrawStudy(d), [d]);
  const up = (patch: Partial<WithdrawInputs>) => set({ ...d, ...patch });
  return (
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <div className="flex min-w-0 flex-col gap-6">
        <Panel title="The retirement" subtitle="Replayed from every starting year history allows.">
          <MoneyField label="Balance at retirement" prefix="$" value={d.balance} onChange={(v) => up({ balance: num0(v) })} />
          <MoneyField label="Spending in the first year" prefix="$" value={d.spend} onChange={(v) => up({ spend: num0(v) })} hint={r.valid ? `${pc(r.rate)} of the balance` : undefined} />
          <div className="grid grid-cols-2 gap-3">
            <MoneyField label="Years" value={d.years} onChange={(v) => up({ years: num0(v) })} />
            <MoneyField label="In stocks" suffix="%" value={d.stockPct} onChange={(v) => up({ stockPct: num0(v) })} hint="the rest in Treasury bonds" />
          </div>
        </Panel>
        <Panel title="The three rules">
          <ul className="flex flex-col gap-3">
            {STRATEGIES.map((s) => (
              <li key={s.id} className="font-[family-name:var(--font-ui)] text-sm text-ink">
                <b>{s.name}.</b> <span className="text-ink-soft">{s.text}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        {!r.valid ? (
          <p role="alert" className="rounded-lg border border-clay px-4 py-4 font-[family-name:var(--font-ui)] text-sm text-ink">
            {r.problem}
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              {r.strategies.map((s, k) => (
                <Tile key={s.id} label={STRATEGIES[k].name} value={pc(s.success)} sub={`lasted, of ${s.windows} starting years`} tone={s.success >= 0.95 ? "good" : s.success >= 0.8 ? "warn" : "bad"} />
              ))}
            </div>
            <div>
              <ExportButton build={() => wealthBook(models, "withdraw")!} label="Export the study to Excel" />
            </div>
            <Panel title="How the rules compare" subtitle="In the starting year's dollars. Read down a column: no rule wins every row.">
              <NumTable
                caption="Withdrawal strategies compared across every historical starting year"
                corner=""
                head={STRATEGIES.map((s) => s.name)}
                rows={[
                  { label: "Money lasted the whole period", cells: r.strategies.map((s) => pc(s.success)), bold: true },
                  { label: "Lowest yearly income, typical", cells: r.strategies.map((s) => usd(s.medianLowIncome)) },
                  { label: "Lowest yearly income, worst case", cells: r.strategies.map((s) => usd(s.worstLowIncome)) },
                  { label: "Average yearly income, typical", cells: r.strategies.map((s) => usd(s.medianAvgIncome)) },
                  { label: "Left at the end, typical", cells: r.strategies.map((s) => usd(s.medianEnd)) },
                  { label: "Left at the end, worst case", cells: r.strategies.map((s) => usd(s.worstEnd)) },
                  { label: "Hardest year to retire in", cells: r.strategies.map((s) => String(s.hardestStart)) },
                ]}
              />
            </Panel>
            <Panel title="What was left, by the year retirement began" subtitle="Each point is one retirement. The dips are the hard decades to retire into.">
              <LineChartMulti
                labels={r.byStart.map((b) => String(b.start))}
                caption={`Ending balance in starting-year dollars for retirements beginning ${r.firstStart} to ${r.lastStart}, under each of the three rules`}
                series={[
                  { name: "Constant dollar", values: r.byStart.map((b) => b.constant), color: "var(--color-water-deep)", width: 2.5 },
                  { name: "Fixed percent", values: r.byStart.map((b) => b.percent), color: "var(--color-gold-text)" },
                  { name: "Guardrails", values: r.byStart.map((b) => b.guardrails), color: "var(--color-river-1)", dash: "4 3" },
                ]}
              />
            </Panel>
            <HowCalculated steps={r.steps} />
            <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{HISTORY_SOURCE}</p>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function EstateTool({ d, set, models }: { d: EstateInputs; set: (d: EstateInputs) => void; models: WealthModels }) {
  const r = useMemo(() => estate(d), [d]);
  const up = (patch: Partial<EstateInputs>) => set({ ...d, ...patch });
  const setAsset = (id: string, patch: Partial<EstateAsset>) => up({ assets: d.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="What is owned, and how it is titled"
        subtitle="How an asset is titled decides how it passes, whatever the will says. Count life insurance at its death benefit."
        actions={
          <Button variant="secondary" disabled={d.assets.length >= 40} onClick={() => up({ assets: [...d.assets, { id: uid(), name: "", value: "", titling: "sole" }] })}>
            Add an asset
          </Button>
        }
      >
        {d.assets.length === 0 ? (
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Nothing listed yet. Add the home, each account, and any life insurance.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse font-[family-name:var(--font-ui)] text-sm">
              <caption className="sr-only">Assets and how they are titled</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-soft">
                  <th className="py-2 pr-2 font-medium">Asset</th>
                  <th className="py-2 pr-2 font-medium">Value</th>
                  <th className="py-2 pr-2 font-medium">How it is titled</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {d.assets.map((a, k) => (
                  <tr key={a.id} className="border-b border-line/60">
                    <td className="py-1.5 pr-2">
                      <TextInput aria-label={`Asset ${k + 1} name`} value={a.name} onChange={(e) => setAsset(a.id, { name: e.target.value })} className="!py-1.5 !text-sm" />
                    </td>
                    <td className="w-40 py-1.5 pr-2">
                      <input aria-label={`${a.name || `Asset ${k + 1}`} value`} inputMode="decimal" value={a.value} onChange={(e) => setAsset(a.id, { value: num0(e.target.value) })} className={cellCls} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <Select aria-label={`${a.name || `Asset ${k + 1}`} titling`} value={a.titling} onChange={(e) => setAsset(a.id, { titling: e.target.value as TitlingId })}>
                        {TITLING.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="py-1.5 text-right">
                      <Button variant="ghost" onClick={() => up({ assets: d.assets.filter((x) => x.id !== a.id) })} aria-label={`Remove ${a.name || `asset ${k + 1}`}`}>
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
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="The household">
            <label className="flex items-start gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
              <input type="checkbox" checked={d.married} onChange={(e) => up({ married: e.target.checked })} className="mt-1" />
              <span>Married (two exemptions can apply)</span>
            </label>
            <MoneyField label="Debts" prefix="$" value={d.debts} onChange={(v) => up({ debts: num0(v) })} />
            <MoneyField label="Federal exemption per person" prefix="$" value={d.exemption} onChange={(v) => up({ exemption: num0(v) })} hint="$15 million for 2026; confirm the current figure" />
            <MoneyField label="Rate above the exemption" suffix="%" value={d.rate} onChange={(v) => up({ rate: num0(v) })} />
          </Panel>
          <Panel title="Documents in place" subtitle="Tick what the client already has.">
            <ul className="flex flex-col gap-2">
              {ESTATE_DOCS.map((doc) => (
                <li key={doc.id}>
                  <label className="flex items-start gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
                    <input type="checkbox" checked={!!d.docs[doc.id]} onChange={(e) => up({ docs: { ...d.docs, [doc.id]: e.target.checked } })} className="mt-1" />
                    <span>
                      {doc.label}
                      <span className="block text-xs text-ink-soft">{doc.why}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Tile label="Net estate" value={fmtK(r.net)} sub={`${usd(r.gross)} before debts`} />
            <Tile label="Through probate" value={pc(r.probateShare)} sub={`${usd(r.probate)} passes by will`} tone={r.probateShare > 0.5 ? "warn" : undefined} />
            <Tile label="Federal estate tax" value={r.tax > 0 ? fmtK(r.tax) : "None"} sub={r.tax > 0 ? `on ${usd(r.taxable)} above the exemption` : "below the exemption"} tone={r.tax > 0 ? "bad" : undefined} />
            <Tile label="Documents to discuss" value={`${r.missing.length} of ${ESTATE_DOCS.length}`} sub="not yet in place" tone={r.missing.length > 2 ? "warn" : r.missing.length === 0 ? "good" : undefined} />
          </div>
          <div>
            <ExportButton build={() => wealthBook(models, "estate")!} label="Export the estate snapshot to Excel" />
          </div>
          {r.gross > 0 && (
            <Panel title="How it passes">
              <NumTable caption="How the estate passes, by titling" corner="Titling" head={["Amount", "Share", "Passes"]} rows={r.routes.filter((x) => x.amount > 0).map((x) => ({ label: x.label, cells: [usd(x.amount), pc(x.share), x.passes] }))} />
            </Panel>
          )}
          {r.missing.length > 0 && (
            <Panel title="Questions to take to an estate attorney">
              <ul className="flex list-disc flex-col gap-1 pl-5 font-[family-name:var(--font-ui)] text-sm text-ink">
                {r.missing.map((x) => (
                  <li key={x.id}>
                    <b>{x.label}:</b> {x.why}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          <label className={labelCls}>
            What I would raise with this client
            <TextArea rows={3} maxLength={600} value={d.note} onChange={(e) => up({ note: e.target.value })} />
          </label>
          <HowCalculated steps={r.steps} />
        </div>
      </div>
    </div>
  );
}
