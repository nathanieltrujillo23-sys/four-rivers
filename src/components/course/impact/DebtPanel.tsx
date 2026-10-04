import { useMemo } from "react";
import { simulateDebts, type Debt } from "../../../utils/debtSnowball";
import { formatCurrency } from "../../../utils/format";
import { Field, TextInput } from "../../ui/Field";
import { Button } from "../../ui/Button";
import { GrowthChart } from "../GrowthChart";
import { Stat } from "./DiscretionaryPanel";
import { formatMonths, newDebt, num, type DebtRow } from "./shared";
import { useLang } from "../../../i18n/LanguageContext";

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
  const { t } = useLang();
  const units = { yr: t("time.yr"), mo: t("time.mo") };
  const parsed: Debt[] = useMemo(
    () =>
      debts.map((d) => ({
        name: d.name.trim() || t("impact.unnamedDebt"),
        balance: num(d.balance),
        apr: num(d.apr),
        minPayment: num(d.min),
      })),
    [debts, t],
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
        {t("debt.intro")}
      </p>

      <div className="flex flex-col gap-2">
        {debts.map((d) => (
          <div
            key={d.id}
            className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1.4fr_1fr_0.7fr_1fr_auto]"
          >
            <Field label={t("debt.debt")} className="col-span-2 sm:col-span-1 min-w-0">
              <TextInput
                className="w-full min-w-0"
                value={d.name}
                onChange={(e) => update(d.id, { name: e.target.value })}
                placeholder={t("debt.debtPh")}
              />
            </Field>
            <Field className="min-w-0" label={t("debt.balance")}>
              <TextInput
                className="w-full min-w-0"
                type="number"
                inputMode="decimal"
                min="0"
                value={d.balance}
                onChange={(e) => update(d.id, { balance: e.target.value })}
              />
            </Field>
            <Field className="min-w-0" label={t("debt.apr")}>
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
            <Field className="min-w-0" label={t("debt.min")}>
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
              aria-label={t("debt.remove")}
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
            {t("debt.add")}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Field className="min-w-0" label={t("debt.extra")}>
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
          {t("debt.useAdded", { amount: formatCurrency(addedMonthly, true) })}
        </Button>
      </div>

      {!hasDebt ? (
        <p className="rounded-xl bg-parchment-deep/40 p-3 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          {t("debt.none")}
        </p>
      ) : (
        <>
          <div className="grid gap-3 font-[family-name:var(--font-ui)] sm:grid-cols-2">
            <Stat
              label={t("debt.minOnly")}
              value={
                base.months === null
                  ? t("debt.never")
                  : formatMonths(base.months, units)
              }
              note={
                base.months === null
                  ? t("debt.noCover")
                  : t("debt.interest", { amount: formatCurrency(base.totalInterest, true) })
              }
            />
            <Stat
              label={t("debt.snowWith", { amount: formatCurrency(extra, true) })}
              value={
                snow.months === null
                  ? t("debt.never")
                  : formatMonths(snow.months, units)
              }
              note={
                snow.months === null
                  ? t("debt.tryLarger")
                  : t("debt.interest", { amount: formatCurrency(snow.totalInterest, true) })
              }
              accent={accent}
            />
          </div>

          {base.months !== null && snow.months !== null && (
            <p
              className="rounded-xl p-3 text-center font-[family-name:var(--font-ui)] text-sm text-ink"
              style={{ backgroundColor: `${accent}22` }}
            >
              {t("debt.result", {
                time: formatMonths(base.months - snow.months, units),
                amount: formatCurrency(Math.max(0, base.totalInterest - snow.totalInterest), true),
              })}
            </p>
          )}

          <div className="rounded-xl bg-parchment-deep/30 p-3">
            <div className="mb-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
              {t("debt.chartNote")}
            </div>
            <GrowthChart
              ariaLabel={t("debt.chartAria")}
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
                  {t("debt.cleared", { time: formatMonths(o.month, units) })}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
