import { useEffect, useState } from "react";
import { useLang } from "../../i18n/LanguageContext";
import { JOB_NAMES, fetchPay, usd, type PayReply } from "../../lib/liveData";

/**
 * What jobs pay (Update 41): median yearly pay for a dozen jobs, nationally or in Florida, from the Bureau of Labor
 * Statistics, drawn as quiet bars so the differences are easy to see.
 */
export function PayByJob({ accent }: { accent: string }) {
  const { t, lang } = useLang();
  const [area, setArea] = useState<"us" | "fl">("us");
  const [data, setData] = useState<Partial<Record<"us" | "fl", PayReply | "failed">>>({});
  useEffect(() => {
    if (data[area]) return;
    let live = true;
    fetchPay(area).then((r) => live && setData((d) => ({ ...d, [area]: r ?? "failed" })));
    return () => {
      live = false;
    };
  }, [area, data]);

  const reply = data[area];
  const jobs = reply && reply !== "failed" ? [...reply.jobs].sort((a, b) => b.median - a.median) : [];
  const top = jobs[0]?.median ?? 1;

  return (
    <section aria-labelledby="pay-title" className="cm-card flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="cm-label">{t("pay.eyebrow")}</p>
          <h2 id="pay-title" className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-ink">
            {t("pay.title")}
          </h2>
        </div>
        <div role="group" aria-label={t("pay.title")} className="inline-flex rounded-md border border-line p-0.5 font-[family-name:var(--font-ui)] text-xs">
          {(["us", "fl"] as const).map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={area === a}
              onClick={() => setArea(a)}
              className={`rounded-[5px] px-3 py-1.5 font-medium transition-colors ${area === a ? "bg-water-deep text-white" : "text-ink-soft hover:text-ink"}`}
            >
              {t(a === "us" ? "pay.us" : "pay.fl")}
            </button>
          ))}
        </div>
      </div>
      <p className="font-[family-name:var(--font-ui)] text-sm leading-relaxed text-ink-soft">{t("pay.sub")}</p>
      {!reply ? (
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("data.loading")}</p>
      ) : reply === "failed" ? (
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("data.failed")}</p>
      ) : (
        <>
          <table className="w-full font-[family-name:var(--font-ui)] text-sm">
            <thead className="sr-only">
              <tr>
                <th scope="col">{t("pay.job")}</th>
                <th scope="col">{t("pay.median")}</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.soc} className="border-t border-line first:border-t-0">
                  <th scope="row" className="py-2 pr-3 text-left font-normal text-ink">
                    {JOB_NAMES[j.soc]?.[lang === "es" ? "es" : "en"] ?? j.soc}
                    <span aria-hidden="true" className="mt-1 block h-1 rounded-full" style={{ width: `${Math.max(4, (j.median / top) * 100)}%`, backgroundColor: accent, opacity: 0.75 }} />
                  </th>
                  <td className="w-28 py-2 text-right align-top font-semibold tabular-nums text-ink">{usd(j.median, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="font-[family-name:var(--font-ui)] text-[11px] text-ink-soft">
            {t("data.source", { source: t("pay.source", { year: reply.year }) })} {t("data.educational")}
          </p>
        </>
      )}
    </section>
  );
}
