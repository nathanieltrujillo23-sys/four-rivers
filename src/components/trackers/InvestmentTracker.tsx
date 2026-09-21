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

const QUICK_AMOUNTS = [50, 100, 250, 500];

export function InvestmentTracker() {
  const { snapshot, addInvestmentEntry, deleteInvestmentEntry } = useCourse();
  const accent = riverByNumber(3)!.accent;

  const [holding, setHolding] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!snapshot) return null;
  const entries = snapshot.investmentEntries;
  const totalContributed = entries.reduce((s, e) => s + e.contributionAmount, 0);
  const nameForQuick = holding.trim();

  async function logEntry(amount: number, notes: string | null) {
    if (!nameForQuick || !Number.isFinite(amount) || amount <= 0) return;
    await addInvestmentEntry({ name: nameForQuick, contributionAmount: amount, notes });
  }

  async function removeLast(amount: number) {
    const match = entries.find(
      (e) => e.name === nameForQuick && e.contributionAmount === amount
    );
    if (match) await deleteInvestmentEntry(match.id);
  }

  async function submitCustom(e: FormEvent) {
    e.preventDefault();
    const amt = parseFloat(customAmount);
    if (!nameForQuick || !Number.isFinite(amt) || amt <= 0) return;
    setBusy(true);
    try {
      await logEntry(amt, note.trim() || null);
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
          <h3 className="text-lg font-semibold text-ink">Investment contributions</h3>
          <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            A plain log of what you put in and when. This tool does not track value or pull market
            prices, and 4 Rivers does not tell you what to invest in.
          </p>

          <div className="mt-4">
            <Field label="What are you contributing to?">
              <TextInput
                value={holding}
                onChange={(e) => setHolding(e.target.value)}
                placeholder="e.g. Roth IRA, Index fund, 401(k)"
              />
            </Field>
          </div>

          <div className="mt-4">
            <h4 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
              Quick contribution
            </h4>
            <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
              {nameForQuick
                ? `Each “+” logs a contribution to “${nameForQuick}”.`
                : "Enter a destination above to use the quick steppers."}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {QUICK_AMOUNTS.map((amt) => (
                <Stepper
                  key={amt}
                  label={formatCurrency(amt)}
                  count={
                    nameForQuick
                      ? entries.filter(
                          (e) => e.name === nameForQuick && e.contributionAmount === amt
                        ).length
                      : 0
                  }
                  accent={accent}
                  disabled={!nameForQuick}
                  onIncrement={() => void logEntry(amt, null)}
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
              <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Monthly auto-invest" />
            </Field>
            <div className="flex items-end">
              <Button type="submit" variant="secondary" disabled={busy || !nameForQuick}>
                Log
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-baseline justify-between">
            <h4 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
              Logged contributions
            </h4>
            {entries.length > 0 && (
              <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                {formatCurrency(totalContributed)} total
              </span>
            )}
          </div>
          {entries.length === 0 ? (
            <div className="mt-3">
              <EmptyState>Nothing logged yet.</EmptyState>
            </div>
          ) : (
            <ul className="mt-2">
              {entries.map((e) => (
                <EntryRow
                  key={e.id}
                  primary={e.name}
                  secondary={e.notes || undefined}
                  amount={formatCurrency(e.contributionAmount)}
                  createdAt={e.createdAt}
                  onDelete={() => void deleteInvestmentEntry(e.id)}
                />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
