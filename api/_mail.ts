import type { Env } from "./_auth.js";

export const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Plain paragraphs (separated by blank lines) as simple HTML. */
export const paragraphsHtml = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => `<p style="line-height:1.5">${esc(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Adds a List-Unsubscribe header. */
  unsubscribe?: string;
}

const from = (env: Env) => env.REMINDER_FROM ?? "4 Rivers <onboarding@resend.dev>";

/** Sends one email through Resend. False when Resend is not set up or refuses it. */
export async function sendMail(env: Env, mail: Mail): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: from(env),
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        ...(mail.unsubscribe ? { headers: { "List-Unsubscribe": `<${mail.unsubscribe}>` } } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Sends many emails (Resend takes up to 100 per call). Returns how many were accepted. */
export async function sendMailBatch(env: Env, mails: Mail[]): Promise<number> {
  if (!env.RESEND_API_KEY) return 0;
  let sent = 0;
  for (let i = 0; i < mails.length; i += 100) {
    const chunk = mails.slice(i, i + 100);
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(
          chunk.map((m) => ({
            from: from(env),
            to: m.to,
            subject: m.subject,
            html: m.html,
            text: m.text,
            ...(m.unsubscribe ? { headers: { "List-Unsubscribe": `<${m.unsubscribe}>` } } : {}),
          })),
        ),
      });
      if (res.ok) sent += chunk.length;
    } catch {
      // that group of emails is skipped; the count tells the admin how many went out
    }
  }
  return sent;
}
