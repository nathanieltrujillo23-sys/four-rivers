import { Link } from "react-router-dom";
import { useLang } from "../../i18n/LanguageContext";
import { Contact } from "./Contact";

/** How to reach the founder, with a pointer to the glossary. */
export function ContactPage() {
  const { t } = useLang();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 py-4">
      <h1 className="sr-only">{t("contact.title")} 4 Rivers</h1>
      <Contact />
      <p className="text-center font-[family-name:var(--font-ui)] text-sm">
        <Link to="/glossary" className="text-water underline underline-offset-4 hover:text-water-deep">
          {t("about.glossary")}
        </Link>
      </p>
    </div>
  );
}
