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

/** Translates text into Spanish (admin only; needs GEMINI_API_KEY or ANTHROPIC_API_KEY on the server). Returns null when it can't. */
export async function translateToSpanish(texts: string[]): Promise<string[] | null> {
  const r = await callApi<{ texts?: string[] }>("translate", { texts });
  return r.ok && Array.isArray(r.data?.texts) && r.data.texts.length === texts.length ? r.data.texts : null;
}
