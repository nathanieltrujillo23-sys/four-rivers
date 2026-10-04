import type { Lang } from "./LanguageContext";
import { BIBLE_BOOKS } from "../lib/bibleBooks";

/** English reference name to Spanish name, for all 66 books (verse text itself stays in its approved translation). */
const ES_BOOKS: Record<string, string> = Object.fromEntries(BIBLE_BOOKS.map((b) => [b.ref, b.es]));

/** "Genesis 2:10" becomes "Génesis 2:10" in Spanish; English references pass through unchanged. */
export function localizeReference(reference: string, lang: Lang): string {
  if (lang !== "es") return reference;
  const match = reference.match(/^((?:[1-3] )?[A-Za-z]+(?: [A-Za-z]+)*?)(\s+\d.*)$/);
  if (!match) return reference;
  const book = ES_BOOKS[match[1]];
  return book ? `${book}${match[2]}` : reference;
}

/** A stored passage list ("Luke 3:1-20; Luke 4") shown in the reader's language. */
export function localizePassages(passages: string, lang: Lang): string {
  return passages
    .split("; ")
    .map((p) => localizeReference(p, lang))
    .join("; ");
}
