import { TickText } from "../ui/TickText";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useContent } from "../../state/ContentContext";
import { useLang } from "../../i18n/LanguageContext";
import {
  activityDates,
  courseHours,
  currentChallengeDay,
  generateChallengePlan,
  isDayComplete,
  minutesPerDay,
  nextTask,
  planLength,
  streakInfo,
  type PlanLength,
} from "../../state/challenge";
import { Button } from "../ui/Button";
import { ProgressBar } from "../ui/ProgressBar";
import { LoadError } from "../ui/LoadError";
import { PageSkeleton } from "../ui/Skeleton";
import { FeatureIcon } from "../ui/FeatureIcons";
import { buildIcs, downloadFile } from "../../lib/ics";
import { THEME } from "../../theme/theme";

const ACCENT = THEME.palette.gold;
const linkCls = "font-[family-name:var(--font-ui)] text-xs font-medium text-water-deep hover:underline disabled:opacity-50";

/**
 * Your pace (Update 38, replacing the 30-Day Challenge). A learner chooses one week, two weeks, or their own pace. A
 * plan spreads every module, tracker entry and quiz across the days, with the final exam alone on the last day.
 * Nothing here gates anything: "done" and the streak come from real activity, so changing pace or falling behind
 * never loses progress. After the exam, 30 Days of Practice (/practice) takes over.
 */
export function ChallengePage() {
  const { snapshot, loading, loadError, reload, startChallenge, chooseOwnPace, changePace, resetChallenge, dismissPaceNote } =
    useCourse();
  const { t, lang } = useLang();
  const { getIntroduction, getRiver } = useContent();
  const content = useMemo(() => ({ introduction: getIntroduction(), river: getRiver }), [getIntroduction, getRiver]);
  const length = planLength(snapshot?.profile.paceDays);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = useMemo(() => generateChallengePlan(content, length), [lang, length]);
  const [busy, setBusy] = useState(false);

  if (loading && !snapshot) return <PageSkeleton label={t("common.loading")} />;
  if (loadError) return <LoadError message={loadError} onRetry={reload} />;
  if (!snapshot) return null;

  const { paceDays, challengeStartedAt: startedAt, paceNote, examPassedAt } = snapshot.profile;
  const hours = courseHours();
  const run = (fn: () => Promise<void>) => async () => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  const paceName = (n: PlanLength) => t(n === 7 ? "challenge.paceName7" : "challenge.paceName14");

  const practiceTeaser = (
    <section className="cm-inset flex flex-wrap items-center justify-between gap-3 p-5">
      <div className="min-w-0">
        <h2 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">{t("challenge.practiceTeaser")}</h2>
        <p className="mt-0.5 font-[family-name:var(--font-ui)] text-xs leading-relaxed text-ink-soft">{t(examPassedAt ? "challenge.practiceReady" : "challenge.practiceTeaserText")}</p>
      </div>
      {examPassedAt && (
        <Link to="/practice" className={linkCls}>
          {t("practice.homeOpen")}
        </Link>
      )}
    </section>
  );

  /* ---- No plan running: choose, or your own pace ---- */
  if (!startedAt) {
    const own = paceDays === 0;
    const next = own ? nextTask(snapshot, content) : null;
    const choices: { days: PlanLength | 0; title: string; sub: string; icon: "calendar" | "compass" }[] = [
      { days: 7, title: t("challenge.paceWeek"), sub: t("challenge.paceWeekSub", { mins: minutesPerDay(7) }), icon: "calendar" },
      { days: 14, title: t("challenge.paceTwo"), sub: t("challenge.paceTwoSub", { mins: minutesPerDay(14) }), icon: "calendar" },
      { days: 0, title: t("challenge.paceOwn"), sub: t("challenge.paceOwnSub"), icon: "compass" },
    ];
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-8 py-4">
        <header data-tour="challenge-header" className="rise-in">
          <p className="cm-label">{t("challenge.eyebrow")}</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-ink">
            {own ? t("challenge.ownTitle") : t("challenge.title")}
          </h1>
          <span aria-hidden="true" className="grow-x mt-4 block h-px w-16 bg-water-deep" />
          <p className="mt-4 max-w-2xl font-[family-name:var(--font-ui)] text-sm leading-relaxed text-ink-soft">
            {own ? t("challenge.ownText") : t("challenge.intro", { hours })}
          </p>
        </header>

        {own && (
          <section className="cm-card flex flex-wrap items-center justify-between gap-4 p-6">
            {next ? (
              <>
                <div className="min-w-0">
                  <p className="cm-label">{t("challenge.next")}</p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold text-ink">{t(next.labelKey, next.vars)}</p>
                </div>
                <Link to={next.to}>
                  <Button>{t("challenge.go")}</Button>
                </Link>
              </>
            ) : (
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink">{t("challenge.allDone")}</p>
            )}
          </section>
        )}

        <section aria-label={t("challenge.title")} className="stagger grid gap-4 sm:grid-cols-3">
          {(own ? choices.filter((c) => c.days !== 0) : choices).map((c, i) => (
            <button
              key={c.days}
              type="button"
              disabled={busy}
              onClick={run(() => (c.days === 0 ? chooseOwnPace() : startChallenge(c.days)))}
              className="cm-card cm-lift cm-rule group flex h-full flex-col p-6 text-left disabled:opacity-60"
            >
              <span className="flex w-full items-start justify-between">
                <span className="cm-icon h-11 w-11">
                  <FeatureIcon name={c.icon} size={22} />
                </span>
                {c.days === 14 ? (
                  <span className="cm-badge">{t("challenge.recommended")}</span>
                ) : (
                  <span className="font-[family-name:var(--font-ui)] text-xs font-medium tabular-nums tracking-[0.12em] text-ink-soft">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                )}
              </span>
              <span className="mt-6 font-[family-name:var(--font-display)] text-xl font-semibold leading-snug text-ink">{c.title}</span>
              <span className="mt-2 font-[family-name:var(--font-ui)] text-sm leading-relaxed text-ink-soft">{c.sub}</span>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-6 font-[family-name:var(--font-ui)] text-sm font-medium text-water-deep">
                {busy ? t("challenge.starting") : t("challenge.choose")}
                <FeatureIcon name="arrow" size={16} className="cm-arrow" />
              </span>
            </button>
          ))}
        </section>

        {practiceTeaser}
      </div>
    );
  }

  /* ---- A plan is running ---- */
  const today = currentChallengeDay(startedAt, length);
  const dates = activityDates(snapshot);
  const { streak, forgiven, graceReady } = streakInfo(dates);
  const graceDate = forgiven[0]
    ? new Date(`${forgiven[0]}T12:00:00`).toLocaleDateString(lang === "es" ? "es-US" : "en-US", { month: "short", day: "numeric" })
    : null;
  const completedDays = plan.filter((d) => isDayComplete(d, snapshot)).length;
  const other: PlanLength = length === 7 ? 14 : 7;

  /** One all-day event per plan day, starting on the day it was started. */
  function addToCalendar() {
    const start = new Date(startedAt as string);
    const iso = (offset: number) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const link = `${window.location.origin}/challenge`;
    const text = buildIcs(
      paceName(length),
      plan.map((d, i) => ({
        uid: `pace-${snapshot!.profile.userId}-day${d.day}@four-rivers`,
        date: iso(i),
        title: `${paceName(length)}: ${t(d.titleKey, { n: d.day })}`,
        description: [...d.items.map((item) => `- ${t(item.labelKey, item.vars)}`), link].join("\n"),
        url: link,
      })),
    );
    downloadFile(`4-rivers-${length}-day-plan.ics`, text);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 py-4">
      {paceNote && (
        <section role="status" className="cm-card section-open flex flex-col gap-3 border-l-2 border-l-water-deep p-5">
          <h2 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">{t("challenge.movedTitle")}</h2>
          <p className="font-[family-name:var(--font-ui)] text-sm leading-relaxed text-ink-soft">{t("challenge.movedText", { hours })}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={busy} onClick={run(dismissPaceNote)}>
              {t("challenge.movedOk")}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={run(() => changePace(7))}>
              {t("challenge.switch7")}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={run(chooseOwnPace)}>
              {t("challenge.paceOwn")}
            </Button>
          </div>
        </section>
      )}

      <header data-tour="challenge-header" className="rise-in flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="cm-label">{paceName(length)}</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-ink">
            {t("challenge.dayOf", { day: today, total: length })}
          </h1>
          <span aria-hidden="true" className="grow-x mt-4 block h-px w-16 bg-water-deep" />
          <p className="mt-4 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            {t("challenge.daysDone", {
              done: completedDays,
              total: length,
              date: new Date(startedAt).toLocaleDateString(lang === "es" ? "es-US" : "en-US"),
            })}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className="cm-badge text-sm">
            <span key={streak} className="bump inline-block">
              <TickText value={t("challenge.streak", { n: streak })} />
            </span>
          </span>
          <span className="max-w-60 font-[family-name:var(--font-ui)] text-xs text-ink-soft sm:text-right">
            {graceReady || !graceDate ? t("challenge.graceReady") : t("challenge.graceUsed", { date: graceDate })}
          </span>
        </div>
      </header>

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <button type="button" className={linkCls} onClick={addToCalendar}>
          {t("challenge.ics")}
        </button>
        <button type="button" className={linkCls} disabled={busy} onClick={run(() => changePace(other))}>
          {t(other === 7 ? "challenge.switch7" : "challenge.switch14")}
        </button>
        <button
          type="button"
          className={linkCls}
          disabled={busy}
          onClick={async () => {
            if (!confirm(t("challenge.restartConfirm"))) return;
            await run(resetChallenge)();
          }}
        >
          {t("challenge.restart")}
        </button>
      </div>

      <ProgressBar fraction={completedDays / length} accent={ACCENT} label={t("challenge.progress", { done: completedDays, total: length })} />

      <ol className="stagger flex flex-col gap-3">
        {plan.map((day) => {
          const done = isDayComplete(day, snapshot);
          const isToday = day.day === today;
          return (
            <li
              key={day.day}
              aria-current={isToday ? "date" : undefined}
              className={`cm-card flex flex-col gap-2 p-5 ${isToday ? "border-l-2 border-l-water-deep" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
                  {t(day.titleKey, { n: day.day })}
                  {isToday && <span className="cm-badge">{t("challenge.today")}</span>}
                </span>
                {done && (
                  <span className="inline-flex items-center gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-olive">
                    <FeatureIcon name="check" size={14} />
                    {t("challenge.done")}
                  </span>
                )}
              </div>
              <ul className="flex flex-col gap-1.5">
                {day.items.map((item) => {
                  const itemDone = item.isDone(snapshot);
                  return (
                    <li key={item.label} className="flex items-center justify-between gap-2">
                      <span className={`flex items-center gap-2 font-[family-name:var(--font-ui)] text-sm ${itemDone ? "text-ink-soft line-through" : "text-ink"}`}>
                        <span
                          aria-hidden="true"
                          className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ${itemDone ? "border-olive bg-olive text-white" : "border-line"}`}
                        >
                          {itemDone && <FeatureIcon name="tick" size={12} />}
                        </span>
                        {t(item.labelKey, item.vars)}
                      </span>
                      {!itemDone && (
                        <Link to={item.to} className={`shrink-0 ${linkCls}`}>
                          {t("challenge.go")}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>

      {practiceTeaser}
    </div>
  );
}
