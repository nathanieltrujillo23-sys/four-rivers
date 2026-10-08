import { useState, type FormEvent } from "react";
import { useCourse } from "../../state/CourseContext";
import { useLang } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";
import { riverByNumber } from "../../theme/theme";
import type { IncomeCadence } from "../../types";
import { monthlyEquivalent, totalMonthlyEquivalent } from "../../utils/income";
import { investmentBreakdown } from "../../utils/investing";
import { formatCurrency } from "../../utils/format";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { Field, Select, TextInput } from "../ui/Field";
import { EmptyState } from "../ui/EmptyState";
import { EntryRow } from "./EntryRow";
import { StreamsRiver } from "../course/StreamsRiver";

const CATEGORIES = ["Employment", "Self-employment", "Business", "Rental", "Investments", "Royalties", "Other"];
const CADENCES: IncomeCadence[] = ["one_time", "weekly", "biweekly", "monthly", "quarterly", "annually"];

export function IncomeStreamTracker() {
  const { snapshot, addIncomeStream, deleteIncomeStream } = useCourse();
  const { t } = useLang();
  const cadenceLabel = (c: IncomeCadence) => t(`cadence.${c}` as StringKey);
  const accent = riverByNumber(1)!.accent;
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<IncomeCadence>("monthly");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!snapshot) return null;
  const streams = snapshot.incomeStreams;
  const totalMonthly = totalMonthlyEquivalent(streams);
  const wells = investmentBreakdown(snapshot.investmentEntries);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name.trim()) {
      setFormError(t("trk.income.errName"));
      return;
    }
    if (!Number.isFinite(amt) || amt < 0) {
      setFormError(t("trk.income.errAmount"));
      return;
    }
    setFormError(null);
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
            <h3 className="t-h4">{t("trk.income.title")}</h3>
            <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              {t("trk.logged", { n: streams.length })}
            </span>
          </div>
          <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            {t("trk.income.blurb")}
          </p>

          <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label={t("trk.income.name")} className="sm:col-span-2">
              <TextInput
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("trk.income.namePh")}
              />
            </Field>
            <Field label={t("trk.income.category")}>
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`incomecat.${c}` as StringKey)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("trk.income.amount")}>
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
            <Field label={t("trk.income.cadence")} className="sm:col-span-2">
              <Select value={cadence} onChange={(e) => setCadence(e.target.value as IncomeCadence)}>
                {CADENCES.map((c) => (
                  <option key={c} value={c}>
                    {cadenceLabel(c)}
                  </option>
                ))}
              </Select>
            </Field>
            {formError && (
              <p className="sm:col-span-2 font-[family-name:var(--font-ui)] text-xs text-red-700">{formError}</p>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy ? t("trk.income.adding") : t("trk.income.add")}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-baseline justify-between">
            <h4 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
              {t("trk.income.yours")}
            </h4>
            {streams.length > 0 && (
              <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                {t("trk.income.recurring", { amount: formatCurrency(totalMonthly) })}
              </span>
            )}
          </div>
          {streams.length === 0 ? (
            <div className="mt-3">
              <EmptyState>{t("trk.income.empty")}</EmptyState>
            </div>
          ) : (
            <>
              <div className="mt-3 rounded-xl bg-parchment-deep/30 p-3">
                <StreamsRiver
                  streams={streams.map((s) => ({ label: s.name, value: monthlyEquivalent(s) }))}
                  accent={accent}
                  wells={wells}
                />
              </div>
              <ul className="mt-2">
                {streams.map((s) => {
                  const monthly = monthlyEquivalent(s);
                  return (
                    <EntryRow
                      key={s.id}
                      primary={s.name}
                      secondary={`${t(`incomecat.${s.category}` as StringKey)} · ${cadenceLabel(s.cadence)}${
                        s.cadence !== "monthly" && s.cadence !== "one_time"
                          ? t("trk.income.perMonth", { amount: formatCurrency(monthly) })
                          : ""
                      }`}
                      amount={formatCurrency(s.amount)}
                      createdAt={s.createdAt}
                      onDelete={() => void deleteIncomeStream(s.id)}
                    />
                  );
                })}
              </ul>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
