import { useCallback, useEffect, useRef, useState } from "react";
import { useCourse } from "../../../state/CourseContext";
import type { DiscoveryMeeting, Group } from "../../../types";
import { Button } from "../../ui/Button";
import { Card, CardBody } from "../../ui/Card";
import { Field, TextArea, TextInput } from "../../ui/Field";
import { AgreementPanel } from "./AgreementPanel";
import { ScenarioToolkit } from "./ScenarioToolkit";
import { isToolId, type ToolId } from "./toolCatalog";
import { summarizeTool } from "./toolSummaries";
import { MISSION_VERSE, SWOT_GRID, TOPICS, WORKSHOP_STEPS, meetingSummary } from "./workshopContent";

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * The six-step Discovery workshop (Daily Bread): an analyst meets one person, asks the questions for each step, and
 * takes notes here. The notes autosave, and only the analyst who took them (and the group's owner) can read them.
 */
export function DiscoveryWorkshop({ group }: { group: Group }) {
  const { repository } = useCourse();
  const [meetings, setMeetings] = useState<DiscoveryMeeting[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    repository
      .listDiscoveryMeetings(group.id)
      .then((rows) => alive && setMeetings(rows))
      .catch((e) => {
        if (!alive) return;
        setMeetings([]);
        setError(e instanceof Error ? e.message : "Couldn't load your meetings.");
      });
    return () => {
      alive = false;
    };
  }, [repository, group.id]);

  async function start() {
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const m = await repository.createDiscoveryMeeting(group.id, newName);
      setMeetings((prev) => [m, ...(prev ?? [])]);
      setOpenId(m.id);
      setNewName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the meeting.");
    }
    setBusy(false);
  }

  const open = meetings?.find((m) => m.id === openId) ?? null;

  return (
    <section data-tour="workshop" aria-labelledby="workshop-title" className="flex flex-col gap-4">
      <Card accent="var(--color-gold)">
        <CardBody className="flex flex-col gap-4">
          <div>
            <p className="t-eyebrow">For analysts</p>
            <h2 id="workshop-title" className="t-h3">
              Discovery workshop
            </h2>
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              Six steps for a discovery meeting. Take notes as you talk; they save as you type. These notes are confidential: only
              you (and the group's owner) can see them, and they are never shown to the group.
            </p>
          </div>

          {!open && (
            <>
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void start();
                }}
              >
                <Field label="Who are you meeting with?" className="min-w-56 flex-1">
                  <TextInput value={newName} maxLength={80} onChange={(e) => setNewName(e.target.value)} placeholder="Their name" />
                </Field>
                <Button type="submit" disabled={busy || !newName.trim()}>
                  Start a discovery meeting
                </Button>
              </form>
              {error && (
                <p role="alert" className="font-[family-name:var(--font-ui)] text-sm text-clay">
                  {error}
                </p>
              )}
              {meetings === null ? (
                <p className="text-sm text-ink-soft">Loading…</p>
              ) : meetings.length === 0 ? (
                <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">No meetings yet.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
                  {meetings.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setOpenId(m.id)}
                        className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-parchment-deep/40"
                      >
                        <span className="font-semibold text-ink">{m.participantName}</span>
                        <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                          {m.agreement ? "Agreement signed" : "Agreement not signed"} · Step {m.step + 1} of 6 ·{" "}
                          {new Date(m.updatedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {open && (
        <Meeting
          key={open.id}
          meeting={open}
          onChange={(m) => setMeetings((prev) => (prev ?? []).map((x) => (x.id === m.id ? m : x)))}
          onClose={() => setOpenId(null)}
          onDelete={async () => {
            await repository.deleteDiscoveryMeeting(open.id);
            setMeetings((prev) => (prev ?? []).filter((x) => x.id !== open.id));
            setOpenId(null);
          }}
        />
      )}
    </section>
  );
}

function Meeting({
  meeting,
  onChange,
  onClose,
  onDelete,
}: {
  meeting: DiscoveryMeeting;
  onChange: (m: DiscoveryMeeting) => void;
  onClose: () => void;
  onDelete: () => Promise<void>;
}) {
  const { repository, snapshot } = useCourse();
  const [m, setM] = useState(meeting);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("idle");
  const [copied, setCopied] = useState(false);
  const latest = useRef(m);
  const timer = useRef<number | null>(null);
  const dirty = useRef(false);

  const flush = useCallback(async () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current) return;
    dirty.current = false;
    setSave("saving");
    try {
      await repository.saveDiscoveryMeeting(latest.current);
      onChange(latest.current);
      setSave("saved");
    } catch {
      dirty.current = true;
      setSave("error");
    }
  }, [repository, onChange]);

  // Save what was typed a moment after typing stops, and once more when the meeting is closed.
  const update = useCallback(
    (patch: Partial<DiscoveryMeeting>) => {
      const next = { ...latest.current, ...patch };
      latest.current = next;
      setM(next);
      dirty.current = true;
      setSave("idle");
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), 800);
    },
    [flush],
  );
  useEffect(
    () => () => {
      if (dirty.current) void repository.saveDiscoveryMeeting(latest.current).catch(() => {});
      if (timer.current) window.clearTimeout(timer.current);
    },
    [repository],
  );

  const answer = (key: string) => m.answers[key] ?? "";
  const setAnswer = (key: string, value: string) => update({ answers: { ...latest.current.answers, [key]: value } });
  const step = WORKSHOP_STEPS[m.step];
  const goTo = (i: number) => update({ step: Math.max(0, Math.min(5, i)) });

  // The numbers typed into each tool are kept with the meeting, as is which tools go on the PDF.
  const toolStates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(m.answers)) {
    if (!k.startsWith("tool.")) continue;
    try {
      toolStates[k.slice(5)] = JSON.parse(v);
    } catch {
      /* a damaged saved tool is ignored; the tool starts fresh */
    }
  }
  const pdfTools = (m.answers["pdf.tools"] ?? "").split(",").filter((id): id is ToolId => isToolId(id));
  const saveToolState = useCallback(
    (id: string, state: unknown) => {
      const a = latest.current.answers;
      update({ answers: { ...a, [`tool.${id}`]: JSON.stringify(state) } });
    },
    [update],
  );
  const togglePdfTool = (id: string) => {
    const has = pdfTools.includes(id as ToolId);
    if (!has && pdfTools.length >= 3) return;
    const next = has ? pdfTools.filter((t) => t !== id) : [...pdfTools, id as ToolId];
    setAnswer("pdf.tools", next.join(","));
  };

  async function downloadPdf() {
    setPdfBusy(true);
    setPdfError(null);
    try {
      await flush();
      const { buildMeetingPdf } = await import("../../../lib/meetingPdf");
      const { doc, filename } = await buildMeetingPdf({
        meeting: latest.current,
        analystName: latest.current.agreement?.analystName || snapshot?.profile.fullName || snapshot?.profile.displayName || "",
        tools: pdfTools.map((id) => summarizeTool(id, toolStates[id])),
      });
      doc.save(filename);
    } catch {
      setPdfError("Couldn't make the PDF. Try again.");
    }
    setPdfBusy(false);
  }

  function toggleTopic(id: string) {
    const has = m.topics.includes(id);
    update({ topics: has ? m.topics.filter((t) => t !== id) : [...m.topics, id] });
  }

  return (
    <Card>
      <CardBody className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="t-eyebrow">Discovery meeting</p>
            <h3 className="t-h3">{m.participantName}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
            <span role="status" aria-live="polite">
              {save === "saving" ? "Saving…" : save === "saved" ? "Saved" : save === "error" ? "Couldn't save. Trying again when you type." : ""}
            </span>
            <Button
              variant="ghost"
              onClick={async () => {
                await flush();
                onClose();
              }}
            >
              Back to meetings
            </Button>
          </div>
        </div>

        <AgreementPanel
          agreement={m.agreement}
          participantName={m.participantName}
          onSign={(agreement) => update({ agreement })}
          onUnsign={() => update({ agreement: null })}
        />

        <nav aria-label="Workshop steps">
          <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {WORKSHOP_STEPS.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={i === m.step ? "step" : undefined}
                  className={`flex h-full w-full items-center gap-2 rounded-lg border px-3 py-2 text-left font-[family-name:var(--font-ui)] text-xs ${
                    i === m.step ? "border-water-deep bg-water-deep text-white" : "border-line bg-surface text-ink-soft hover:bg-parchment-deep"
                  }`}
                >
                  <span className="font-semibold">{i + 1}</span>
                  <span>{s.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex flex-col gap-4" role="group" aria-labelledby="step-title">
          <div>
            <h4 id="step-title" className="t-h4">
              Step {m.step + 1}: {step.title}
            </h4>
            <p className="font-[family-name:var(--font-body)] text-lg text-ink">{step.prompt}</p>
          </div>

          {step.id === "swot" ? (
            <div className="grid gap-4 md:grid-cols-2">
              {SWOT_GRID.map((g) => (
                <fieldset key={g.id} className="flex flex-col gap-2 rounded-xl border border-line p-3">
                  <legend className="px-1 text-sm font-semibold text-ink">{g.label}</legend>
                  {g.fields.map((f) => (
                    <Field key={f.key} label={f.label}>
                      <TextArea rows={f.rows} value={answer(f.key)} onChange={(e) => setAnswer(f.key, e.target.value)} />
                    </Field>
                  ))}
                </fieldset>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {step.id === "mission" && (
                <blockquote className="rounded-lg border-l-4 border-gold bg-parchment-deep/50 px-4 py-3">
                  <p className="font-[family-name:var(--font-body)] text-ink">“{MISSION_VERSE.text}”</p>
                  <footer className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                    — {MISSION_VERSE.reference} ({MISSION_VERSE.version})
                  </footer>
                </blockquote>
              )}
              {step.fields.map((f) => (
                <Field key={f.key} label={f.label} hint={f.hint}>
                  <TextArea rows={f.rows} value={answer(f.key)} onChange={(e) => setAnswer(f.key, e.target.value)} />
                </Field>
              ))}
            </div>
          )}

          {step.id === "recap" && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-semibold text-ink">
                The topics most important to them (2-3) <span className="font-normal text-ink-soft">· {m.topics.length} chosen</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((t) => {
                  const on = m.topics.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleTopic(t.id)}
                      className={`rounded-full border px-3 py-1.5 font-[family-name:var(--font-ui)] text-sm ${
                        on ? "border-water-deep bg-water-deep text-white" : "border-line bg-surface text-ink hover:bg-parchment-deep"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
              {m.topics.length > 3 && (
                <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                  A workshop works best with two or three topics. You can keep more, but pick the ones to lean into first.
                </p>
              )}
            </fieldset>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <Button variant="secondary" disabled={m.step === 0} onClick={() => goTo(m.step - 1)}>
            Back
          </Button>
          {m.step < 5 ? (
            <Button onClick={() => goTo(m.step + 1)}>Next: {WORKSHOP_STEPS[m.step + 1].title}</Button>
          ) : (
            <Button
              variant={m.completedAt ? "secondary" : "primary"}
              onClick={() => update({ completedAt: m.completedAt ? null : new Date().toISOString() })}
            >
              {m.completedAt ? "Meeting marked done. Reopen" : "Mark the meeting done"}
            </Button>
          )}
        </div>

        {m.step === 5 && (
          <div className="flex flex-col gap-4 border-t border-line pt-4">
            <div>
              <h4 className="t-h4">Next-step tools</h4>
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                Open the tools for the topics you chose and work through the numbers together.
              </p>
            </div>
            <ScenarioToolkit
              recommended={m.topics}
              level={5}
              states={toolStates}
              onToolState={saveToolState}
              selected={pdfTools}
              onToggle={togglePdfTool}
            />
            <div className="flex flex-col gap-2 rounded-xl border border-line bg-parchment-deep/40 p-4">
              <p className="font-semibold text-ink">Printable PDF of this meeting</p>
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                Tick the box under 2 or 3 tools above to include them. The PDF has your notes from the six steps, the money mission
                statement, the topics, and the numbers from each chosen tool.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled={pdfTools.length < 2 || pdfBusy} onClick={() => void downloadPdf()}>
                  {pdfBusy ? "Making the PDF…" : "Download the meeting PDF"}
                </Button>
                <span role="status" className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                  {pdfTools.length === 0 ? "No tools chosen yet" : `${pdfTools.length} of 3 tools chosen`}
                  {pdfTools.length === 1 ? ": choose at least one more" : ""}
                </span>
                {pdfError && (
                  <span role="alert" className="text-sm text-clay">
                    {pdfError}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <Button
            variant="secondary"
            onClick={async () => {
              const text = meetingSummary(m, new Date(m.createdAt).toLocaleDateString(undefined, { dateStyle: "long" }));
              try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1800);
              } catch {
                window.prompt("Copy the summary", text);
              }
            }}
          >
            {copied ? "Copied" : "Copy a summary of my notes"}
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              if (window.confirm(`Delete the meeting with ${m.participantName}? The notes and signatures will be gone for good.`)) {
                dirty.current = false;
                await onDelete();
              }
            }}
          >
            Delete this meeting
          </Button>
        </div>
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          Education only. Nothing here is financial, legal, tax, or investment advice.
        </p>
      </CardBody>
    </Card>
  );
}
