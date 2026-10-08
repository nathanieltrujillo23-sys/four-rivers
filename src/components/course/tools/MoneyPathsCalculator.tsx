import { useEffect, useMemo, useState } from "react";
import type { ScenarioProps } from "../../dashboard/scenario";
import { useT } from "../../../i18n/LanguageContext";
import { DEFAULT_ASSUMPTIONS, projectAll, type PathAssumptions } from "../../../utils/moneyPaths";
import { formatCurrency } from "../../../utils/format";
import { VERSE } from "../../../content/scripture";
import { Card, CardBody } from "../../ui/Card";
import { ScriptureQuote } from "../../ui/Scripture";
import { SliderNumber } from "../../ui/SliderNumber";

type View = "real" | "nominal";
type PathKey = "cash" | "hysa" | "market";

const LINES = [
  { key: "market", color: "var(--color-river-1)", labelKey: "paths.market" },
  { key: "hysa", color: "var(--color-river-2)", labelKey: "paths.hysa" },
  { key: "cash", color: "var(--color-ink-soft)", labelKey: "paths.cash" },
] as const;

const W = 640;
const H = 300;
const PAD_L = 62;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 34;

function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

function compact(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
}

/**
 * The introduction's time-value-of-money tool: one lump sum (and optional
 * monthly additions) projected over x years in three places, so the learner
 * can see cash lose buying power to inflation, a high-yield savings account
 * roughly keep pace, and money invested at the market's long-run average grow.
 */
export interface PathsState {
  start: number;
  monthly: number;
  years: number;
  view: View;
  assume: PathAssumptions;
}

export function MoneyPathsCalculator({ accent, initial, onState }: { accent: string } & ScenarioProps<PathsState>) {
  const t = useT();
  const [start, setStart] = useState(initial?.start ?? 5000);
  const [monthly, setMonthly] = useState(initial?.monthly ?? 0);
  const [years, setYears] = useState(initial?.years ?? 20);
  const [view, setView] = useState<View>(initial?.view ?? "real");
  const [assume, setAssume] = useState<PathAssumptions>(initial?.assume ?? DEFAULT_ASSUMPTIONS);
  useEffect(() => onState?.({ start, monthly, years, view, assume }), [onState, start, monthly, years, view, assume]);
  const [scrubYear, setScrubYear] = useState<number | null>(null);

  const paths = useMemo(() => projectAll(start, monthly, years, assume), [start, monthly, years, assume]);
  const year = Math.min(scrubYear ?? years, years);

  const value = (key: PathKey, y: number) => paths[key][y][view];
  const contributed = (y: number) => paths.cash[y].contributed;

  const maxV = niceCeil(
    Math.max(1, ...LINES.flatMap((l) => paths[l.key].map((p) => p[view])), contributed(years)),
  );
  const x = (y: number) => PAD_L + (y / years) * (W - PAD_L - PAD_R);
  const yy = (v: number) => H - PAD_B - (v / maxV) * (H - PAD_T - PAD_B);
  const pathD = (key: PathKey) =>
    paths[key]
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.year).toFixed(1)},${yy(p[view]).toFixed(1)}`)
      .join(" ");
  const putInD = paths.cash
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.year).toFixed(1)},${yy(p.contributed).toFixed(1)}`)
    .join(" ");
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxV);
  const xStep = years <= 10 ? 1 : years <= 20 ? 2 : 5;
  const xTicks = Array.from({ length: Math.floor(years / xStep) + 1 }, (_, i) => i * xStep);

  const setRate = (field: keyof PathAssumptions) => (v: string) => {
    const n = parseFloat(v);
    setAssume((a) => ({ ...a, [field]: Number.isFinite(n) ? Math.min(30, Math.max(0, n)) : 0 }));
  };

  const fin = (key: PathKey) => paths[key][years];

  return (
    <Card accent={accent}>
      <CardBody className="flex flex-col gap-5">
        <div>
          <h3 className="t-h4">{t("paths.title")}</h3>
          <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("paths.intro")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <SliderNumber
            label={t("paths.start")}
            value={start}
            min={0}
            max={50000}
            step={500}
            prefix="$"
            onChange={setStart}
            accent={accent}
          />
          <SliderNumber
            label={t("paths.monthly")}
            value={monthly}
            min={0}
            max={1500}
            step={25}
            prefix="$"
            onChange={setMonthly}
            accent={accent}
          />
          <SliderNumber
            label={t("paths.years")}
            value={years}
            min={1}
            max={40}
            step={1}
            onChange={(v) => {
              setYears(Math.round(v));
              setScrubYear(null);
            }}
            accent={accent}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
            <span className="font-medium">{t("paths.view")}</span>
            <div
              className="flex overflow-hidden rounded-lg border border-line"
              role="group"
              aria-label={t("paths.view")}
            >
              {(["real", "nominal"] as View[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    view === v
                      ? "bg-water-deep text-white"
                      : "bg-surface text-ink-soft hover:bg-parchment-deep"
                  }`}
                >
                  {t(v === "real" ? "paths.view.real" : "paths.view.nominal")}
                </button>
              ))}
            </div>
          </div>
          <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
            {t(view === "real" ? "paths.view.realHint" : "paths.view.nominalHint")}
          </p>
        </div>

        <div className="rounded-xl bg-parchment-deep/30 p-3">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label={t("paths.chartLabel", { years })}
          >
            {yTicks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD_L}
                  x2={W - PAD_R}
                  y1={yy(tick)}
                  y2={yy(tick)}
                  stroke="var(--color-line)"
                  strokeWidth={1}
                />
                <text
                  x={PAD_L - 8}
                  y={yy(tick) + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill="var(--color-ink-soft)"
                  fontFamily="var(--font-ui)"
                >
                  {compact(tick)}
                </text>
              </g>
            ))}
            {xTicks.map((tick) => (
              <text
                key={tick}
                x={x(tick)}
                y={H - PAD_B + 18}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-ink-soft)"
                fontFamily="var(--font-ui)"
              >
                {tick}
              </text>
            ))}
            <text
              x={(PAD_L + W - PAD_R) / 2}
              y={H - 2}
              textAnchor="middle"
              fontSize={10}
              fill="var(--color-ink-soft)"
              fontFamily="var(--font-ui)"
            >
              {t("paths.yearAxis")}
            </text>
            <path
              d={putInD}
              fill="none"
              stroke="var(--color-ink-soft)"
              strokeWidth={1.8}
              strokeDasharray="5 5"
              opacity={0.7}
            />
            {LINES.map((l) => (
              <path
                key={l.key}
                d={pathD(l.key)}
                fill="none"
                stroke={l.color}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            <line
              x1={x(year)}
              x2={x(year)}
              y1={PAD_T}
              y2={H - PAD_B}
              stroke="var(--color-ink)"
              strokeWidth={1}
              strokeDasharray="2 3"
              opacity={0.5}
            />
            {LINES.map((l) => (
              <circle
                key={l.key}
                cx={x(year)}
                cy={yy(value(l.key, year))}
                r={5}
                fill={l.color}
                stroke="var(--color-surface)"
                strokeWidth={2}
              />
            ))}
          </svg>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
            {LINES.map((l) => (
              <li key={l.key} className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-5 rounded-full" style={{ backgroundColor: l.color }} />
                {t(l.labelKey)}
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <span className="inline-block w-5 border-t-2 border-dashed border-ink-soft/70" />
              {t("paths.contributed")}
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
            {t("paths.scrub", { year })}
            <input
              type="range"
              min={0}
              max={years}
              step={1}
              value={year}
              onChange={(e) => setScrubYear(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: accent, ["--range-accent" as string]: accent }}
            />
          </label>
          <dl className="grid gap-2 font-[family-name:var(--font-ui)] sm:grid-cols-3">
            {LINES.map((l) => {
              const v = value(l.key, year);
              const diff = v - contributed(year);
              return (
                <div
                  key={l.key}
                  className="rounded-lg border border-line bg-surface/60 p-3"
                  style={{ borderTop: `3px solid ${l.color}` }}
                >
                  <dt className="text-xs text-ink-soft">{t(l.labelKey)}</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums text-ink">
                    {formatCurrency(v, true)}
                  </dd>
                  <dd className="text-xs tabular-nums text-ink-soft">
                    {Math.abs(diff) < 1
                      ? t("paths.vsPutInSame")
                      : diff > 0
                        ? t("paths.vsPutIn", { amount: formatCurrency(diff, true) })
                        : t("paths.vsPutInLess", { amount: formatCurrency(-diff, true) })}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>

        <ul className="flex flex-col gap-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          <li>
            {t("paths.sum.cash", {
              start: formatCurrency(start, true),
              nominal: formatCurrency(fin("cash").nominal, true),
              years,
              real: formatCurrency(fin("cash").real, true),
            })}
          </li>
          <li>
            {t("paths.sum.hysa", {
              nominal: formatCurrency(fin("hysa").nominal, true),
              real: formatCurrency(fin("hysa").real, true),
            })}
          </li>
          <li>
            {t("paths.sum.market", {
              nominal: formatCurrency(fin("market").nominal, true),
              real: formatCurrency(fin("market").real, true),
            })}
          </li>
        </ul>

        <details className="rounded-xl border border-line p-3">
          <summary className="cursor-pointer font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
            {t("paths.assumptions")}
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            {(
              [
                ["inflation", "paths.inflation"],
                ["checking", "paths.checking"],
                ["hysa", "paths.hysaRate"],
                ["market", "paths.marketRate"],
              ] as const
            ).map(([field, label]) => (
              <label
                key={field}
                className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft"
              >
                {t(label)}
                <span className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    step={0.1}
                    value={assume[field]}
                    onChange={(e) => setRate(field)(e.target.value)}
                    className="w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm tabular-nums text-ink focus:border-water focus:outline-none"
                  />
                  <span>%</span>
                </span>
                <span className="font-normal text-ink-soft">{t("paths.perYear")}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 font-[family-name:var(--font-ui)] text-xs leading-relaxed text-ink-soft">
            {t("paths.assumeNote")}
          </p>
        </details>

        <div className="rounded-xl bg-parchment-deep/40 p-4">
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("paths.parable")}</p>
          <div className="mt-3">
            <ScriptureQuote verse={VERSE.matt25_27_kjv} compact />
          </div>
        </div>

        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("paths.disclaimer")}</p>
      </CardBody>
    </Card>
  );
}
