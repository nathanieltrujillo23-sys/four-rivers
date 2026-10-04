import portrait from "../../assets/testimony-nathaniel.jpg";
import { VERSE } from "../../content/scripture";
import { ScriptureQuote } from "../ui/Scripture";
import { Card, CardBody } from "../ui/Card";
import { useLang } from "../../i18n/LanguageContext";
import { en } from "../../i18n/en";
import { es } from "../../i18n/es";
import { useTestimony } from "../../lib/siteText";

/**
 * "My Testimony": the founder's own story, in his own words, placed on the
 * landing page just under "How it works". An admin can edit the text from the
 * Admin dashboard. The Genesis 39:2 quote appears under whichever paragraph
 * mentions it.
 */
export function Testimony() {
  const { lang } = useLang();
  const testimony = useTestimony(lang);
  return (
    <section className="flex flex-col items-center gap-6 rounded-2xl bg-parchment-deep/60 p-8 text-center">
      <h2 className="text-2xl font-semibold text-ink">{testimony.title}</h2>

      <img
        src={portrait}
        alt={defaultAlt(lang)}
        width={160}
        height={160}
        className="h-40 w-40 rounded-full border-4 border-white object-cover shadow-md"
      />

      <Card className="max-w-2xl text-left">
        <CardBody className="flex flex-col gap-4">
          {testimony.paragraphs.map((text, i) => (
            <div key={i} className="flex flex-col gap-3">
              <p className="whitespace-pre-line leading-relaxed text-ink-soft">{text}</p>
              {text.includes("Genesis 39:2") || text.includes("Génesis 39:2") ? (
                <ScriptureQuote verse={VERSE.gen39_2_niv} compact />
              ) : null}
            </div>
          ))}
          <p className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
            — {testimony.sign}
          </p>
        </CardBody>
      </Card>
    </section>
  );
}

function defaultAlt(lang: "en" | "es"): string {
  return lang === "es" ? es["testimony.alt"] : en["testimony.alt"];
}
