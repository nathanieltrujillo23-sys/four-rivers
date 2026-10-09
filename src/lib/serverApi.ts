import { supabase } from "./supabaseClient";

/** Calls one of the app's own server functions (api/*.ts) as the signed-in person. */
export async function callApi<T = unknown>(
  path: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, status: 401, data: null };
  try {
    const res = await fetch(`/api/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as T | null;
    return { ok: res.ok, status: res.status, data: json };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

/** Translates text into Spanish, and says in plain words why when it cannot. */
export async function translateToSpanishDetailed(texts: string[]): Promise<{ texts: string[] | null; reason: string }> {
  const r = await callApi<{ texts?: string[]; detail?: string; error?: string }>("translate", { texts });
  if (r.ok && Array.isArray(r.data?.texts) && r.data.texts.length === texts.length) return { texts: r.data.texts, reason: "" };
  if (r.status === 501) return { texts: null, reason: "translation isn't set up yet (the site has no translation key)" };
  if (r.status === 401) return { texts: null, reason: "you appear to be signed out; sign in again and retry" };
  if (r.status === 403) return { texts: null, reason: "only an admin can translate" };
  if (r.status === 0) return { texts: null, reason: "the site could not be reached" };
  return { texts: null, reason: r.data?.detail ?? `the translation service returned an error (${r.status})` };
}

/** Translates text into Spanish (admin only; needs GEMINI_API_KEY or ANTHROPIC_API_KEY on the server). Returns null when it can't. */
export async function translateToSpanish(texts: string[]): Promise<string[] | null> {
  const r = await callApi<{ texts?: string[] }>("translate", { texts });
  return r.ok && Array.isArray(r.data?.texts) && r.data.texts.length === texts.length ? r.data.texts : null;
}
