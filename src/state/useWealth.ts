import { useCallback, useEffect, useRef, useState } from "react";
import type { CourseRepository } from "../data/repository";
import { wealthCacheKey } from "../lib/offline";
import type { WealthWorkspace } from "../types";

export type WealthSave = "idle" | "saving" | "saved" | "error";

/**
 * A person's own Wealth Tools workspace: the wealth plan and each toolkit tool's numbers.
 *
 * Everything is read from, and written to, the signed-in person's own row (the database refuses anything else), and a
 * copy is kept on this device under their user id so a refresh or a dropped connection never loses typing. Changes are
 * saved a moment after the last keystroke, and any waiting change is sent when the page is left.
 */
export function useWealth(repository: CourseRepository, userId: string) {
  const [workspace, setWorkspace] = useState<WealthWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<WealthSave>("idle");
  const latest = useRef<WealthWorkspace>({ plan: null, tools: {} });
  const timers = useRef(new Map<string, number>());
  const waiting = useRef(new Map<string, () => Promise<void>>());
  const repo = useRef(repository);
  repo.current = repository;

  const remember = useCallback(() => {
    try {
      localStorage.setItem(wealthCacheKey(userId), JSON.stringify(latest.current));
    } catch {
      /* private window or full: the copy is simply not kept on this device */
    }
  }, [userId]);

  const run = useCallback(async (key: string) => {
    const job = waiting.current.get(key);
    if (!job) return;
    waiting.current.delete(key);
    timers.current.delete(key);
    setSave("saving");
    try {
      await job();
      setSave((s) => (waiting.current.size > 0 ? s : "saved"));
    } catch {
      setSave("error");
    }
  }, []);

  const queue = useCallback(
    (key: string, job: () => Promise<void>, delay: number) => {
      waiting.current.set(key, job);
      const old = timers.current.get(key);
      if (old) window.clearTimeout(old);
      timers.current.set(key, window.setTimeout(() => void run(key), delay));
    },
    [run],
  );

  useEffect(() => {
    let cancelled = false;
    repository
      .loadWealth()
      .then((w) => {
        if (cancelled) return;
        latest.current = w;
        setWorkspace(w);
        remember();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Offline, or the request failed: fall back to this person's own copy on this device, if there is one.
        try {
          const raw = JSON.parse(localStorage.getItem(wealthCacheKey(userId)) ?? "null") as WealthWorkspace | null;
          if (raw && typeof raw === "object") {
            latest.current = { plan: raw.plan ?? null, tools: raw.tools ?? {} };
            setWorkspace(latest.current);
            setSave("error");
            return;
          }
        } catch {
          /* fall through to the error */
        }
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
    // loaded once per person
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Anything still waiting is sent when the person leaves the page or the tab goes to the background.
  useEffect(() => {
    const flush = () => {
      for (const [key, t] of timers.current) {
        window.clearTimeout(t);
        void run(key);
      }
    };
    const hidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      flush();
    };
  }, [run]);

  const savePlan = useCallback(
    (plan: unknown) => {
      latest.current = { ...latest.current, plan };
      remember();
      setWorkspace((w) => (w ? { ...w, plan } : w));
      queue("plan", () => repo.current.saveWealthPlan(plan), 1200);
    },
    [queue, remember],
  );

  const saveTool = useCallback(
    (id: string, state: unknown) => {
      const tools = { ...latest.current.tools };
      if (state == null) delete tools[id];
      else tools[id] = state;
      latest.current = { ...latest.current, tools };
      remember();
      setWorkspace((w) => (w ? { ...w, tools } : w));
      queue(`tool:${id}`, () => repo.current.saveWealthTool(id, state), 900);
    },
    [queue, remember],
  );

  return { workspace, error, save, savePlan, saveTool };
}
