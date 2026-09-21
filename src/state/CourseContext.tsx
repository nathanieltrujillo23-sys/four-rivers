import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  CourseSnapshot,
  GivingEntry,
  IncomeStream,
  InvestmentEntry,
  RiverNumber,
  SavingsContribution,
  SavingsGoal,
} from "../types";
import type { CourseRepository } from "../data/repository";
import { uid } from "../utils/id";
import { reconcileCompletedAt } from "./progress";

interface CourseContextValue {
  repository: CourseRepository;
  snapshot: CourseSnapshot | null;
  loading: boolean;
  loadError: string | null;
  reload: () => void;

  markLessonViewed: (river: RiverNumber) => Promise<void>;

  addIncomeStream: (input: Omit<IncomeStream, "id" | "createdAt">) => Promise<void>;
  deleteIncomeStream: (id: string) => Promise<void>;

  addSavingsGoal: (input: Omit<SavingsGoal, "id" | "createdAt">) => Promise<SavingsGoal>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  addSavingsContribution: (
    input: Omit<SavingsContribution, "id" | "createdAt">
  ) => Promise<void>;
  deleteSavingsContribution: (id: string) => Promise<void>;

  addInvestmentEntry: (input: Omit<InvestmentEntry, "id" | "createdAt">) => Promise<void>;
  deleteInvestmentEntry: (id: string) => Promise<void>;

  addGivingEntry: (input: Omit<GivingEntry, "id" | "createdAt">) => Promise<void>;
  deleteGivingEntry: (id: string) => Promise<void>;
}

const CourseContext = createContext<CourseContextValue | null>(null);

export function CourseProvider({
  children,
  repository,
}: {
  children: ReactNode;
  repository: CourseRepository;
}) {
  const [snapshot, setSnapshot] = useState<CourseSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Always-current snapshot for use inside async callbacks without stale closures.
  const snapshotRef = useRef<CourseSnapshot | null>(null);
  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);
  const lessonViewInFlight = useRef<Set<RiverNumber>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    repository
      .loadAll()
      .then((s) => {
        if (!cancelled) setSnapshot(s);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repository, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  /**
   * Apply a locally-computed next snapshot, then reconcile the affected river's
   * completed_at (both locally and in the DB). Every mutation goes through here
   * so the "both conditions met" completion rule is enforced in exactly one place.
   */
  const applyAndReconcile = useCallback(
    async (next: CourseSnapshot, river: RiverNumber) => {
      const reconciled = reconcileCompletedAt(next, river);
      let finalSnapshot = next;
      if (reconciled) {
        finalSnapshot = {
          ...next,
          progress: upsertProgress(next.progress, river, reconciled.completedAt),
        };
      }
      setSnapshot(finalSnapshot);
      snapshotRef.current = finalSnapshot;
      if (reconciled) {
        await repository.setRiverCompletedAt(river, reconciled.completedAt);
      }
    },
    [repository]
  );

  const markLessonViewed: CourseContextValue["markLessonViewed"] = useCallback(
    async (river) => {
      const current = snapshotRef.current;
      if (!current) return;
      const existing = current.progress.find((p) => p.riverNumber === river);
      if (existing?.lessonViewedAt) return;
      // Effects can fire twice (StrictMode, snapshot updates) before the first
      // write lands; only let one call per river through at a time.
      if (lessonViewInFlight.current.has(river)) return;
      lessonViewInFlight.current.add(river);
      const now = new Date().toISOString();
      const next: CourseSnapshot = {
        ...current,
        progress: setLessonViewed(current.progress, river, now),
      };
      try {
        await repository.markLessonViewed(river);
        await applyAndReconcile(next, river);
      } finally {
        lessonViewInFlight.current.delete(river);
      }
    },
    [repository, applyAndReconcile]
  );

  /* ---- River 1: income streams ---- */
  const addIncomeStream: CourseContextValue["addIncomeStream"] = useCallback(
    async (input) => {
      const current = snapshotRef.current;
      if (!current) return;
      const row: IncomeStream = { id: uid(), createdAt: new Date().toISOString(), ...input };
      await repository.insertIncomeStream(row);
      await applyAndReconcile(
        { ...current, incomeStreams: [row, ...current.incomeStreams] },
        1
      );
    },
    [repository, applyAndReconcile]
  );
  const deleteIncomeStream: CourseContextValue["deleteIncomeStream"] = useCallback(
    async (id) => {
      const current = snapshotRef.current;
      if (!current) return;
      await repository.deleteIncomeStream(id);
      await applyAndReconcile(
        { ...current, incomeStreams: current.incomeStreams.filter((s) => s.id !== id) },
        1
      );
    },
    [repository, applyAndReconcile]
  );

  /* ---- River 2: savings ---- */
  const addSavingsGoal: CourseContextValue["addSavingsGoal"] = useCallback(
    async (input) => {
      const current = snapshotRef.current;
      const row: SavingsGoal = { id: uid(), createdAt: new Date().toISOString(), ...input };
      await repository.insertSavingsGoal(row);
      if (current) {
        // A goal alone is not a tracker "entry" (contributions are) — still
        // reconcile in case status logic changes.
        await applyAndReconcile(
          { ...current, savingsGoals: [row, ...current.savingsGoals] },
          2
        );
      }
      return row;
    },
    [repository, applyAndReconcile]
  );
  const deleteSavingsGoal: CourseContextValue["deleteSavingsGoal"] = useCallback(
    async (id) => {
      const current = snapshotRef.current;
      if (!current) return;
      await repository.deleteSavingsGoal(id);
      await applyAndReconcile(
        {
          ...current,
          savingsGoals: current.savingsGoals.filter((g) => g.id !== id),
          // DB cascades the delete; mirror it locally.
          savingsContributions: current.savingsContributions.filter((c) => c.goalId !== id),
        },
        2
      );
    },
    [repository, applyAndReconcile]
  );
  const addSavingsContribution: CourseContextValue["addSavingsContribution"] = useCallback(
    async (input) => {
      const current = snapshotRef.current;
      if (!current) return;
      const row: SavingsContribution = {
        id: uid(),
        createdAt: new Date().toISOString(),
        ...input,
      };
      await repository.insertSavingsContribution(row);
      await applyAndReconcile(
        { ...current, savingsContributions: [row, ...current.savingsContributions] },
        2
      );
    },
    [repository, applyAndReconcile]
  );
  const deleteSavingsContribution: CourseContextValue["deleteSavingsContribution"] =
    useCallback(
      async (id) => {
        const current = snapshotRef.current;
        if (!current) return;
        await repository.deleteSavingsContribution(id);
        await applyAndReconcile(
          {
            ...current,
            savingsContributions: current.savingsContributions.filter((c) => c.id !== id),
          },
          2
        );
      },
      [repository, applyAndReconcile]
    );

  /* ---- River 3: investing ---- */
  const addInvestmentEntry: CourseContextValue["addInvestmentEntry"] = useCallback(
    async (input) => {
      const current = snapshotRef.current;
      if (!current) return;
      const row: InvestmentEntry = { id: uid(), createdAt: new Date().toISOString(), ...input };
      await repository.insertInvestmentEntry(row);
      await applyAndReconcile(
        { ...current, investmentEntries: [row, ...current.investmentEntries] },
        3
      );
    },
    [repository, applyAndReconcile]
  );
  const deleteInvestmentEntry: CourseContextValue["deleteInvestmentEntry"] = useCallback(
    async (id) => {
      const current = snapshotRef.current;
      if (!current) return;
      await repository.deleteInvestmentEntry(id);
      await applyAndReconcile(
        { ...current, investmentEntries: current.investmentEntries.filter((e) => e.id !== id) },
        3
      );
    },
    [repository, applyAndReconcile]
  );

  /* ---- River 4: giving ---- */
  const addGivingEntry: CourseContextValue["addGivingEntry"] = useCallback(
    async (input) => {
      const current = snapshotRef.current;
      if (!current) return;
      const row: GivingEntry = { id: uid(), createdAt: new Date().toISOString(), ...input };
      await repository.insertGivingEntry(row);
      await applyAndReconcile(
        { ...current, givingEntries: [row, ...current.givingEntries] },
        4
      );
    },
    [repository, applyAndReconcile]
  );
  const deleteGivingEntry: CourseContextValue["deleteGivingEntry"] = useCallback(
    async (id) => {
      const current = snapshotRef.current;
      if (!current) return;
      await repository.deleteGivingEntry(id);
      await applyAndReconcile(
        { ...current, givingEntries: current.givingEntries.filter((e) => e.id !== id) },
        4
      );
    },
    [repository, applyAndReconcile]
  );

  const value = useMemo<CourseContextValue>(
    () => ({
      repository,
      snapshot,
      loading,
      loadError,
      reload,
      markLessonViewed,
      addIncomeStream,
      deleteIncomeStream,
      addSavingsGoal,
      deleteSavingsGoal,
      addSavingsContribution,
      deleteSavingsContribution,
      addInvestmentEntry,
      deleteInvestmentEntry,
      addGivingEntry,
      deleteGivingEntry,
    }),
    [
      repository,
      snapshot,
      loading,
      loadError,
      reload,
      markLessonViewed,
      addIncomeStream,
      deleteIncomeStream,
      addSavingsGoal,
      deleteSavingsGoal,
      addSavingsContribution,
      deleteSavingsContribution,
      addInvestmentEntry,
      deleteInvestmentEntry,
      addGivingEntry,
      deleteGivingEntry,
    ]
  );

  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
}

/* ---- small pure helpers for progress array updates ---- */

function setLessonViewed(
  progress: CourseSnapshot["progress"],
  river: RiverNumber,
  at: string
) {
  const existing = progress.find((p) => p.riverNumber === river);
  if (existing) {
    return progress.map((p) =>
      p.riverNumber === river ? { ...p, lessonViewedAt: p.lessonViewedAt ?? at } : p
    );
  }
  return [...progress, { riverNumber: river, lessonViewedAt: at, completedAt: null }];
}

function upsertProgress(
  progress: CourseSnapshot["progress"],
  river: RiverNumber,
  completedAt: string | null
) {
  const existing = progress.find((p) => p.riverNumber === river);
  if (existing) {
    return progress.map((p) => (p.riverNumber === river ? { ...p, completedAt } : p));
  }
  return [...progress, { riverNumber: river, lessonViewedAt: null, completedAt }];
}

export function useCourse(): CourseContextValue {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error("useCourse must be used within a CourseProvider");
  return ctx;
}

/** Non-throwing variant for chrome (e.g. the header) that renders outside the course area. */
export function useOptionalCourse(): CourseContextValue | null {
  return useContext(CourseContext);
}
