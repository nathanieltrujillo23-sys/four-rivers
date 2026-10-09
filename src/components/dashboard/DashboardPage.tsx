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
import { DashboardCalculators } from "./DashboardCalculators";
import { RiverTotalsChart } from "./RiverTotalsChart";
import { IncomeStreamTracker } from "../trackers/IncomeStreamTracker";
import { SavingsTracker } from "../trackers/SavingsTracker";
import { InvestmentTracker } from "../trackers/InvestmentTracker";
import { GivingTracker } from "../trackers/GivingTracker";
import { PageSkeleton } from "../ui/Skeleton";
import { trackerGaps } from "./trackerGaps";

/** A note over a number that needs a tracker filled in before it shows fully and correctly. */
function NeedsNote({ children }: { children: string }) {
  return (
    <p role="note" className="mb-2 rounded-lg border border-gold/60 bg-gold/10 px-2.5 py-1.5 font-[family-name:var(--font-ui)] text-xs text-ink">
      {children}
    </p>
  );
}

function Stat({ label, value, sub, accent, needs }: { label: string; value: string; sub?: string; accent: string; needs?: string }) {
  return (
    <Card accent={accent}>
      <CardBody>
        {needs && <NeedsNote>{needs}</NeedsNote>}
        <div className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.12em] text-ink-soft">
          {label}
        </div>
        <div className="mt-1 t-h2 tabular-nums">{value}</div>
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
 * The permanent home for ongoing tracking, open to every signed-in learner. It is where every
 * tracker keeps being used, with every number derived live from the ledger rows. A number whose
 * tracker is still empty carries a note saying which tracker fills it in.
 */
export function DashboardPage() {
  const { lang, t } = useLang();
  const { snapshot, loading, loadError, reload } = useCourse();
  const [tab, setTab] = useState(0);

  if (loading && !snapshot)
    return <PageSkeleton label={t("common.loading")} />;
  if (loadError) return <LoadError message={loadError} onRetry={reload} />;
  if (!snapshot) return null;

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

  // The trackers with nothing in them yet; the numbers they feed are empty until they are filled in.
  const empty = trackerGaps(snapshot);
  const emptyTrackers = TRACKER_TABS.filter((_, i) => empty[i]);

  const ActiveTracker = TRACKER_TABS[tab].Tracker;
  const closingVerse = localizedVerse(CLOSING_REFLECTION.scripture, lang);

  return (
    <div className="page-stack">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="t-eyebrow">
              {isCourseComplete(snapshot)
                ? t("dash.complete", { date: finishedOn ? ` · ${formatDate(finishedOn)}` : "" })
                : t("dash.eyebrowOpen")}
            </p>
            <h1 className="mt-2 t-h1">{t("dash.title")}</h1>
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
          {emptyTrackers.length > 0 && (
            <div className="mt-2">
              <NeedsNote>{t("dash.needs.chart", { list: emptyTrackers.map((x) => t(x.label as StringKey)).join(", ") })}</NeedsNote>
            </div>
          )}
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
          needs={empty[0] ? t("dash.needs.income") : undefined}
          label={t("dash.stat.income")}
          value={String(incomeStreams.length)}
          sub={t("dash.recurring", { amount: formatCurrency(monthlyIncome) })}
          accent={RIVERS[0].accent}
        />
        <Stat
          needs={empty[1] ? t("dash.needs.saved") : undefined}
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
          needs={empty[2] ? t("dash.needs.invested") : undefined}
          label={t("dash.stat.invested")}
          value={formatCurrency(totalInvested)}
          sub={t(investmentEntries.length === 1 ? "dash.contribOne" : "dash.contribMany", {
            n: investmentEntries.length,
          })}
          accent={RIVERS[2].accent}
        />
        <Stat
          needs={empty[3] ? t("dash.needs.given") : undefined}
          label={t("dash.stat.given")}
          value={formatCurrency(givenAllTime)}
          sub={t("dash.inYear", { amount: formatCurrency(givenThisYear), year: thisYear })}
          accent={RIVERS[3].accent}
        />
      </div>

      <DashboardCalculators />

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="t-h2">{t("dash.keep")}</h2>
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

      {isCourseComplete(snapshot) && (
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
      )}

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
