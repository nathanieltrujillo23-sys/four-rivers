/** A labelled number box with a slider under it, kept in sync. Used by the calculators. */
export function SliderNumber({
  label,
  value,
  min,
  max,
  step,
  onChange,
  accent,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  accent: string;
  prefix?: string;
  suffix?: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="flex flex-col gap-1.5 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
      <label className="flex items-baseline justify-between gap-2 font-medium">
        <span>{label}</span>
        <span className="flex items-center gap-1 text-sm font-semibold text-ink">
          {prefix}
          <input
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={Number.isFinite(value) ? value : ""}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              onChange(Number.isFinite(n) ? clamp(n) : min);
            }}
            className="w-24 rounded-md border border-line bg-surface px-2 py-1 text-right text-sm tabular-nums text-ink focus:border-water focus:outline-none"
          />
          {suffix}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full"
        style={{ accentColor: accent }}
      />
    </div>
  );
}
