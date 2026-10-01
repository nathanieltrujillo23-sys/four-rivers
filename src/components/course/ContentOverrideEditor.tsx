import { useState } from "react";
import { useContent } from "../../state/ContentContext";
import type { Lesson, ModuleSection } from "../../types";
import { Button } from "../ui/Button";
import { TextArea } from "../ui/Field";

function isLesson(value: unknown): value is Lesson {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.title === "string" &&
    Array.isArray(v.body) &&
    v.body.every((p) => typeof p === "string") &&
    Array.isArray(v.scriptureRefs)
  );
}

/**
 * The actual save/reset editing UI for one module's content override, shared
 * between the admin page's module list and the inline "edit this" pencil on
 * the lesson content itself. A raw JSON textarea rather than a per-field
 * form: lesson shapes vary (paragraph count, verse count), and JSON handles
 * that uniformly without a bespoke form per field.
 */
export function ContentOverrideEditor({
  section,
  moduleIndex,
  onDone,
}: {
  section: ModuleSection;
  moduleIndex: number;
  onDone?: () => void;
}) {
  const { getLesson, isOverridden, saveOverride, resetOverride } = useContent();
  const [draft, setDraft] = useState(() => JSON.stringify(getLesson(section, moduleIndex), null, 2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft);
    } catch {
      setError("That's not valid JSON. Check for a missing comma or quote.");
      return;
    }
    if (!isLesson(parsed)) {
      setError('Needs a "title" (string), "body" (array of strings), and "scriptureRefs" (array).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveOverride(section, moduleIndex, parsed);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    setBusy(true);
    try {
      await resetOverride(section, moduleIndex);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reset.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <TextArea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={14}
        autoFocus
        className="font-mono text-xs"
      />
      {error && <p className="font-[family-name:var(--font-ui)] text-xs text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void handleSave()} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
        {isOverridden(section, moduleIndex) && (
          <Button variant="ghost" onClick={() => void handleReset()} disabled={busy}>
            Reset to default
          </Button>
        )}
        <Button variant="ghost" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
