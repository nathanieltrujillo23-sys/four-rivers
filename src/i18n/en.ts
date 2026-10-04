import { nav } from "./strings/nav";
import { tools } from "./strings/tools";
import { glossary } from "./strings/glossary";
import { course } from "./strings/course";
import { community } from "./strings/community";
import { profile } from "./strings/profile";
import { marketing } from "./strings/marketing";
import { pages } from "./strings/pages";
import { quiz } from "./strings/quiz";
import { account } from "./strings/account";
import { calc } from "./strings/calc";

/** English is the source of truth: its keys define every string the app can translate. */
export const en = {
  ...nav.en,
  ...tools.en,
  ...glossary.en,
  ...course.en,
  ...community.en,
  ...profile.en,
  ...marketing.en,
  ...pages.en,
  ...quiz.en,
  ...account.en,
  ...calc.en,
};

export type StringKey = keyof typeof en;
