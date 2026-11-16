import { useEffect, useState } from "react";
import { useLang } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";
import { fetchRates, monthYear, usd, type RatesReply } from "../../lib/liveData";

/**
 * Today's numbers (Update 41): inflation, the 3-month and 10-year Treasury, and the 30-year mortgage rate from FRED,
 * each with its date, plus a small check of what inflation does to cash over time.
 */
export function LiveRates() {
  const { t, lang } = useLang();
  const [data, setData] = useState<RatesReply | null | "failed">(null);
  const [amount, setAmount] = useState(1000);
  const [years, setYears] = useState(10);
  useEffect(() => {
    let live = true;
    fetchRates().then((r) => live && setData(r ?? "failed"));
    return () => {
      live = false;
    };
  }, []);

  if (data === null) return <section className="cm-card p-6 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("data.loading")}</section>;
  if (data === "failed") return <section className="cm-card p-6 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("data.failed")}</section>;

  const inflation = data.rates.find((r) => r.key === "inflation")?.value ?? 0;
  const real = amount / Math.pow(1 + inflation / 100, years);

  return (
    <section aria-labelledby="live-rates-title" data-tour="live-rates" className="cm-card flex flex-col gap-5 p-6">
      <div>
        <p className="cm-label">{t("rates.eyebrow")}</p>
        <h2 id="live-rates-title" className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-ink">
          {t("rates.title")}
        </h2>
      </div>
      <dl className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        {data.rates.map((r) => (
          <div key={r.key} className="cm-inset flex flex-col gap-0.5 p-4">
            <dt className="font-[family-name:var(--font-ui)] text-xs font-semibold text-ink">{t(`rates.${r.key}` as StringKey)}</dt>
            <dd className="font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums text-ink">{r.value.toFixed(r.value < 10 ? 2 : 1).replace(/0$/, "")}%</dd>
            <dd className="font-[family-name:var(--font-ui)] text-[11px] leading-snug text-ink-soft">
              {t(`rates.${r.key}Sub` as StringKey)} · {t("data.asOf", { date: monthYear(r.asOf, lang) })}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-3 border-t border-line pt-5">
        <h3 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">{t("rates.checkTitle")}</h3>
        <div className="flex flex-wrap items-end gap-3 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          <label className="flex flex-col gap-1">
            {t("rates.amount")}
            <input
              type="number"
              min={0}
              step={100}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
              className="w-32 rounded-md border border-line bg-surface px-3 py-2 text-sm tabular-nums text-ink focus:border-water focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            {t("rates.years")}
            <input
              type="number"
              min={1}
              max={50}
              value={years}
              onChange={(e) => setYears(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
              className="w-20 rounded-md border border-line bg-surface px-3 py-2 text-sm tabular-nums text-ink focus:border-water focus:outline-none"
            />
          </label>
        </div>
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink" aria-live="polite">
          {t("rates.checkResult", { rate: inflation, amount: usd(amount, lang), years, real: usd(Math.round(real), lang) })}
        </p>
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("rates.checkVerse")}</p>
      </div>
      <p className="font-[family-name:var(--font-ui)] text-[11px] text-ink-soft">
        {t("data.source", { source: data.source })} {t("data.educational")}
      </p>
    </section>
  );
}
