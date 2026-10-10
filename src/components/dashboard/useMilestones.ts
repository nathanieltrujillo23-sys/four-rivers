import { useEffect, useRef, useState } from "react";
import type { StringKey } from "../../i18n/en";
import type { CourseSnapshot } from "../../types";
import { haptic } from "../../lib/motion";

interface Milestone {
  id: string;
  key: StringKey;
  reached: (s: CourseSnapshot) => boolean;
}

const goalFraction = (s: CourseSnapshot, goalId: string, target: number) =>
  target > 0 ? s.savingsContributions.filter((c) => c.goalId === goalId).reduce((n, c) => n + c.amount, 0) / target : 0;

export const MILESTONES: Milestone[] = [
  { id: "income1", key: "milestone.income1", reached: (s) => s.incomeStreams.length >= 1 },
  { id: "save1", key: "milestone.save1", reached: (s) => s.savingsContributions.length >= 1 },
  { id: "goal50", key: "milestone.goal50", reached: (s) => s.savingsGoals.some((g) => goalFraction(s, g.id, g.targetAmount) >= 0.5) },
  { id: "goal100", key: "milestone.goal100", reached: (s) => s.savingsGoals.some((g) => goalFraction(s, g.id, g.targetAmount) >= 1) },
  { id: "invest1", key: "milestone.invest1", reached: (s) => s.investmentEntries.length >= 1 },
  { id: "give1", key: "milestone.give1", reached: (s) => s.givingEntries.length >= 1 },
  { id: "give100", key: "milestone.give100", reached: (s) => s.givingEntries.reduce((n, e) => n + e.amount, 0) >= 100 },
  { id: "give1000", key: "milestone.give1000", reached: (s) => s.givingEntries.reduce((n, e) => n + e.amount, 0) >= 1000 },
];

/**
 * Watches the trackers for small milestones (a first entry, a goal halfway, $100 given) and returns the one to celebrate
 * right now, if any. What was already reached when this first runs is quietly recorded, never celebrated, so only new
 * progress earns a moment. Which milestones were seen is kept per person in this browser.
 */
export function useMilestones(snapshot: CourseSnapshot | null): StringKey | null {
  const [shown, setShown] = useState<StringKey | null>(null);
  const userId = snapshot?.profile.userId ?? "";
  const first = useRef(true);

  useEffect(() => {
    if (!snapshot) return;
    const storageKey = `four-rivers:milestones:${userId}`;
    let seen: string[] | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      seen = raw ? (JSON.parse(raw) as string[]) : null;
    } catch {
      seen = null;
    }
    const reached = MILESTONES.filter((m) => m.reached(snapshot));
    const known = new Set(seen ?? []);
    const fresh = reached.filter((m) => !known.has(m.id));
    const quiet = seen === null || first.current;
    first.current = false;
    if (fresh.length === 0 && seen !== null) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(reached.map((m) => m.id)));
    } catch {
      /* the milestone may be celebrated again next visit */
    }
    if (quiet || fresh.length === 0) return;
    setShown(fresh[0].key);
    haptic([16, 30, 16]);
    const timer = window.setTimeout(() => setShown(null), 4500);
    return () => window.clearTimeout(timer);
  }, [snapshot, userId]);

  return shown;
}
