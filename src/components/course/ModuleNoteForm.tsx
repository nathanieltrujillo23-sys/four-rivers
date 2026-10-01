import { useState } from "react";
import { Link } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import type { RiverNumber } from "../../types";
import { todayYmd } from "../../utils/format";
import { uid } from "../../utils/id";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { TextArea } from "../ui/Field";

/**
 * A lightweight "jot a note" widget on a module page, tied straight into the
 * journal (same table, same JournalPage list) instead of being its own
 * separate feature. Collapsed by default so it doesn't compete with the
 * lesson content; writes directly through the repository since this widget
 * doesn't need to show the list of existing entries, just add to it.
 */
export function ModuleNoteForm({
  riverNumber,
  moduleTitle,
  accent = "#c9a24b",
}: {
  riverNumber: RiverNumber | null;
  moduleTitle: string;
  accent?: string;
}) {
  const { repository } = useCourse();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      await repository.insertJournalEntry({
        id: uid(),
        title: moduleTitle,
        body: body.trim(),
        entryDate: todayYmd(),
        riverNumber,
        createdAt: now,
        updatedAt: now,
      });
      setBody("");
      setSaved(true);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the note.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={() => { setOpen(true); setSaved(false); }}>
          + Jot a note on this module
        </Button>
        {saved && (
          <span className="font-[family-name:var(--font-ui)] text-xs text-olive">
            Saved to your journal. <Link to="/journal" className="underline">View journal</Link>
          </span>
        )}
      </div>
    );
  }

  return (
    <Card accent={accent}>
      <CardBody className="flex flex-col gap-3">
        <p className="font-[family-name:var(--font-ui)] text-sm font-medium text-ink">
          Note on "{moduleTitle}"
        </p>
        <TextArea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What stood out, or how does this apply to you?"
          rows={3}
          autoFocus
        />
        {error && (
          <p className="font-[family-name:var(--font-ui)] text-xs text-red-700">{error}</p>
        )}
        <div className="flex gap-2">
          <Button onClick={() => void handleSave()} disabled={busy || !body.trim()}>
            {busy ? "Saving…" : "Save to journal"}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
