import type { ScriptureRef } from "../../types";

/** A single verse: quoted text, then "— Reference (VERSION)". */
export function ScriptureQuote({
  verse,
  compact = false,
}: {
  verse: ScriptureRef;
  compact?: boolean;
}) {
  return (
    <blockquote
      className={`border-l-2 border-gold/60 ${compact ? "pl-3" : "pl-4"}`}
    >
      <p
        className={`font-[family-name:var(--font-display)] leading-snug text-ink ${
          compact ? "text-sm" : "text-base"
        }`}
      >
        “{verse.text}”
      </p>
      <footer className="mt-0.5 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
        — {verse.reference} ({verse.translation})
      </footer>
    </blockquote>
  );
}

/** A group of verses supporting one point. */
export function ScriptureList({
  verses,
  compact = false,
  className = "",
}: {
  verses: readonly ScriptureRef[];
  compact?: boolean;
  className?: string;
}) {
  if (verses.length === 0) return null;
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {verses.map((verse) => (
        <ScriptureQuote
          key={`${verse.reference}|${verse.translation}`}
          verse={verse}
          compact={compact}
        />
      ))}
    </div>
  );
}
