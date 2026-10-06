/**
 * Emails the admins when someone asks to become a group leader. The app calls this right after the request is saved.
 * It only acts when the caller really has a pending request that the admins have not been told about yet.
 * Needs SUPABASE_SERVICE_ROLE_KEY and RESEND_API_KEY.
 *
 *   POST /api/leader-request
 */
import { emailOf, header, serviceGet, servicePatch, signedInUser, type Env, type Req, type Res } from "./_auth.js";
import { esc, sendMail } from "./_mail.js";

interface Profile {
  leader_status: string;
  leader_requested_at: string | null;
  leader_note: string | null;
  leader_request_notified_at: string | null;
  display_name: string | null;
  full_name: string | null;
}

export async function notifyAdmins(env: Env, userId: string, email: string | null): Promise<number> {
  const rows = await serviceGet<Profile[]>(
    env,
    `/rest/v1/profiles?select=leader_status,leader_requested_at,leader_note,leader_request_notified_at,display_name,full_name&user_id=eq.${userId}`,
  );
  const p = rows?.[0];
  if (!p || p.leader_status !== "requested" || !p.leader_requested_at) return 0;
  if (p.leader_request_notified_at && p.leader_request_notified_at >= p.leader_requested_at) return 0;

  const admins = (await serviceGet<{ user_id: string }[]>(env, "/rest/v1/profiles?select=user_id&role=eq.admin")) ?? [];
  const addresses = (await Promise.all(admins.map((a) => emailOf(env, a.user_id)))).filter((e): e is string => !!e);
  if (addresses.length === 0) return 0;

  // Mark it before sending so a double click cannot email twice.
  await servicePatch(env, `/rest/v1/profiles?user_id=eq.${userId}`, { leader_request_notified_at: new Date().toISOString() });
  const who = p.full_name || p.display_name || email || "Someone";
  const site = env.SITE_URL ?? "https://four-rivers.vercel.app";
  const note = p.leader_note ? `\n\nThey wrote: "${p.leader_note}"` : "";
  let sent = 0;
  for (const to of addresses) {
    const ok = await sendMail(env, {
      to,
      subject: `${who} asked to lead a group`,
      html: `<p>${esc(who)}${email ? ` (${esc(email)})` : ""} asked to become a group leader on 4 Rivers.</p>${
        p.leader_note ? `<p>They wrote: “${esc(p.leader_note)}”</p>` : ""
      }<p><a href="${site}/admin">Review it in the Admin dashboard (Leaders tab)</a></p>`,
      text: `${who}${email ? ` (${email})` : ""} asked to become a group leader on 4 Rivers.${note}\n\nReview it: ${site}/admin`,
    });
    if (ok) sent += 1;
  }
  return sent;
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "POST") return void res.status(405).json({ error: "post_only" });
  const env: Env = process.env;
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.RESEND_API_KEY) return void res.status(501).json({ error: "not_configured" });
  const user = await signedInUser(header(req, "authorization"), env);
  if (!user) return void res.status(401).json({ error: "sign_in" });
  res.status(200).json({ notified: await notifyAdmins(env, user.id, user.email) });
}
