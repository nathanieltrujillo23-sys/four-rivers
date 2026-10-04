import { useEffect, useRef, useState } from "react";
import { useLang, type FontSize, type Lang } from "../../i18n/LanguageContext";
import { useInstallPrompt } from "../../state/useInstallPrompt";

const SIZES: { value: FontSize; key: "menu.size.small" | "menu.size.default" | "menu.size.large" | "menu.size.xlarge"; px: number }[] = [
  { value: "small", key: "menu.size.small", px: 12 },
  { value: "default", key: "menu.size.default", px: 15 },
  { value: "large", key: "menu.size.large", px: 18 },
  { value: "xlarge", key: "menu.size.xlarge", px: 21 },
];

const LANGS: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];

/**
 * The "A" button next to the theme toggle, styled like it. Hovering or
 * focusing reveals language and text-size choices; tapping toggles it for
 * touch screens.
 */
export function LanguageMenu() {
  const { lang, setLang, fontSize, setFontSize, t } = useLang();
  const { canInstall, showIosHint, install } = useInstallPrompt();
  const [pinned, setPinned] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pinned) return;
    const close = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setPinned(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [pinned]);

  return (
    <div ref={root} className="group relative shrink-0" data-tour="language-menu">
      <button
        type="button"
        onClick={() => setPinned((v) => !v)}
        aria-label={t("menu.label")}
        aria-expanded={pinned}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-parchment-deep hover:text-ink group-focus-within:text-ink"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4.5 20.5L12 3.5l7.5 17M7.6 14.5h8.8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div
        className={`absolute left-0 top-full z-40 pt-1 transition-opacity sm:left-auto sm:right-0 ${
          pinned
            ? "visible opacity-100"
            : "invisible opacity-0 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
        }`}
      >
        <div className="w-64 rounded-xl border border-line bg-surface p-3 shadow-lg">
          <p className="font-[family-name:var(--font-ui)] text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
            {t("menu.language")}
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5" role="group" aria-label={t("menu.language")}>
            {LANGS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLang(l.value)}
                aria-pressed={lang === l.value}
                className={`rounded-lg border px-2 py-1.5 font-[family-name:var(--font-ui)] text-sm transition-colors ${
                  lang === l.value
                    ? "border-water-deep bg-water-deep/10 font-semibold text-ink"
                    : "border-line text-ink-soft hover:bg-parchment-deep hover:text-ink"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <p className="mt-3 font-[family-name:var(--font-ui)] text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
            {t("menu.textSize")}
          </p>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5" role="group" aria-label={t("menu.textSize")}>
            {SIZES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setFontSize(s.value)}
                aria-pressed={fontSize === s.value}
                aria-label={t(s.key)}
                title={t(s.key)}
                className={`flex h-9 items-center justify-center rounded-lg border font-[family-name:var(--font-display)] transition-colors ${
                  fontSize === s.value
                    ? "border-water-deep bg-water-deep/10 font-semibold text-ink"
                    : "border-line text-ink-soft hover:bg-parchment-deep hover:text-ink"
                }`}
                style={{ fontSize: s.px }}
              >
                A
              </button>
            ))}
          </div>

          {canInstall && (
            <button
              type="button"
              onClick={() => void install()}
              className="mt-3 w-full rounded-lg bg-water-deep px-3 py-2 font-[family-name:var(--font-ui)] text-sm font-medium text-white hover:opacity-90"
            >
              {t("menu.install")}
            </button>
          )}
          {!canInstall && showIosHint && (
            <p className="mt-3 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
              {t("menu.installHint")}
            </p>
          )}
          {lang === "es" && (
            <p className="mt-3 font-[family-name:var(--font-ui)] text-[11px] leading-snug text-ink-soft/80">
              {t("menu.verseNote")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
