import { useLang } from "../../i18n/LanguageContext";
import type { GroupMember, ReadingPlan, ReadingProgress } from "../../types";
import { Avatar } from "../ui/Avatar";
import { parseISO } from "../../lib/readingPlan";

/** Up to this many readings, each gets its own box; past it, one bar shows the total. */
const BOXES_UP_TO = 62;

function Check({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 10.5l4 4 8-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * One row per member: their name and a check for every reading they have done,
 * adding up toward the end of the plan. Whoever has finished the whole plan
 * is marked and listed first.
 */
export function ReadingProgressRows({
  members,
  progress,
  plan,
  myId,
  today,
  onToggle,
}: {
  members: GroupMember[];
  progress: ReadingProgress[];
  plan: ReadingPlan;
  myId: string;
  today: string;
  /** Lets the signed-in person tick or untick their own days that have come due. */
  onToggle?: (date: string, done: boolean) => void;
}) {
  const { lang, t } = useLang();
  const total = plan.days.length;
  const rows = members
    .map((m) => {
      const dates = new Set(progress.find((p) => p.userId === m.userId)?.dates ?? []);
      const done = plan.days.filter((d) => dates.has(d.date)).length;
      return { m, dates, done, finished: total > 0 && done === total };
    })
    .sort(
      (a, b) =>
        Number(b.finished) - Number(a.finished) ||
        b.done - a.done ||
        a.m.displayName.localeCompare(b.m.displayName),
    );
  const perDay = total <= BOXES_UP_TO;
  const dayFmt = new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <>
      {onToggle && perDay && (
        <p className="mt-2 font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("prog.catchUp")}</p>
      )}
      <ul className="mt-3 flex max-h-96 flex-col gap-2.5 overflow-y-auto" aria-label={t("prog.all")}>
        {rows.map(({ m, dates, done, finished }) => {
          const mine = m.userId === myId;
          const editable = mine && !!onToggle;
          return (
            <li
              key={m.userId}
              aria-label={`${m.displayName}: ${finished ? t("prog.finished") : t("prog.row", { done, due: total })}`}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 font-[family-name:var(--font-ui)] text-sm sm:grid-cols-[auto_9rem_minmax(0,1fr)]"
            >
              <Avatar value={m.avatar} name={m.displayName} size={26} />
              <span className="truncate font-medium text-ink">
                {m.displayName}
                {mine && <span className="ml-1 text-xs font-normal text-ink-soft">({t("members.you")})</span>}
              </span>
              <div
                className={`col-span-2 flex min-w-0 flex-wrap items-center sm:col-span-1 ${
                  editable ? "gap-1" : "gap-[3px] sm:gap-1"
                }`}
              >
                {perDay ? (
                  plan.days.map((d) => {
                    const read = dates.has(d.date);
                    const missed = !read && d.date < today;
                    const look = read
                      ? "bg-olive text-white"
                      : missed
                        ? "border border-clay/60"
                        : "border border-line bg-parchment-deep/40";
                    const when = dayFmt.format(parseISO(d.date));
                    if (editable && d.date <= today) {
                      return (
                        <button
                          key={d.date}
                          type="button"
                          aria-pressed={read}
                          aria-label={t(read ? "prog.unmark" : "prog.mark", { date: when })}
                          title={when}
                          onClick={() => onToggle(d.date, !read)}
                          className={`flex h-6 w-6 items-center justify-center rounded transition-transform hover:scale-110 ${look}`}
                        >
                          {read && <Check size={13} />}
                        </button>
                      );
                    }
                    return (
                      <span
                        key={d.date}
                        aria-hidden="true"
                        title={when}
                        className={`flex h-[14px] w-[14px] items-center justify-center rounded-[3px] sm:h-[18px] sm:w-[18px] sm:rounded ${
                          editable ? "!h-6 !w-6 !rounded sm:!h-6 sm:!w-6 opacity-60" : ""
                        } ${look}`}
                      >
                        {read && <Check size={10} />}
                      </span>
                    );
                  })
                ) : (
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-line"
                      aria-hidden="true"
                    >
                      <span
                        className="block h-full rounded-full bg-olive"
                        style={{ width: `${Math.round((done / total) * 100)}%` }}
                      />
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                      <Check size={11} />
                      {done}
                    </span>
                  </span>
                )}
                <span
                  className={`ml-1 whitespace-nowrap text-xs ${finished ? "font-semibold text-olive" : "text-ink-soft"}`}
                >
                  {finished ? t("prog.finished") : t("prog.row", { done, due: total })}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
