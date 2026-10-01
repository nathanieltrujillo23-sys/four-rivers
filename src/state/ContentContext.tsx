import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CourseRepository } from "../data/repository";
import type { Lesson, ModuleSection } from "../types";
import { INTRODUCTION, LESSONS } from "../content/lessons";

function overrideId(section: ModuleSection, moduleIndex: number): string {
  return `${section}:${moduleIndex}`;
}

function defaultLesson(section: ModuleSection, moduleIndex: number): Lesson {
  const lessons = section === "introduction" ? INTRODUCTION.lessons : LESSONS[section].lessons;
  return lessons[moduleIndex];
}

interface ContentContextValue {
  /** The live lesson for a module: the admin override if one exists, else the static default. */
  getLesson: (section: ModuleSection, moduleIndex: number) => Lesson;
  isOverridden: (section: ModuleSection, moduleIndex: number) => boolean;
  saveOverride: (section: ModuleSection, moduleIndex: number, lesson: Lesson) => Promise<void>;
  resetOverride: (section: ModuleSection, moduleIndex: number) => Promise<void>;
}

const ContentContext = createContext<ContentContextValue | null>(null);

/**
 * Admin-editable lesson text, layered over the static defaults in
 * src/content/lessons/. Loaded once per session; a missing table (migration
 * not yet run) just means every module falls back to its default, same
 * no-crash pattern as the journal.
 */
export function ContentProvider({
  children,
  repository,
}: {
  children: ReactNode;
  repository: CourseRepository;
}) {
  const [overrides, setOverrides] = useState<Map<string, Lesson>>(new Map());

  useEffect(() => {
    let cancelled = false;
    repository
      .listContentOverrides()
      .then((rows) => {
        if (cancelled) return;
        setOverrides(new Map(rows.map((r) => [r.id, r.content as Lesson])));
      })
      .catch(() => {
        /* overrides just won't apply this session */
      });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  const getLesson = useCallback(
    (section: ModuleSection, moduleIndex: number) =>
      overrides.get(overrideId(section, moduleIndex)) ?? defaultLesson(section, moduleIndex),
    [overrides]
  );

  const isOverridden = useCallback(
    (section: ModuleSection, moduleIndex: number) => overrides.has(overrideId(section, moduleIndex)),
    [overrides]
  );

  const saveOverride = useCallback(
    async (section: ModuleSection, moduleIndex: number, lesson: Lesson) => {
      const id = overrideId(section, moduleIndex);
      await repository.setContentOverride(id, lesson);
      setOverrides((prev) => new Map(prev).set(id, lesson));
    },
    [repository]
  );

  const resetOverride = useCallback(
    async (section: ModuleSection, moduleIndex: number) => {
      const id = overrideId(section, moduleIndex);
      await repository.deleteContentOverride(id);
      setOverrides((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    },
    [repository]
  );

  const value = useMemo(
    () => ({ getLesson, isOverridden, saveOverride, resetOverride }),
    [getLesson, isOverridden, saveOverride, resetOverride]
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent(): ContentContextValue {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error("useContent must be used within a ContentProvider");
  return ctx;
}
