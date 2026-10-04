import { useMemo } from "react";
import type { Debt } from "../../../utils/debtSnowball";
import { projectYears, type Use } from "../../../utils/incomeProjection";
import { formatCurrency } from "../../../utils/format";
import { Field, TextInput } from "../../ui/Field";
import { Button } from "../../ui/Button";
import { Stat } from "./DiscretionaryPanel";
import { useLang } from "../../../i18n/LanguageContext";
import type { StringKey } from "../../../i18n/en";
import { YearBars } from "./YearBars";

export interface YearsSettings {
  years: number;
  incomeGrowth: string;
  expenseGrowth: string;
  use: Use;
  savingsRate: string;
  investReturn: string;
}

const USES: { key: Use; label: StringKey }[] = [
  { key: "debt", label: "yp.use.debt" },
  { key: "save", label: "yp.use.save" },
  { key: "invest", label: "yp.use.invest" },
  { key: "split", label: "yp.use.split" },
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
  const { t } = useLang();
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
        {t("yp.intro")}
      </p>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={t("yp.lookAhead")}
      >
        {[5, 10, 15, 20].map((y) => (
          <Button
            key={y}
            variant={settings.years === y ? "primary" : "secondary"}
            onClick={() => setSettings({ years: y })}
          >
            {t("yp.years", { n: y })}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field className="min-w-0" label={t("yp.incomeGrowth")}>
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
          label={t("yp.expenseGrowth")}
          hint={t("yp.expenseHint")}
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
        <Field className="min-w-0" label={t("yp.savingsGrowth")} hint={t("yp.illustrative")}>
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
          label={t("yp.investGrowth")}
          hint={t("yp.hypothetical")}
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
          {t("yp.whereGoes")}
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={t("yp.whereAria")}
        >
          {USES.map((u) => (
            <Button
              key={u.key}
              variant={settings.use === u.key ? "primary" : "secondary"}
              onClick={() => setSettings({ use: u.key })}
            >
              {t(u.label)}
            </Button>
          ))}
        </div>
        <p className="mt-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          {t("yp.debtNote")}
        </p>
      </div>

      <div className="rounded-xl bg-parchment-deep/30 p-3">
        <YearBars rows={withAdded} accent={accent} />
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#c9c2ae]" /> {t("yp.expenses")}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: accent }}
            />{" "}
            {t("dp.legendDisc")}
          </span>
          <span>
            {t("yp.barNote")}
          </span>
        </div>
      </div>

      {last && (
        <div className="grid gap-3 font-[family-name:var(--font-ui)] sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            label={t("yp.incomeYear", { y: last.year })}
            value={t("yp.perYr", { amount: formatCurrency(last.income, true) })}
          />
          <Stat
            label={t("yp.discYear", { y: last.year })}
            value={t("yp.perYr", { amount: formatCurrency(last.discretionary, true) })}
            accent={accent}
          />
          <Stat
            label={t("yp.over", { y: last.year })}
            value={formatCurrency(totalDiscretionary, true)}
            note={t("yp.fromAdded", { amount: formatCurrency(totalFromAdded, true) })}
          />
          <Stat
            label={t("yp.debtDown")}
            value={formatCurrency(last.debtPaidDown, true)}
            note={
              startingDebt > 0
                ? t("yp.debtDownNote", { total: formatCurrency(startingDebt, true), left: formatCurrency(last.debtRemaining, true) })
                : t("yp.noDebts")
            }
          />
          <Stat label={t("yp.saved")} value={formatCurrency(last.saved, true)} />
          <Stat
            label={t("yp.invested")}
            value={formatCurrency(last.invested, true)}
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[34rem] border-collapse text-right font-[family-name:var(--font-ui)] text-xs tabular-nums">
          <thead>
            <tr className="bg-parchment-deep/40 text-ink-soft">
              <th className="px-2 py-2 text-left font-medium">{t("yp.th.year")}</th>
              <th className="px-2 py-2 font-medium">{t("yp.th.income")}</th>
              <th className="px-2 py-2 font-medium">{t("yp.th.disc")}</th>
              <th className="px-2 py-2 font-medium">{t("yp.th.added")}</th>
              <th className="px-2 py-2 font-medium">{t("yp.th.debt")}</th>
              <th className="px-2 py-2 font-medium">{t("yp.th.saved")}</th>
              <th className="px-2 py-2 font-medium">{t("yp.th.invested")}</th>
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
