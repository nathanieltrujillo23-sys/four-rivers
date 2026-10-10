import { useEffect, useRef } from "react";

/** A thin river along the top of the screen that fills as you scroll down a lesson, so you can feel how much is left. */
export function ReadingProgress() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = bar.current;
      if (!el) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      el.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[55] h-1 print:hidden" aria-hidden="true">
      <div
        ref={bar}
        className="h-full origin-left transition-transform duration-150 ease-out"
        style={{
          transform: "scaleX(0)",
          background: "linear-gradient(90deg, var(--color-river-1), var(--color-river-2), var(--color-river-3), var(--color-river-4))",
        }}
      />
    </div>
  );
}
