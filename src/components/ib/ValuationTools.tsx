import { useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { Select, TextInput } from "../ui/Field";
import { HowCalculated, MoneyField, Panel, Tile } from "../wealth/parts";
import { NumTable, SubTabs, TabPanel, cellCls, labelCls } from "./ibParts";
import { comps, dcf, dcfGrid, lbo, lboGrid, merger, type CompRow, type CompsInputs, type DcfInputs, type LboInputs, type MergerInputs } from "../../lib/ibMath";
import { uid } from "../../lib/wealthMath";
import type { IbData } from "../../lib/ibWorkspace";

const num0 = (v: string) => v.replace(/[^0-9.-]/g, "");
const f1 = (x: number) => (Math.round(x * 10) / 10).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const m = (x: number) => `$${f1(x)}M`;
const x1 = (x: number | null) => (x == null ? "n/a" : `${f1(x)}x`);
const pc = (x: number) => `${f1(x * 100)}%`;
const usd2 = (x: number) => `$${(Math.round(x * 100) / 100).toFixed(2)}`;

type Sub = "dcf" | "comps" | "lbo" | "merger";
const SUBS: { id: Sub; label: string }[] = [
  { id: "dcf", label: "DCF" },
  { id: "comps", label: "Comparables" },
  { id: "lbo", label: "LBO" },
  { id: "merger", label: "Accretion and dilution" },
];

interface P {
  data: IbData;
  update: (fn: (d: IbData) => IbData) => void;
}

/** The four valuation models. Amounts are in millions of dollars. */
export function ValuationTools({ data, update }: P) {
  const [sub, setSub] = useState<Sub>("dcf");
  return (
    <div className="flex flex-col gap-6">
      <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
        Amounts are in millions of dollars (shares in millions). These are teaching models built from numbers you enter: change an input and watch what moves. Each result has a "How this was calculated" note.
      </p>
      <SubTabs label="Valuation models" tabs={SUBS} value={sub} onChange={setSub} prefix="val" />
      <TabPanel prefix="val" id={sub}>
        {sub === "dcf" && <DcfTool d={data.dcf} set={(dcf) => update((x) => ({ ...x, dcf }))} />}
        {sub === "comps" && <CompsTool d={data.comps} set={(comps) => update((x) => ({ ...x, comps }))} />}
        {sub === "lbo" && <LboTool d={data.lbo} set={(lbo) => update((x) => ({ ...x, lbo }))} />}
        {sub === "merger" && <MergerTool d={data.merger} set={(merger) => update((x) => ({ ...x, merger }))} />}
      </TabPanel>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function DcfTool({ d, set }: { d: DcfInputs; set: (d: DcfInputs) => void }) {
  const r = useMemo(() => dcf(d), [d]);
  const grid = useMemo(() => dcfGrid(d), [d]);
  const up = (patch: Partial<DcfInputs>) => set({ ...d, ...patch });
  return (
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <Panel title="Inputs" subtitle="Five forecast years, then a terminal value.">
        <MoneyField label="Last year's revenue" prefix="$" suffix="M" value={d.revenue} onChange={(v) => up({ revenue: num0(v) })} />
        <fieldset className="flex flex-col gap-1">
          <legend className={labelCls}>Revenue growth by year, %</legend>
          <div className="grid grid-cols-5 gap-2">
            {d.growth.map((g, i) => (
              <input key={i} aria-label={`Growth in year ${i + 1}`} inputMode="decimal" value={g} onChange={(e) => up({ growth: d.growth.map((x, j) => (j === i ? num0(e.target.value) : x)) })} className={cellCls} />
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <MoneyField label="EBIT margin" suffix="%" value={d.ebitMargin} onChange={(v) => up({ ebitMargin: num0(v) })} />
          <MoneyField label="Tax rate" suffix="%" value={d.tax} onChange={(v) => up({ tax: num0(v) })} />
          <MoneyField label="D&A, % of revenue" suffix="%" value={d.da} onChange={(v) => up({ da: num0(v) })} />
          <MoneyField label="Capex, % of revenue" suffix="%" value={d.capex} onChange={(v) => up({ capex: num0(v) })} />
          <MoneyField label="Working capital, % of the change in revenue" suffix="%" value={d.nwc} onChange={(v) => up({ nwc: num0(v) })} className="col-span-2" />
          <MoneyField label="WACC" suffix="%" value={d.wacc} onChange={(v) => up({ wacc: num0(v) })} />
          <MoneyField label="Terminal growth" suffix="%" value={d.terminalGrowth} onChange={(v) => up({ terminalGrowth: num0(v) })} />
          <MoneyField label="Exit EV/EBITDA" suffix="x" value={d.exitMultiple} onChange={(v) => up({ exitMultiple: num0(v) })} />
          <MoneyField label="Net debt" prefix="$" suffix="M" value={d.netDebt} onChange={(v) => up({ netDebt: num0(v) })} />
          <MoneyField label="Shares" suffix="M" value={d.shares} onChange={(v) => up({ shares: num0(v) })} />
          <MoneyField label="Current share price (optional)" prefix="$" value={d.price} onChange={(v) => up({ price: num0(v) })} />
        </div>
        <label className="flex cursor-pointer items-center gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
          <input type="checkbox" checked={d.midYear} onChange={(e) => up({ midYear: e.target.checked })} className="h-4 w-4 accent-[var(--color-water-deep)]" />
          Mid-year convention
        </label>
      </Panel>
      <div className="flex min-w-0 flex-col gap-6">
        {!r.valid ? (
          <p role="alert" className="rounded-lg border border-clay px-4 py-4 font-[family-name:var(--font-ui)] text-sm text-ink">
            {r.problem}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Tile label="Enterprise value" value={m(r.evPerpetuity)} sub="perpetuity growth" />
              <Tile label="Enterprise value" value={m(r.evExit)} sub="exit multiple" />
              <Tile label="Value per share" value={usd2(r.perSharePerpetuity)} sub={r.upside == null ? "perpetuity growth" : `${r.upside >= 0 ? "+" : ""}${f1(r.upside * 100)}% vs price`} tone={r.upside == null ? undefined : r.upside >= 0 ? "good" : "bad"} />
              <Tile label="Terminal value" value={pc(r.terminalShare)} sub="of enterprise value" tone={r.terminalShare > 0.75 ? "warn" : undefined} />
            </div>
            <Panel title="Free cash flow forecast" subtitle="Millions of dollars.">
              <NumTable
                caption="Five-year free cash flow forecast"
                corner="$M"
                head={r.years.map((y) => `Year ${y.year}`)}
                rows={[
                  { label: "Revenue", cells: r.years.map((y) => f1(y.revenue)) },
                  { label: "EBIT", cells: r.years.map((y) => f1(y.ebit)) },
                  { label: "NOPAT (after tax)", cells: r.years.map((y) => f1(y.nopat)) },
                  { label: "+ D&A", cells: r.years.map((y) => f1(y.da)) },
                  { label: "− Capex", cells: r.years.map((y) => `(${f1(y.capex)})`) },
                  { label: "− Increase in working capital", cells: r.years.map((y) => `(${f1(y.dNwc)})`) },
                  { label: "Free cash flow", cells: r.years.map((y) => f1(y.fcf)), bold: true },
                  { label: "Present value", cells: r.years.map((y) => f1(y.pv)) },
                ]}
              />
            </Panel>
            <Panel title="Cross-check the two terminal values" subtitle="They should roughly agree. If they do not, one assumption is off.">
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink">
                The perpetuity value implies an exit multiple of <b>{x1(r.impliedMultiple)}</b> EBITDA; your exit multiple of {d.exitMultiple}x implies <b>{pc(r.impliedGrowth)}</b> growth forever.
              </p>
            </Panel>
            <Panel title="Value per share: WACC against terminal growth">
              <NumTable
                caption="Sensitivity of value per share to WACC and terminal growth"
                corner="WACC \ growth"
                head={grid.growths.map((g) => `${g}%`)}
                rows={grid.waccs.map((w, i) => ({ label: `${w}%`, cells: grid.values[i].map((v) => (v == null ? "n/a" : usd2(v))), bold: i === 2 }))}
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

function CompsTool({ d, set }: { d: CompsInputs; set: (d: CompsInputs) => void }) {
  const r = useMemo(() => comps(d), [d]);
  const up = (patch: Partial<CompsInputs>) => set({ ...d, ...patch });
  const setRow = (id: string, patch: Partial<CompRow>) => up({ rows: d.rows.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Comparable companies"
        subtitle="Enter each one's enterprise value, revenue, EBITDA, net income and equity value (all in millions), from the company's own filings. The multiples are worked out for you."
        actions={
          <Button variant="secondary" disabled={d.rows.length >= 15} onClick={() => up({ rows: [...d.rows, { id: uid(), name: "", ev: "", revenue: "", ebitda: "", netIncome: "", equity: "" }] })}>
            Add a company
          </Button>
        }
      >
        {d.rows.length === 0 ? (
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">No companies yet. Add four to eight that are similar in business, size and growth.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse font-[family-name:var(--font-ui)] text-sm">
              <caption className="sr-only">Comparable companies</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-soft">
                  {["Company", "EV", "Revenue", "EBITDA", "Net income", "Equity value"].map((h) => (
                    <th key={h} className="py-2 pr-2 font-medium">
                      {h}
                    </th>
                  ))}
                  <th className="py-2 pr-2 text-right font-medium">EV/Rev</th>
                  <th className="py-2 pr-2 text-right font-medium">EV/EBITDA</th>
                  <th className="py-2 pr-2 text-right font-medium">P/E</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {d.rows.map((row, i) => {
                  const mult = r.rows[i];
                  return (
                    <tr key={row.id} className="border-b border-line/60">
                      <td className="py-1.5 pr-2">
                        <TextInput aria-label={`Company ${i + 1} name`} value={row.name} onChange={(e) => setRow(row.id, { name: e.target.value })} className="!py-1.5 !text-sm" />
                      </td>
                      {(["ev", "revenue", "ebitda", "netIncome", "equity"] as const).map((k) => (
                        <td key={k} className="py-1.5 pr-2">
                          <input aria-label={`${row.name || `Company ${i + 1}`} ${k === "ev" ? "enterprise value" : k === "netIncome" ? "net income" : k === "equity" ? "equity value" : k}`} inputMode="decimal" value={row[k]} onChange={(e) => setRow(row.id, { [k]: num0(e.target.value) })} className={cellCls} />
                        </td>
                      ))}
                      <td className="py-1.5 pr-2 text-right tabular-nums">{x1(mult.evRevenue)}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{x1(mult.evEbitda)}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{x1(mult.pe)}</td>
                      <td className="py-1.5 text-right">
                        <Button variant="ghost" onClick={() => up({ rows: d.rows.filter((x) => x.id !== row.id) })} aria-label={`Remove ${row.name || `company ${i + 1}`}`}>
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
      {(r.evEbitda || r.evRevenue || r.pe) && (
        <Panel title="Summary of the multiples">
          <NumTable
            caption="Summary statistics of the comparable multiples"
            corner=""
            head={["Low", "25th", "Median", "Mean", "75th", "High"]}
            rows={[
              { label: "EV/Revenue", cells: r.evRevenue ? [r.evRevenue.low, r.evRevenue.q1, r.evRevenue.median, r.evRevenue.mean, r.evRevenue.q3, r.evRevenue.high].map(x1) : Array(6).fill("n/a") },
              { label: "EV/EBITDA", cells: r.evEbitda ? [r.evEbitda.low, r.evEbitda.q1, r.evEbitda.median, r.evEbitda.mean, r.evEbitda.q3, r.evEbitda.high].map(x1) : Array(6).fill("n/a") },
              { label: "P/E", cells: r.pe ? [r.pe.low, r.pe.q1, r.pe.median, r.pe.mean, r.pe.q3, r.pe.high].map(x1) : Array(6).fill("n/a") },
            ]}
          />
        </Panel>
      )}
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Panel title="The target" subtitle="Apply the range to this company.">
          <label className={labelCls}>
            Value on
            <Select value={d.basis} onChange={(e) => up({ basis: e.target.value as CompsInputs["basis"] })}>
              <option value="ebitda">EV/EBITDA</option>
              <option value="revenue">EV/Revenue</option>
              <option value="pe">P/E</option>
            </Select>
          </label>
          <MoneyField label="Target revenue" prefix="$" suffix="M" value={d.targetRevenue} onChange={(v) => up({ targetRevenue: num0(v) })} />
          <MoneyField label="Target EBITDA" prefix="$" suffix="M" value={d.targetEbitda} onChange={(v) => up({ targetEbitda: num0(v) })} />
          <MoneyField label="Target net income" prefix="$" suffix="M" value={d.targetNetIncome} onChange={(v) => up({ targetNetIncome: num0(v) })} />
          <MoneyField label="Net debt" prefix="$" suffix="M" value={d.netDebt} onChange={(v) => up({ netDebt: num0(v) })} />
          <MoneyField label="Shares" suffix="M" value={d.shares} onChange={(v) => up({ shares: num0(v) })} />
        </Panel>
        <div className="flex min-w-0 flex-col gap-6">
          {r.range ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <Tile label="Enterprise value" value={`${m(r.range.ev[0])} to ${m(r.range.ev[2])}`} sub={`median ${m(r.range.ev[1])}`} />
              <Tile label="Equity value" value={`${m(r.range.equity[0])} to ${m(r.range.equity[2])}`} sub={`median ${m(r.range.equity[1])}`} />
              <Tile label="Per share" value={`${usd2(r.range.perShare[0])} to ${usd2(r.range.perShare[2])}`} sub={`median ${usd2(r.range.perShare[1])}`} />
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center font-[family-name:var(--font-ui)] text-sm text-ink-soft">Add comparables and the target's matching figure to see the implied value.</p>
          )}
          <HowCalculated steps={r.steps} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function LboTool({ d, set }: { d: LboInputs; set: (d: LboInputs) => void }) {
  const r = useMemo(() => lbo(d), [d]);
  const grid = useMemo(() => lboGrid(d), [d]);
  const up = (patch: Partial<LboInputs>) => set({ ...d, ...patch });
  return (
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <Panel title="Inputs" subtitle="A buyout with one tranche of debt and a full cash sweep.">
        <div className="grid grid-cols-2 gap-3">
          <MoneyField label="EBITDA at entry" prefix="$" suffix="M" value={d.ebitda} onChange={(v) => up({ ebitda: num0(v) })} />
          <MoneyField label="Entry multiple" suffix="x" value={d.entryMultiple} onChange={(v) => up({ entryMultiple: num0(v) })} />
          <MoneyField label="Debt, x EBITDA" suffix="x" value={d.leverage} onChange={(v) => up({ leverage: num0(v) })} />
          <MoneyField label="Interest rate" suffix="%" value={d.interest} onChange={(v) => up({ interest: num0(v) })} />
          <MoneyField label="Fees, % of price" suffix="%" value={d.fees} onChange={(v) => up({ fees: num0(v) })} />
          <MoneyField label="EBITDA growth" suffix="%" value={d.growth} onChange={(v) => up({ growth: num0(v) })} />
          <MoneyField label="D&A, % of EBITDA" suffix="%" value={d.da} onChange={(v) => up({ da: num0(v) })} />
          <MoneyField label="Capex, % of EBITDA" suffix="%" value={d.capex} onChange={(v) => up({ capex: num0(v) })} />
          <MoneyField label="Working capital, % of EBITDA" suffix="%" value={d.nwc} onChange={(v) => up({ nwc: num0(v) })} />
          <MoneyField label="Tax rate" suffix="%" value={d.tax} onChange={(v) => up({ tax: num0(v) })} />
          <MoneyField label="Years held" value={d.years} onChange={(v) => up({ years: num0(v) })} />
          <MoneyField label="Exit multiple" suffix="x" value={d.exitMultiple} onChange={(v) => up({ exitMultiple: num0(v) })} />
        </div>
      </Panel>
      <div className="flex min-w-0 flex-col gap-6">
        {!r.valid ? (
          <p role="alert" className="rounded-lg border border-clay px-4 py-4 font-[family-name:var(--font-ui)] text-sm text-ink">
            {r.problem}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Tile label="IRR" value={pc(r.irr)} sub="sponsor equity" tone={r.irr >= 0.2 ? "good" : r.irr >= 0.12 ? "warn" : "bad"} />
              <Tile label="Multiple of money" value={x1(r.moic)} sub={`${m(r.equity)} in, ${m(r.exitEquity)} out`} />
              <Tile label="Purchase price" value={m(r.price)} sub={`${d.entryMultiple}x EBITDA`} />
              <Tile label="Equity share of the deal" value={pc(r.equity / r.uses)} sub={`debt ${m(r.debt)}`} />
            </div>
            <Panel title="Sources and uses">
              <NumTable
                caption="Sources and uses of funds"
                corner="$M"
                head={["Amount", "Share"]}
                rows={[
                  { label: "Purchase price", cells: [f1(r.price), pc(r.price / r.uses)] },
                  { label: "Fees", cells: [f1(r.fees), pc(r.fees / r.uses)] },
                  { label: "Total uses", cells: [f1(r.uses), "100.0%"], bold: true },
                  { label: "Debt", cells: [f1(r.debt), pc(r.debt / r.uses)] },
                  { label: "Sponsor equity", cells: [f1(r.equity), pc(r.equity / r.uses)] },
                  { label: "Total sources", cells: [f1(r.uses), "100.0%"], bold: true },
                ]}
              />
            </Panel>
            <Panel title="Debt paydown">
              <NumTable
                caption="Year-by-year debt paydown"
                corner="$M"
                head={r.years.map((y) => `Year ${y.year}`)}
                rows={[
                  { label: "EBITDA", cells: r.years.map((y) => f1(y.ebitda)) },
                  { label: "Interest", cells: r.years.map((y) => f1(y.interest)) },
                  { label: "Taxes", cells: r.years.map((y) => f1(y.tax)) },
                  { label: "Cash flow to repay debt", cells: r.years.map((y) => f1(y.fcf)) },
                  { label: "Debt at year end", cells: r.years.map((y) => f1(y.debt)), bold: true },
                ]}
              />
            </Panel>
            <Panel title="Where the return came from" subtitle="The gain in equity value, split three ways.">
              <NumTable
                caption="Value creation bridge"
                corner="$M"
                head={["Amount"]}
                rows={[
                  { label: "EBITDA growth", cells: [f1(r.bridge.growth)] },
                  { label: "Change in the multiple", cells: [f1(r.bridge.multiple)] },
                  { label: "Debt paid down", cells: [f1(r.bridge.debt)] },
                  { label: "Fees", cells: [`(${f1(-r.bridge.fees)})`] },
                  { label: "Gain in equity value", cells: [f1(r.bridge.total)], bold: true },
                ]}
              />
            </Panel>
            <Panel title="IRR: exit multiple against years held">
              <NumTable
                caption="Sensitivity of IRR to exit multiple and years held"
                corner="Years \ exit"
                head={grid.multiples.map((x) => `${x}x`)}
                rows={grid.holds.map((h, i) => ({ label: `${h} years`, cells: grid.values[i].map((v) => (v == null ? "n/a" : pc(v))), bold: String(h) === d.years }))}
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

function MergerTool({ d, set }: { d: MergerInputs; set: (d: MergerInputs) => void }) {
  const r = useMemo(() => merger(d), [d]);
  const up = (patch: Partial<MergerInputs>) => set({ ...d, ...patch });
  return (
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <Panel title="Inputs" subtitle="Acquirer, target, and how the deal is paid for.">
        <div className="grid grid-cols-2 gap-3">
          <MoneyField label="Acquirer share price" prefix="$" value={d.acqPrice} onChange={(v) => up({ acqPrice: num0(v) })} />
          <MoneyField label="Acquirer shares" suffix="M" value={d.acqShares} onChange={(v) => up({ acqShares: num0(v) })} />
          <MoneyField label="Acquirer net income" prefix="$" suffix="M" value={d.acqNetIncome} onChange={(v) => up({ acqNetIncome: num0(v) })} className="col-span-2" />
          <MoneyField label="Target share price" prefix="$" value={d.tgtPrice} onChange={(v) => up({ tgtPrice: num0(v) })} />
          <MoneyField label="Target shares" suffix="M" value={d.tgtShares} onChange={(v) => up({ tgtShares: num0(v) })} />
          <MoneyField label="Target net income" prefix="$" suffix="M" value={d.tgtNetIncome} onChange={(v) => up({ tgtNetIncome: num0(v) })} className="col-span-2" />
          <MoneyField label="Offer premium" suffix="%" value={d.premium} onChange={(v) => up({ premium: num0(v) })} />
          <MoneyField label="Paid in stock" suffix="%" value={d.stockPct} onChange={(v) => up({ stockPct: num0(v) })} />
          <MoneyField label="Cost of cash, pre-tax" suffix="%" value={d.costOfCash} onChange={(v) => up({ costOfCash: num0(v) })} />
          <MoneyField label="Synergies, pre-tax" prefix="$" suffix="M" value={d.synergies} onChange={(v) => up({ synergies: num0(v) })} />
          <MoneyField label="Tax rate" suffix="%" value={d.tax} onChange={(v) => up({ tax: num0(v) })} />
        </div>
      </Panel>
      <div className="flex min-w-0 flex-col gap-6">
        {!r.valid ? (
          <p role="alert" className="rounded-lg border border-clay px-4 py-4 font-[family-name:var(--font-ui)] text-sm text-ink">
            {r.problem}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Tile label={r.accretion >= 0 ? "Accretion" : "Dilution"} value={`${r.accretion >= 0 ? "+" : ""}${f1(r.accretion * 100)}%`} sub="to the acquirer's EPS" tone={r.accretion >= 0 ? "good" : "bad"} />
              <Tile label="Pro forma EPS" value={usd2(r.proFormaEps)} sub={`standalone ${usd2(r.standaloneEps)}`} />
              <Tile label="Purchase price" value={m(r.purchasePrice)} sub={`offer ${usd2(r.offerPrice)} a share`} />
              <Tile label="Break-even synergies" value={m(r.breakEvenSynergies)} sub="pre-tax, for zero accretion" />
            </div>
            <Panel title="The deal">
              <NumTable
                caption="Consideration and pro forma figures"
                corner=""
                head={["Amount"]}
                rows={[
                  { label: "Paid in stock ($M)", cells: [f1(r.stockIssued)] },
                  { label: "New shares issued (M)", cells: [f1(r.newShares)] },
                  { label: "Paid in cash ($M)", cells: [f1(r.cashPaid)] },
                  { label: "Pro forma net income ($M)", cells: [f1(r.proFormaIncome)] },
                  { label: "Pro forma shares (M)", cells: [f1(r.proFormaShares)] },
                  { label: "Acquirer P/E", cells: [x1(r.acqPe)] },
                  { label: "P/E paid for the target", cells: [x1(r.offerPe)] },
                ]}
              />
            </Panel>
            <HowCalculated steps={r.steps} />
          </>
        )}
      </div>
    </div>
  );
}
