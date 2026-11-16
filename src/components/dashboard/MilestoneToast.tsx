import { useT } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";
import { FeatureIcon } from "../ui/FeatureIcons";

/** A quiet note at the bottom of the screen for a milestone: it rises in and fades away (Update 42: no sparkles). */
export function MilestoneToast({ message }: { message: StringKey | null }) {
  const t = useT();
  if (!message) return null;
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="cm-card rise-in flex max-w-md items-center gap-3 px-4 py-3 font-[family-name:var(--font-ui)] text-sm text-ink shadow-lg">
        <span className="cm-icon h-8 w-8 shrink-0" aria-hidden="true">
          <FeatureIcon name="tick" size={16} />
        </span>
        <span>{t(message)}</span>
      </div>
    </div>
  );
}
