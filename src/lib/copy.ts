import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabaseClient";

/**
 * Editable copy. Text that an admin may reword from Admin, Content (explanations, money moments, the workshop, the toolkit,
 * the outreach guide, the home page previews) is shipped with a default. An admin's reworded version is kept as one row per
 * item in `site_text` (id `copy:<key>`), read once per visit, and used wherever the default would be shown.
 * Overrides are English only, like the lesson editor.
 */
export type CopyFn = (key: string, fallback: string) => string;

const PREFIX = "copy:";
const STORAGE_KEY = "fr-copy";
const listeners = new Set<() => void>();

function remembered(): Record<string, string> {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as unknown;
    return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, string>) : {};
  } catch {
    return {};
  }
}

let overrides: Record<string, string> = remembered();
let snapshot = overrides;

function publish(next: Record<string, string>) {
  overrides = next;
  snapshot = next; // a new object each time, so subscribers re-render
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private window: the copy is simply not remembered between visits */
  }
  listeners.forEach((l) => l());
}

let asked = false;
/** Reads every override once per visit; the last known set is used until it arrives. */
export async function refreshCopy(force = false): Promise<void> {
  if (asked && !force) return;
  asked = true;
  const { data, error } = await supabase.from("site_text").select("id, content").like("id", `${PREFIX}%`);
  if (error || !data) return; // keep what we knew
  const next: Record<string, string> = {};
  for (const row of data) {
    const text = (row.content as { text?: unknown } | null)?.text;
    if (typeof text === "string" && text.trim()) next[(row.id as string).slice(PREFIX.length)] = text;
  }
  publish(next);
}

/** The text for a key: the admin's version if there is one, otherwise the default. */
export const copyText: CopyFn = (key, fallback) => overrides[key] ?? fallback;

/** A copy function that re-renders its component when the overrides arrive or change. */
export function useCopy(): CopyFn {
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    () => snapshot,
    () => snapshot,
  );
  useEffect(() => {
    void refreshCopy().catch(() => {});
  }, []);
  return copyText;
}

/** Whether a key has an admin's version. */
export const isCopyEdited = (key: string) => key in overrides;

export async function saveCopy(key: string, text: string): Promise<void> {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return resetCopy(key);
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("site_text").upsert({
    id: PREFIX + key,
    content: { text: clean.slice(0, 6000) },
    updated_by: auth.user?.id ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  publish({ ...overrides, [key]: clean.slice(0, 6000) });
}

export async function resetCopy(key: string): Promise<void> {
  const { error } = await supabase.from("site_text").delete().eq("id", PREFIX + key);
  if (error) throw new Error(error.message);
  const next = { ...overrides };
  delete next[key];
  publish(next);
}

/** For tests: replaces the overrides without touching the database. */
export function setCopyOverridesForTests(next: Record<string, string>) {
  publish({ ...next });
}
