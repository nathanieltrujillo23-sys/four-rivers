import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../../i18n/LanguageContext";
import { localizePassages } from "../../i18n/books";
import { THEME } from "../../theme/theme";
import { fetchPassage, getAccessToken, type PassageText } from "../../lib/bibleSearch";
import { loadBibleShape } from "../../lib/kjv";
import { parsePassage, parseISO, toISO, type BibleShape, type Passage } from "../../lib/readingPlan";
import type { Group, ReadingDay, ReadingPlan } from "../../types";
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
export function ReadingToday({ group, plan }: { group: Group; plan: ReadingPlan }) {
  const { lang, t } = useLang();
  const today = toISO(new Date());
  const current: ReadingDay | undefined =
    plan.days.find((d) => d.date === today) ??
    plan.days.find((d) => d.through && d.date <= today && today <= d.through);
  const next = plan.days.find((d) => d.date > today);

  const [state, setState] = useState<{ words: number; minutes: number; parts: Part[] | null } | null>(null);
  const [shape, setShape] = useState<BibleShape | null>(null);
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

  return (
    <Card accent={THEME.palette.gold} className="bg-parchment-deep/40">
      <CardBody>
        <p className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.18em] text-clay">
          {t("cal.today")}
        </p>

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
