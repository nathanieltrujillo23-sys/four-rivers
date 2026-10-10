/** A savings bar that looks like water filling a vessel: it flows in from the left, has a gently moving crest, and ripples when it changes. */
export function WaterBar({ fraction, accent, label }: { fraction: number; accent: string; label?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="relative mt-2 h-4 overflow-hidden rounded-full bg-parchment-deep"
    >
      <div className="grow-x absolute inset-y-0 left-0 transition-[width] duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: accent }}>
        <svg className="water-crest absolute -right-px top-0 h-full w-5" viewBox="0 0 20 16" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 0 H12 C18 3 18 6 12 8 C6 10 6 13 12 16 H0 Z" fill={accent} />
        </svg>
      </div>
      {/* a ripple each time the amount changes */}
      <span key={pct} className="complete-ring absolute top-0 h-4 w-4 rounded-full border-2 border-white/70" style={{ left: `calc(${pct}% - 1rem)` }} aria-hidden="true" />
    </div>
  );
}
