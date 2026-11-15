import type { Group } from "../../types";
import { findLibraryVerse } from "../../content/verseLibrary";
import { localizedVerse } from "../../content/scriptureEs";
import { useLang } from "../../i18n/LanguageContext";

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
    <section className="cm-card relative overflow-hidden p-5 pl-6">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-gold" />
      <div>
        <p className="cm-label">
          {group.verseLocked ? t("votd.permanent") : v?.day ? t("votd.day", { n: v.day }) : t("votd.title")}
        </p>
        {shown && v ? (
          <>
            <p className="mt-2 font-[family-name:var(--font-display)] text-lg leading-snug text-ink">
              “{shown.text}”
            </p>
            <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              — {shown.reference} ({shown.version})
            </p>
            {v.note && <p className="cm-inset mt-3 px-3 py-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{v.note}</p>}
          </>
        ) : (
          <p className="mt-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            {isLeader ? t("votd.emptyLeader") : t("votd.empty")}
          </p>
        )}
      </div>
    </section>
  );
}
