import { useCallback, useEffect, useRef, useState } from "react";
import type { CourseRepository } from "../data/repository";
import { trackCacheKey } from "../lib/offline";
import type { ToolTrack } from "../types";
import type { WealthSave } from "./useWealth";

/**
 * A person's own workspace for Investment Banking Tools or Consulting Tools: loaded once, kept on this device too, and saved a moment
 * after the last change (and when the tab is hidden or closed).
 */
export function useTrackWorkspace<T>(repository: CourseRepository, userId: string, kind: ToolTrack, normalize: (raw: unknown) => T, empty: () => T) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<WealthSave>("idle");
  const latest = useRef<T>(empty());
  const timer = useRef<number | undefined>(undefined);
  const dirty = useRef(false);
  const repo = useRef(repository);
  repo.current = repository;
  const norm = useRef(normalize);
  norm.current = normalize;

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    if (!dirty.current) return;
    dirty.current = false;
    setSave("saving");
    try {
      await repo.current.saveTrackWorkspace(kind, latest.current);
      setSave("saved");
    } catch {
      setSave("error");
    }
  }, [kind]);

  useEffect(() => {
    let cancelled = false;
    repository
      .loadTrackWorkspace(kind)
      .then((raw) => {
        if (cancelled) return;
        latest.current = norm.current(raw);
        setData(latest.current);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        try {
          const cached = JSON.parse(localStorage.getItem(trackCacheKey(kind, userId)) ?? "null");
          if (cached) {
            latest.current = norm.current(cached);
            setData(latest.current);
            setSave("error");
            return;
          }
        } catch {
          /* fall through */
        }
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
    // loaded once per person and tool
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, kind]);

  useEffect(() => {
    const hidden = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      void flush();
    };
  }, [flush]);

  /** Changes the document: the function gets the current one and returns the next. */
  const update = useCallback(
    (fn: (d: T) => T) => {
      latest.current = fn(latest.current);
      setData(latest.current);
      dirty.current = true;
      try {
        localStorage.setItem(trackCacheKey(kind, userId), JSON.stringify(latest.current));
      } catch {
        /* not kept on this device */
      }
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), 1200);
    },
    [flush, kind, userId],
  );

  return { data, error, save, update };
}
