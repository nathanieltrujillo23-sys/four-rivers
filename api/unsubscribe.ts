/**
 * One-click "turn off" for the link in every reminder email (and, with k=digest, in the leaders' weekly email).
 *   GET  shows a confirmation page (so mail scanners that fetch links do not unsubscribe anyone)
 *   POST turns email reminders off for that person
 * The link carries a signed token (see _reminder-token.ts), so nobody can switch off someone else's.
 */
import { validUnsubscribeToken } from "./_reminder-token.js";

interface Req {
  method?: string;
  url?: string;
}
interface Res {
  status(code: number): Res;
  setHeader(name: string, value: string): void;
  send(body: string): void;
}

const page = (body: string) =>
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>4 Rivers reminders</title>` +
  `<body style="font-family:Georgia,serif;max-width:30rem;margin:4rem auto;padding:0 1rem;color:#2c2620">${body}</body>`;

export default async function handler(req: Req, res: Res) {
  const params = new URL(req.url ?? "", "http://localhost").searchParams;
  const user = params.get("u") ?? "";
  const token = params.get("t") ?? "";
  const secret = process.env.CRON_SECRET ?? "";
  const digest = params.get("k") === "digest";
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (!secret || !/^[0-9a-f-]{36}$/.test(user) || !validUnsubscribeToken(user, token, secret, digest ? "digest" : "reminders")) {
    res
      .status(400)
      .send(
        page("<h1>That link isn't valid</h1><p>Open 4 Rivers and turn reminders off from Edit profile.</p>"),
      );
    return;
  }
  if (req.method !== "POST") {
    res
      .status(200)
      .send(
        page(
          `<h1>${digest ? "Turn off the weekly group email?" : "Turn off reading reminders?"}</h1><form method="post" action="${req.url}"><button style="font-size:1rem;padding:.6rem 1.2rem">${digest ? "Turn off the weekly email" : "Turn off reminders"}</button></form>`,
        ),
      );
    return;
  }
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    res.status(501).send(page("<h1>Not set up</h1>"));
    return;
  }
  const out = await fetch(`${url}/rest/v1/profiles?user_id=eq.${user}`, {
    method: "PATCH",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(digest ? { digest_emails: false } : { email_reminders: false }),
  });
  res
    .status(out.ok ? 200 : 502)
    .send(
      page(
        out.ok
          ? digest
          ? "<h1>The weekly email is off</h1><p>You can turn it back on any time from Edit profile in 4 Rivers.</p>"
          : "<h1>Reminders are off</h1><p>You can turn them back on any time from Edit profile in 4 Rivers.</p>"
          : "<h1>Something went wrong</h1><p>Please try again.</p>",
      ),
    );
}
