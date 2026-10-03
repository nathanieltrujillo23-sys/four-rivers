import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useCourse } from "../../state/CourseContext";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { Field, TextInput } from "../ui/Field";

/**
 * Edits the two names a learner has: the preferred name that greets them
 * around the app, and the full name printed on their certificate.
 */
export function ChangeNameDialog({ onClose }: { onClose: () => void }) {
  const { snapshot, updateNames } = useCourse();
  const [displayName, setDisplayName] = useState(
    snapshot?.profile.displayName ?? "",
  );
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
      const message =
        err instanceof Error ? err.message : "Couldn't save your name.";
      setError(
        /full_name/.test(message)
          ? "Saving a full name needs the latest database update (migration 009) to be run first."
          : message,
      );
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Change name"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <Card className="w-full max-w-md">
        <CardBody>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-ink">Change name</h2>
            <Field
              label="Preferred name"
              hint="How we greet you around the app."
            >
              <TextInput
                autoFocus
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Nate"
              />
            </Field>
            <Field
              label="Full name"
              hint="Printed on your certificate. Leave blank to use your preferred name."
            >
              <TextInput
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Nathaniel Joseph Trujillo"
              />
            </Field>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 font-[family-name:var(--font-ui)] text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>,
    document.body,
  );
}
