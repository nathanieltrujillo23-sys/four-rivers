import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useLang } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";
import { LESSONS } from "../../content/lessons";
import { VERSE } from "../../content/scripture";
import { PRACTICE_DAYS, PRACTICE_LENGTH, currentPracticeDay, type PracticeDay, type PracticeLink } from "../../content/practice";
import { hasFullAccess } from "../../state/progress";
import type { PracticeCheckin } from "../../types";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/Field";
import { ProgressBar } from "../ui/ProgressBar";
import { LoadError } from "../ui/LoadError";
import { PageSkeleton } from "../ui/Skeleton";
import { ScriptureQuote } from "../ui/Scripture";
import { FeatureIcon } from "../ui/FeatureIcons";
import { THEME } from "../../theme/theme";

const WEEKS: { key: StringKey; days: [number, number] }[] = [
  { key: "practice.week1", days: [1, 7] },
  { key: "practice.week2", days: [8, 15] },
  { key: "practice.week3", days: [16, 23] },
  { key: "practice.week4", days: [24, 30] },
];

function linkTo(link: PracticeLink): { to: string; label: StringKey; vars?: Record<string, number> } {
  switch (link.kind) {
    case "tracker":
      return { to: `/course/river/${link.river}/module/${LESSONS[link.river].lessons.length}`, label: "practice.open.tracker", vars: { r: link.river } };
    case "journal":
      return { to: "/journal", label: "practice.open.journal" };
    case "dashboard":
      return { to: "/dashboard", label: "practice.open.dashboard" };
    case "glossary":
      return { to: "/glossary", label: "practice.open.glossary" };
  }
}

/**
 * 30 Days of Practice (Update 38): after the final exam, one small money habit a day for 30 days, a week per river.
 * Today's day opens in full; every other day folds to one line. Checking a day off is private to the learner, with an
 * optional note. Opens once the exam is passed (or for full-access accounts).
 */
export function PracticePage() {
  const { snapshot, loading, loadError, reload, repository, startPractice, restartPractice } = useCourse();
  const { t, lang } = useLang();
  const [checks, setChecks] = useState<Map<number, PracticeCheckin> | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await repository.listPracticeCheckins();
      setChecks(new Map(list.map((c) => [c.day, c])));
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      setMissing(/practice_checkins/.test(m) && /(schema cache|does not exist|Could not find)/i.test(m));
      setChecks(new Map());
    }
  }, [repository]);
  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !snapshot) return <PageSkeleton label={t("common.loading")} />;
  if (loadError) return <LoadError message={loadError} onRetry={reload} />;
  if (!snapshot || !checks) return <PageSkeleton label={t("common.loading")} />;

  const { examPassedAt, practiceStartedAt } = snapshot.profile;
  const unlocked = !!examPassedAt || hasFullAccess(snapshot);
  const header = (
    <header data-tour="practice-header" className="rise-in">
      <p className="cm-label">{t("practice.eyebrow")}</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-ink">{t("practice.title")}</h1>
      <span aria-hidden="true" className="grow-x mt-4 block h-px w-16 bg-water-deep" />
      <p className="mt-4 max-w-2xl font-[family-name:var(--font-ui)] text-sm leading-relaxed text-ink-soft">{t("practice.intro")}</p>
    </header>
  );

  if (!unlocked || !practiceStartedAt || missing) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6 py-4">
        {header}
        <section className="cm-card flex flex-wrap items-center justify-between gap-4 p-6">
          {missing ? (
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("practice.needsUpdate")}</p>
          ) : !unlocked ? (
            <>
              <p className="font-[family-name:var(--font-ui)] text-sm text-ink">{t("practice.locked")}</p>
              <Link to="/course/exam">
                <Button variant="secondary">{t("practice.lockedCta")}</Button>
              </Link>
            </>
          ) : (
            <>
              <ul className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-sm text-ink">
                {WEEKS.map((w) => (
                  <li key={w.key} className="flex items-center gap-2">
                    <span aria-hidden="true" className="h-px w-4 bg-water-deep" />
                    {t(w.key)}
                  </li>
                ))}
              </ul>
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await startPractice();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? t("practice.starting") : t("practice.start")}
              </Button>
            </>
          )}
        </section>
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("practice.educational")}</p>
      </div>
    );
  }

  const today = currentPracticeDay(practiceStartedAt);
  const done = checks.size;
  const shown = open ?? today;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(lang === "es" ? "es-US" : "en-US", { month: "short", day: "numeric" });

  async function check(day: number, note: string) {
    await repository.checkPractice(day, note);
    await load();
  }
  async function uncheck(day: number) {
    await repository.uncheckPractice(day);
    await load();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 py-4">
      {header}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-[family-name:var(--font-display)] text-2xl font-semibold text-ink">{t("practice.dayOf", { day: today, total: PRACTICE_LENGTH })}</p>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("practice.doneCount", { done, total: PRACTICE_LENGTH })}</p>
        </div>
        <button
          type="button"
          className="font-[family-name:var(--font-ui)] text-xs font-medium text-water-deep hover:underline"
          onClick={async () => {
            if (!confirm(t("practice.restartConfirm"))) return;
            await restartPractice();
            await load();
          }}
        >
          {t("practice.restart")}
        </button>
      </div>
      <ProgressBar fraction={done / PRACTICE_LENGTH} accent={THEME.palette.olive} label={t("practice.doneCount", { done, total: PRACTICE_LENGTH })} />

      {done === PRACTICE_LENGTH && (
        <section role="status" className="cm-card border-l-2 border-l-olive p-5">
          <h2 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">{t("practice.finished")}</h2>
          <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("practice.finishedText")}</p>
        </section>
      )}

      {WEEKS.map((w) => (
        <section key={w.key} aria-label={t(w.key)} className="flex flex-col gap-2">
          <h2 className="cm-label">{t(w.key)}</h2>
          <ol className="flex flex-col gap-2">
            {PRACTICE_DAYS.filter((d) => d.day >= w.days[0] && d.day <= w.days[1]).map((d) => (
              <PracticeRow
                key={d.day}
                d={d}
                isToday={d.day === today}
                expanded={d.day === shown}
                checkin={checks.get(d.day)}
                onToggle={() => setOpen(d.day === shown ? -1 : d.day)}
                onCheck={(note) => check(d.day, note)}
                onUncheck={() => uncheck(d.day)}
                fmt={fmt}
              />
            ))}
          </ol>
        </section>
      ))}
      <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("practice.educational")}</p>
    </div>
  );
}

function PracticeRow({
  d,
  isToday,
  expanded,
  checkin,
  onToggle,
  onCheck,
  onUncheck,
  fmt,
}: {
  d: PracticeDay;
  isToday: boolean;
  expanded: boolean;
  checkin: PracticeCheckin | undefined;
  onToggle: () => void;
  onCheck: (note: string) => Promise<void>;
  onUncheck: () => Promise<void>;
  fmt: (iso: string) => string;
}) {
  const { t, lang } = useLang();
  const text = lang === "es" ? d.es : d.en;
  const [note, setNote] = useState(checkin?.note ?? "");
  const [busy, setBusy] = useState(false);
  const link = d.link ? linkTo(d.link) : null;
  const panelId = `practice-day-${d.day}`;
  const run = (fn: () => Promise<void>) => async () => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <li aria-current={isToday ? "date" : undefined} className={`cm-card overflow-hidden ${isToday ? "border-l-2 border-l-water-deep" : ""}`}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-parchment-deep/40"
      >
        <span
          aria-hidden="true"
          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border ${checkin ? "border-olive bg-olive text-white" : "border-line"}`}
        >
          {checkin && <FeatureIcon name="tick" size={13} />}
        </span>
        <span className="w-12 shrink-0 font-[family-name:var(--font-ui)] text-xs font-medium tabular-nums text-ink-soft">
          {t("challenge.day", { n: d.day })}
        </span>
        <span className={`min-w-0 flex-1 truncate font-[family-name:var(--font-ui)] text-sm font-semibold ${checkin ? "text-ink-soft" : "text-ink"}`}>{text.title}</span>
        {isToday && <span className="cm-badge">{t("practice.today")}</span>}
        {checkin && <span className="sr-only">{t("practice.doneOn", { date: fmt(checkin.doneAt) })}</span>}
        <FeatureIcon name="chevron" size={16} className={`shrink-0 text-ink-soft transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div id={panelId} className="section-open flex flex-col gap-4 border-t border-line px-5 pb-5 pt-4">
          <p className="font-[family-name:var(--font-display)] text-lg leading-snug text-ink">{text.action}</p>
          <div>
            <p className="cm-label">{t("practice.why")}</p>
            <p className="mt-1 font-[family-name:var(--font-ui)] text-sm leading-relaxed text-ink-soft">{text.why}</p>
          </div>
          <ScriptureQuote verse={VERSE[d.verse]} compact />
          {link && (
            <Link to={link.to} className="w-fit font-[family-name:var(--font-ui)] text-sm font-medium text-water-deep hover:underline">
              {t(link.label, link.vars)}
              <FeatureIcon name="arrow" size={14} className="cm-arrow ml-1 inline-block align-[-2px]" />
            </Link>
          )}
          {checkin ? (
            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
              <span className="inline-flex items-center gap-1.5 font-[family-name:var(--font-ui)] text-sm font-medium text-olive">
                <FeatureIcon name="check" size={14} />
                {t("practice.doneOn", { date: fmt(checkin.doneAt) })}
              </span>
              {checkin.note && <span className="font-[family-name:var(--font-ui)] text-sm italic text-ink-soft">“{checkin.note}”</span>}
              <button type="button" disabled={busy} onClick={run(onUncheck)} className="ml-auto font-[family-name:var(--font-ui)] text-xs text-ink-soft underline">
                {t("practice.undo")}
              </button>
            </div>
          ) : (
            <form
              className="flex flex-col gap-3 border-t border-line pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                void run(() => onCheck(note.trim()))();
              }}
            >
              <label className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
                {t("practice.noteLabel")}
                <TextInput value={note} maxLength={500} placeholder={t("practice.notePh")} onChange={(e) => setNote(e.target.value)} />
              </label>
              <Button type="submit" className="w-fit" disabled={busy}>
                {busy ? t("practice.saving") : t("practice.markDone")}
              </Button>
            </form>
          )}
        </div>
      )}
    </li>
  );
}
