import { useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { Select, TextInput } from "../ui/Field";
import { HowCalculated, ModuleHead, MoneyField, NoteField, Panel, Tile } from "./parts";
import type { ModuleProps } from "./PlanModules";
import { stepNo } from "./steps";
import { FILING_OPTIONS, STANDARD_DEDUCTION, TAX_YEAR } from "../../lib/taxMath";
import { RISK_PROFILES, fmtUsd, num, snapshotNumbers, uid, type WealthPlan } from "../../lib/wealthMath";
import {
  ACCOUNT_LABEL,
  LOSS_DEDUCTION_LIMIT,
  NON_ITEMIZER_GIFT,
  PLANNING_TOOLS,
  TAX_TRAITS,
  UMBRELLA_FACTORS,
  assetLocation,
  capitalGains,
  givingOptions,
  insuranceNeeds,
  rothConversion,
  type AccountKind,
  type GainsData,
  type GivingData,
  type InsuranceData,
  type LocationData,
  type PlanningData,
  type PlanningToolId,
  type RothData,
} from "../../lib/wealthPlanning";
import { CLASS_IDS, MODEL_PORTFOLIOS, weightTotal, type ClassId } from "../../lib/wealthPortfolio";
import { planningToolsOn } from "../../lib/wealthSetup";

const cell =
  "w-full min-w-0 rounded-lg border border-line bg-surface px-2 py-1.5 font-[family-name:var(--font-ui)] text-sm tabular-nums text-ink focus:border-water focus:outline-none";
const fieldCls = "flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft";
const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
const acct = (n: number) => (n < 0 ? `(${fmtUsd(Math.abs(n))})` : fmtUsd(n));

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-water-deep)]" />
      <span>{children}</span>
    </label>
  );
}

function FilingSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className={fieldCls}>
      Filing status
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {FILING_OPTIONS.map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </Select>
    </label>
  );
}

/** The step for the planning tools that matter to this client: insurance, Roth conversion, asset location, capital gains and giving. */
export function PlanningStep({ plan, set }: ModuleProps) {
  const on = planningToolsOn(plan.setup);
  const tools = PLANNING_TOOLS.filter((t) => on.includes(t.id));
  const [tab, setTab] = useState<PlanningToolId>(tools[0]?.id ?? "insurance");
  const current = tools.some((t) => t.id === tab) ? tab : (tools[0]?.id ?? "insurance");
  const pl = plan.planning;
  const setPl = (patch: Partial<PlanningData>) => set({ ...plan, planning: { ...pl, ...patch } });

  return (
    <div className="flex flex-col gap-6">
      <ModuleHead
        step={stepNo("planning")}
        title="Planning depth"
        desc="The questions beyond saving and investing: is the family protected, how to keep tax low, and how to give well. Only the tools you turned on for this client in Plan setup are here."
      />
      <p role="note" className="rounded-xl border border-line bg-parchment-deep px-5 py-3 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
        Planning estimates for learning, not tax or insurance advice. Tax figures are the IRS's for {TAX_YEAR} and ignore credits, phase-outs, the alternative minimum tax and state rules. Each result has a "How this was calculated" note you can open and check.
      </p>
      <div role="tablist" aria-label="Planning tools" className="flex gap-1 overflow-x-auto rounded-xl bg-parchment-deep p-1">
        {tools.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`pl-tab-${t.id}`}
            aria-selected={current === t.id}
            aria-controls={`pl-panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`min-w-[120px] flex-1 whitespace-nowrap rounded-lg px-3 py-2 font-[family-name:var(--font-ui)] text-sm font-medium transition-colors ${current === t.id ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
          >
            {t.short}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`pl-panel-${current}`} aria-labelledby={`pl-tab-${current}`}>
        {current === "insurance" && <InsuranceTab plan={plan} d={pl.insurance} setD={(insurance) => setPl({ insurance })} />}
        {current === "roth" && <RothTab plan={plan} d={pl.roth} setD={(roth) => setPl({ roth })} />}
        {current === "location" && <LocationTab plan={plan} d={pl.location} setD={(location) => setPl({ location })} />}
        {current === "gains" && <GainsTab plan={plan} d={pl.gains} setD={(gains) => setPl({ gains })} />}
        {current === "giving" && <GivingTab plan={plan} d={pl.giving} setD={(giving) => setPl({ giving })} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function InsuranceTab({ plan, d, setD }: { plan: WealthPlan; d: InsuranceData; setD: (d: InsuranceData) => void }) {
  const snap = snapshotNumbers(plan);
  const r = useMemo(() => insuranceNeeds(d, snap), [d, snap.debts, snap.mortgage, snap.liquid, snap.netWorth]); // eslint-disable-line react-hooks/exhaustive-deps
  const up = (patch: Partial<InsuranceData>) => setD({ ...d, ...patch });
  const num0 = (v: string) => v.replace(/[^0-9.]/g, "");
  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <div className="flex flex-col gap-6">
        <Panel title="Life insurance" subtitle="The DIME method: debts, income, mortgage, education.">
          <MoneyField label="Yearly gross pay of the person insured" prefix="$" value={d.income} onChange={(v) => up({ income: num0(v) })} />
          <div className="grid grid-cols-2 gap-3">
            <MoneyField label="Dependents" value={d.dependents} onChange={(v) => up({ dependents: num0(v) })} />
            <MoneyField label="Years of income to replace" value={d.years} onChange={(v) => up({ years: num0(v) })} />
          </div>
          <MoneyField label="Share of income to replace" suffix="%" value={d.replacePct} onChange={(v) => up({ replacePct: num0(v) })} hint="70% is common: the family no longer needs the insured's own spending or the taxes." />
          <Check checked={d.useSnapshot} onChange={(v) => up({ useSnapshot: v })}>
            Take debts, the mortgage and liquid savings from the Snapshot
            <span className="block text-xs text-ink-soft">
              Now: debts {fmtUsd(snap.debts)}, mortgage {fmtUsd(snap.mortgage)}, liquid {fmtUsd(snap.liquid)}.
            </span>
          </Check>
          {!d.useSnapshot && (
            <div className="grid grid-cols-3 gap-3">
              <MoneyField label="Debts" prefix="$" value={d.debts} onChange={(v) => up({ debts: num0(v) })} />
              <MoneyField label="Mortgage" prefix="$" value={d.mortgage} onChange={(v) => up({ mortgage: num0(v) })} />
              <MoneyField label="Liquid savings" prefix="$" value={d.liquid} onChange={(v) => up({ liquid: num0(v) })} />
            </div>
          )}
          <Check checked={d.payMortgage} onChange={(v) => up({ payMortgage: v })}>
            Pay off the mortgage (leave this off if the family would keep paying it)
          </Check>
          <Check checked={d.offsetLiquid} onChange={(v) => up({ offsetLiquid: v })}>
            Count liquid savings against the need
          </Check>
          <div className="grid grid-cols-2 gap-3">
            <MoneyField label="Education fund needed" prefix="$" value={d.education} onChange={(v) => up({ education: num0(v) })} />
            <MoneyField label="Final expenses" prefix="$" value={d.finalExpenses} onChange={(v) => up({ finalExpenses: num0(v) })} />
          </div>
          <MoneyField label="Life insurance already in force" prefix="$" value={d.existingLife} onChange={(v) => up({ existingLife: num0(v) })} hint="Include employer group coverage, but note it usually ends with the job." />
        </Panel>
        <Panel title="Disability and umbrella">
          <div className="grid grid-cols-3 gap-3">
            <MoneyField label="Replace" suffix="%" value={d.ltdPct} onChange={(v) => up({ ltdPct: num0(v) })} />
            <MoneyField label="Employer plan" prefix="$" value={d.groupLtd} onChange={(v) => up({ groupLtd: num0(v) })} hint="a month" />
            <MoneyField label="Own policy" prefix="$" value={d.ownLtd} onChange={(v) => up({ ownLtd: num0(v) })} hint="a month" />
          </div>
          <MoneyField label="Umbrella coverage in force" prefix="$" value={d.existingUmbrella} onChange={(v) => up({ existingUmbrella: num0(v) })} />
          <MoneyField label="Net worth, if different from the Snapshot" prefix="$" value={d.netWorth} onChange={(v) => up({ netWorth: num0(v) })} hint={`Snapshot net worth: ${fmtUsd(snap.netWorth)}`} />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">Liability risk factors</legend>
            {UMBRELLA_FACTORS.map(([id, label]) => (
              <Check key={id} checked={d.factors.includes(id)} onChange={(v) => up({ factors: v ? [...d.factors, id] : d.factors.filter((x) => x !== id) })}>
                {label}
              </Check>
            ))}
          </fieldset>
        </Panel>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Tile label="Life insurance gap" value={fmtUsd(r.life.gap)} sub={`need ${fmtUsd(r.life.need)}`} tone={r.life.gap === 0 ? "good" : "bad"} />
          <Tile label="Disability gap" value={`${fmtUsd(r.disability.gap)} a month`} sub={`target ${fmtUsd(r.disability.target)} a month`} tone={r.disability.target > 0 && r.disability.gap === 0 ? "good" : r.disability.target > 0 ? "bad" : undefined} />
          <Tile label="Umbrella to add" value={fmtUsd(r.umbrella.gap)} sub={`suggested ${fmtUsd(r.umbrella.recommended)}`} tone={r.umbrella.gap === 0 ? "good" : "warn"} />
        </div>
        <Panel title="Life insurance need">
          <table className="w-full border-collapse font-[family-name:var(--font-ui)] text-sm">
            <caption className="sr-only">Life insurance need, line by line</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-soft">
                <th className="py-2 pr-3 font-medium">Line</th>
                <th className="py-2 pr-3 text-right font-medium">Amount</th>
                <th className="py-2 font-medium">Where it comes from</th>
              </tr>
            </thead>
            <tbody>
              {r.life.rows.map((row) => (
                <tr key={row.label} className="border-b border-line/60 align-top">
                  <td className="py-2 pr-3 text-ink">{row.label}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink">{acct(row.amount)}</td>
                  <td className="py-2 text-xs text-ink-soft">{row.how}</td>
                </tr>
              ))}
              <tr className="border-b border-line/60 font-semibold">
                <td className="py-2 pr-3">Total need</td>
                <td className="py-2 pr-3 text-right tabular-nums">{acct(r.life.need)}</td>
                <td />
              </tr>
              <tr className="border-b border-line/60">
                <td className="py-2 pr-3">Less liquid savings</td>
                <td className="py-2 pr-3 text-right tabular-nums">{acct(-r.life.offset)}</td>
                <td />
              </tr>
              <tr className="border-b border-line/60">
                <td className="py-2 pr-3">Less coverage in force</td>
                <td className="py-2 pr-3 text-right tabular-nums">{acct(-r.life.existing)}</td>
                <td />
              </tr>
              <tr className="font-semibold">
                <td className="py-2 pr-3">Gap</td>
                <td className="py-2 pr-3 text-right tabular-nums">{acct(r.life.gap)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </Panel>
        <HowCalculated steps={[...r.life.steps, ...r.disability.steps, ...r.umbrella.steps]} />
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          Term life is the usual way to cover a gap that ends when the children are grown or the debts are paid; permanent life suits needs that never end. A person with no dependents and no co-signed debt often needs little or no life insurance.
        </p>
        <NoteField value={d.note} onChange={(note) => up({ note })} placeholder="e.g. Disability matters most: Maria's paycheck is the plan. Add an own-occupation policy before the next open enrollment." />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function RothTab({ plan, d, setD }: { plan: WealthPlan; d: RothData; setD: (d: RothData) => void }) {
  const r = useMemo(() => rothConversion(d), [d]);
  const up = (patch: Partial<RothData>) => setD({ ...d, ...patch });
  const num0 = (v: string) => v.replace(/[^0-9.]/g, "");
  const std = STANDARD_DEDUCTION[d.status];
  return (
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <Panel title="Conversion inputs" subtitle="Moving pre-tax money to a Roth account is taxed as ordinary income in the year it moves.">
        <FilingSelect value={d.status} onChange={(v) => up({ status: v as RothData["status"] })} />
        <MoneyField label="Taxable income before converting (yearly)" prefix="$" value={d.taxable} onChange={(v) => up({ taxable: num0(v) })} hint={`Pay and other income, less deductions. A quick figure: gross pay less the ${fmtUsd(std)} standard deduction.`} />
        <MoneyField label="Pre-tax balance that could be converted" prefix="$" value={d.balance} onChange={(v) => up({ balance: num0(v) })} />
        <MoneyField label="Amount to convert this year" prefix="$" value={d.amount} onChange={(v) => up({ amount: num0(v) })} />
        <div className="grid grid-cols-2 gap-3">
          <MoneyField label="Years until spent" value={d.years} onChange={(v) => up({ years: num0(v) })} />
          <MoneyField label="Return a year" suffix="%" value={d.ret} onChange={(v) => up({ ret: num0(v) })} />
          <MoneyField label="Tax rate in retirement" suffix="%" value={d.retRate} onChange={(v) => up({ retRate: num0(v) })} hint="Federal and state." />
          <MoneyField label="State tax now" suffix="%" value={d.state} onChange={(v) => up({ state: num0(v) })} />
        </div>
        <MoneyField label="Tax drag on money kept outside" suffix="%" value={d.drag} onChange={(v) => up({ drag: num0(v) })} hint="Share of the return the money used to pay the tax would lose to tax each year." />
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">The client's age is {plan.client.age || "not entered"}. Pay the conversion tax from money outside the account, or the benefit shrinks.</p>
      </Panel>
      <div className="flex min-w-0 flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Tile label="Tax on the conversion" value={fmtUsd(r.tax)} sub={`${pct(r.effective)} of the amount`} />
          <Tile label="Bracket after" value={`${Math.round(r.marginalAfter * 100)}%`} sub={`before: ${Math.round(r.marginalBefore * 100)}%`} />
          <Tile label="Advantage in the end" value={acct(r.advantage)} sub={`${d.years || 0} years`} tone={r.amount <= 0 ? undefined : r.advantage > 0 ? "good" : "bad"} />
          <Tile label="Break-even tax rate" value={r.amount > 0 ? pct(r.breakEvenRate) : "n/a"} sub="in retirement" />
        </div>
        <p role="status" className="rounded-lg bg-parchment-deep px-4 py-3 font-[family-name:var(--font-ui)] text-sm text-ink">
          {r.verdict}
        </p>
        <Panel title="Room left in each bracket" subtitle="Converting up to the top of a bracket keeps the extra tax at that bracket's rate.">
          {r.rooms.length === 0 ? (
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Enter taxable income to see the brackets above it.</p>
          ) : (
            <table className="w-full border-collapse font-[family-name:var(--font-ui)] text-sm">
              <caption className="sr-only">Conversion room by bracket</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-soft">
                  <th className="py-2 pr-3 font-medium">Bracket</th>
                  <th className="py-2 pr-3 text-right font-medium">Taxable income up to</th>
                  <th className="py-2 pr-3 text-right font-medium">Room to convert</th>
                  <th className="py-2 text-right font-medium">Tax on filling it</th>
                </tr>
              </thead>
              <tbody>
                {r.rooms.map((b) => (
                  <tr key={b.rate} className="border-b border-line/60">
                    <td className="py-2 pr-3">{Math.round(b.rate * 100)}%</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmtUsd(b.top)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmtUsd(b.room)}</td>
                    <td className="py-2 text-right tabular-nums">{fmtUsd(rothConversion({ ...d, amount: String(b.room) }).federal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <HowCalculated steps={r.steps} />
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          Not modeled: Medicare premium surcharges (IRMAA), loss of income-based credits and aid, the five-year rule, and the tax on Social Security benefits. A conversion cannot be undone.
        </p>
        <NoteField value={d.note} onChange={(note) => up({ note })} placeholder="e.g. Convert up to the top of the 12% bracket each year while income is low, paying the tax from savings." />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function LocationTab({ plan, d, setD }: { plan: WealthPlan; d: LocationData; setD: (d: LocationData) => void }) {
  const pf = plan.portfolio;
  const fromPortfolio = pf.started && Math.abs(weightTotal(pf) - 100) < 0.5;
  const profile = (RISK_PROFILES.find((p) => p.name === plan.client.risk)?.name ?? "Moderate") as keyof typeof MODEL_PORTFOLIOS;
  const weights = (fromPortfolio ? Object.fromEntries(pf.classes.map((c) => [c.id, num(c.weight)])) : MODEL_PORTFOLIOS[profile]) as Record<ClassId, number>;
  const ret = Object.fromEntries(pf.classes.map((c) => [c.id, num(c.ret)])) as Record<ClassId, number>;
  const r = useMemo(() => assetLocation(d, weights, ret), [d, weights, ret]);
  const up = (patch: Partial<LocationData>) => setD({ ...d, ...patch });
  const num0 = (v: string) => v.replace(/[^0-9.]/g, "");
  const names = Object.fromEntries(pf.classes.map((c) => [c.id, c.name])) as Record<ClassId, string>;
  const kinds: AccountKind[] = ["taxable", "deferred", "roth"];
  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <Panel title="Accounts" subtitle="What is in each kind of account now.">
        <MoneyField label={ACCOUNT_LABEL.taxable} prefix="$" value={d.taxable} onChange={(v) => up({ taxable: num0(v) })} />
        <MoneyField label={ACCOUNT_LABEL.deferred} prefix="$" value={d.deferred} onChange={(v) => up({ deferred: num0(v) })} />
        <MoneyField label={ACCOUNT_LABEL.roth} prefix="$" value={d.roth} onChange={(v) => up({ roth: num0(v) })} />
        <div className="grid grid-cols-2 gap-3">
          <MoneyField label="Tax rate on interest" suffix="%" value={d.ordinary} onChange={(v) => up({ ordinary: num0(v) })} hint="Ordinary bracket." />
          <MoneyField label="Rate on dividends and gains" suffix="%" value={d.qualified} onChange={(v) => up({ qualified: num0(v) })} hint="Usually 0, 15 or 20." />
        </div>
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          Mix used: {fromPortfolio ? "the portfolio from the Portfolio step" : `the ${profile} model portfolio (build a portfolio in the Portfolio step to use your own)`}.
        </p>
      </Panel>
      <div className="flex min-w-0 flex-col gap-6">
        {r.total <= 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center font-[family-name:var(--font-ui)] text-sm text-ink-soft">Enter the balance in at least one account to see where each investment should go.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <Tile label="Tax drag, same mix everywhere" value={`${fmtUsd(r.dragProrata)} a year`} />
              <Tile label="Tax drag, as placed" value={`${fmtUsd(r.dragPlaced)} a year`} />
              <Tile label="Saving" value={`${fmtUsd(r.saving)} a year`} tone={r.saving > 0 ? "good" : undefined} />
            </div>
            <Panel title="Where each investment goes" subtitle="Dollars of each class in each account. The overall mix does not change.">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse font-[family-name:var(--font-ui)] text-sm">
                  <caption className="sr-only">Placement of each asset class by account</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-ink-soft">
                      <th className="py-2 pr-3 font-medium">Asset class</th>
                      {kinds.map((k) => (
                        <th key={k} className="py-2 pr-3 text-right font-medium">
                          {k === "taxable" ? "Taxable" : k === "deferred" ? "Tax-deferred" : "Roth"}
                        </th>
                      ))}
                      <th className="py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CLASS_IDS.filter((c) => kinds.some((k) => (r.placed[k][c] ?? 0) > 0)).map((c) => (
                      <tr key={c} className="border-b border-line/60" title={TAX_TRAITS[c].note}>
                        <td className="py-2 pr-3">{names[c]}</td>
                        {kinds.map((k) => (
                          <td key={k} className="py-2 pr-3 text-right tabular-nums">
                            {(r.placed[k][c] ?? 0) > 0 ? fmtUsd(r.placed[k][c] ?? 0) : "–"}
                          </td>
                        ))}
                        <td className="py-2 text-right tabular-nums">{fmtUsd(kinds.reduce((t, k) => t + (r.placed[k][c] ?? 0), 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <HowCalculated steps={r.steps} />
          </>
        )}
        <NoteField value={d.note} onChange={(note) => up({ note })} placeholder="e.g. Hold the bond fund in the 401(k) and the broad stock fund in the brokerage account." />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function GainsTab({ d, setD }: { plan: WealthPlan; d: GainsData; setD: (d: GainsData) => void }) {
  const r = useMemo(() => capitalGains(d), [d]);
  const up = (patch: Partial<GainsData>) => setD({ ...d, ...patch });
  const num0 = (v: string) => v.replace(/[^0-9.]/g, "");
  const setLot = (id: string, patch: Partial<GainsData["lots"][number]>) => up({ lots: d.lots.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Panel title="This year" subtitle="Income apart from these sales, and anything carried over.">
          <FilingSelect value={d.status} onChange={(v) => up({ status: v as GainsData["status"] })} />
          <MoneyField label="Taxable income before these sales" prefix="$" value={d.taxable} onChange={(v) => up({ taxable: num0(v) })} hint="After deductions." />
          <MoneyField label="Capital loss carried over" prefix="$" value={d.carry} onChange={(v) => up({ carry: num0(v) })} />
          <MoneyField label="State tax on gains" suffix="%" value={d.state} onChange={(v) => up({ state: num0(v) })} />
        </Panel>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Tile label="Net gain or loss" value={acct(r.net)} sub={r.net < 0 ? `${fmtUsd(r.deduction)} deductible` : "from lots marked sell"} tone={r.net < 0 ? "good" : undefined} />
            <Tile label="Total tax" value={fmtUsd(r.total)} sub={`${pct(r.effective)} of the gain`} />
            <Tile label="Room at 0%" value={fmtUsd(r.zeroRoom)} sub="more long-term gain" tone={r.zeroRoom > 0 ? "good" : undefined} />
            <Tile label="Loss carried forward" value={fmtUsd(r.carryForward)} sub={`${fmtUsd(LOSS_DEDUCTION_LIMIT)} a year against pay`} />
          </div>
          <HowCalculated steps={r.steps} />
        </div>
      </div>
      <Panel
        title="Lots"
        subtitle="Each holding that might be sold: its cost, its value now, whether it has been held more than a year, and whether it is in this year's sale."
        actions={
          <Button variant="secondary" onClick={() => up({ lots: [...d.lots, { id: uid(), name: "", basis: "", value: "", longTerm: true, sell: true }] })}>
            Add a lot
          </Button>
        }
      >
        {d.lots.length === 0 ? (
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">No lots yet. Add one to see the tax on selling it, or to find a loss to harvest.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse font-[family-name:var(--font-ui)] text-sm">
              <caption className="sr-only">Lots that might be sold</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-soft">
                  <th className="py-2 pr-2 font-medium">Holding</th>
                  <th className="py-2 pr-2 font-medium">Cost</th>
                  <th className="py-2 pr-2 font-medium">Value now</th>
                  <th className="py-2 pr-2 text-right font-medium">Gain</th>
                  <th className="py-2 pr-2 font-medium">Held</th>
                  <th className="py-2 pr-2 font-medium">Sell</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {d.lots.map((l, i) => {
                  const gain = num(l.value) - num(l.basis);
                  return (
                    <tr key={l.id} className="border-b border-line/60">
                      <td className="py-1.5 pr-2">
                        <TextInput aria-label={`Holding ${i + 1} name`} value={l.name} onChange={(e) => setLot(l.id, { name: e.target.value })} className="!py-1.5 !text-sm" placeholder="e.g. Index fund" />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input aria-label={`Holding ${i + 1} cost`} inputMode="decimal" value={l.basis} onChange={(e) => setLot(l.id, { basis: num0(e.target.value) })} className={cell} />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input aria-label={`Holding ${i + 1} value now`} inputMode="decimal" value={l.value} onChange={(e) => setLot(l.id, { value: num0(e.target.value) })} className={cell} />
                      </td>
                      <td className={`py-1.5 pr-2 text-right tabular-nums ${gain < 0 ? "text-clay-text" : "text-ink"}`}>{acct(gain)}</td>
                      <td className="py-1.5 pr-2">
                        <Select aria-label={`Holding ${i + 1} held`} value={l.longTerm ? "long" : "short"} onChange={(e) => setLot(l.id, { longTerm: e.target.value === "long" })} className="!py-1.5 !text-sm">
                          <option value="long">Over a year</option>
                          <option value="short">A year or less</option>
                        </Select>
                      </td>
                      <td className="py-1.5 pr-2">
                        <input type="checkbox" aria-label={`Sell holding ${i + 1}`} checked={l.sell} onChange={(e) => setLot(l.id, { sell: e.target.checked })} className="h-4 w-4 accent-[var(--color-water-deep)]" />
                      </td>
                      <td className="py-1.5 text-right">
                        <Button variant="ghost" onClick={() => up({ lots: d.lots.filter((x) => x.id !== l.id) })} aria-label={`Remove holding ${i + 1}`}>
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
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          Selling at a loss to offset gains is called tax-loss harvesting. Buying the same or a substantially identical investment within 30 days before or after a loss sale (the wash-sale rule) cancels the loss.
        </p>
      </Panel>
      <NoteField value={d.note} onChange={(note) => up({ note })} placeholder="e.g. Sell enough of the appreciated fund to fill the 0% bracket this year and reset the basis." />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function GivingTab({ d, setD }: { plan: WealthPlan; d: GivingData; setD: (d: GivingData) => void }) {
  const r = useMemo(() => givingOptions(d), [d]);
  const up = (patch: Partial<GivingData>) => setD({ ...d, ...patch });
  const num0 = (v: string) => v.replace(/[^0-9.]/g, "");
  return (
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <Panel title="Giving inputs" subtitle="How the same gift costs a different amount depending on what is given and when.">
        <FilingSelect value={d.status} onChange={(v) => up({ status: v as GivingData["status"] })} />
        <MoneyField label="Yearly gross income" prefix="$" value={d.income} onChange={(v) => up({ income: num0(v) })} />
        <MoneyField label="Other itemized deductions" prefix="$" value={d.itemized} onChange={(v) => up({ itemized: num0(v) })} hint="Mortgage interest, state and local tax up to the cap, medical above the floor. Leave at 0 if the client takes the standard deduction." />
        <MoneyField label="The yearly gift" prefix="$" value={d.gift} onChange={(v) => up({ gift: num0(v) })} />
        <div className="grid grid-cols-2 gap-3">
          <MoneyField label="Cost of the stock given" prefix="$" value={d.basis} onChange={(v) => up({ basis: num0(v) })} hint="Its basis, per yearly gift." />
          <MoneyField label="Years to bunch" value={d.bunchYears} onChange={(v) => up({ bunchYears: num0(v) })} />
        </div>
        <MoneyField label="State income tax" suffix="%" value={d.state} onChange={(v) => up({ state: num0(v) })} hint="Assumed to allow the same deduction as the federal return." />
      </Panel>
      <div className="flex min-w-0 flex-col gap-6">
        {num(d.gift) <= 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center font-[family-name:var(--font-ui)] text-sm text-ink-soft">Enter a yearly gift to compare cash, appreciated stock, and bunching several years into one.</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {r.options.map((o) => (
                <div key={o.id} className={`panel flex flex-col gap-2 p-4 ${r.best?.id === o.id ? "ring-2 ring-[var(--color-water-deep)]" : ""}`}>
                  <h4 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
                    {o.label}
                    {r.best?.id === o.id && <span className="ml-2 rounded-full bg-water-deep px-2 py-0.5 text-[11px] font-medium text-white">Lowest cost</span>}
                  </h4>
                  <p className="font-[family-name:var(--font-ui)] text-2xl font-semibold tabular-nums text-ink">{fmtUsd(o.netCost)}</p>
                  <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                    cost after tax over {o.id === "bunch" ? "the same" : r.years} year{r.years === 1 ? "" : "s"}, for {fmtUsd(o.charity)} to charity. Tax saved: {fmtUsd(o.saved)}.
                  </p>
                  <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{o.detail}</p>
                </div>
              ))}
            </div>
            <HowCalculated steps={r.steps} />
          </>
        )}
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          For {TAX_YEAR}: people who take the standard deduction can deduct up to {fmtUsd(NON_ITEMIZER_GIFT[d.status])} of cash gifts; gifts to a donor-advised fund do not qualify for that. A person over 70½ can give up to about $111,000 a year straight from an IRA (a qualified charitable distribution), which counts toward required distributions and is not taxed.
        </p>
        <NoteField value={d.note} onChange={(note) => up({ note })} placeholder="e.g. Give the appreciated index fund shares instead of cash, and bunch three years of tithes into a donor-advised fund." />
      </div>
    </div>
  );
}
