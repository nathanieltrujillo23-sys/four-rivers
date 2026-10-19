/**
 * Emails a person once, right after an admin approves their request to become a group leader (or to use Wealth Tools).
 * The Admin dashboard calls this after the approval is saved. Only an admin can call it, and it only acts when the person really
 * is approved and has not been emailed about it yet, so a double click or a repeat call sends nothing more.
 * The in-app notice (the bell) is added by the database itself, so it never depends on this email. Needs SUPABASE_SERVICE_ROLE_KEY
 * and RESEND_API_KEY.
 *
 *   POST /api/approved   { "userId": "<uuid>", "kind": "leader" | "wealth" }
 */
import { bodyOf, emailOf, header, isAdmin, serviceGet, servicePatch, signedInUser, type Env, type Req, type Res } from "./_auth.js";
import { esc, sendMail } from "./_mail.js";

const KINDS = ["leader", "wealth"] as const;
type Kind = (typeof KINDS)[number];

const TEXT = {
  en: {
    leader: {
      subject: "You're approved to lead a group on 4 Rivers",
      lines: ["Good news: an admin approved your request to become a group leader on 4 Rivers.", "You can now create a group from the Community page, share its 4-digit code, and start reading and praying together."],
      action: "Create your first group",
      path: "/community",
    },
    wealth: {
      subject: "You're approved for Wealth Tools on 4 Rivers",
      lines: ["Good news: an admin approved your request to use Wealth Tools on 4 Rivers.", "You can now start a client plan, build a presentation, and prepare for interviews. Everything is private to you, and it is an educational workbench: it is not a way to give investment advice."],
      action: "Open Wealth Tools",
      path: "/community/wealth",
    },
    hi: (n: string) => (n ? `Hi ${n},` : "Hi,"),
  },
  es: {
    leader: {
      subject: "Fuiste aprobado para dirigir un grupo en 4 Rivers",
      lines: ["Buenas noticias: un administrador aprobó tu solicitud para ser líder de grupo en 4 Rivers.", "Ahora puedes crear un grupo desde la página Comunidad, compartir su código de 4 dígitos y empezar a leer y orar juntos."],
      action: "Crea tu primer grupo",
      path: "/community",
    },
    wealth: {
      subject: "Fuiste aprobado para Wealth Tools en 4 Rivers",
      lines: ["Buenas noticias: un administrador aprobó tu solicitud para usar Wealth Tools en 4 Rivers.", "Ahora puedes iniciar un plan de cliente, preparar una presentación y practicar para entrevistas. Todo es privado y es una herramienta educativa: no sirve para dar asesoría de inversión."],
      action: "Abrir Wealth Tools",
      path: "/community/wealth",
    },
    hi: (n: string) => (n ? `Hola, ${n}:` : "Hola:"),
  },
} as const;

export function approvedMail(kind: Kind, name: string, lang: "en" | "es", site: string) {
  const t = TEXT[lang];
  const k = t[kind];
  const url = `${site}${k.path}`;
  return {
    subject: k.subject,
    html: `<p>${esc(t.hi(name))}</p>${k.lines.map((l) => `<p style="line-height:1.5">${esc(l)}</p>`).join("")}<p><a href="${url}">${esc(k.action)}</a></p>`,
    text: `${t.hi(name)}\n\n${k.lines.join("\n\n")}\n\n${k.action}: ${url}`,
  };
}

interface Row {
  status: string;
  notified_at: string | null;
  display_name: string | null;
  full_name: string | null;
  lang: string | null;
}

/** Sends the approval email to one person if they are approved and not yet told. Returns whether an email went out. */
export async function notifyApproved(env: Env, userId: string, kind: Kind): Promise<boolean> {
  const raw = await serviceGet<Record<string, string | null>[]>(
    env,
    `/rest/v1/profiles?select=${kind}_status,${kind}_approved_notified_at,display_name,full_name,reminder_lang&user_id=eq.${encodeURIComponent(userId)}`,
  );
  const r = raw?.[0];
  const p: Row | undefined = r && {
    status: r[`${kind}_status`] ?? "",
    notified_at: r[`${kind}_approved_notified_at`] ?? null,
    display_name: r.display_name ?? null,
    full_name: r.full_name ?? null,
    lang: r.reminder_lang ?? null,
  };
  if (!p || p.status !== "approved" || p.notified_at) return false;
  const to = await emailOf(env, userId);
  if (!to) return false;
  // Mark it before sending so two quick calls cannot send two emails.
  if (!(await servicePatch(env, `/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&${kind}_approved_notified_at=is.null`, { [`${kind}_approved_notified_at`]: new Date().toISOString() }))) return false;
  const mail = approvedMail(kind, p.display_name || p.full_name || "", p.lang === "es" ? "es" : "en", env.SITE_URL ?? "https://four-rivers.vercel.app");
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
  const body = bodyOf<{ userId?: unknown; kind?: unknown }>(req);
  const kind = (KINDS as readonly unknown[]).includes(body?.kind) ? (body!.kind as Kind) : null;
  if (!kind || typeof body?.userId !== "string" || !body.userId) return void res.status(400).json({ error: "bad_request" });
  res.status(200).json({ notified: await notifyApproved(env, body.userId, kind) });
}
