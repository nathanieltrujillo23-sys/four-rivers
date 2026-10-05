import { Link, useNavigate } from "react-router-dom";
import { useLang } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";
import type { Translate } from "../../i18n/LanguageContext";
import { useContent } from "../../state/ContentContext";
import { useCourse } from "../../state/CourseContext";
import { RIVERS, THEME, readable } from "../../theme/theme";
import type { RiverStatus } from "../../types";
import {
  canTakeFinalExam,
  deriveRiverStatus,
  hasFullAccess,
  isCourseComplete,
  canUseSearch,
  isRiverUnlocked,
} from "../../state/progress";
import {
  activityDates,
  currentChallengeDay,
  currentStreak,
  CHALLENGE_LENGTH_DAYS,
} from "../../state/challenge";
import { useModuleProgress } from "../../state/useModuleProgress";
import { PRINCIPLE_SCRIPTURE } from "../../content/scripture";
import { introductionReadingMinutes, riverReadingMinutes } from "../../content/lessons";
import { EXAM_PASS_THRESHOLD, EXAM_QUESTION_COUNT } from "../../content/exam";
import { ScriptureQuote } from "../ui/Scripture";
import { ProgressBar } from "../ui/ProgressBar";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { LoadError } from "../ui/LoadError";
import { LockIcon, QuizIcon } from "../ui/RiverIcons";
import { RiverProgress } from "../layout/RiverProgress";

/** The demo account shows everything as read-only browsing, so its buttons just say "View". */
function ctaLabel(status: RiverStatus, viewOnly: boolean, t: Translate): string {
  if (viewOnly) return t("cta.view");
  if (status === "complete") return t("cta.review");
  if (status === "in_progress") return t("cta.continue");
  return t("cta.start");
}

function badge(status: RiverStatus, unlocked: boolean, t: Translate): { text: string; className: string } {
  if (status === "complete") return { text: t("badge.complete"), className: "bg-river-1/15 text-olive" };
  if (status === "in_progress") return { text: t("badge.inProgress"), className: "bg-gold/20 text-[var(--color-gold-text)]" };
  return unlocked
    ? { text: t("badge.notStarted"), className: "bg-parchment-deep text-ink-soft" }
    : { text: t("badge.locked"), className: "bg-parchment-deep text-ink-soft" };
}

export function CourseHome() {
  const { snapshot, loading, loadError, reload } = useCourse();
  const { getRiver, getIntroduction } = useContent();
  const { t } = useLang();
  const navigate = useNavigate();
  const INTRODUCTION = getIntroduction();
  const LESSONS = { 1: getRiver(1), 2: getRiver(2), 3: getRiver(3), 4: getRiver(4) } as const;

  // Called unconditionally, once per river (a fixed count), so hook order
  // never depends on load state or which rivers are unlocked.
  const introProgress = useModuleProgress("introduction", INTRODUCTION.lessons.length);
  const progress1 = useModuleProgress(1, LESSONS[1].lessons.length);
  const progress2 = useModuleProgress(2, LESSONS[2].lessons.length);
  const progress3 = useModuleProgress(3, LESSONS[3].lessons.length);
  const progress4 = useModuleProgress(4, LESSONS[4].lessons.length);
  const moduleProgressByRiver = { 1: progress1, 2: progress2, 3: progress3, 4: progress4 } as const;

  if (loading && !snapshot)
    return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("common.loading")}</p>;
  if (loadError) return <LoadError message={loadError} onRetry={reload} />;
  if (!snapshot) return null;

  const completeCount = RIVERS.filter((r) => deriveRiverStatus(snapshot, r.number) === "complete").length;
  const courseComplete = isCourseComplete(snapshot);
  const examUnlocked = canTakeFinalExam(snapshot);
  const viewOnly = !!snapshot.profile.fullAccess;
  const greeting = snapshot.profile.displayName ? `, ${snapshot.profile.displayName}` : "";
  const courseMinutes = ([1, 2, 3, 4] as const).reduce((sum, n) => sum + riverReadingMinutes(LESSONS[n]), 0);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold text-ink">{t("home.title", { greeting })}</h1>
        <p className="mt-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          {t("home.progress", { done: completeCount, mins: courseMinutes })}
        </p>
        {canUseSearch(snapshot) && (
          <form
            role="search"
            data-tour="course-search"
            className="mt-4 flex max-w-md gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
              navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
            }}
          >
            <input
              type="search"
              name="q"
              aria-label={t("search.title")}
              placeholder={t("search.ph")}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 font-[family-name:var(--font-ui)] text-sm text-ink focus:border-water focus:outline-none"
            />
            <Button type="submit" variant="secondary">
              {t("search.go")}
            </Button>
          </form>
        )}
      </header>

      <div className="flex justify-center">
        <RiverProgress snapshot={snapshot} />
      </div>

      <Link to="/challenge">
        <Card accent={THEME.palette.gold} className="transition-colors hover:bg-parchment-deep/30">
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            {snapshot.profile.challengeStartedAt ? (
              <>
                <div>
                  <h3 className="text-lg font-semibold text-ink">
                    {t("home.challengeDay", {
                      day: currentChallengeDay(snapshot.profile.challengeStartedAt),
                      total: CHALLENGE_LENGTH_DAYS,
                    })}
                  </h3>
                  <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                    {t("home.streak", { n: currentStreak(activityDates(snapshot)) })}
                  </p>
                </div>
                <Button variant="secondary">{t("home.viewChallenge")}</Button>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-lg font-semibold text-ink">{t("home.tryChallenge")}</h3>
                  <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                    {t("home.challengeBlurb")}
                  </p>
                </div>
                <Button variant="secondary">{t("home.learnMore")}</Button>
              </>
            )}
          </CardBody>
        </Card>
      </Link>

      {courseComplete && (
        <Card accent={RIVERS[3].accent} className="bg-parchment-deep/50">
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">{t("home.completeAll")}</h2>
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                {t("home.completeAllSub")}
              </p>
            </div>
            <Link to="/dashboard">
              <Button>{t("home.openDashboard")}</Button>
            </Link>
          </CardBody>
        </Card>
      )}

      <Link to="/course/introduction">
        <Card accent={THEME.palette.gold} className="transition-colors hover:bg-parchment-deep/30">
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <span
                className="font-[family-name:var(--font-ui)] text-sm font-semibold"
                style={{ color: readable(THEME.palette.gold) }}
              >
                {t("home.beforeRiver1")}
              </span>
              <h3 className="mt-1 text-xl font-semibold text-ink">
                {INTRODUCTION.title}
                <span className="ml-2 font-[family-name:var(--font-ui)] text-xs font-normal text-ink-soft">
                  {t("river.minutes", { n: introductionReadingMinutes(INTRODUCTION) })}
                </span>
              </h3>
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                {t("home.introBlurb")}
              </p>
              <div className="mt-3 max-w-xs">
                <div className="mb-1 flex items-center justify-between font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                  <span>{t("home.modulesRead")}</span>
                  <span>
                    {introProgress.viewedCount}/{introProgress.totalModules}
                  </span>
                </div>
                <ProgressBar
                  fraction={introProgress.fraction}
                  accent={THEME.palette.gold}
                  label={t("home.introLabel", {
                    n: introProgress.viewedCount,
                    total: introProgress.totalModules,
                  })}
                />
              </div>
            </div>
            <Button variant="secondary">
              {viewOnly ? t("cta.view") : introProgress.viewedCount > 0 ? t("cta.continue") : t("cta.start")}
            </Button>
          </CardBody>
        </Card>
      </Link>

      <div data-tour="course-rivers" className="grid gap-4">
        {RIVERS.map((r) => {
          const status = deriveRiverStatus(snapshot, r.number);
          const unlocked = isRiverUnlocked(snapshot, r.number);
          const b = badge(status, unlocked, t);
          const rp = moduleProgressByRiver[r.number];
          return (
            <Card key={r.number} accent={unlocked ? r.accent : undefined}>
              <CardBody className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-[family-name:var(--font-ui)]">
                    <span className="text-sm font-semibold" style={{ color: readable(r.accent) }}>
                      {t("river.label", { n: r.number })}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${b.className}`}>
                      {b.text}
                    </span>
                  </div>
                  <h3 className="mt-1 text-xl font-semibold text-ink">
                    {t(`river.${r.number}.title` as StringKey)}

                    <span className="ml-2 font-[family-name:var(--font-ui)] text-xs font-normal text-ink-soft">
                      {t("river.minutes", { n: riverReadingMinutes(LESSONS[r.number]) })}
                    </span>
                  </h3>
                  <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                    {t(`river.${r.number}.principle` as StringKey)}
                  </p>
                  <div className="mt-2 max-w-xl">
                    <ScriptureQuote verse={PRINCIPLE_SCRIPTURE[r.number]} compact />
                  </div>
                  {unlocked && (
                    <div className="mt-3 max-w-xs">
                      <div className="mb-1 flex items-center justify-between font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                        <span>{t("home.modulesRead")}</span>
                        <span>
                          {rp.viewedCount}/{rp.totalModules}
                        </span>
                      </div>
                      <ProgressBar
                        fraction={rp.fraction}
                        accent={r.accent}
                        label={t("home.moduleLabel", {
                          n: rp.viewedCount,
                          total: rp.totalModules,
                          r: r.number,
                        })}
                      />
                    </div>
                  )}
                </div>
                {unlocked ? (
                  <Link to={`/course/river/${r.number}`}>
                    <Button variant={status === "complete" ? "secondary" : "primary"}>
                      {ctaLabel(status, viewOnly, t)}
                    </Button>
                  </Link>
                ) : (
                  <Button variant="secondary" disabled>
                    {t("badge.locked")}
                  </Button>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {(courseComplete || hasFullAccess(snapshot)) &&
        (examUnlocked ? (
          <Link to="/course/exam">
            <Card accent={THEME.palette.gold} className="transition-colors hover:bg-parchment-deep/30">
              <CardBody className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-ui)] text-sm font-semibold ${
                      snapshot.profile.examPassedAt ? "text-white" : "border-2 bg-surface text-ink-soft"
                    }`}
                    style={
                      snapshot.profile.examPassedAt
                        ? { backgroundColor: THEME.palette.gold }
                        : { borderColor: THEME.palette.gold }
                    }
                  >
                    {snapshot.profile.examPassedAt ? "✓" : <QuizIcon color={THEME.palette.gold} size={18} />}
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold text-ink">{t("home.exam")}</h3>
                    <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                      {t("home.examBlurb", { count: EXAM_QUESTION_COUNT, pass: EXAM_PASS_THRESHOLD })}
                    </p>
                  </div>
                </div>
                <Button variant={snapshot.profile.examPassedAt ? "secondary" : "primary"}>
                  {viewOnly
                    ? t("cta.view")
                    : snapshot.profile.examPassedAt
                      ? t("home.examRetake")
                      : t("home.examTake")}
                </Button>
              </CardBody>
            </Card>
          </Link>
        ) : (
          <Card className="opacity-60">
            <CardBody className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-line bg-surface text-ink-soft">
                  <LockIcon color="var(--color-ink-soft)" size={18} />
                </span>
                <div>
                  <h3 className="text-xl font-semibold text-ink-soft">{t("home.exam")}</h3>
                  <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                    {t("home.examLocked")}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
    </div>
  );
}
