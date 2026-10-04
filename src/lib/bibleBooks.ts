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
}

export const BIBLE_BOOKS: BibleBook[] = [
  { ref: "Genesis", es: "Génesis", aliases: ["gen", "gn"], nlt: "Gen" },
  { ref: "Exodus", es: "Éxodo", aliases: ["exo", "ex", "exod"], nlt: "Exod" },
  { ref: "Leviticus", es: "Levítico", aliases: ["lev", "lv"], nlt: "Lev" },
  { ref: "Numbers", es: "Números", aliases: ["num", "nm", "nu"], nlt: "Num" },
  { ref: "Deuteronomy", es: "Deuteronomio", aliases: ["deut", "dt"], nlt: "Deut" },
  { ref: "Joshua", es: "Josué", aliases: ["josh", "jos"], nlt: "Josh" },
  { ref: "Judges", es: "Jueces", aliases: ["judg", "jdg"], nlt: "Judg" },
  { ref: "Ruth", es: "Rut", aliases: ["ru"], nlt: "Ruth" },
  { ref: "1 Samuel", es: "1 Samuel", aliases: ["1sam", "1sa"], nlt: "1Sam" },
  { ref: "2 Samuel", es: "2 Samuel", aliases: ["2sam", "2sa"], nlt: "2Sam" },
  { ref: "1 Kings", es: "1 Reyes", aliases: ["1kgs", "1ki"], nlt: "1Kgs" },
  { ref: "2 Kings", es: "2 Reyes", aliases: ["2kgs", "2ki"], nlt: "2Kgs" },
  { ref: "1 Chronicles", es: "1 Crónicas", aliases: ["1chr", "1ch"], nlt: "1Chr" },
  { ref: "2 Chronicles", es: "2 Crónicas", aliases: ["2chr", "2ch"], nlt: "2Chr" },
  { ref: "Ezra", es: "Esdras", aliases: ["ezr"], nlt: "Ezra" },
  { ref: "Nehemiah", es: "Nehemías", aliases: ["neh"], nlt: "Neh" },
  { ref: "Esther", es: "Ester", aliases: ["esth", "est"], nlt: "Esth" },
  { ref: "Job", es: "Job", aliases: [], nlt: "Job" },
  { ref: "Psalm", es: "Salmo", aliases: ["psalms", "ps", "psa", "salmos"], nlt: "Ps" },
  { ref: "Proverbs", es: "Proverbios", aliases: ["prov", "pr", "prv"], nlt: "Prov" },
  { ref: "Ecclesiastes", es: "Eclesiastés", aliases: ["eccl", "ecc", "eccles"], nlt: "Eccl" },
  {
    ref: "Song of Solomon",
    es: "Cantares",
    aliases: ["song", "sos", "song of songs", "cantar de los cantares", "cantar"],
    nlt: "Song",
  },
  { ref: "Isaiah", es: "Isaías", aliases: ["isa"], nlt: "Isa" },
  { ref: "Jeremiah", es: "Jeremías", aliases: ["jer"], nlt: "Jer" },
  { ref: "Lamentations", es: "Lamentaciones", aliases: ["lam"], nlt: "Lam" },
  { ref: "Ezekiel", es: "Ezequiel", aliases: ["ezek", "eze"], nlt: "Ezek" },
  { ref: "Daniel", es: "Daniel", aliases: ["dan"], nlt: "Dan" },
  { ref: "Hosea", es: "Oseas", aliases: ["hos"], nlt: "Hos" },
  { ref: "Joel", es: "Joel", aliases: [], nlt: "Joel" },
  { ref: "Amos", es: "Amós", aliases: [], nlt: "Amos" },
  { ref: "Obadiah", es: "Abdías", aliases: ["obad", "ob"], nlt: "Obad" },
  { ref: "Jonah", es: "Jonás", aliases: ["jon"], nlt: "Jonah" },
  { ref: "Micah", es: "Miqueas", aliases: ["mic"], nlt: "Mic" },
  { ref: "Nahum", es: "Nahúm", aliases: ["nah"], nlt: "Nah" },
  { ref: "Habakkuk", es: "Habacuc", aliases: ["hab"], nlt: "Hab" },
  { ref: "Zephaniah", es: "Sofonías", aliases: ["zeph", "zep"], nlt: "Zeph" },
  { ref: "Haggai", es: "Hageo", aliases: ["hag"], nlt: "Hag" },
  { ref: "Zechariah", es: "Zacarías", aliases: ["zech", "zec"], nlt: "Zech" },
  { ref: "Malachi", es: "Malaquías", aliases: ["mal"], nlt: "Mal" },
  { ref: "Matthew", es: "Mateo", aliases: ["matt", "mt"], nlt: "Matt" },
  { ref: "Mark", es: "Marcos", aliases: ["mk", "mr"], nlt: "Mark" },
  { ref: "Luke", es: "Lucas", aliases: ["lk", "lu"], nlt: "Luke" },
  { ref: "John", es: "Juan", aliases: ["jn", "joh"], nlt: "John" },
  { ref: "Acts", es: "Hechos", aliases: ["ac"], nlt: "Acts" },
  { ref: "Romans", es: "Romanos", aliases: ["rom", "ro"], nlt: "Rom" },
  { ref: "1 Corinthians", es: "1 Corintios", aliases: ["1cor", "1co"], nlt: "1Cor" },
  { ref: "2 Corinthians", es: "2 Corintios", aliases: ["2cor", "2co"], nlt: "2Cor" },
  { ref: "Galatians", es: "Gálatas", aliases: ["gal"], nlt: "Gal" },
  { ref: "Ephesians", es: "Efesios", aliases: ["eph"], nlt: "Eph" },
  { ref: "Philippians", es: "Filipenses", aliases: ["phil", "php", "pp"], nlt: "Phil" },
  { ref: "Colossians", es: "Colosenses", aliases: ["col"], nlt: "Col" },
  { ref: "1 Thessalonians", es: "1 Tesalonicenses", aliases: ["1thess", "1th"], nlt: "1Thes" },
  { ref: "2 Thessalonians", es: "2 Tesalonicenses", aliases: ["2thess", "2th"], nlt: "2Thes" },
  { ref: "1 Timothy", es: "1 Timoteo", aliases: ["1tim", "1ti"], nlt: "1Tim" },
  { ref: "2 Timothy", es: "2 Timoteo", aliases: ["2tim", "2ti"], nlt: "2Tim" },
  { ref: "Titus", es: "Tito", aliases: ["tit"], nlt: "Titus" },
  { ref: "Philemon", es: "Filemón", aliases: ["philem", "phm", "phlm"], nlt: "Phlm" },
  { ref: "Hebrews", es: "Hebreos", aliases: ["heb"], nlt: "Heb" },
  { ref: "James", es: "Santiago", aliases: ["jas", "jm"], nlt: "Jas" },
  { ref: "1 Peter", es: "1 Pedro", aliases: ["1pet", "1pe"], nlt: "1Pet" },
  { ref: "2 Peter", es: "2 Pedro", aliases: ["2pet", "2pe"], nlt: "2Pet" },
  { ref: "1 John", es: "1 Juan", aliases: ["1jn", "1jo"], nlt: "1Jn" },
  { ref: "2 John", es: "2 Juan", aliases: ["2jn", "2jo"], nlt: "2Jn" },
  { ref: "3 John", es: "3 Juan", aliases: ["3jn", "3jo"], nlt: "3Jn" },
  { ref: "Jude", es: "Judas", aliases: ["jud"], nlt: "Jude" },
  { ref: "Revelation", es: "Apocalipsis", aliases: ["rev", "revelations", "apoc"], nlt: "Rev" },
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
