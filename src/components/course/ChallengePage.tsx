import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useContent } from "../../state/ContentContext";
import { useLang } from "../../i18n/LanguageContext";
import {
  activityDates,
  currentChallengeDay,
  currentStreak,
  generateChallengePlan,
  isDayComplete,
  CHALLENGE_LENGTH_DAYS,
} from "../../state/challenge";
import { THEME, readable } from "../../theme/theme";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { ProgressBar } from "../ui/ProgressBar";
import { LoadError } from "../ui/LoadError";

const ACCENT = THEME.palette.gold;

/**
 * An optional, opt-in 30-day pace for the course: every module, tracker
 * entry, and quiz spread across the first 29 days, with the final exam alone
 * on day 30. Nothing here gates anything — it's a pacing aid layered over
 * the real completion rules in state/progress.ts, not a replacement for
 * them. "Day" and "streak" are both computed from real activity timestamps,
 * never stored, so skipping around or falling behind never breaks anything.
 */
export function ChallengePage() {
  const { snapshot, loading, loadError, reload, startChallenge, resetChallenge } = useCourse();
  const { t, lang } = useLang();
  const { getIntroduction, getRiver } = useContent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = useMemo(
    () => generateChallengePlan({ introduction: getIntroduction(), river: getRiver }),
    [lang],
  );
  const [busy, setBusy] = useState(false);

  if (loading && !snapshot)
    return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("common.loading")}</p>;
  if (loadError) return <LoadError message={loadError} onRetry={reload} />;
  if (!snapshot) return null;

  const startedAt = snapshot.profile.challengeStartedAt;

  if (!startedAt) {
    return (
      <Card accent={ACCENT} className="mx-auto max-w-lg">
        <CardBody className="flex flex-col items-center gap-4 py-10 text-center">
          <h1 className="text-2xl font-semibold text-ink">{t("challenge.title")}</h1>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("challenge.intro")}</p>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await startChallenge();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? t("challenge.starting") : t("challenge.startBtn")}
          </Button>
        </CardBody>
      </Card>
    );
  }

  const today = currentChallengeDay(startedAt);
  const dates = activityDates(snapshot);
  const streak = currentStreak(dates);
  const completedDays = plan.filter((d) => isDayComplete(d, snapshot)).length;

  return (
    <div className="flex flex-col gap-6">
      <header data-tour="challenge-header" className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p
            className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.18em]"
            style={{ color: readable(ACCENT) }}
          >
            {t("challenge.eyebrow")}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">
            {t("challenge.dayOf", { day: today, total: CHALLENGE_LENGTH_DAYS })}
          </h1>
          <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            {t("challenge.daysDone", {
              done: completedDays,
              total: CHALLENGE_LENGTH_DAYS,
              date: new Date(startedAt).toLocaleDateString(lang === "es" ? "es-US" : "en-US"),
            })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className="rounded-full px-3 py-1 font-[family-name:var(--font-ui)] text-sm font-semibold"
            style={{ backgroundColor: `${ACCENT}22`, color: readable(ACCENT) }}
          >
            {t("challenge.streak", { n: streak })}
          </span>
          <button
            type="button"
            className="font-[family-name:var(--font-ui)] text-xs text-ink-soft underline"
            onClick={async () => {
              if (!confirm(t("challenge.restartConfirm"))) return;
              await resetChallenge();
            }}
          >
            {t("challenge.restart")}
          </button>
        </div>
      </header>

      <ProgressBar
        fraction={completedDays / CHALLENGE_LENGTH_DAYS}
        accent={ACCENT}
        label={t("challenge.progress", { done: completedDays, total: CHALLENGE_LENGTH_DAYS })}
      />

      <div className="flex flex-col gap-3">
        {plan.map((day) => {
          const done = isDayComplete(day, snapshot);
          const isToday = day.day === today;
          return (
            <Card
              key={day.day}
              accent={done || isToday ? ACCENT : undefined}
              className={isToday ? "bg-gold/10" : undefined}
            >
              <CardBody className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
                    {t(day.titleKey, { n: day.day })}

                    {isToday && (
                      <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--color-gold-text)]">
                        {t("challenge.today")}
                      </span>
                    )}
                  </span>
                  {done && <span className="text-sm text-olive">{t("challenge.done")}</span>}
                </div>
                <ul className="flex flex-col gap-1">
                  {day.items.map((item) => {
                    const itemDone = item.isDone(snapshot);
                    return (
                      <li key={item.label} className="flex items-center justify-between gap-2">
                        <span
                          className={`font-[family-name:var(--font-ui)] text-sm ${
                            itemDone ? "text-ink-soft line-through" : "text-ink"
                          }`}
                        >
                          {itemDone ? "✓" : "○"} {t(item.labelKey, item.vars)}
                        </span>
                        {!itemDone && (
                          <Link
                            to={item.to}
                            className="shrink-0 font-[family-name:var(--font-ui)] text-xs text-water underline"
                          >
                            {t("challenge.go")}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
