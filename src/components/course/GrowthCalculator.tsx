import { useEffect, useMemo, useState } from "react";
import type { ScenarioProps } from "../dashboard/scenario";
import { readable } from "../../theme/theme";
import { formatCurrency } from "../../utils/format";
import { useLang } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";
import { Card, CardBody } from "../ui/Card";
import { Field, TextInput } from "../ui/Field";
import { Button } from "../ui/Button";
import { GrowthChart, type ChartLine } from "./GrowthChart";

type Variant = "savings" | "investing";

const COMPARE_COLOR = "#a9743b";

const COPY: Record<
  Variant,
  {
    label: StringKey;
    rateLabel: StringKey;
    rateHint: StringKey;
    disclaimer: StringKey;
    defaults: { initial: number; monthly: number; ratePercent: number; years: number };
  }
> = {
  savings: {
    label: "grow.savings.label",
    rateLabel: "grow.savings.rate",
    rateHint: "grow.savings.hint",
    disclaimer: "grow.savings.disclaimer",
    defaults: { initial: 500, monthly: 100, ratePercent: 4, years: 10 },
  },
  investing: {
    label: "grow.investing.label",
    rateLabel: "grow.investing.rate",
    rateHint: "grow.investing.hint",
    disclaimer: "grow.investing.disclaimer",
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
  const rows: { year: number; contributed: number; balance: number }[] = [
    { year: 0, contributed: initial, balance: initial },
  ];
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
  const withoutZero = rows.filter((r) => r.year > 0);
  if (withoutZero.length <= 8) return withoutZero;
  const step = Math.ceil(withoutZero.length / 8);
  const sampled = withoutZero.filter((_, i) => (i + 1) % step === 0);
  const last = withoutZero[withoutZero.length - 1];
  if (sampled[sampled.length - 1]?.year !== last.year) sampled.push(last);
  return sampled;
}

export interface Inputs {
  initial: string;
  monthly: string;
  ratePercent: string;
  years: string;
}

function useScenario(defaults: Inputs) {
  const [initial, setInitial] = useState(defaults.initial);
  const [monthly, setMonthly] = useState(defaults.monthly);
  const [ratePercent, setRatePercent] = useState(defaults.ratePercent);
  const [years, setYears] = useState(defaults.years);

  const rows = useMemo(() => {
    const i = clamp(parseFloat(initial) || 0, 0, 10_000_000);
    const m = clamp(parseFloat(monthly) || 0, 0, 1_000_000);
    const r = clamp(parseFloat(ratePercent) || 0, 0, 30);
    const y = clamp(Math.round(parseFloat(years)) || 1, 1, 50);
    return projectGrowth(i, m, r, y);
  }, [initial, monthly, ratePercent, years]);

  return { initial, setInitial, monthly, setMonthly, ratePercent, setRatePercent, years, setYears, rows };
}

/**
 * Illustrative "what if" compounding calculator. Purely a teaching aid — it
 * holds no server state and logs nothing to the ledger. Shown once, in the
 * final module of the Saving and Investing rivers, to make "grows over time"
 * concrete with real numbers, a chart, and (optionally) a second scenario to
 * compare against.
 */
export interface GrowthState {
  a: Inputs;
  compareOn: boolean;
  b: Inputs;
}

export function GrowthCalculator({
  variant,
  accent,
  initial,
  onState,
}: { variant: Variant; accent: string } & ScenarioProps<GrowthState>) {
  const { t } = useLang();
  const copy = COPY[variant];
  const a = useScenario(
    initial?.a ?? {
      initial: String(copy.defaults.initial),
      monthly: String(copy.defaults.monthly),
      ratePercent: String(copy.defaults.ratePercent),
      years: String(copy.defaults.years),
    },
  );
  const [compareOn, setCompareOn] = useState(initial?.compareOn ?? false);
  const b = useScenario(
    initial?.b ?? {
      initial: String(copy.defaults.initial),
      monthly: String(copy.defaults.monthly),
      ratePercent: String(copy.defaults.ratePercent),
      years: String(Math.max(1, copy.defaults.years - 10)),
    },
  );
  useEffect(
    () =>
      onState?.({
        a: { initial: a.initial, monthly: a.monthly, ratePercent: a.ratePercent, years: a.years },
        compareOn,
        b: { initial: b.initial, monthly: b.monthly, ratePercent: b.ratePercent, years: b.years },
      }),
    [onState, a.initial, a.monthly, a.ratePercent, a.years, compareOn, b.initial, b.monthly, b.ratePercent, b.years],
  );

  const finalA = a.rows[a.rows.length - 1];
  const growthA = finalA ? finalA.balance - finalA.contributed : 0;
  const displayRows = sampleRows(a.rows);

  const finalB = compareOn ? b.rows[b.rows.length - 1] : null;
  const diff = finalB ? finalA.balance - finalB.balance : null;

  const ratePercentNum = clamp(parseFloat(a.ratePercent) || 0, 0, 30);
  const doublingYears = ratePercentNum > 0 ? 72 / ratePercentNum : null;

  const chartLines: ChartLine[] = [
    { color: accent, points: a.rows.map((r) => ({ year: r.year, value: r.balance })) },
    { color: "#c9c2ae", dashed: true, points: a.rows.map((r) => ({ year: r.year, value: r.contributed })) },
  ];
  if (compareOn && finalB) {
    chartLines.push({
      color: COMPARE_COLOR,
      points: b.rows.map((r) => ({ year: r.year, value: r.balance })),
    });
  }

  return (
    <Card accent={accent}>
      <CardBody className="flex flex-col gap-4">
        <div>
          <h3 className="t-h4">{t(copy.label)}</h3>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("grow.try")}</p>
        </div>

        <ScenarioFields scenario={a} rateLabel={t(copy.rateLabel)} />
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t(copy.rateHint)}</p>

        {finalA && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label={t("grow.contributed")} value={formatCurrency(finalA.contributed)} />
            <Stat label={t("grow.earned")} value={formatCurrency(growthA)} />
            <Stat label={t("grow.projected")} value={formatCurrency(finalA.balance)} accent={accent} />
          </div>
        )}

        {doublingYears && (
          <p className="rounded-lg bg-gold/10 px-3 py-2 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
            <span className="font-semibold text-ink">{t("grow.rule72Label")}</span>{" "}
            {t("grow.rule72", { rate: ratePercentNum, years: doublingYears.toFixed(1) })}
          </p>
        )}

        {a.rows.length > 1 && (
          <div className="rounded-xl bg-parchment-deep/30 p-3">
            <GrowthChart
              lines={chartLines}
              ariaLabel={t("grow.chartAria", {
                years: a.years,
                contributed: formatCurrency(finalA?.contributed ?? 0),
                balance: formatCurrency(finalA?.balance ?? 0),
              })}
            />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
              <Legend color={accent} label={t("grow.legendBalance")} />
              <Legend color="#c9c2ae" label={t("grow.legendPutIn")} dashed />
              {compareOn && <Legend color={COMPARE_COLOR} label={t("grow.legendB")} />}
            </div>
          </div>
        )}

        <div>
          {!compareOn ? (
            <Button variant="secondary" onClick={() => setCompareOn(true)}>
              {t("grow.compare")}
            </Button>
          ) : (
            <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface/50 p-3">
              <div className="flex items-center justify-between">
                <h4 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
                  {t("grow.scenarioB")}
                </h4>
                <Button variant="ghost" onClick={() => setCompareOn(false)}>
                  {t("grow.remove")}
                </Button>
              </div>
              <ScenarioFields scenario={b} rateLabel={t(copy.rateLabel)} />
              {finalB && diff !== null && (
                <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                  {t("grow.endsA", {
                    a: formatCurrency(finalA.balance),
                    b: formatCurrency(finalB.balance),
                    diff: formatCurrency(Math.abs(diff)),
                    who: diff >= 0 ? "A" : "B",
                  })}
                </p>
              )}
            </div>
          )}
        </div>

        {displayRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-[family-name:var(--font-ui)] text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-[0.05em] text-ink-soft">
                  <th className="py-1.5 pr-3">{t("grow.th.year")}</th>
                  <th className="py-1.5 pr-3">{t("grow.th.contributed")}</th>
                  <th className="py-1.5">{t("grow.th.balance")}</th>
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

        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t(copy.disclaimer)}</p>
      </CardBody>
    </Card>
  );
}

function ScenarioFields({
  scenario,
  rateLabel,
}: {
  scenario: ReturnType<typeof useScenario>;
  rateLabel: string;
}) {
  const { t } = useLang();
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <Field label={t("grow.f.start")}>
        <TextInput
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={scenario.initial}
          onChange={(e) => scenario.setInitial(e.target.value)}
        />
      </Field>
      <Field label={t("grow.f.monthly")}>
        <TextInput
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={scenario.monthly}
          onChange={(e) => scenario.setMonthly(e.target.value)}
        />
      </Field>
      <Field label={rateLabel} hint="%">
        <TextInput
          type="number"
          inputMode="decimal"
          min="0"
          max="30"
          step="0.1"
          value={scenario.ratePercent}
          onChange={(e) => scenario.setRatePercent(e.target.value)}
        />
      </Field>
      <Field label={t("grow.f.years")}>
        <TextInput
          type="number"
          inputMode="numeric"
          min="1"
          max="50"
          step="1"
          value={scenario.years}
          onChange={(e) => scenario.setYears(e.target.value)}
        />
      </Field>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div
      className={`rounded-xl p-3 text-center ${accent ? "" : "bg-parchment-deep/50"}`}
      style={accent ? { backgroundColor: `${accent}22` } : undefined}
    >
      <div className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.1em] text-ink-soft">
        {label}
      </div>
      <div
        className="mt-1 text-xl font-semibold tabular-nums"
        style={{ color: accent ? readable(accent) : "var(--color-ink)" }}
      >
        {value}
      </div>
    </div>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-0.5 w-4"
        style={{
          backgroundColor: dashed ? "transparent" : color,
          borderTop: dashed ? `2px dashed ${color}` : undefined,
        }}
      />
      {label}
    </span>
  );
}
