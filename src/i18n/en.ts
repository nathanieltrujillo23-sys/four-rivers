import { nav } from "./strings/nav";
import { tools } from "./strings/tools";
import { glossary } from "./strings/glossary";
import { course } from "./strings/course";
import { groups } from "./strings/groups";

/** English is the source of truth: its keys define every string the app can translate. */
export const en = {
  ...nav.en,
  ...tools.en,
  ...glossary.en,
  ...course.en,
  ...groups.en,
};

export type StringKey = keyof typeof en;
