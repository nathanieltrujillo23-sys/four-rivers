import { useEffect, useMemo, useState } from "react";
import { useCourse } from "../../state/CourseContext";
import { Button } from "../ui/Button";
import { Select, TextArea, TextInput } from "../ui/Field";
import { Empty, ModuleHead, Panel } from "./parts";
import type { ModuleProps } from "./PlanModules";
import { stepNo } from "./steps";
import { CHECKLIST, checklistProgress } from "../../lib/wealthCompliance";
import { followUpEmail } from "../../lib/wealthFollowUp";
import { fmtDate, normalizePlan, today, uid } from "../../lib/wealthMath";
import { preflight } from "../../lib/wealthPreflight";
import { STAGES, actionSummary, type ActionItem, type StageId } from "../../lib/wealthTrack";
import { diffPlans, type PlanVersion } from "../../lib/wealthVersions";

type Tab = "actions" | "email" | "compliance" | "versions";
const TABS: { id: Tab; label: string }[] = [
  { id: "actions", label: "Stage and action items" },
  { id: "email", label: "Follow-up email" },
  { id: "compliance", label: "Compliance" },
  { id: "versions", label: "Versions" },
];
const labelCls = "flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft";

interface Props extends ModuleProps {
  clientId: string;
  tools: Record<string, unknown>;
  onToolState: (id: string, state: unknown) => void;
}

/** After the meeting: where the client stands, who does what by when, the follow-up email, the compliance record, and saved versions. */
export function FollowUpStep(props: Props) {
  const [tab, setTab] = useState<Tab>("actions");
  const { plan } = props;
  const p = checklistProgress(plan.compliance);
  const s = actionSummary(plan.track, today());
  return (
    <div className="flex flex-col gap-6">
      <ModuleHead step={stepNo("followup")} title="Follow-up and records" desc="Keep track of what each side agreed to do, send a clear follow-up, keep a compliance record, and save a version after each meeting to see what changed." />
      <div role="tablist" aria-label="Follow-up sections" className="flex gap-1 overflow-x-auto rounded-xl bg-parchment-deep p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`fu-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`fu-panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`min-w-[120px] flex-1 whitespace-nowrap rounded-lg px-3 py-2 font-[family-name:var(--font-ui)] text-sm font-medium transition-colors ${tab === t.id ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
          >
            {t.label}
            {t.id === "actions" && s.open > 0 && <span className="ml-1.5 text-xs text-ink-soft">({s.open} open{s.overdue ? `, ${s.overdue} overdue` : ""})</span>}
            {t.id === "compliance" && <span className="ml-1.5 text-xs text-ink-soft">({p.done}/{p.total})</span>}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`fu-panel-${tab}`} aria-labelledby={`fu-tab-${tab}`}>
        {tab === "actions" && <ActionsTab {...props} />}
        {tab === "email" && <EmailTab {...props} />}
        {tab === "compliance" && <ComplianceTab {...props} />}
        {tab === "versions" && <VersionsTab {...props} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ActionsTab({ plan, set }: Props) {
  const t = plan.track;
  const setT = (patch: Partial<typeof t>) => set({ ...plan, track: { ...t, ...patch } });
  const upd = (id: string, patch: Partial<ActionItem>) => setT({ actions: t.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  const td = today();
  return (
    <div className="flex flex-col gap-6">
      <Panel title="Where this client is" subtitle="The stage and the next meeting show on the client list, so you can see everyone at a glance.">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelCls}>
            Stage
            <Select value={t.stage} onChange={(e) => setT({ stage: e.target.value as StageId })}>
              {STAGES.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <label className={labelCls}>
            Next meeting
            <TextInput type="date" value={t.nextMeeting} onChange={(e) => setT({ nextMeeting: e.target.value })} />
          </label>
        </div>
      </Panel>
      <Panel
        title="Action items"
        subtitle="What you said you would do and what the client said they would do, with dates. They go into the follow-up email."
        actions={
          <Button variant="secondary" onClick={() => setT({ actions: [...t.actions, { id: uid(), text: "", owner: "client", due: "", done: false }] })} disabled={t.actions.length >= 40}>
            Add an item
          </Button>
        }
      >
        {t.actions.length === 0 ? (
          <Empty>No action items yet. Add what each side agreed to at the meeting.</Empty>
        ) : (
          <ul className="flex flex-col gap-2">
            {t.actions.map((a, i) => {
              const late = !a.done && a.due && a.due < td;
              return (
                <li key={a.id} className="grid items-center gap-2 sm:grid-cols-[auto_1fr_130px_150px_auto]">
                  <input type="checkbox" aria-label={`Item ${i + 1} done`} checked={a.done} onChange={(e) => upd(a.id, { done: e.target.checked })} className="h-4 w-4 accent-[var(--color-water-deep)]" />
                  <TextInput aria-label={`Item ${i + 1} description`} value={a.text} onChange={(e) => upd(a.id, { text: e.target.value })} placeholder="What needs to happen" className={`!py-1.5 !text-sm ${a.done ? "line-through opacity-60" : ""}`} />
                  <Select aria-label={`Item ${i + 1} owner`} value={a.owner} onChange={(e) => upd(a.id, { owner: e.target.value as ActionItem["owner"] })} className="!py-1.5 !text-sm">
                    <option value="client">Client</option>
                    <option value="me">Me</option>
                  </Select>
                  <TextInput aria-label={`Item ${i + 1} due date`} type="date" value={a.due} onChange={(e) => upd(a.id, { due: e.target.value })} className={`!py-1.5 !text-sm ${late ? "!border-clay" : ""}`} />
                  <Button variant="ghost" onClick={() => setT({ actions: t.actions.filter((x) => x.id !== a.id) })} aria-label={`Remove item ${i + 1}`}>
                    Remove
                  </Button>
                  {late && <span className="font-[family-name:var(--font-ui)] text-xs text-clay-text sm:col-span-5">Overdue since {fmtDate(a.due)}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function EmailTab({ plan, set }: Props) {
  const t = plan.track;
  const draft = useMemo(() => followUpEmail(plan), [plan]);
  const [subject, setSubject] = useState<string | null>(null);
  const [body, setBody] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const shownSubject = subject ?? draft.subject;
  const shownBody = body ?? draft.body;
  const setT = (patch: Partial<typeof t>) => {
    setSubject(null);
    setBody(null);
    set({ ...plan, track: { ...t, ...patch } });
  };
  const mailto = `mailto:${draft.to}?subject=${encodeURIComponent(shownSubject)}&body=${encodeURIComponent(shownBody)}`;
  return (
    <div className="flex flex-col gap-6">
      <Panel title="Follow-up email" subtitle="A draft from the plan: thanks, what you covered, who does what, the next meeting, and the reminder that this is an educational exercise. Edit it, then copy it or open it in your email app. Nothing is sent from here.">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelCls}>
            Tone
            <Select value={t.emailTone} onChange={(e) => setT({ emailTone: e.target.value as typeof t.emailTone })}>
              <option value="friendly">Friendly</option>
              <option value="formal">Formal</option>
            </Select>
          </label>
          <label className={labelCls}>
            An extra paragraph, if you want one
            <TextInput value={t.emailNote} maxLength={400} onChange={(e) => setT({ emailNote: e.target.value })} placeholder="e.g. Bring your latest pay stub next time" />
          </label>
        </div>
        <label className={labelCls}>
          Subject
          <TextInput value={shownSubject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label className={labelCls}>
          Message
          <TextArea rows={16} value={shownBody} onChange={(e) => setBody(e.target.value)} className="!text-sm" />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`Subject: ${shownSubject}\n\n${shownBody}`);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2500);
              } catch {
                setCopied(false);
              }
            }}
          >
            Copy the email
          </Button>
          <a href={mailto} className="rounded-lg border border-line px-4 py-2 font-[family-name:var(--font-ui)] text-sm text-ink hover:bg-parchment-deep">
            Open in my email app
          </a>
          {(subject !== null || body !== null) && (
            <Button variant="ghost" onClick={() => { setSubject(null); setBody(null); }}>
              Start over from the draft
            </Button>
          )}
          <span role="status" className="font-[family-name:var(--font-ui)] text-xs text-water-deep">{copied ? "Copied." : ""}</span>
        </div>
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">Attach the presentation and the handout yourself. Do not put account numbers or other sensitive details in an email.</p>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ComplianceTab({ plan, set }: Props) {
  const c = plan.compliance;
  const setC = (patch: Partial<typeof c>) => set({ ...plan, compliance: { ...c, ...patch } });
  const items = useMemo(() => preflight(plan), [plan]);
  const p = checklistProgress(c);
  return (
    <div className="flex flex-col gap-6">
      <Panel title="Review before you present" subtitle="An automatic check of the wording and the pieces in this plan. It catches common problems; it does not replace your own judgment or your program's rules.">
        <ul className="flex flex-col gap-2">
          {items
            .filter((i) => i.text)
            .map((i) => (
              <li key={i.id} className={`flex items-start gap-3 rounded-lg px-3 py-2 font-[family-name:var(--font-ui)] text-sm ${i.level === "pass" ? "bg-parchment-deep text-ink" : "border border-clay text-ink"}`}>
                <span aria-hidden="true" className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${i.level === "pass" ? "bg-river-1 text-white" : "bg-clay text-white"}`}>
                  {i.level === "pass" ? "✓" : "!"}
                </span>
                <span>
                  <span className="sr-only">{i.level === "pass" ? "Passed: " : "Needs attention: "}</span>
                  {i.text}
                  {i.fix && <span className="block text-xs text-ink-soft">{i.fix}</span>}
                </span>
              </li>
            ))}
        </ul>
      </Panel>
      <Panel
        title={`Your checklist (${p.done} of ${p.total})`}
        subtitle="Confirm each one yourself, once it is true for this client. The date is kept. Nothing here is legal advice; it is a student's practice of professional habits."
      >
        <ul className="flex flex-col gap-3">
          {CHECKLIST.map((i) => (
            <li key={i.id} className="flex flex-col gap-1.5 border-b border-line pb-3 last:border-0">
              <label className="flex cursor-pointer items-start gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
                <input
                  type="checkbox"
                  checked={!!c.done[i.id]}
                  onChange={(e) => {
                    const done = { ...c.done };
                    if (e.target.checked) done[i.id] = today();
                    else delete done[i.id];
                    setC({ done });
                  }}
                  className="mt-0.5 h-4 w-4 accent-[var(--color-water-deep)]"
                />
                <span>
                  {i.text}
                  <span className="block text-xs text-ink-soft">{i.why}</span>
                  {c.done[i.id] && <span className="block text-xs text-water-deep">Confirmed {fmtDate(c.done[i.id])}</span>}
                </span>
              </label>
              <TextInput aria-label={`Note on: ${i.text}`} value={c.notes[i.id] ?? ""} maxLength={200} onChange={(e) => setC({ notes: { ...c.notes, [i.id]: e.target.value } })} placeholder="A note, if any (optional)" className="!py-1.5 !text-sm sm:ml-6" />
            </li>
          ))}
          {c.custom.map((x) => (
            <li key={x.id} className="flex items-center gap-2">
              <input type="checkbox" aria-label="Your item done" checked={x.done} onChange={(e) => setC({ custom: c.custom.map((y) => (y.id === x.id ? { ...y, done: e.target.checked } : y)) })} className="h-4 w-4 accent-[var(--color-water-deep)]" />
              <TextInput aria-label="Your own checklist item" value={x.text} maxLength={160} onChange={(e) => setC({ custom: c.custom.map((y) => (y.id === x.id ? { ...y, text: e.target.value } : y)) })} className="!py-1.5 !text-sm" placeholder="Your own item" />
              <Button variant="ghost" onClick={() => setC({ custom: c.custom.filter((y) => y.id !== x.id) })} aria-label="Remove your item">
                Remove
              </Button>
            </li>
          ))}
        </ul>
        {c.custom.length < 10 && (
          <div>
            <Button variant="secondary" onClick={() => setC({ custom: [...c.custom, { id: uid(), text: "", done: false }] })}>
              Add my own item
            </Button>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function VersionsTab({ plan, set, clientId, tools, onToolState }: Props) {
  const { repository } = useCourse();
  const [versions, setVersions] = useState<PlanVersion[] | null>(null);
  const [label, setLabel] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    repository
      .listWealthVersions(clientId)
      .then((v) => !cancelled && setVersions(v))
      .catch((e: unknown) => !cancelled && (setError(e instanceof Error ? e.message : String(e)), setVersions([])));
    return () => {
      cancelled = true;
    };
  }, [repository, clientId]);

  async function run(job: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await job();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  const reload = async () => setVersions(await repository.listWealthVersions(clientId));

  const save = () =>
    run(async () => {
      await repository.saveWealthVersion(clientId, label.trim() || `Saved ${new Date().toLocaleDateString()}`, plan, tools);
      setLabel("");
      await reload();
      setNote("Version saved.");
    });
  const restore = (v: PlanVersion) =>
    run(async () => {
      // Keep where things stand now, so restoring can be undone.
      await repository.saveWealthVersion(clientId, `Before restoring "${v.label || "a version"}"`, plan, tools);
      set(normalizePlan(v.plan));
      for (const id of new Set([...Object.keys(tools), ...Object.keys(v.tools)])) onToolState(id, v.tools[id] ?? null);
      await reload();
      setNote(`Restored "${v.label || "the version"}". The plan as it was before is saved as a version too.`);
    });
  const remove = (v: PlanVersion) =>
    run(async () => {
      await repository.deleteWealthVersion(v.id);
      await reload();
    });

  const diffs = useMemo(() => {
    if (!versions) return new Map<string, string[]>();
    const m = new Map<string, string[]>();
    versions.forEach((v, i) => {
      const older = versions[i + 1];
      m.set(v.id, older ? diffPlans(older.plan, v.plan, older.tools, v.tools) : []);
    });
    return m;
  }, [versions]);
  const sinceNow = (v: PlanVersion) => diffPlans(v.plan, plan, v.tools, tools);

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Save a version" subtitle="Save one after each meeting. Then you can see what changed since the last one, and go back to an earlier version if you need to (there is room for 30).">
        <div className="flex flex-wrap items-end gap-3">
          <label className={`${labelCls} min-w-[240px] flex-1`}>
            Name
            <TextInput value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. After meeting 1" />
          </label>
          <Button onClick={() => void save()} disabled={busy}>
            Save a version
          </Button>
        </div>
        {error && (
          <p role="alert" className="font-[family-name:var(--font-ui)] text-sm text-red-700">
            {error}
          </p>
        )}
        {note && (
          <p role="status" className="font-[family-name:var(--font-ui)] text-sm text-water-deep">
            {note}
          </p>
        )}
      </Panel>
      <Panel title={`Saved versions${versions ? ` (${versions.length})` : ""}`}>
        {!versions ? (
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading…</p>
        ) : versions.length === 0 ? (
          <Empty>No versions yet. Save one after your first meeting.</Empty>
        ) : (
          <ul className="flex flex-col gap-3">
            {versions.map((v) => {
              const changes = open === v.id ? sinceNow(v) : [];
              const fromPrev = diffs.get(v.id) ?? [];
              return (
                <li key={v.id} className="flex flex-col gap-2 rounded-lg border border-line p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">{v.label || "Untitled version"}</p>
                      <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{new Date(v.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => setOpen(open === v.id ? null : v.id)} aria-expanded={open === v.id} aria-label={`What changed since ${v.label || "this version"}`}>
                        {open === v.id ? "Hide changes since" : "Changes since then"}
                      </Button>
                      <Button variant="secondary" onClick={() => void restore(v)} disabled={busy} aria-label={`Restore ${v.label || "this version"}`}>
                        Restore
                      </Button>
                      <Button variant="ghost" onClick={() => void remove(v)} disabled={busy} aria-label={`Delete ${v.label || "this version"}`}>
                        Delete
                      </Button>
                    </div>
                  </div>
                  {fromPrev.length > 0 && (
                    <div className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                      <p className="font-medium text-ink">Changed from the version before it:</p>
                      <ul className="list-disc pl-5">
                        {fromPrev.slice(0, 8).map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {open === v.id && (
                    <div className="rounded-lg bg-parchment-deep p-3 font-[family-name:var(--font-ui)] text-xs text-ink">
                      <p className="font-medium">Changes from this version to the plan now:</p>
                      {changes.length === 0 ? <p className="text-ink-soft">Nothing in the numbers has changed.</p> : (
                        <ul className="list-disc pl-5">
                          {changes.map((d) => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
