import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { GLOSSARY } from "../../content/glossary";
import { useLang } from "../../i18n/LanguageContext";
import { Card, CardBody } from "../ui/Card";

/** Every glossary term in A to Z order, searchable, with anchors so lesson popovers can link straight to one. */
export function GlossaryPage() {
  const { lang, t } = useLang();
  const [query, setQuery] = useState("");
  const { hash } = useLocation();

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...GLOSSARY]
      .sort((a, b) => a.term[lang].localeCompare(b.term[lang], lang))
      .filter(
        (e) =>
          q === "" ||
          e.term[lang].toLowerCase().includes(q) ||
          e.definition[lang].toLowerCase().includes(q),
      );
  }, [query, lang]);

  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView({ block: "center" });
  }, [hash]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link to="/course" className="font-[family-name:var(--font-ui)] text-sm text-ink-soft hover:text-ink">
          ← {t("glossary.back")}
        </Link>
        <h1 className="mt-2 text-3xl font-semibold text-ink">{t("glossary.title")}</h1>
        <p className="mt-2 max-w-2xl font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("glossary.intro")}</p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("glossary.search")}
          aria-label={t("glossary.search")}
          className="w-full max-w-md rounded-lg border border-line bg-surface px-3 py-2 font-[family-name:var(--font-ui)] text-base text-ink focus:border-water focus:outline-none"
        />
        <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          {t("glossary.count", { count: entries.length })}
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("glossary.none")}</p>
      ) : (
        <dl className="grid gap-3 md:grid-cols-2">
          {entries.map((e) => (
            <Card key={e.id} className={hash === `#${e.id}` ? "ring-2 ring-gold" : ""}>
              <CardBody className="scroll-mt-24" >
                <dt id={e.id} className="text-lg font-semibold text-ink">
                  {e.term[lang]}
                </dt>
                <dd className="mt-1 font-[family-name:var(--font-ui)] text-sm leading-relaxed text-ink-soft">
                  {e.definition[lang]}
                </dd>
              </CardBody>
            </Card>
          ))}
        </dl>
      )}
    </div>
  );
}
