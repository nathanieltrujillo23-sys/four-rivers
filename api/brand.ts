/**
 * Serves the logo files that link previews and installs ask for by address: the share-card picture, the phone
 * home-screen icon, and the app icons. They are the files of whichever logo an admin chose (Admin, Tools), so
 * changing the logo changes them too without a new deploy.
 *
 *   GET /api/brand?f=og | apple-touch-icon | icon-192 | icon-512 | maskable-512
 */
import { header, supabaseUrl, type Env, type Req, type Res } from "./_auth.js";

const FILES: Record<string, string> = {
  og: "og.png",
  "apple-touch-icon": "apple-touch-icon.png",
  "icon-192": "icon-192.png",
  "icon-512": "icon-512.png",
  "maskable-512": "maskable-512.png",
};
const LOGOS = ["current", "droplet", "tile", "monogram", "ribbons", "orb"];
const DEFAULT_LOGO = "current";

interface Res2 extends Res {
  end(body: Buffer): void;
}

/** The chosen logo's id, or the original when none was chosen or the database can't be reached. */
export async function chosenLogo(env: Env): Promise<string> {
  const anon = env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY;
  const base = supabaseUrl(env);
  if (!anon || !base) return DEFAULT_LOGO;
  try {
    const res = await fetch(`${base}/rest/v1/site_text?select=content&id=eq.settings:logo`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return DEFAULT_LOGO;
    const rows = (await res.json()) as { content?: { id?: unknown } }[];
    const id = rows[0]?.content?.id;
    return typeof id === "string" && LOGOS.includes(id) ? id : DEFAULT_LOGO;
  } catch {
    return DEFAULT_LOGO;
  }
}

export default async function handler(req: Req & { url?: string }, res: Res2) {
  if (req.method !== "GET") return void res.status(405).json({ error: "get_only" });
  const key = new URL(req.url ?? "/", "http://x").searchParams.get("f") ?? "";
  const file = FILES[key];
  if (!file) return void res.status(404).json({ error: "unknown_file" });
  const host = header(req, "x-forwarded-host") ?? header(req, "host");
  if (!host) return void res.status(400).json({ error: "no_host" });
  const logo = await chosenLogo(process.env);
  try {
    const got = await fetch(`https://${host}/brand/${logo}/${file}`, { signal: AbortSignal.timeout(8000) });
    if (!got.ok) return void res.status(404).json({ error: "missing_file" });
    const bytes = Buffer.from(await got.arrayBuffer());
    res.setHeader("Content-Type", "image/png");
    // Short, so a new choice shows up within minutes; link-preview sites keep their own copies longer.
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
    res.status(200);
    res.end(bytes);
  } catch {
    res.status(502).json({ error: "unavailable" });
  }
}
