import { useMemo, useState } from "react";
import { formatCurrency } from "../../utils/format";
import { Card, CardBody } from "../ui/Card";
import { Field, TextInput } from "../ui/Field";

type Variant = "savings" | "investing";

const COPY: Record<
  Variant,
  {
    label: string;
    rateLabel: string;
    rateHint: string;
    disclaimer: string;
    defaults: { initial: number; monthly: number; ratePercent: number; years: number };
  }
> = {
  savings: {
    label: "Savings growth example",
    rateLabel: "Annual interest rate",
    rateHint: "High-yield savings accounts have recently paid somewhere around 3–5% a year.",
    disclaimer:
      "This is a simple illustration of compound interest, not a promise or prediction. Real rates move over time, and this tool does not track any account you actually hold — log real deposits in the tracker above.",
    defaults: { initial: 500, monthly: 100, ratePercent: 4, years: 10 },
  },
  investing: {
    label: "Investment growth example",
    rateLabel: "Assumed annual return",
    rateHint:
      "Long-run stock market averages have historically been cited around 7–10% a year before inflation, but any specific year can be flat or negative.",
    disclaimer:
      "This is a hypothetical illustration of compounding, not a prediction, a promise, or advice about any investment. Markets can lose value, and past patterns never guarantee future results. This tool does not track any account you actually hold — log real contributions in the tracker above, and talk to a licensed professional about your own decisions.",
    defaults: { initial: 1000, monthly: 200, ratePercent: 7, years: 20 },
  },
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Future value of an initial amount plus a level monthly contribution, compounded monthly. */
function projectGrowth(initial: number, monthly: number, ratePercent: number, years: number) {
  const r = ratePercent / 100 / 12;
  const rows: { year: number; contributed: number; balance: number }[] = [];
  let balance = initial;
  let contributed = initial;
  for (let month = 1; month <= years * 12; month++) {
    balance = balance * (1 + r) + monthly;
    contributed += monthly;
    if (month % 12 === 0) rows.push({ year: month / 12, contributed, balance });
  }
  return rows;
}

/** Pick at most ~8 rows to display, always including the final year. */
function sampleRows<T extends { year: number }>(rows: T[]): T[] {
  if (rows.length <= 8) return rows;
  const step = Math.ceil(rows.length / 8);
  const sampled = rows.filter((_, i) => (i + 1) % step === 0);
  const last = rows[rows.length - 1];
  if (sampled[sampled.length - 1]?.year !== last.year) sampled.push(last);
  return sampled;
}

/**
 * Illustrative "what if" compounding calculator. Purely a teaching aid — it
 * holds no server state and logs nothing to the ledger. Shown once, in the
 * final module of the Saving and Investing rivers, to make "grows over time"
 * concrete with real numbers.
 */
export function GrowthCalculator({ variant, accent }: { variant: Variant; accent: string }) {
  const copy = COPY[variant];
  const [initial, setInitial] = useState(String(copy.defaults.initial));
  const [monthly, setMonthly] = useState(String(copy.defaults.monthly));
  const [ratePercent, setRatePercent] = useState(String(copy.defaults.ratePercent));
  const [years, setYears] = useState(String(copy.defaults.years));

  const rows = useMemo(() => {
    const i = clamp(parseFloat(initial) || 0, 0, 10_000_000);
    const m = clamp(parseFloat(monthly) || 0, 0, 1_000_000);
    const r = clamp(parseFloat(ratePercent) || 0, 0, 30);
    const y = clamp(Math.round(parseFloat(years)) || 1, 1, 50);
    return projectGrowth(i, m, r, y);
  }, [initial, monthly, ratePercent, years]);

  const final = rows[rows.length - 1];
  const growth = final ? final.balance - final.contributed : 0;
  const displayRows = sampleRows(rows);

  return (
    <Card accent={accent}>
      <CardBody className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-ink">{copy.label}</h3>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            Try your own numbers to see roughly how steady contributions can grow.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Starting amount">
            <TextInput
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={initial}
              onChange={(e) => setInitial(e.target.value)}
            />
          </Field>
          <Field label="Monthly contribution">
            <TextInput
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
            />
          </Field>
          <Field label={copy.rateLabel} hint="%">
            <TextInput
              type="number"
              inputMode="decimal"
              min="0"
              max="30"
              step="0.1"
              value={ratePercent}
              onChange={(e) => setRatePercent(e.target.value)}
            />
          </Field>
          <Field label="Years">
            <TextInput
              type="number"
              inputMode="numeric"
              min="1"
              max="50"
              step="1"
              value={years}
              onChange={(e) => setYears(e.target.value)}
            />
          </Field>
        </div>
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{copy.rateHint}</p>

        {final && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-parchment-deep/50 p-3 text-center">
              <div className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.1em] text-ink-soft">
                You contributed
              </div>
              <div className="mt-1 text-xl font-semibold text-ink tabular-nums">
                {formatCurrency(final.contributed)}
              </div>
            </div>
            <div className="rounded-xl bg-parchment-deep/50 p-3 text-center">
              <div className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.1em] text-ink-soft">
                Growth earned
              </div>
              <div className="mt-1 text-xl font-semibold text-ink tabular-nums">
                {formatCurrency(growth)}
              </div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ backgroundColor: `${accent}22` }}>
              <div className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.1em] text-ink-soft">
                Projected total
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums" style={{ color: accent }}>
                {formatCurrency(final.balance)}
              </div>
            </div>
          </div>
        )}

        {displayRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-[family-name:var(--font-ui)] text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-[0.05em] text-ink-soft">
                  <th className="py-1.5 pr-3">Year</th>
                  <th className="py-1.5 pr-3">Contributed</th>
                  <th className="py-1.5">Balance</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row) => (
                  <tr key={row.year} className="border-b border-line/60 last:border-0">
                    <td className="py-1.5 pr-3 text-ink-soft">{row.year}</td>
                    <td className="py-1.5 pr-3 text-ink-soft tabular-nums">
                      {formatCurrency(row.contributed)}
                    </td>
                    <td className="py-1.5 font-medium text-ink tabular-nums">
                      {formatCurrency(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{copy.disclaimer}</p>
      </CardBody>
    </Card>
  );
}
