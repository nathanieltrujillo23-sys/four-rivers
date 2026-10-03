import { useMemo } from "react";
import { simulateDebts, type Debt } from "../../../utils/debtSnowball";
import { formatCurrency } from "../../../utils/format";
import { Field, TextInput } from "../../ui/Field";
import { Button } from "../../ui/Button";
import { GrowthChart } from "../GrowthChart";
import { Stat } from "./DiscretionaryPanel";
import { formatMonths, newDebt, num, type DebtRow } from "./shared";

const MAX_POINTS = 150;

function toPoints(balances: number[]) {
  const step = Math.max(1, Math.ceil(balances.length / MAX_POINTS));
  const points = balances.filter(
    (_, i) => i % step === 0 || i === balances.length - 1,
  );
  return points.map((value, i) => {
    const month =
      i * step > balances.length - 1 ? balances.length - 1 : i * step;
    return { year: month / 12, value };
  });
}

/** A debt snowball: smallest balance first, each cleared payment rolling to the next. */
export function DebtPanel({
  debts,
  setDebts,
  extra,
  extraInput,
  setExtraInput,
  addedMonthly,
  accent,
}: {
  debts: DebtRow[];
  setDebts: (updater: (prev: DebtRow[]) => DebtRow[]) => void;
  /** The extra monthly amount in use. */
  extra: number;
  extraInput: string;
  setExtraInput: (v: string | null) => void;
  addedMonthly: number;
  accent: string;
}) {
  const parsed: Debt[] = useMemo(
    () =>
      debts.map((d) => ({
        name: d.name.trim() || "Unnamed debt",
        balance: num(d.balance),
        apr: num(d.apr),
        minPayment: num(d.min),
      })),
    [debts],
  );
  const base = useMemo(
    () => simulateDebts(parsed, { extra: 0, snowball: false }),
    [parsed],
  );
  const snow = useMemo(
    () => simulateDebts(parsed, { extra, snowball: true }),
    [parsed, extra],
  );
  const hasDebt = parsed.some((d) => d.balance > 0);

  function update(id: string, patch: Partial<DebtRow>) {
    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
        In a debt snowball, every debt gets its minimum, and all the extra goes
        to the smallest balance. When it is gone, its whole payment rolls onto
        the next smallest, so the payment grows like a rolling snowball. Replace
        these example debts with your own numbers to see the effect.
      </p>

      <div className="flex flex-col gap-2">
        {debts.map((d) => (
          <div
            key={d.id}
            className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1.4fr_1fr_0.7fr_1fr_auto]"
          >
            <Field label="Debt" className="col-span-2 sm:col-span-1 min-w-0">
              <TextInput
                className="w-full min-w-0"
                value={d.name}
                onChange={(e) => update(d.id, { name: e.target.value })}
                placeholder="e.g. Store card"
              />
            </Field>
            <Field className="min-w-0" label="Balance">
              <TextInput
                className="w-full min-w-0"
                type="number"
                inputMode="decimal"
                min="0"
                value={d.balance}
                onChange={(e) => update(d.id, { balance: e.target.value })}
              />
            </Field>
            <Field className="min-w-0" label="APR %">
              <TextInput
                className="w-full min-w-0"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={d.apr}
                onChange={(e) => update(d.id, { apr: e.target.value })}
              />
            </Field>
            <Field className="min-w-0" label="Min. payment">
              <TextInput
                className="w-full min-w-0"
                type="number"
                inputMode="decimal"
                min="0"
                value={d.min}
                onChange={(e) => update(d.id, { min: e.target.value })}
              />
            </Field>
            <Button
              variant="ghost"
              onClick={() =>
                setDebts((prev) => prev.filter((x) => x.id !== d.id))
              }
              aria-label="Remove this debt"
            >
              ✕
            </Button>
          </div>
        ))}
        {debts.length < 6 && (
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => setDebts((prev) => [...prev, newDebt()])}
          >
            + Add a debt
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Field className="min-w-0" label="Extra per month">
            <TextInput
              className="w-full min-w-0"
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              value={extraInput}
              onChange={(e) => setExtraInput(e.target.value)}
            />
          </Field>
        </div>
        <Button variant="secondary" onClick={() => setExtraInput(null)}>
          Use my added streams ({formatCurrency(addedMonthly, true)})
        </Button>
      </div>

      {!hasDebt ? (
        <p className="rounded-xl bg-parchment-deep/40 p-3 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          Add a debt with a balance to see a payoff plan.
        </p>
      ) : (
        <>
          <div className="grid gap-3 font-[family-name:var(--font-ui)] sm:grid-cols-2">
            <Stat
              label="Minimum payments only"
              value={
                base.months === null
                  ? "Never paid off"
                  : formatMonths(base.months)
              }
              note={
                base.months === null
                  ? "The minimums do not cover the interest."
                  : `${formatCurrency(base.totalInterest, true)} in interest`
              }
            />
            <Stat
              label={`Snowball with ${formatCurrency(extra, true)} extra`}
              value={
                snow.months === null
                  ? "Never paid off"
                  : formatMonths(snow.months)
              }
              note={
                snow.months === null
                  ? "Try a larger extra amount."
                  : `${formatCurrency(snow.totalInterest, true)} in interest`
              }
              accent={accent}
            />
          </div>

          {base.months !== null && snow.months !== null && (
            <p
              className="rounded-xl p-3 text-center font-[family-name:var(--font-ui)] text-sm text-ink"
              style={{ backgroundColor: `${accent}22` }}
            >
              In these numbers: debt-free{" "}
              {formatMonths(base.months - snow.months)} sooner, with{" "}
              {formatCurrency(
                Math.max(0, base.totalInterest - snow.totalInterest),
                true,
              )}{" "}
              less interest.
            </p>
          )}

          <div className="rounded-xl bg-parchment-deep/30 p-3">
            <div className="mb-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
              Total debt remaining over time (left to right: years from now).
              Solid line is the snowball; dashed is minimums only.
            </div>
            <GrowthChart
              ariaLabel="Total debt remaining over time, snowball versus minimum payments only"
              lines={[
                { color: accent, points: toPoints(snow.balances) },
                {
                  color: "#8c8473",
                  dashed: true,
                  points: toPoints(base.balances),
                },
              ]}
            />
          </div>

          {snow.order.length > 0 && (
            <ol className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              {snow.order.map((o, i) => (
                <li key={`${o.name}-${i}`}>
                  <span className="font-semibold text-ink">
                    {i + 1}. {o.name}
                  </span>{" "}
                  cleared in {formatMonths(o.month)}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
