import { Link } from "react-router-dom";
import { INTRODUCTION, introductionReadingMinutes, lessonReadingMinutes } from "../../content/lessons";
import { useContent } from "../../state/ContentContext";
import { useCourse } from "../../state/CourseContext";
import { hasFullAccess } from "../../state/progress";
import { useModuleProgress } from "../../state/useModuleProgress";
import { useIntroQuizResult } from "../../state/useIntroQuizResult";
import { THEME } from "../../theme/theme";
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
  const total = INTRODUCTION.lessons.length;
  const moduleProgress = useModuleProgress("introduction", total);
  const { getLesson } = useContent();
  const { passedAt: quizPassedAt } = useIntroQuizResult();
  const { snapshot } = useCourse();
  const allRead = moduleProgress.viewedCount >= total || (!!snapshot && hasFullAccess(snapshot));

  return (
    <div className="flex flex-col gap-8">
      <article className="flex flex-col gap-6">
        <header>
          <p
            className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.18em]"
            style={{ color: ACCENT }}
          >
            Before River 1 · ≈ {introductionReadingMinutes()} min
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">{INTRODUCTION.title}</h1>
          <p className="mt-3 text-lg leading-relaxed text-ink-soft">{INTRODUCTION.intro}</p>
        </header>
        <ScriptureList verses={INTRODUCTION.introScripture} />
      </article>

      <section className="flex flex-col gap-4">
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-2xl font-semibold text-ink">Modules</h2>
            <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              {moduleProgress.viewedCount} of {moduleProgress.totalModules} read
            </span>
          </div>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            Read them in order, or jump around freely. They're always here to revisit.
          </p>
          <div className="mt-3">
            <ProgressBar
              fraction={moduleProgress.fraction}
              accent={ACCENT}
              label={`${moduleProgress.viewedCount} of ${moduleProgress.totalModules} introduction modules read`}
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
                        ≈ {lessonReadingMinutes(module_)} min
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
                      <span className="font-medium text-ink">Quiz: Stewardship</span>
                    </div>
                    <span className="shrink-0 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                      10 questions
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
                    <span className="font-medium text-ink-soft">Quiz: Stewardship</span>
                  </div>
                  <span className="shrink-0 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                    Read all the modules first
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
            <h3 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">Ready for River 1?</h3>
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              Multiple Streams of Income is next. This introduction has no tracker of its own.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/course/river/1">
              <Button>Start River 1</Button>
            </Link>
            <Link to="/course">
              <Button variant="ghost">Back to all rivers</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
