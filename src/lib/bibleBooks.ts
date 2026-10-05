/**
 * The 66 books of the Bible, in order, with the names people actually type:
 * English and Spanish names, common abbreviations, and the short code the
 * NLT service uses. `ref` is how a book is written in a reference ("Psalm
 * 23:1", matching the course's own verse references).
 */
export interface BibleBook {
  ref: string;
  es: string;
  /** Extra spellings, abbreviations, and service codes (case, spaces, and accents are ignored). */
  aliases: string[];
  /** The short code the NLT service expects. */
  nlt: string;
  /** The three-character USFM code API.Bible uses ("JHN"). */
  usfm: string;
}

export const BIBLE_BOOKS: BibleBook[] = [
  { ref: "Genesis", es: "Génesis", aliases: ["gen", "gn"], nlt: "Gen", usfm: "GEN" },
  { ref: "Exodus", es: "Éxodo", aliases: ["exo", "ex", "exod"], nlt: "Exod", usfm: "EXO" },
  { ref: "Leviticus", es: "Levítico", aliases: ["lev", "lv"], nlt: "Lev", usfm: "LEV" },
  { ref: "Numbers", es: "Números", aliases: ["num", "nm", "nu"], nlt: "Num", usfm: "NUM" },
  { ref: "Deuteronomy", es: "Deuteronomio", aliases: ["deut", "dt"], nlt: "Deut", usfm: "DEU" },
  { ref: "Joshua", es: "Josué", aliases: ["josh", "jos"], nlt: "Josh", usfm: "JOS" },
  { ref: "Judges", es: "Jueces", aliases: ["judg", "jdg"], nlt: "Judg", usfm: "JDG" },
  { ref: "Ruth", es: "Rut", aliases: ["ru"], nlt: "Ruth", usfm: "RUT" },
  { ref: "1 Samuel", es: "1 Samuel", aliases: ["1sam", "1sa"], nlt: "1Sam", usfm: "1SA" },
  { ref: "2 Samuel", es: "2 Samuel", aliases: ["2sam", "2sa"], nlt: "2Sam", usfm: "2SA" },
  { ref: "1 Kings", es: "1 Reyes", aliases: ["1kgs", "1ki"], nlt: "1Kgs", usfm: "1KI" },
  { ref: "2 Kings", es: "2 Reyes", aliases: ["2kgs", "2ki"], nlt: "2Kgs", usfm: "2KI" },
  { ref: "1 Chronicles", es: "1 Crónicas", aliases: ["1chr", "1ch"], nlt: "1Chr", usfm: "1CH" },
  { ref: "2 Chronicles", es: "2 Crónicas", aliases: ["2chr", "2ch"], nlt: "2Chr", usfm: "2CH" },
  { ref: "Ezra", es: "Esdras", aliases: ["ezr"], nlt: "Ezra", usfm: "EZR" },
  { ref: "Nehemiah", es: "Nehemías", aliases: ["neh"], nlt: "Neh", usfm: "NEH" },
  { ref: "Esther", es: "Ester", aliases: ["esth", "est"], nlt: "Esth", usfm: "EST" },
  { ref: "Job", es: "Job", aliases: [], nlt: "Job", usfm: "JOB" },
  { ref: "Psalm", es: "Salmo", aliases: ["psalms", "ps", "psa", "salmos"], nlt: "Ps", usfm: "PSA" },
  { ref: "Proverbs", es: "Proverbios", aliases: ["prov", "pr", "prv"], nlt: "Prov", usfm: "PRO" },
  { ref: "Ecclesiastes", es: "Eclesiastés", aliases: ["eccl", "ecc", "eccles"], nlt: "Eccl", usfm: "ECC" },
  {
    ref: "Song of Solomon",
    es: "Cantares",
    aliases: ["song", "sos", "song of songs", "cantar de los cantares", "cantar"],
    nlt: "Song", usfm: "SNG",
  },
  { ref: "Isaiah", es: "Isaías", aliases: ["isa"], nlt: "Isa", usfm: "ISA" },
  { ref: "Jeremiah", es: "Jeremías", aliases: ["jer"], nlt: "Jer", usfm: "JER" },
  { ref: "Lamentations", es: "Lamentaciones", aliases: ["lam"], nlt: "Lam", usfm: "LAM" },
  { ref: "Ezekiel", es: "Ezequiel", aliases: ["ezek", "eze"], nlt: "Ezek", usfm: "EZK" },
  { ref: "Daniel", es: "Daniel", aliases: ["dan"], nlt: "Dan", usfm: "DAN" },
  { ref: "Hosea", es: "Oseas", aliases: ["hos"], nlt: "Hos", usfm: "HOS" },
  { ref: "Joel", es: "Joel", aliases: [], nlt: "Joel", usfm: "JOL" },
  { ref: "Amos", es: "Amós", aliases: [], nlt: "Amos", usfm: "AMO" },
  { ref: "Obadiah", es: "Abdías", aliases: ["obad", "ob"], nlt: "Obad", usfm: "OBA" },
  { ref: "Jonah", es: "Jonás", aliases: ["jon"], nlt: "Jonah", usfm: "JON" },
  { ref: "Micah", es: "Miqueas", aliases: ["mic"], nlt: "Mic", usfm: "MIC" },
  { ref: "Nahum", es: "Nahúm", aliases: ["nah"], nlt: "Nah", usfm: "NAM" },
  { ref: "Habakkuk", es: "Habacuc", aliases: ["hab"], nlt: "Hab", usfm: "HAB" },
  { ref: "Zephaniah", es: "Sofonías", aliases: ["zeph", "zep"], nlt: "Zeph", usfm: "ZEP" },
  { ref: "Haggai", es: "Hageo", aliases: ["hag"], nlt: "Hag", usfm: "HAG" },
  { ref: "Zechariah", es: "Zacarías", aliases: ["zech", "zec"], nlt: "Zech", usfm: "ZEC" },
  { ref: "Malachi", es: "Malaquías", aliases: ["mal"], nlt: "Mal", usfm: "MAL" },
  { ref: "Matthew", es: "Mateo", aliases: ["matt", "mt"], nlt: "Matt", usfm: "MAT" },
  { ref: "Mark", es: "Marcos", aliases: ["mk", "mr"], nlt: "Mark", usfm: "MRK" },
  { ref: "Luke", es: "Lucas", aliases: ["lk", "lu"], nlt: "Luke", usfm: "LUK" },
  { ref: "John", es: "Juan", aliases: ["jn", "joh"], nlt: "John", usfm: "JHN" },
  { ref: "Acts", es: "Hechos", aliases: ["ac"], nlt: "Acts", usfm: "ACT" },
  { ref: "Romans", es: "Romanos", aliases: ["rom", "ro"], nlt: "Rom", usfm: "ROM" },
  { ref: "1 Corinthians", es: "1 Corintios", aliases: ["1cor", "1co"], nlt: "1Cor", usfm: "1CO" },
  { ref: "2 Corinthians", es: "2 Corintios", aliases: ["2cor", "2co"], nlt: "2Cor", usfm: "2CO" },
  { ref: "Galatians", es: "Gálatas", aliases: ["gal"], nlt: "Gal", usfm: "GAL" },
  { ref: "Ephesians", es: "Efesios", aliases: ["eph"], nlt: "Eph", usfm: "EPH" },
  { ref: "Philippians", es: "Filipenses", aliases: ["phil", "php", "pp"], nlt: "Phil", usfm: "PHP" },
  { ref: "Colossians", es: "Colosenses", aliases: ["col"], nlt: "Col", usfm: "COL" },
  { ref: "1 Thessalonians", es: "1 Tesalonicenses", aliases: ["1thess", "1th"], nlt: "1Thes", usfm: "1TH" },
  { ref: "2 Thessalonians", es: "2 Tesalonicenses", aliases: ["2thess", "2th"], nlt: "2Thes", usfm: "2TH" },
  { ref: "1 Timothy", es: "1 Timoteo", aliases: ["1tim", "1ti"], nlt: "1Tim", usfm: "1TI" },
  { ref: "2 Timothy", es: "2 Timoteo", aliases: ["2tim", "2ti"], nlt: "2Tim", usfm: "2TI" },
  { ref: "Titus", es: "Tito", aliases: ["tit"], nlt: "Titus", usfm: "TIT" },
  { ref: "Philemon", es: "Filemón", aliases: ["philem", "phm", "phlm"], nlt: "Phlm", usfm: "PHM" },
  { ref: "Hebrews", es: "Hebreos", aliases: ["heb"], nlt: "Heb", usfm: "HEB" },
  { ref: "James", es: "Santiago", aliases: ["jas", "jm"], nlt: "Jas", usfm: "JAS" },
  { ref: "1 Peter", es: "1 Pedro", aliases: ["1pet", "1pe"], nlt: "1Pet", usfm: "1PE" },
  { ref: "2 Peter", es: "2 Pedro", aliases: ["2pet", "2pe"], nlt: "2Pet", usfm: "2PE" },
  { ref: "1 John", es: "1 Juan", aliases: ["1jn", "1jo"], nlt: "1Jn", usfm: "1JN" },
  { ref: "2 John", es: "2 Juan", aliases: ["2jn", "2jo"], nlt: "2Jn", usfm: "2JN" },
  { ref: "3 John", es: "3 Juan", aliases: ["3jn", "3jo"], nlt: "3Jn", usfm: "3JN" },
  { ref: "Jude", es: "Judas", aliases: ["jud"], nlt: "Jude", usfm: "JUD" },
  { ref: "Revelation", es: "Apocalipsis", aliases: ["rev", "revelations", "apoc"], nlt: "Rev", usfm: "REV" },
];

/** Lowercase, no accents, no spaces or punctuation: "1 Cor." and "1cor" become the same key. */
export function bookKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^([123])(?:st|nd|rd)(?=[a-z])/, "$1")
    .replace(/[^a-z0-9]/g, "");
}

const EXACT = new Map<string, number>();
const NAMES: { key: string; index: number }[] = [];
BIBLE_BOOKS.forEach((b, index) => {
  for (const name of [b.ref, b.es, b.nlt, ...b.aliases]) EXACT.set(bookKey(name), index);
  NAMES.push({ key: bookKey(b.ref), index }, { key: bookKey(b.es), index });
});

/** Finds a book from what someone typed: an exact name or abbreviation, or an unambiguous start ("revel"). */
export function findBook(text: string): number | null {
  const key = bookKey(text);
  if (!key) return null;
  const exact = EXACT.get(key);
  if (exact !== undefined) return exact;
  if (key.length < 3 || /^\d+$/.test(key)) return null;
  const matches = new Set(NAMES.filter((n) => n.key.startsWith(key)).map((n) => n.index));
  return matches.size === 1 ? [...matches][0] : null;
}

export interface ParsedReference {
  book: number;
  chapter: number;
  from: number | null;
  to: number | null;
}

/** "John 3:16", "1 cor 13", "Salmo 23:1-3", "ps 23.4": a book, a chapter, and optionally a verse or range. */
export function parseReference(input: string): ParsedReference | null {
  const m = input.trim().match(/^(.+?)\s*(\d{1,3})(?:\s*[:.]\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?)?$/);
  if (!m) return null;
  const book = findBook(m[1]);
  if (book === null) return null;
  const from = m[3] ? Number(m[3]) : null;
  const to = m[4] ? Number(m[4]) : null;
  if (from !== null && to !== null && to < from) return null;
  return { book, chapter: Number(m[2]), from, to };
}

/** The written form: "John 3:16", "Psalm 23:1-3", or "Romans 8" for a whole chapter. */
export function formatReference(r: ParsedReference): string {
  const name = BIBLE_BOOKS[r.book].ref;
  if (r.from === null) return `${name} ${r.chapter}`;
  return `${name} ${r.chapter}:${r.from}${r.to !== null && r.to !== r.from ? `-${r.to}` : ""}`;
}
