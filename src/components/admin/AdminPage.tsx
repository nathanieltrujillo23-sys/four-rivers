import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useContent } from "../../state/ContentContext";
import { canManageContent, viewerFromRole } from "../../lib/access";
import { INTRODUCTION, LESSONS } from "../../content/lessons";
import type { Lesson, ModuleSection } from "../../types";
import { RIVERS } from "../../theme/theme";
import { Card, CardBody } from "../ui/Card";
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

function ModuleEditor({ section, moduleIndex, accent }: { section: ModuleSection; moduleIndex: number; accent: string }) {
  const { getLesson, isOverridden, saveOverride, resetOverride } = useContent();
  const lesson = getLesson(section, moduleIndex);
  const overridden = isOverridden(section, moduleIndex);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setDraft(JSON.stringify(lesson, null, 2));
    setError(null);
    setOpen(true);
  }

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
      setOpen(false);
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
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reset.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card accent={accent}>
      <CardBody className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">{lesson.title}</span>
            {overridden && (
              <span className="rounded-full bg-gold/20 px-2 py-0.5 font-[family-name:var(--font-ui)] text-[10px] font-medium uppercase tracking-wide text-clay">
                Edited
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {!open && (
              <Button variant="ghost" onClick={startEditing}>
                Edit
              </Button>
            )}
            {overridden && !open && (
              <Button variant="ghost" onClick={() => void handleReset()} disabled={busy}>
                Reset to default
              </Button>
            )}
          </div>
        </div>

        {open && (
          <div className="flex flex-col gap-2">
            <TextArea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={14}
              className="font-mono text-xs"
            />
            {error && <p className="font-[family-name:var(--font-ui)] text-xs text-red-700">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={() => void handleSave()} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/**
 * Lets an admin edit any module's text (title, body paragraphs, scripture)
 * straight from the browser, without a code deploy. Edits are stored as
 * overrides (see ContentContext / supabase/007_content_overrides.sql) layered
 * over the static defaults in src/content/lessons/ — "Reset to default"
 * just removes the override.
 *
 * The editor is a raw JSON textarea rather than a per-field form: lesson
 * shapes vary (number of paragraphs, number of verses), and a JSON editor
 * handles all of that uniformly without needing a bespoke form per field.
 */
export function AdminPage() {
  const { snapshot, loading } = useCourse();
  if (loading && !snapshot)
    return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading…</p>;
  if (!snapshot) return null;

  const viewer = viewerFromRole(snapshot.profile.role);
  if (!canManageContent(viewer)) return <Navigate to="/course" replace />;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold text-ink">Content administration</h1>
        <p className="mt-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          Edit any module's title, body, or scripture below. Changes apply immediately for every learner.
          Quiz and exam questions aren't editable here yet.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-ink">Introduction</h2>
        {INTRODUCTION.lessons.map((_, i) => (
          <ModuleEditor key={i} section="introduction" moduleIndex={i} accent="#c9a24b" />
        ))}
      </section>

      {RIVERS.map((r) => (
        <section key={r.number} className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-ink">
            River {r.number}: {LESSONS[r.number].title}
          </h2>
          {LESSONS[r.number].lessons.map((_, i) => (
            <ModuleEditor key={i} section={r.number} moduleIndex={i} accent={r.accent} />
          ))}
        </section>
      ))}
    </div>
  );
}
