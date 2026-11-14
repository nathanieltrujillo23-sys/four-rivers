import { useState, type FormEvent } from "react";
import { useLang } from "../../i18n/LanguageContext";
import { Button } from "../ui/Button";
import { Field, TextInput } from "../ui/Field";

/**
 * The small "ask an admin" form behind every request button in Community (leader status and each tool set): a line about
 * what is being asked for, an optional note, Send and Cancel. It keeps its own sending state and error.
 */
export function AskForm({
  hint,
  label,
  placeholder,
  onSend,
  onCancel,
}: {
  hint: string;
  label: string;
  placeholder: string;
  onSend: (note: string) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useLang();
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await onSend(note.trim());
    } catch (err) {
      setError(t("community.error", { message: err instanceof Error ? err.message : String(err) }));
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-line bg-parchment/60 p-4">
      <p className="font-[family-name:var(--font-ui)] text-xs leading-relaxed text-ink-soft">{hint}</p>
      <Field label={label}>
        <TextInput value={note} maxLength={300} placeholder={placeholder} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={sending}>
          {sending ? t("leader.sending") : t("leader.send")}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("leader.cancel")}
        </Button>
      </div>
      {error && (
        <p className="font-[family-name:var(--font-ui)] text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
