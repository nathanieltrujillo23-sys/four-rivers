import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabaseClient";
import { DEFAULT_LOGO, LOGO_IDS, type LogoId } from "../brand/logoMarks.mjs";

const STORAGE_KEY = "fr-logo";
const listeners = new Set<() => void>();

export const isLogoId = (v: unknown): v is LogoId => typeof v === "string" && (LOGO_IDS as readonly string[]).includes(v);

function remembered(): LogoId {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isLogoId(v) ? v : DEFAULT_LOGO;
  } catch {
    return DEFAULT_LOGO;
  }
}

let current: LogoId = remembered();

function set(id: LogoId) {
  if (id === current) return;
  current = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* private window: the choice simply isn't remembered between visits */
  }
  listeners.forEach((l) => l());
}

/** The tab icon follows the chosen logo (the link preview and install icons are served by /api/brand). */
function applyFavicon(id: LogoId) {
  if (id === DEFAULT_LOGO) return;
  document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]').forEach((l) => l.remove());
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/png";
  link.href = `/brand/${id}/favicon-32.png`;
  document.head.appendChild(link);
}

let asked = false;
/** Reads the saved choice once per visit; the last known one is used until it arrives. */
async function refresh(force = false) {
  if (asked && !force) return;
  asked = true;
  const { data, error } = await supabase.from("site_text").select("content").eq("id", "settings:logo").maybeSingle();
  if (error) return; // keep the last known choice
  const id = (data?.content as { id?: unknown } | null)?.id;
  set(isLogoId(id) ? id : DEFAULT_LOGO);
}

export async function saveLogoChoice(id: LogoId): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("site_text").upsert({
    id: "settings:logo",
    content: { id },
    updated_by: auth.user?.id ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  set(id);
}

/** The logo an admin chose (the original until they choose one). */
export function useLogoChoice(): LogoId {
  const id = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    () => current,
    () => DEFAULT_LOGO,
  );
  useEffect(() => {
    void refresh().catch(() => {});
  }, []);
  useEffect(() => applyFavicon(id), [id]);
  return id;
}
