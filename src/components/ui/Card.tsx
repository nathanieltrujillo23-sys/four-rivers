import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  accent,
  tour,
}: {
  children: ReactNode;
  className?: string;
  /** Marks the card as a stop on the guided tour (a `data-tour` target). */
  tour?: string;
  /** Optional left accent bar color (river accent). */
  accent?: string;
}) {
  return (
    <div
      data-tour={tour}
      className={`rounded-2xl bg-surface/70 border border-line shadow-sm ${className}`}
      style={accent ? { borderLeft: `4px solid ${accent}` } : undefined}
    >
      {children}
    </div>
  );
}

export function CardBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}
