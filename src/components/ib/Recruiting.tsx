import { Button } from "../ui/Button";
import { Select, TextArea, TextInput } from "../ui/Field";
import { Empty, Panel } from "../wealth/parts";
import { labelCls } from "./ibParts";
import { uid } from "../../lib/wealthMath";
import { RECRUIT_STATUSES, type Recruit } from "../../lib/ibWorkspace";

interface Props {
  recruits: Recruit[];
  ready: Record<string, boolean>;
  readiness: { group: string; items: { id: string; text: string }[] }[];
  onRecruits: (next: Recruit[]) => void;
  onReady: (next: Record<string, boolean>) => void;
  /** What a "group" is called at these firms (a banking group, a practice). */
  groupLabel: string;
}

/** The recruiting tracker and readiness checklist both tools share. */
export function Recruiting({ recruits, ready, readiness, onRecruits, onReady, groupLabel }: Props) {
  const upd = (id: string, patch: Partial<Recruit>) => onRecruits(recruits.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const items = readiness.flatMap((g) => g.items);
  const done = items.filter((i) => ready[i.id]).length;
  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Recruiting tracker"
        subtitle="Where you stand with each firm. Take dates and requirements from the firm's own careers page, and note the day you checked: they change."
        actions={
          <Button variant="secondary" disabled={recruits.length >= 60} onClick={() => onRecruits([...recruits, { id: uid(), firm: "", group: "", status: "Researching", deadline: "", notes: "" }])}>
            Add a firm
          </Button>
        }
      >
        {recruits.length === 0 ? (
          <Empty>No firms yet. Add the first one you are interested in.</Empty>
        ) : (
          <ul className="flex flex-col gap-3">
            {recruits.map((r, i) => (
              <li key={r.id} className="grid gap-2 rounded-lg border border-line p-3 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
                <TextInput aria-label={`Firm ${i + 1}`} value={r.firm} placeholder="Firm" onChange={(e) => upd(r.id, { firm: e.target.value })} className="!py-1.5 !text-sm" />
                <TextInput aria-label={`${r.firm || `Firm ${i + 1}`}, ${groupLabel}`} value={r.group} placeholder={groupLabel} onChange={(e) => upd(r.id, { group: e.target.value })} className="!py-1.5 !text-sm" />
                <Select aria-label={`Status at ${r.firm || `firm ${i + 1}`}`} value={r.status} onChange={(e) => upd(r.id, { status: e.target.value })} className="!py-1.5 !text-sm">
                  {RECRUIT_STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
                <TextInput aria-label={`Deadline at ${r.firm || `firm ${i + 1}`}`} type="date" value={r.deadline} onChange={(e) => upd(r.id, { deadline: e.target.value })} className="!py-1.5 !text-sm" />
                <Button variant="ghost" onClick={() => onRecruits(recruits.filter((x) => x.id !== r.id))} aria-label={`Remove ${r.firm || `firm ${i + 1}`}`}>
                  Remove
                </Button>
                <TextInput aria-label={`Notes on ${r.firm || `firm ${i + 1}`}`} value={r.notes} placeholder="Notes: people you spoke to, requirements, date you checked the careers page" maxLength={300} onChange={(e) => upd(r.id, { notes: e.target.value })} className="!py-1.5 !text-sm md:col-span-5" />
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title={`Readiness (${done} of ${items.length})`} subtitle="Tick each one when it is true.">
        <div className="grid gap-5 sm:grid-cols-2">
          {readiness.map((g) => (
            <fieldset key={g.group} className="flex flex-col gap-2">
              <legend className="mb-1 font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-ink-soft">{g.group}</legend>
              {g.items.map((i) => (
                <label key={i.id} className="flex cursor-pointer items-start gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
                  <input type="checkbox" checked={!!ready[i.id]} onChange={(e) => onReady({ ...ready, [i.id]: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[var(--color-water-deep)]" />
                  {i.text}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/** A small labelled text area used for free-text answers in both tools. */
export function Note({ label, value, onChange, rows = 4, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <label className={labelCls}>
      {label}
      <TextArea rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="min-h-16 !text-sm" />
    </label>
  );
}
