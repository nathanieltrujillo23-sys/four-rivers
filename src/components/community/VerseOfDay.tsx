import type { Group } from "../../types";
import { findLibraryVerse } from "../../content/verseLibrary";
import { localizedVerse } from "../../content/scriptureEs";
import { useLang } from "../../i18n/LanguageContext";
import { THEME } from "../../theme/theme";
import { Card, CardBody } from "../ui/Card";

/** The leader-set "Day N" and verse, shown at the top of the group page. */
export function VerseOfDay({ group, isLeader }: { group: Group; isLeader: boolean }) {
  const { lang, t } = useLang();
  const v = group.verse;
  const verse = v
    ? (findLibraryVerse(v.reference, v.translation) ??
      (v.text ? { reference: v.reference, translation: v.translation, text: v.text } : undefined))
    : undefined;
  const shown = verse ? localizedVerse(verse, lang) : null;

  return (
    <Card accent={THEME.palette.gold} className="bg-parchment-deep/40">
      <CardBody>
        <p className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.18em] text-clay">
          {v?.day ? t("votd.day", { n: v.day }) : t("votd.title")}
        </p>
        {shown && v ? (
          <>
            <p className="mt-2 font-[family-name:var(--font-display)] text-xl leading-snug text-ink">
              “{shown.text}”
            </p>
            <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              — {shown.reference} ({shown.version})
            </p>
            {v.note && <p className="mt-3 rounded-lg bg-surface/70 px-3 py-2 text-ink-soft">{v.note}</p>}
          </>
        ) : (
          <p className="mt-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            {isLeader ? t("votd.emptyLeader") : t("votd.empty")}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
