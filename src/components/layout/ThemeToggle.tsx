import { useT } from "../../i18n/LanguageContext";
import { useTheme } from "../../state/useTheme";

/** Shows the icon for the mode a click will switch TO (moon while light, sun
 * while dark) — the common convention for a light/dark toggle. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  const t = useT();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? t("nav.toLight") : t("nav.toDark")}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-parchment-deep hover:text-ink"
    >
      {isDark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 2V4.5M12 19.5V22M22 12H19.5M4.5 12H2M19.07 4.93L17.3 6.7M6.7 17.3L4.93 19.07M19.07 19.07L17.3 17.3M6.7 6.7L4.93 4.93"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      )}
    </button>
  );
}
