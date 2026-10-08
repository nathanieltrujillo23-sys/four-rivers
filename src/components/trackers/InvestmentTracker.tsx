import { useState, type FormEvent } from "react";
import { useCourse } from "../../state/CourseContext";
import { useLang } from "../../i18n/LanguageContext";
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
  const { t } = useLang();

  const [holding, setHolding] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
    if (!nameForQuick) {
      setFormError(t("trk.inv.errName"));
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setFormError(t("trk.errAmountPos"));
      return;
    }
    setFormError(null);
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
          <h3 className="t-h4">{t("trk.inv.title")}</h3>
          <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            {t("trk.inv.blurb")}
          </p>

          <div className="mt-4">
            <Field label={t("trk.inv.to")}>
              <TextInput
                value={holding}
                onChange={(e) => setHolding(e.target.value)}
                placeholder={t("trk.inv.toPh")}
              />
            </Field>
          </div>

          <div className="mt-4">
            <h4 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
              {t("trk.quick")}
            </h4>
            <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
              {nameForQuick
                ? t("trk.inv.quickOn", { name: nameForQuick })
                : t("trk.inv.quickOff")}
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
            <Field label={t("trk.customAmount")}>
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
            <Field label={t("trk.note")}>
              <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("trk.inv.notePh")} />
            </Field>
            <div className="flex items-end">
              <Button type="submit" variant="secondary" disabled={busy || !nameForQuick}>
                {t("trk.log")}
              </Button>
            </div>
            {formError && (
              <p className="sm:col-span-3 font-[family-name:var(--font-ui)] text-xs text-red-700">{formError}</p>
            )}
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-baseline justify-between">
            <h4 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
              {t("trk.inv.logged")}
            </h4>
            {entries.length > 0 && (
              <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                {t("trk.inv.total", { amount: formatCurrency(totalContributed) })}
              </span>
            )}
          </div>
          {entries.length === 0 ? (
            <div className="mt-3">
              <EmptyState>{t("trk.inv.none")}</EmptyState>
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
