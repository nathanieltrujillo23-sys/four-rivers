import { useState, type FormEvent } from "react";
import { useCourse } from "../../state/CourseContext";
import { riverByNumber } from "../../theme/theme";
import { formatCurrency } from "../../utils/format";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { Field, TextInput } from "../ui/Field";
import { EmptyState } from "../ui/EmptyState";
import { Stepper } from "../ui/Stepper";
import { EntryRow } from "./EntryRow";

const QUICK_AMOUNTS = [20, 50, 100, 200];

export function GivingTracker() {
  const { snapshot, addGivingEntry, deleteGivingEntry } = useCourse();
  const accent = riverByNumber(4)!.accent;

  const [recipient, setRecipient] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!snapshot) return null;
  const entries = snapshot.givingEntries;
  const thisYear = new Date().getFullYear();
  const yearTotal = entries
    .filter((e) => new Date(e.createdAt).getFullYear() === thisYear)
    .reduce((s, e) => s + e.amount, 0);
  const allTimeTotal = entries.reduce((s, e) => s + e.amount, 0);
  const name = recipient.trim();

  async function logGift(amount: number, notes: string | null) {
    if (!name || !Number.isFinite(amount) || amount <= 0) return;
    await addGivingEntry({ recipient: name, amount, notes });
  }

  async function removeLast(amount: number) {
    const match = entries.find((e) => e.recipient === name && e.amount === amount);
    if (match) await deleteGivingEntry(match.id);
  }

  async function submitCustom(e: FormEvent) {
    e.preventDefault();
    const amt = parseFloat(customAmount);
    if (!name || !Number.isFinite(amt) || amt <= 0) return;
    setBusy(true);
    try {
      await logGift(amt, note.trim() || null);
      setCustomAmount("");
      setNote("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card accent={accent}>
        <CardBody>
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-semibold text-ink">Giving log</h3>
            <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              {formatCurrency(yearTotal)} in {thisYear}
            </span>
          </div>
          <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            Record each gift as you give it. The running total for the year updates automatically.
          </p>

          <div className="mt-4">
            <Field label="Recipient">
              <TextInput
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. Home church, Food bank, A friend in need"
              />
            </Field>
          </div>

          <div className="mt-4">
            <h4 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
              Quick gift
            </h4>
            <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
              {name ? `Each “+” logs a gift to “${name}”.` : "Enter a recipient above to use the quick steppers."}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {QUICK_AMOUNTS.map((amt) => (
                <Stepper
                  key={amt}
                  label={formatCurrency(amt)}
                  count={name ? entries.filter((e) => e.recipient === name && e.amount === amt).length : 0}
                  accent={accent}
                  disabled={!name}
                  onIncrement={() => void logGift(amt, null)}
                  onDecrement={() => void removeLast(amt)}
                />
              ))}
            </div>
          </div>

          <form onSubmit={submitCustom} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="Custom amount">
              <TextInput
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="0.00"
              />
            </Field>
            <Field label="Note (optional)">
              <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Building fund" />
            </Field>
            <div className="flex items-end">
              <Button type="submit" variant="secondary" disabled={busy || !name}>
                Log
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-baseline justify-between">
            <h4 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">Gifts given</h4>
            {entries.length > 0 && (
              <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                {formatCurrency(allTimeTotal)} all time
              </span>
            )}
          </div>
          {entries.length === 0 ? (
            <div className="mt-3">
              <EmptyState>No gifts logged yet.</EmptyState>
            </div>
          ) : (
            <ul className="mt-2">
              {entries.map((e) => (
                <EntryRow
                  key={e.id}
                  primary={e.recipient}
                  secondary={e.notes || undefined}
                  amount={formatCurrency(e.amount)}
                  createdAt={e.createdAt}
                  onDelete={() => void deleteGivingEntry(e.id)}
                />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
