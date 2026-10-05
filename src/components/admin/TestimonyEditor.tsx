import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Lang } from "../../i18n/LanguageContext";
import {
  defaultTestimony,
  loadTestimonyOverride,
  resetTestimony,
  saveTestimony,
  type Testimony,
} from "../../lib/siteText";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { Field, TextArea, TextInput } from "../ui/Field";

/**
 * Edits the home page's "My Testimony" text, one language at a time. Saving
 * replaces what visitors see; "Use the original text" goes back to the text
 * that ships with the app.
 */
export function TestimonyEditor() {
  const [lang, setLang] = useState<Lang>("en");
  const [draft, setDraft] = useState<Testimony | null>(null);
  const [edited, setEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    loadTestimonyOverride(lang, true)
      .then((saved) => {
        if (!alive) return;
        setDraft(saved ?? defaultTestimony(lang));
        setEdited(!!saved);
        setMessage(null);
      })
      .catch(() => alive && setDraft(defaultTestimony(lang)));
    return () => {
      alive = false;
    };
  }, [lang]);

  if (!draft) return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading…</p>;

  const update = (patch: Partial<Testimony>) => {
    setDraft({ ...draft, ...patch });
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

  async function save() {
    if (!draft) return;
    const clean: Testimony = {
      title: draft.title.trim(),
      sign: draft.sign.trim(),
      paragraphs: draft.paragraphs.map((p) => p.trim()).filter(Boolean),
    };
    if (!clean.title || clean.paragraphs.length === 0) {
      setMessage({ kind: "error", text: "Add a heading and at least one paragraph." });
      return;
    }
    setBusy(true);
    try {
      await saveTestimony(lang, clean);
      setDraft(clean);
      setEdited(true);
      setMessage({ kind: "ok", text: "Saved. The home page shows it now." });
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

  async function reset() {
    if (
      !window.confirm("Go back to the original testimony text for this language? Your edits will be removed.")
    )
      return;
    setBusy(true);
    try {
      await resetTestimony(lang);
      setDraft(defaultTestimony(lang));
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
          <div>
            <h2 className="text-lg font-semibold text-ink">My Testimony</h2>
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              The story on the home page. English and Spanish are saved separately, so edit both. The Genesis
              39:2 quote shows under any paragraph that mentions it.
            </p>
          </div>
          <div
            className="flex overflow-hidden rounded-lg border border-line"
            role="tablist"
            aria-label="Language"
          >
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

        {edited && (
          <p className="font-[family-name:var(--font-ui)] text-xs font-medium text-olive">
            You have edited this version.
          </p>
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
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    className="hover:text-ink disabled:opacity-30"
                  >
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
              <TextArea
                value={text}
                rows={5}
                onChange={(e) => setParagraph(i, e.target.value)}
                aria-label={`Paragraph ${i + 1}`}
              />
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

        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
          <Button variant="ghost" disabled={busy || !edited} onClick={() => void reset()}>
            Use the original text
          </Button>
          <Link to="/" className="font-[family-name:var(--font-ui)] text-sm text-water underline">
            View home page
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
      </CardBody>
    </Card>
  );
}
