import { Reveal } from "../ui/Reveal";
import { WelcomeBack } from "./WelcomeBack";
import { Link, useNavigate } from "react-router-dom";
import { useLang } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";
import type { Translate } from "../../i18n/LanguageContext";
import { useContent } from "../../state/ContentContext";
import { useCourse } from "../../state/CourseContext";
import { RIVERS, THEME } from "../../theme/theme";
import type { RiverStatus } from "../../types";
import {
  canTakeFinalExam,
  deriveRiverStatus,
  hasFullAccess,
  isCourseComplete,
  canUseSearch,
  isRiverUnlocked,
} from "../../state/progress";
import { activityDates, currentChallengeDay, currentStreak, planLength } from "../../state/challenge";
import { currentPracticeDay } from "../../content/practice";
import { useModuleProgress } from "../../state/useModuleProgress";
import { PRINCIPLE_SCRIPTURE } from "../../content/scripture";
import { introductionReadingMinutes, riverReadingMinutes } from "../../content/lessons";
import { EXAM_PASS_THRESHOLD, EXAM_QUESTION_COUNT } from "../../content/exam";
import { ScriptureQuote } from "../ui/Scripture";
import { ProgressBar } from "../ui/ProgressBar";
import { Button } from "../ui/Button";
import { WelcomeCard } from "./WelcomeCard";
import { MomentsRow } from "./MomentsRow";
import { LoadError } from "../ui/LoadError";
import { LockIcon, QuizIcon } from "../ui/RiverIcons";
import { CourseMap } from "./CourseMap";
import { ReviewCard } from "./ReviewPage";
import { PageSkeleton } from "../ui/Skeleton";
import { FeatureIcon } from "../ui/FeatureIcons";

/** The demo account shows everything as read-only browsing, so its buttons just say "View". */
function ctaLabel(status: RiverStatus, viewOnly: boolean, t: Translate): string {
  if (viewOnly) return t("cta.view");
  if (status === "complete") return t("cta.review");
  if (status === "in_progress") return t("cta.continue");
  return t("cta.start");
}

function statusText(status: RiverStatus, unlocked: boolean, t: Translate): string {
  if (status === "complete") return t("badge.complete");
  if (status === "in_progress") return t("badge.inProgress");
  return unlocked ? t("badge.notStarted") : t("badge.locked");
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
    return <PageSkeleton label={t("common.loading")} />;
  if (loadError) return <LoadError message={loadError} onRetry={reload} />;
  if (!snapshot) return null;

  const completeCount = RIVERS.filter((r) => deriveRiverStatus(snapshot, r.number) === "complete").length;
  const courseComplete = isCourseComplete(snapshot);
  const examUnlocked = canTakeFinalExam(snapshot);
  const viewOnly = !!snapshot.profile.fullAccess;
  const greeting = snapshot.profile.displayName ? `, ${snapshot.profile.displayName}` : "";
  const courseMinutes = ([1, 2, 3, 4] as const).reduce((sum, n) => sum + riverReadingMinutes(LESSONS[n]), 0);

  const examPassed = !!snapshot.profile.examPassedAt;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 py-4">
      <WelcomeCard />
      <WelcomeBack />
      <header className="rise-in">
        <p className="cm-label">{t("home.eyebrow")}</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-ink">{t("home.title", { greeting })}</h1>
        <span aria-hidden="true" className="grow-x mt-4 block h-px w-16 bg-water-deep" />
        <p className="mt-4 max-w-3xl font-[family-name:var(--font-ui)] text-sm leading-relaxed text-ink-soft">
          {t("home.progress", { done: completeCount, mins: courseMinutes })}
        </p>
        {canUseSearch(snapshot) && (
          <form
            role="search"
            data-tour="course-search"
            className="mt-5 flex max-w-md gap-2"
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
              className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 font-[family-name:var(--font-ui)] text-sm text-ink transition-colors focus:border-water focus:outline-none"
            />
            <Button type="submit" variant="secondary">
              {t("search.go")}
            </Button>
          </form>
        )}
      </header>

      <CourseMap
        snapshot={snapshot}
        introCount={INTRODUCTION.lessons.length}
        lessonCounts={{ 1: LESSONS[1].lessons.length, 2: LESSONS[2].lessons.length, 3: LESSONS[3].lessons.length, 4: LESSONS[4].lessons.length }}
      />

      <ReviewCard />

      <PaceCard />

      {courseComplete && (
        <section className="cm-card flex flex-wrap items-center justify-between gap-3 border-l-2 border-l-olive p-5">
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-ink">{t("home.completeAll")}</h2>
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("home.completeAllSub")}</p>
          </div>
          <Link to="/dashboard">
            <Button>{t("home.openDashboard")}</Button>
          </Link>
        </section>
      )}

      <section aria-labelledby="home-lessons" className="flex flex-col gap-4">
        <h2 id="home-lessons" className="cm-label">
          {t("home.lessonsLabel")}
        </h2>
        <Link to="/course/introduction" className="cm-card cm-lift cm-rule group flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="min-w-0 flex-1">
            <p className="font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-[0.14em] text-water-deep">{t("home.beforeRiver1")}</p>
            <h3 className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-semibold leading-snug text-ink">
              {INTRODUCTION.title}
              <span className="ml-2 font-[family-name:var(--font-ui)] text-xs font-normal text-ink-soft">
                {t("river.minutes", { n: introductionReadingMinutes(INTRODUCTION) })}
              </span>
            </h3>
            <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("home.introBlurb")}</p>
            <div className="mt-4 max-w-xs">
              <div className="mb-1 flex items-center justify-between font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                <span>{t("home.modulesRead")}</span>
                <span className="tabular-nums">
                  {introProgress.viewedCount}/{introProgress.totalModules}
                </span>
              </div>
              <ProgressBar
                fraction={introProgress.fraction}
                accent={THEME.palette.water}
                label={t("home.introLabel", { n: introProgress.viewedCount, total: introProgress.totalModules })}
              />
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 font-[family-name:var(--font-ui)] text-sm font-medium text-water-deep">
            {viewOnly ? t("cta.view") : introProgress.viewedCount > 0 ? t("cta.continue") : t("cta.start")}
            <FeatureIcon name="arrow" size={16} className="cm-arrow" />
          </span>
        </Link>

        <div data-tour="course-rivers" className="stagger grid gap-4 lg:grid-cols-2">
          {RIVERS.map((r) => {
            const status = deriveRiverStatus(snapshot, r.number);
            const unlocked = isRiverUnlocked(snapshot, r.number);
            const rp = moduleProgressByRiver[r.number];
            const body = (
              <>
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: unlocked ? r.accent : "var(--color-line)" }} />
                <div className="flex items-center justify-between gap-3 font-[family-name:var(--font-ui)]">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                    <span aria-hidden="true" className="inline-block h-2 w-2 rounded-[2px]" style={{ backgroundColor: r.accent }} />
                    {t("river.label", { n: r.number })}
                  </span>
                  <span className="cm-badge">{statusText(status, unlocked, t)}</span>
                </div>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold leading-snug text-ink">
                  {t(`river.${r.number}.title` as StringKey)}
                </h3>
                <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                  {t(`river.${r.number}.principle` as StringKey)}
                  <span className="ml-2 text-xs">· {t("river.minutes", { n: riverReadingMinutes(LESSONS[r.number]) })}</span>
                </p>
                <div className="mt-4">
                  <ScriptureQuote verse={PRINCIPLE_SCRIPTURE[r.number]} compact />
                </div>
                <div className="mt-auto flex items-end justify-between gap-4 pt-5">
                  {unlocked ? (
                    <div className="w-full max-w-[14rem]">
                      <div className="mb-1 flex items-center justify-between font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                        <span>{t("home.modulesRead")}</span>
                        <span className="tabular-nums">
                          {rp.viewedCount}/{rp.totalModules}
                        </span>
                      </div>
                      <ProgressBar fraction={rp.fraction} accent={r.accent} label={t("home.moduleLabel", { n: rp.viewedCount, total: rp.totalModules, r: r.number })} />
                    </div>
                  ) : (
                    <span />
                  )}
                  <span className="inline-flex shrink-0 items-center gap-1.5 font-[family-name:var(--font-ui)] text-sm font-medium text-water-deep">
                    {unlocked ? ctaLabel(status, viewOnly, t) : t("badge.locked")}
                    {unlocked && <FeatureIcon name="arrow" size={16} className="cm-arrow" />}
                  </span>
                </div>
              </>
            );
            return unlocked ? (
              <Link key={r.number} to={`/course/river/${r.number}`} className="cm-card cm-lift group relative flex flex-col overflow-hidden p-6 pl-7">
                {body}
              </Link>
            ) : (
              <div key={r.number} className="cm-card relative flex flex-col overflow-hidden p-6 pl-7 opacity-70">
                {body}
              </div>
            );
          })}
        </div>
      </section>

      <Reveal>
        <MomentsRow />
      </Reveal>

      {(courseComplete || hasFullAccess(snapshot)) &&
        (examUnlocked ? (
          <Link to="/course/exam" className="cm-card cm-lift group flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-4">
              <span className={`cm-icon h-11 w-11 ${examPassed ? "bg-water-deep text-white" : ""}`}>
                {examPassed ? <FeatureIcon name="tick" size={20} /> : <QuizIcon color="currentColor" size={20} />}
              </span>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-ink">{t("home.exam")}</h2>
                <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                  {t("home.examBlurb", { count: EXAM_QUESTION_COUNT, pass: EXAM_PASS_THRESHOLD })}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 font-[family-name:var(--font-ui)] text-sm font-medium text-water-deep">
              {viewOnly ? t("cta.view") : examPassed ? t("home.examRetake") : t("home.examTake")}
              <FeatureIcon name="arrow" size={16} className="cm-arrow" />
            </span>
          </Link>
        ) : (
          <div className="cm-card flex items-center gap-4 p-6 opacity-70">
            <span className="cm-icon h-11 w-11">
              <LockIcon color="currentColor" size={20} />
            </span>
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-ink-soft">{t("home.exam")}</h2>
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("home.examLocked")}</p>
            </div>
          </div>
        ))}
    </div>
  );
}

/**
 * The pace card on the course home: today's plan day, a prompt to choose a pace, or, once the exam is passed,
 * 30 Days of Practice. Nothing shows for someone who chose their own pace.
 */
function PaceCard() {
  const { snapshot } = useCourse();
  const { t } = useLang();
  if (!snapshot) return null;
  const { examPassedAt, practiceStartedAt, challengeStartedAt, paceDays } = snapshot.profile;
  let to = "/challenge";
  let title: string;
  let text: string;
  let cta: string;
  if (examPassedAt) {
    to = "/practice";
    title = t("practice.homeTitle");
    text = practiceStartedAt
      ? t("practice.dayOf", { day: currentPracticeDay(practiceStartedAt), total: 30 })
      : t("practice.homeText");
    cta = t("practice.homeOpen");
  } else if (challengeStartedAt) {
    const length = planLength(paceDays);
    title = t("home.challengeDay", {
      name: t(length === 7 ? "challenge.paceName7" : "challenge.paceName14"),
      day: currentChallengeDay(challengeStartedAt, length),
      total: length,
    });
    text = t("home.streak", { n: currentStreak(activityDates(snapshot)) });
    cta = t("home.viewChallenge");
  } else if (paceDays === 0) {
    return null;
  } else {
    title = t("home.tryChallenge");
    text = t("home.challengeBlurb");
    cta = t("home.learnMore");
  }
  return (
    <Link to={to} className="cm-card cm-lift group flex flex-wrap items-center justify-between gap-3 p-5">
      <span className="min-w-0">
        <span className="block font-[family-name:var(--font-display)] text-lg font-semibold text-ink">{title}</span>
        <span className="block font-[family-name:var(--font-ui)] text-sm text-ink-soft">{text}</span>
      </span>
      <span className="inline-flex items-center gap-1.5 font-[family-name:var(--font-ui)] text-sm font-medium text-water-deep">
        {cta}
        <FeatureIcon name="arrow" size={16} className="cm-arrow" />
      </span>
    </Link>
  );
}
