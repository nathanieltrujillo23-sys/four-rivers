import type { ScriptureRef } from "../../types";

/** A single verse: quoted text, then "— Reference (VERSION)". */
export function ScriptureQuote({
  verse,
  compact = false,
  segKey,
  active = false,
}: {
  verse: ScriptureRef;
  compact?: boolean;
  /** Read-aloud segment key, so the reader can highlight and scroll to this verse. */
  segKey?: string;
  active?: boolean;
}) {
  return (
    <blockquote
      data-seg={segKey}
      className={`border-l-2 transition-colors ${compact ? "pl-3" : "pl-4"} ${
        active ? "border-gold bg-gold/15" : "border-gold/60"
      }`}
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
  segPrefix,
  activeKey,
}: {
  verses: readonly ScriptureRef[];
  compact?: boolean;
  className?: string;
  /** When set, verse i gets read-aloud key `${segPrefix}-${i}`. */
  segPrefix?: string;
  activeKey?: string | null;
}) {
  if (verses.length === 0) return null;
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {verses.map((verse, i) => {
        const key = segPrefix ? `${segPrefix}-${i}` : undefined;
        return (
          <ScriptureQuote
            key={`${verse.reference}|${verse.translation}`}
            verse={verse}
            compact={compact}
            segKey={key}
            active={!!key && key === activeKey}
          />
        );
      })}
    </div>
  );
}
