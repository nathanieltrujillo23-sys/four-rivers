/**
 * Sends an announcement from the Admin dashboard by email: to all group leaders, or to everyone who has an account.
 * Admin only. Each email has an "unsubscribe" link; people who used it are skipped from then on.
 * Spanish readers (those who chose Spanish in their reminder settings) get the Spanish text when one is given.
 *
 *   POST /api/announce   { audience: "leaders"|"everyone", subject, body, subjectEs?, bodyEs?, test?: true }
 *   With test: true the email goes only to the admin who sent the request, and nothing is recorded.
 *
 * Uses the same variables as the reminder emails: SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, REMINDER_FROM, CRON_SECRET.
 * Resend's free plan allows 100 emails a day and 3,000 a month; the response says how many were accepted.
 */
import { bodyOf, header, isAdmin, serviceHeaders, signedInUser, supabaseUrl, type Env, type Req, type Res } from "./_auth.js";
import { paragraphsHtml, sendMailBatch, type Mail } from "./_mail.js";
import { unsubscribeToken } from "./_reminder-token.js";

interface Recipient {
  user_id: string;
  email: string;
  display_name: string;
  lang: string;
}

interface Input {
  audience?: unknown;
  subject?: unknown;
  body?: unknown;
  subjectEs?: unknown;
  bodyEs?: unknown;
  test?: unknown;
}

export function buildMail(
  r: Recipient,
  text: { subject: string; body: string },
  lang: "en" | "es",
  site: string,
  secret: string,
): Mail {
  const off = `${site}/api/unsubscribe?k=announce&u=${r.user_id}&t=${unsubscribeToken(r.user_id, secret, "announce")}`;
  const hi = lang === "es" ? (r.display_name ? `Hola, ${r.display_name}:` : "Hola:") : r.display_name ? `Hi ${r.display_name},` : "Hi,";
  const foot =
    lang === "es"
      ? "Recibes esto porque tienes una cuenta en 4 Rivers."
      : "You are getting this because you have an account on 4 Rivers.";
  const stop = lang === "es" ? "Dejar de recibir anuncios" : "Stop announcement emails";
  return {
    to: r.email,
    subject: text.subject,
    html: `<p>${hi}</p>${paragraphsHtml(text.body)}<p style="color:#666;font-size:12px">${foot} <a href="${off}">${stop}</a>.</p>`,
    text: `${hi}\n\n${text.body}\n\n${stop}: ${off}`,
    unsubscribe: off,
  };
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "POST") return void res.status(405).json({ error: "post_only" });
  const env: Env = process.env;
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.RESEND_API_KEY) return void res.status(501).json({ error: "not_configured" });
  const user = await signedInUser(header(req, "authorization"), env);
  if (!user || !(await isAdmin(user.id, env))) return void res.status(403).json({ error: "admin_only" });

  const input = bodyOf<Input>(req) ?? {};
  const audience = input.audience === "leaders" ? "leaders" : input.audience === "everyone" ? "everyone" : null;
  const subject = typeof input.subject === "string" ? input.subject.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (!audience || !subject || !body || subject.length > 150 || body.length > 5000) {
    return void res.status(400).json({ error: "bad_input" });
  }
  const subjectEs = typeof input.subjectEs === "string" && input.subjectEs.trim() ? input.subjectEs.trim() : null;
  const bodyEs = typeof input.bodyEs === "string" && input.bodyEs.trim() ? input.bodyEs.trim() : null;
  const site = env.SITE_URL ?? "https://four-rivers.vercel.app";
  const secret = env.CRON_SECRET ?? "";

  let recipients: Recipient[];
  if (input.test === true) {
    if (!user.email) return void res.status(400).json({ error: "no_email" });
    recipients = [{ user_id: user.id, email: user.email, display_name: "", lang: "en" }];
  } else {
    const rpc = await fetch(`${supabaseUrl(env)}/rest/v1/rpc/announcement_recipients`, {
      method: "POST",
      headers: serviceHeaders(env),
      body: JSON.stringify({ p_audience: audience }),
    });
    if (!rpc.ok) return void res.status(502).json({ error: "recipients_failed" });
    recipients = (await rpc.json()) as Recipient[];
  }

  const mails = recipients.map((r) => {
    const spanish = r.lang === "es" && !!subjectEs && !!bodyEs;
    return buildMail(r, spanish ? { subject: subjectEs!, body: bodyEs! } : { subject, body }, spanish ? "es" : "en", site, secret);
  });
  const sent = await sendMailBatch(env, mails);

  if (input.test !== true && sent > 0) {
    await fetch(`${supabaseUrl(env)}/rest/v1/announcements`, {
      method: "POST",
      headers: { ...serviceHeaders(env), Prefer: "return=minimal" },
      body: JSON.stringify({ audience, subject, body, sent_by: user.id, sent_count: sent }),
    });
  }
  res.status(200).json({ recipients: recipients.length, sent });
}
