import { Link } from "react-router-dom";
import { RIVERS, readable } from "../../theme/theme";
import { EDEN_RIVER_REFS, PRINCIPLE_SCRIPTURE } from "../../content/scripture";
import { ScriptureQuote } from "../ui/Scripture";
import { Card, CardBody } from "../ui/Card";
import { Contact } from "./Contact";
import { useLang } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";
import { localizeReference } from "../../i18n/books";

/** About: what 4 Rivers is, the four rivers with their Scripture in full, and how to reach the founder. */
export function AboutPage() {
  const { lang, t } = useLang();
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-12 py-4">
      <header className="text-center">
        <h1 className="t-h1">{t("about.title")}</h1>
        <p className="t-lead mx-auto mt-4 max-w-2xl">{t("about.intro")}</p>
        <div className="river-rule mx-auto mt-8 max-w-xs" aria-hidden="true" />
      </header>

      <section aria-labelledby="about-rivers" className="flex flex-col gap-4">
        <h2 id="about-rivers" className="t-h2 text-center">
          {t("about.rivers")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {RIVERS.map((r) => (
            <Card key={r.number} accent={r.accent}>
              <CardBody>
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-[family-name:var(--font-ui)] text-sm font-semibold"
                    style={{ color: readable(r.accent) }}
                  >
                    {t("river.label", { n: r.number })}
                  </span>
                  <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                    {t("landing.namedFor", {
                      river: t(`eden.${r.number}` as StringKey),
                      ref: localizeReference(EDEN_RIVER_REFS[r.number], lang),
                    })}
                  </span>
                </div>
                <h3 className="t-h3 mt-1">{t(`river.${r.number}.title` as StringKey)}</h3>
                <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                  {t(`river.${r.number}.principle` as StringKey)}
                </p>
                <div className="mt-3">
                  <ScriptureQuote verse={PRINCIPLE_SCRIPTURE[r.number]} compact />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section id="contact" aria-labelledby="about-more" className="flex flex-col gap-4 scroll-mt-20">
        <h2 id="about-more" className="sr-only">
          {t("about.more")}
        </h2>
        <Contact />
        <p className="text-center font-[family-name:var(--font-ui)] text-sm">
          <Link to="/glossary" className="text-water underline underline-offset-4 hover:text-water-deep">
            {t("about.glossary")}
          </Link>
        </p>
      </section>
    </div>
  );
}
