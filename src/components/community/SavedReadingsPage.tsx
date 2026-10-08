import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../state/AuthContext";
import { useLang } from "../../i18n/LanguageContext";
import { localizePassages } from "../../i18n/books";
import { loadSavedReadings } from "../../lib/offline";
import { parseISO, toISO } from "../../lib/readingPlan";
import { Card, CardBody } from "../ui/Card";
import { PassageBody } from "./PassageText";

/** Readings saved on this device (KJV), which open with no connection. Needs nothing from the server. */
export function SavedReadingsPage() {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const today = toISO(new Date());
  const readings = useMemo(
    () => (user ? loadSavedReadings(user.id).sort((a, b) => a.date.localeCompare(b.date)) : []),
    [user],
  );
  const fmt = new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="t-h1">{t("off.title")}</h1>
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("off.sub")}</p>
      </header>
      {readings.length === 0 ? (
        <Card className="border-dashed">
          <CardBody>
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("off.empty")}</p>
            <Link to="/community" className="mt-2 inline-block font-[family-name:var(--font-ui)] text-sm underline">
              {t("nav.community")}
            </Link>
          </CardBody>
        </Card>
      ) : (
        readings.map((r) => (
          <Card key={`${r.groupId}-${r.date}`} accent={r.date === today ? "var(--color-gold)" : undefined}>
            <CardBody className="flex flex-col gap-3">
              <div>
                <p className="t-eyebrow">
                  {r.groupName} · {fmt.format(parseISO(r.date))}
                  {r.date === today ? ` · ${t("cal.today")}` : ""}
                </p>
                <h2 className="font-[family-name:var(--font-display)] t-h3">
                  {localizePassages(r.passages, lang)}
                </h2>
              </div>
              {r.parts.map((part) => (
                <PassageBody key={part.label} chapters={part.chapters} breaks={() => []} chapterLabel={undefined} />
              ))}
            </CardBody>
          </Card>
        ))
      )}
      {lang === "es" && (
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("read.english")}</p>
      )}
    </div>
  );
}
