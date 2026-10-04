import type { StringKey } from "./en";
import { nav } from "./strings/nav";
import { tools } from "./strings/tools";
import { glossary } from "./strings/glossary";
import { course } from "./strings/course";
import { groups } from "./strings/groups";

export const es: Record<StringKey, string> = {
  ...nav.es,
  ...tools.es,
  ...glossary.es,
  ...course.es,
  ...groups.es,
};
