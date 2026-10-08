import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Lets a section rise into view the first time it scrolls on screen. Without scripting, or when the visitor asked for
 * less motion, it is simply shown (the CSS also turns the movement off).
 */
export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Anything already on screen is shown straight away; only content below the fold waits for its moment.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    setArmed(true);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${armed ? "reveal" : ""} ${shown ? "reveal-in" : ""} ${className}`.trim()}>
      {children}
    </div>
  );
}
