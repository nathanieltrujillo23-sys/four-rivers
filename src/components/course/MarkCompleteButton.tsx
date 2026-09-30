import { useEffect, useState } from "react";
import { Button } from "../ui/Button";

const STAR_COUNT = 8;
const TOASTS = ["Nice work!", "Well done!", "Keep going!", "Great progress!"];

/** A short burst of stars flying outward from the button, then removing itself. */
function StarBurst({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 750);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      aria-hidden="true"
    >
      {Array.from({ length: STAR_COUNT }, (_, i) => {
        const angle = (i / STAR_COUNT) * Math.PI * 2;
        const distance = 40 + (i % 2) * 16;
        const dx = Math.round(Math.cos(angle) * distance);
        const dy = Math.round(Math.sin(angle) * distance);
        return (
          <span
            key={i}
            className="star-particle absolute text-lg leading-none"
            style={{
              ["--dx" as string]: `${dx}px`,
              ["--dy" as string]: `${dy}px`,
              animationDelay: `${(i % 3) * 40}ms`,
            }}
          >
            ⭐
          </span>
        );
      })}
    </div>
  );
}

/** An expanding ring in the river's accent color, pulsing out from the button. */
function CompleteRing({ accent, onDone }: { accent: string; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 750);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      aria-hidden="true"
    >
      <span
        className="complete-ring h-10 w-10 rounded-full border-2"
        style={{ borderColor: accent }}
      />
    </div>
  );
}

/**
 * The explicit "did you finish this?" action for a module. Clicking it is
 * what advances the module progress bar — simply opening the page no longer
 * does. Once marked, it stays marked (consistent with the rest of the app's
 * sticky-completion pattern) and the button becomes inert.
 */
export function MarkCompleteButton({
  completed,
  onComplete,
  accent = "#c9a24b",
}: {
  completed: boolean;
  onComplete: () => void;
  /** River accent color for the ripple ring; defaults to the app's gold. */
  accent?: string;
}) {
  const [bursting, setBursting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <div className="relative inline-flex">
      <Button
        variant={completed ? "secondary" : "primary"}
        disabled={completed}
        onClick={() => {
          if (completed) return;
          onComplete();
          setBursting(true);
          setToast(TOASTS[Math.floor(Math.random() * TOASTS.length)]);
        }}
      >
        {completed ? "✓ Completed" : "Mark as completed"}
      </Button>
      {bursting && (
        <>
          <StarBurst onDone={() => setBursting(false)} />
          <CompleteRing accent={accent} onDone={() => {}} />
        </>
      )}
      {toast && (
        <span
          className="complete-toast pointer-events-none absolute -top-9 left-1/2 whitespace-nowrap rounded-full bg-ink px-3 py-1 text-xs font-medium text-parchment font-[family-name:var(--font-ui)]"
          onAnimationEnd={() => setToast(null)}
        >
          {toast}
        </span>
      )}
    </div>
  );
}
