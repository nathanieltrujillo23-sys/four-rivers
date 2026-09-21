import { useState, type FormEvent } from "react";
import { useCourse } from "../../state/CourseContext";
import { riverByNumber } from "../../theme/theme";
import type { IncomeCadence } from "../../types";
import { CADENCE_LABEL, monthlyEquivalent, totalMonthlyEquivalent } from "../../utils/income";
import { formatCurrency } from "../../utils/format";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { Field, Select, TextInput } from "../ui/Field";
import { EmptyState } from "../ui/EmptyState";
import { EntryRow } from "./EntryRow";

const CATEGORIES = ["Employment", "Self-employment", "Business", "Rental", "Investments", "Royalties", "Other"];
const CADENCES: IncomeCadence[] = ["one_time", "weekly", "biweekly", "monthly", "quarterly", "annually"];

export function IncomeStreamTracker() {
  const { snapshot, addIncomeStream, deleteIncomeStream } = useCourse();
  const accent = riverByNumber(1)!.accent;
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<IncomeCadence>("monthly");
  const [busy, setBusy] = useState(false);

  if (!snapshot) return null;
  const streams = snapshot.incomeStreams;
  const totalMonthly = totalMonthlyEquivalent(streams);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name.trim() || !Number.isFinite(amt)) return;
    setBusy(true);
    try {
      await addIncomeStream({
        name: name.trim(),
        category,
        amount: amt,
        cadence,
        notes: null,
      });
      setName("");
      setAmount("");
      setCadence("monthly");
      setCategory(CATEGORIES[0]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card accent={accent}>
        <CardBody>
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-semibold text-ink">Income streams</h3>
            <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              {streams.length} logged
            </span>
          </div>
          <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            Log every distinct source of income you have — one entry per stream.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Source name" className="sm:col-span-2">
              <TextInput
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Weekend photography, Duplex rent, Day job"
              />
            </Field>
            <Field label="Category">
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Typical amount">
              <TextInput
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </Field>
            <Field label="How often" className="sm:col-span-2">
              <Select value={cadence} onChange={(e) => setCadence(e.target.value as IncomeCadence)}>
                {CADENCES.map((c) => (
                  <option key={c} value={c}>
                    {CADENCE_LABEL[c]}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Adding…" : "Add income stream"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-baseline justify-between">
            <h4 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
              Your streams
            </h4>
            {streams.length > 0 && (
              <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                ≈ {formatCurrency(totalMonthly)}/mo recurring
              </span>
            )}
          </div>
          {streams.length === 0 ? (
            <div className="mt-3">
              <EmptyState>No income streams logged yet. Add your first one above.</EmptyState>
            </div>
          ) : (
            <ul className="mt-2">
              {streams.map((s) => {
                const monthly = monthlyEquivalent(s);
                return (
                  <EntryRow
                    key={s.id}
                    primary={s.name}
                    secondary={`${s.category} · ${CADENCE_LABEL[s.cadence]}${
                      s.cadence !== "monthly" && s.cadence !== "one_time"
                        ? ` (≈ ${formatCurrency(monthly)}/mo)`
                        : ""
                    }`}
                    amount={formatCurrency(s.amount)}
                    createdAt={s.createdAt}
                    onDelete={() => void deleteIncomeStream(s.id)}
                  />
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
