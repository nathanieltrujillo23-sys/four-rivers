import { compareDiscretionary } from "../../../utils/incomeProjection";
import { formatCurrency } from "../../../utils/format";
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
  const expensePart = Math.min(income, expenses);
  const discretionary = Math.max(0, income - expenses);
  const pct = (v: number) => `${Math.max(0, (v / scale) * 100)}%`;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 font-[family-name:var(--font-ui)] text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="tabular-nums text-ink-soft">
          {formatCurrency(income, true)}/mo in
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
        <span>Expenses {formatCurrency(expenses, true)}</span>
        <span
          style={{ color: income >= expenses ? accent : "#b45309" }}
          className="font-semibold"
        >
          {income >= expenses
            ? `Discretionary ${formatCurrency(discretionary, true)}`
            : `Short ${formatCurrency(expenses - income, true)}`}
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
  const exp = parseFloat(expenses) || 0;
  const c = compareDiscretionary(main, added, exp);
  const scale = Math.max(main + added, exp, 1);

  return (
    <div className="flex flex-col gap-4">
      <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
        Discretionary money is what is left after the bills. Because adding a
        stream does not add a single bill, every dollar it brings in lands here.
        For a household with little left over, even a small stream can change
        that number a great deal.
      </p>

      <div className="max-w-xs">
        <Field
          className="min-w-0"
          label="Monthly expenses (including minimum debt payments)"
        >
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
        <Bar
          label="Main income only"
          income={main}
          expenses={exp}
          scale={scale}
          accent={accent}
        />
        <Bar
          label="With added streams"
          income={main + added}
          expenses={exp}
          scale={scale}
          accent={accent}
        />
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#c9c2ae]" /> Expenses
            (held steady)
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: accent }}
            />{" "}
            Discretionary
          </span>
        </div>
      </div>

      <div className="grid gap-3 font-[family-name:var(--font-ui)] sm:grid-cols-3">
        <Stat
          label="Discretionary now"
          value={`${formatCurrency(c.before, true)}/mo`}
        />
        <Stat
          label="With added streams"
          value={`${formatCurrency(c.after, true)}/mo`}
          accent={accent}
        />
        <Stat
          label="Difference"
          value={`+${formatCurrency(c.change, true)}/mo`}
          note={
            c.changePercent === null
              ? `${formatCurrency(c.change * 12, true)} more per year`
              : `${Math.round(c.changePercent)}% more, ${formatCurrency(c.change * 12, true)} per year`
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
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {note && <div className="text-xs text-ink-soft">{note}</div>}
    </div>
  );
}
