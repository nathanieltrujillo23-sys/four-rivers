import { useEffect, useState } from "react";
import { useLang } from "../../i18n/LanguageContext";
import { loadPublicStats, type PublicStats } from "../../lib/siteText";

/** A small "by the numbers" row on the home page. Shown only while an admin has turned it on, and only the numbers above zero. */
export function StatsStrip() {
  const { t } = useLang();
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    let alive = true;
    loadPublicStats()
      .then((s) => alive && setStats(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!stats?.enabled) return null;
  const items = [
    { n: stats.learners ?? 0, label: t("stats.learners") },
    { n: stats.certificates ?? 0, label: t("stats.certificates") },
    { n: stats.groups ?? 0, label: t("stats.groups") },
  ].filter((i) => i.n > 0);
  if (items.length === 0) return null;

  return (
    <section aria-label={t("stats.label")} className="flex flex-wrap justify-center gap-x-10 gap-y-4 py-2 text-center">
      {items.map((i) => (
        <div key={i.label}>
          <p className="text-4xl font-semibold tabular-nums text-ink">{i.n.toLocaleString()}</p>
          <p className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.14em] text-ink-soft">{i.label}</p>
        </div>
      ))}
    </section>
  );
}
