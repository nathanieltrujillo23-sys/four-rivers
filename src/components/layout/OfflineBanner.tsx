import { Link } from "react-router-dom";
import { useOnline } from "../../lib/offline";
import { useLang } from "../../i18n/LanguageContext";

/** A thin notice while the device has no connection, pointing to what still works. */
export function OfflineBanner({ signedIn }: { signedIn: boolean }) {
  const online = useOnline();
  const { t } = useLang();
  if (online) return null;
  return (
    <div
      role="status"
      className="border-b border-line bg-gold/20 px-4 py-2 text-center font-[family-name:var(--font-ui)] text-sm text-ink print:hidden"
    >
      {t("off.banner")}{" "}
      {signedIn && (
        <Link to="/offline" className="font-medium underline">
          {t("off.link")}
        </Link>
      )}
    </div>
  );
}
