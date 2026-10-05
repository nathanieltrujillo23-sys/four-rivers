import { readable } from "../../theme/theme";
import { useT } from "../../i18n/LanguageContext";

/**
 * Quick-entry stepper — the shared low-friction logging pattern used across all
 * four trackers (carried over from prior financial tools).
 *
 * Each tap of "+" writes ONE real ledger row. Each tap of "−" removes the most
 * recent row that matches this quick-entry. The number in the middle is a live
 * count of matching rows — it is derived from the ledger, never a stored counter.
 */

interface StepperProps {
  label: string;
  sublabel?: string;
  count: number;
  accent: string;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
}

export function Stepper({
  label,
  sublabel,
  count,
  accent,
  onIncrement,
  onDecrement,
  disabled,
}: StepperProps) {
  const t = useT();
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="break-words text-sm font-medium text-ink font-[family-name:var(--font-ui)]">
          {label}
        </div>
        {sublabel && (
          <div className="break-words text-xs text-ink-soft font-[family-name:var(--font-ui)]">
            {sublabel}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 font-[family-name:var(--font-ui)]">
        <button
          type="button"
          aria-label={t("trk.stepRemove", { label })}
          onClick={onDecrement}
          disabled={disabled || count === 0}
          className="h-8 w-8 rounded-full border border-line text-ink-soft hover:bg-parchment-deep disabled:opacity-30 disabled:hover:bg-transparent"
        >
          −
        </button>
        <span
          className="min-w-6 text-center text-sm font-semibold tabular-nums"
          style={{ color: readable(accent) }}
        >
          {count}
        </span>
        <button
          type="button"
          aria-label={t("trk.stepAdd", { label })}
          onClick={onIncrement}
          disabled={disabled}
          className="h-8 w-8 rounded-full text-white disabled:opacity-40"
          style={{ backgroundColor: accent }}
        >
          +
        </button>
      </div>
    </div>
  );
}
