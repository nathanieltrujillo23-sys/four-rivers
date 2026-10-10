import { useState } from "react";
import { useLang } from "../../i18n/LanguageContext";
import { useInstallPrompt } from "../../state/useInstallPrompt";

/**
 * "Download the app" for phones. Where the browser can install the app in one tap (Chrome and friends) it does;
 * everywhere else (iPhone Safari, Firefox, a browser that hasn't offered it yet) it opens the short steps.
 * Hidden once the app is already installed, and on larger screens unless `className` says otherwise.
 */
export function InstallButton({
  className = "",
  variant = "button",
  onAction,
}: {
  className?: string;
  /** "menu" is plain left-aligned text with no icon, to sit among the menu's links. */
  variant?: "button" | "menu";
  /** Called when the button is pressed, e.g. to close a menu. Not called when only the steps open. */
  onAction?: () => void;
}) {
  const { t } = useLang();
  const { canInstall, alreadyInstalled, ios, install } = useInstallPrompt();
  const [open, setOpen] = useState(false);
  if (alreadyInstalled) return null;
  const plain = variant === "menu";

  return (
    <div className={className} data-install>
      <button
        type="button"
        aria-expanded={canInstall ? undefined : open}
        onClick={() => {
          if (canInstall) {
            onAction?.();
            void install();
          } else setOpen((v) => !v);
        }}
        className={
          plain
            ? "w-full rounded-lg px-3 py-2 text-left text-ink-soft hover:text-ink"
            : "flex w-full items-center justify-center gap-2 rounded-lg bg-water-deep px-4 py-2.5 font-[family-name:var(--font-ui)] text-sm font-medium text-white transition-[transform,opacity] hover:opacity-90 active:scale-[0.98]"
        }
      >
        {!plain && (
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5M4 16h12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {t("install.cta")}
      </button>
      {!canInstall && open && (
        <p
          role="status"
          className={`${plain ? "mx-3" : ""} mt-2 rounded-lg border border-line bg-surface px-3 py-2 text-left font-[family-name:var(--font-ui)] text-xs leading-relaxed text-ink-soft`}
        >
          {ios ? t("install.steps.ios") : t("install.steps.other")}
        </p>
      )}
    </div>
  );
}
