import { useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../../i18n/LanguageContext";
import { THEME } from "../../theme/theme";
import { parseISO, toISO } from "../../lib/readingPlan";
import type { Group, ReadingDay, ReadingPlan } from "../../types";
import { Card, CardBody } from "../ui/Card";
import { localizePassages } from "../../i18n/books";

/** The first of the month, as a Date, for the grid being shown. */
function monthStart(iso: string): Date {
  const d = parseISO(iso);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * The group's reading calendar: what to read today (or next), and a month
 * grid of the whole plan. On a phone the month is a list instead of a grid.
 */
export function ReadingCalendar({
  group,
  isLeader,
  plan,
}: {
  group: Group;
  isLeader: boolean;
  plan: ReadingPlan;
}) {
  const { lang, t } = useLang();
  const today = toISO(new Date());
  // Open on this month when the plan covers it, otherwise on the plan's own first month.
  const [month, setMonth] = useState(() => {
    const first = plan.days[0]?.date;
    const last = plan.days[plan.days.length - 1]?.date;
    return monthStart(first && last && today >= first && today <= last ? today : (first ?? today));
  });

  if (plan.days.length === 0) {
    if (!isLeader) return null;
    return (
      <Card className="border-dashed">
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("cal.emptyLeader")}</p>
          <Link
            to={`/community/${group.id}/leader`}
            className="rounded-lg bg-parchment-deep px-3 py-1.5 font-[family-name:var(--font-ui)] text-sm font-medium text-ink hover:bg-line"
          >
            {t("cal.setPlan")}
          </Link>
        </CardBody>
      </Card>
    );
  }

  const locale = lang === "es" ? "es-US" : "en-US";
  const shortFmt = new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric" });
  const monthFmt = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const monthText = monthFmt.format(month);
  const monthLabel = monthText.charAt(0).toUpperCase() + monthText.slice(1);
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: "short" });

  const byDate = new Map(plan.days.map((d) => [d.date, d]));
  /** A weekly reading also colors the days it covers. */
  const covering = (iso: string): ReadingDay | undefined =>
    byDate.get(iso) ?? plan.days.find((d) => d.through && d.date <= iso && iso <= d.through);

  const current = covering(today);
  const next = plan.days.find((d) => d.date > today);

  const year = month.getFullYear();
  const m = month.getMonth();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const lead = month.getDay();
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toISO(new Date(year, m, i + 1))),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const monthDays = plan.days.filter((d) => {
    const dt = parseISO(d.date);
    return dt.getFullYear() === year && dt.getMonth() === m;
  });
  const weekdayNames = Array.from({ length: 7 }, (_, i) => weekdayFmt.format(new Date(2026, 9, 4 + i)));
  const shift = (by: number) => setMonth(new Date(year, m + by, 1));

  return (
    <Card accent={THEME.palette.gold}>
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">{t("cal.title")}</h2>
          {plan.title && (
            <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{plan.title}</span>
          )}
        </div>

        {!current && !next && (
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("cal.finished")}</p>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label={t("cal.prev")}
            onClick={() => shift(-1)}
            className="h-8 w-8 rounded-lg text-ink-soft hover:bg-parchment-deep hover:text-ink"
          >
            ‹
          </button>
          <p className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">{monthLabel}</p>
          <button
            type="button"
            aria-label={t("cal.nextMonth")}
            onClick={() => shift(1)}
            className="h-8 w-8 rounded-lg text-ink-soft hover:bg-parchment-deep hover:text-ink"
          >
            ›
          </button>
        </div>

        {/* Phone: a list of this month's readings */}
        <ul className="flex flex-col divide-y divide-line font-[family-name:var(--font-ui)] text-sm sm:hidden">
          {monthDays.length === 0 && <li className="py-2 text-ink-soft">{t("cal.noneToday")}</li>}
          {monthDays.map((d) => (
            <li key={d.date} className={`py-2 ${d.date === today ? "font-semibold" : ""}`}>
              <span className="block text-xs text-ink-soft">
                {shortFmt.format(parseISO(d.date))}
                {d.through ? ` – ${shortFmt.format(parseISO(d.through))}` : ""}
              </span>
              <span className="text-ink">{localizePassages(d.passages, lang)}</span>
            </li>
          ))}
        </ul>

        {/* Larger screens: the month grid */}
        <div className="hidden sm:block">
          <div className="grid grid-cols-7 gap-1 pb-1 text-center font-[family-name:var(--font-ui)] text-xs text-ink-soft">
            {weekdayNames.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((iso, i) => {
              if (!iso) return <div key={i} className="min-h-20 rounded-lg bg-parchment-deep/20" />;
              const entry = byDate.get(iso);
              const covered = !entry ? covering(iso) : undefined;
              const isToday = iso === today;
              return (
                <div
                  key={iso}
                  title={entry ? localizePassages(entry.passages, lang) : undefined}
                  className={`min-h-20 rounded-lg border p-1.5 font-[family-name:var(--font-ui)] ${
                    isToday ? "border-water-deep ring-1 ring-water-deep" : "border-line"
                  } ${entry ? "bg-surface" : covered ? "bg-gold/10" : "bg-parchment-deep/20"}`}
                >
                  <span
                    className={`block text-xs ${isToday ? "font-bold text-water-deep" : "text-ink-soft"}`}
                  >
                    {Number(iso.slice(8))}
                  </span>
                  {entry && (
                    <span className="mt-0.5 line-clamp-3 block text-[11px] leading-tight text-ink">
                      {localizePassages(entry.passages, lang)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
