/**
 * Outreach: invites pastors, campus ministers, and small-group leaders to lead 4 Rivers groups, in bulk. Admin only.
 * Records each address (anyone who already has an account is approved as a leader on the spot, and anyone who signs
 * up later with that address is approved when they do), then emails each person a short invitation.
 *
 *   POST /api/invite-leaders   { emails: string[], approve: boolean, note?: string, lang: "en" | "es" }
 *
 * Recording the invitations needs only the Outreach database update (the database itself checks the caller is an
 * admin). Sending the emails also needs RESEND_API_KEY and REMINDER_FROM like the other emails.
 */
import { bodyOf, header, signedInUser, supabaseUrl, type Env, type Req, type Res } from "./_auth.js";
import { inviteText } from "../src/content/outreachInvite.js";
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
  const { subject, body } = inviteText({ ...opts, to });
  return { to, subject, html: paragraphsHtml(body), text: body };
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "POST") return void res.status(405).json({ error: "post_only" });
  const env: Env = process.env;
  const authorization = header(req, "authorization");
  const user = await signedInUser(authorization, env);
  if (!user) return void res.status(403).json({ error: "admin_only" });

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
  if (!rpc.ok) {
    const why = await rpc.text().catch(() => "");
    return void res.status(/not allowed/i.test(why) ? 403 : 502).json({ error: /not allowed/i.test(why) ? "admin_only" : "not_recorded" });
  }
  const counts = (await rpc.json()) as { total: number; with_account: number; approved_now: number; pending: number };

  // Email each one, if email is set up. The invitations are recorded either way.
  const site = env.SITE_URL ?? "https://four-rivers.vercel.app";
  const sent = env.RESEND_API_KEY ? await sendMailBatch(env, emails.map((to) => inviteMail(to, { approve, note, lang, site }))) : 0;
  res.status(200).json({ ...counts, emailed: sent, emailConfigured: !!env.RESEND_API_KEY });
}
