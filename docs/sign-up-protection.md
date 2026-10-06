# Sign-up protection and the welcome emails

Three layers keep fake sign-ups out, and two emails welcome real ones.

## What the app does by itself
- A hidden form field and a short minimum time on the sign-up form stop the simplest scripts.
- Once you add a bot check (below), the sign-in and sign-up forms show a mostly invisible "are you a person?" check.
- Right after a new account first signs in, the server emails them a thank-you with your welcome message (written in the
  Admin dashboard, Testimony tab, and translated to Spanish). The same message appears at the top of their course page
  for their first two weeks. Accounts that already exist are never emailed.
- Sign-up already says "Thank you for signing up! Check your inbox to confirm your email" when confirmation is on.

## 1. Require people to confirm their email (Supabase, 2 minutes)
1. Supabase, then **Authentication**, then **Sign In / Providers**, then **Email**.
2. Turn **Confirm email** on and **Save**.

People must now click the link in their inbox before they can sign in. This alone blocks most throwaway and typo addresses.

## 2. Make the confirmation email warm (optional, 3 minutes)
Supabase, then **Authentication**, then **Email Templates**, then **Confirm signup**. Set the subject to
`Welcome to 4 Rivers: please confirm your email` and replace the body with:

```html
<h2>Thank you for signing up for 4 Rivers!</h2>
<p>We're so glad you're here. One quick step: confirm your email so we know it's really you.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm my email</a></p>
<p>Whatever your situation with money today, you're exactly where you're meant to start. You'll hear from me again as soon as you're in.</p>
<p>— Nathaniel Trujillo, founder of 4 Rivers</p>
```

## 3. Add the bot check (Cloudflare Turnstile, free, 10 minutes)
1. Create a free Cloudflare account at <https://dash.cloudflare.com/sign-up>, then open **Turnstile** and **Add widget**.
   Name it "4 Rivers", add your site's address (`four-rivers.vercel.app`) as the hostname, choose **Managed**.
2. Copy the **Site key** and the **Secret key**.
3. In Vercel (project, **Settings**, **Environment Variables**) add `VITE_TURNSTILE_SITE_KEY` with the site key, then redeploy.
4. In Supabase, **Authentication**, then **Attack Protection**: turn on **Enable CAPTCHA protection**, choose
   **Turnstile**, and paste the secret key. Save.

Do step 4 and step 3 close together: if Supabase checks for a token before the site sends one, sign-in fails until the
redeploy finishes. If anything goes wrong, turn the Supabase setting off to get back in.

## Also needed for the welcome email
The welcome email, announcements, and the leader-request alert all use the same email settings as the reminders:
`RESEND_API_KEY`, `REMINDER_FROM`, `SUPABASE_SERVICE_ROLE_KEY`, and `CRON_SECRET` in Vercel. Resend's free plan sends
100 emails a day and 3,000 a month. Without them the app still works; the emails just are not sent.
