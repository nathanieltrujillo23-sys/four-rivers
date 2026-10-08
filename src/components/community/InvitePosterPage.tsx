import { Link, useParams } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useLang } from "../../i18n/LanguageContext";
import { useGroups } from "../../state/useGroups";
import { BrandMark } from "../ui/BrandMark";
import { Button } from "../ui/Button";
import { PageSkeleton } from "../ui/Skeleton";
import { QrCode } from "../ui/QrCode";

/**
 * A print-ready invitation for a group, for a church bulletin board, a campus flyer wall, or a table card: the group's
 * name, a large QR code that opens the invite link, and the 4-digit code with three plain steps. Prints on one page.
 */
export function InvitePosterPage() {
  const { groupId } = useParams();
  const { repository } = useCourse();
  const { t } = useLang();
  const { groups, loading } = useGroups(repository);
  const group = groups.find((g) => g.id === groupId);

  if (loading && !group) return <PageSkeleton label={t("common.loading")} cards={1} />;
  if (!group) {
    return (
      <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
        {t("poster.missing")} <Link to="/community" className="underline">{t("nav.community")}</Link>
      </p>
    );
  }
  const site = window.location.origin;
  const link = `${site}/community?code=${group.joinCode}`;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex w-full max-w-[8.5in] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to={`/community/${group.id}/leader`} className="font-[family-name:var(--font-ui)] text-sm text-ink-soft hover:text-ink">
          {t("poster.back")}
        </Link>
        <Button onClick={() => window.print()}>{t("poster.print")}</Button>
      </div>

      <section
        aria-label={t("poster.aria", { name: group.name })}
        className="flex min-h-[10in] w-full max-w-[8.5in] flex-col items-center justify-between gap-8 rounded-2xl border-[3px] bg-white px-10 py-12 text-center text-[#2c2620] print:min-h-0 print:max-w-none print:rounded-none print:border-0 print:py-6"
        style={{ borderColor: "#c9a24b" }}
      >
        <div className="flex items-center gap-3">
          <BrandMark size={44} />
          <span className="font-[family-name:var(--font-display)] text-3xl font-semibold">4 Rivers</span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <p className="font-[family-name:var(--font-ui)] text-sm font-semibold uppercase tracking-[0.25em] text-[#8a5a24]">
            {t("poster.eyebrow")}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-5xl font-semibold leading-tight">{group.name}</h1>
          <p className="max-w-md font-[family-name:var(--font-ui)] text-lg text-[#5c5347]">{t("poster.sub")}</p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="rounded-2xl border border-[#e6dcc7] bg-white p-3">
            <QrCode value={link} size={280} color="#274b6d" label={t("poster.qrAria")} />
          </div>
          <p className="font-[family-name:var(--font-ui)] text-base font-semibold">{t("poster.scan")}</p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="font-[family-name:var(--font-ui)] text-sm text-[#5c5347]">{t("poster.orGo", { site: site.replace(/^https?:\/\//, "") })}</p>
          <p className="font-mono text-6xl font-semibold tracking-[0.35em] text-[#274b6d]">{group.joinCode}</p>
        </div>

        <ol className="grid w-full max-w-xl gap-3 text-left font-[family-name:var(--font-ui)] text-sm text-[#5c5347] sm:grid-cols-3">
          {(["poster.s1", "poster.s2", "poster.s3"] as const).map((k, i) => (
            <li key={k} className="flex gap-2">
              <span className="font-semibold text-[#274b6d]">{i + 1}.</span>
              {t(k)}
            </li>
          ))}
        </ol>
        <p className="font-[family-name:var(--font-ui)] text-xs text-[#5c5347]">{t("poster.free")}</p>
      </section>
    </div>
  );
}
