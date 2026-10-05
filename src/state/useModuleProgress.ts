import { useCallback, useEffect, useRef } from "react";
import type { ModuleSection as Section } from "../types";
import { isModuleViewed, viewedModuleCount } from "./progress";
import { useCourse } from "./CourseContext";

/**
 * "Modules read" progress is server-backed (see supabase/legacy/006_module_views.sql)
 * so it survives a new browser/device instead of resetting — it used to be
 * localStorage-only. This hook now just reads/writes through CourseContext's
 * snapshot; `markViewed` is idempotent, same as the repository call beneath it.
 */

function legacyStorageKey(section: Section): string {
  return `four-rivers:progress:river-${section}`;
}

/** One-time read of the old localStorage data, for migrating it server-side
 * on first load after this shipped. Never written to anymore. */
function loadLegacyViewed(section: Section): number[] {
  try {
    const raw = localStorage.getItem(legacyStorageKey(section));
    const arr = raw ? (JSON.parse(raw) as number[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function useModuleProgress(section: Section, totalModules: number) {
  const { snapshot, markModuleViewed } = useCourse();
  const migrated = useRef(false);

  // One-time catch-up: anything read before this shipped (tracked only in
  // this browser's localStorage) gets pushed to the server the first time
  // this section is opened again, so existing progress isn't lost.
  useEffect(() => {
    if (migrated.current || !snapshot) return;
    migrated.current = true;
    const legacy = loadLegacyViewed(section);
    for (const i of legacy) {
      if (!isModuleViewed(snapshot, section, i)) void markModuleViewed(section, i);
    }
  }, [snapshot, section, markModuleViewed]);

  const markViewed = useCallback(
    (moduleIndex: number) => {
      void markModuleViewed(section, moduleIndex);
    },
    [markModuleViewed, section]
  );

  if (!snapshot) {
    return { viewedCount: 0, totalModules, fraction: 0, isViewed: () => false, markViewed };
  }

  const viewedCount = Math.min(viewedModuleCount(snapshot, section), totalModules);
  const fraction = totalModules > 0 ? viewedCount / totalModules : 0;
  const isViewed = (moduleIndex: number) => isModuleViewed(snapshot, section, moduleIndex);

  return { viewedCount, totalModules, fraction, isViewed, markViewed };
}
