import { Link, Navigate, useParams } from "react-router-dom";
import { getGuide, getIcebreaker } from "../../content/groupGuides";
import { useContent } from "../../state/ContentContext";
import { useLang } from "../../i18n/LanguageContext";
import { guidePath, lessonPath, moduleCount, parseSection } from "../../lib/sections";
import { THEME } from "../../theme/theme";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { ScriptureList } from "../ui/Scripture";
import { useSectionLabel } from "./GroupsPage";

const ACCENT = THEME.palette.gold;

/**
 * A one-hour meeting plan for a single lesson: welcome, read, discuss, try,
 * pray. The questions are written to be answered from the lesson and from
 * life, never to ask anyone to disclose numbers.
 */
export function GroupGuidePage() {
  const { section: sectionParam, m } = useParams();
  const { lang, t } = useLang();
  const { getLesson } = useContent();
  const sectionLabel = useSectionLabel();

  const section = parseSection(sectionParam);
  const moduleIndex = Number(m) - 1;
  if (!section || !Number.isInteger(moduleIndex) || moduleIndex < 0 || moduleIndex >= moduleCount(section)) {
    return <Navigate to="/groups" replace />;
  }

  const guide = getGuide(section, moduleIndex, lang);
  const lesson = getLesson(section, moduleIndex);
  const total = moduleCount(section);
  const prev = moduleIndex > 0 ? moduleIndex - 1 : null;
  const next = moduleIndex < total - 1 ? moduleIndex + 1 : null;

  if (!guide) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/groups" className="font-[family-name:var(--font-ui)] text-sm text-ink-soft hover:text-ink">
          ← {t("guide.back")}
        </Link>
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("guide.noGuide")}</p>
      </div>
    );
  }

  const steps = [
    { key: "guide.welcome", minutes: 10 },
    { key: "guide.read", minutes: 10 },
    { key: "guide.discuss", minutes: 25 },
    { key: "guide.try", minutes: 5 },
    { key: "guide.pray", minutes: 5 },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link to="/groups" className="font-[family-name:var(--font-ui)] text-sm text-ink-soft hover:text-ink">
          ← {t("guide.back")}
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link to={lessonPath(section, moduleIndex)}>
            <Button variant="secondary">{t("guide.openLesson")}</Button>
          </Link>
          <Button variant="secondary" onClick={() => window.print()}>
            {t("guide.print")}
          </Button>
        </div>
      </div>

      <header>
        <p className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
          {t("guide.title")} · {sectionLabel(section)}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-ink">{lesson.title}</h1>
        <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("guide.plan")}</p>
      </header>

      <ol className="flex flex-col gap-4">
        <Step n={1} title={t(steps[0].key)} minutes={steps[0].minutes}>
          <p className="text-ink-soft">{getIcebreaker(section, moduleIndex, lang)}</p>
        </Step>

        <Step n={2} title={t(steps[1].key)} minutes={steps[1].minutes}>
          <p className="mb-3 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("guide.readHint")}</p>
          <ScriptureList verses={lesson.scriptureRefs} compact />
        </Step>

        <Step n={3} title={t(steps[2].key)} minutes={steps[2].minutes}>
          <ol className="flex flex-col gap-3">
            {guide.questions.map((q, i) => (
              <li key={i} className="flex gap-3">
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-ui)] text-xs font-semibold text-white"
                  style={{ backgroundColor: ACCENT }}
                >
                  {i + 1}
                </span>
                <p className="text-lg leading-snug text-ink">{q}</p>
              </li>
            ))}
          </ol>
        </Step>

        <Step n={4} title={t(steps[3].key)} minutes={steps[3].minutes}>
          <p className="text-ink-soft">{guide.practice}</p>
        </Step>

        <Step n={5} title={t(steps[4].key)} minutes={steps[4].minutes}>
          <p className="text-ink-soft">{guide.pray}</p>
        </Step>
      </ol>

      <Card className="bg-parchment-deep/40">
        <CardBody>
          <h2 className="text-lg font-semibold text-ink">{t("guide.tips")}</h2>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            <li>{t("guide.tip1")}</li>
            <li>{t("guide.tip2")}</li>
            <li>{t("guide.tip3")}</li>
            <li>{t("guide.tip4")}</li>
          </ul>
        </CardBody>
      </Card>

      <div className="flex flex-wrap justify-between gap-3 print:hidden">
        {prev !== null ? (
          <Link to={guidePath(section, prev)}>
            <Button variant="secondary">← {t("guide.prev")}</Button>
          </Link>
        ) : (
          <span />
        )}
        {next !== null && (
          <Link to={guidePath(section, next)}>
            <Button>{t("guide.next")} →</Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  minutes,
  children,
}: {
  n: number;
  title: string;
  minutes: number;
  children: React.ReactNode;
}) {
  const { t } = useLang();
  return (
    <li>
      <Card accent={ACCENT}>
        <CardBody>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold text-ink">
              {n}. {title}
            </h2>
            <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("guide.min", { n: minutes })}</span>
          </div>
          {children}
        </CardBody>
      </Card>
    </li>
  );
}
