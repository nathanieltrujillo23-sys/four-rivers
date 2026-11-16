import { useState, type FormEvent } from "react";
import { useLang } from "../../i18n/LanguageContext";
import { bigUsd, fetchCharity, searchCharities, type CharityDetail, type CharityHit } from "../../lib/liveData";
import { Button } from "../ui/Button";

/**
 * Check a charity (Update 41): search U.S. nonprofits by name and read their recent IRS filings through ProPublica's
 * Nonprofit Explorer. It shows size and spending, never a rating, and says plainly that churches usually don't file.
 */
export function CharityCheck({ accent }: { accent: string }) {
  const { t, lang } = useLang();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [hits, setHits] = useState<CharityHit[] | null | "failed">(null);
  const [detail, setDetail] = useState<CharityDetail | null | "failed" | "loading">(null);

  async function search(e: FormEvent) {
    e.preventDefault();
    if (q.trim().length < 3) return;
    setBusy(true);
    setDetail(null);
    const r = await searchCharities(q.trim());
    setHits(r ? r.orgs : "failed");
    setBusy(false);
  }
  async function open(ein: string) {
    setDetail("loading");
    const r = await fetchCharity(ein);
    setDetail(r ?? "failed");
  }

  const latest = detail && typeof detail === "object" ? detail.filings[0] : undefined;
  const maxRev = detail && typeof detail === "object" ? Math.max(1, ...detail.filings.map((f) => f.revenue ?? 0)) : 1;

  return (
    <section aria-labelledby="charity-title" className="cm-card flex flex-col gap-4 p-6">
      <div>
        <p className="cm-label">{t("charity.eyebrow")}</p>
        <h2 id="charity-title" className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-ink">
          {t("charity.title")}
        </h2>
        <p className="mt-1 font-[family-name:var(--font-ui)] text-sm leading-relaxed text-ink-soft">{t("charity.sub")}</p>
      </div>

      {detail === null ? (
        <>
          <form onSubmit={search} className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-0 flex-1 flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
              {t("charity.label")}
              <input
                value={q}
                maxLength={80}
                placeholder={t("charity.ph")}
                onChange={(e) => setQ(e.target.value)}
                className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-water focus:outline-none"
              />
            </label>
            <Button type="submit" variant="secondary" disabled={busy || q.trim().length < 3}>
              {busy ? t("data.loading") : t("charity.search")}
            </Button>
          </form>
          {hits === "failed" && <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("data.failed")}</p>}
          {Array.isArray(hits) &&
            (hits.length === 0 ? (
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("charity.none")}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {hits.map((h) => (
                  <li key={h.ein}>
                    <button
                      type="button"
                      onClick={() => void open(h.ein)}
                      className="flex w-full items-center justify-between gap-3 py-2.5 text-left font-[family-name:var(--font-ui)] text-sm transition-colors hover:text-water-deep"
                    >
                      <span className="font-medium text-ink">{h.name}</span>
                      <span className="shrink-0 text-xs text-ink-soft">
                        {h.city}, {h.state}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ))}
        </>
      ) : detail === "loading" ? (
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("data.loading")}</p>
      ) : detail === "failed" ? (
        <div className="flex flex-col gap-2">
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("data.failed")}</p>
          <button type="button" onClick={() => setDetail(null)} className="w-fit font-[family-name:var(--font-ui)] text-xs font-medium text-water-deep hover:underline">
            {t("charity.back")}
          </button>
        </div>
      ) : (
        <div className="section-open flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-ink">
              {detail.org.name}
              <span className="ml-2 font-[family-name:var(--font-ui)] text-xs font-normal text-ink-soft">
                {detail.org.city}, {detail.org.state}
              </span>
            </h3>
            <button type="button" onClick={() => setDetail(null)} className="font-[family-name:var(--font-ui)] text-xs font-medium text-water-deep hover:underline">
              {t("charity.back")}
            </button>
          </div>
          {!latest ? (
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("charity.noFilings")}</p>
          ) : (
            <>
              <p className="cm-label">{t("charity.year", { year: latest.year })}</p>
              <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  ["charity.revenue", latest.revenue],
                  ["charity.contributions", latest.contributions],
                  ["charity.expenses", latest.expenses],
                  ["charity.netAssets", latest.netAssets],
                ].map(([k, v]) => (
                  <div key={k as string} className="cm-inset p-4">
                    <dt className="font-[family-name:var(--font-ui)] text-[11px] text-ink-soft">{t(k as "charity.revenue")}</dt>
                    <dd className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums text-ink">{bigUsd(v as number | null, lang)}</dd>
                  </div>
                ))}
              </dl>
              {latest.officerPay !== null && (
                <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                  {t("charity.officers")}: <span className="font-semibold tabular-nums text-ink">{bigUsd(latest.officerPay, lang)}</span>
                </p>
              )}
              {detail.filings.length > 1 && (
                <div>
                  <h4 className="cm-label">{t("charity.history")}</h4>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {detail.filings.map((f) => (
                      <li key={f.year} className="grid grid-cols-[3.5rem_1fr_5rem] items-center gap-3 font-[family-name:var(--font-ui)] text-xs">
                        <span className="tabular-nums text-ink-soft">{f.year}</span>
                        <span aria-hidden="true" className="h-1.5 rounded-full" style={{ width: `${Math.max(3, ((f.revenue ?? 0) / maxRev) * 100)}%`, backgroundColor: accent, opacity: 0.75 }} />
                        <span className="text-right tabular-nums text-ink">{bigUsd(f.revenue, lang)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-wrap gap-x-5 gap-y-1 font-[family-name:var(--font-ui)] text-xs font-medium">
                {latest.pdf && (
                  <a href={latest.pdf} target="_blank" rel="noopener noreferrer" className="text-water-deep hover:underline">
                    {t("charity.filing")}
                  </a>
                )}
                <a href={detail.org.url} target="_blank" rel="noopener noreferrer" className="text-water-deep hover:underline">
                  {t("charity.more")}
                </a>
              </div>
            </>
          )}
          <p className="cm-inset p-3 font-[family-name:var(--font-ui)] text-xs leading-relaxed text-ink-soft">{t("charity.caveat")}</p>
        </div>
      )}
      <p className="font-[family-name:var(--font-ui)] text-[11px] text-ink-soft">
        {t("data.source", { source: t("charity.source") })} {t("data.educational")}
      </p>
    </section>
  );
}
