import type { Lang } from "./LanguageContext";

/** Spanish names for every Bible book the course quotes (verse text itself stays in its approved English translation). */
const ES_BOOKS: Record<string, string> = {
  "1 Chronicles": "1 Crónicas",
  "1 Corinthians": "1 Corintios",
  "1 Peter": "1 Pedro",
  "1 Timothy": "1 Timoteo",
  "2 Corinthians": "2 Corintios",
  "2 Thessalonians": "2 Tesalonicenses",
  "2 Timothy": "2 Timoteo",
  Acts: "Hechos",
  Colossians: "Colosenses",
  Daniel: "Daniel",
  Deuteronomy: "Deuteronomio",
  Ecclesiastes: "Eclesiastés",
  Ephesians: "Efesios",
  Exodus: "Éxodo",
  Galatians: "Gálatas",
  Genesis: "Génesis",
  Habakkuk: "Habacuc",
  Haggai: "Hageo",
  Hebrews: "Hebreos",
  James: "Santiago",
  Joshua: "Josué",
  Leviticus: "Levítico",
  Luke: "Lucas",
  Malachi: "Malaquías",
  Mark: "Marcos",
  Matthew: "Mateo",
  Philippians: "Filipenses",
  Proverbs: "Proverbios",
  Psalm: "Salmo",
  Romans: "Romanos",
  Zechariah: "Zacarías",
};

/** "Genesis 2:10" becomes "Génesis 2:10" in Spanish; English references pass through unchanged. */
export function localizeReference(reference: string, lang: Lang): string {
  if (lang !== "es") return reference;
  const match = reference.match(/^((?:[1-3] )?[A-Za-z]+(?: [A-Za-z]+)*?)(\s+\d.*)$/);
  if (!match) return reference;
  const book = ES_BOOKS[match[1]];
  return book ? `${book}${match[2]}` : reference;
}
