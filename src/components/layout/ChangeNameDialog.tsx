import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useCourse } from "../../state/CourseContext";
import { useT } from "../../i18n/LanguageContext";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { Field, TextInput } from "../ui/Field";

/**
 * Edits the two names a learner has: the preferred name that greets them
 * around the app, and the full name printed on their certificate.
 */
export function ChangeNameDialog({ onClose }: { onClose: () => void }) {
  const { snapshot, updateNames } = useCourse();
  const t = useT();
  const [displayName, setDisplayName] = useState(snapshot?.profile.displayName ?? "");
  const [fullName, setFullName] = useState(snapshot?.profile.fullName ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await updateNames({ displayName, fullName });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("name.saveFail");
      setError(/full_name/.test(message) ? t("name.needsMigration") : message);
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("name.title")}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <Card className="w-full max-w-md">
        <CardBody>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-ink">{t("name.title")}</h2>
            <Field label={t("name.preferred")} hint={t("name.preferredHint")}>
              <TextInput
                autoFocus
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("name.preferredPh")}
              />
            </Field>
            <Field label={t("name.full")} hint={t("name.fullHint")}>
              <TextInput
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("name.fullPh")}
              />
            </Field>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 font-[family-name:var(--font-ui)] text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? t("name.saving") : t("common.save")}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>,
    document.body,
  );
}
