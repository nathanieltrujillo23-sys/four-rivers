import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../../i18n/LanguageContext";
import { localizePassages } from "../../i18n/books";
import { THEME } from "../../theme/theme";
import {
  fetchPassage,
  getAccessToken,
  type PassageText,
  type SearchNote,
} from "../../lib/bibleSearch";
import { getReadVersion, setReadVersion } from "../../lib/readVersion";
import { TRANSLATION_NOTICES } from "../../content/scripture";
import type { Translation } from "../../types";
import { loadBibleShape } from "../../lib/kjv";
import {
  parsePassage,
  parseISO,
  toISO,
  type BibleShape,
  type Passage,
} from "../../lib/readingPlan";
import type {
  Group,
  GroupMember,
  ReadingDay,
  ReadingPlan,
  ReadingProgress,
} from "../../types";
import { useCourse } from "../../state/CourseContext";
import { Card, CardBody } from "../ui/Card";
import { PassageBody } from "./PassageText";
import { ReadingCatchUp } from "./ReadingCatchUp";
import { ReadingProgressRows } from "./ReadingProgressRows";

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

  const [state, setState] = useState<{
    words: number;
    minutes: number;
    parts: Part[] | null;
  } | null>(null);
  const [shape, setShape] = useState<BibleShape | null>(null);
  const [version, setVersionState] = useState<Translation>(getReadVersion);
  const [note, setNote] = useState<SearchNote | null>(null);
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const readingDate = current?.date;
  // Earlier readings of the plan, for catching up.
  const past = plan.days.filter(
    (d) => d.date < today && d.date !== current?.date,
  );
  const progressDate = readingDate ?? today;

  // Who has ticked today's reading, refreshed every half minute.
  useEffect(() => {
    let alive = true;
    const load = () =>
      repository
        .getReadingProgress(group.id, progressDate)
        .then((rows) => alive && setProgress(rows))
        .catch(() => {});
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [repository, group.id, progressDate]);

  /** Ticks (or unticks) my own reading for any day that has come due, so a missed day can be caught up. */
  async function toggleDate(date: string, done: boolean) {
    const before = progress;
    setProgress((prev) => {
      const mine = prev.find((p) => p.userId === myId);
      const dates = new Set(mine?.dates ?? []);
      if (done) dates.add(date);
      else dates.delete(date);
      const next = {
        userId: myId,
        today: !!readingDate && dates.has(readingDate),
        total: dates.size,
        dates: [...dates].sort(),
      };
      return mine
        ? prev.map((p) => (p.userId === myId ? next : p))
        : [...prev, next];
    });
    try {
      await repository.setReadingDone(group.id, date, done);
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
          .filter(
            (x): x is { label: string; passage: Passage } => x.passage !== null,
          );
        const words = parsed.reduce((sum, x) => sum + wordsIn(x.passage, s), 0);
        const minutes = Math.max(1, Math.round(words / 180));
        if (words > INLINE_WORDS) {
          setNote(null);
          setState({ words, minutes, parts: null });
          return;
        }
        const parts: Part[] = [];
        let noteSeen: SearchNote | null = null;
        for (const x of parsed) {
          let r = await fetchPassage(x.passage, version, getAccessToken);
          if (r.note) {
            // Not available in that version right now: show the KJV and say why.
            noteSeen = r.note;
            r = await fetchPassage(x.passage, "KJV", getAccessToken);
          }
          parts.push({
            label: x.label,
            passage: x.passage,
            chapters: r.chapters,
          });
        }
        if (alive) {
          setNote(noteSeen);
          setState({ words, minutes, parts });
        }
      } catch {
        // Without the Bible text the card still names the reading and offers the button.
        if (alive) setState({ words: Infinity, minutes: 0, parts: null });
      }
    })();
    return () => {
      alive = false;
    };
  }, [todayPassages, version]);

  if (!current && !next && past.length === 0) return null;

  const locale = lang === "es" ? "es-US" : "en-US";
  const dayFmt = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const readHref = (d: ReadingDay) =>
    `/community/${group.id}/read?p=${encodeURIComponent(d.passages)}&d=${d.date}`;

  const myDates = new Set(progress.find((p) => p.userId === myId)?.dates ?? []);
  const catchUp =
    past.length > 0 ? (
      <ReadingCatchUp
        groupId={group.id}
        days={past}
        myDates={myDates}
        onToggle={(date, done) => void toggleDate(date, done)}
      />
    ) : null;

  if (!current && !next) return catchUp;

  if (!current && next) {
    return (
      <>
        <Card accent={THEME.palette.gold} className="bg-parchment-deep/40" tour="group-reading">
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
        {catchUp}
      </>
    );
  }
  if (!current) return null;

  const inline = state?.parts;
  const doneIds = new Set(progress.filter((p) => p.today).map((p) => p.userId));
  const readers = members.filter((m) => doneIds.has(m.userId));
  const iRead = doneIds.has(myId);

  return (
    <>
      <Card accent={THEME.palette.gold} className="bg-parchment-deep/40" tour="group-reading">
        <CardBody>
          <div className="flex items-center justify-between gap-3">
            <p className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.18em] text-clay">
              {t("cal.today")}
            </p>
            <button
              type="button"
              aria-pressed={iRead}
              aria-label={t("read.markAria")}
              onClick={() =>
                readingDate && void toggleDate(readingDate, !iRead)
              }
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-[family-name:var(--font-ui)] text-sm font-medium transition-colors ${
                iRead
                  ? "border-olive bg-olive text-white"
                  : "border-line bg-surface text-ink-soft hover:border-olive hover:text-olive"
              }`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
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

          <div
            role="group"
            aria-label={t("ld.version")}
            className="mt-2 flex flex-wrap items-center gap-1.5 font-[family-name:var(--font-ui)]"
          >
            {(["KJV", "NIV", "ESV", "NLT"] as Translation[]).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={version === v}
                onClick={() => {
                  setVersionState(v);
                  setReadVersion(v);
                }}
                className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                  version === v
                    ? "border-water-deep bg-water-deep text-white"
                    : "border-line bg-surface text-ink-soft hover:bg-parchment-deep"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          {note && (
            <p role="status" className="mt-1 font-[family-name:var(--font-ui)] text-xs text-clay">
              {t(`ld.note.${note}`, { version, n: 0, total: 0 })} {t("read.showingKjv")}
            </p>
          )}

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
              {!note && version !== "KJV" && TRANSLATION_NOTICES[version] && (
                <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                  {TRANSLATION_NOTICES[version]}
                </p>
              )}
              {lang === "es" && (
                <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                  {t("read.english")}
                </p>
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
                    {t("cal.through", {
                      date: dayFmt.format(parseISO(current.through)),
                    })}
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
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              {t("prog.summary", { n: readers.length, total: members.length })}
            </p>
            <ReadingProgressRows
              members={members}
              progress={progress}
              plan={plan}
              myId={myId}
              today={today}
              onToggle={(date, done) => void toggleDate(date, done)}
            />
          </div>
        </CardBody>
      </Card>
      {catchUp}
    </>
  );
}

export function ReadButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      to={href}
      className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-water-deep px-4 py-2.5 font-[family-name:var(--font-ui)] text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
    >
      {label}
      <svg
        width="16"
        height="16"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
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
