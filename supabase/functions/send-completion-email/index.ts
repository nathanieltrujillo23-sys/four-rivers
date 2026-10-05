// 4 Rivers — "course completed" email
//
// Deploy: `supabase functions deploy send-completion-email`
// Secret:  `supabase secrets set RESEND_API_KEY=<your Resend API key>`
//
// Triggered by a Supabase Database Webhook on `profiles` (see
// supabase/legacy/009_completion_email_webhook.sql) whenever a row's
// exam_passed_at changes from null to non-null — i.e. the moment someone
// passes the final exam and their certificate unlocks. Sends one
// congratulatory email via Resend (resend.com — free tier is plenty for
// this volume). No email provider is wired up yet; this file is ready to
// deploy once one is.

// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("COMPLETION_EMAIL_FROM") ?? "4 Rivers <onboarding@resend.dev>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://four-rivers.vercel.app";

interface WebhookPayload {
  type: "UPDATE";
  table: "profiles";
  record: { user_id: string; display_name: string | null; exam_passed_at: string | null };
  old_record: { exam_passed_at: string | null };
}

serve(async (req) => {
  if (!RESEND_API_KEY) {
    return new Response("RESEND_API_KEY not set — skipping", { status: 200 });
  }

  const payload = (await req.json()) as WebhookPayload;
  const justPassed = !payload.old_record?.exam_passed_at && !!payload.record?.exam_passed_at;
  if (!justPassed) {
    return new Response("Not a fresh exam pass — ignored", { status: 200 });
  }

  // The webhook payload doesn't include auth.users.email, so look it up with
  // the service role key (available to every edge function automatically).
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${payload.record.user_id}`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  });
  if (!userRes.ok) return new Response("Couldn't look up the user's email", { status: 200 });
  const user = (await userRes.json()) as { email?: string };
  if (!user.email) return new Response("User has no email on file", { status: 200 });

  const name = payload.record.display_name || "friend";
  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: user.email,
      subject: "You finished 4 Rivers!",
      html: `
        <p>Hi ${name},</p>
        <p>You just passed the 4 Rivers Final Exam — every river complete, every principle put into practice.</p>
        <p><a href="${SITE_URL}/certificate">View your certificate</a></p>
        <p>Keep going. Keep counting. Keep saving, investing patiently, and giving. The river is still running.</p>
      `,
    }),
  });

  if (!emailRes.ok) {
    const body = await emailRes.text();
    return new Response(`Resend error: ${body}`, { status: 200 });
  }
  return new Response("Sent", { status: 200 });
});
