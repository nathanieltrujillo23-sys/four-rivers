import type { ReactNode } from "react";
import type { ScriptureRef } from "../../types";
import { ScriptureQuote } from "../ui/Scripture";
import { Button } from "../ui/Button";

const CONFETTI_COLORS = ["#2f6f4f", "#1f6f8b", "#3a5a9b", "#a9743b", "#c9a24b"];
const CONFETTI_COUNT = 24;

/** A short burst of falling confetti pieces across the top of the modal. */
function Confetti() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 flex h-full justify-center overflow-hidden"
      aria-hidden="true"
    >
      {Array.from({ length: CONFETTI_COUNT }, (_, i) => {
        const left = (i / CONFETTI_COUNT) * 100 + ((i * 37) % 5) - 2;
        const rot = 140 + ((i * 53) % 220);
        const delay = ((i * 29) % 40) / 100;
        return (
          <span
            key={i}
            className="confetti-piece absolute top-0 h-2.5 w-1.5 rounded-sm"
            style={{
              left: `${left}%`,
              backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              ["--rot" as string]: `${rot}deg`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * A celebratory pop-up for a big moment (a river or the whole course
 * finishing). Requires an explicit close — it never auto-dismisses, so
 * screen-reader and keyboard users aren't rushed past it.
 */
export function CelebrationModal({
  open,
  onClose,
  accent,
  icon,
  eyebrow,
  title,
  message,
  verse,
  confetti = false,
  actionLabel,
  onAction,
}: {
  open: boolean;
  onClose: () => void;
  accent: string;
  icon: ReactNode;
  eyebrow?: string;
  title: string;
  message: string;
  verse?: ScriptureRef;
  confetti?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
      onClick={onClose}
    >
      <div
        className="modal-card relative w-full max-w-md overflow-hidden rounded-2xl bg-parchment p-6 text-center shadow-xl"
        style={{ borderTop: `5px solid ${accent}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {confetti && <Confetti />}
        <div
          className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl"
          style={{ backgroundColor: `${accent}22` }}
        >
          {icon}
        </div>
        {eyebrow && (
          <p
            className="relative mt-4 font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.18em]"
            style={{ color: accent }}
          >
            {eyebrow}
          </p>
        )}
        <h2 className="relative mt-1 text-2xl font-semibold text-ink">{title}</h2>
        <p className="relative mt-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{message}</p>
        {verse && (
          <div className="relative mt-4 text-left">
            <ScriptureQuote verse={verse} compact />
          </div>
        )}
        <div className="relative mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
        </div>
      </div>
    </div>
  );
}
