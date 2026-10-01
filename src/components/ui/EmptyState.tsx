import type { ReactNode } from "react";

/** A small empty basin, waiting to be filled — the same visual language as
 * the reservoir/jar motifs used elsewhere in the course. */
function EmptyIcon() {
  return (
    <svg width="40" height="34" viewBox="0 0 40 34" aria-hidden="true" className="mx-auto mb-2 opacity-60">
      <path
        d="M7 13 L9.5 29 Q10 32.5 13.5 32.5 L26.5 32.5 Q30 32.5 30.5 29 L33 13"
        fill="none"
        stroke="var(--color-ink-soft)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M5 13 H35" stroke="var(--color-ink-soft)" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M13 19 Q20 15.5 27 19"
        stroke="var(--color-ink-soft)"
        strokeWidth="1.5"
        strokeDasharray="3 3"
        fill="none"
        opacity="0.7"
      />
    </svg>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-parchment-deep/40 px-4 py-6 text-center text-sm text-ink-soft font-[family-name:var(--font-ui)]">
      <EmptyIcon />
      <p>{children}</p>
    </div>
  );
}
