/**
 * The daily nudge for a new group leader who has not made a group yet. The database picks them (approved at least three days ago, no
 * group, not nudged before), puts a note in their bell, and marks them so it happens once; this sends the matching email.
 * Called from the daily reminders job. Needs SUPABASE_SERVICE_ROLE_KEY; the email also needs RESEND_API_KEY.
 */
import { serviceHeaders, supabaseUrl, type Env } from "./_auth.js";
import { esc, sendMail } from "./_mail.js";

export const NUDGE_AFTER_DAYS = 3;

interface Claimed {
  user_id: string;
  email: string | null;
  display_name: string;
  lang: string;
}

export function nudgeMail(name: string, lang: "en" | "es", site: string) {
  const url = `${site}/community`;
  if (lang === "es") {
    const hi = name ? `Hola, ${name}:` : "Hola:";
    const lines = ["Hace unos días te aprobaron como líder de grupo en 4 Rivers, y todavía no has creado tu primer grupo.", "Solo toma un minuto: ponle nombre, comparte el código de 4 dígitos y tendrás un lugar para leer y orar juntos. Si necesitas ayuda, responde a este correo."];
    return { subject: "Tu primer grupo en 4 Rivers está a un minuto", html: `<p>${esc(hi)}</p>${lines.map((l) => `<p style="line-height:1.5">${esc(l)}</p>`).join("")}<p><a href="${url}">Crea tu primer grupo</a></p>`, text: `${hi}\n\n${lines.join("\n\n")}\n\nCrea tu primer grupo: ${url}` };
  }
  const hi = name ? `Hi ${name},` : "Hi,";
  const lines = ["A few days ago you were approved as a group leader on 4 Rivers, and you have not made your first group yet.", "It takes about a minute: name it, share the 4-digit code, and you have a place to read and pray together. If anything is in the way, just reply and say so."];
  return { subject: "Your first 4 Rivers group is a minute away", html: `<p>${esc(hi)}</p>${lines.map((l) => `<p style="line-height:1.5">${esc(l)}</p>`).join("")}<p><a href="${url}">Create your first group</a></p>`, text: `${hi}\n\n${lines.join("\n\n")}\n\nCreate your first group: ${url}` };
}

/** Nudges leaders who have no group yet. Returns how many were nudged and how many emails went out. */
export async function runLeaderNudges(env: Env): Promise<{ nudged: number; emailed: number }> {
  let rows: Claimed[] = [];
  try {
    const res = await fetch(`${supabaseUrl(env)}/rest/v1/rpc/claim_leader_nudges`, {
      method: "POST",
      headers: serviceHeaders(env),
      body: JSON.stringify({ p_days: NUDGE_AFTER_DAYS }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { nudged: 0, emailed: 0 };
    rows = (await res.json()) as Claimed[];
  } catch {
    return { nudged: 0, emailed: 0 };
  }
  const site = env.SITE_URL ?? "https://four-rivers.vercel.app";
  let emailed = 0;
  for (const r of rows) {
    if (!r.email || !env.RESEND_API_KEY) continue;
    if (await sendMail(env, { to: r.email, ...nudgeMail(r.display_name, r.lang === "es" ? "es" : "en", site) })) emailed += 1;
  }
  return { nudged: rows.length, emailed };
}
