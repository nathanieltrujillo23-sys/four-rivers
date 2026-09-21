import { useState } from "react";
import { Link } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { RIVERS } from "../../theme/theme";
import { isCourseComplete } from "../../state/progress";
import { totalMonthlyEquivalent } from "../../utils/income";
import { formatCurrency, formatDate, formatPercent } from "../../utils/format";
import { CLOSING_REFLECTION } from "../../content/lessons";
import { VERSE } from "../../content/scripture";
import { ScriptureList } from "../ui/Scripture";
import { Card, CardBody } from "../ui/Card";
import { Button } from "../ui/Button";
import { RiverProgress } from "../layout/RiverProgress";
import { IncomeStreamTracker } from "../trackers/IncomeStreamTracker";
import { SavingsTracker } from "../trackers/SavingsTracker";
import { InvestmentTracker } from "../trackers/InvestmentTracker";
import { GivingTracker } from "../trackers/GivingTracker";

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <Card accent={accent}>
      <CardBody>
        <div className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.12em] text-ink-soft">
          {label}
        </div>
        <div className="mt-1 text-2xl font-semibold text-ink tabular-nums">{value}</div>
        {sub && (
          <div className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{sub}</div>
        )}
      </CardBody>
    </Card>
  );
}

const TRACKER_TABS = [
  { river: 0, label: "Income", Tracker: IncomeStreamTracker },
  { river: 1, label: "Saving", Tracker: SavingsTracker },
  { river: 2, label: "Investing", Tracker: InvestmentTracker },
  { river: 3, label: "Giving", Tracker: GivingTracker },
] as const;

/**
 * The permanent home for ongoing tracking. Unlocks once all four rivers are
 * complete; from then on it is where every tracker keeps being used, with
 * every number derived live from the ledger rows.
 */
export function DashboardPage() {
  const { snapshot, loading } = useCourse();
  const [tab, setTab] = useState(0);

  if (loading && !snapshot)
    return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading…</p>;
  if (!snapshot) return null;

  if (!isCourseComplete(snapshot)) {
    return (
      <Card>
        <CardBody className="text-center">
          <h1 className="text-2xl font-semibold text-ink">Your dashboard unlocks after River 4</h1>
          <p className="mx-auto mt-2 max-w-md font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            Finish all four rivers — read each lesson and log at least one entry in each tracker —
            and this becomes your home for tracking everything going forward.
          </p>
          <Link to="/course" className="mt-4 inline-block">
            <Button>Back to the course</Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  const { incomeStreams, savingsGoals, savingsContributions, investmentEntries, givingEntries } =
    snapshot;

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

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div>
          <p className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.2em] text-clay">
            Course complete{finishedOn ? ` · ${formatDate(finishedOn)}` : ""}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Your dashboard</h1>
          <p className="mt-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            Everything you've logged across the four rivers, and the place to keep logging. Totals
            are always added up from your entries.
          </p>
        </div>
        <ScriptureList verses={[VERSE.cor4_2_kjv, VERSE.prov27_23_esv]} compact />
      </header>

      <div className="flex justify-center">
        <RiverProgress snapshot={snapshot} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat
          label="River 1 · Income streams"
          value={String(incomeStreams.length)}
          sub={`≈ ${formatCurrency(monthlyIncome)}/mo recurring`}
          accent={RIVERS[0].accent}
        />
        <Stat
          label="River 2 · Saved"
          value={formatCurrency(totalSaved)}
          sub={
            savingsGoals.length > 0
              ? `across ${savingsGoals.length} goal${savingsGoals.length === 1 ? "" : "s"}${
                  totalTargets > 0 ? ` · ${formatPercent(totalSaved / totalTargets)} of targets` : ""
                }`
              : undefined
          }
          accent={RIVERS[1].accent}
        />
        <Stat
          label="River 3 · Invested"
          value={formatCurrency(totalInvested)}
          sub={`${investmentEntries.length} contribution${investmentEntries.length === 1 ? "" : "s"} logged`}
          accent={RIVERS[2].accent}
        />
        <Stat
          label="River 4 · Given"
          value={formatCurrency(givenAllTime)}
          sub={`${formatCurrency(givenThisYear)} in ${thisYear}`}
          accent={RIVERS[3].accent}
        />
      </div>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Keep tracking</h2>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            Log new entries any time — the totals above update as you go.
          </p>
        </div>
        <div role="tablist" className="flex flex-wrap gap-2 font-[family-name:var(--font-ui)]">
          {TRACKER_TABS.map((t, i) => (
            <button
              key={t.label}
              role="tab"
              aria-selected={tab === i}
              onClick={() => setTab(i)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === i
                  ? "text-white"
                  : "border-line bg-white/60 text-ink-soft hover:bg-parchment-deep"
              }`}
              style={tab === i ? { backgroundColor: RIVERS[i].accent, borderColor: RIVERS[i].accent } : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>
        <ActiveTracker key={tab} />
      </section>

      <Card className="bg-parchment-deep/50">
        <CardBody className="text-center">
          <p className="font-[family-name:var(--font-display)] text-xl leading-snug text-ink">
            “{CLOSING_REFLECTION.scripture.text}”
          </p>
          <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            — {CLOSING_REFLECTION.scripture.reference} ({CLOSING_REFLECTION.scripture.translation})
          </p>
          <div className="mx-auto mt-6 flex max-w-xl flex-col gap-5 text-left">
            {CLOSING_REFLECTION.body.map((para, i) => (
              <div key={i} className="flex flex-col gap-3">
                <p className="text-ink-soft leading-relaxed">{para.text}</p>
                <ScriptureList verses={para.scriptureRefs} compact />
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-wrap justify-center gap-3">
        {RIVERS.map((r) => (
          <Link key={r.number} to={`/course/river/${r.number}`}>
            <Button variant="secondary">Revisit River {r.number}</Button>
          </Link>
        ))}
        <Link to="/journal">
          <Button>Write in your journal</Button>
        </Link>
      </div>
    </div>
  );
}
