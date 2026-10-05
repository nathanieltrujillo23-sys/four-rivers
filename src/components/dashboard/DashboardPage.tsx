import { useState } from "react";
import { Link } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useLang } from "../../i18n/LanguageContext";
import { CLOSING_REFLECTION_ES } from "../../content/es/closing";
import { localizedVerse } from "../../content/scriptureEs";
import type { StringKey } from "../../i18n/en";
import { FEATURES } from "../../lib/features";
import { RIVERS, readable } from "../../theme/theme";
import { hasFullAccess, isCourseComplete } from "../../state/progress";
import { totalMonthlyEquivalent } from "../../utils/income";
import { formatCurrency, formatDate, formatPercent } from "../../utils/format";
import { CLOSING_REFLECTION } from "../../content/lessons";
import { VERSE } from "../../content/scripture";
import { ScriptureList } from "../ui/Scripture";
import { Card, CardBody } from "../ui/Card";
import { Button } from "../ui/Button";
import { LoadError } from "../ui/LoadError";
import { LockIcon } from "../ui/RiverIcons";
import { RiverProgress } from "../layout/RiverProgress";
import { RiverTotalsChart } from "./RiverTotalsChart";
import { IncomeStreamTracker } from "../trackers/IncomeStreamTracker";
import { SavingsTracker } from "../trackers/SavingsTracker";
import { InvestmentTracker } from "../trackers/InvestmentTracker";
import { GivingTracker } from "../trackers/GivingTracker";

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <Card accent={accent}>
      <CardBody>
        <div className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.12em] text-ink-soft">
          {label}
        </div>
        <div className="mt-1 text-2xl font-semibold text-ink tabular-nums">{value}</div>
        {sub && <div className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{sub}</div>}
      </CardBody>
    </Card>
  );
}

const TRACKER_TABS = [
  { river: 0, label: "hero.income", Tracker: IncomeStreamTracker },
  { river: 1, label: "hero.saving", Tracker: SavingsTracker },
  { river: 2, label: "hero.investing", Tracker: InvestmentTracker },
  { river: 3, label: "hero.giving", Tracker: GivingTracker },
] as const;

/**
 * The permanent home for ongoing tracking. Unlocks once all four rivers are
 * complete; from then on it is where every tracker keeps being used, with
 * every number derived live from the ledger rows.
 */
export function DashboardPage() {
  const { lang, t } = useLang();
  const { snapshot, loading, loadError, reload } = useCourse();
  const [tab, setTab] = useState(0);

  if (loading && !snapshot)
    return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("common.loading")}</p>;
  if (loadError) return <LoadError message={loadError} onRetry={reload} />;
  if (!snapshot) return null;

  if (!isCourseComplete(snapshot) && !hasFullAccess(snapshot)) {
    return (
      <Card>
        <CardBody className="text-center">
          <h1 className="text-2xl font-semibold text-ink">{t("dash.locked")}</h1>
          <p className="mx-auto mt-2 max-w-md font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            {t("dash.lockedText")}
          </p>
          <Link to="/course" className="mt-4 inline-block">
            <Button>{t("dash.backCourse")}</Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  const { incomeStreams, savingsGoals, savingsContributions, investmentEntries, givingEntries } = snapshot;

  const monthlyIncome = totalMonthlyEquivalent(incomeStreams);
  const totalSaved = savingsContributions.reduce((s, c) => s + c.amount, 0);
  const totalTargets = savingsGoals.reduce((s, g) => s + g.targetAmount, 0);
  const totalInvested = investmentEntries.reduce((s, e) => s + e.contributionAmount, 0);
  const thisYear = new Date().getFullYear();
  const givenThisYear = givingEntries
    .filter((e) => new Date(e.createdAt).getFullYear() === thisYear)
    .reduce((s, e) => s + e.amount, 0);
  const givenAllTime = givingEntries.reduce((s, e) => s + e.amount, 0);

  const completedAts = snapshot.progress
    .map((p) => p.completedAt)
    .filter((x): x is string => !!x)
    .sort();
  const finishedOn = completedAts[completedAts.length - 1];

  const ActiveTracker = TRACKER_TABS[tab].Tracker;
  const closingVerse = localizedVerse(CLOSING_REFLECTION.scripture, lang);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.2em] text-clay">
              {t("dash.complete", { date: finishedOn ? ` · ${formatDate(finishedOn)}` : "" })}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-ink">{t("dash.title")}</h1>
            <p className="mt-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("dash.intro")}</p>
          </div>
          <Link to="/certificate">
            <Button variant="secondary" className="inline-flex items-center gap-2">
              {t("dash.viewCert")}
              {!snapshot.profile.examPassedAt && !hasFullAccess(snapshot) && (
                <LockIcon color="currentColor" size={14} />
              )}
            </Button>
          </Link>
        </div>
        <ScriptureList verses={[VERSE.cor4_2_kjv, VERSE.prov27_23_esv]} compact />
      </header>

      <div className="flex justify-center">
        <RiverProgress snapshot={snapshot} />
      </div>

      <Card>
        <CardBody>
          <h2 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
            {t("dash.glance")}
          </h2>
          <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("dash.glanceNote")}</p>
          <RiverTotalsChart
            bars={[
              {
                label: t("dash.chartIncome"),
                value: formatCurrency(monthlyIncome, true),
                amount: monthlyIncome,
                color: readable(RIVERS[0].accent),
              },
              {
                label: t("dash.chartSaved"),
                value: formatCurrency(totalSaved, true),
                amount: totalSaved,
                color: readable(RIVERS[1].accent),
              },
              {
                label: t("dash.chartInvested"),
                value: formatCurrency(totalInvested, true),
                amount: totalInvested,
                color: readable(RIVERS[2].accent),
              },
              {
                label: t("dash.chartGiven"),
                value: formatCurrency(givenAllTime, true),
                amount: givenAllTime,
                color: readable(RIVERS[3].accent),
              },
            ]}
          />
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat
          label={t("dash.stat.income")}
          value={String(incomeStreams.length)}
          sub={t("dash.recurring", { amount: formatCurrency(monthlyIncome) })}
          accent={RIVERS[0].accent}
        />
        <Stat
          label={t("dash.stat.saved")}
          value={formatCurrency(totalSaved)}
          sub={
            savingsGoals.length > 0
              ? `${t(savingsGoals.length === 1 ? "dash.goalsOne" : "dash.goalsMany", { n: savingsGoals.length })}${
                  totalTargets > 0
                    ? t("dash.ofTargets", { pct: formatPercent(totalSaved / totalTargets) })
                    : ""
                }`
              : undefined
          }
          accent={RIVERS[1].accent}
        />
        <Stat
          label={t("dash.stat.invested")}
          value={formatCurrency(totalInvested)}
          sub={t(investmentEntries.length === 1 ? "dash.contribOne" : "dash.contribMany", {
            n: investmentEntries.length,
          })}
          accent={RIVERS[2].accent}
        />
        <Stat
          label={t("dash.stat.given")}
          value={formatCurrency(givenAllTime)}
          sub={t("dash.inYear", { amount: formatCurrency(givenThisYear), year: thisYear })}
          accent={RIVERS[3].accent}
        />
      </div>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-ink">{t("dash.keep")}</h2>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("dash.keepText")}</p>
        </div>
        <div role="tablist" className="flex flex-wrap gap-2 font-[family-name:var(--font-ui)]">
          {TRACKER_TABS.map((tabItem, i) => (
            <button
              key={tabItem.label}
              role="tab"
              aria-selected={tab === i}
              onClick={() => setTab(i)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === i ? "text-white" : "border-line bg-surface/60 text-ink-soft hover:bg-parchment-deep"
              }`}
              style={
                tab === i ? { backgroundColor: RIVERS[i].accent, borderColor: RIVERS[i].accent } : undefined
              }
            >
              {t(tabItem.label as StringKey)}
            </button>
          ))}
        </div>
        <ActiveTracker key={tab} />
      </section>

      <Card className="bg-parchment-deep/50">
        <CardBody className="text-center">
          <p className="font-[family-name:var(--font-display)] text-xl leading-snug text-ink">
            “{closingVerse.text}”
          </p>
          <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            — {closingVerse.reference} ({closingVerse.version})
          </p>
          <div className="mx-auto mt-6 flex max-w-xl flex-col gap-5 text-left">
            {CLOSING_REFLECTION.body.map((para, i) => (
              <div key={i} className="flex flex-col gap-3">
                <p className="text-ink-soft leading-relaxed">
                  {lang === "es" ? (CLOSING_REFLECTION_ES[i] ?? para.text) : para.text}
                </p>
                <ScriptureList verses={para.scriptureRefs} compact />
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-wrap justify-center gap-3">
        {RIVERS.map((r) => (
          <Link key={r.number} to={`/course/river/${r.number}`}>
            <Button variant="secondary">{t("dash.revisit", { n: r.number })}</Button>
          </Link>
        ))}
        {FEATURES.journal && (
          <Link to="/journal">
            <Button>Write in your journal</Button>
          </Link>
        )}
        <Link to="/community">
          <Button>{t("nav.community")}</Button>
        </Link>
      </div>
    </div>
  );
}
