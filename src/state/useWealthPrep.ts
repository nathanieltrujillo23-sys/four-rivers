import { useCallback, useEffect, useRef, useState } from "react";
import type { CourseRepository } from "../data/repository";
import { wealthPrepCacheKey } from "../lib/offline";
import { emptyPrep, normalizePrep, type PrepData } from "../lib/wealthPrep";
import type { WealthSave } from "./useWealth";

/** A person's own career-prep document: loaded once, kept on this device too, and saved a moment after the last change. */
export function useWealthPrep(repository: CourseRepository, userId: string) {
  const [data, setData] = useState<PrepData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<WealthSave>("idle");
  const latest = useRef<PrepData>(emptyPrep());
  const timer = useRef<number | undefined>(undefined);
  const dirty = useRef(false);
  const repo = useRef(repository);
  repo.current = repository;

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    if (!dirty.current) return;
    dirty.current = false;
    setSave("saving");
    try {
      await repo.current.saveWealthPrep(latest.current);
      setSave("saved");
    } catch {
      setSave("error");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    repository
      .loadWealthPrep()
      .then((raw) => {
        if (cancelled) return;
        latest.current = normalizePrep(raw);
        setData(latest.current);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        try {
          const cached = JSON.parse(localStorage.getItem(wealthPrepCacheKey(userId)) ?? "null");
          if (cached) {
            latest.current = normalizePrep(cached);
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
    // loaded once per person
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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
    (fn: (d: PrepData) => PrepData) => {
      latest.current = fn(latest.current);
      setData(latest.current);
      dirty.current = true;
      try {
        localStorage.setItem(wealthPrepCacheKey(userId), JSON.stringify(latest.current));
      } catch {
        /* not kept on this device */
      }
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), 1200);
    },
    [flush, userId],
  );

  return { data, error, save, update };
}
