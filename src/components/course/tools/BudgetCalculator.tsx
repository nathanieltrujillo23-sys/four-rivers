import { useState } from "react";
import { useLang } from "../../../i18n/LanguageContext";
import type { StringKey } from "../../../i18n/en";
import { useAuth } from "../../../state/AuthContext";
import { useDemo } from "../../../state/DemoContext";
import { useOptionalCourse } from "../../../state/CourseContext";
import { useBudget } from "../../../state/useBudget";
import {
  BUDGET_CATEGORIES,
  SPENDING_CATEGORIES,
  categoryCompleteness,
  categoryTotal,
  isBudgetComplete,
  newItem,
  shareOfIncome,
  summarize,
  type Budget,
  type BudgetCategory,
} from "../../../utils/budget";
import { formatCurrency, formatPercent } from "../../../utils/format";
import { Button } from "../../ui/Button";
import { Card, CardBody } from "../../ui/Card";

const COLOR: Record<BudgetCategory, string> = {
  income: "var(--color-river-1)",
  needs: "var(--color-olive)",
  discretionary: "var(--color-gold)",
  saving: "var(--color-river-2)",
  investing: "var(--color-river-3)",
  giving: "var(--color-river-4)",
};

/**
 * The introduction's budgeting tool. Itemized lines for income, needs,
 * discretionary spending, saving, investing, and giving; every total is derived
 * from the lines. Once every box is filled in, the plan can be exported as a
 * PDF with the student's name and the four rivers logo.
 */
export function BudgetCalculator({ accent }: { accent: string }) {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { demoActive } = useDemo();
  const snapshot = useOptionalCourse()?.snapshot ?? null;
  const profileName = snapshot?.profile.fullName || snapshot?.profile.displayName || "";
  const { budget, setBudget, name, setName, reset } = useBudget(
    user?.id ?? (demoActive ? "demo" : "guest"),
    profileName,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sum = summarize(budget);
  const done = categoryCompleteness(budget);
  const complete = isBudgetComplete(budget);

  function update(category: BudgetCategory, items: Budget[BudgetCategory]) {
    setBudget({ ...budget, [category]: items });
  }

  async function exportPdf() {
    setBusy(true);
    setError(null);
    try {
      const { buildStewardshipPdf } = await import("../../../lib/stewardshipPdf");
      const { doc, filename } = await buildStewardshipPdf({ name, budget, lang, t });
      doc.save(filename);
    } catch {
      setError(t("budget.exportError"));
    } finally {
      setBusy(false);
    }
  }

  const scale = Math.max(sum.income, sum.assigned, 1);
  const over = sum.leftover < 0;
  const segments = [
    ...SPENDING_CATEGORIES.map((c) => ({
      key: c as string,
      label: t(`cat.${c}` as StringKey),
      value: sum[c],
      color: COLOR[c],
    })),
    ...(sum.leftover > 0
      ? [
          {
            key: "unassigned",
            label: t("budget.unassigned"),
            value: sum.leftover,
            color: "var(--color-line)",
          },
        ]
      : []),
  ];

  return (
    <Card accent={accent}>
      <CardBody className="flex flex-col gap-5">
        <div>
          <h3 className="text-lg font-semibold text-ink">{t("budget.title")}</h3>
          <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("budget.intro")}</p>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-4">
            {BUDGET_CATEGORIES.map((c) => {
              const items = budget[c];
              const total = categoryTotal(items);
              return (
                <section
                  key={c}
                  aria-label={t(`cat.${c}` as StringKey)}
                  className="rounded-xl border border-line bg-surface/60 p-3"
                  style={{ borderLeft: `4px solid ${COLOR[c]}` }}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <h4 className="text-base font-semibold text-ink">
                      {t(`cat.${c}` as StringKey)}
                      {done[c] && (
                        <span className="ml-2 text-xs font-normal text-olive" aria-hidden="true">
                          ✓
                        </span>
                      )}
                    </h4>
                    <span className="font-[family-name:var(--font-ui)] text-xs italic text-ink-soft">
                      {t(`cat.${c}.tag` as StringKey)}
                    </span>
                  </div>
                  <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                    {t(`cat.${c}.hint` as StringKey)}
                  </p>

                  <div className="mt-2 flex flex-col gap-2">
                    {items.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.label}
                          maxLength={80}
                          placeholder={idx === 0 ? t(`cat.${c}.ph` as StringKey) : t("budget.label")}
                          aria-label={`${t(`cat.${c}` as StringKey)}: ${t("budget.label")}`}
                          onChange={(e) =>
                            update(
                              c,
                              items.map((i) => (i.id === item.id ? { ...i, label: e.target.value } : i)),
                            )
                          }
                          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 font-[family-name:var(--font-ui)] text-sm text-ink focus:border-water focus:outline-none"
                        />
                        <span className="flex w-32 shrink-0 items-center rounded-lg border border-line bg-surface px-2 focus-within:border-water">
                          <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">$</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.01"
                            value={item.amount ?? ""}
                            placeholder="0"
                            aria-label={`${t(`cat.${c}` as StringKey)}: ${t("budget.amount")}`}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const n = parseFloat(raw);
                              update(
                                c,
                                items.map((i) =>
                                  i.id === item.id
                                    ? {
                                        ...i,
                                        amount: raw === "" || !Number.isFinite(n) ? null : Math.max(0, n),
                                      }
                                    : i,
                                ),
                              );
                            }}
                            className="w-full min-w-0 bg-transparent py-2 pl-1 text-right font-[family-name:var(--font-ui)] text-sm tabular-nums text-ink focus:outline-none"
                          />
                        </span>
                        <button
                          type="button"
                          aria-label={t("budget.remove")}
                          title={t("budget.remove")}
                          disabled={items.length === 1 && item.label === "" && item.amount === null}
                          onClick={() => {
                            const rest = items.filter((i) => i.id !== item.id);
                            update(c, rest.length > 0 ? rest : [newItem()]);
                          }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-parchment-deep hover:text-ink disabled:opacity-30"
                        >
                          <svg
                            viewBox="0 0 20 20"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          >
                            <path d="M5 5l10 10M15 5L5 15" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => update(c, [...items, newItem()])}
                      disabled={items.length >= 30}
                      className="rounded-lg px-2 py-1 font-[family-name:var(--font-ui)] text-sm font-medium hover:bg-parchment-deep disabled:opacity-40"
                      style={{ color: c === "discretionary" ? "var(--color-gold-text)" : COLOR[c] }}
                    >
                      + {t("budget.add")}
                    </button>
                    <span className="font-[family-name:var(--font-ui)] text-sm tabular-nums text-ink-soft">
                      {t("budget.total")}:{" "}
                      <span className="font-semibold text-ink">{formatCurrency(total)}</span>
                      {c !== "income" && sum.income > 0 && (
                        <span className="ml-2 text-xs">
                          ({t("budget.ofIncome", { pct: formatPercent(shareOfIncome(total, sum.income)) })})
                        </span>
                      )}
                    </span>
                  </div>
                </section>
              );
            })}
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-xl bg-parchment-deep/40 p-4">
              <p className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.14em] text-ink-soft">
                {t("budget.income")}
              </p>
              <p className="text-2xl font-semibold tabular-nums text-ink">{formatCurrency(sum.income)}</p>

              <h4 className="mt-4 font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
                {t("budget.summary")}
              </h4>
              <div
                className="mt-2 flex h-6 w-full overflow-hidden rounded-full bg-parchment-deep"
                role="img"
                aria-label={
                  segments
                    .filter((s) => s.value > 0)
                    .map((s) => `${s.label}: ${formatCurrency(s.value)}`)
                    .join(", ") || t("budget.summary")
                }
              >
                {segments.map((s) => (
                  <div
                    key={s.key}
                    className="h-full transition-[width] duration-500"
                    style={{ width: `${(s.value / scale) * 100}%`, backgroundColor: s.color }}
                  />
                ))}
              </div>
              <ul className="mt-3 flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs">
                {segments.map((s) => (
                  <li key={s.key} className="flex items-center justify-between gap-2 text-ink-soft">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.label}
                    </span>
                    <span className="tabular-nums">
                      {formatCurrency(s.value)}
                      {sum.income > 0 && ` · ${formatPercent(shareOfIncome(s.value, sum.income))}`}
                    </span>
                  </li>
                ))}
              </ul>
              <p
                className={`mt-3 rounded-lg px-3 py-2 font-[family-name:var(--font-ui)] text-sm ${
                  over ? "bg-amber-100 text-amber-900" : "bg-surface text-ink-soft"
                }`}
                role="status"
              >
                {sum.income === 0
                  ? t("budget.msg.empty")
                  : over
                    ? t("budget.msg.over", { amount: formatCurrency(-sum.leftover) })
                    : sum.leftover === 0
                      ? t("budget.msg.balanced")
                      : t("budget.msg.under", { amount: formatCurrency(sum.leftover) })}
              </p>
            </div>

            <div className="rounded-xl border border-line p-4">
              <label className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
                {t("budget.name")}
                <input
                  type="text"
                  value={name}
                  maxLength={80}
                  placeholder={t("budget.namePh")}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink focus:border-water focus:outline-none"
                />
              </label>

              <p className="mt-3 font-[family-name:var(--font-ui)] text-xs font-semibold text-ink-soft">
                {t("budget.checklist")}
              </p>
              <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 font-[family-name:var(--font-ui)] text-xs">
                {BUDGET_CATEGORIES.map((c) => (
                  <li
                    key={c}
                    className={`flex items-center gap-1.5 ${done[c] ? "text-olive" : "text-ink-soft"}`}
                  >
                    <span aria-hidden="true">{done[c] ? "✓" : "○"}</span>
                    {t(`cat.${c}` as StringKey)}
                  </li>
                ))}
              </ul>

              <Button className="mt-3 w-full" disabled={!complete || busy} onClick={() => void exportPdf()}>
                {busy ? t("budget.exporting") : t("budget.export")}
              </Button>
              {error && (
                <p className="mt-2 font-[family-name:var(--font-ui)] text-xs text-red-700" role="alert">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(t("budget.clearConfirm"))) reset();
                }}
                className="mt-2 w-full rounded-lg px-3 py-1.5 font-[family-name:var(--font-ui)] text-xs text-ink-soft hover:bg-parchment-deep hover:text-ink"
              >
                {t("budget.clear")}
              </button>
            </div>
          </aside>
        </div>

        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("budget.disclaimer")}</p>
      </CardBody>
    </Card>
  );
}
