import { useState, type FormEvent } from "react";
import { useLang } from "../../i18n/LanguageContext";
import { fetchPrograms, searchSchools, usd, type Program, type School } from "../../lib/liveData";
import * as live from "../../lib/liveData";
import { Button } from "../ui/Button";

/**
 * Check a school (Update 41): College Scorecard's median earnings, federal loan debt, net price and graduation rate for
 * a college, then its bachelor's majors with earnings one and four years out and typical debt.
 */
export function SchoolCheck() {
  const { t, lang } = useLang();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<School[] | null | "failed" | "busy">(null);
  const [chosen, setChosen] = useState<School | null>(null);
  const [programs, setPrograms] = useState<Program[] | null | "failed" | "busy">(null);
  const [filter, setFilter] = useState("");

  async function search(e: FormEvent) {
    e.preventDefault();
    if (q.trim().length < 3) return;
    setBusy(true);
    setChosen(null);
    const r = await searchSchools(q.trim());
    setResults(r ? r.schools : live.lastFailureBusy ? "busy" : "failed");
    setBusy(false);
  }
  async function choose(s: School) {
    setChosen(s);
    setPrograms(null);
    setFilter("");
    const r = await fetchPrograms(s.id);
    setPrograms(r ? r.programs : live.lastFailureBusy ? "busy" : "failed");
  }

  const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);
  const shown = Array.isArray(programs) ? programs.filter((p) => p.title.toLowerCase().includes(filter.toLowerCase())) : [];

  return (
    <section aria-labelledby="school-title" className="cm-card flex flex-col gap-4 p-6">
      <div>
        <p className="cm-label">{t("school.eyebrow")}</p>
        <h2 id="school-title" className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-ink">
          {t("school.title")}
        </h2>
        <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("school.sub")}</p>
      </div>

      {!chosen ? (
        <>
          <form onSubmit={search} className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-0 flex-1 flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
              {t("school.label")}
              <input
                value={q}
                maxLength={80}
                placeholder={t("school.ph")}
                onChange={(e) => setQ(e.target.value)}
                className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-water focus:outline-none"
              />
            </label>
            <Button type="submit" variant="secondary" disabled={busy || q.trim().length < 3}>
              {busy ? t("data.loading") : t("school.search")}
            </Button>
          </form>
          {(results === "failed" || results === "busy") && (
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t(results === "busy" ? "data.busy" : "data.failed")}</p>
          )}
          {Array.isArray(results) &&
            (results.length === 0 ? (
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("school.none")}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {results.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => void choose(s)}
                      className="flex w-full items-center justify-between gap-3 py-2.5 text-left font-[family-name:var(--font-ui)] text-sm transition-colors hover:text-water-deep"
                    >
                      <span className="font-medium text-ink">{s.name}</span>
                      <span className="shrink-0 text-xs text-ink-soft">
                        {s.city}, {s.state}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ))}
        </>
      ) : (
        <div className="section-open flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-ink">
              {chosen.name}
              <span className="ml-2 font-[family-name:var(--font-ui)] text-xs font-normal text-ink-soft">
                {chosen.city}, {chosen.state}
              </span>
            </h3>
            <button type="button" onClick={() => setChosen(null)} className="font-[family-name:var(--font-ui)] text-xs font-medium text-water-deep hover:underline">
              {t("school.back")}
            </button>
          </div>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["school.earnings10", usd(chosen.earnings10, lang)],
              ["school.debt", usd(chosen.debt, lang)],
              ["school.netPrice", usd(chosen.netPrice, lang)],
              ["school.completion", pct(chosen.completion)],
            ].map(([k, v]) => (
              <div key={k} className="cm-inset p-4">
                <dt className="font-[family-name:var(--font-ui)] text-[11px] leading-snug text-ink-soft">{t(k as "school.debt")}</dt>
                <dd className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums text-ink">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h4 className="cm-label">{t("school.majors")}</h4>
              {Array.isArray(programs) && programs.length > 8 && (
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  aria-label={t("school.filter")}
                  placeholder={t("school.filter")}
                  className="w-48 rounded-md border border-line bg-surface px-3 py-1.5 font-[family-name:var(--font-ui)] text-xs text-ink focus:border-water focus:outline-none"
                />
              )}
            </div>
            {programs === null ? (
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("data.loading")}</p>
            ) : programs === "failed" || programs === "busy" ? (
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t(programs === "busy" ? "data.busy" : "data.failed")}</p>
            ) : programs.length === 0 ? (
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("school.noMajors")}</p>
            ) : (
              <div className="max-h-96 overflow-auto rounded-md border border-line">
                <table className="w-full font-[family-name:var(--font-ui)] text-xs">
                  <thead className="sticky top-0 bg-surface text-ink-soft">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left font-medium">{t("school.major")}</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">{t("school.earn1")}</th>
                      <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">{t("school.earn4")}</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">{t("school.majorDebt")}</th>
                      <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">{t("school.payment")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((p) => (
                      <tr key={p.title} className="border-t border-line">
                        <th scope="row" className="px-3 py-2 text-left font-normal text-ink">{p.title}</th>
                        <td className="px-3 py-2 text-right tabular-nums text-ink">{usd(p.earnings1, lang)}</td>
                        <td className="hidden px-3 py-2 text-right tabular-nums text-ink sm:table-cell">{usd(p.earnings4, lang)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink">{usd(p.debt, lang)}</td>
                        <td className="hidden px-3 py-2 text-right tabular-nums text-ink sm:table-cell">{usd(p.payment, lang)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      <p className="font-[family-name:var(--font-ui)] text-[11px] text-ink-soft">
        {t("data.source", { source: t("school.source") })} {t("data.educational")}
      </p>
    </section>
  );
}
