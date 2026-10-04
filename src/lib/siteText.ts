import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { en } from "../i18n/en";
import { es } from "../i18n/es";
import type { Lang } from "../i18n/LanguageContext";

/** The home page's "My Testimony" text, which an admin can edit (one version per language). */
export interface Testimony {
  title: string;
  paragraphs: string[];
  sign: string;
}

const PARAGRAPH_KEYS = [
  "testimony.p1",
  "testimony.p2",
  "testimony.p3",
  "testimony.p4",
  "testimony.p5",
  "testimony.p6",
] as const;

/** The text shipped with the app, used until an admin saves their own. */
export function defaultTestimony(lang: Lang): Testimony {
  const d = lang === "es" ? es : en;
  return {
    title: d["testimony.title"],
    paragraphs: PARAGRAPH_KEYS.map((k) => d[k]),
    sign: d["testimony.sign"],
  };
}

function rowId(lang: Lang) {
  return `testimony:${lang}`;
}

function isTestimony(value: unknown): value is Testimony {
  const v = value as Testimony | null;
  return (
    !!v &&
    typeof v.title === "string" &&
    typeof v.sign === "string" &&
    Array.isArray(v.paragraphs) &&
    v.paragraphs.every((p) => typeof p === "string")
  );
}

// One lookup per language per visit; saving updates it so the home page is current right away.
const cache = new Map<Lang, Testimony | null>();

/** The saved version, or null when nothing has been saved (or the table does not exist yet). */
export async function loadTestimonyOverride(lang: Lang, fresh = false): Promise<Testimony | null> {
  if (!fresh && cache.has(lang)) return cache.get(lang) ?? null;
  const { data, error } = await supabase
    .from("site_text")
    .select("content")
    .eq("id", rowId(lang))
    .maybeSingle();
  const saved = !error && isTestimony(data?.content) ? data.content : null;
  cache.set(lang, saved);
  return saved;
}

export async function saveTestimony(lang: Lang, value: Testimony): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("site_text").upsert({
    id: rowId(lang),
    content: value,
    updated_by: auth.user?.id ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  cache.set(lang, value);
}

export async function resetTestimony(lang: Lang): Promise<void> {
  const { error } = await supabase.from("site_text").delete().eq("id", rowId(lang));
  if (error) throw new Error(error.message);
  cache.set(lang, null);
}

/** What the home page shows: the saved text if there is some, otherwise the shipped text. */
export function useTestimony(lang: Lang): Testimony {
  const [saved, setSaved] = useState<{ lang: Lang; value: Testimony | null } | null>(null);

  useEffect(() => {
    let alive = true;
    loadTestimonyOverride(lang)
      .then((value) => alive && setSaved({ lang, value }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [lang]);

  return (saved?.lang === lang ? saved.value : null) ?? defaultTestimony(lang);
}
