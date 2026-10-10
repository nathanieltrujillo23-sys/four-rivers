import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useLang } from "../../i18n/LanguageContext";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { QrCode } from "../ui/QrCode";
import { CopyButton } from "./CopyButton";

/** What a leader shows or shares to bring people in: the QR code, the 4-digit code, and ways to pass them on. */
export function InviteDialog({
  groupId,
  groupName,
  code,
  link,
  onClose,
}: {
  groupId: string;
  groupName: string;
  code: string;
  link: string;
  onClose: () => void;
}) {
  const { t } = useLang();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("invite.title", { name: groupName })}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <Card className="my-auto w-full max-w-md !bg-surface">
        <CardBody className="flex flex-col items-center gap-4 text-center">
          <h2 className="t-h3">{t("invite.title", { name: groupName })}</h2>
          {/* White tile so the code scans in dark mode too. */}
          <div className="pop-in rounded-xl bg-white p-2 shadow-sm [transform-origin:center]">
            <QrCode value={link} size={220} color="#274b6d" label={t("ld.qrAria")} />
          </div>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("ld.qrHint")}</p>
          <div className="w-full border-t border-line pt-4">
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              {t("invite.orEnter", { site: window.location.host })}
            </p>
            <p
              className="mt-1 font-mono text-5xl font-semibold tracking-[0.35em] text-ink"
              aria-label={t("invite.codeLabel")}
            >
              {code}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <CopyButton text={code} label={t("ld.copyCode")} />
            <CopyButton text={link} label={t("ld.copyLink")} />
            <Link to={`/community/${groupId}/poster`}>
              <Button variant="secondary">{t("poster.link")}</Button>
            </Link>
          </div>
          <Button ref={closeRef} variant="ghost" onClick={onClose}>
            {t("invite.close")}
          </Button>
        </CardBody>
      </Card>
    </div>,
    document.body,
  );
}
