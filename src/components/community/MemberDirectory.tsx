import { useCallback, useEffect, useState } from "react";
import { useCourse } from "../../state/CourseContext";
import type { DirectoryEntry } from "../../types";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/Field";
import { labelCls } from "../ib/ibParts";

const BADGES: [keyof Pick<DirectoryEntry, "wealth" | "ib" | "consulting">, string][] = [
  ["wealth", "Wealth"],
  ["ib", "Banking"],
  ["consulting", "Consulting"],
];

/**
 * The member directory: only people who chose to appear, each with one line they wrote and the tool sets they have.
 * No email addresses or contact details are shown; members reach each other in the chat.
 */
export function MemberDirectory() {
  const { repository } = useCourse();
  const [list, setList] = useState<DirectoryEntry[] | null>(null);
  const [show, setShow] = useState(false);
  const [line, setLine] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(true);

  const load = useCallback(async () => {
    try {
      const [l, mine] = await Promise.all([repository.listDirectory(), repository.getDirectoryEntry()]);
      setList(l);
      setShow(mine.show);
      setLine(mine.line);
    } catch {
      setAvailable(false);
      setList([]);
    }
  }, [repository]);
  useEffect(() => {
    void load();
  }, [load]);

  if (!list || !available) return null;

  async function save(nextShow: boolean) {
    setBusy(true);
    try {
      await repository.setDirectoryEntry(nextShow, line);
      setEditing(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="dbp-directory" className="cm-card flex flex-col gap-4 p-5">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="dbp-directory" className="font-[family-name:var(--font-display)] text-lg font-semibold text-ink">
            Members
          </h2>
          {list.length > 0 && <span className="cm-badge tabular-nums">{list.length} listed</span>}
        </div>
        <p className="mt-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">Only people who chose to be listed. No contact details: say hello in the chat.</p>
      </div>
      {list.length === 0 ? (
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Nobody is listed yet. Be the first.</p>
      ) : (
        <ul className="stagger flex flex-col divide-y divide-line">
          {list.map((m) => (
            <li key={m.userId} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <Avatar value={m.avatar} name={m.displayName} size={36} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
                  {m.displayName}
                  {BADGES.filter(([k]) => m[k]).map(([k, label]) => (
                    <span key={k} className="cm-badge">
                      {label}
                    </span>
                  ))}
                </p>
                {m.line && <p className="mt-0.5 font-[family-name:var(--font-ui)] text-xs text-ink-soft">{m.line}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing ? (
        <form
          className="flex flex-col gap-3 border-t border-line pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save(true);
          }}
        >
          <label className={labelCls}>
            One line about you (year, major, what you are working toward)
            <TextInput value={line} maxLength={140} placeholder="e.g. Sophomore, finance. Wealth management track." onChange={(e) => setLine(e.target.value)} />
          </label>
          <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">Other members will see your name, picture, this line and which tool sets you have. Leave out phone numbers and email addresses.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : show ? "Save my line" : "List me"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            {show ? "Edit my line" : "Add me to the directory"}
          </Button>
          {show && (
            <Button variant="ghost" disabled={busy} onClick={() => void save(false)}>
              Remove me
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
