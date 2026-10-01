import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const KEY = "four-rivers:theme";

function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* storage unavailable — default to light */
  }
  return "light";
}

/**
 * The app's light/dark toggle. Every color in the app is a CSS custom
 * property (see the @theme block in index.css), so switching is just setting
 * one attribute on <html> — no component needs its own dark-mode branch.
 * Per-browser via localStorage, same pattern as the rest of the app's
 * client-only preferences (voice choice, reading speed, module progress).
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(loadTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = useCallback(() => {
    setThemeState((t) => {
      const next: Theme = t === "light" ? "dark" : "light";
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* storage unavailable — the choice just won't persist */
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
