import { InstallButton } from "../ui/InstallButton";
import { useLang } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";
import en1 from "../../assets/screens/en-1.jpg";
import en2 from "../../assets/screens/en-2.jpg";
import en3 from "../../assets/screens/en-3.jpg";
import es1 from "../../assets/screens/es-1.jpg";
import es2 from "../../assets/screens/es-2.jpg";
import es3 from "../../assets/screens/es-3.jpg";

const SHOTS = {
  en: [en1, en2, en3],
  es: [es1, es2, es3],
} as const;

/** Three phone-framed screenshots of the real app (made by tools/dev/capture-showcase.mjs). */
export function PhoneShowcase() {
  const { lang, t } = useLang();
  const shots = SHOTS[lang];
  return (
    <section aria-labelledby="show-title" className="text-center">
      <h2 id="show-title" className="t-h1">
        {t("show.title")}
      </h2>
      <p className="t-lead mx-auto mt-3 max-w-xl">{t("show.sub")}</p>
      <div className="mt-10 grid items-start gap-10 sm:grid-cols-3 sm:gap-6">
        {shots.map((src, i) => (
          <figure
            key={src}
            className={`mx-auto w-full max-w-[15rem] ${i === 1 ? "sm:mt-10" : ""}`}
          >
            <div className="phone">
              <img
                src={src}
                alt={t(`show.alt${i + 1}` as StringKey)}
                width={390}
                height={780}
                loading="lazy"
                decoding="async"
              />
            </div>
            <figcaption className="mt-4 font-[family-name:var(--font-ui)] text-sm font-medium text-ink">
              {t(`show.c${i + 1}` as StringKey)}
            </figcaption>
          </figure>
        ))}
      </div>
      <InstallButton className="mx-auto mt-8 max-w-xs sm:hidden" />
    </section>
  );
}
