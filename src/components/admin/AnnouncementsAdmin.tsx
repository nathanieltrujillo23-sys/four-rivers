import { useEffect, useState } from "react";
import { useCourse } from "../../state/CourseContext";
import type { Announcement } from "../../types";
import { callApi, translateToSpanish } from "../../lib/serverApi";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { Field, TextArea, TextInput } from "../ui/Field";

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

const NOT_SET_UP =
  "Email isn't set up yet. It needs RESEND_API_KEY, REMINDER_FROM, SUPABASE_SERVICE_ROLE_KEY and CRON_SECRET in the Vercel settings.";

/** Write one email and send it to all group leaders, or to everyone with an account. */
export function AnnouncementsAdmin() {
  const { repository } = useCourse();
  const [audience, setAudience] = useState<"leaders" | "everyone">("leaders");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [translate, setTranslate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [history, setHistory] = useState<Announcement[] | null>(null);
  const [historyError, setHistoryError] = useState(false);

  const loadHistory = () =>
    repository
      .listAnnouncements()
      .then(setHistory)
      .catch(() => setHistoryError(true));
  useEffect(() => {
    void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ready = subject.trim().length > 0 && body.trim().length > 0;

  async function send(test: boolean) {
    if (!ready) return;
    const who = audience === "leaders" ? "every group leader" : "everyone with an account";
    if (!test && !window.confirm(`Send this email to ${who}? It can't be taken back.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      let es: { subjectEs?: string; bodyEs?: string } = {};
      if (translate) {
        const out = await translateToSpanish([subject.trim(), body.trim()]);
        if (out) es = { subjectEs: out[0], bodyEs: out[1] };
      }
      const r = await callApi<{ recipients?: number; sent?: number; error?: string }>("announce", {
        audience,
        subject: subject.trim(),
        body: body.trim(),
        test,
        ...es,
      });
      if (r.status === 501) setMessage({ ok: false, text: NOT_SET_UP });
      else if (!r.ok) setMessage({ ok: false, text: `It didn't send (${r.data?.error ?? r.status}).` });
      else if (test) setMessage({ ok: true, text: "Test email sent to you. Check your inbox." });
      else {
        setMessage({
          ok: true,
          text: `Sent to ${r.data?.sent ?? 0} of ${r.data?.recipients ?? 0} people.${es.bodyEs ? " Spanish readers got the Spanish version." : ""}`,
        });
        setSubject("");
        setBody("");
        void loadHistory();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardBody className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Send an announcement</h2>
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              One email to all group leaders, or to everyone. People can stop announcement emails from the link in the email or in
              Edit profile, and they are skipped after that. Send yourself a test first.
            </p>
          </div>

          <fieldset className="flex flex-wrap gap-3 font-[family-name:var(--font-ui)] text-sm">
            <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-soft">Send to</legend>
            {(
              [
                ["leaders", "Group leaders (and co-leaders)"],
                ["everyone", "Everyone with an account"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
                <input type="radio" name="audience" checked={audience === value} onChange={() => setAudience(value)} />
                {label}
              </label>
            ))}
          </fieldset>

          <Field label="Subject">
            <TextInput value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field label="Message" hint="Separate paragraphs with a blank line. Each person's name is added to the greeting.">
            <TextArea value={body} rows={8} maxLength={5000} onChange={(e) => setBody(e.target.value)} />
          </Field>

          <label className="flex cursor-pointer items-start gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
            <input
              type="checkbox"
              checked={translate}
              onChange={(e) => setTranslate(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--color-water-deep)]"
            />
            <span>Translate it for people who use 4 Rivers in Spanish</span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" disabled={!ready || busy} onClick={() => void send(true)}>
              Send me a test
            </Button>
            <Button disabled={!ready || busy} onClick={() => void send(false)}>
              {busy ? "Working…" : "Send to everyone selected"}
            </Button>
            {message && (
              <span role="status" className={`font-[family-name:var(--font-ui)] text-sm ${message.ok ? "text-olive" : "text-red-700"}`}>
                {message.text}
              </span>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="mb-2 text-lg font-semibold text-ink">Sent so far</h2>
          {historyError ? (
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              Run supabase/migrations/20261006000200_prayer_alerts_announcements_stats.sql in the Supabase SQL editor to see the history.
            </p>
          ) : !history ? (
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading…</p>
          ) : history.length === 0 ? (
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Nothing sent yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line font-[family-name:var(--font-ui)] text-sm">
              {history.map((a) => (
                <li key={a.id} className="py-2">
                  <p className="font-medium text-ink">{a.subject}</p>
                  <p className="text-xs text-ink-soft">
                    {dateFmt.format(new Date(a.createdAt))} · to {a.audience === "leaders" ? "group leaders" : "everyone"} ·{" "}
                    {a.sentCount} sent
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
