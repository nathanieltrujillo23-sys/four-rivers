import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en, type StringKey } from "./en";
import { es } from "./es";
import { setFormatLocale } from "../utils/format";

export type Lang = "en" | "es";
export type FontSize = "small" | "default" | "large" | "xlarge";

/** Root font size for each step; every size in the app is rem-based, so this scales everything. */
const FONT_PERCENT: Record<FontSize, string> = {
  small: "87.5%",
  default: "100%",
  large: "112.5%",
  xlarge: "125%",
};

const LANG_KEY = "four-rivers:lang";
const FONT_KEY = "four-rivers:fontsize";

const DICTIONARIES: Record<Lang, Record<StringKey, string>> = { en, es };

function loadLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "en" || stored === "es") return stored;
  } catch {
    /* storage unavailable, fall through to the browser's language */
  }
  // Spanish is only ever chosen explicitly for now, never guessed from the browser.
  return "en";
}

function loadFont(): FontSize {
  try {
    const stored = localStorage.getItem(FONT_KEY);
    if (stored === "small" || stored === "default" || stored === "large" || stored === "xlarge") {
      return stored;
    }
  } catch {
    /* storage unavailable */
  }
  return "default";
}

export type Translate = (key: StringKey, vars?: Record<string, string | number>) => string;

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  t: Translate;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Language and text size, per browser (localStorage) like the theme. The
 * dictionary is typed from the English file, so a string missing from the
 * Spanish one is a compile error, never a blank label at runtime.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadLang);
  const [fontSize, setFontSizeState] = useState<FontSize>(loadFont);

  useEffect(() => {
    document.documentElement.lang = lang;
    setFormatLocale(lang);
  }, [lang]);

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_PERCENT[fontSize];
  }, [fontSize]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      /* the choice just won't persist */
    }
  }, []);

  const setFontSize = useCallback((next: FontSize) => {
    setFontSizeState(next);
    try {
      localStorage.setItem(FONT_KEY, next);
    } catch {
      /* the choice just won't persist */
    }
  }, []);

  const t = useCallback<Translate>(
    (key, vars) => {
      let out = DICTIONARIES[lang][key] ?? en[key];
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          out = out.split(`{${name}}`).join(String(value));
        }
      }
      return out;
    },
    [lang],
  );

  const value = useMemo(
    () => ({ lang, setLang, fontSize, setFontSize, t }),
    [lang, setLang, fontSize, setFontSize, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within a LanguageProvider");
  return ctx;
}

/** Shorthand for components that only need to translate. */
export function useT(): Translate {
  return useLang().t;
}

/** Picks the English or Spanish value of a bilingual pair. */
export function pick<T>(lang: Lang, pair: { en: T; es: T }): T {
  return pair[lang];
}
