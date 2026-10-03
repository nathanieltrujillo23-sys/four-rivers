import { useOptionalCourse } from "../../../state/CourseContext";
import { investmentBreakdown } from "../../../utils/investing";
import { formatCurrency } from "../../../utils/format";
import { Field, TextInput } from "../../ui/Field";
import { Button } from "../../ui/Button";
import { StreamsRiver } from "../StreamsRiver";
import { newStream, num, type StreamRow } from "./shared";

/** The first calculator view: sketch income sources and watch them converge. */
export function StreamsPanel({
  rows,
  setRows,
  accent,
}: {
  rows: StreamRow[];
  setRows: (updater: (prev: StreamRow[]) => StreamRow[]) => void;
  accent: string;
}) {
  const snapshot = useOptionalCourse()?.snapshot ?? null;
  const wells = investmentBreakdown(snapshot?.investmentEntries ?? []);

  const streams = rows
    .map((r) => ({
      label: r.label.trim() || "Untitled",
      value: num(r.monthly),
    }))
    .filter((s) => s.value > 0);
  const totalMonthly = streams.reduce((s, x) => s + x.value, 0);

  function updateRow(id: string, patch: Partial<StreamRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
        List your main income first, then any streams you could add, however
        small. Every other view builds on these numbers. Real income belongs in
        the tracker above; this is just a "what if."
      </p>

      <div className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <div
            key={row.id}
            className="grid grid-cols-[1fr_130px_auto] items-end gap-2"
          >
            <Field
              className="min-w-0"
              label={i === 0 ? "Main income" : "Added stream"}
            >
              <TextInput
                className="w-full min-w-0"
                value={row.label}
                onChange={(e) => updateRow(row.id, { label: e.target.value })}
                placeholder={i === 0 ? "e.g. Day job" : "e.g. Freelance design"}
              />
            </Field>
            <Field className="min-w-0" label="Monthly amount">
              <TextInput
                className="w-full min-w-0"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={row.monthly}
                onChange={(e) => updateRow(row.id, { monthly: e.target.value })}
                placeholder="0.00"
              />
            </Field>
            <Button
              variant="ghost"
              onClick={() =>
                setRows((prev) => prev.filter((r) => r.id !== row.id))
              }
              aria-label="Remove this source"
            >
              ✕
            </Button>
          </div>
        ))}
        {rows.length < 6 && (
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => setRows((prev) => [...prev, newStream()])}
          >
            + Add another stream
          </Button>
        )}
      </div>

      <div className="rounded-xl bg-parchment-deep/30 p-3">
        <StreamsRiver streams={streams} accent={accent} wells={wells} />
      </div>

      <div
        className="rounded-xl p-3 text-center"
        style={{ backgroundColor: `${accent}22` }}
      >
        <div className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.1em] text-ink-soft">
          Combined monthly total
        </div>
        <div
          className="mt-1 text-xl font-semibold tabular-nums"
          style={{ color: accent }}
        >
          {formatCurrency(totalMonthly)}
        </div>
        <div className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          ≈ {formatCurrency(totalMonthly * 12)}/year
        </div>
      </div>
    </div>
  );
}
