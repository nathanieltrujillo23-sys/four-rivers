import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { Select, TextInput } from "../ui/Field";
import { HowCalculated, MoneyField, Panel, Tile } from "../wealth/parts";
import { NumTable, cellCls, labelCls } from "./ibParts";
import { IRR_TABLE, PAPER_QUESTIONS, paperCheck, paperLbo, paperSteps, precedents, wacc, waccGrid, type BetaPeer, type PaperRun, type PrecedentInputs, type PrecedentRow, type WaccInputs } from "../../lib/ibCapital";
import { uid } from "../../lib/wealthMath";

const num0 = (v: string) => v.replace(/[^0-9.-]/g, "");
const f1 = (x: number) => (Math.round(x * 10) / 10).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const f2 = (x: number) => (Math.round(x * 100) / 100).toFixed(2);
const m = (x: number) => `$${f1(x)}M`;
const x1 = (x: number | null) => (x == null ? "n/a" : `${f1(x)}x`);
const pc = (x: number) => `${f1(x * 100)}%`;
const pc2 = (x: number) => `${(Math.round(x * 10000) / 100).toFixed(2)}%`;
const usd2 = (x: number) => `$${f2(x)}`;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/* ------------------------------------------------------------------ */

/** Cost of capital: CAPM for equity, after-tax debt, market-value weights, and an optional beta built from comparables. */
export function WaccTool({ d, set, onUse }: { d: WaccInputs; set: (d: WaccInputs) => void; onUse: (waccPercent: string) => void }) {
  const r = useMemo(() => wacc(d), [d]);
  const grid = useMemo(() => waccGrid(d), [d]);
  const up = (patch: Partial<WaccInputs>) => set({ ...d, ...patch });
  const setPeer = (id: string, patch: Partial<BetaPeer>) => up({ peers: d.peers.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const [used, setUsed] = useState(false);
  return (
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <Panel title="Inputs" subtitle="Rates are percents. Use market values for equity and debt, and say where each number came from.">
        <div className="grid grid-cols-2 gap-3">
          <MoneyField label="Risk-free rate" suffix="%" value={d.riskFree} onChange={(v) => up({ riskFree: num0(v) })} />
          <MoneyField label="Equity risk premium" suffix="%" value={d.erp} onChange={(v) => up({ erp: num0(v) })} />
          <MoneyField label="Levered beta" value={d.beta} onChange={(v) => up({ beta: num0(v) })} />
          <MoneyField label="Size premium" suffix="%" value={d.sizePremium} onChange={(v) => up({ sizePremium: num0(v) })} />
          <MoneyField label="Pre-tax cost of debt" suffix="%" value={d.costOfDebt} onChange={(v) => up({ costOfDebt: num0(v) })} />
          <MoneyField label="Tax rate" suffix="%" value={d.tax} onChange={(v) => up({ tax: num0(v) })} />
          <MoneyField label="Equity value" prefix="$" suffix="M" value={d.equity} onChange={(v) => up({ equity: num0(v) })} />
          <MoneyField label="Debt" prefix="$" suffix="M" value={d.debt} onChange={(v) => up({ debt: num0(v) })} />
        </div>
        <label className="flex items-start gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
          <input type="checkbox" checked={d.fromPeers} onChange={(e) => up({ fromPeers: e.target.checked })} className="mt-1" />
          <span>
            Take beta from comparables
            <span className="block text-xs text-ink-soft">Unlever each peer's beta, take the median, and relever it at this company's own debt and equity.</span>
          </span>
        </label>
      </Panel>
      <div className="flex min-w-0 flex-col gap-6">
        {d.fromPeers && (
          <Panel
            title="Comparable betas"
            subtitle="Each peer's observed beta, its debt as a percent of its equity value, and its tax rate. Capital IQ lists these on a company's page; note the date you pulled them."
            actions={
              <Button variant="secondary" disabled={d.peers.length >= 15} onClick={() => up({ peers: [...d.peers, { id: uid(), name: "", beta: "", debtToEquity: "", tax: d.tax || "25" }] })}>
                Add a peer
              </Button>
            }
          >
            {d.peers.length === 0 ? (
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">No peers yet. Add four to eight companies in the same business. Until then the beta typed on the left is used.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse font-[family-name:var(--font-ui)] text-sm">
                  <caption className="sr-only">Comparable betas</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-ink-soft">
                      {["Company", "Levered beta", "Debt / equity %", "Tax %"].map((h) => (
                        <th key={h} className="py-2 pr-2 font-medium">
                          {h}
                        </th>
                      ))}
                      <th className="py-2 pr-2 text-right font-medium">Unlevered</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {d.peers.map((p, i) => (
                      <tr key={p.id} className="border-b border-line/60">
                        <td className="py-1.5 pr-2">
                          <TextInput aria-label={`Peer ${i + 1} name`} value={p.name} onChange={(e) => setPeer(p.id, { name: e.target.value })} className="!py-1.5 !text-sm" />
                        </td>
                        {(["beta", "debtToEquity", "tax"] as const).map((k) => (
                          <td key={k} className="py-1.5 pr-2">
                            <input aria-label={`${p.name || `Peer ${i + 1}`} ${k === "beta" ? "levered beta" : k === "debtToEquity" ? "debt to equity percent" : "tax rate"}`} inputMode="decimal" value={p[k]} onChange={(e) => setPeer(p.id, { [k]: num0(e.target.value) })} className={cellCls} />
                          </td>
                        ))}
                        <td className="py-1.5 pr-2 text-right tabular-nums">{r.peers[i]?.unlevered == null ? "n/a" : f2(r.peers[i].unlevered!)}</td>
                        <td className="py-1.5 text-right">
                          <Button variant="ghost" onClick={() => up({ peers: d.peers.filter((x) => x.id !== p.id) })} aria-label={`Remove ${p.name || `peer ${i + 1}`}`}>
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
        )}
        {!r.valid ? (
          <p role="alert" className="rounded-lg border border-clay px-4 py-4 font-[family-name:var(--font-ui)] text-sm text-ink">
            {r.problem}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Tile label="WACC" value={pc2(r.wacc)} sub={`${pc(r.weightEquity)} equity, ${pc(r.weightDebt)} debt`} />
              <Tile label="Cost of equity" value={pc2(r.costOfEquity)} sub="CAPM" />
              <Tile label="After-tax cost of debt" value={pc2(r.afterTaxDebt)} sub={`${d.costOfDebt}% before tax`} />
              <Tile label="Beta used" value={f2(r.beta)} sub={d.fromPeers && r.unleveredMedian != null ? `relevered from ${f2(r.unleveredMedian)}` : "as entered"} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  onUse((Math.round(r.wacc * 1000) / 10).toFixed(1));
                  setUsed(true);
                }}
              >
                Use this WACC in the DCF
              </Button>
              <p role="status" className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                {used ? `The DCF now discounts at ${(Math.round(r.wacc * 1000) / 10).toFixed(1)}%.` : ""}
              </p>
            </div>
            <Panel title="WACC: beta against the equity risk premium" subtitle="How much the answer moves with the two inputs people argue about most.">
              <NumTable
                caption="Sensitivity of WACC to beta and the equity risk premium"
                corner="Beta \ premium"
                head={grid.erps.map((e) => `${e}%`)}
                rows={grid.betas.map((b, i) => ({ label: f2(b), cells: grid.values[i].map((v) => (v == null ? "n/a" : pc2(v))), bold: i === 2 }))}
              />
            </Panel>
            <HowCalculated steps={r.steps} />
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Precedent transactions: what buyers actually paid for similar companies. */
export function PrecedentsTool({ d, set }: { d: PrecedentInputs; set: (d: PrecedentInputs) => void }) {
  const r = useMemo(() => precedents(d), [d]);
  const up = (patch: Partial<PrecedentInputs>) => set({ ...d, ...patch });
  const setRow = (id: string, patch: Partial<PrecedentRow>) => up({ rows: d.rows.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const stat = (s: typeof r.evEbitda, fmt: (x: number) => string) => (s ? [s.low, s.q1, s.median, s.mean, s.q3, s.high].map(fmt) : Array(6).fill("n/a"));
  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Precedent transactions"
        subtitle="For each deal: the enterprise value paid, the target's revenue and EBITDA over the twelve months before it (all in millions), and the premium over the share price if the target was public. Take them from the deal announcement or from Capital IQ's transaction screen."
        actions={
          <Button variant="secondary" disabled={d.rows.length >= 20} onClick={() => up({ rows: [...d.rows, { id: uid(), target: "", acquirer: "", year: "", ev: "", revenue: "", ebitda: "", premium: "" }] })}>
            Add a deal
          </Button>
        }
      >
        {d.rows.length === 0 ? (
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">No deals yet. Add four to eight in the same industry from the last few years.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse font-[family-name:var(--font-ui)] text-sm">
              <caption className="sr-only">Precedent transactions</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-soft">
                  {["Target", "Acquirer", "Year", "Deal EV", "Revenue", "EBITDA", "Premium %"].map((h) => (
                    <th key={h} className="py-2 pr-2 font-medium">
                      {h}
                    </th>
                  ))}
                  <th className="py-2 pr-2 text-right font-medium">EV/Rev</th>
                  <th className="py-2 pr-2 text-right font-medium">EV/EBITDA</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {d.rows.map((row, i) => {
                  const mult = r.rows[i];
                  const name = row.target || `Deal ${i + 1}`;
                  return (
                    <tr key={row.id} className="border-b border-line/60">
                      <td className="py-1.5 pr-2">
                        <TextInput aria-label={`Deal ${i + 1} target`} value={row.target} onChange={(e) => setRow(row.id, { target: e.target.value })} className="!py-1.5 !text-sm" />
                      </td>
                      <td className="py-1.5 pr-2">
                        <TextInput aria-label={`${name} acquirer`} value={row.acquirer} onChange={(e) => setRow(row.id, { acquirer: e.target.value })} className="!py-1.5 !text-sm" />
                      </td>
                      <td className="w-20 py-1.5 pr-2">
                        <input aria-label={`${name} year`} inputMode="numeric" maxLength={4} value={row.year} onChange={(e) => setRow(row.id, { year: e.target.value.replace(/\D/g, "") })} className={cellCls} />
                      </td>
                      {(["ev", "revenue", "ebitda", "premium"] as const).map((k) => (
                        <td key={k} className="py-1.5 pr-2">
                          <input aria-label={`${name} ${k === "ev" ? "deal enterprise value" : k === "premium" ? "premium percent" : k}`} inputMode="decimal" value={row[k]} onChange={(e) => setRow(row.id, { [k]: num0(e.target.value) })} className={cellCls} />
                        </td>
                      ))}
                      <td className="py-1.5 pr-2 text-right tabular-nums">{x1(mult.evRevenue)}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{x1(mult.evEbitda)}</td>
                      <td className="py-1.5 text-right">
                        <Button variant="ghost" onClick={() => up({ rows: d.rows.filter((x) => x.id !== row.id) })} aria-label={`Remove ${name}`}>
                          Remove
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {(r.evEbitda || r.evRevenue || r.premium) && (
        <Panel title="Summary of the deals">
          <NumTable
            caption="Summary statistics of the transaction multiples and premiums"
            corner=""
            head={["Low", "25th", "Median", "Mean", "75th", "High"]}
            rows={[
              { label: "EV/Revenue", cells: stat(r.evRevenue, x1) },
              { label: "EV/EBITDA", cells: stat(r.evEbitda, x1) },
              { label: "Premium paid", cells: stat(r.premium, pc) },
            ]}
          />
        </Panel>
      )}
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Panel title="The target" subtitle="Apply the range to this company.">
          <label className={labelCls}>
            Value on
            <Select value={d.basis} onChange={(e) => up({ basis: e.target.value as PrecedentInputs["basis"] })}>
              <option value="ebitda">EV/EBITDA</option>
              <option value="revenue">EV/Revenue</option>
            </Select>
          </label>
          <MoneyField label="Target revenue" prefix="$" suffix="M" value={d.targetRevenue} onChange={(v) => up({ targetRevenue: num0(v) })} />
          <MoneyField label="Target EBITDA" prefix="$" suffix="M" value={d.targetEbitda} onChange={(v) => up({ targetEbitda: num0(v) })} />
          <MoneyField label="Net debt" prefix="$" suffix="M" value={d.netDebt} onChange={(v) => up({ netDebt: num0(v) })} />
          <MoneyField label="Shares" suffix="M" value={d.shares} onChange={(v) => up({ shares: num0(v) })} />
          <MoneyField label="Current share price" prefix="$" value={d.price} onChange={(v) => up({ price: num0(v) })} />
        </Panel>
        <div className="flex min-w-0 flex-col gap-6">
          {r.range ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Tile label="Enterprise value" value={`${m(r.range.ev[0])} to ${m(r.range.ev[2])}`} sub={`median ${m(r.range.ev[1])}`} />
              <Tile label="Equity value" value={`${m(r.range.equity[0])} to ${m(r.range.equity[2])}`} sub={`median ${m(r.range.equity[1])}`} />
              <Tile label="Per share" value={`${usd2(r.range.perShare[0])} to ${usd2(r.range.perShare[2])}`} sub={`median ${usd2(r.range.perShare[1])}`} />
              <Tile label="At the median premium" value={r.premiumPrice == null ? "n/a" : usd2(r.premiumPrice)} sub={r.premium ? `${pc(r.premium.median)} over today's price` : "add premiums and a price"} />
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center font-[family-name:var(--font-ui)] text-sm text-ink-soft">Add deals and the target's matching figure to see the implied value.</p>
          )}
          <HowCalculated steps={r.steps} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** A paper LBO against the clock: five answers worked in your head or on paper, then the working. */
export function PaperLboTool({ runs, onRun }: { runs: PaperRun[]; onRun: (run: PaperRun) => void }) {
  const [seed, setSeed] = useState(() => 1 + Math.floor(Math.random() * 100000));
  const q = useMemo(() => paperLbo(seed), [seed]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [running]);

  const marks = PAPER_QUESTIONS.map((p) => paperCheck(q, p.id, parseFloat(answers[p.id] ?? "")));
  const correct = marks.filter(Boolean).length;
  const check = () => {
    setRunning(false);
    setChecked(true);
    onRun({ date: new Date().toISOString().slice(0, 10), seed, correct, seconds });
  };
  const next = () => {
    setSeed(1 + Math.floor(Math.random() * 100000));
    setAnswers({});
    setSeconds(0);
    setRunning(false);
    setChecked(false);
  };
  const best = runs.filter((r) => r.correct === PAPER_QUESTIONS.length).sort((a, b) => a.seconds - b.seconds)[0];
  const shown = (id: (typeof PAPER_QUESTIONS)[number]["id"]) => {
    const a = q.answers[id];
    return id === "moic" ? `${f1(a)}x` : id === "irr" ? pc(a) : m(a);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="flex min-w-0 flex-col gap-6">
        <Panel title="The deal" subtitle="A paper LBO is done without a spreadsheet, usually in five to ten minutes. Start the clock, work it on paper, then check.">
          <ul className="grid gap-2 font-[family-name:var(--font-ui)] text-sm text-ink sm:grid-cols-2">
            <li>A sponsor buys a company with <b>${q.ebitda}M of EBITDA</b> for <b>{q.entryMultiple}x EBITDA</b>.</li>
            <li>It borrows <b>{q.leverage}x EBITDA</b>; the rest is equity. Ignore fees.</li>
            <li>EBITDA grows by <b>${q.ebitdaStep}M a year</b>.</li>
            <li>The company repays <b>${q.paydown}M of debt a year</b>.</li>
            <li>The sponsor sells after <b>{q.years} years</b> at <b>{q.exitMultiple}x EBITDA</b>.</li>
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-[family-name:var(--font-ui)] text-3xl font-semibold tabular-nums text-ink" aria-label={`Elapsed ${clock(seconds)}`}>
              {clock(seconds)}
            </p>
            {!checked && <Button onClick={() => setRunning((x) => !x)}>{running ? "Pause" : seconds > 0 ? "Resume" : "Start the clock"}</Button>}
            <Button variant="ghost" onClick={next}>
              New deal
            </Button>
          </div>
        </Panel>
        <Panel title="Your answers">
          <div className="grid gap-3 sm:grid-cols-2">
            {PAPER_QUESTIONS.map((p, i) => (
              <label key={p.id} className={labelCls}>
                <span>
                  {p.label} <span className="font-normal">({p.unit})</span>
                </span>
                <input
                  inputMode="decimal"
                  value={answers[p.id] ?? ""}
                  disabled={checked}
                  onChange={(e) => setAnswers({ ...answers, [p.id]: num0(e.target.value) })}
                  aria-describedby={checked ? `paper-${p.id}` : undefined}
                  className={cellCls}
                />
                {checked && (
                  <span id={`paper-${p.id}`} className={`font-normal ${marks[i] ? "text-river-1" : "text-red-700"}`}>
                    {marks[i] ? "Correct" : "Not quite"}: {shown(p.id)} <span className="text-ink-soft">({p.hint})</span>
                  </span>
                )}
              </label>
            ))}
          </div>
          {!checked ? (
            <div>
              <Button onClick={check} disabled={!PAPER_QUESTIONS.some((p) => (answers[p.id] ?? "").trim() !== "")}>
                Check my answers
              </Button>
            </div>
          ) : (
            <p role="status" className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
              {correct} of {PAPER_QUESTIONS.length} in {clock(seconds)}.
            </p>
          )}
        </Panel>
        {checked && <HowCalculated title="The working" steps={paperSteps(q)} />}
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <Panel title="IRR in your head" subtitle="Memorize the multiple-to-IRR table; interviewers expect the estimate, not a calculator.">
          <table className="w-full border-collapse font-[family-name:var(--font-ui)] text-sm">
            <caption className="sr-only">IRR for a multiple of money over three and five years</caption>
            <thead>
              <tr className="border-b border-line text-xs text-ink-soft">
                <th className="py-2 text-left font-medium">Multiple</th>
                <th className="py-2 text-right font-medium">3 years</th>
                <th className="py-2 text-right font-medium">5 years</th>
              </tr>
            </thead>
            <tbody>
              {IRR_TABLE.map((t) => (
                <tr key={t.moic} className="border-b border-line/60">
                  <th scope="row" className="py-1.5 text-left font-normal text-ink">{f1(t.moic)}x</th>
                  <td className="py-1.5 text-right tabular-nums text-ink">{pc(t.three)}</td>
                  <td className="py-1.5 text-right tabular-nums text-ink">{pc(t.five)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Your runs" subtitle={best ? `Best clean run: ${clock(best.seconds)}.` : "A clean run is five of five."}>
          {runs.length === 0 ? (
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">No runs yet.</p>
          ) : (
            <ul className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-sm text-ink">
              {runs.slice(0, 8).map((r, i) => (
                <li key={`${r.date}-${r.seed}-${i}`} className="flex justify-between gap-3 tabular-nums">
                  <span className="text-ink-soft">{r.date}</span>
                  <span>
                    {r.correct} of {PAPER_QUESTIONS.length} · {clock(r.seconds)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
