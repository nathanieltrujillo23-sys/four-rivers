import { Link, Navigate, useParams } from "react-router-dom";
import { lessonReadingMinutes } from "../../content/lessons";
import { useLang } from "../../i18n/LanguageContext";
import { useContent } from "../../state/ContentContext";
import { useCourse } from "../../state/CourseContext";
import { useModuleProgress } from "../../state/useModuleProgress";
import { THEME } from "../../theme/theme";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { ProgressBar } from "../ui/ProgressBar";
import { LessonPanel } from "./LessonPanel";
import { BudgetCalculator } from "./tools/BudgetCalculator";
import { MoneyPathsCalculator } from "./tools/MoneyPathsCalculator";
import { MarkCompleteButton } from "./MarkCompleteButton";
import { ModuleNoteForm } from "./ModuleNoteForm";
import { FEATURES } from "../../lib/features";

const ACCENT = THEME.palette.gold;

/** Which introduction modules carry an interactive tool under their text. */
const BUDGET_MODULE = 4;
const TVM_MODULE = 5;

/**
 * One module of the introduction: `/course/introduction/module/:m` (m is
 * 1-based). Deliberately simpler than a river's ModuleDetailPage — no lock
 * check (the introduction is never gated), no practice/tracker section, and
 * no read-aloud audio (none has been generated for this content yet).
 */
export function IntroductionModulePage() {
  const { m } = useParams();
    const { getLesson, getIntroduction } = useContent();
  const { t } = useLang();
  const moduleIndex = Number(m) - 1;
  const total = getIntroduction().lessons.length;
  const validModule =
    Number.isInteger(moduleIndex) && moduleIndex >= 0 && moduleIndex < total;

  const moduleProgress = useModuleProgress("introduction", total);
    const { snapshot } = useCourse();

  if (!validModule) return <Navigate to="/course/introduction" replace />;

  const module_ = getLesson("introduction", moduleIndex);
  const isLastModule = moduleIndex === total - 1;
  const quizUnlocked =
    moduleProgress.viewedCount >= total ||
    !!snapshot?.profile.fullAccess ||
    snapshot?.profile.role === "admin";
  const prev = moduleIndex > 0 ? moduleIndex - 1 : null;
  const next = moduleIndex < total - 1 ? moduleIndex + 1 : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            to="/course/introduction"
            className="font-[family-name:var(--font-ui)] text-sm text-ink-soft hover:text-ink"
          >
                        {t("module.introBack")}

          </Link>
          <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                        {t("river.read", { n: moduleProgress.viewedCount, total: moduleProgress.totalModules })}

          </span>
        </div>
        <ProgressBar
          fraction={moduleProgress.fraction}
          accent={ACCENT}
          label={t("home.introLabel", { n: moduleProgress.viewedCount, total: moduleProgress.totalModules })}
        />
      </div>

      <LessonPanel
        lesson={module_}
        river={{ accent: ACCENT }}
        eyebrow={t("module.introEyebrow", { m: moduleIndex + 1, total, min: lessonReadingMinutes(module_) })}
        editable={{ section: "introduction", moduleIndex }}
      />

      {moduleIndex === BUDGET_MODULE && <BudgetCalculator accent={ACCENT} />}
      {moduleIndex === TVM_MODULE && <MoneyPathsCalculator accent={ACCENT} />}

      {FEATURES.journal && (
        <ModuleNoteForm
          riverNumber={null}
          moduleTitle={module_.title}
          accent={ACCENT}
        />
      )}

      <Card accent={ACCENT} className="bg-parchment-deep/40">
        <CardBody className="grid grid-cols-1 items-center gap-3 sm:grid-cols-3">
          <div className="flex justify-center sm:justify-start">
            {prev !== null && (
              <Link to={`/course/introduction/module/${prev + 1}`}>
                <Button variant="secondary">
                  ← {getLesson("introduction", prev).title}
                </Button>
              </Link>
            )}
          </div>
          <div className="flex justify-center">
            <MarkCompleteButton
              completed={moduleProgress.isViewed(moduleIndex)}
              onComplete={() => moduleProgress.markViewed(moduleIndex)}
              accent={ACCENT}
            />
          </div>
          <div className="flex justify-center sm:justify-end">
            {next !== null ? (
              <Link to={`/course/introduction/module/${next + 1}`}>
                <Button>{getLesson("introduction", next).title} →</Button>
              </Link>
            ) : isLastModule ? (
              quizUnlocked ? (
                <Link to="/course/introduction/quiz">
                                    <Button>
                    {snapshot?.profile.fullAccess
                      ? t("module.viewQuiz")
                      : t("module.takeQuiz")}
                  </Button>
                </Link>
              ) : (
                <div className="flex flex-col items-center gap-1 sm:items-end">
                                    <Button disabled>{t("module.takeQuiz")}</Button>
                  <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                                        {t("module.unlockRead")}

                  </span>
                </div>
              )
            ) : null}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
