import { useEffect, useState } from "react";
import { useCourse } from "../../state/CourseContext";
import type { LeaderInvite } from "../../types";
import { OUTREACH_GUIDE } from "../../content/outreachGuide";
import { inviteText } from "../../content/outreachInvite";
import { callApi } from "../../lib/serverApi";
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY } from "../marketing/Contact";
import { BrandMark } from "../ui/BrandMark";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { Field, TextArea } from "../ui/Field";
import { QrCode } from "../ui/QrCode";

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/** The printable one-page guide for pastors and campus ministries. Only this prints from the Outreach section. */
function GuideSheet({ lang }: { lang: "en" | "es" }) {
  const g = OUTREACH_GUIDE[lang];
  const site = window.location.origin;
  return (
    <article
      aria-label={g.title}
      className="mx-auto w-full max-w-[8.5in] rounded-2xl border-[3px] bg-white p-10 text-[#2c2620] print:max-w-none print:rounded-none print:border-0 print:p-0"
      style={{ borderColor: "#c9a24b" }}
    >
      <header className="flex items-center gap-3">
        <BrandMark size={36} />
        <span className="font-[family-name:var(--font-display)] text-2xl font-semibold">4 Rivers</span>
      </header>
      <h2 className="mt-6 font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight">{g.title}</h2>
      <p className="mt-3 font-[family-name:var(--font-ui)] text-base leading-relaxed text-[#5c5347]">{g.lead}</p>

      <div className="mt-6 flex flex-col gap-5">
        {g.sections.map((s) => (
          <section key={s.heading}>
            <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[#274b6d]">{s.heading}</h3>
            {s.text && <p className="mt-1 font-[family-name:var(--font-ui)] text-sm leading-relaxed text-[#5c5347]">{s.text}</p>}
            {s.items && (
              <ol className="mt-1 list-decimal space-y-1 pl-5 font-[family-name:var(--font-ui)] text-sm leading-relaxed text-[#5c5347]">
                {s.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-6 border-t border-[#e6dcc7] pt-5">
        <div className="font-[family-name:var(--font-ui)] text-sm text-[#5c5347]">
          <p>{g.contactLine}</p>
          <p className="mt-1 font-semibold text-[#2c2620]">
            Nathaniel Trujillo · {CONTACT_EMAIL} · {CONTACT_PHONE_DISPLAY}
          </p>
          <p className="mt-1">{site.replace(/^https?:\/\//, "")}</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <QrCode value={site} size={96} color="#274b6d" label={g.scan} />
          <span className="font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-wide text-[#5c5347]">{g.scan}</span>
        </div>
      </footer>
    </article>
  );
}

/** Opens the invitation in the admin's own email app (addressed by Bcc so no one sees the others), or copies it. */
function SendYourself({
  job,
  copied,
  onCopied,
}: {
  job: { list: string[]; approve: boolean; note: string; lang: "en" | "es" };
  copied: boolean;
  onCopied: (v: boolean) => void;
}) {
  const { subject, body } = inviteText({ approve: job.approve, note: job.note, lang: job.lang, site: window.location.origin });
  const href = `mailto:?bcc=${encodeURIComponent(job.list.join(","))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  // Email apps cut off very long links, so a big list is copied instead.
  const tooLong = href.length > 1900;
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-parchment-deep p-3">
      <p className="font-medium text-ink">Send it from your own email</p>
      <p className="text-ink-soft">
        {job.list.length} {job.list.length === 1 ? "address is" : "addresses are"} ready. The message is written for you, and everyone
        is hidden from each other (Bcc).
        {tooLong ? " The list is long, so copy the addresses and the message and paste them into a new email." : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        {!tooLong && (
          <a href={href}>
            <Button variant="secondary">Open in my email app</Button>
          </a>
        )}
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(`To (Bcc): ${job.list.join(", ")}\nSubject: ${subject}\n\n${body}`);
              onCopied(true);
              window.setTimeout(() => onCopied(false), 1800);
            } catch {
              window.prompt("Copy this", body);
            }
          }}
        >
          {copied ? "Copied" : "Copy addresses and message"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Outreach: tools for growing the number of groups. A printable one-page guide for pastors and campus ministries, and a
 * bulk invitation that approves a list of leaders (existing accounts at once, new ones the moment they sign up).
 */
export function OutreachAdmin() {
  const { repository } = useCourse();
  const [guideLang, setGuideLang] = useState<"en" | "es">("en");
  const [emails, setEmails] = useState("");
  const [note, setNote] = useState("");
  const [approve, setApprove] = useState(true);
  const [lang, setLang] = useState<"en" | "es">("en");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [invites, setInvites] = useState<LeaderInvite[] | null>(null);
  const [invitesError, setInvitesError] = useState(false);
  /** The list just recorded, kept so it can be sent from the admin's own email app when the server can't email. */
  const [toSend, setToSend] = useState<{ list: string[]; approve: boolean; note: string; lang: "en" | "es" } | null>(null);
  const [copied, setCopied] = useState(false);

  const reload = () =>
    repository
      .listLeaderInvites()
      .then(setInvites)
      .catch(() => setInvitesError(true));
  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parsed = [
    ...new Set(
      emails
        .split(/[\n,;]+/)
        .map((x) => (x.match(/<([^>]+)>/)?.[1] ?? x).trim().toLowerCase())
        .filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)),
    ),
  ];
  const count = parsed.length;

  async function send() {
    if (count === 0) return;
    if (
      !window.confirm(
        approve
          ? `Invite ${count} people and approve them as group leaders? Anyone who already has an account is approved right now.`
          : `Invite ${count} people? They will still need to ask for leader status.`,
      )
    )
      return;
    setBusy(true);
    setMessage(null);
    const r = await callApi<{ total?: number; approved_now?: number; pending?: number; emailed?: number; emailConfigured?: boolean; error?: string }>(
      "invite-leaders",
      { emails, approve, note, lang },
    );
    setBusy(false);
    if (!r.ok && r.data?.error === "admin_only") setMessage({ ok: false, text: "Only an admin can send invitations." });
    else if (!r.ok) setMessage({ ok: false, text: `It didn't go through (${r.data?.error ?? r.status}). Run the latest database update and try again.` });
    else {
      const d = r.data!;
      setMessage({
        ok: true,
        text: `Recorded ${d.total}. ${d.approved_now ?? 0} already had an account and ${approve ? "were approved" : "were noted"}; ${d.pending ?? 0} will be set up when they sign up. ${
          d.emailConfigured ? `${d.emailed ?? 0} emails sent.` : "No emails went out from the site, but everyone is saved and is set up as a leader when they sign up. You can send the invitation yourself below."
        }`,
      });
      setToSend(d.emailConfigured ? null : { list: parsed, approve, note, lang });
      setEmails("");
      void reload();
    }
  }

  return (
    <div className="flex flex-col gap-6 font-[family-name:var(--font-ui)] text-sm">
      <Card className="print:hidden">
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-xl">
              <h2 className="t-h4">Guide for churches and campus ministries</h2>
              <p className="text-ink-soft">
                One page you can print or save as a PDF and hand to a pastor, campus minister, or small-group leader. It has your
                contact details and a QR code to the site.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex overflow-hidden rounded-lg border border-line" role="tablist" aria-label="Guide language">
                {(["en", "es"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    role="tab"
                    aria-selected={guideLang === l}
                    onClick={() => setGuideLang(l)}
                    className={`px-3 py-1.5 ${guideLang === l ? "bg-water-deep text-white" : "bg-surface text-ink-soft hover:bg-parchment-deep"}`}
                  >
                    {l === "en" ? "English" : "Español"}
                  </button>
                ))}
              </div>
              <Button onClick={() => window.print()}>Print or save as PDF</Button>
            </div>
          </div>
        </CardBody>
      </Card>
      <GuideSheet lang={guideLang} />

      <Card className="print:hidden">
        <CardBody className="flex flex-col gap-4">
          <div>
            <h2 className="t-h4">Invite leaders in bulk</h2>
            <p className="text-ink-soft">
              Paste a list of email addresses (one per line, or separated by commas). Each person gets a short invitation. With
              approval on, anyone who already has an account becomes a group leader now, and everyone else becomes one the moment
              they sign up with that address.
            </p>
          </div>
          <Field label="Email addresses" hint="Up to 200 at a time. Names like “Pastor Lee <lee@church.org>” work too.">
            <TextArea value={emails} rows={5} onChange={(e) => setEmails(e.target.value)} />
          </Field>
          <Field label="A personal line to add (optional)" hint="Shown in the email after the introduction.">
            <TextArea value={note} rows={2} maxLength={600} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-ink">
              <input type="checkbox" checked={approve} onChange={(e) => setApprove(e.target.checked)} className="h-4 w-4 accent-[var(--color-water-deep)]" />
              Approve them as group leaders automatically
            </label>
            <span className="flex items-center gap-2 text-ink">
              Email language:
              {(["en", "es"] as const).map((l) => (
                <label key={l} className="flex cursor-pointer items-center gap-1">
                  <input type="radio" name="invite-lang" checked={lang === l} onChange={() => setLang(l)} />
                  {l === "en" ? "English" : "Español"}
                </label>
              ))}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={count === 0 || busy} onClick={() => void send()}>
              {busy ? "Sending…" : count > 0 ? `Invite ${count} ${count === 1 ? "person" : "people"}` : "Invite"}
            </Button>
            {message && (
              <span role="status" className={message.ok ? "text-olive" : "text-red-700"}>
                {message.text}
              </span>
            )}
          </div>
          {toSend && <SendYourself job={toSend} copied={copied} onCopied={setCopied} />}
        </CardBody>
      </Card>

      <Card className="print:hidden">
        <CardBody>
          <h2 className="t-h4 mb-2">Invitations</h2>
          {invitesError ? (
            <p className="text-ink-soft">
              Run supabase/migrations/20261008000100_outreach.sql in the Supabase SQL editor to use this section.
            </p>
          ) : !invites ? (
            <p className="text-ink-soft">Loading…</p>
          ) : invites.length === 0 ? (
            <p className="text-ink-soft">None yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {invites.map((i) => (
                <li key={i.email} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="min-w-0 break-all text-ink">{i.email}</span>
                  <span className="flex items-center gap-3 text-xs text-ink-soft">
                    {i.acceptedAt
                      ? `Set up ${dateFmt.format(new Date(i.acceptedAt))}`
                      : `Waiting to sign up · invited ${dateFmt.format(new Date(i.createdAt))}`}
                    {!i.acceptedAt && (
                      <button
                        type="button"
                        className="underline hover:text-red-700"
                        onClick={async () => {
                          await repository.cancelLeaderInvite(i.email);
                          void reload();
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
