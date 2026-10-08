import { useLang } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";
import { FeatureIcon } from "../ui/FeatureIcons";

const ITEMS = [1, 2, 3, 4, 5, 6] as const;

/** Frequently asked questions, as plain expandable rows (keyboard and screen reader friendly, no scripting needed). */
export function Faq() {
  const { t } = useLang();
  return (
    <section aria-labelledby="faq-title" className="mx-auto w-full max-w-3xl">
      <h2 id="faq-title" className="t-h1 text-center">
        {t("faq.title")}
      </h2>
      <div className="mt-8 flex flex-col divide-y divide-line overflow-hidden panel">
        {ITEMS.map((n) => (
          <details key={n} className="group px-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-[family-name:var(--font-display)] text-lg font-semibold text-ink [&::-webkit-details-marker]:hidden">
              {t(`faq.q${n}` as StringKey)}
              <FeatureIcon name="chevron" className="shrink-0 text-ink-soft transition-transform group-open:rotate-180" />
            </summary>
            <p className="pb-5 font-[family-name:var(--font-ui)] text-sm leading-relaxed text-ink-soft">
              {t(`faq.a${n}` as StringKey)}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
