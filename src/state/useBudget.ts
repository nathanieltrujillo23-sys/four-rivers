import { useCallback, useEffect, useRef, useState } from "react";
import { emptyBudget, normalizeBudget, type Budget } from "../utils/budget";

interface Saved {
  name: string;
  budget: Budget;
}

function storageKey(userKey: string): string {
  return `four-rivers:budget:v1:${userKey}`;
}

function load(userKey: string): Saved | null {
  try {
    const raw = localStorage.getItem(storageKey(userKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { name?: unknown; budget?: unknown };
    return {
      name: typeof parsed.name === "string" ? parsed.name.slice(0, 80) : "",
      budget: normalizeBudget(parsed.budget),
    };
  } catch {
    return null;
  }
}

/**
 * The learner's monthly plan, saved per browser and per account (the demo
 * account has its own slot). Only the itemized lines and the name are kept;
 * every total is derived from them when it's shown.
 */
export function useBudget(userKey: string, defaultName: string) {
  const [budget, setBudgetState] = useState<Budget>(() => load(userKey)?.budget ?? emptyBudget());
  const [name, setNameState] = useState<string>(() => load(userKey)?.name ?? defaultName);
  const nameTouched = useRef(load(userKey) !== null);

  // If the saved name is empty, follow the profile name until the learner edits it.
  useEffect(() => {
    if (!nameTouched.current && defaultName) setNameState(defaultName);
  }, [defaultName]);

  const persist = useCallback(
    (next: Saved) => {
      try {
        localStorage.setItem(storageKey(userKey), JSON.stringify(next));
      } catch {
        /* storage unavailable: the plan just won't survive a reload */
      }
    },
    [userKey],
  );

  const setBudget = useCallback(
    (next: Budget) => {
      setBudgetState(next);
      persist({ name, budget: next });
    },
    [name, persist],
  );

  const setName = useCallback(
    (next: string) => {
      nameTouched.current = true;
      setNameState(next);
      persist({ name: next, budget });
    },
    [budget, persist],
  );

  const reset = useCallback(() => {
    const fresh = emptyBudget();
    setBudgetState(fresh);
    persist({ name, budget: fresh });
  }, [name, persist]);

  return { budget, setBudget, name, setName, reset };
}
