import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useLang } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";
import { EXAM_QUESTION_COUNT } from "../../content/exam";
import { RIVERS, THEME, readable } from "../../theme/theme";
import { formatDate } from "../../utils/format";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { BrandMark } from "../ui/BrandMark";

interface VerificationRecord {
  displayName: string | null;
  completedAt: string | null;
  examPassedAt: string;
  examBestScore: number;
}

type LoadState = "loading" | "found" | "not-found" | "error";

/**
 * Public, unauthenticated verification page — the link printed on every
 * certificate (see CertificatePage). Reads only the narrow
 * `certificate_verifications` table (not `profiles`), so anyone with the
 * link can confirm a certificate is genuine without needing an account or
 * exposing anything else about the learner. Deliberately styled close to the
 * certificate itself and printable the same way, so sharing this link
 * doubles as a way to produce a verified copy.
 */
export function VerifyCertificate() {
  const { userId } = useParams();
  const { t } = useLang();
  const [state, setState] = useState<LoadState>("loading");
  const [record, setRecord] = useState<VerificationRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!userId) {
        setState("not-found");
        return;
      }
      const { data, error } = await supabase
        .from("certificate_verifications")
        .select("display_name, completed_at, exam_passed_at, exam_best_score")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setState("error");
        return;
      }
      if (!data) {
        setState("not-found");
        return;
      }
      setRecord({
        displayName: data.display_name as string | null,
        completedAt: data.completed_at as string | null,
        examPassedAt: data.exam_passed_at as string,
        examBestScore: Number(data.exam_best_score),
      });
      setState("found");
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (state === "loading") {
    return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("verify.checking")}</p>;
  }

  if (state === "error" || state === "not-found") {
    return (
      <Card className="mx-auto max-w-md">
        <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
          <h1 className="t-h3">
            {state === "error" ? t("verify.errorTitle") : t("verify.notFoundTitle")}
          </h1>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            {state === "error" ? t("verify.errorText") : t("verify.notFoundText")}
          </p>
          <Link to="/">
            <Button variant="secondary">{t("auth.backOverview")}</Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  const r = record!;
  const name = r.displayName || t("verify.anon");
  const shareUrl = window.location.href;
  const shareText = t("verify.shareText", { name });
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className="w-full max-w-2xl rounded-2xl border-[3px] bg-parchment p-10 text-center shadow-sm print:shadow-none"
        style={{ borderColor: THEME.palette.gold }}
      >
        <div className="mx-auto flex justify-center gap-1.5" aria-hidden="true">
          {THEME.motif.flow.map((color) => (
            <span key={color} className="h-1.5 w-10 rounded-full" style={{ backgroundColor: color }} />
          ))}
        </div>

        <p
          className="mt-6 font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-[0.3em]"
          style={{ color: readable(THEME.palette.gold) }}
        >
          {t("verify.verified")}
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-lg text-ink-soft">
          {t("cert.certifies")}
        </h1>
        <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold text-ink">{name}</p>
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-lg text-ink-soft">
          {t("cert.completed")}
        </h2>
        <p className="mt-2 font-[family-name:var(--font-display)] t-h2">
          {t("cert.course")}
        </p>
        <p className="mx-auto mt-3 max-w-md font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          {t("verify.working", {
            rivers: RIVERS.slice(0, -1)
              .map((river) => t(`river.${river.number}.title` as StringKey))
              .join(", "),
            last: t(`river.${RIVERS[RIVERS.length - 1].number}.title` as StringKey),
            score: r.examBestScore,
            total: EXAM_QUESTION_COUNT,
          })}
        </p>

        {r.completedAt && (
          <p className="mt-6 font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.15em] text-ink-soft">
            {formatDate(r.completedAt)}
          </p>
        )}

        <div className="mx-auto mt-6 flex max-w-xs items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1" style={{ backgroundColor: THEME.palette.line }} />
          <BrandMark size={22} />
          <span className="h-px flex-1" style={{ backgroundColor: THEME.palette.line }} />
        </div>

        <p className="mt-4 font-[family-name:var(--font-ui)] text-[11px] text-ink-soft">
          {t("verify.independent")}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 print:hidden">
        <Button onClick={() => window.print()}>{t("cert.print")}</Button>
        <a href={linkedInShareUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="secondary">{t("verify.linkedin")}</Button>
        </a>
        <a href={xShareUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="secondary">{t("verify.x")}</Button>
        </a>
        <Link to="/">
          <Button variant="ghost">{t("auth.backOverview")}</Button>
        </Link>
      </div>
    </div>
  );
}
