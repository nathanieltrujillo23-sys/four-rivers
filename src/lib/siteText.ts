import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { en } from "../i18n/en";
import { es } from "../i18n/es";
import { WELCOME } from "../content/welcome";
import type { Lang } from "../i18n/LanguageContext";

/** A block of text an admin can edit from the Admin dashboard: a heading, paragraphs, and a signature (one version per language). */
export interface SiteText {
  title: string;
  paragraphs: string[];
  sign: string;
  /** Set on a Spanish version that was translated from the English one, and not written or changed by hand. */
  auto?: boolean;
}
export type Testimony = SiteText;

/** The two editable texts: the home page testimony and the welcome message for new learners. */
export type TextKind = "testimony" | "welcome";

const PARAGRAPH_KEYS = [
  "testimony.p1",
  "testimony.p2",
  "testimony.p3",
  "testimony.p4",
  "testimony.p5",
  "testimony.p6",
] as const;

/** The text shipped with the app, used until an admin saves their own. */
export function defaultText(kind: TextKind, lang: Lang): SiteText {
  if (kind === "welcome") return { ...WELCOME[lang], paragraphs: [...WELCOME[lang].paragraphs] };
  const d = lang === "es" ? es : en;
  return {
    title: d["testimony.title"],
    paragraphs: PARAGRAPH_KEYS.map((k) => d[k]),
    sign: d["testimony.sign"],
  };
}
export const defaultTestimony = (lang: Lang) => defaultText("testimony", lang);

const rowId = (kind: TextKind, lang: Lang) => `${kind}:${lang}`;

function isSiteText(value: unknown): value is SiteText {
  const v = value as SiteText | null;
  return (
    !!v &&
    typeof v.title === "string" &&
    typeof v.sign === "string" &&
    Array.isArray(v.paragraphs) &&
    v.paragraphs.every((p) => typeof p === "string")
  );
}

// One lookup per text and language per visit; saving updates it so pages are current right away.
const cache = new Map<string, SiteText | null>();

/** The saved version, or null when nothing has been saved (or the table does not exist yet). */
export async function loadText(kind: TextKind, lang: Lang, fresh = false): Promise<SiteText | null> {
  const key = rowId(kind, lang);
  if (!fresh && cache.has(key)) return cache.get(key) ?? null;
  const { data, error } = await supabase.from("site_text").select("content").eq("id", key).maybeSingle();
  const saved = !error && isSiteText(data?.content) ? data.content : null;
  cache.set(key, saved);
  return saved;
}
export const loadTestimonyOverride = (lang: Lang, fresh = false) => loadText("testimony", lang, fresh);

export async function saveText(kind: TextKind, lang: Lang, value: SiteText): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("site_text").upsert({
    id: rowId(kind, lang),
    content: value,
    updated_by: auth.user?.id ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  cache.set(rowId(kind, lang), value);
}
export const saveTestimony = (lang: Lang, value: SiteText) => saveText("testimony", lang, value);

export async function resetText(kind: TextKind, lang: Lang): Promise<void> {
  const { error } = await supabase.from("site_text").delete().eq("id", rowId(kind, lang));
  if (error) throw new Error(error.message);
  cache.set(rowId(kind, lang), null);
}
export const resetTestimony = (lang: Lang) => resetText("testimony", lang);

/** What a page shows: the saved text if there is some, otherwise the shipped text. */
export function useSiteText(kind: TextKind, lang: Lang): SiteText {
  const [saved, setSaved] = useState<{ key: string; value: SiteText | null } | null>(null);
  const key = rowId(kind, lang);

  useEffect(() => {
    let alive = true;
    loadText(kind, lang)
      .then((value) => alive && setSaved({ key, value }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [kind, lang, key]);

  return (saved?.key === key ? saved.value : null) ?? defaultText(kind, lang);
}
export const useTestimony = (lang: Lang) => useSiteText("testimony", lang);

/* ---- The home page's "by the numbers" strip ---- */

export interface PublicStats {
  enabled: boolean;
  learners?: number;
  certificates?: number;
  groups?: number;
}

export async function loadPublicStats(): Promise<PublicStats> {
  const { data, error } = await supabase.rpc("public_stats");
  if (error || !data) return { enabled: false };
  const o = data as Record<string, unknown>;
  return {
    enabled: !!o.enabled,
    learners: o.learners == null ? undefined : Number(o.learners),
    certificates: o.certificates == null ? undefined : Number(o.certificates),
    groups: o.groups == null ? undefined : Number(o.groups),
  };
}

/** Whether the strip is on (an admin setting). Stored as one small row in site_text. */
export async function loadStatsSetting(): Promise<boolean> {
  const { data } = await supabase.from("site_text").select("content").eq("id", "settings:stats").maybeSingle();
  return !!(data?.content as { enabled?: boolean } | null)?.enabled;
}

export async function saveStatsSetting(enabled: boolean): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("site_text").upsert({
    id: "settings:stats",
    content: { enabled },
    updated_by: auth.user?.id ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}
