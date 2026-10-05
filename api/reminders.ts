/**
 * Sends the daily reading reminders. Vercel Cron calls this once a day (see vercel.json) with
 * "Authorization: Bearer $CRON_SECRET". For everyone whose group has a reading today that they have not
 * marked, and who asked for a reminder, it sends an email and/or a notification to their devices.
 *
 * Environment variables (Vercel project settings):
 *   CRON_SECRET                  any long random string; Vercel sends it, and it signs unsubscribe links
 *   SUPABASE_SERVICE_ROLE_KEY    server only; lets this function read who needs a reminder
 *   VITE_SUPABASE_URL            already set for the app
 *   RESEND_API_KEY, REMINDER_FROM    email through resend.com (REMINDER_FROM like "4 Rivers <hello@yourdomain>")
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT    device notifications; make keys with `npx web-push generate-vapid-keys`
 *   SITE_URL                     optional, defaults to https://four-rivers.vercel.app
 * Anything left unset just turns that channel off. Reminders go out at 12:00 UTC (8 AM Eastern).
 */
import webpush from "web-push";
import { passagesInSpanish } from "./_book-names.js";
import { unsubscribeToken } from "./_reminder-token.js";

type Env = Record<string, string | undefined>;

interface Row {
  user_id: string;
  email: string | null;
  display_name: string;
  group_id: string;
  group_name: string;
  passages: string;
  wants_email: boolean;
  lang: "en" | "es";
}

export interface Reminder {
  userId: string;
  email: string | null;
  name: string;
  wantsEmail: boolean;
  lang: "en" | "es";
  items: { groupId: string; groupName: string; passages: string }[];
}

/** One reminder per person, listing each group that has an unmarked reading today. */
export function groupRows(rows: Row[]): Reminder[] {
  const byUser = new Map<string, Reminder>();
  for (const r of rows) {
    const entry = byUser.get(r.user_id) ?? {
      userId: r.user_id,
      email: r.email,
      name: r.display_name,
      wantsEmail: r.wants_email,
      lang: r.lang === "es" ? "es" : "en",
      items: [],
    };
    entry.items.push({ groupId: r.group_id, groupName: r.group_name, passages: r.passages });
    byUser.set(r.user_id, entry);
  }
  return [...byUser.values()];
}

const COPY = {
  en: {
    subject: (n: number, first: string) =>
      n === 1 ? `Today's reading: ${first}` : `You have ${n} readings today`,
    hi: (name: string) => (name ? `Hi ${name},` : "Hi,"),
    line: "You haven't marked today's reading yet:",
    open: "Open the group",
    off: "Turn off these reminders",
    foot: "You are getting this because you turned on reading reminders in 4 Rivers.",
    pushTitle: "Today's reading",
  },
  es: {
    subject: (n: number, first: string) =>
      n === 1 ? `Lectura de hoy: ${first}` : `Tienes ${n} lecturas hoy`,
    hi: (name: string) => (name ? `Hola, ${name}:` : "Hola:"),
    line: "Todavía no has marcado la lectura de hoy:",
    open: "Abrir el grupo",
    off: "Desactivar estos recordatorios",
    foot: "Recibes esto porque activaste los recordatorios de lectura en 4 Rivers.",
    pushTitle: "Lectura de hoy",
  },
} as const;

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function emailFor(r: Reminder, site: string, secret: string) {
  const c = COPY[r.lang];
  const shown = (p: string) => (r.lang === "es" ? passagesInSpanish(p) : p);
  const off = `${site}/api/unsubscribe?u=${r.userId}&t=${unsubscribeToken(r.userId, secret)}`;
  const items = r.items
    .map(
      (i) =>
        `<li><strong>${esc(i.groupName)}</strong>: ${esc(shown(i.passages))} (<a href="${site}/community/${i.groupId}">${c.open}</a>)</li>`,
    )
    .join("");
  return {
    subject: c.subject(r.items.length, shown(r.items[0].passages)),
    html: `<p>${esc(c.hi(r.name))}</p><p>${c.line}</p><ul>${items}</ul><p style="color:#666;font-size:12px">${c.foot} <a href="${off}">${c.off}</a>.</p>`,
    text: `${c.hi(r.name)}\n\n${c.line}\n${r.items.map((i) => `- ${i.groupName}: ${shown(i.passages)} ${site}/community/${i.groupId}`).join("\n")}\n\n${c.off}: ${off}`,
    off,
  };
}

async function rpc(env: Env, date: string): Promise<Row[]> {
  const res = await fetch(`${env.VITE_SUPABASE_URL ?? env.SUPABASE_URL}/rest/v1/rpc/reminders_due`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_date: date }),
  });
  if (!res.ok) throw new Error(`reminders_due failed: ${res.status}`);
  return (await res.json()) as Row[];
}

export async function runReminders(env: Env, now = new Date()) {
  const date = now.toISOString().slice(0, 10);
  const site = env.SITE_URL ?? "https://four-rivers.vercel.app";
  const secret = env.CRON_SECRET ?? "";
  const reminders = groupRows(await rpc(env, date));
  let emails = 0;
  let pushes = 0;

  for (const r of reminders) {
    if (r.wantsEmail && r.email && env.RESEND_API_KEY) {
      const mail = emailFor(r, site, secret);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: env.REMINDER_FROM ?? "4 Rivers <onboarding@resend.dev>",
          to: r.email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          headers: { "List-Unsubscribe": `<${mail.off}>` },
        }),
      });
      if (res.ok) emails += 1;
    }
  }

  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && reminders.length > 0) {
    webpush.setVapidDetails(
      env.VAPID_SUBJECT ?? "mailto:admin@four-rivers.vercel.app",
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY,
    );
    const ids = reminders.map((r) => r.userId).join(",");
    const res = await fetch(
      `${env.VITE_SUPABASE_URL ?? env.SUPABASE_URL}/rest/v1/push_subscriptions?select=id,user_id,endpoint,p256dh,auth&user_id=in.(${ids})`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      },
    );
    const subs = res.ok
      ? ((await res.json()) as {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
        }[])
      : [];
    for (const sub of subs) {
      const r = reminders.find((x) => x.userId === sub.user_id);
      if (!r) continue;
      const c = COPY[r.lang];
      const first = r.items[0];
      const body = `${first.groupName}: ${r.lang === "es" ? passagesInSpanish(first.passages) : first.passages}`;
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: c.pushTitle, body, url: `/community/${first.groupId}` }),
        );
        pushes += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // The device unsubscribed; forget it.
          await fetch(
            `${env.VITE_SUPABASE_URL ?? env.SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${sub.id}`,
            {
              method: "DELETE",
              headers: {
                apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
                Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
              },
            },
          );
        }
      }
    }
  }
  return { date, people: reminders.length, emails, pushes };
}

interface Req {
  headers: Record<string, string | string[] | undefined>;
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
}

export default async function handler(req: Req, res: Res) {
  const auth = req.headers.authorization;
  const header = Array.isArray(auth) ? auth[0] : auth;
  if (!process.env.CRON_SECRET || header !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(501).json({ error: "not_configured" });
    return;
  }
  try {
    res.status(200).json(await runReminders(process.env));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "failed" });
  }
}
