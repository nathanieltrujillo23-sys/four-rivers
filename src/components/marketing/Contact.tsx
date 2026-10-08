import { Card, CardBody } from "../ui/Card";
import { useT } from "../../i18n/LanguageContext";

export const CONTACT_EMAIL = "trujillo.n@ufl.edu";
export const CONTACT_PHONE_DISPLAY = "352-604-2084";
const CONTACT_PHONE_TEL = "+13526042084";

/** Simple contact box on the landing page — a direct line to the founder. */
export function Contact() {
  const t = useT();
  return (
    <Card className="mx-auto max-w-xl bg-parchment-deep/50 text-center">
      <CardBody>
        <h2 className="t-h3">{t("contact.title")}</h2>
        <p className="mt-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("contact.text")}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-block rounded-lg bg-water-deep px-4 py-2 font-[family-name:var(--font-ui)] text-sm font-medium text-white transition-colors hover:bg-water"
          >
            {CONTACT_EMAIL}
          </a>
          <a
            href={`tel:${CONTACT_PHONE_TEL}`}
            className="inline-block rounded-lg bg-water-deep px-4 py-2 font-[family-name:var(--font-ui)] text-sm font-medium text-white transition-colors hover:bg-water"
          >
            {CONTACT_PHONE_DISPLAY}
          </a>
        </div>
      </CardBody>
    </Card>
  );
}
