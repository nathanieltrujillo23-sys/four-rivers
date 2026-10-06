/**
 * Emails a new learner a thank-you and the founder's welcome, once, right after they first sign in.
 * The app calls this when a profile has no welcome_sent_at. The text is the welcome message saved in the Admin
 * dashboard (Testimony tab), or the shipped default. Needs SUPABASE_SERVICE_ROLE_KEY and RESEND_API_KEY.
 *
 *   POST /api/welcome   { "lang": "en" | "es" }
 */
import { WELCOME } from "../src/content/welcome.js";
import { bodyOf, header, serviceGet, servicePatch, signedInUser, type Env, type Req, type Res } from "./_auth.js";
import { esc, sendMail } from "./_mail.js";

interface Text {
  title: string;
  paragraphs: string[];
  sign: string;
}

export async function welcomeText(env: Env, lang: "en" | "es"): Promise<Text> {
  const rows = await serviceGet<{ content: Text }[]>(env, `/rest/v1/site_text?select=content&id=eq.welcome:${lang}`);
  const c = rows?.[0]?.content;
  return c && typeof c.title === "string" && Array.isArray(c.paragraphs) && typeof c.sign === "string" ? c : WELCOME[lang];
}

export function welcomeMail(text: Text, name: string, lang: "en" | "es", site: string) {
  const hi = lang === "es" ? (name ? `Hola, ${name}:` : "Hola:") : name ? `Hi ${name},` : "Hi,";
  const open = lang === "es" ? "Empezar el curso" : "Start the course";
  const body = text.paragraphs.map((p) => `<p style="line-height:1.5">${esc(p)}</p>`).join("");
  return {
    subject: text.title,
    html: `<p>${esc(hi)}</p>${body}<p>— ${esc(text.sign)}</p><p><a href="${site}/course">${open}</a></p>`,
    text: `${hi}\n\n${text.paragraphs.join("\n\n")}\n\n— ${text.sign}\n\n${site}/course`,
  };
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "POST") return void res.status(405).json({ error: "post_only" });
  const env: Env = process.env;
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.RESEND_API_KEY) return void res.status(501).json({ error: "not_configured" });
  const user = await signedInUser(header(req, "authorization"), env);
  if (!user?.email) return void res.status(401).json({ error: "sign_in" });
  const lang = bodyOf<{ lang?: string }>(req)?.lang === "es" ? "es" : "en";

  const rows = await serviceGet<{ welcome_sent_at: string | null; display_name: string | null }[]>(
    env,
    `/rest/v1/profiles?select=welcome_sent_at,display_name&user_id=eq.${user.id}`,
  );
  const profile = rows?.[0];
  if (!profile || profile.welcome_sent_at) return void res.status(200).json({ sent: false });

  // Mark it first, so two quick requests cannot send two emails.
  if (!(await servicePatch(env, `/rest/v1/profiles?user_id=eq.${user.id}&welcome_sent_at=is.null`, { welcome_sent_at: new Date().toISOString() }))) {
    return void res.status(502).json({ error: "failed" });
  }
  const mail = welcomeMail(await welcomeText(env, lang), profile.display_name ?? "", lang, env.SITE_URL ?? "https://four-rivers.vercel.app");
  const sent = await sendMail(env, { to: user.email, ...mail });
  res.status(200).json({ sent });
}
