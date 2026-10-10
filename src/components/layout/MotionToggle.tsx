import { useMotion } from "../../lib/motion";

/** Turns the app's animations down. Motion already follows the device's own "reduce motion" setting; this is for anyone who wants less. */
export function MotionToggle() {
  const { reduced, system, toggle } = useMotion();
  const label = reduced ? "Motion is reduced. Turn animations on" : "Reduce motion";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={reduced}
      aria-label={label}
      title={reduced && system ? "Your device asks for reduced motion" : label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-parchment-deep hover:text-ink"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {reduced ? (
          <>
            <path d="M3 12h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M3 7h18M3 17h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
          </>
        ) : (
          <path d="M3 8c3-4 6 4 9 0s6 4 9 0M3 16c3-4 6 4 9 0s6 4 9 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}
