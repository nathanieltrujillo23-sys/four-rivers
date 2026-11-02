/**
 * Emails a person once about an admin's decision on their request: approved (to lead a group, or to use Wealth Tools, Investment
 * Banking Tools or Consulting Tools), or declined, with the admin's reason when there is one. The Admin dashboard calls this after the
 * decision is saved. Only an admin can call it. It finds the notice the database added for the person and sends the email only if that
 * notice has not been emailed yet, marking it first, so a double click or a repeat call sends nothing more.
 * The in-app notice (the bell) is added by the database itself, so it never depends on this email. Needs SUPABASE_SERVICE_ROLE_KEY
 * and RESEND_API_KEY.
 *
 *   POST /api/approved   { "userId": "<uuid>", "kind": "leader" | "wealth" | "ib" | "consulting", "outcome": "approved" | "declined" }
 */
import { bodyOf, emailOf, header, isAdmin, serviceGet, servicePatch, signedInUser, type Env, type Req, type Res } from "./_auth.js";
import { esc, sendMail } from "./_mail.js";

export const KINDS = ["leader", "wealth", "ib", "consulting"] as const;
export type Kind = (typeof KINDS)[number];
export type Outcome = "approved" | "declined";

const NAMES = {
  en: { leader: "group leader", wealth: "Wealth Tools", ib: "Investment Banking Tools", consulting: "Consulting Tools" },
  es: { leader: "líder de grupo", wealth: "Wealth Tools", ib: "Herramientas de banca de inversión", consulting: "Herramientas de consultoría" },
} as const;

const APPROVED = {
  en: {
    leader: { lines: ["Good news: an admin approved your request to become a group leader on 4 Rivers.", "You can now create a group from the Community page, share its 4-digit code, and start reading and praying together."], action: "Create your first group", path: "/community" },
    wealth: { lines: ["Good news: an admin approved your request to use Wealth Tools on 4 Rivers.", "You can now start a client plan, build a presentation, and prepare for interviews. Everything is private to you, and it is an educational workbench: it is not a way to give investment advice."], action: "Open Wealth Tools", path: "/community/wealth" },
    ib: { lines: ["Good news: an admin approved your request to use Investment Banking Tools on 4 Rivers.", "You can now practice valuation (DCF, comparables, LBO, accretion and dilution) and work through technical questions. It is an educational workbench, not a source of advice."], action: "Open Investment Banking Tools", path: "/community/ib" },
    consulting: { lines: ["Good news: an admin approved your request to use Consulting Tools on 4 Rivers.", "You can now practice case frameworks, market sizing, mental math and your stories. It is an educational workbench."], action: "Open Consulting Tools", path: "/community/consulting" },
    hi: (n: string) => (n ? `Hi ${n},` : "Hi,"),
  },
  es: {
    leader: { lines: ["Buenas noticias: un administrador aprobó tu solicitud para ser líder de grupo en 4 Rivers.", "Ahora puedes crear un grupo desde la página Comunidad, compartir su código de 4 dígitos y empezar a leer y orar juntos."], action: "Crea tu primer grupo", path: "/community" },
    wealth: { lines: ["Buenas noticias: un administrador aprobó tu solicitud para usar Wealth Tools en 4 Rivers.", "Ahora puedes iniciar un plan de cliente, preparar una presentación y practicar para entrevistas. Todo es privado y es una herramienta educativa: no sirve para dar asesoría de inversión."], action: "Abrir Wealth Tools", path: "/community/wealth" },
    ib: { lines: ["Buenas noticias: un administrador aprobó tu solicitud para usar las Herramientas de banca de inversión en 4 Rivers.", "Ahora puedes practicar valoración (DCF, comparables, LBO, adquisiciones) y preguntas técnicas. Es una herramienta educativa, no una fuente de asesoría."], action: "Abrir las herramientas de banca de inversión", path: "/community/ib" },
    consulting: { lines: ["Buenas noticias: un administrador aprobó tu solicitud para usar las Herramientas de consultoría en 4 Rivers.", "Ahora puedes practicar marcos de casos, estimación de mercado, cálculo mental y tus historias. Es una herramienta educativa."], action: "Abrir las herramientas de consultoría", path: "/community/consulting" },
    hi: (n: string) => (n ? `Hola, ${n}:` : "Hola:"),
  },
} as const;

const DECLINED = {
  en: {
    subject: (what: string) => `An update on your ${what} request`,
    lines: (what: string, reason: string) => [
      `Thanks for asking about ${what} on 4 Rivers. An admin looked at your request and is not able to approve it right now.`,
      ...(reason ? [`They wrote: “${reason}”`] : []),
      "You are welcome to ask again later, from the Community page.",
    ],
    action: "Back to Community",
  },
  es: {
    subject: (what: string) => `Novedades sobre tu solicitud de ${what}`,
    lines: (what: string, reason: string) => [
      `Gracias por preguntar por ${what} en 4 Rivers. Un administrador revisó tu solicitud y por ahora no puede aprobarla.`,
      ...(reason ? [`Escribió: “${reason}”`] : []),
      "Puedes volver a solicitarlo más adelante, desde la página Comunidad.",
    ],
    action: "Volver a Comunidad",
  },
} as const;

export function decisionMail(kind: Kind, outcome: Outcome, name: string, lang: "en" | "es", site: string, reason = "") {
  const t = APPROVED[lang];
  const what = NAMES[lang][kind];
  if (outcome === "approved") {
    const k = t[kind];
    const url = `${site}${k.path}`;
    return {
      subject: lang === "es" ? `Fuiste aprobado para ${what} en 4 Rivers` : `You're approved for ${what} on 4 Rivers`,
      html: `<p>${esc(t.hi(name))}</p>${k.lines.map((l) => `<p style="line-height:1.5">${esc(l)}</p>`).join("")}<p><a href="${url}">${esc(k.action)}</a></p>`,
      text: `${t.hi(name)}\n\n${k.lines.join("\n\n")}\n\n${k.action}: ${url}`,
    };
  }
  const d = DECLINED[lang];
  const lines = d.lines(what, reason);
  const url = `${site}/community`;
  return {
    subject: d.subject(what),
    html: `<p>${esc(t.hi(name))}</p>${lines.map((l) => `<p style="line-height:1.5">${esc(l)}</p>`).join("")}<p><a href="${url}">${esc(d.action)}</a></p>`,
    text: `${t.hi(name)}\n\n${lines.join("\n\n")}\n\n${d.action}: ${url}`,
  };
}

/** Sends the email for the person's newest notice of this decision, once. Returns whether an email went out. */
export async function notifyDecision(env: Env, userId: string, kind: Kind, outcome: Outcome): Promise<boolean> {
  const enc = encodeURIComponent(userId);
  const notices = await serviceGet<{ id: string; note: string | null }[]>(
    env,
    `/rest/v1/account_notices?select=id,note&user_id=eq.${enc}&kind=eq.${kind}_${outcome}&emailed_at=is.null&order=created_at.desc&limit=1`,
  );
  const notice = notices?.[0];
  if (!notice) return false;
  const profiles = await serviceGet<Record<string, string | null>[]>(env, `/rest/v1/profiles?select=${kind}_status,display_name,full_name,reminder_lang&user_id=eq.${enc}`);
  const p = profiles?.[0];
  if (!p) return false;
  // An approval that has since been taken back is not worth an email.
  if (outcome === "approved" && p[`${kind}_status`] !== "approved") return false;
  const to = await emailOf(env, userId);
  if (!to) return false;
  // Mark it before sending so two quick calls cannot send two emails.
  if (!(await servicePatch(env, `/rest/v1/account_notices?id=eq.${notice.id}&emailed_at=is.null`, { emailed_at: new Date().toISOString() }))) return false;
  const mail = decisionMail(kind, outcome, p.display_name || p.full_name || "", p.reminder_lang === "es" ? "es" : "en", env.SITE_URL ?? "https://four-rivers.vercel.app", notice.note ?? "");
  return sendMail(env, { to, ...mail });
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "POST") return void res.status(405).json({ error: "post_only" });
  const env: Env = process.env;
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.RESEND_API_KEY) return void res.status(501).json({ error: "not_configured" });
  const user = await signedInUser(header(req, "authorization"), env);
  if (!user) return void res.status(401).json({ error: "sign_in" });
  if (!(await isAdmin(user.id, env))) return void res.status(403).json({ error: "admin_only" });
  const body = bodyOf<{ userId?: unknown; kind?: unknown; outcome?: unknown }>(req);
  const kind = (KINDS as readonly unknown[]).includes(body?.kind) ? (body!.kind as Kind) : null;
  const outcome: Outcome = body?.outcome === "declined" ? "declined" : "approved";
  if (!kind || typeof body?.userId !== "string" || !body.userId) return void res.status(400).json({ error: "bad_request" });
  res.status(200).json({ notified: await notifyDecision(env, body.userId, kind, outcome) });
}
