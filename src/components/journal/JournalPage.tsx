import { useState, type FormEvent } from "react";
import { useCourse } from "../../state/CourseContext";
import { useJournal, type JournalInput } from "../../state/useJournal";
import { RIVERS, riverByNumber } from "../../theme/theme";
import type { JournalEntry, RiverNumber } from "../../types";
import { VERSE } from "../../content/scripture";
import { formatDateOnly, todayYmd } from "../../utils/format";
import { ScriptureList } from "../ui/Scripture";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { Field, Select, TextArea, TextInput } from "../ui/Field";
import { EmptyState } from "../ui/EmptyState";

type Filter = "all" | "general" | RiverNumber;

function EntryForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: JournalEntry;
  submitLabel: string;
  onSubmit: (input: JournalInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const [entryDate, setEntryDate] = useState(initial?.entryDate ?? todayYmd());
  const [title, setTitle] = useState(initial?.title ?? "");
  const [river, setRiver] = useState<string>(initial?.riverNumber ? String(initial.riverNumber) : "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || !entryDate) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim() || null,
        body: body.trim(),
        entryDate,
        riverNumber: river ? (Number(river) as RiverNumber) : null,
      });
      if (!initial) {
        setTitle("");
        setBody("");
        setRiver("");
        setEntryDate(todayYmd());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the entry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
      <Field label="Date">
        <TextInput type="date" required value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
      </Field>
      <Field label="Relates to">
        <Select value={river} onChange={(e) => setRiver(e.target.value)}>
          <option value="">General</option>
          {RIVERS.map((r) => (
            <option key={r.number} value={r.number}>
              River {r.number} · {r.title}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Title (optional)" className="sm:col-span-2">
        <TextInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Paid off the car, First month tithing, Lost a client"
        />
      </Field>
      <Field label="Entry" className="sm:col-span-2">
        <TextArea
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What happened, what you learned, what you're grateful for, what's next…"
        />
      </Field>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 font-[family-name:var(--font-ui)] sm:col-span-2">
          {error}
        </p>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={busy || !body.trim()}>
          {busy ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export function JournalPage() {
  const { repository } = useCourse();
  const { entries, loading, error, add, update, remove } = useJournal(repository);
  const [filter, setFilter] = useState<Filter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  const visible = entries.filter((e) =>
    filter === "all" ? true : filter === "general" ? e.riverNumber === null : e.riverNumber === filter
  );

  const chips: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "general", label: "General" },
    ...RIVERS.map((r) => ({ key: r.number as Filter, label: `River ${r.number}` })),
  ];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Financial journal</h1>
          <p className="mt-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            A private place to document your financial journey — milestones, setbacks, lessons, and
            what you're grateful for. Only you can see your entries.
          </p>
        </div>
        <ScriptureList verses={[VERSE.hab2_2_kjv, VERSE.ps103_2_kjv]} compact />
      </header>

      {error ? (
        <Card>
          <CardBody>
            <p className="font-[family-name:var(--font-ui)] text-sm text-red-700">{error.message}</p>
          </CardBody>
        </Card>
      ) : (
        <>
          <Card>
            <CardBody>
              <h2 className="mb-3 text-lg font-semibold text-ink">New entry</h2>
              <EntryForm submitLabel="Save entry" onSubmit={add} />
            </CardBody>
          </Card>

          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold text-ink">Your entries</h2>
              <div className="flex flex-wrap gap-1.5 font-[family-name:var(--font-ui)]">
                {chips.map((c) => (
                  <button
                    key={String(c.key)}
                    onClick={() => setFilter(c.key)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      filter === c.key
                        ? "border-water-deep bg-water-deep text-parchment"
                        : "border-line bg-white/60 text-ink-soft hover:bg-parchment-deep"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading…</p>
            ) : visible.length === 0 ? (
              <EmptyState>
                {entries.length === 0
                  ? "No entries yet. Write the first one above."
                  : "No entries match this filter."}
              </EmptyState>
            ) : (
              <ul className="flex flex-col gap-4">
                {visible.map((entry) => {
                  const river = entry.riverNumber ? riverByNumber(entry.riverNumber) : undefined;
                  return (
                    <li key={entry.id}>
                      <Card accent={river?.accent}>
                        <CardBody>
                          {editingId === entry.id ? (
                            <EntryForm
                              initial={entry}
                              submitLabel="Save changes"
                              onSubmit={async (input) => {
                                await update(entry.id, input);
                                setEditingId(null);
                              }}
                              onCancel={() => setEditingId(null)}
                            />
                          ) : (
                            <>
                              <div className="flex flex-wrap items-center gap-2 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                                <span>{formatDateOnly(entry.entryDate)}</span>
                                <span
                                  className="rounded-full px-2 py-0.5 font-medium"
                                  style={
                                    river
                                      ? { backgroundColor: river.accentSoft, color: river.accent }
                                      : undefined
                                  }
                                >
                                  {river ? `River ${river.number} · ${river.title}` : "General"}
                                </span>
                              </div>
                              {entry.title && (
                                <h3 className="mt-1 text-lg font-semibold text-ink">{entry.title}</h3>
                              )}
                              <p className="mt-2 whitespace-pre-wrap leading-relaxed text-ink-soft">
                                {entry.body}
                              </p>
                              <div className="mt-3 flex gap-3 font-[family-name:var(--font-ui)] text-xs">
                                <button
                                  onClick={() => setEditingId(entry.id)}
                                  className="text-ink-soft hover:text-ink"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm("Delete this journal entry? This can't be undone."))
                                      void remove(entry.id);
                                  }}
                                  className="text-ink-soft hover:text-red-700"
                                >
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </CardBody>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
