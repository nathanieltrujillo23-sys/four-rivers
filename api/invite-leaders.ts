/**
 * Outreach: invites pastors, campus ministers, and small-group leaders to lead 4 Rivers groups, in bulk. Admin only.
 * Records each address (anyone who already has an account is approved as a leader on the spot, and anyone who signs
 * up later with that address is approved when they do), then emails each person a short invitation.
 *
 *   POST /api/invite-leaders   { emails: string[], approve: boolean, note?: string, lang: "en" | "es" }
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY and REMINDER_FROM like the other emails, and the Outreach database update.
 */
import { bodyOf, header, isAdmin, signedInUser, supabaseUrl, type Env, type Req, type Res } from "./_auth.js";
import { paragraphsHtml, sendMailBatch, type Mail } from "./_mail.js";

interface Input {
  emails?: unknown;
  approve?: unknown;
  note?: unknown;
  lang?: unknown;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Splits a pasted block (lines, commas, semicolons, "Name <a@b.org>") into clean, distinct, lowercase addresses. */
export function parseEmails(raw: string): string[] {
  const found = new Set<string>();
  for (const part of raw.split(/[\n,;]+/)) {
    const angle = part.match(/<([^>]+)>/);
    const candidate = (angle ? angle[1] : part).trim().toLowerCase();
    if (EMAIL.test(candidate)) found.add(candidate);
  }
  return [...found];
}

export function inviteMail(to: string, opts: { approve: boolean; note: string; lang: "en" | "es"; site: string }): Mail {
  const { approve, note, lang, site } = opts;
  const link = `${site}/signin`;
  if (lang === "es") {
    const body = [
      "Hola,",
      "Te escribo para invitarte a dirigir un grupo de 4 Rivers, un curso gratuito de mayordomía basado en las Escrituras para jóvenes adultos. En un grupo leen juntos, conversan, oran y ven cómo va cada quien en el curso, con herramientas pensadas para líderes como tú.",
      ...(note ? [note] : []),
      approve
        ? `Crea tu cuenta gratuita con este mismo correo (${to}) y quedarás como líder de grupo automáticamente, para que puedas crear tu primer grupo enseguida: ${link}`
        : `Crea tu cuenta gratuita con este correo (${to}) y luego pide el estado de líder desde la página de Comunidad; lo revisaremos pronto: ${link}`,
      "Si no esperabas este mensaje, simplemente ignóralo.",
      "— Nathaniel Trujillo, fundador de 4 Rivers",
    ].join("\n\n");
    return { to, subject: "Te invito a dirigir un grupo de 4 Rivers", html: paragraphsHtml(body), text: body };
  }
  const body = [
    "Hello,",
    "I'm writing to invite you to lead a 4 Rivers group. 4 Rivers is a free, Scripture-based course in stewardship for young adults. In a group you read together, talk, pray, and see how everyone is doing in the course, with tools made for leaders like you.",
    ...(note ? [note] : []),
    approve
      ? `Create your free account with this same email (${to}) and you will be set up as a group leader automatically, so you can start your first group right away: ${link}`
      : `Create your free account with this email (${to}), then ask for leader status from the Community page, and we will review it soon: ${link}`,
    "If you weren't expecting this, you can simply ignore it.",
    "— Nathaniel Trujillo, founder of 4 Rivers",
  ].join("\n\n");
  return { to, subject: "An invitation to lead a 4 Rivers group", html: paragraphsHtml(body), text: body };
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "POST") return void res.status(405).json({ error: "post_only" });
  const env: Env = process.env;
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return void res.status(501).json({ error: "not_configured" });
  const authorization = header(req, "authorization");
  const user = await signedInUser(authorization, env);
  if (!user || !(await isAdmin(user.id, env))) return void res.status(403).json({ error: "admin_only" });

  const input = bodyOf<Input>(req) ?? {};
  const emails = typeof input.emails === "string" ? parseEmails(input.emails) : Array.isArray(input.emails) ? parseEmails(input.emails.join("\n")) : [];
  if (emails.length === 0 || emails.length > 200) return void res.status(400).json({ error: "bad_emails" });
  const approve = input.approve !== false;
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 600) : "";
  const lang = input.lang === "es" ? "es" : "en";

  // Record them as the admin (the database checks they really are one).
  const rpc = await fetch(`${supabaseUrl(env)}/rest/v1/rpc/admin_apply_leader_invites`, {
    method: "POST",
    headers: {
      apikey: env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY ?? "",
      Authorization: authorization!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_emails: emails, p_approve: approve }),
  });
  if (!rpc.ok) return void res.status(502).json({ error: "not_recorded" });
  const counts = (await rpc.json()) as { total: number; with_account: number; approved_now: number; pending: number };

  // Email each one, if email is set up. The invitations are recorded either way.
  const site = env.SITE_URL ?? "https://four-rivers.vercel.app";
  const sent = env.RESEND_API_KEY ? await sendMailBatch(env, emails.map((to) => inviteMail(to, { approve, note, lang, site }))) : 0;
  res.status(200).json({ ...counts, emailed: sent, emailConfigured: !!env.RESEND_API_KEY });
}
