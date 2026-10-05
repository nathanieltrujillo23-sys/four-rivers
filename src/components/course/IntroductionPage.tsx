import { Link } from "react-router-dom";
import { introductionReadingMinutes, lessonReadingMinutes } from "../../content/lessons";
import { useLang } from "../../i18n/LanguageContext";
import { useContent } from "../../state/ContentContext";
import { useCourse } from "../../state/CourseContext";
import { hasFullAccess } from "../../state/progress";
import { useModuleProgress } from "../../state/useModuleProgress";
import { useIntroQuizResult } from "../../state/useIntroQuizResult";
import { INTRO_QUIZ } from "../../content/introQuiz";
import { formatPercent } from "../../utils/format";
import { THEME, readable } from "../../theme/theme";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { ProgressBar } from "../ui/ProgressBar";
import { ScriptureList } from "../ui/Scripture";
import { LockIcon, QuizIcon } from "../ui/RiverIcons";

const ACCENT = THEME.palette.gold;

/**
 * The introduction's overview — five brief looks at biblical stewardship
 * (Abraham, Joseph, Moses, Joshua, Daniel) plus two practical modules, before
 * River 1. Unlike a river's overview, there's no lock check and no tracker:
 * this content doesn't participate in the completion ledger at all, so
 * there's nothing here to unlock or complete beyond simply reading it.
 */
export function IntroductionPage() {
  const { getLesson, getIntroduction } = useContent();
  const { t } = useLang();
  const INTRODUCTION = getIntroduction();
  const total = INTRODUCTION.lessons.length;
  const moduleProgress = useModuleProgress("introduction", total);
  const { passedAt: quizPassedAt, bestScore: quizBestScore } = useIntroQuizResult();
  const quizLabel =
    quizBestScore === null
      ? t("river.quizQuestions", { n: INTRO_QUIZ.length })
      : formatPercent(quizBestScore / INTRO_QUIZ.length);
  const { snapshot } = useCourse();
  const introMinutes = introductionReadingMinutes(INTRODUCTION);
  const allRead = moduleProgress.viewedCount >= total || (!!snapshot && hasFullAccess(snapshot));

  return (
    <div className="flex flex-col gap-8">
      <article className="flex flex-col gap-6">
        <header>
          <p
            className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.18em]"
            style={{ color: readable(ACCENT) }}
          >
            {t("intro.eyebrow", { n: introMinutes })}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">{INTRODUCTION.title}</h1>
          <p className="mt-3 text-lg leading-relaxed text-ink-soft">{INTRODUCTION.intro}</p>
        </header>
        <ScriptureList verses={INTRODUCTION.introScripture} />
      </article>

      <section className="flex flex-col gap-4">
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-2xl font-semibold text-ink">{t("river.modules")}</h2>
            <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              {t("river.read", { n: moduleProgress.viewedCount, total: moduleProgress.totalModules })}
            </span>
          </div>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("river.hint")}</p>
          <div className="mt-3">
            <ProgressBar
              fraction={moduleProgress.fraction}
              accent={ACCENT}
              label={t("home.introLabel", {
                n: moduleProgress.viewedCount,
                total: moduleProgress.totalModules,
              })}
            />
          </div>
        </div>
        <ol data-tour="intro-modules" className="flex flex-col gap-3">
          {INTRODUCTION.lessons.map((_, i) => {
            const module_ = getLesson("introduction", i);
            const done = moduleProgress.isViewed(i);
            return (
              <li key={i}>
                <Link to={`/course/introduction/module/${i + 1}`}>
                  <Card accent={ACCENT} className="transition-colors hover:bg-parchment-deep/30">
                    <CardBody className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-ui)] text-sm font-semibold ${
                            done ? "text-white" : "border-2 bg-surface text-ink-soft"
                          }`}
                          style={done ? { backgroundColor: ACCENT } : { borderColor: ACCENT }}
                        >
                          {done ? "✓" : i + 1}
                        </span>
                        <span className="font-medium text-ink">{module_.title}</span>
                      </div>
                      <span className="shrink-0 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                        {t("river.minutes", { n: lessonReadingMinutes(module_) })}
                      </span>
                    </CardBody>
                  </Card>
                </Link>
              </li>
            );
          })}
          <li>
            {allRead ? (
              <Link to="/course/introduction/quiz">
                <Card accent={ACCENT} className="transition-colors hover:bg-parchment-deep/30">
                  <CardBody className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-ui)] text-sm font-semibold ${
                          quizPassedAt ? "text-white" : "border-2 bg-surface text-ink-soft"
                        }`}
                        style={quizPassedAt ? { backgroundColor: ACCENT } : { borderColor: ACCENT }}
                      >
                        {quizPassedAt ? "✓" : <QuizIcon color={ACCENT} size={16} />}
                      </span>
                      <span className="font-medium text-ink">{t("intro.quizName")}</span>
                    </div>
                    <span className="shrink-0 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                      {quizLabel}
                    </span>
                  </CardBody>
                </Card>
              </Link>
            ) : (
              <Card className="opacity-60">
                <CardBody className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-line bg-surface text-ink-soft">
                      <LockIcon color="var(--color-ink-soft)" size={15} />
                    </span>
                    <span className="font-medium text-ink-soft">{t("intro.quizName")}</span>
                  </div>
                  <span className="shrink-0 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                    {t("intro.quizLocked")}
                  </span>
                </CardBody>
              </Card>
            )}
          </li>
        </ol>
      </section>

      <Card accent={ACCENT} className="bg-parchment-deep/40">
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
              {t("intro.ready")}
            </h3>
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("intro.readyText")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/course/river/1">
              <Button>{snapshot?.profile.fullAccess ? t("intro.viewRiver1") : t("intro.startRiver1")}</Button>
            </Link>
            <Link to="/course">
              <Button variant="ghost">{t("river.backAll")}</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
