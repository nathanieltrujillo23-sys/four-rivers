import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../../i18n/LanguageContext";
import { FeatureIcon } from "../ui/FeatureIcons";

/**
 * The foot of a lesson (Update 39): "Mark as read" in the middle, with the previous and next lessons named on either
 * side as quiet links (or, on the last lesson, whatever comes next: the quiz, or why it's still locked).
 */
export function LessonNav({
  prev,
  next,
  end,
  complete,
}: {
  prev: { to: string; title: string } | null;
  next: { to: string; title: string } | null;
  /** Shown in place of "Next" on the last lesson. */
  end?: ReactNode;
  complete: ReactNode;
}) {
  const { t } = useLang();
  const side = "group flex min-w-0 flex-col gap-0.5 rounded-md px-1 py-1 font-[family-name:var(--font-ui)]";
  return (
    <nav aria-label={t("lesson.navLabel")} className="cm-card flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex justify-center">{complete}</div>
      <div className="grid grid-cols-1 gap-4 border-t border-line pt-4 sm:grid-cols-2">
        <div>
          {prev && (
            <Link to={prev.to} className={side}>
              <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                <FeatureIcon name="arrow" size={13} className="rotate-180 transition-transform group-hover:-translate-x-0.5" />
                {t("lesson.prev")}
              </span>
              <span className="truncate text-sm font-semibold text-ink group-hover:text-water-deep">{prev.title}</span>
            </Link>
          )}
        </div>
        <div className="sm:text-right">
          {next ? (
            <Link to={next.to} className={`${side} sm:items-end`}>
              <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                {t("lesson.next")}
                <FeatureIcon name="arrow" size={13} className="cm-arrow" />
              </span>
              <span className="truncate text-sm font-semibold text-ink group-hover:text-water-deep">{next.title}</span>
            </Link>
          ) : (
            <div className="flex sm:justify-end">{end}</div>
          )}
        </div>
      </div>
    </nav>
  );
}
