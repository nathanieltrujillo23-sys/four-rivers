import { readable } from "../../../theme/theme";
import { compareDiscretionary } from "../../../utils/incomeProjection";
import { formatCurrency } from "../../../utils/format";
import { useLang } from "../../../i18n/LanguageContext";
import { Field, TextInput } from "../../ui/Field";

function Bar({
  label,
  income,
  expenses,
  scale,
  accent,
}: {
  label: string;
  income: number;
  expenses: number;
  scale: number;
  accent: string;
}) {
  const { t } = useLang();
  const expensePart = Math.min(income, expenses);
  const discretionary = Math.max(0, income - expenses);
  const pct = (v: number) => `${Math.max(0, (v / scale) * 100)}%`;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 font-[family-name:var(--font-ui)] text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="tabular-nums text-ink-soft">
          {t("dp.perMonthIn", { amount: formatCurrency(income, true) })}
        </span>
      </div>
      <div className="flex h-9 w-full overflow-hidden rounded-lg bg-parchment-deep/40">
        <div
          className="flex items-center justify-center bg-[#c9c2ae] transition-[width] duration-500"
          style={{ width: pct(expensePart) }}
          aria-hidden="true"
        />
        <div
          className="transition-[width] duration-500"
          style={{ width: pct(discretionary), backgroundColor: accent }}
          aria-hidden="true"
        />
      </div>
      <div className="flex flex-wrap justify-between gap-x-3 font-[family-name:var(--font-ui)] text-xs tabular-nums text-ink-soft">
        <span>{t("dp.expensesAmt", { amount: formatCurrency(expenses, true) })}</span>
        <span style={{ color: income >= expenses ? accent : "#b45309" }} className="font-semibold">
          {income >= expenses
            ? t("dp.discAmt", { amount: formatCurrency(discretionary, true) })
            : t("dp.short", { amount: formatCurrency(expenses - income, true) })}
        </span>
      </div>
    </div>
  );
}

/** Discretionary money with and without the added streams, expenses held flat. */
export function DiscretionaryPanel({
  main,
  added,
  expenses,
  setExpenses,
  accent,
}: {
  main: number;
  added: number;
  expenses: string;
  setExpenses: (v: string) => void;
  accent: string;
}) {
  const { t } = useLang();
  const exp = parseFloat(expenses) || 0;
  const c = compareDiscretionary(main, added, exp);
  const scale = Math.max(main + added, exp, 1);

  return (
    <div className="flex flex-col gap-4">
      <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("dp.intro")}</p>

      <div className="max-w-xs">
        <Field className="min-w-0" label={t("dp.expenses")}>
          <TextInput
            className="w-full min-w-0"
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            value={expenses}
            onChange={(e) => setExpenses(e.target.value)}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-4 rounded-xl bg-parchment-deep/30 p-4">
        <Bar label={t("dp.mainOnly")} income={main} expenses={exp} scale={scale} accent={accent} />
        <Bar label={t("dp.withAdded")} income={main + added} expenses={exp} scale={scale} accent={accent} />
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#c9c2ae]" /> {t("dp.legendExpenses")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: accent }} />{" "}
            {t("dp.legendDisc")}
          </span>
        </div>
      </div>

      <div className="grid gap-3 font-[family-name:var(--font-ui)] sm:grid-cols-3">
        <Stat label={t("dp.now")} value={`${formatCurrency(c.before, true)}/mo`} />
        <Stat label={t("dp.after")} value={`${formatCurrency(c.after, true)}/mo`} accent={accent} />
        <Stat
          label={t("dp.diff")}
          value={`+${formatCurrency(c.change, true)}/mo`}
          note={
            c.changePercent === null
              ? t("dp.moreYear", { amount: formatCurrency(c.change * 12, true) })
              : t("dp.morePct", {
                  pct: Math.round(c.changePercent),
                  amount: formatCurrency(c.change * 12, true),
                })
          }
          accent={accent}
        />
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl bg-parchment-deep/40 p-3">
      <div className="text-xs text-ink-soft">{label}</div>
      <div
        className="mt-0.5 text-lg font-semibold tabular-nums text-ink"
        style={accent ? { color: readable(accent) } : undefined}
      >
        {value}
      </div>
      {note && <div className="text-xs text-ink-soft">{note}</div>}
    </div>
  );
}
