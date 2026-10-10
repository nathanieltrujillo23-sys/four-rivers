/** A shimmering placeholder block while something loads. Size it with className (for example "h-6 w-40"). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/**
 * A page-sized loading placeholder: a heading, a line of text, and a few cards. Announced once as "Loading" for screen
 * readers; the blocks themselves are hidden from them.
 */
export function PageSkeleton({ label = "Loading", cards = 3 }: { label?: string; cards?: number }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">{label}</span>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-2/3 max-w-sm" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="stagger grid gap-4 sm:grid-cols-2">
        {Array.from({ length: cards }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
