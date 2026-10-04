import type { ReactNode } from "react";
import { GLOSSARY, type GlossaryEntry } from "../content/glossary";
import type { Lang } from "../i18n/LanguageContext";
import { GlossaryTerm } from "../components/ui/GlossaryTerm";

const WORD_BEFORE = "(?<![\\p{L}\\p{N}_])";
const WORD_AFTER = "(?![\\p{L}\\p{N}_])";

const cache = new Map<Lang, { entry: GlossaryEntry; re: RegExp }[]>();

function compiled(lang: Lang) {
  let list = cache.get(lang);
  if (!list) {
    list = GLOSSARY.filter((e) => e.patterns[lang].length > 0).map((entry) => ({
      entry,
      re: new RegExp(`${WORD_BEFORE}(?:${entry.patterns[lang].join("|")})${WORD_AFTER}`, "iu"),
    }));
    cache.set(lang, list);
  }
  return list;
}

/**
 * Splits a paragraph into plain text and glossary terms. Only the first
 * appearance of each term in a lesson is marked (`seen` is shared across the
 * lesson's paragraphs), so the page stays readable instead of dotted all over.
 */
export function withGlossary(text: string, seen: Set<string>, lang: Lang): ReactNode[] {
  const found: { entry: GlossaryEntry; start: number; end: number }[] = [];
  for (const { entry, re } of compiled(lang)) {
    if (seen.has(entry.id)) continue;
    const m = re.exec(text);
    if (m) found.push({ entry, start: m.index, end: m.index + m[0].length });
  }
  found.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));

  const out: ReactNode[] = [];
  let cursor = 0;
  for (const f of found) {
    if (f.start < cursor) continue; // overlaps a term already marked
    if (f.start > cursor) out.push(text.slice(cursor, f.start));
    out.push(
      <GlossaryTerm key={`${f.entry.id}-${f.start}`} entry={f.entry}>
        {text.slice(f.start, f.end)}
      </GlossaryTerm>,
    );
    seen.add(f.entry.id);
    cursor = f.end;
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return out.length > 0 ? out : [text];
}
