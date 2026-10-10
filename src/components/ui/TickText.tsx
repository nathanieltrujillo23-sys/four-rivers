import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { motionReduced } from "../../lib/motion";

const NUMBER = /-?\d[\d,]*(\.\d+)?/;

/** Formats a number the way the token it replaces was written (same decimals, with or without thousands commas). */
function format(n: number, like: string): string {
  const decimals = like.includes(".") ? like.split(".")[1].length : 0;
  const grouped = like.includes(",");
  const fixed = Math.abs(n).toFixed(decimals);
  const [whole, frac] = fixed.split(".");
  const body = (grouped ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : whole) + (frac ? `.${frac}` : "");
  return (n < 0 ? "-" : "") + body;
}

/**
 * The text of a value with the first number in it counting up to its value. A number that is already on screen when it
 * appears counts up from zero; one that appears off screen shows its real value straight away, so nothing ever reads
 * as zero to someone who has not scrolled to it (or to a screen reader). After that, each time the value changes it rolls
 * from the old value to the new one. Attach the returned ref to the element that shows it. With reduced motion it always
 * returns the final text.
 */
export function useTickedText<T extends Element>(value: string): [string, RefObject<T | null>] {
  const match = value.match(NUMBER);
  const target = match ? parseFloat(match[0].replace(/,/g, "")) : NaN;
  const [shown, setShown] = useState<number>(target);
  const ref = useRef<T | null>(null);
  const from = useRef<number>(target);
  const frame = useRef(0);
  const mounted = useRef(false);

  const run = (begin: number, end: number) => {
    cancelAnimationFrame(frame.current);
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 700);
      const v = begin + (end - begin) * (1 - Math.pow(1 - p, 3));
      from.current = v;
      setShown(v);
      if (p < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  };

  // First appearance: count up from zero only if the number is on screen right now (before it is first painted).
  useLayoutEffect(() => {
    if (mounted.current || Number.isNaN(target) || motionReduced()) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.bottom > 0 && r.top < window.innerHeight) {
      from.current = 0;
      setShown(0);
      run(0, target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Later changes: roll from where it is to the new value.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (Number.isNaN(target)) return;
    if (motionReduced()) {
      from.current = target;
      setShown(target);
    } else run(from.current, target);
    return () => cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  if (!match || Number.isNaN(shown)) return [value, ref];
  const settled = Math.abs(shown - target) < 0.0001;
  return [value.replace(NUMBER, settled ? match[0] : format(shown, match[0])), ref];
}

/** Text with a number in it that counts up (see useTickedText). Text with no number is shown as it is. */
export function TickText({ value, className }: { value: string; className?: string }) {
  const [text, ref] = useTickedText<HTMLSpanElement>(value);
  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
