import { useMemo, useState } from "react";
import { formatCurrency } from "../../utils/format";
import { Card, CardBody } from "../ui/Card";

const MAX_BAR_PX = 140;

function futureValue(pv: number, ratePercent: number, years: number): number {
  return pv * Math.pow(1 + ratePercent / 100, years);
}

/**
 * An interactive "time value of money" teaching widget: one set of controls
 * (starting amount, rate, years) drives three synchronized visuals — a
 * balance scale that tips toward whichever side is worth more, a pair of
 * bars comparing today's dollar to its future value, and a plain-language
 * reveal of the FV formula with the numbers plugged in. Purely illustrative,
 * like GrowthCalculator — no server state, no advice.
 */
export function TVMExplainer({ accent }: { accent: string }) {
  const [pv, setPv] = useState(1000);
  const [ratePercent, setRatePercent] = useState(7);
  const [years, setYears] = useState(15);

  const fv = useMemo(() => futureValue(pv, ratePercent, years), [pv, ratePercent, years]);

  // Tilt toward the heavier (higher-value) side; today's pan is the reference.
  const tiltAngle = Math.max(-16, Math.min(16, Math.log(fv / pv) * 6));

  const maxVal = Math.max(pv, fv, 1);
  const pvHeightPx = Math.max(6, (pv / maxVal) * MAX_BAR_PX);
  const fvHeightPx = Math.max(6, (fv / maxVal) * MAX_BAR_PX);

  return (
    <Card accent={accent}>
      <CardBody className="flex flex-col gap-5">
        <div>
          <h3 className="text-lg font-semibold text-ink">A dollar today vs. a dollar later</h3>
          <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            Move the sliders and watch the same idea show up three ways: a scale that tips, two bars that grow
            apart, and a formula that isn't just abstract anymore.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <SliderField
            label="Starting amount"
            value={pv}
            min={100}
            max={10000}
            step={100}
            display={formatCurrency(pv, true)}
            onChange={setPv}
            accent={accent}
          />
          <SliderField
            label="Annual rate"
            value={ratePercent}
            min={1}
            max={15}
            step={0.5}
            display={`${ratePercent}%`}
            onChange={setRatePercent}
            accent={accent}
          />
          <SliderField
            label="Years"
            value={years}
            min={1}
            max={40}
            step={1}
            display={String(years)}
            onChange={setYears}
            accent={accent}
          />
        </div>

        <div className="grid gap-6 rounded-xl bg-parchment-deep/30 p-4 sm:grid-cols-2">
          <div className="flex flex-col items-center">
            <svg viewBox="0 0 300 150" className="w-full max-w-[260px]" role="img" aria-label="A balance scale">
              <line x1="150" y1="150" x2="150" y2="95" stroke="#a9743b" strokeWidth="4" />
              <polygon points="138,95 162,95 150,78" fill="#a9743b" />
              <g transform={`rotate(${tiltAngle} 150 78)`} style={{ transition: "transform 500ms ease-out" }}>
                <line x1="55" y1="78" x2="245" y2="78" stroke="#5c5347" strokeWidth="3" />
                <line x1="55" y1="78" x2="55" y2="108" stroke="#5c5347" strokeWidth="1.5" />
                <line x1="245" y1="78" x2="245" y2="108" stroke="#5c5347" strokeWidth="1.5" />
                <ellipse cx="55" cy="112" rx="26" ry="9" fill="#c9c2ae" opacity="0.6" stroke="#5c5347" strokeWidth="1.5" />
                <ellipse cx="245" cy="112" rx="26" ry="9" fill={accent} opacity="0.5" stroke={accent} strokeWidth="1.5" />
              </g>
              <text x="55" y="138" textAnchor="middle" fontSize="11" fill="#5c5347" fontFamily="var(--font-ui)">
                Today
              </text>
              <text x="245" y="138" textAnchor="middle" fontSize="11" fill="#5c5347" fontFamily="var(--font-ui)">
                In {years} yrs
              </text>
            </svg>
            <p className="mt-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
              The future side outweighs today's, because growth compounds.
            </p>
          </div>

          <div className="flex flex-col items-center justify-end">
            <div className="flex h-[170px] items-end justify-center gap-10">
              <div className="flex flex-col items-center gap-2">
                <span className="font-[family-name:var(--font-ui)] text-sm font-semibold tabular-nums text-ink">
                  {formatCurrency(pv)}
                </span>
                <div
                  className="w-16 rounded-t-lg bg-[#c9c2ae] transition-[height] duration-500 ease-out"
                  style={{ height: `${pvHeightPx}px` }}
                />
                <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">Today</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="font-[family-name:var(--font-ui)] text-sm font-semibold tabular-nums" style={{ color: accent }}>
                  {formatCurrency(fv)}
                </span>
                <div
                  className="w-16 rounded-t-lg transition-[height] duration-500 ease-out"
                  style={{ height: `${fvHeightPx}px`, backgroundColor: accent }}
                />
                <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">In {years} years</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-parchment-deep/40 p-4 text-center">
          <p className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.14em] text-ink-soft">
            The time value of money
          </p>
          <p className="mt-2 text-xl font-semibold text-ink">
            FV = PV × (1 + r)<sup>n</sup>
          </p>
          <p className="mt-2 font-[family-name:var(--font-ui)] text-sm tabular-nums text-ink-soft">
            {formatCurrency(fv)} = {formatCurrency(pv)} × (1 + {(ratePercent / 100).toFixed(3)})
            <sup>{years}</sup>
          </p>
          <dl className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-x-6 gap-y-1 text-left font-[family-name:var(--font-ui)] text-xs text-ink-soft sm:grid-cols-4">
            <TermTag term="PV" meaning="what you start with" />
            <TermTag term="r" meaning="the yearly rate" />
            <TermTag term="n" meaning="years invested" />
            <TermTag term="FV" meaning="what it grows into" />
          </dl>
        </div>

        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          This is a hypothetical illustration of compounding, not a prediction or a promise. It does not track any
          account you actually hold.
        </p>
      </CardBody>
    </Card>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
  accent,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
  accent: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
      <span className="flex items-baseline justify-between font-medium">
        <span>{label}</span>
        <span className="text-sm font-semibold text-ink tabular-nums">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: accent }}
      />
    </label>
  );
}

function TermTag({ term, meaning }: { term: string; meaning: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="font-semibold text-ink">{term}</dt>
      <dd className="text-ink-soft">{meaning}</dd>
    </div>
  );
}
