import { useT } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";

const PIECES = 10;

/** A small celebration at the bottom of the screen for a milestone: a badge that rises in, with a few sparkles. */
export function MilestoneToast({ message }: { message: StringKey | null }) {
  const t = useT();
  if (!message) return null;
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="rise-in relative flex max-w-md items-center gap-3 rounded-2xl border border-gold/60 bg-surface px-5 py-3 font-[family-name:var(--font-ui)] text-sm text-ink shadow-lg">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/25 text-lg" aria-hidden="true">
          ✦
        </span>
        <span>{t(message)}</span>
        <span className="absolute left-8 top-1/2" aria-hidden="true">
          {Array.from({ length: PIECES }, (_, i) => {
            const a = (i / PIECES) * Math.PI * 2;
            const d = 26 + (i % 3) * 10;
            return (
              <span
                key={i}
                className="sparkle absolute h-1.5 w-1.5 rounded-full bg-gold"
                style={{ ["--dx" as string]: `${Math.round(Math.cos(a) * d)}px`, ["--dy" as string]: `${Math.round(Math.sin(a) * d)}px`, animationDelay: `${(i % 4) * 50}ms` }}
              />
            );
          })}
        </span>
      </div>
    </div>
  );
}
