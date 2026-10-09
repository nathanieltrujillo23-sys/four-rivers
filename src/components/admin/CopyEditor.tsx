import { useMemo, useState, type ReactNode } from "react";
import { copyText, isCopyEdited, resetCopy, saveCopy, useCopy } from "../../lib/copy";
import { Button } from "../ui/Button";
import { TextArea } from "../ui/Field";
import { buildCopyRegistry, type CopyGroup, type CopyItem } from "./copyRegistry";

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

/**
 * Admin, Content: every other piece of site text that can be reworded (quiz explanations, money moments, the home page
 * cards, the discovery workshop, the money toolkit, and the outreach guide). English only. Changes show for everyone at once.
 */
export function CopyEditor() {
  useCopy();
  const [filter, setFilter] = useState("");
  const groups = useMemo<CopyGroup[]>(() => buildCopyRegistry(), []);
  const q = filter.trim().toLowerCase();

  return (
    <section aria-labelledby="copy-title" className="mt-6 flex flex-col gap-3 border-t border-line pt-6">
      <div>
        <h2 id="copy-title" className="t-h3">
          Other text on the site
        </h2>
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          Reword the quiz explanations, money moments, home page cards, the discovery workshop, the money toolkit, and the outreach
          guide. Open a group, change the text, and press Save. "Back to the original" returns the wording that shipped. English only.
        </p>
      </div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search this text"
        aria-label="Search this text"
        className="w-full max-w-sm rounded-lg border border-line bg-surface px-3 py-2 font-[family-name:var(--font-ui)] text-base text-ink focus:border-water focus:outline-none"
      />
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
