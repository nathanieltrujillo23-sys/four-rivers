/**
 * Sends each group leader a weekly summary of their groups. Vercel Cron calls this once a week (see vercel.json)
 * with "Authorization: Bearer $CRON_SECRET". Only leaders and co-leaders get it, and only when they have not
 * turned it off (Edit profile, or the link in the email). For every group it says how many of the week's
 * readings were done, who finished them all and who did none, plus new members and prayer requests.
 *
 * Uses the same environment variables as api/reminders.ts. Anything left unset just turns that channel off.
 * It goes out on Sundays at 14:00 UTC (10 AM Eastern) and covers the seven days before.
 */
import webpush from "web-push";
import { unsubscribeToken } from "./_reminder-token.js";

type Env = Record<string, string | undefined>;

interface Stats {
  members: number;
  new_members: number;
  reading_days: number;
  ticks: number;
  finished_all: string[];
  none: string[];
  new_prayers: number;
  answered: number;
}

interface Row {
  user_id: string;
  email: string | null;
  display_name: string;
  lang: "en" | "es";
  group_id: string;
  group_name: string;
  stats: Stats;
}

export interface Digest {
  userId: string;
  email: string | null;
  name: string;
  lang: "en" | "es";
  groups: { groupId: string; groupName: string; stats: Stats }[];
}

/** One digest per leader, listing each of their groups that had anything to report. */
export function groupDigests(rows: Row[]): Digest[] {
  const byUser = new Map<string, Digest>();
  for (const r of rows) {
    const s = r.stats;
    const quiet = s.reading_days === 0 && s.new_prayers === 0 && s.answered === 0 && s.new_members === 0;
    if (quiet) continue;
    const entry = byUser.get(r.user_id) ?? {
      userId: r.user_id,
      email: r.email,
      name: r.display_name,
      lang: r.lang === "es" ? "es" : "en",
      groups: [],
    };
    entry.groups.push({ groupId: r.group_id, groupName: r.group_name, stats: s });
    byUser.set(r.user_id, entry);
  }
  return [...byUser.values()];
}

const COPY = {
  en: {
    subject: (n: number) => (n === 1 ? "Your group this week" : `Your ${n} groups this week`),
    hi: (name: string) => (name ? `Hi ${name},` : "Hi,"),
    intro: "Here is how your groups did over the past week.",
    readings: (done: number, possible: number, days: number) =>
      `Readings: ${done} of ${possible} ticked off across ${days} reading ${days === 1 ? "day" : "days"}.`,
    finished: (names: string) => `Finished every reading: ${names}.`,
    none: (names: string) => `Haven't read yet this week: ${names}.`,
    members: (n: number) => `${n} new ${n === 1 ? "member" : "members"} joined.`,
    prayers: (n: number, a: number) =>
      `Prayer wall: ${n} new ${n === 1 ? "request" : "requests"}${a > 0 ? `, ${a} marked answered` : ""}.`,
    open: "Open the group",
    off: "Turn off this weekly email",
    foot: "You are getting this because you lead a group in 4 Rivers.",
    pushTitle: "Your group this week",
  },
  es: {
    subject: (n: number) => (n === 1 ? "Tu grupo esta semana" : `Tus ${n} grupos esta semana`),
    hi: (name: string) => (name ? `Hola, ${name}:` : "Hola:"),
    intro: "Así les fue a tus grupos durante la última semana.",
    readings: (done: number, possible: number, days: number) =>
      `Lecturas: ${done} de ${possible} marcadas en ${days} ${days === 1 ? "día" : "días"} de lectura.`,
    finished: (names: string) => `Terminaron todas las lecturas: ${names}.`,
    none: (names: string) => `Aún no han leído esta semana: ${names}.`,
    members: (n: number) => `${n} ${n === 1 ? "miembro nuevo" : "miembros nuevos"}.`,
    prayers: (n: number, a: number) =>
      `Muro de oración: ${n} ${n === 1 ? "petición nueva" : "peticiones nuevas"}${a > 0 ? `, ${a} respondidas` : ""}.`,
    open: "Abrir el grupo",
    off: "Desactivar este correo semanal",
    foot: "Recibes esto porque diriges un grupo en 4 Rivers.",
    pushTitle: "Tu grupo esta semana",
  },
} as const;

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** The sentences that describe one group's week. */
export function groupLines(lang: "en" | "es", s: Stats): string[] {
  const c = COPY[lang];
  const lines: string[] = [];
  if (s.reading_days > 0) {
    lines.push(c.readings(s.ticks, s.members * s.reading_days, s.reading_days));
    if (s.finished_all.length > 0) lines.push(c.finished(s.finished_all.join(", ")));
    if (s.none.length > 0) lines.push(c.none(s.none.join(", ")));
  }
  if (s.new_members > 0) lines.push(c.members(s.new_members));
  if (s.new_prayers > 0 || s.answered > 0) lines.push(c.prayers(s.new_prayers, s.answered));
  return lines;
}

export function digestEmail(d: Digest, site: string, secret: string) {
  const c = COPY[d.lang];
  const off = `${site}/api/unsubscribe?k=digest&u=${d.userId}&t=${unsubscribeToken(d.userId, secret, "digest")}`;
  const html = d.groups
    .map(
      (g) =>
        `<h3 style="margin:1.2em 0 .3em">${esc(g.groupName)}</h3><ul>${groupLines(d.lang, g.stats)
          .map((l) => `<li>${esc(l)}</li>`)
          .join("")}</ul><p><a href="${site}/community/${g.groupId}">${c.open}</a></p>`,
    )
    .join("");
  const text = d.groups
    .map((g) => `${g.groupName}\n${groupLines(d.lang, g.stats).map((l) => `- ${l}`).join("\n")}\n${site}/community/${g.groupId}`)
    .join("\n\n");
  return {
    subject: c.subject(d.groups.length),
    html: `<p>${esc(c.hi(d.name))}</p><p>${c.intro}</p>${html}<p style="color:#666;font-size:12px">${c.foot} <a href="${off}">${c.off}</a>.</p>`,
    text: `${c.hi(d.name)}\n\n${c.intro}\n\n${text}\n\n${c.off}: ${off}`,
    off,
  };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

async function rpc(env: Env, from: string, to: string): Promise<Row[]> {
  const res = await fetch(`${env.VITE_SUPABASE_URL ?? env.SUPABASE_URL}/rest/v1/rpc/leader_digest`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_from: from, p_to: to }),
  });
  if (!res.ok) throw new Error(`leader_digest failed: ${res.status}`);
  return (await res.json()) as Row[];
}

export async function runDigest(env: Env, now = new Date()) {
  const to = iso(new Date(now.getTime() - 86_400_000));
  const from = iso(new Date(now.getTime() - 7 * 86_400_000));
  const site = env.SITE_URL ?? "https://four-rivers.vercel.app";
  const secret = env.CRON_SECRET ?? "";
  const digests = groupDigests(await rpc(env, from, to));
  let emails = 0;
  let pushes = 0;

  for (const d of digests) {
    if (!d.email || !env.RESEND_API_KEY) continue;
    const mail = digestEmail(d, site, secret);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.REMINDER_FROM ?? "4 Rivers <onboarding@resend.dev>",
        to: d.email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        headers: { "List-Unsubscribe": `<${mail.off}>` },
      }),
    });
    if (res.ok) emails += 1;
  }

  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && digests.length > 0) {
    webpush.setVapidDetails(
      env.VAPID_SUBJECT ?? "mailto:admin@four-rivers.vercel.app",
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY,
    );
    const ids = digests.map((d) => d.userId).join(",");
    const res = await fetch(
      `${env.VITE_SUPABASE_URL ?? env.SUPABASE_URL}/rest/v1/push_subscriptions?select=user_id,endpoint,p256dh,auth&user_id=in.(${ids})`,
      { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } },
    );
    const subs = res.ok
      ? ((await res.json()) as { user_id: string; endpoint: string; p256dh: string; auth: string }[])
      : [];
    for (const sub of subs) {
      const d = digests.find((x) => x.userId === sub.user_id);
      if (!d) continue;
      const first = d.groups[0];
      const line = groupLines(d.lang, first.stats)[0] ?? "";
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: COPY[d.lang].pushTitle,
            body: `${first.groupName}: ${line}`,
            url: `/community/${first.groupId}/leader`,
          }),
        );
        pushes += 1;
      } catch {
        // A device that has gone away is cleaned up by the daily reminder run.
      }
    }
  }
  return { from, to, leaders: digests.length, emails, pushes };
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
    res.status(200).json(await runDigest(process.env));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "failed" });
  }
}
