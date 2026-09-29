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
  const pct = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
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
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%`, backgroundColor: accent }}
      />
    </div>
  );
}
