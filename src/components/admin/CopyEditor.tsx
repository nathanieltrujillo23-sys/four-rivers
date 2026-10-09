import { useMemo, useState, type ReactNode } from "react";
import { copyText, isCopyEdited, resetCopy, saveCopy, useCopy } from "../../lib/copy";
import { defaultText } from "../../lib/siteText";
import { Button } from "../ui/Button";
import { TextArea } from "../ui/Field";
import { buildCopyRegistry, type CopyGroup, type CopyItem } from "./copyRegistry";
import { SiteTextEditor } from "./TestimonyEditor";

/** A <details> that only builds its contents once it is opened, so hundreds of boxes are not all on the page at once. */
function Lazy({ title, count, edited, children, level }: { title: string; count: number; edited: number; children: ReactNode; level: 1 | 2 }) {
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(e) => setOpen(e.currentTarget.open)} className={level === 1 ? "rounded-xl border border-line bg-surface/50" : "rounded-lg border border-line/70 bg-surface"}>
      <summary className={`cursor-pointer px-4 py-3 font-semibold text-ink ${level === 1 ? "text-base" : "text-sm"}`}>
        {title} <span className="text-sm font-normal text-ink-soft">({count})</span>
        {edited > 0 && (
          <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 font-[family-name:var(--font-ui)] text-[10px] font-medium uppercase tracking-wide text-[var(--color-gold-text)]">
            {edited} edited
          </span>
        )}
      </summary>
      {open && <div className="flex flex-col gap-3 px-3 pb-3">{children}</div>}
    </details>
  );
}

function ItemEditor({ item }: { item: CopyItem }) {
  useCopy(); // re-render when the saved wording changes
  const current = copyText(item.key, item.def);
  const edited = isCopyEdited(item.key);
  const [draft, setDraft] = useState(current);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const changed = draft.trim() !== current.trim();

  async function run(fn: () => Promise<void>, ok: string, after?: () => void) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      after?.();
      setMsg({ ok: true, text: ok });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't save. Try again." });
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-line/60 p-3">
      <label className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
        <span className="flex items-center gap-2">
          {item.label}
          {edited && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-gold-text)]">Edited</span>}
        </span>
        <TextArea rows={item.rows ?? 2} maxLength={6000} value={draft} onChange={(e) => setDraft(e.target.value)} className="!min-h-0 text-sm" />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" disabled={busy || !changed || !draft.trim()} onClick={() => void run(() => saveCopy(item.key, draft), "Saved")}>
          Save
        </Button>
        {(edited || changed) && (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() =>
              void run(
                () => (edited ? resetCopy(item.key) : Promise.resolve()),
                "Back to the original",
                () => setDraft(item.def),
              )
            }
          >
            Back to the original
          </Button>
        )}
        {msg && (
          <span role="status" className={`font-[family-name:var(--font-ui)] text-xs ${msg.ok ? "text-olive" : "text-red-700"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}

/** What a search is matched against to find the welcome message and the home page testimony. */
function founderTextWords(): string {
  const parts = (["welcome", "testimony"] as const).flatMap((k) => {
    const d = defaultText(k, "en");
    return [d.title, ...d.paragraphs, d.sign];
  });
  return ["welcome message", "welcome to 4 rivers", "testimony", "founder", "email", ...parts].join(" ").toLowerCase();
}

/**
 * Admin, Content: every other piece of site text that can be reworded (quiz explanations, money moments, the home page
 * cards, the discovery workshop, the money toolkit, and the outreach guide). English only. Changes show for everyone at once.
 */
export function CopyEditor({ query }: { query: string }) {
  useCopy();
  const groups = useMemo<CopyGroup[]>(() => buildCopyRegistry(), []);
  const q = query.trim().toLowerCase();
  const showFounder = !q || founderTextWords().includes(q);

  return (
    <section aria-labelledby="copy-title" className="mt-6 flex flex-col gap-3 border-t border-line pt-6">
      <div>
        <h2 id="copy-title" className="t-h3">
          Other text on the site
        </h2>
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          Reword the welcome message, the home page testimony, the quiz explanations, money moments, home page cards, the discovery
          workshop, the money toolkit, and the outreach guide. Open a group, change the text, and press Save. The search box above searches all of it. "Back to the original" returns the wording that shipped. English only.
        </p>
      </div>
      {showFounder && (
        <details open={!!q} className="rounded-xl border border-line bg-surface/50">
          <summary className="cursor-pointer px-4 py-3 text-base font-semibold text-ink">
            Welcome message and home page testimony{" "}
            <span className="text-sm font-normal text-ink-soft">(English and Spanish)</span>
          </summary>
          <div className="flex flex-col gap-4 px-3 pb-3">
            <p className="px-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
              The "Welcome to 4 Rivers" message shows at the top of the course for new learners and is emailed after sign-up. The
              testimony is the founder's story on the home page. Saving the English text translates it to Spanish too. These are the
              same editors as the Testimony tab.
            </p>
            <SiteTextEditor kind="welcome" />
            <SiteTextEditor kind="testimony" />
          </div>
        </details>
      )}
      {groups.map((g) => {
        const subs = g.subgroups
          .map((sg) => ({
            ...sg,
            items: q ? sg.items.filter((i) => `${i.label} ${copyText(i.key, i.def)} ${sg.title}`.toLowerCase().includes(q)) : sg.items,
          }))
          .filter((sg) => sg.items.length > 0);
        if (subs.length === 0) return null;
        const total = subs.reduce((n, sg) => n + sg.items.length, 0);
        const edited = subs.reduce((n, sg) => n + sg.items.filter((i) => isCopyEdited(i.key)).length, 0);
        return (
          <details key={g.id} open={!!q} className="rounded-xl border border-line bg-surface/50">
            <summary className="cursor-pointer px-4 py-3 text-base font-semibold text-ink">
              {g.title} <span className="text-sm font-normal text-ink-soft">({total})</span>
              {edited > 0 && (
                <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 font-[family-name:var(--font-ui)] text-[10px] font-medium uppercase tracking-wide text-[var(--color-gold-text)]">
                  {edited} edited
                </span>
              )}
            </summary>
            <div className="flex flex-col gap-3 px-3 pb-3">
              <p className="px-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">{g.text}</p>
              {subs.map((sg) => (
                <Lazy key={sg.title} title={sg.title} count={sg.items.length} edited={sg.items.filter((i) => isCopyEdited(i.key)).length} level={2}>
                  {sg.items.map((item) => (
                    <ItemEditor key={item.key} item={item} />
                  ))}
                </Lazy>
              ))}
            </div>
          </details>
        );
      })}
    </section>
  );
}
