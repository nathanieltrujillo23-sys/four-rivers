import { useCallback, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/*
 * Chromium browsers fire `beforeinstallprompt` once, early, when the PWA is installable. Several buttons
 * (the menu, the home page, the language menu) want it, so it is caught here at startup (main.tsx imports this
 * file) and shared, instead of each button missing an event that fired before it appeared.
 * iOS Safari never fires it, so there the buttons show the Share-sheet steps instead.
 */
let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    emit();
  });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true);

const isIos = () =>
  typeof navigator !== "undefined" &&
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !(window as unknown as { MSStream?: unknown }).MSStream;

export function useInstallPrompt() {
  const hasPrompt = useSyncExternalStore(
    subscribe,
    () => deferred !== null,
    () => false,
  );
  const isInstalled = useSyncExternalStore(
    subscribe,
    () => installed,
    () => false,
  );

  const standalone = isStandalone();
  const ios = isIos();
  const alreadyInstalled = standalone || isInstalled;

  const install = useCallback(async () => {
    if (!deferred) return;
    const prompt = deferred;
    await prompt.prompt();
    await prompt.userChoice;
    deferred = null;
    emit();
  }, []);

  return {
    canInstall: hasPrompt && !alreadyInstalled,
    showIosHint: ios && !alreadyInstalled,
    /** True once the app is on this device's home screen (or is being run from it). */
    alreadyInstalled,
    ios,
    install,
  };
}
