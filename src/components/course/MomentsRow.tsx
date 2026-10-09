import { Link } from "react-router-dom";
import { useLang } from "../../i18n/LanguageContext";
import { useCopy } from "../../lib/copy";
import { MOMENTS } from "../../content/moments";
import { FeatureIcon } from "../ui/FeatureIcons";
import { momentMinutes, momentText } from "./MomentPage";

/** "Money moments": short reads for the real-life events young adults run into, on the course home. */
export function MomentsRow() {
  const { lang, t } = useLang();
  const copy = useCopy();
  return (
    <section aria-labelledby="moments-title" className="flex flex-col gap-4">
      <div>
        <h2 id="moments-title" className="t-h2">
          {t("moments.title")}
        </h2>
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("moments.sub")}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MOMENTS.map((m) => {
          const text = momentText(m.id, lang, copy)!;
          return (
            <li key={m.id}>
              <Link
                to={`/course/moments/${m.id}`}
                className="panel flex h-full items-start gap-3 p-4 transition-transform duration-200 hover:-translate-y-0.5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-parchment-deep text-water-deep">
                  <FeatureIcon name={m.icon} size={22} />
                </span>
                <span className="min-w-0">
                  <span className="t-h4 block">{text.title}</span>
                  <span className="mt-0.5 block font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                    {t("moments.min", { n: momentMinutes(text) })}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
