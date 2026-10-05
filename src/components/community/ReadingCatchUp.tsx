import { useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../../i18n/LanguageContext";
import { localizePassages } from "../../i18n/books";
import { parseISO } from "../../lib/readingPlan";
import type { ReadingDay } from "../../types";
import { Card, CardBody } from "../ui/Card";

/**
 * Earlier readings of the plan in one list, newest first, so a missed day is
 * a tap away: open the passage, then tick it off. By default only the days
 * not yet read show; a switch brings back the ones already done.
 */
export function ReadingCatchUp({
  groupId,
  days,
  myDates,
  onToggle,
}: {
  groupId: string;
  /** Readings dated before today, oldest first. */
  days: ReadingDay[];
  myDates: Set<string>;
  onToggle: (date: string, done: boolean) => void;
}) {
  const { lang, t } = useLang();
  const [showAll, setShowAll] = useState(false);
  const missed = days.filter((d) => !myDates.has(d.date));
  const shown = [...(showAll ? days : missed)].reverse();
  const fmt = new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <Card tour="group-catchup">
      <CardBody className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            {t("catch.title")}
            {missed.length > 0 && (
              <span className="rounded-full bg-clay px-2 py-0.5 font-[family-name:var(--font-ui)] text-xs font-semibold text-white">
                {missed.length}
              </span>
            )}
          </h2>
          <button
            type="button"
            aria-pressed={showAll}
            onClick={() => setShowAll((v) => !v)}
            className="rounded-full border border-line bg-surface px-3 py-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft hover:bg-parchment-deep aria-pressed:border-water-deep aria-pressed:text-water-deep"
          >
            {showAll ? t("catch.onlyMissed") : t("catch.showAll")}
          </button>
        </div>

        {shown.length === 0 ? (
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            {t("catch.allDone")}
          </p>
        ) : (
          <ul className="flex max-h-96 flex-col divide-y divide-line overflow-y-auto font-[family-name:var(--font-ui)] text-sm">
            {shown.map((d) => {
              const done = myDates.has(d.date);
              const label = localizePassages(d.passages, lang);
              return (
                <li key={d.date} className="flex items-center gap-3 py-2.5">
                  <button
                    type="button"
                    aria-pressed={done}
                    aria-label={t("catch.markAria", {
                      passage: label,
                      date: fmt.format(parseISO(d.date)),
                    })}
                    onClick={() => onToggle(d.date, !done)}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors ${
                      done
                        ? "border-olive bg-olive text-white"
                        : "border-line bg-surface text-transparent hover:border-olive hover:text-olive"
                    }`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M4.5 10.5l3.5 3.5 7.5-8"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-soft">
                      {fmt.format(parseISO(d.date))}
                      {d.through ? ` – ${fmt.format(parseISO(d.through))}` : ""}
                    </p>
                    <p
                      className={`truncate ${done ? "text-ink-soft" : "text-ink"}`}
                    >
                      {label}
                    </p>
                  </div>
                  <Link
                    to={`/community/${groupId}/read?p=${encodeURIComponent(d.passages)}&d=${d.date}`}
                    className="shrink-0 rounded-lg bg-water-deep px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                  >
                    {t("read.btn")}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
