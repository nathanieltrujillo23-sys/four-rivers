import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Button } from "../ui/Button";

export interface TourStep {
  /** Matches an element's `data-tour` attribute. */
  target: string;
  title: string;
  text: string;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 10;
const TIP_W = 360;
const TIP_H = 200;

/**
 * A step-by-step spotlight tour: each step lights up one element (found by its
 * `data-tour` attribute) and dims the rest of the screen, with a short
 * explanation and a Next button. Mount it only while the tour is running —
 * it always starts at step one. On the last step the tip offers
 * `finalAction` instead of Next.
 */
export function GuidedTour({
  steps,
  onClose,
  finalAction,
}: {
  steps: TourStep[];
  /** `completed` is true when the learner reached the end (not Skip). */
  onClose: (completed: boolean) => void;
  finalAction: { label: string; onClick: () => void };
}) {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const step = steps[index];
  const last = index === steps.length - 1;

  // Scroll the target into view, then keep tracking its rectangle every frame
  // so the spotlight stays glued to it through smooth-scrolling and resizes.
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(
      `[data-tour="${step.target}"]`,
    );
    if (!el) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const tall = el.getBoundingClientRect().height > window.innerHeight * 0.6;
    el.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: tall ? "start" : "center",
    });

    let raf = 0;
    const tick = () => {
      const r = el.getBoundingClientRect();
      setBox((prev) =>
        prev &&
        prev.top === r.top &&
        prev.left === r.left &&
        prev.width === r.width &&
        prev.height === r.height
          ? prev
          : { top: r.top, left: r.left, width: r.width, height: r.height },
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step.target]);

  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(last);
      else if (e.key === "ArrowRight")
        setIndex((i) => Math.min(steps.length - 1, i + 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, last, steps.length]);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tipW = Math.min(TIP_W, vw - 32);
  let tipStyle: CSSProperties = {
    left: (vw - tipW) / 2,
    bottom: 16,
    width: tipW,
  };
  if (box) {
    const left = Math.min(
      Math.max(box.left + box.width / 2 - tipW / 2, 16),
      vw - tipW - 16,
    );
    const below = vh - (box.top + box.height + PAD);
    const above = box.top - PAD;
    if (below >= TIP_H + 24)
      tipStyle = { left, top: box.top + box.height + PAD + 12, width: tipW };
    else if (above >= TIP_H + 24)
      tipStyle = { left, bottom: vh - (box.top - PAD) + 12, width: tipW };
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-label="Guided tour"
    >
      {/* Swallows clicks so the page underneath can't be used mid-tour. */}
      <div className="absolute inset-0" />
      {box ? (
        <div
          className="tour-spot pointer-events-none absolute"
          style={{
            top: box.top - PAD,
            left: box.left - PAD,
            width: box.width + PAD * 2,
            height: box.height + PAD * 2,
          }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-black/65" />
      )}

      <div
        key={index}
        className="tour-tip absolute rounded-2xl border border-line bg-surface p-5 shadow-2xl"
        style={tipStyle}
      >
        <div className="flex items-center justify-between font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          <span>
            Step {index + 1} of {steps.length}
          </span>
          {!last && (
            <button
              type="button"
              className="underline hover:text-ink"
              onClick={() => onClose(false)}
            >
              Skip tour
            </button>
          )}
        </div>
        <h2 className="mt-2 text-lg font-semibold text-ink">{step.title}</h2>
        <p className="mt-1 font-[family-name:var(--font-ui)] text-sm leading-relaxed text-ink-soft">
          {step.text}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1" aria-hidden="true">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-water" : "bg-line"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {index > 0 && (
              <Button variant="ghost" onClick={() => setIndex(index - 1)}>
                Back
              </Button>
            )}
            {last ? (
              <>
                <Button variant="ghost" onClick={() => onClose(true)}>
                  Close
                </Button>
                <Button
                  ref={nextRef}
                  variant="tour"
                  className="whitespace-nowrap"
                  onClick={() => {
                    onClose(true);
                    finalAction.onClick();
                  }}
                >
                  {finalAction.label}
                </Button>
              </>
            ) : (
              <Button
                ref={nextRef}
                variant="tour"
                onClick={() => setIndex(index + 1)}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
