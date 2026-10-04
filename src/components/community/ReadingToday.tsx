import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../../i18n/LanguageContext";
import { localizePassages } from "../../i18n/books";
import { THEME } from "../../theme/theme";
import { fetchPassage, getAccessToken, type PassageText } from "../../lib/bibleSearch";
import { loadBibleShape } from "../../lib/kjv";
import { parsePassage, parseISO, toISO, type BibleShape, type Passage } from "../../lib/readingPlan";
import type { Group, GroupMember, ReadingDay, ReadingPlan, ReadingProgress } from "../../types";
import { useCourse } from "../../state/CourseContext";
import { Avatar } from "../ui/Avatar";
import { Card, CardBody } from "../ui/Card";
import { PassageBody } from "./PassageText";

/** Readings up to about this many words show right in the card; longer ones get a "Read passage" button. */
const INLINE_WORDS = 110;

interface Part {
  label: string;
  passage: Passage;
  chapters: PassageText[];
}

function wordsIn(p: Passage, shape: BibleShape): number {
  let sum = 0;
  for (let c = p.fromChapter; c <= p.toChapter; c++) {
    const w = shape.verseWords(p.book, c);
    const from = c === p.fromChapter ? p.fromVerse : 1;
    const to = c === p.toChapter ? p.toVerse : w.length;
    for (let v = from; v <= to; v++) sum += w[v - 1] ?? 0;
  }
  return sum;
}

/**
 * Today's reading, shown under the verse of the day. A short portion appears
 * in full; a long one shows only its reference with a blue "Read passage"
 * button that opens the whole thing on its own page.
 */
export function ReadingToday({
  group,
  plan,
  members,
  myId,
}: {
  group: Group;
  plan: ReadingPlan;
  members: GroupMember[];
  myId: string;
}) {
  const { repository } = useCourse();
  const { lang, t } = useLang();
  const today = toISO(new Date());
  const current: ReadingDay | undefined =
    plan.days.find((d) => d.date === today) ??
    plan.days.find((d) => d.through && d.date <= today && today <= d.through);
  const next = plan.days.find((d) => d.date > today);

  const [state, setState] = useState<{ words: number; minutes: number; parts: Part[] | null } | null>(null);
  const [shape, setShape] = useState<BibleShape | null>(null);
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [showAll, setShowAll] = useState(false);
  const readingDate = current?.date;

  // Who has ticked today's reading, refreshed every half minute.
  useEffect(() => {
    if (!readingDate) return;
    let alive = true;
    const load = () =>
      repository
        .getReadingProgress(group.id, readingDate)
        .then((rows) => alive && setProgress(rows))
        .catch(() => {});
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [repository, group.id, readingDate]);

  async function toggleDone(done: boolean) {
    if (!readingDate) return;
    const before = progress;
    setProgress((prev) => {
      const mine = prev.find((p) => p.userId === myId);
      if (mine) {
        return prev.map((p) =>
          p.userId === myId ? { ...p, today: done, total: Math.max(0, p.total + (done ? 1 : -1)) } : p,
        );
      }
      return [...prev, { userId: myId, today: done, total: done ? 1 : 0 }];
    });
    try {
      await repository.setReadingDone(group.id, readingDate, done);
    } catch {
      setProgress(before);
    }
  }
  const todayPassages = current?.passages;

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!todayPassages) return;
      try {
        const s = await loadBibleShape();
        if (!alive) return;
        setShape(s);
        const parsed = todayPassages
          .split("; ")
          .map((label) => ({ label, passage: parsePassage(label, s) }))
          .filter((x): x is { label: string; passage: Passage } => x.passage !== null);
        const words = parsed.reduce((sum, x) => sum + wordsIn(x.passage, s), 0);
        const minutes = Math.max(1, Math.round(words / 180));
        if (words > INLINE_WORDS) {
          setState({ words, minutes, parts: null });
          return;
        }
        const parts: Part[] = [];
        for (const x of parsed) {
          const r = await fetchPassage(x.passage, "KJV", getAccessToken);
          parts.push({ label: x.label, passage: x.passage, chapters: r.chapters });
        }
        if (alive) setState({ words, minutes, parts });
      } catch {
        // Without the Bible text the card still names the reading and offers the button.
        if (alive) setState({ words: Infinity, minutes: 0, parts: null });
      }
    })();
    return () => {
      alive = false;
    };
  }, [todayPassages]);

  if (!current && !next) return null;

  const locale = lang === "es" ? "es-US" : "en-US";
  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric" });
  const readHref = (d: ReadingDay) =>
    `/community/${group.id}/read?p=${encodeURIComponent(d.passages)}&d=${d.date}`;

  if (!current && next) {
    return (
      <Card accent={THEME.palette.gold} className="bg-parchment-deep/40">
        <CardBody>
          <p className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.18em] text-clay">
            {t("cal.next")}
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-xl text-ink">
            {localizePassages(next.passages, lang)}
          </p>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            {dayFmt.format(parseISO(next.date))}
          </p>
        </CardBody>
      </Card>
    );
  }
  if (!current) return null;

  const inline = state?.parts;
  const doneIds = new Set(progress.filter((p) => p.today).map((p) => p.userId));
  const readers = members.filter((m) => doneIds.has(m.userId));
  const iRead = doneIds.has(myId);
  // Readings that have come due so far, for each person's "x of y".
  const due = plan.days.filter((d) => d.date <= today).length;

  return (
    <Card accent={THEME.palette.gold} className="bg-parchment-deep/40">
      <CardBody>
        <div className="flex items-center justify-between gap-3">
          <p className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.18em] text-clay">
            {t("cal.today")}
          </p>
          <button
            type="button"
            aria-pressed={iRead}
            aria-label={t("read.markAria")}
            onClick={() => void toggleDone(!iRead)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-[family-name:var(--font-ui)] text-sm font-medium transition-colors ${
              iRead
                ? "border-olive bg-olive text-white"
                : "border-line bg-surface text-ink-soft hover:border-olive hover:text-olive"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M4.5 10.5l3.5 3.5 7.5-8"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {iRead ? t("read.done") : t("read.mark")}
          </button>
        </div>

        {inline ? (
          <div className="mt-2 flex flex-col gap-4">
            {inline.map((part) => (
              <div key={part.label}>
                <p className="mb-1 font-[family-name:var(--font-ui)] text-sm font-semibold text-ink-soft">
                  {localizePassages(part.label, lang)}
                </p>
                <PassageBody
                  chapters={part.chapters}
                  breaks={(c) => shape?.breaks(part.passage.book, c) ?? []}
                  size="text-lg"
                />
              </div>
            ))}
            {lang === "es" && (
              <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("read.english")}</p>
            )}
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-display)] text-xl leading-snug text-ink">
                {localizePassages(current.passages, lang)}
              </p>
              {current.through && (
                <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                  {t("cal.through", { date: dayFmt.format(parseISO(current.through)) })}
                </p>
              )}
              {state && state.minutes > 0 && (
                <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                  {t("read.minutes", { min: state.minutes })}
                </p>
              )}
            </div>
            <ReadButton href={readHref(current)} label={t("read.btn")} />
          </div>
        )}

        <div className="mt-4 border-t border-line pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              {t("prog.summary", { n: readers.length, total: members.length })}
            </p>
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="font-[family-name:var(--font-ui)] text-sm text-water underline"
            >
              {showAll ? t("prog.hide") : t("prog.all")}
            </button>
          </div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {members.map((m) => {
              const read = doneIds.has(m.userId);
              return (
                <li
                  key={m.userId}
                  title={`${m.displayName}${read ? " ✓" : ""}`}
                  className={`relative ${read ? "" : "opacity-40"}`}
                >
                  <Avatar value={m.avatar} name={m.displayName} size={30} />
                  {read && (
                    <span
                      className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-parchment bg-olive text-white"
                      aria-label={t("read.done")}
                    >
                      <svg width="9" height="9" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path
                          d="M4 10.5l4 4 8-9"
                          stroke="currentColor"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {showAll && (
            <ul className="mt-3 flex flex-col gap-2">
              {members.map((m) => {
                const total = progress.find((p) => p.userId === m.userId)?.total ?? 0;
                const pct = due > 0 ? Math.min(100, Math.round((total / due) * 100)) : 0;
                return (
                  <li
                    key={m.userId}
                    className="flex items-center gap-3 font-[family-name:var(--font-ui)] text-sm"
                  >
                    <Avatar value={m.avatar} name={m.displayName} size={24} />
                    <span className="w-24 shrink-0 truncate text-ink sm:w-32">{m.displayName}</span>
                    <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
                      <span className="block h-full rounded-full bg-olive" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-20 shrink-0 text-right text-xs text-ink-soft">
                      {t("prog.row", { done: total, due })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export function ReadButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      to={href}
      className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-water-deep px-4 py-2.5 font-[family-name:var(--font-ui)] text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
    >
      {label}
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M4 10h12m0 0-5-5m5 5-5 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
