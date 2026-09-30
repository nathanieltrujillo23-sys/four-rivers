import { useState } from "react";
import { formatCurrency } from "../../utils/format";
import { Card, CardBody } from "../ui/Card";
import { Field, TextInput } from "../ui/Field";
import { Button } from "../ui/Button";
import { StreamsRiver } from "./StreamsRiver";

interface Row {
  id: string;
  label: string;
  monthly: string;
}

let rowSeq = 0;
function newRow(label = "", monthly = ""): Row {
  rowSeq += 1;
  return { id: `row-${rowSeq}`, label, monthly };
}

/**
 * Illustrative "what if I diversified?" tool for River 1's practice module —
 * sketch out hypothetical income sources and see them visualized converging
 * into one stream. Purely a teaching aid, like GrowthCalculator: no server
 * state, nothing logged. Real income belongs in the tracker above it.
 */
export function IncomeStreamsCalculator({ accent }: { accent: string }) {
  const [rows, setRows] = useState<Row[]>(() => [newRow("Day job", "3000"), newRow("Side hustle", "400")]);

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => (prev.length >= 6 ? prev : [...prev, newRow()]));
  }
  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const streams = rows
    .map((r) => ({ label: r.label.trim() || "Untitled", value: parseFloat(r.monthly) || 0 }))
    .filter((s) => s.value > 0);
  const totalMonthly = streams.reduce((s, x) => s + x.value, 0);

  return (
    <Card accent={accent}>
      <CardBody className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-ink">What if you diversified?</h3>
          <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            Sketch out hypothetical income sources and watch them converge into one combined stream. Real income
            belongs in the tracker above — this is just a "what if."
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-[1fr_130px_auto] items-end gap-2">
              <Field label="Source">
                <TextInput
                  value={row.label}
                  onChange={(e) => updateRow(row.id, { label: e.target.value })}
                  placeholder="e.g. Freelance design"
                />
              </Field>
              <Field label="Monthly amount">
                <TextInput
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={row.monthly}
                  onChange={(e) => updateRow(row.id, { monthly: e.target.value })}
                  placeholder="0.00"
                />
              </Field>
              <Button variant="ghost" onClick={() => removeRow(row.id)} aria-label="Remove this source">
                ✕
              </Button>
            </div>
          ))}
          {rows.length < 6 && (
            <Button variant="secondary" className="self-start" onClick={addRow}>
              + Add another source
            </Button>
          )}
        </div>

        <div className="rounded-xl bg-parchment-deep/30 p-3">
          <StreamsRiver streams={streams} accent={accent} />
        </div>

        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: `${accent}22` }}>
          <div className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.1em] text-ink-soft">
            Combined monthly total
          </div>
          <div className="mt-1 text-xl font-semibold tabular-nums" style={{ color: accent }}>
            {formatCurrency(totalMonthly)}
          </div>
          <div className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
            ≈ {formatCurrency(totalMonthly * 12)}/year
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
