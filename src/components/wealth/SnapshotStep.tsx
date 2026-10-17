import { Button } from "../ui/Button";
import { Select, TextInput } from "../ui/Field";
import { Empty, ModuleHead, Panel, Pill, Tile } from "./parts";
import type { ModuleProps } from "./PlanModules";
import { stepNo } from "./steps";
import {
  ASSET_KINDS,
  EXPENSE_CATS,
  LIABILITY_KINDS,
  fmtPct,
  fmtUsd,
  num,
  snapshotMetrics,
  uid,
  type AssetKind,
  type ExpenseCat,
  type LiabilityKind,
  type Light,
} from "../../lib/wealthMath";

const ASSET_LABEL: Record<AssetKind, string> = { cash: "Cash", brokerage: "Brokerage", retirement: "Retirement", education: "Education", home: "Home", other: "Other" };
const LIABILITY_LABEL: Record<LiabilityKind, string> = { card: "Credit card", student: "Student loan", auto: "Car loan", mortgage: "Mortgage", other: "Other" };

const ASSET_QUICK: [string, AssetKind][] = [
  ["Checking", "cash"],
  ["Savings", "cash"],
  ["Brokerage account", "brokerage"],
  ["Roth IRA", "retirement"],
  ["401(k)", "retirement"],
  ["529 plan", "education"],
];
const LIABILITY_QUICK: [string, LiabilityKind][] = [
  ["Credit card", "card"],
  ["Student loan", "student"],
  ["Car loan", "auto"],
  ["Mortgage", "mortgage"],
];
const EXPENSE_QUICK: [string, ExpenseCat][] = [
  ["Rent", "Needs"],
  ["Groceries", "Needs"],
  ["Transportation", "Needs"],
  ["Phone and insurance", "Needs"],
  ["Eating out", "Wants"],
  ["Subscriptions", "Wants"],
  ["Tithe and giving", "Giving"],
  ["Retirement saving", "Saving"],
  ["Emergency fund", "Saving"],
];

const cell =
  "w-full min-w-0 rounded-lg border border-line bg-surface px-2 py-1.5 font-[family-name:var(--font-ui)] text-sm text-ink focus:border-water focus:outline-none";

const WORD: Record<Light, string> = { good: "On track", ok: "Watch", low: "Needs work" };
const TONE: Record<Light, "good" | "warn" | "bad"> = { good: "good", ok: "warn", low: "bad" };

/** A metric with its rule of thumb and a word for where it stands, so the status never relies on colour alone. */
function Gauge({ label, value, light, rule }: { label: string; value: string; light: Light | null; rule: string }) {
  return <Tile label={label} value={value} sub={light ? `${WORD[light]} · ${rule}` : rule} tone={light ? TONE[light] : undefined} />;
}

/** Step 2: what the client owns and owes, and where the month goes. Every real plan starts here. */
export function SnapshotStep({ plan, set }: ModuleProps) {
  const sn = plan.snapshot;
  const m = snapshotMetrics(plan);
  const setSn = (next: Partial<typeof sn>) => set({ ...plan, snapshot: { ...sn, ...next } });
  const income = m.income;
  const unassigned = Math.max(0, m.surplus);

  const parts: [string, number, string][] = [
    ["Needs", m.needs, "var(--color-water-deep)"],
    ["Wants", m.wants, "var(--color-gold)"],
    ["Giving", m.giving, "var(--color-clay)"],
    ["Saving", m.saving, "var(--color-river-1)"],
    ["Unassigned", unassigned, "var(--color-line)"],
  ];
  const whole = Math.max(income, m.spent, 1);

  return (
    <div className="flex flex-col gap-6">
      <ModuleHead
        step={stepNo("snapshot")}
        title="Financial snapshot"
        desc="Every plan starts with what the client owns, what they owe, and where each month goes. Enter what they told you; round numbers are fine."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Net worth" value={fmtUsd(m.netWorth)} sub={`${fmtUsd(m.totalAssets)} owned, ${fmtUsd(m.totalDebt)} owed`} tone={m.netWorth >= 0 ? undefined : "bad"} />
        <Gauge label="Emergency cushion" value={m.emergencyMonths == null ? "n/a" : `${(Math.round(m.emergencyMonths * 10) / 10).toString()} mo`} light={m.light.emergency} rule="aim for 3 to 6 months of needs" />
        <Gauge label="Savings rate" value={m.savingsRate == null ? "n/a" : fmtPct(m.savingsRate, 0)} light={m.light.savings} rule="aim for 15% to 20% of take-home" />
        <Gauge label="Debt payments" value={m.debtShare == null ? "n/a" : fmtPct(m.debtShare, 0)} light={m.light.debt} rule="aim under 15% of take-home" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="What the client owns" subtitle="Assets, at today's value.">
          {sn.assets.length === 0 && <Empty>No assets yet. Add an account below.</Empty>}
          <ul className="flex flex-col gap-2">
            {sn.assets.map((a) => (
              <li key={a.id} className="grid grid-cols-[1fr_7.5rem_6.5rem_auto] items-center gap-2">
                <input
                  aria-label={`Name of asset ${a.name}`}
                  className={cell}
                  value={a.name}
                  onChange={(e) => setSn({ assets: sn.assets.map((x) => (x.id === a.id ? { ...x, name: e.target.value } : x)) })}
                />
                <select
                  aria-label={`Kind of ${a.name}`}
                  className={cell}
                  value={a.kind}
                  onChange={(e) => setSn({ assets: sn.assets.map((x) => (x.id === a.id ? { ...x, kind: e.target.value as AssetKind } : x)) })}
                >
                  {ASSET_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {ASSET_LABEL[k]}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={`Value of ${a.name}`}
                  inputMode="decimal"
                  className={`${cell} tabular-nums`}
                  value={a.value}
                  placeholder="$0"
                  onChange={(e) => setSn({ assets: sn.assets.map((x) => (x.id === a.id ? { ...x, value: e.target.value } : x)) })}
                />
                <button type="button" aria-label={`Remove ${a.name}`} onClick={() => setSn({ assets: sn.assets.filter((x) => x.id !== a.id) })} className="rounded px-2 text-ink-soft hover:text-red-700">
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-1.5">
            {ASSET_QUICK.map(([name, kind]) => (
              <Pill key={name} onClick={() => setSn({ assets: [...sn.assets, { id: uid(), name, kind, value: "" }] })}>
                + {name}
              </Pill>
            ))}
          </div>
        </Panel>

        <Panel title="What the client owes" subtitle="Balance, interest rate, and the monthly payment.">
          {sn.liabilities.length === 0 && <Empty>No debts entered. If there are none, say so in the meeting notes.</Empty>}
          <ul className="flex flex-col gap-3">
            {sn.liabilities.map((l) => {
              const edit = (patch: Partial<typeof l>) => setSn({ liabilities: sn.liabilities.map((x) => (x.id === l.id ? { ...x, ...patch } : x)) });
              return (
                <li key={l.id} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[1fr_7rem_auto]">
                  <input aria-label={`Name of debt ${l.name}`} className={cell} value={l.name} onChange={(e) => edit({ name: e.target.value })} />
                  <select aria-label={`Kind of ${l.name}`} className={cell} value={l.kind} onChange={(e) => edit({ kind: e.target.value as LiabilityKind })}>
                    {LIABILITY_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {LIABILITY_LABEL[k]}
                      </option>
                    ))}
                  </select>
                  <button type="button" aria-label={`Remove ${l.name}`} onClick={() => setSn({ liabilities: sn.liabilities.filter((x) => x.id !== l.id) })} className="justify-self-end rounded px-2 text-ink-soft hover:text-red-700">
                    ×
                  </button>
                  <input aria-label={`Balance of ${l.name}`} inputMode="decimal" className={`${cell} tabular-nums`} value={l.balance} placeholder="Balance $" onChange={(e) => edit({ balance: e.target.value })} />
                  <input aria-label={`Interest rate of ${l.name}`} inputMode="decimal" className={`${cell} tabular-nums`} value={l.apr} placeholder="APR %" onChange={(e) => edit({ apr: e.target.value })} />
                  <input aria-label={`Monthly payment on ${l.name}`} inputMode="decimal" className={`${cell} tabular-nums`} value={l.payment} placeholder="Payment $" onChange={(e) => edit({ payment: e.target.value })} />
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-1.5">
            {LIABILITY_QUICK.map(([name, kind]) => (
              <Pill key={name} onClick={() => setSn({ liabilities: [...sn.liabilities, { id: uid(), name, kind, balance: "", apr: "", payment: "" }] })}>
                + {name}
              </Pill>
            ))}
          </div>
          {m.totalDebt > 0 && (
            <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
              Weighted average interest rate: <b className="text-ink">{(Math.round(m.weightedApr * 10) / 10).toString()}%</b> on {fmtUsd(m.totalDebt)}. A debt costing more than the market is likely to return is the first place to put extra dollars.
            </p>
          )}
        </Panel>
      </div>

      <Panel
        title="Where each month goes"
        subtitle={income > 0 ? `From ${fmtUsd(income)} of monthly take-home (set in the Client step).` : `Enter the monthly take-home income in the Client step first, then list the spending.`}
      >
        {sn.expenses.length === 0 && <Empty>No spending entered yet. Add the main lines below.</Empty>}
        <ul className="flex flex-col gap-2">
          {sn.expenses.map((e) => {
            const edit = (patch: Partial<typeof e>) => setSn({ expenses: sn.expenses.map((x) => (x.id === e.id ? { ...x, ...patch } : x)) });
            return (
              <li key={e.id} className="grid grid-cols-[1fr_6.5rem_6rem_auto] items-center gap-2">
                <input aria-label={`Name of expense ${e.name}`} className={cell} value={e.name} onChange={(ev) => edit({ name: ev.target.value })} />
                <Select aria-label={`Category of ${e.name}`} className="!px-2 !py-1.5 !text-sm" value={e.category} onChange={(ev) => edit({ category: ev.target.value as ExpenseCat })}>
                  {EXPENSE_CATS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
                <TextInput aria-label={`Monthly amount of ${e.name}`} inputMode="decimal" className="!px-2 !py-1.5 !text-sm tabular-nums" value={e.amount} placeholder="$ / mo" onChange={(ev) => edit({ amount: ev.target.value })} />
                <button type="button" aria-label={`Remove ${e.name}`} onClick={() => setSn({ expenses: sn.expenses.filter((x) => x.id !== e.id) })} className="rounded px-2 text-ink-soft hover:text-red-700">
                  ×
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap gap-1.5">
          {EXPENSE_QUICK.map(([name, category]) => (
            <Pill key={name} onClick={() => setSn({ expenses: [...sn.expenses, { id: uid(), name, category, amount: "" }] })}>
              + {name}
            </Pill>
          ))}
        </div>

        {m.spent > 0 && (
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <div className="flex h-4 overflow-hidden rounded-full bg-parchment-deep" role="img" aria-label={`Of ${fmtUsd(income)} a month: ${parts.map(([n, v]) => `${n} ${fmtUsd(v)}`).join(", ")}`}>
              {parts.map(([n, v, color]) => (v > 0 ? <div key={n} style={{ width: `${(v / whole) * 100}%`, backgroundColor: color }} /> : null))}
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
              {parts.map(([n, v, color]) => (
                <li key={n} className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} aria-hidden="true" />
                  {n} <b className="tabular-nums text-ink">{fmtUsd(v)}</b>
                  {income > 0 && <span className="tabular-nums">({fmtPct(v / income, 0)})</span>}
                </li>
              ))}
            </ul>
            {income > 0 && (
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink">
                {m.surplus >= 0 ? (
                  <>
                    <b>{fmtUsd(m.surplus)}</b> a month is not assigned yet. Decide its job before the month starts: debt, savings, or giving.
                  </>
                ) : (
                  <>
                    <b className="text-red-700">{fmtUsd(Math.abs(m.surplus))} a month more is going out than coming in.</b> Check the numbers with the client before building anything on them.
                  </>
                )}
              </p>
            )}
          </div>
        )}
        {num(plan.client.income) > 0 && m.spent === 0 && (
          <Button variant="ghost" onClick={() => setSn({ expenses: EXPENSE_QUICK.slice(0, 4).map(([name, category]) => ({ id: uid(), name, category, amount: "" })) })}>
            Start with the four main needs
          </Button>
        )}
      </Panel>
    </div>
  );
}
