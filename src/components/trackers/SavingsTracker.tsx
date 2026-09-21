import { useMemo, useState, type FormEvent } from "react";
import { useCourse } from "../../state/CourseContext";
import { riverByNumber } from "../../theme/theme";
import { formatCurrency, formatPercent } from "../../utils/format";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { Field, Select, TextInput } from "../ui/Field";
import { EmptyState } from "../ui/EmptyState";
import { Stepper } from "../ui/Stepper";
import { EntryRow } from "./EntryRow";

const QUICK_AMOUNTS = [25, 50, 100, 250];

export function SavingsTracker() {
  const {
    snapshot,
    addSavingsGoal,
    deleteSavingsGoal,
    addSavingsContribution,
    deleteSavingsContribution,
  } = useCourse();
  const accent = riverByNumber(2)!.accent;

  const [goalName, setGoalName] = useState("");
  const [target, setTarget] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [busy, setBusy] = useState(false);

  const goals = snapshot?.savingsGoals ?? [];
  const activeGoalId = selectedGoalId ?? goals[0]?.id ?? null;
  const activeGoal = goals.find((g) => g.id === activeGoalId) ?? null;

  const contributions = useMemo(
    () => (snapshot?.savingsContributions ?? []).filter((c) => c.goalId === activeGoalId),
    [snapshot, activeGoalId]
  );
  const balance = contributions.reduce((sum, c) => sum + c.amount, 0);

  if (!snapshot) return null;

  async function createGoal(e: FormEvent) {
    e.preventDefault();
    const amt = parseFloat(target);
    if (!goalName.trim() || !Number.isFinite(amt) || amt <= 0) return;
    setBusy(true);
    try {
      const created = await addSavingsGoal({ name: goalName.trim(), targetAmount: amt });
      setSelectedGoalId(created.id);
      setGoalName("");
      setTarget("");
    } finally {
      setBusy(false);
    }
  }

  async function logContribution(amount: number, notes: string | null) {
    if (!activeGoalId || !Number.isFinite(amount) || amount === 0) return;
    await addSavingsContribution({ goalId: activeGoalId, amount, notes });
  }

  async function removeLastOfAmount(amount: number) {
    const match = contributions.find((c) => c.amount === amount);
    if (match) await deleteSavingsContribution(match.id);
  }

  return (
    <div className="flex flex-col gap-4">
      {goals.length === 0 ? (
        <Card accent={accent}>
          <CardBody>
            <h3 className="text-lg font-semibold text-ink">Create a savings goal</h3>
            <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              Name what you're saving toward and set a target. Your balance will be the sum of every
              contribution you log.
            </p>
            <form onSubmit={createGoal} className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Goal name" className="sm:col-span-2">
                <TextInput
                  required
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder="e.g. Emergency fund, New roof"
                />
              </Field>
              <Field label="Target amount">
                <TextInput
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="1"
                  required
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="0.00"
                />
              </Field>
              <div className="flex items-end">
                <Button type="submit" disabled={busy}>
                  {busy ? "Creating…" : "Create goal"}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : (
        <>
          <Card accent={accent}>
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-ink">Saving toward</h3>
                {goals.length > 1 && (
                  <Select
                    value={activeGoalId ?? ""}
                    onChange={(e) => setSelectedGoalId(e.target.value)}
                    className="text-sm"
                  >
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </Select>
                )}
              </div>

              {activeGoal && (
                <div className="mt-3">
                  <div className="flex items-baseline justify-between font-[family-name:var(--font-ui)]">
                    <span className="text-xl font-semibold text-ink">{activeGoal.name}</span>
                    <span className="text-sm text-ink-soft">
                      {formatCurrency(balance)} of {formatCurrency(activeGoal.targetAmount)}
                    </span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-parchment-deep">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (balance / activeGoal.targetAmount) * 100)}%`,
                        backgroundColor: accent,
                      }}
                    />
                  </div>
                  <p className="mt-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                    {formatPercent(balance / activeGoal.targetAmount)} funded ·{" "}
                    {contributions.length} contribution{contributions.length === 1 ? "" : "s"}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete the goal "${activeGoal.name}" and all its contributions?`)) {
                        void deleteSavingsGoal(activeGoal.id);
                        setSelectedGoalId(null);
                      }
                    }}
                    className="mt-2 font-[family-name:var(--font-ui)] text-xs text-ink-soft hover:text-red-700"
                  >
                    Delete this goal
                  </button>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h4 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
                Quick contribution
              </h4>
              <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                Each “+” logs one contribution of that amount. “−” removes the most recent one.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {QUICK_AMOUNTS.map((amt) => (
                  <Stepper
                    key={amt}
                    label={formatCurrency(amt)}
                    count={contributions.filter((c) => c.amount === amt).length}
                    accent={accent}
                    onIncrement={() => void logContribution(amt, null)}
                    onDecrement={() => void removeLastOfAmount(amt)}
                  />
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const amt = parseFloat(customAmount);
                  if (!Number.isFinite(amt) || amt <= 0) return;
                  void logContribution(amt, customNote.trim() || null);
                  setCustomAmount("");
                  setCustomNote("");
                }}
                className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
              >
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
                  <TextInput
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="e.g. Tax refund"
                  />
                </Field>
                <div className="flex items-end">
                  <Button type="submit" variant="secondary">
                    Log
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h4 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
                Contributions
              </h4>
              {contributions.length === 0 ? (
                <div className="mt-3">
                  <EmptyState>No contributions to this goal yet.</EmptyState>
                </div>
              ) : (
                <ul className="mt-2">
                  {contributions.map((c) => (
                    <EntryRow
                      key={c.id}
                      primary={c.notes || "Contribution"}
                      amount={formatCurrency(c.amount)}
                      createdAt={c.createdAt}
                      onDelete={() => void deleteSavingsContribution(c.id)}
                    />
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
