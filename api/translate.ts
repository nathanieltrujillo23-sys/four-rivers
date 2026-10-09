/**
 * Translates short texts into Spanish for the Admin dashboard (the testimony, the welcome message, announcements).
 * Admin only. Uses Google's Gemini (GEMINI_API_KEY, which has a free tier) if that key is set in the Vercel project
 * settings, otherwise Anthropic's Claude (ANTHROPIC_API_KEY). With neither, this answers 501 and the editor says
 * translation is not set up, so Spanish can still be typed by hand.
 *
 *   POST /api/translate   { "texts": ["...", "..."] }   ->   { "texts": ["...", "..."] }
 */
import { bodyOf, header, signedInUser, supabaseUrl, type Env, type Req, type Res } from "./_auth.js";

const CLAUDE_MODEL = "claude-sonnet-5-5";
/** "gemini-flash-latest" always points at the current Flash model, which the free tier covers. GEMINI_MODEL overrides it. */
const GEMINI_DEFAULT_MODEL = "gemini-flash-latest";
const MAX_TEXTS = 30;
const MAX_CHARS = 20000;

const SYSTEM_PROMPT =
  "You translate English text into natural, warm Latin American Spanish for a Christian stewardship course. " +
  "Keep the meaning, the tone, and every paragraph break. Keep personal names unchanged. Write Bible book names in " +
  "Spanish (for example Genesis 39:2 becomes Génesis 39:2). Do not add explanations or quotation marks. " +
  "Reply with only a JSON array of strings, one translation per input string, in the same order.";

/** Reads a JSON array of strings, the same length as the input, out of a model's reply (or null). */
function parseTranslations(raw: string, expected: number): string[] | null {
  const json = raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1);
  try {
    const out = JSON.parse(json) as unknown;
    return Array.isArray(out) && out.length === expected && out.every((t) => typeof t === "string") ? (out as string[]) : null;
  } catch {
    return null;
  }
}

async function translateWithGemini(env: Env, texts: string[]): Promise<string[] | null> {
  const model = (env.GEMINI_MODEL ?? "").trim() || GEMINI_DEFAULT_MODEL;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": env.GEMINI_API_KEY ?? "", "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: JSON.stringify(texts) }] }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(50000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const raw = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  return parseTranslations(raw, texts.length);
}

export async function translateTexts(env: Env, texts: string[]): Promise<string[] | null> {
  if (env.GEMINI_API_KEY) return translateWithGemini(env, texts);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(texts) }],
    }),
    signal: AbortSignal.timeout(50000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const raw = data.content?.find((c) => c.type === "text")?.text ?? "";
  return parseTranslations(raw, texts.length);
}

/** Whether the signed-in person is an admin, read with their own token (a person can always read their own profile). */
async function isAdminSelf(userId: string, authorization: string, env: Env): Promise<boolean> {
  const anon = env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY;
  if (!anon) return false;
  try {
    const res = await fetch(`${supabaseUrl(env)}/rest/v1/profiles?select=role&user_id=eq.${encodeURIComponent(userId)}`, {
      headers: { apikey: anon, Authorization: authorization },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return false;
    const rows = (await res.json()) as { role?: string }[];
    return rows[0]?.role === "admin";
  } catch {
    return false;
  }
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "POST") return void res.status(405).json({ error: "post_only" });
  const env = process.env;
  if (!env.GEMINI_API_KEY && !env.ANTHROPIC_API_KEY) return void res.status(501).json({ error: "not_configured" });
  const authorization = header(req, "authorization");
  const user = await signedInUser(authorization, env);
  if (!user || !(await isAdminSelf(user.id, authorization!, env))) return void res.status(403).json({ error: "admin_only" });
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
