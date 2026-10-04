import type { StringKey } from "./en";
import { nav } from "./strings/nav";
import { tools } from "./strings/tools";
import { glossary } from "./strings/glossary";
import { course } from "./strings/course";
import { community } from "./strings/community";
import { marketing } from "./strings/marketing";
import { pages } from "./strings/pages";
import { quiz } from "./strings/quiz";
import { account } from "./strings/account";
import { calc } from "./strings/calc";

export const es: Record<StringKey, string> = {
  ...nav.es,
  ...tools.es,
  ...glossary.es,
  ...course.es,
  ...community.es,
  ...marketing.es,
  ...pages.es,
  ...quiz.es,
  ...account.es,
  ...calc.es,
};
