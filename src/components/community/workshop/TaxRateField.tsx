import type { RateEstimate } from "../../../lib/taxMath";

/**
 * A tax rate that can be worked out from an income or chosen by hand. "Estimate" shows the rate worked out from the income
 * (read only), with fine print saying how; "My own" lets the person type any rate, starting from the estimate.
 */
export function TaxRateField({
  label,
  auto,
  manual,
  estimate,
  onChange,
  step = 0.5,
}: {
  label: string;
  auto: boolean;
  manual: number;
  estimate: RateEstimate;
  onChange: (next: { auto: boolean; manual: number }) => void;
  step?: number;
}) {
  const choose = (toAuto: boolean) => {
    if (toAuto === auto) return;
    // Switching to a rate of your own starts from what the estimate said, so there is something to adjust.
    onChange({ auto: toAuto, manual: toAuto ? manual : estimate.percent });
  };
  const seg = (on: boolean) =>
    `rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${on ? "bg-water-deep text-white" : "text-ink-soft hover:text-ink"}`;
  return (
    <div className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
      <div className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <span role="group" aria-label={`${label}: estimate it or set your own`} className="inline-flex rounded-full border border-line p-0.5">
          <button type="button" aria-pressed={auto} onClick={() => choose(true)} className={seg(auto)}>
            Estimate
          </button>
          <button type="button" aria-pressed={!auto} onClick={() => choose(false)} className={seg(!auto)}>
            My own
          </button>
        </span>
      </div>
      <span className={`flex items-center gap-1 rounded-lg border bg-surface px-2 py-1.5 text-base text-ink focus-within:border-water ${auto ? "border-line bg-parchment-deep/60" : "border-line"}`}>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          max={90}
          step={step}
          aria-label={label}
          readOnly={auto}
          value={auto ? estimate.percent : manual === 0 ? "" : manual}
          placeholder="0"
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            onChange({ auto: false, manual: Number.isFinite(n) ? Math.min(90, Math.max(0, n)) : 0 });
          }}
          className="w-full min-w-0 bg-transparent tabular-nums outline-none"
        />
        <span className="text-ink-soft">%</span>
      </span>
      <p className="text-[11px] font-normal leading-snug text-ink-soft">{auto ? estimate.note : "You chose this rate yourself. Choose Estimate to have it worked out from the income instead."}</p>
    </div>
  );
}
