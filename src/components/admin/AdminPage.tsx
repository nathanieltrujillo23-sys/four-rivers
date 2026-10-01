import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useContent } from "../../state/ContentContext";
import { canManageContent, viewerFromRole } from "../../lib/access";
import { INTRODUCTION, LESSONS } from "../../content/lessons";
import type { ModuleSection } from "../../types";
import { RIVERS } from "../../theme/theme";
import { Card, CardBody } from "../ui/Card";
import { Button } from "../ui/Button";
import { ContentOverrideEditor } from "../course/ContentOverrideEditor";

function ModuleRow({ section, moduleIndex, accent }: { section: ModuleSection; moduleIndex: number; accent: string }) {
  const { getLesson, isOverridden } = useContent();
  const lesson = getLesson(section, moduleIndex);
  const overridden = isOverridden(section, moduleIndex);
  const [open, setOpen] = useState(false);

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
          {!open && (
            <Button variant="ghost" onClick={() => setOpen(true)}>
              Edit
            </Button>
          )}
        </div>
        {open && (
          <ContentOverrideEditor section={section} moduleIndex={moduleIndex} onDone={() => setOpen(false)} />
        )}
      </CardBody>
    </Card>
  );
}

/**
 * An index of every module for an admin to jump into and edit — the same
 * editor also appears as a pencil button directly on each module's lesson
 * page (ContentEditPencil) for editing in context. This page is useful as an
 * overview/search surface even though it's no longer the only way in.
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
          Edit any module's title, body, or scripture below — or look for the pencil button on the
          module's own page. Changes apply immediately for every learner. Quiz and exam questions
          aren't editable here yet.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-ink">Introduction</h2>
        {INTRODUCTION.lessons.map((_, i) => (
          <ModuleRow key={i} section="introduction" moduleIndex={i} accent="#c9a24b" />
        ))}
      </section>

      {RIVERS.map((r) => (
        <section key={r.number} className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-ink">
            River {r.number}: {LESSONS[r.number].title}
          </h2>
          {LESSONS[r.number].lessons.map((_, i) => (
            <ModuleRow key={i} section={r.number} moduleIndex={i} accent={r.accent} />
          ))}
        </section>
      ))}
    </div>
  );
}
