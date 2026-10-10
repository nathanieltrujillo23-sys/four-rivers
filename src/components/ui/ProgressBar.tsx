/** A thin, accent-colored fill bar. `fraction` is 0–1. */
export function ProgressBar({
  fraction,
  accent,
  label,
}: {
  fraction: number;
  accent: string;
  /** Optional screen-reader label; visible callers usually show their own text. */
  label?: string;
}) {
  const clamped = Math.min(1, Math.max(0, fraction));
  const pct = Math.round(clamped * 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-parchment-deep"
    >
      <div
        className="grow-x relative h-full overflow-hidden rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%`, backgroundColor: accent }}
      >
        {pct > 0 && pct < 100 && (
          <span
            className="progress-shimmer absolute inset-y-0 w-1/3"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)" }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
