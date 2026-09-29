import { useCallback, useState } from "react";
import type { RiverNumber } from "../types";

/**
 * Tracks which modules of a river have been opened, so the progress bar can
 * fill in as you go rather than jumping straight to "done" after one visit.
 *
 * This is intentionally client-side only (localStorage), not a Supabase
 * table: it's a visual/motivational aid, not the completion record. The
 * actual "is this river complete" rule (lesson viewed + a tracker entry
 * logged) is unchanged and still lives in state/progress.ts. Because it's
 * per-browser, opening all of a river's modules on one device and then
 * switching devices will show 0% there again — the progress bar resets, but
 * nothing about course completion does.
 */
function storageKey(river: RiverNumber): string {
  return `four-rivers:progress:river-${river}`;
}

function loadViewed(river: RiverNumber): Set<number> {
  try {
    const raw = localStorage.getItem(storageKey(river));
    const arr = raw ? (JSON.parse(raw) as number[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveViewed(river: RiverNumber, viewed: Set<number>) {
  try {
    localStorage.setItem(storageKey(river), JSON.stringify([...viewed]));
  } catch {
    /* storage unavailable — progress just won't persist across visits */
  }
}

export function useModuleProgress(river: RiverNumber, totalModules: number) {
  const [viewed, setViewed] = useState<Set<number>>(() => loadViewed(river));

  const markViewed = useCallback(
    (moduleIndex: number) => {
      setViewed((prev) => {
        if (prev.has(moduleIndex)) return prev;
        const next = new Set(prev);
        next.add(moduleIndex);
        saveViewed(river, next);
        return next;
      });
    },
    [river]
  );

  const isViewed = useCallback((moduleIndex: number) => viewed.has(moduleIndex), [viewed]);
  const viewedCount = Math.min(viewed.size, totalModules);
  const fraction = totalModules > 0 ? viewedCount / totalModules : 0;

  return { viewedCount, totalModules, fraction, isViewed, markViewed };
}
