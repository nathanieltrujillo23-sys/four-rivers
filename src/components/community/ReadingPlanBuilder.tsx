import { useEffect, useMemo, useState } from "react";
import { useCourse } from "../../state/CourseContext";
import { useLang } from "../../i18n/LanguageContext";
import { localizePassages, localizeReference } from "../../i18n/books";
import { BIBLE_BOOKS } from "../../lib/bibleBooks";
import { loadBibleShape } from "../../lib/kjv";
import {
  MAX_PLAN_DAYS,
  addDays,
  addMonths,
  buildPlan,
  describePassage,
  minutesPerDay,
  parseISO,
  parsePassage,
  readingDates,
  toISO,
  wholeBook,
  type BibleShape,
  type Cadence,
  type Passage,
  type PlanOrder,
} from "../../lib/readingPlan";
import type { Group, ReadingPlan } from "../../types";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { Field, TextInput } from "../ui/Field";

const RANGES = [
  { key: "week", label: "plan.r.week", end: (s: string) => addDays(s, 6) },
  { key: "twoWeeks", label: "plan.r.twoWeeks", end: (s: string) => addDays(s, 13) },
  { key: "month", label: "plan.r.month", end: (s: string) => addMonths(s, 1) },
  { key: "quarter", label: "plan.r.quarter", end: (s: string) => addMonths(s, 3) },
  { key: "half", label: "plan.r.half", end: (s: string) => addMonths(s, 6) },
  { key: "year", label: "plan.r.year", end: (s: string) => addMonths(s, 12) },
] as const;

type RangeKey = (typeof RANGES)[number]["key"] | "custom";

const bookIndex = (name: string) => BIBLE_BOOKS.findIndex((b) => b.ref === name);
const QUICK: { label: "plan.q.gospels" | "plan.q.paul" | "plan.q.wisdom"; books: string[] }[] = [
  { label: "plan.q.gospels", books: ["Matthew", "Mark", "Luke", "John"] },
  {
    label: "plan.q.paul",
    books: [
      "Romans",
      "1 Corinthians",
      "2 Corinthians",
      "Galatians",
      "Ephesians",
      "Philippians",
      "Colossians",
      "1 Thessalonians",
      "2 Thessalonians",
      "1 Timothy",
      "2 Timothy",
      "Titus",
      "Philemon",
    ],
  },
  { label: "plan.q.wisdom", books: ["Job", "Psalm", "Proverbs", "Ecclesiastes", "Song of Solomon"] },
];

function Choice({
  on,
  onClick,
  title,
  hint,
}: {
  on: boolean;
  onClick: () => void;
  title: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-left transition-colors ${
        on ? "border-water-deep bg-water-deep/10" : "border-line bg-surface hover:bg-parchment-deep/50"
      }`}
    >
      <span className="block font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">{title}</span>
      {hint && (
        <span className="mt-0.5 block font-[family-name:var(--font-ui)] text-xs text-ink-soft">{hint}</span>
      )}
    </button>
  );
}

function Chips<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-full border px-3 py-1 font-[family-name:var(--font-ui)] text-sm transition-colors ${
            value === o.key
              ? "border-water-deep bg-water-deep text-white"
              : "border-line bg-surface text-ink-soft hover:bg-parchment-deep"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * The leader's reading-plan maker: pick passages, a time range, whether to read
 * them one after another or all together, and whether chapters stay whole or
 * are divided at natural breaks. Applying it fills the group's calendar.
 */
export function ReadingPlanBuilder({ group }: { group: Group }) {
  const { repository } = useCourse();
  const { lang, t } = useLang();
  const today = toISO(new Date());

  const [shape, setShape] = useState<BibleShape | null>(null);
  const [shapeError, setShapeError] = useState(false);
  const [existing, setExisting] = useState<ReadingPlan | null>(null);

  const [title, setTitle] = useState("");
  const [passages, setPassages] = useState<Passage[]>([]);
  const [entry, setEntry] = useState("");
  const [entryError, setEntryError] = useState(false);
  const [start, setStart] = useState(today);
  const [range, setRange] = useState<RangeKey>("month");
  const [end, setEnd] = useState(addMonths(today, 1));
  const [cadence, setCadence] = useState<Cadence>("daily");
  const [order, setOrder] = useState<PlanOrder>("chronological");
  const [splitChapters, setSplitChapters] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadBibleShape()
      .then((s) => alive && setShape(s))
      .catch(() => alive && setShapeError(true));
    repository
      .getReadingPlan(group.id)
      .then((p) => alive && setExisting(p.days.length > 0 ? p : null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [repository, group.id]);

  function pickRange(key: RangeKey) {
    setRange(key);
    const preset = RANGES.find((r) => r.key === key);
    if (preset) setEnd(preset.end(start));
  }

  function changeStart(value: string) {
    if (!value) return;
    setStart(value);
    const preset = RANGES.find((r) => r.key === range);
    if (preset) setEnd(preset.end(value));
  }

  function addEntry() {
    if (!shape) return;
    const p = parsePassage(entry, shape);
    if (!p) {
      setEntryError(true);
      return;
    }
    setEntryError(false);
    setPassages((prev) => [...prev, p]);
    setEntry("");
    setApplied(false);
  }

  function addBooks(names: string[]) {
    if (!shape) return;
    setPassages((prev) => [...prev, ...names.map((n) => wholeBook(bookIndex(n), shape))]);
    setApplied(false);
  }

  function move(i: number, by: -1 | 1) {
    setPassages((prev) => {
      const next = [...prev];
      const j = i + by;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const slots = useMemo(() => readingDates(start, end, cadence).length, [start, end, cadence]);
  const dateProblem = end < start ? "plan.badDates" : slots > MAX_PLAN_DAYS ? "plan.tooLong" : null;

  const days = useMemo(
    () =>
      shape && passages.length > 0 && !dateProblem
        ? buildPlan({ passages, start, end, cadence, order, splitChapters }, shape)
        : [],
    [shape, passages, start, end, cadence, order, splitChapters, dateProblem],
  );

  const dateFmt = new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const shortFmt = new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const fmt = (iso: string) => dateFmt.format(parseISO(iso));

  async function apply() {
    if (days.length === 0) return;
    setBusy(true);
    setError(null);
    setApplied(false);
    try {
      const plan: ReadingPlan = {
        title: title.trim() || null,
        days: days.map((d) => ({ date: d.date, through: d.through, passages: d.passages })),
      };
      await repository.setReadingPlan(group.id, plan);
      setExisting(plan);
      setApplied(true);
    } catch (err) {
      setError(t("plan.error", { message: err instanceof Error ? err.message : String(err) }));
    } finally {
      setBusy(false);
    }
  }

  async function clearPlan() {
    if (!window.confirm(t("plan.clearConfirm"))) return;
    try {
      await repository.setReadingPlan(group.id, null);
      setExisting(null);
      setApplied(false);
    } catch (err) {
      setError(t("plan.error", { message: err instanceof Error ? err.message : String(err) }));
    }
  }

  const shown = showAll ? days : days.slice(0, 7);

  return (
    <Card accent="var(--color-gold)">
      <CardBody className="flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-semibold text-ink">{t("plan.title")}</h2>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("plan.sub")}</p>
        </div>

        {existing && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-parchment-deep/40 px-4 py-3 font-[family-name:var(--font-ui)] text-sm">
            <div>
              <p className="font-semibold text-ink">
                {t("plan.current")}
                {existing.title ? `: ${existing.title}` : ""}
              </p>
              <p className="text-ink-soft">
                {t("plan.currentLine", {
                  n: existing.days.length,
                  first: shortFmt.format(parseISO(existing.days[0].date)),
                  last: shortFmt.format(parseISO(existing.days[existing.days.length - 1].date)),
                })}
              </p>
            </div>
            <Button variant="ghost" onClick={() => void clearPlan()}>
              {t("plan.clear")}
            </Button>
          </div>
        )}

        <Field label={t("plan.titleLabel")}>
          <TextInput
            value={title}
            maxLength={80}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("plan.titlePh")}
          />
        </Field>

        {/* Passages */}
        <div className="flex flex-col gap-2">
          <p className="font-[family-name:var(--font-ui)] text-sm font-medium text-ink">
            {t("plan.passages")}
          </p>
          <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("plan.passagesHint")}</p>
          {shapeError && (
            <p className="font-[family-name:var(--font-ui)] text-sm text-red-700" role="alert">
              {t("plan.loadError")}
            </p>
          )}
          {passages.length > 0 ? (
            <ol className="flex flex-col gap-1.5">
              {passages.map((p, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 font-[family-name:var(--font-ui)] text-sm text-ink"
                >
                  <span className="w-5 text-xs text-ink-soft">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {shape ? localizeReference(describePassage(p, shape), lang) : ""}
                  </span>
                  <button
                    type="button"
                    aria-label={t("plan.up")}
                    title={t("plan.up")}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    className="px-1 text-ink-soft hover:text-ink disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={t("plan.down")}
                    title={t("plan.down")}
                    disabled={i === passages.length - 1}
                    onClick={() => move(i, 1)}
                    className="px-1 text-ink-soft hover:text-ink disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label={t("plan.remove")}
                    title={t("plan.remove")}
                    onClick={() => setPassages((prev) => prev.filter((_, j) => j !== i))}
                    className="px-1 text-ink-soft hover:text-red-700"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("plan.noPassages")}</p>
          )}
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addEntry();
            }}
          >
            <div className="min-w-48 flex-1">
              <TextInput
                value={entry}
                onChange={(e) => {
                  setEntry(e.target.value);
                  setEntryError(false);
                }}
                placeholder={t("plan.addPh")}
                aria-label={t("plan.passages")}
              />
            </div>
            <Button type="submit" variant="secondary" disabled={!shape || !entry.trim()}>
              {t("plan.add")}
            </Button>
            <select
              aria-label={t("plan.pickBook")}
              value=""
              disabled={!shape}
              onChange={(e) => e.target.value && addBooks([e.target.value])}
              className="rounded-xl border border-line bg-surface px-3 py-2 font-[family-name:var(--font-ui)] text-sm text-ink"
            >
              <option value="">{t("plan.pickBook")}</option>
              {BIBLE_BOOKS.map((b) => (
                <option key={b.ref} value={b.ref}>
                  {lang === "es" ? b.es : b.ref}
                </option>
              ))}
            </select>
          </form>
          {entryError && (
            <p className="font-[family-name:var(--font-ui)] text-xs text-clay" role="alert">
              {t("plan.notFound")}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
            <span>{t("plan.quick")}:</span>
            {QUICK.map((q) => (
              <button
                key={q.label}
                type="button"
                disabled={!shape}
                onClick={() => addBooks(q.books)}
                className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-ink-soft hover:bg-parchment-deep"
              >
                {t(q.label)}
              </button>
            ))}
          </div>
        </div>

        {/* Time range */}
        <div className="flex flex-col gap-2">
          <p className="font-[family-name:var(--font-ui)] text-sm font-medium text-ink">{t("plan.range")}</p>
          <Chips<RangeKey>
            label={t("plan.range")}
            value={range}
            onChange={pickRange}
            options={[
              ...RANGES.map((r) => ({ key: r.key as RangeKey, label: t(r.label) })),
              { key: "custom", label: t("plan.r.custom") },
            ]}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("plan.start")}>
              <TextInput type="date" value={start} onChange={(e) => changeStart(e.target.value)} />
            </Field>
            <Field label={t("plan.end")}>
              <TextInput
                type="date"
                value={end}
                min={start}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setEnd(e.target.value);
                  setRange("custom");
                }}
              />
            </Field>
          </div>
          <p className="font-[family-name:var(--font-ui)] text-sm font-medium text-ink">
            {t("plan.cadence")}
          </p>
          <Chips<Cadence>
            label={t("plan.cadence")}
            value={cadence}
            onChange={setCadence}
            options={[
              { key: "daily", label: t("plan.c.daily") },
              { key: "weekdays", label: t("plan.c.weekdays") },
              { key: "weekly", label: t("plan.c.weekly") },
            ]}
          />
        </div>

        {/* Order and chapters */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2" role="radiogroup" aria-label={t("plan.order")}>
            <p className="font-[family-name:var(--font-ui)] text-sm font-medium text-ink">
              {t("plan.order")}
            </p>
            <Choice
              on={order === "chronological"}
              onClick={() => setOrder("chronological")}
              title={t("plan.o.chron")}
              hint={t("plan.o.chronHint")}
            />
            <Choice
              on={order === "synchronized"}
              onClick={() => setOrder("synchronized")}
              title={t("plan.o.sync")}
              hint={t("plan.o.syncHint")}
            />
          </div>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label={t("plan.split")}>
            <p className="font-[family-name:var(--font-ui)] text-sm font-medium text-ink">
              {t("plan.split")}
            </p>
            <Choice
              on={!splitChapters}
              onClick={() => setSplitChapters(false)}
              title={t("plan.s.whole")}
              hint={t("plan.s.wholeHint")}
            />
            <Choice
              on={splitChapters}
              onClick={() => setSplitChapters(true)}
              title={t("plan.s.split")}
              hint={t("plan.s.splitHint")}
            />
          </div>
        </div>

        {/* Preview */}
        <div className="flex flex-col gap-2 rounded-xl bg-parchment-deep/30 p-3">
          <p className="font-[family-name:var(--font-ui)] text-sm font-medium text-ink">
            {t("plan.preview")}
          </p>
          {dateProblem ? (
            <p className="font-[family-name:var(--font-ui)] text-sm text-clay" role="alert">
              {t(dateProblem, { n: MAX_PLAN_DAYS })}
            </p>
          ) : !shape && !shapeError ? (
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("plan.loading")}</p>
          ) : days.length === 0 ? (
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("plan.noPassages")}</p>
          ) : (
            <>
              <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                {t("plan.summary", { days: days.length, min: minutesPerDay(days) })}
              </p>
              <ul className="flex flex-col divide-y divide-line font-[family-name:var(--font-ui)] text-sm">
                {shown.map((d) => (
                  <li key={d.date} className="flex flex-wrap gap-x-4 gap-y-0.5 py-1.5">
                    <span className="w-28 shrink-0 text-ink-soft">
                      {fmt(d.date)}
                      {d.through ? ` – ${fmt(d.through)}` : ""}
                    </span>
                    <span className="min-w-0 flex-1 text-ink">{localizePassages(d.passages, lang)}</span>
                  </li>
                ))}
              </ul>
              {days.length > 7 && (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="self-start font-[family-name:var(--font-ui)] text-sm text-water underline"
                >
                  {showAll ? t("plan.showLess") : t("plan.showAll", { n: days.length })}
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={days.length === 0 || busy} onClick={() => void apply()}>
            {busy ? t("plan.applying") : t("plan.apply")}
          </Button>
          {existing && days.length > 0 && !applied && (
            <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
              {t("plan.replaces")}
            </span>
          )}
          {applied && (
            <span className="font-[family-name:var(--font-ui)] text-sm text-olive" role="status">
              {t("plan.applied")}
            </span>
          )}
        </div>
        {error && (
          <p className="font-[family-name:var(--font-ui)] text-xs text-red-700" role="alert">
            {error}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
