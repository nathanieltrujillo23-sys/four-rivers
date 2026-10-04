import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../state/AuthContext";
import { useLang } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";
import { useCourse } from "../../state/CourseContext";
import { certificateName } from "../../lib/names";
import { courseCompletedDate, hasFullAccess, isCourseComplete } from "../../state/progress";
import { RIVERS, THEME } from "../../theme/theme";
import { formatDate } from "../../utils/format";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { LoadError } from "../ui/LoadError";
import { BrandMark } from "../ui/BrandMark";
import { LockIcon } from "../ui/RiverIcons";
import { QrCode } from "../ui/QrCode";

/**
 * A printable certificate, reachable once the whole course is complete —
 * from the course-complete celebration, and from the dashboard afterward.
 * "Download" is just the browser's own print-to-PDF, so this needs no
 * canvas/image library: the page is simply designed to look right either
 * way, with the chrome and buttons hidden under `print:hidden`.
 */
export function CertificatePage() {
  const { user } = useAuth();
  const { t } = useLang();
  const { snapshot, loading, loadError, reload } = useCourse();

  if (loading && !snapshot)
    return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("common.loading")}</p>;
  if (loadError) return <LoadError message={loadError} onRetry={reload} />;
  if (!snapshot) return null;
  const fullAccess = hasFullAccess(snapshot);
  if (!fullAccess && !isCourseComplete(snapshot)) return <Navigate to="/course" replace />;

  if (!fullAccess && !snapshot.profile.examPassedAt) {
    return (
      <Card className="mx-auto max-w-md">
        <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-parchment-deep">
            <LockIcon color="var(--color-ink-soft)" size={22} />
          </span>
          <h1 className="text-xl font-semibold text-ink">{t("cert.locked")}</h1>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("cert.lockedText")}</p>
          <Link to="/course/exam">
            <Button>{t("cert.takeExam")}</Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  const name = certificateName(snapshot.profile, user?.email);
  const completedAt = courseCompletedDate(snapshot.progress);
  const verifyUrl = `${window.location.origin}/verify/${snapshot.profile.userId}`;

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        data-tour="certificate"
        className="w-full max-w-2xl rounded-2xl border-[3px] bg-parchment p-10 text-center shadow-sm print:shadow-none"
        style={{ borderColor: THEME.palette.gold }}
      >
        <div className="mx-auto flex justify-center gap-1.5" aria-hidden="true">
          {THEME.motif.flow.map((color) => (
            <span key={color} className="h-1.5 w-10 rounded-full" style={{ backgroundColor: color }} />
          ))}
        </div>

        <p className="mt-6 font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.3em] text-ink-soft">
          {t("cert.title")}
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-lg text-ink-soft">
          {t("cert.certifies")}
        </h1>
        <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink">{name}</p>
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-lg text-ink-soft">
          {t("cert.completed")}
        </h2>
        <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-ink">
          {t("cert.course")}
        </p>
        <p className="mx-auto mt-3 max-w-md font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          {t("cert.working", {
            rivers: RIVERS.slice(0, -1)
              .map((r) => t(`river.${r.number}.title` as StringKey))
              .join(", "),
            last: t(`river.${RIVERS[RIVERS.length - 1].number}.title` as StringKey),
          })}
        </p>

        {completedAt && (
          <p className="mt-6 font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.15em] text-ink-soft">
            {formatDate(completedAt)}
          </p>
        )}

        <div className="mx-auto mt-6 flex max-w-xs items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1" style={{ backgroundColor: THEME.palette.line }} />
          <BrandMark size={22} />
          <span className="h-px flex-1" style={{ backgroundColor: THEME.palette.line }} />
        </div>

        <div className="mt-5 flex flex-col items-center gap-1.5">
          <QrCode value={verifyUrl} size={84} />
          <p className="font-[family-name:var(--font-ui)] text-[10px] uppercase tracking-[0.1em] text-ink-soft">
            {t("cert.scan")}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Button onClick={() => window.print()}>{t("cert.print")}</Button>
        <Button variant="secondary" onClick={() => void navigator.clipboard.writeText(verifyUrl)}>
          {t("cert.copyLink")}
        </Button>
        <Link to="/dashboard">
          <Button variant="ghost">{t("cert.backDash")}</Button>
        </Link>
      </div>
    </div>
  );
}
