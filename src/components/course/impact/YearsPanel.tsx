import { useMemo } from "react";
import type { Debt } from "../../../utils/debtSnowball";
import { projectYears, type Use } from "../../../utils/incomeProjection";
import { formatCurrency } from "../../../utils/format";
import { Field, TextInput } from "../../ui/Field";
import { Button } from "../../ui/Button";
import { Stat } from "./DiscretionaryPanel";
import { YearBars } from "./YearBars";

export interface YearsSettings {
  years: number;
  incomeGrowth: string;
  expenseGrowth: string;
  use: Use;
  savingsRate: string;
  investReturn: string;
}

const USES: { key: Use; label: string }[] = [
  { key: "debt", label: "Pay down debt" },
  { key: "save", label: "Save it" },
  { key: "invest", label: "Invest it" },
  { key: "split", label: "Split evenly" },
];

/** Years ahead: how income and discretionary money change, and where it could go. */
export function YearsPanel({
  settings,
  setSettings,
  main,
  added,
  expenses,
  debts,
  accent,
}: {
  settings: YearsSettings;
  setSettings: (patch: Partial<YearsSettings>) => void;
  main: number;
  added: number;
  expenses: number;
  debts: Debt[];
  accent: string;
}) {
  const input = useMemo(
    () => ({
      years: settings.years,
      mainMonthly: main,
      addedMonthly: added,
      expensesMonthly: expenses,
      incomeGrowthPercent: parseFloat(settings.incomeGrowth) || 0,
      expenseGrowthPercent: parseFloat(settings.expenseGrowth) || 0,
      use: settings.use,
      debts,
      savingsRatePercent: parseFloat(settings.savingsRate) || 0,
      investReturnPercent: parseFloat(settings.investReturn) || 0,
    }),
    [settings, main, added, expenses, debts],
  );
  const withAdded = useMemo(
    () => projectYears({ ...input, includeAdded: true }),
    [input],
  );
  const mainOnly = useMemo(
    () => projectYears({ ...input, includeAdded: false }),
    [input],
  );
  const last = withAdded[withAdded.length - 1];
  const startingDebt = debts.reduce((s, d) => s + Math.max(0, d.balance), 0);
  const totalDiscretionary = withAdded.reduce((s, r) => s + r.discretionary, 0);
  const totalFromAdded = withAdded.reduce(
    (s, r, i) => s + (r.discretionary - mainOnly[i].discretionary),
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
        Watch income and discretionary money change year by year, then see what
        happens to the leftover if it goes to debt, savings, investments, or all
        three. Expenses stay flat unless you say otherwise.
      </p>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Years to look ahead"
      >
        {[5, 10, 15, 20].map((y) => (
          <Button
            key={y}
            variant={settings.years === y ? "primary" : "secondary"}
            onClick={() => setSettings({ years: y })}
          >
            {y} years
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field className="min-w-0" label="Income growth per year %">
          <TextInput
            className="w-full min-w-0"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            value={settings.incomeGrowth}
            onChange={(e) => setSettings({ incomeGrowth: e.target.value })}
          />
        </Field>
        <Field
          className="min-w-0"
          label="Expense growth per year %"
          hint="0 keeps expenses flat"
        >
          <TextInput
            className="w-full min-w-0"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            value={settings.expenseGrowth}
            onChange={(e) => setSettings({ expenseGrowth: e.target.value })}
          />
        </Field>
        <Field className="min-w-0" label="Savings growth %" hint="Illustrative">
          <TextInput
            className="w-full min-w-0"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            value={settings.savingsRate}
            onChange={(e) => setSettings({ savingsRate: e.target.value })}
          />
        </Field>
        <Field
          className="min-w-0"
          label="Investment growth %"
          hint="Hypothetical, not guaranteed"
        >
          <TextInput
            className="w-full min-w-0"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            value={settings.investReturn}
            onChange={(e) => setSettings({ investReturn: e.target.value })}
          />
        </Field>
      </div>

      <div>
        <div className="mb-2 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
          Where the leftover money goes
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Where discretionary money goes"
        >
          {USES.map((u) => (
            <Button
              key={u.key}
              variant={settings.use === u.key ? "primary" : "secondary"}
              onClick={() => setSettings({ use: u.key })}
            >
              {u.label}
            </Button>
          ))}
        </div>
        <p className="mt-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          Debt comes from the Debt snowball view. Once it is paid off, that
          share goes to savings.
        </p>
      </div>

      <div className="rounded-xl bg-parchment-deep/30 p-3">
        <YearBars rows={withAdded} accent={accent} />
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#c9c2ae]" /> Expenses
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: accent }}
            />{" "}
            Discretionary
          </span>
          <span>
            Each bar is one year of income, with the year number beneath it.
          </span>
        </div>
      </div>

      {last && (
        <div className="grid gap-3 font-[family-name:var(--font-ui)] sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            label={`Income in year ${last.year}`}
            value={`${formatCurrency(last.income, true)}/yr`}
          />
          <Stat
            label={`Discretionary in year ${last.year}`}
            value={`${formatCurrency(last.discretionary, true)}/yr`}
            accent={accent}
          />
          <Stat
            label={`Over ${last.year} years`}
            value={formatCurrency(totalDiscretionary, true)}
            note={`${formatCurrency(totalFromAdded, true)} of it from the added streams`}
          />
          <Stat
            label="Debt paid down"
            value={formatCurrency(last.debtPaidDown, true)}
            note={
              startingDebt > 0
                ? `of ${formatCurrency(startingDebt, true)}; ${formatCurrency(last.debtRemaining, true)} left`
                : "no debts entered"
            }
          />
          <Stat label="Saved" value={formatCurrency(last.saved, true)} />
          <Stat
            label="Invested (hypothetical)"
            value={formatCurrency(last.invested, true)}
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[34rem] border-collapse text-right font-[family-name:var(--font-ui)] text-xs tabular-nums">
          <thead>
            <tr className="bg-parchment-deep/40 text-ink-soft">
              <th className="px-2 py-2 text-left font-medium">Year</th>
              <th className="px-2 py-2 font-medium">Income</th>
              <th className="px-2 py-2 font-medium">Discretionary</th>
              <th className="px-2 py-2 font-medium">From added streams</th>
              <th className="px-2 py-2 font-medium">Debt left</th>
              <th className="px-2 py-2 font-medium">Saved</th>
              <th className="px-2 py-2 font-medium">Invested</th>
            </tr>
          </thead>
          <tbody>
            {withAdded.map((r, i) => (
              <tr key={r.year} className="border-t border-line text-ink">
                <td className="px-2 py-1.5 text-left">{r.year}</td>
                <td className="px-2 py-1.5">
                  {formatCurrency(r.income, true)}
                </td>
                <td className="px-2 py-1.5">
                  {formatCurrency(r.discretionary, true)}
                </td>
                <td className="px-2 py-1.5">
                  {formatCurrency(
                    r.discretionary - mainOnly[i].discretionary,
                    true,
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {formatCurrency(r.debtRemaining, true)}
                </td>
                <td className="px-2 py-1.5">{formatCurrency(r.saved, true)}</td>
                <td className="px-2 py-1.5">
                  {formatCurrency(r.invested, true)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
