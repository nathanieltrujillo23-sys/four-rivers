/** Shared by the server functions: who is calling, and the service-role calls to the database. */
export type Env = Record<string, string | undefined>;

export const supabaseUrl = (env: Env) => (env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "").replace(/\/$/, "");

export const serviceHeaders = (env: Env) => ({
  apikey: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
});

/** The signed-in person's id and email, or null when the token is missing or not valid. */
export async function signedInUser(
  authorization: string | undefined,
  env: Env,
): Promise<{ id: string; email: string | null } | null> {
  const anon = env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY;
  if (!authorization?.startsWith("Bearer ") || !anon) return null;
  try {
    const res = await fetch(`${supabaseUrl(env)}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: authorization },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const u = (await res.json()) as { id?: string; email?: string };
    return u.id ? { id: u.id, email: u.email ?? null } : null;
  } catch {
    return null;
  }
}

/** Reads rows with the service role (skips row level security). */
export async function serviceGet<T>(env: Env, path: string): Promise<T | null> {
  try {
    const res = await fetch(`${supabaseUrl(env)}${path}`, { headers: serviceHeaders(env), signal: AbortSignal.timeout(10000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export async function servicePatch(env: Env, path: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(`${supabaseUrl(env)}${path}`, {
      method: "PATCH",
      headers: serviceHeaders(env),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function isAdmin(userId: string, env: Env): Promise<boolean> {
  const rows = await serviceGet<{ role: string }[]>(env, `/rest/v1/profiles?select=role&user_id=eq.${encodeURIComponent(userId)}`);
  return rows?.[0]?.role === "admin";
}

/** The address behind an account id (service role only). */
export async function emailOf(env: Env, userId: string): Promise<string | null> {
  const u = await serviceGet<{ email?: string }>(env, `/auth/v1/admin/users/${encodeURIComponent(userId)}`);
  return u?.email ?? null;
}

export interface Req {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}
export interface Res {
  status(code: number): Res;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
}

export const header = (req: Req, name: string): string | undefined => {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
};

/** Parses a JSON body whether the platform already did or left it as text. */
export function bodyOf<T>(req: Req): T | null {
  if (!req.body) return null;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as T;
    } catch {
      return null;
    }
  }
  return req.body as T;
}
