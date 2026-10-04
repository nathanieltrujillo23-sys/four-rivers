import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CourseRepository } from "../data/repository";
import type { Lesson, ModuleSection, RiverContent, RiverNumber } from "../types";
import { useLang } from "../i18n/LanguageContext";
import type { IntroductionContent } from "../content/lessons";
import { localizedIntroduction, localizedRiver } from "../content/localized";

function overrideId(section: ModuleSection, moduleIndex: number): string {
  return `${section}:${moduleIndex}`;
}

function defaultLesson(section: ModuleSection, moduleIndex: number, lang: "en" | "es"): Lesson {
  const lessons =
    section === "introduction" ? localizedIntroduction(lang).lessons : localizedRiver(section, lang).lessons;
  return lessons[moduleIndex];
}

interface ContentContextValue {
  /**
   * The live lesson for a module: the admin override if one exists (English
   * only, since overrides are written in English), else the static default in
   * the chosen language.
   */
  getLesson: (section: ModuleSection, moduleIndex: number) => Lesson;
  /** A river in the chosen language, with any admin edits applied to its lessons. */
  getRiver: (n: RiverNumber) => RiverContent;
  getIntroduction: () => IntroductionContent;
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
  const { lang } = useLang();

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
      (lang === "en" ? overrides.get(overrideId(section, moduleIndex)) : undefined) ??
      defaultLesson(section, moduleIndex, lang),
    [overrides, lang],
  );

  const getRiver = useCallback(
    (n: RiverNumber): RiverContent => {
      const base = localizedRiver(n, lang);
      return { ...base, lessons: base.lessons.map((_, i) => getLesson(n, i)) };
    },
    [lang, getLesson],
  );

  const getIntroduction = useCallback((): IntroductionContent => {
    const base = localizedIntroduction(lang);
    return { ...base, lessons: base.lessons.map((_, i) => getLesson("introduction", i)) };
  }, [lang, getLesson]);

  const isOverridden = useCallback(
    (section: ModuleSection, moduleIndex: number) => overrides.has(overrideId(section, moduleIndex)),
    [overrides],
  );

  const saveOverride = useCallback(
    async (section: ModuleSection, moduleIndex: number, lesson: Lesson) => {
      const id = overrideId(section, moduleIndex);
      await repository.setContentOverride(id, lesson);
      setOverrides((prev) => new Map(prev).set(id, lesson));
    },
    [repository],
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
    [repository],
  );

  const value = useMemo(
    () => ({ getLesson, getRiver, getIntroduction, isOverridden, saveOverride, resetOverride }),
    [getLesson, getRiver, getIntroduction, isOverridden, saveOverride, resetOverride],
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent(): ContentContextValue {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error("useContent must be used within a ContentProvider");
  return ctx;
}
