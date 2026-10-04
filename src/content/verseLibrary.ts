import type { ScriptureRef } from "../types";
import { VERSE } from "./scripture";

/**
 * Every verse a group leader can share as the verse of the day. It is the
 * course's own library, so only the four approved translations (KJV, NIV, NLT,
 * ESV) can ever reach a group. In Spanish the matching Spanish version is
 * shown (see content/scriptureEs.ts).
 */
const TRANSLATION_ORDER = ["KJV", "NIV", "NLT", "ESV"];

export const VERSE_LIBRARY: ScriptureRef[] = Object.values(VERSE).sort((a, b) => {
  const byRef = a.reference.localeCompare(b.reference, "en", { numeric: true });
  return byRef || TRANSLATION_ORDER.indexOf(a.translation) - TRANSLATION_ORDER.indexOf(b.translation);
});

export function findLibraryVerse(reference: string, translation: string): ScriptureRef | undefined {
  return VERSE_LIBRARY.find((v) => v.reference === reference && v.translation === translation);
}
