import { useState } from "react";
import { useCourse } from "../../state/CourseContext";
import { canManageContent, viewerFromRole } from "../../lib/access";
import type { ModuleSection } from "../../types";
import { PencilIcon } from "../ui/RiverIcons";
import { ContentOverrideEditor } from "./ContentOverrideEditor";

/**
 * A small pencil button pinned to the bottom-right corner of a lesson's text,
 * visible only to admins (see lib/access.canManageContent) — lets content be
 * edited right where it's being read, instead of only from /admin. Renders
 * nothing for anyone else, so this is safe to drop onto any lesson page.
 */
export function ContentEditPencil({ section, moduleIndex }: { section: ModuleSection; moduleIndex: number }) {
  const { snapshot } = useCourse();
  const [open, setOpen] = useState(false);

  const viewer = viewerFromRole(snapshot?.profile.role);
  if (!canManageContent(viewer)) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      {!open && (
        <button
          type="button"
          aria-label="Edit this text"
          title="Edit this text (admin)"
          onClick={() => setOpen(true)}
          className="pointer-events-auto absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink-soft shadow-sm transition-colors hover:text-ink"
        >
          <PencilIcon size={15} color="currentColor" />
        </button>
      )}
      {open && (
        <div className="pointer-events-auto absolute bottom-0 right-0 w-full max-w-md rounded-xl border border-line bg-surface p-4 shadow-md">
          <p className="mb-2 font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Editing this module (admin)
          </p>
          <ContentOverrideEditor section={section} moduleIndex={moduleIndex} onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
