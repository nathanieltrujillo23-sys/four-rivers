/**
 * Translates short texts into Spanish for the Admin dashboard (the testimony, the welcome message, announcements).
 * Admin only. Needs ANTHROPIC_API_KEY in the Vercel project settings; without it this answers 501 and the editor
 * says translation is not set up, so Spanish can still be typed by hand.
 *
 *   POST /api/translate   { "texts": ["...", "..."] }   ->   { "texts": ["...", "..."] }
 */
import { bodyOf, header, isAdmin, signedInUser, type Env, type Req, type Res } from "./_auth.js";

const MODEL = "claude-sonnet-5-5";
const MAX_TEXTS = 30;
const MAX_CHARS = 20000;

export async function translateTexts(env: Env, texts: string[]): Promise<string[] | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      system:
        "You translate English text into natural, warm Latin American Spanish for a Christian stewardship course. " +
        "Keep the meaning, the tone, and every paragraph break. Keep personal names unchanged. Write Bible book names in " +
        "Spanish (for example Genesis 39:2 becomes Génesis 39:2). Do not add explanations or quotation marks. " +
        "Reply with only a JSON array of strings, one translation per input string, in the same order.",
      messages: [{ role: "user", content: JSON.stringify(texts) }],
    }),
    signal: AbortSignal.timeout(50000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const raw = data.content?.find((c) => c.type === "text")?.text ?? "";
  const json = raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1);
  try {
    const out = JSON.parse(json) as unknown;
    return Array.isArray(out) && out.length === texts.length && out.every((t) => typeof t === "string")
      ? (out as string[])
      : null;
  } catch {
    return null;
  }
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "POST") return void res.status(405).json({ error: "post_only" });
  const env = process.env;
  if (!env.ANTHROPIC_API_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) return void res.status(501).json({ error: "not_configured" });
  const user = await signedInUser(header(req, "authorization"), env);
  if (!user || !(await isAdmin(user.id, env))) return void res.status(403).json({ error: "admin_only" });
  const body = bodyOf<{ texts?: unknown }>(req);
  const texts = body?.texts;
  if (
    !Array.isArray(texts) ||
    texts.length === 0 ||
    texts.length > MAX_TEXTS ||
    !texts.every((t) => typeof t === "string") ||
    texts.join("").length > MAX_CHARS
  ) {
    return void res.status(400).json({ error: "bad_input" });
  }
  const out = await translateTexts(env, texts as string[]);
  if (!out) return void res.status(502).json({ error: "translation_failed" });
  res.status(200).json({ texts: out });
}
