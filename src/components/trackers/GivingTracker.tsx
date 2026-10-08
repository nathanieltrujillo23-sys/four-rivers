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
import { GivingImpactVisual } from "../course/GivingImpactVisual";

const QUICK_AMOUNTS = [20, 50, 100, 200];

export function GivingTracker() {
  const { snapshot, addGivingEntry, deleteGivingEntry } = useCourse();
  const accent = riverByNumber(4)!.accent;
  const { t } = useLang();

  const [recipient, setRecipient] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
    if (!name) {
      setFormError(t("trk.giv.errRecipient"));
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setFormError(t("trk.errAmountPos"));
      return;
    }
    setFormError(null);
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
            <h3 className="t-h4">{t("trk.giv.title")}</h3>
            <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              {t("trk.giv.inYear", { amount: formatCurrency(yearTotal), year: thisYear })}
            </span>
          </div>
          <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            {t("trk.giv.blurb")}
          </p>

          <div className="mt-4">
            <Field label={t("trk.giv.recipient")}>
              <TextInput
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={t("trk.giv.recipientPh")}
              />
            </Field>
          </div>

          <div className="mt-4">
            <h4 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
              {t("trk.giv.quick")}
            </h4>
            <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
              {name ? t("trk.giv.quickOn", { name }) : t("trk.giv.quickOff")}
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
              <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("trk.giv.notePh")} />
            </Field>
            <div className="flex items-end">
              <Button type="submit" variant="secondary" disabled={busy || !name}>
                {t("trk.log")}
              </Button>
            </div>
            {formError && (
              <p className="sm:col-span-3 font-[family-name:var(--font-ui)] text-xs text-red-700">{formError}</p>
            )}
          </form>
        </CardBody>
      </Card>

      <Card accent={accent}>
        <CardBody>
          <GivingImpactVisual totalGiven={allTimeTotal} accent={accent} />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-baseline justify-between">
            <h4 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">{t("trk.giv.gifts")}</h4>
            {entries.length > 0 && (
              <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                {t("trk.giv.allTime", { amount: formatCurrency(allTimeTotal) })}
              </span>
            )}
          </div>
          {entries.length === 0 ? (
            <div className="mt-3">
              <EmptyState>{t("trk.giv.none")}</EmptyState>
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
