import { useCallback, useSyncExternalStore } from "react";

/**
 * The app's motion setting. Animations follow the device's "reduce motion" setting automatically, and a person can also
 * turn motion off themselves (the toggle in the header). Everything that moves asks this one module, and the CSS turns
 * its animations off when <html data-motion="reduce"> is set.
 */
const KEY = "four-rivers:motion";
const listeners = new Set<() => void>();

const systemReduces = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function savedChoice(): "reduce" | null {
  try {
    return localStorage.getItem(KEY) === "reduce" ? "reduce" : null;
  } catch {
    return null;
  }
}

/** Whether motion should be kept to a minimum right now. */
export function motionReduced(): boolean {
  return savedChoice() === "reduce" || systemReduces();
}

export function applyMotion() {
  if (typeof document !== "undefined") document.documentElement.dataset.motion = motionReduced() ? "reduce" : "full";
}

export function setMotionReduced(reduce: boolean) {
  try {
    if (reduce) localStorage.setItem(KEY, "reduce");
    else localStorage.removeItem(KEY);
  } catch {
    /* private window: the choice is not remembered between visits */
  }
  applyMotion();
  listeners.forEach((l) => l());
}

/** Reads the setting and re-renders when it changes. `own` is true when the person turned motion off themselves. */
export function useMotion() {
  const reduced = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
      mq?.addEventListener("change", cb);
      return () => {
        listeners.delete(cb);
        mq?.removeEventListener("change", cb);
      };
    },
    motionReduced,
    () => false,
  );
  const toggle = useCallback(() => setMotionReduced(!motionReduced() || (savedChoice() === null && systemReduces())), []);
  return { reduced, own: savedChoice() === "reduce", system: systemReduces(), toggle };
}

/** A short vibration on phones that support it, for the moments worth feeling. Silent when motion is reduced. */
export function haptic(pattern: number | number[] = 12) {
  try {
    if (!motionReduced() && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    /* some browsers refuse; nothing is lost */
  }
}
