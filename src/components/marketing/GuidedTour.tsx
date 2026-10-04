import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useDemo } from "../../state/DemoContext";
import { useT } from "../../i18n/LanguageContext";
import { Button } from "../ui/Button";

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
 * The spotlight overlay for the guided tour (state lives in DemoContext).
 * Each step lights up one element — found by its `data-tour` attribute on
 * whichever real page the step navigated to — and dims the rest of the
 * screen, with a short explanation and a Next button. Renders nothing when
 * no tour is running.
 */
export function GuidedTour() {
  const { step, stepIndex, totalSteps, next, back, skip, finish } = useDemo();
  const t = useT();
  const navigate = useNavigate();
  const [box, setBox] = useState<Box | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const target = step?.target;
  const last = stepIndex === totalSteps - 1;

  // The target may not exist yet (the page is still loading, or the sample
  // account is remounting), so look for it every frame, scroll to it once it
  // appears, and keep tracking its rectangle through scrolling and resizes.
  useEffect(() => {
    if (!target) return;
    let el: HTMLElement | null = null;
    let raf = 0;
    const tick = () => {
      if (!el || !el.isConnected) {
        el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
        if (el) {
          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const tall = el.getBoundingClientRect().height > window.innerHeight * 0.6;
          el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: tall ? "start" : "center" });
        }
      }
      const r = el?.getBoundingClientRect();
      setBox((prev) => {
        if (!r) return prev === null ? prev : null;
        return prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height
          ? prev
          : { top: r.top, left: r.left, width: r.width, height: r.height };
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, stepIndex]);

  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, [stepIndex]);

  useEffect(() => {
    if (stepIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") (last ? finish : skip)();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stepIndex, last, next, back, skip, finish]);

  if (!step || stepIndex === null) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tipW = Math.min(TIP_W, vw - 32);
  let tipStyle: CSSProperties = { left: (vw - tipW) / 2, bottom: 16, width: tipW };
  if (box) {
    const left = Math.min(Math.max(box.left + box.width / 2 - tipW / 2, 16), vw - tipW - 16);
    const below = vh - (box.top + box.height + PAD);
    const above = box.top - PAD;
    if (below >= TIP_H + 24) tipStyle = { left, top: box.top + box.height + PAD + 12, width: tipW };
    else if (above >= TIP_H + 24) tipStyle = { left, bottom: vh - (box.top - PAD) + 12, width: tipW };
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={t("tour.aria")}>
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
        key={stepIndex}
        className="tour-tip absolute rounded-2xl border border-line bg-surface p-5 shadow-2xl"
        style={tipStyle}
      >
        <div className="flex items-center justify-between font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          <span>
            {t("tour.step", { n: stepIndex + 1, total: totalSteps })}
          </span>
          {!last && (
            <button type="button" className="underline hover:text-ink" onClick={skip}>
              {t("tour.skip")}
            </button>
          )}
        </div>
        <h2 className="mt-2 text-lg font-semibold text-ink">{t(step.title)}</h2>
        <p className="mt-1 font-[family-name:var(--font-ui)] text-sm leading-relaxed text-ink-soft">{t(step.text, step.vars)}</p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1" aria-hidden="true">
            {Array.from({ length: totalSteps }, (_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === stepIndex ? "bg-water" : "bg-line"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {stepIndex > 0 && !last && (
              <Button variant="ghost" onClick={back}>
                {t("tour.back")}
              </Button>
            )}
            {last ? (
              <>
                <Button variant="ghost" onClick={finish}>
                  {t("tour.close")}
                </Button>
                <Button
                  ref={nextRef}
                  variant="tour"
                  className="whitespace-nowrap"
                  onClick={() => {
                    finish();
                    navigate("/signin");
                  }}
                >
                  {t("tour.begin")}
                </Button>
              </>
            ) : (
              <Button ref={nextRef} variant="tour" onClick={next}>
                {t("tour.next")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
