import { useCallback, useEffect, useRef, useState } from "react";
import type { CourseRepository } from "../data/repository";
import { wealthCacheKey } from "../lib/offline";
import type { WealthClient } from "../types";

export type WealthSave = "idle" | "saving" | "saved" | "error";

const nameOf = (plan: unknown): string => ((plan as { client?: { name?: unknown } } | null)?.client?.name as string | undefined)?.trim() || "New client";

/**
 * A person's own client plans in Wealth Tools: for each client, the wealth plan and each toolkit tool's numbers.
 *
 * Everything is read from, and written to, the signed-in person's own rows (the database refuses anything else), and a
 * copy is kept on this device under their user id so a refresh or a dropped connection never loses typing. Changes are
 * saved a moment after the last keystroke, and any waiting change is sent when the page is left.
 */
export function useWealthClients(repository: CourseRepository, userId: string) {
  const [clients, setClients] = useState<WealthClient[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<WealthSave>("idle");
  const latest = useRef<WealthClient[]>([]);
  const timers = useRef(new Map<string, number>());
  const waiting = useRef(new Map<string, () => Promise<void>>());
  const repo = useRef(repository);
  repo.current = repository;

  const commit = useCallback(
    (next: WealthClient[]) => {
      latest.current = next;
      setClients(next);
      try {
        localStorage.setItem(wealthCacheKey(userId), JSON.stringify({ clients: next }));
      } catch {
        /* private window or full: the copy is simply not kept on this device */
      }
    },
    [userId],
  );

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
      .listWealthClients()
      .then((list) => {
        if (cancelled) return;
        commit(list);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Offline, or the request failed: fall back to this person's own copy on this device, if there is one.
        try {
          const raw = JSON.parse(localStorage.getItem(wealthCacheKey(userId)) ?? "null") as { clients?: WealthClient[] } | null;
          if (raw && Array.isArray(raw.clients)) {
            latest.current = raw.clients;
            setClients(raw.clients);
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

  const create = useCallback(
    async (plan: unknown | null): Promise<WealthClient> => {
      const made = await repo.current.createWealthClient(plan);
      commit([made, ...latest.current]);
      return made;
    },
    [commit],
  );

  const remove = useCallback(
    async (id: string) => {
      await repo.current.deleteWealthClient(id);
      commit(latest.current.filter((c) => c.id !== id));
    },
    [commit],
  );

  const savePlan = useCallback(
    (id: string, plan: unknown) => {
      commit(latest.current.map((c) => (c.id === id ? { ...c, plan, name: nameOf(plan), updatedAt: new Date().toISOString() } : c)));
      queue(`plan:${id}`, () => repo.current.saveWealthClientPlan(id, plan), 1200);
    },
    [commit, queue],
  );

  const saveTool = useCallback(
    (id: string, toolId: string, state: unknown) => {
      commit(
        latest.current.map((c) => {
          if (c.id !== id) return c;
          const tools = { ...c.tools };
          if (state == null) delete tools[toolId];
          else tools[toolId] = state;
          return { ...c, tools, updatedAt: new Date().toISOString() };
        }),
      );
      queue(`tool:${id}:${toolId}`, () => repo.current.saveWealthClientTool(id, toolId, state), 900);
    },
    [commit, queue],
  );

  return { clients, error, save, create, remove, savePlan, saveTool };
}
