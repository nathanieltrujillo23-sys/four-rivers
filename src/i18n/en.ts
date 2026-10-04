import { nav } from "./strings/nav";
import { tools } from "./strings/tools";

/** English is the source of truth: its keys define every string the app can translate. */
export const en = {
  ...nav.en,
  ...tools.en,
};

export type StringKey = keyof typeof en;
