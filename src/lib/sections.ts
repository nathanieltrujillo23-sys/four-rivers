import { INTRODUCTION, LESSONS } from "../content/lessons";
import type { ModuleSection, RiverNumber } from "../types";

/** Every section that has modules, in course order. */
export const SECTIONS: ModuleSection[] = ["introduction", 1, 2, 3, 4];

export function moduleCount(section: ModuleSection): number {
  return section === "introduction" ? INTRODUCTION.lessons.length : LESSONS[section].lessons.length;
}

/** Reads a route or select value ("introduction", "1" to "4") back into a section. */
export function parseSection(value: string | undefined | null): ModuleSection | null {
  if (value === "introduction") return "introduction";
  if (value === "1" || value === "2" || value === "3" || value === "4") return Number(value) as RiverNumber;
  return null;
}

export function lessonPath(section: ModuleSection, moduleIndex: number): string {
  return section === "introduction"
    ? `/course/introduction/module/${moduleIndex + 1}`
    : `/course/river/${section}/module/${moduleIndex + 1}`;
}

export function guidePath(section: ModuleSection, moduleIndex: number): string {
  return `/groups/guide/${section}/${moduleIndex + 1}`;
}
