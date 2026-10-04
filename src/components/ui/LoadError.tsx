import { Button } from "./Button";
import { Card, CardBody } from "./Card";
import { useT } from "../../i18n/LanguageContext";

/** A friendlier stand-in for a bare error message: what went wrong, plus a
 * one-click way to try the load again, instead of a dead end. */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useT();
  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink">{t("error.title")}</p>
        <p className="max-w-sm font-[family-name:var(--font-ui)] text-xs text-ink-soft">{message}</p>
        <Button variant="secondary" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      </CardBody>
    </Card>
  );
}
