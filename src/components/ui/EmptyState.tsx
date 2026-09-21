import type { ReactNode } from "react";

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-line bg-parchment-deep/40 px-4 py-6 text-center text-sm text-ink-soft font-[family-name:var(--font-ui)]">
      {children}
    </p>
  );
}
