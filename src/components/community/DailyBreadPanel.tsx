import { useState } from "react";
import { Link } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useLang } from "../../i18n/LanguageContext";
import { isDailyBreadMember, TOOL_INFO, toolAccess, type DailyBreadTool } from "../../lib/dailyBread";
import { FEATURES } from "../../lib/features";
import { FeatureIcon } from "../ui/FeatureIcons";
import { AskForm } from "./AskForm";

/**
 * The Daily Bread half of Community: a way into the members' space (readings, prayer wall and every tool set), and a row
 * for each tool set that opens it, says it was requested, or asks an admin for it.
 */
export function DailyBreadPanel() {
  const { repository, snapshot, reload } = useCourse();
  const { t } = useLang();
  const [asking, setAsking] = useState<DailyBreadTool | null>(null);
  const profile = snapshot?.profile;
  const rows = toolAccess(profile).filter((r) => r.status !== "unavailable");
  const member = isDailyBreadMember(profile);

  async function send(tool: DailyBreadTool, note: string) {
    if (tool === "wealth") await repository.requestWealth(note);
    else await repository.requestTrackAccess(tool, note);
    setAsking(null);
    reload();
  }

  return (
    <section aria-labelledby="db-title" className="cm-card flex flex-col overflow-hidden">
      <div className="relative px-6 pb-6 pt-7">
        <p className="cm-label">{t("db.eyebrow")}</p>
        <h2 id="db-title" className="mt-1.5 font-[family-name:var(--font-display)] text-[1.6rem] font-semibold leading-tight text-ink">
          {t("db.title")}
        </h2>
        <p className="mt-2 font-[family-name:var(--font-ui)] text-sm leading-relaxed text-ink-soft">{t("db.sub")}</p>
        {member ? (
          <Link
            to="/community/daily-bread"
            className="cm-sheen group relative mt-5 flex items-center justify-between gap-4 overflow-hidden rounded-[0.625rem] bg-water-deep px-5 py-4 text-white transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_32px_-18px_rgb(39_75_109/0.7)]"
          >
            <span className="min-w-0">
              <span className="block font-[family-name:var(--font-ui)] text-sm font-semibold">{t("db.enter")}</span>
              <span className="mt-0.5 block font-[family-name:var(--font-ui)] text-xs text-white">{t("db.enterNote")}</span>
            </span>
            <FeatureIcon name="arrow" size={20} className="cm-arrow shrink-0" />
          </Link>
        ) : (
          <p className="cm-inset mt-5 px-4 py-3 font-[family-name:var(--font-ui)] text-xs leading-relaxed text-ink-soft">
            {t("db.locked")}
          </p>
        )}
      </div>

      <ul className="divide-y divide-line border-t border-line">
        {rows.map(({ tool, status, open }) => {
          const info = TOOL_INFO[tool];
          return (
            <li key={tool} className="group px-6 py-4 transition-colors hover:bg-parchment-deep/40">
              <div className="flex items-center gap-4">
                <span className="cm-icon h-10 w-10 shrink-0">
                  <FeatureIcon name={info.icon} size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-[family-name:var(--font-ui)] text-[15px] font-semibold text-ink">{info.name}</h3>
                  <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t(info.line)}</p>
                  {open && <p className="mt-0.5 font-[family-name:var(--font-ui)] text-[11px] text-ink-soft">{t(`${tool}.cardTag`)}</p>}
                </div>
                {open ? (
                  <Link
                    to={info.path}
                    aria-label={t(`${tool}.open`)}
                    className="shrink-0 rounded-md border border-line px-3 py-1.5 font-[family-name:var(--font-ui)] text-xs font-medium text-water-deep transition-colors hover:border-water-deep hover:bg-water-deep hover:text-white"
                  >
                    {t("dbp.open")}
                  </Link>
                ) : status === "requested" ? (
                  <span className="cm-badge shrink-0" title={t(`${tool}.requested`)}>
                    {t("db.pending")}
                  </span>
                ) : (
                  asking !== tool && (
                    <button
                      type="button"
                      aria-label={t(`${tool}.request`)}
                      onClick={() => setAsking(tool)}
                      className="shrink-0 rounded-md border border-line px-3 py-1.5 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft transition-colors hover:border-water-deep hover:text-water-deep"
                    >
                      {t("db.ask")}
                    </button>
                  )
                )}
              </div>
              {status === "requested" && !open && (
                <p className="mt-2 pl-14 font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t(`${tool}.requested`)}</p>
              )}
              {asking === tool && (
                <div className="mt-3 sm:pl-14">
                  <AskForm
                    hint={t(`${tool}.hint`)}
                    label={t(`${tool}.noteLabel`)}
                    placeholder={t(`${tool}.notePh`)}
                    onSend={(note) => send(tool, note)}
                    onCancel={() => setAsking(null)}
                  />
                </div>
              )}
            </li>
          );
        })}
        {FEATURES.careerPortfolio && member && (
          <li className="px-6 py-4">
            <Link to="/community/portfolio" className="flex items-center gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-parchment text-water-deep">
                <FeatureIcon name="award" size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block t-h4">{t("db.career")}</span>
                <span className="block font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("db.careerLine")}</span>
              </span>
            </Link>
          </li>
        )}
      </ul>
    </section>
  );
}
