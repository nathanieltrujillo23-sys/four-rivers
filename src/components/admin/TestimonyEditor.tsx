import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Lang } from "../../i18n/LanguageContext";
import {
  defaultText,
  loadText,
  resetText,
  saveText,
  type SiteText,
  type TextKind,
} from "../../lib/siteText";
import { translateToSpanish } from "../../lib/serverApi";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { Field, TextArea, TextInput } from "../ui/Field";

const COPY: Record<TextKind, { title: string; blurb: string; view: string; to: string }> = {
  testimony: {
    title: "My Testimony",
    blurb:
      "The story on the home page. Write it in English: the Spanish version is translated from it automatically each time you save. The Genesis 39:2 quote shows under any paragraph that mentions it.",
    view: "View home page",
    to: "/",
  },
  welcome: {
    title: "Welcome message",
    blurb:
      "Your thank-you to new learners. It appears at the top of their course page for their first two weeks and goes out as a welcome email right after they sign up. Write it in English; Spanish is translated automatically when you save.",
    view: "View course page",
    to: "/course",
  },
};

const pack = (t: SiteText) => [t.title, ...t.paragraphs, t.sign];
const unpack = (out: string[]): SiteText => ({
  title: out[0],
  paragraphs: out.slice(1, -1),
  sign: out[out.length - 1],
});

/**
 * Edits one editable text (the home page testimony, or the welcome message). English is the one you write: saving it
 * translates it to Spanish and saves that too, unless you turn that off. The Spanish tab shows the translation and can
 * still be edited by hand; a hand-edited Spanish text is only replaced after you confirm.
 */
export function SiteTextEditor({ kind }: { kind: TextKind }) {
  const copy = COPY[kind];
  const [lang, setLang] = useState<Lang>("en");
  const [draft, setDraft] = useState<SiteText | null>(null);
  const [edited, setEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncSpanish, setSyncSpanish] = useState(true);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    loadText(kind, lang, true)
      .then((saved) => {
        if (!alive) return;
        setDraft(saved ?? defaultText(kind, lang));
        setEdited(!!saved);
        setMessage(null);
      })
      .catch(() => alive && setDraft(defaultText(kind, lang)));
    return () => {
      alive = false;
    };
  }, [kind, lang]);

  if (!draft) return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading…</p>;

  const update = (patch: Partial<SiteText>) => {
    // Any change to a Spanish text by hand means it is no longer an automatic translation.
    setDraft({ ...draft, ...patch, ...(lang === "es" ? { auto: false } : {}) });
    setMessage(null);
  };
  const setParagraph = (i: number, text: string) =>
    update({ paragraphs: draft.paragraphs.map((p, j) => (j === i ? text : p)) });
  const move = (i: number, by: -1 | 1) => {
    const next = [...draft.paragraphs];
    const j = i + by;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    update({ paragraphs: next });
  };

  const clean = (t: SiteText): SiteText => ({
    title: t.title.trim(),
    sign: t.sign.trim(),
    paragraphs: t.paragraphs.map((p) => p.trim()).filter(Boolean),
    ...(t.auto !== undefined ? { auto: t.auto } : {}),
  });

  /** Translates the English text and saves it as the Spanish version. Returns a short status for the message. */
  async function syncToSpanish(english: SiteText): Promise<string> {
    const existing = await loadText(kind, "es", true);
    if (existing && existing.auto !== true) {
      if (!window.confirm("The Spanish version has been edited by hand. Replace it with a new translation of your English text?"))
        return "The Spanish version was left as it is.";
    }
    const out = await translateToSpanish(pack(english));
    if (!out) return "Spanish was not updated: translation isn't set up yet (see the note below).";
    await saveText(kind, "es", { ...unpack(out), auto: true });
    return "Spanish was translated and saved too.";
  }

  async function save() {
    if (!draft) return;
    const value = clean(draft);
    if (!value.title || value.paragraphs.length === 0) {
      setMessage({ kind: "error", text: "Add a heading and at least one paragraph." });
      return;
    }
    setBusy(true);
    try {
      await saveText(kind, lang, lang === "es" ? { ...value, auto: false } : { ...value, auto: undefined });
      setDraft(value);
      setEdited(true);
      let text = "Saved.";
      if (lang === "en" && syncSpanish) text += ` ${await syncToSpanish(value)}`;
      setMessage({ kind: "ok", text });
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      setMessage({
        kind: "error",
        text: /site_text/.test(text)
          ? "Saving needs a one-time database update (supabase/legacy/019_site_text.sql). Run it in the Supabase SQL editor, then try again."
          : text,
      });
    } finally {
      setBusy(false);
    }
  }

  async function retranslate() {
    setBusy(true);
    try {
      const english = (await loadText(kind, "en", true)) ?? defaultText(kind, "en");
      const out = await translateToSpanish(pack(english));
      if (!out) {
        setMessage({ kind: "error", text: "Translation isn't set up yet (see the note below)." });
        return;
      }
      const value = { ...unpack(out), auto: true };
      await saveText(kind, "es", value);
      setDraft(value);
      setEdited(true);
      setMessage({ kind: "ok", text: "Translated from your English text and saved." });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!window.confirm("Go back to the original text for this language? Your edits will be removed.")) return;
    setBusy(true);
    try {
      await resetText(kind, lang);
      setDraft(defaultText(kind, lang));
      setEdited(false);
      setMessage({ kind: "ok", text: "Back to the original text." });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardBody className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-xl">
            <h2 className="text-lg font-semibold text-ink">{copy.title}</h2>
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{copy.blurb}</p>
          </div>
          <div className="flex overflow-hidden rounded-lg border border-line" role="tablist" aria-label={`${copy.title} language`}>
            {(["en", "es"] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                role="tab"
                aria-selected={lang === l}
                onClick={() => setLang(l)}
                className={`px-4 py-1.5 font-[family-name:var(--font-ui)] text-sm transition-colors ${
                  lang === l ? "bg-water-deep text-white" : "bg-surface text-ink-soft hover:bg-parchment-deep"
                }`}
              >
                {l === "en" ? "English" : "Español"}
              </button>
            ))}
          </div>
        </div>

        {lang === "es" && (
          <p className="rounded-lg bg-parchment-deep/60 px-3 py-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            {draft.auto
              ? "Translated automatically from your English text. You can edit it; then it stays as you wrote it until you translate again."
              : edited
                ? "Written by hand."
                : "The shipped Spanish text. Save English with “translate” on, or press Translate again, to replace it with a translation of yours."}
          </p>
        )}
        {lang === "en" && edited && (
          <p className="font-[family-name:var(--font-ui)] text-xs font-medium text-olive">You have edited this version.</p>
        )}

        <Field label="Heading">
          <TextInput value={draft.title} onChange={(e) => update({ title: e.target.value })} />
        </Field>

        <div className="flex flex-col gap-4">
          {draft.paragraphs.map((text, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                <span>Paragraph {i + 1}</span>
                <span className="flex gap-3">
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="hover:text-ink disabled:opacity-30">
                    Move up
                  </button>
                  <button
                    type="button"
                    disabled={i === draft.paragraphs.length - 1}
                    onClick={() => move(i, 1)}
                    className="hover:text-ink disabled:opacity-30"
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ paragraphs: draft.paragraphs.filter((_, j) => j !== i) })}
                    className="hover:text-red-700"
                  >
                    Remove
                  </button>
                </span>
              </div>
              <TextArea value={text} rows={5} onChange={(e) => setParagraph(i, e.target.value)} aria-label={`Paragraph ${i + 1}`} />
            </div>
          ))}
          <div>
            <Button variant="secondary" onClick={() => update({ paragraphs: [...draft.paragraphs, ""] })}>
              Add a paragraph
            </Button>
          </div>
        </div>

        <Field label="Signature line">
          <TextInput value={draft.sign} onChange={(e) => update({ sign: e.target.value })} />
        </Field>

        {lang === "en" && (
          <label className="flex cursor-pointer items-start gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
            <input
              type="checkbox"
              checked={syncSpanish}
              onChange={(e) => setSyncSpanish(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--color-water-deep)]"
            />
            <span>Translate to Spanish and save it too when I save</span>
          </label>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? "Working…" : "Save changes"}
          </Button>
          {lang === "es" && (
            <Button variant="secondary" disabled={busy} onClick={() => void retranslate()}>
              Translate again from English
            </Button>
          )}
          <Button variant="ghost" disabled={busy || !edited} onClick={() => void reset()}>
            Use the original text
          </Button>
          <Link to={copy.to} className="font-[family-name:var(--font-ui)] text-sm text-water underline">
            {copy.view}
          </Link>
          {message && (
            <span
              role="status"
              className={`font-[family-name:var(--font-ui)] text-sm ${message.kind === "ok" ? "text-olive" : "text-red-700"}`}
            >
              {message.text}
            </span>
          )}
        </div>
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          Automatic translation needs <code>ANTHROPIC_API_KEY</code> in the Vercel settings. Without it, English still saves and
          you can type Spanish by hand.
        </p>
      </CardBody>
    </Card>
  );
}

/** The Testimony tab: the home page testimony and the welcome message for new learners. */
export function TestimonyEditor() {
  return (
    <div className="flex flex-col gap-6">
      <SiteTextEditor kind="testimony" />
      <SiteTextEditor kind="welcome" />
    </div>
  );
}
