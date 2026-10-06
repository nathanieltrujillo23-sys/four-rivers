import { useEffect, useState } from "react";
import { useCourse } from "../../state/CourseContext";
import { useLang } from "../../i18n/LanguageContext";
import { toISO } from "../../lib/readingPlan";
import { readingStreak } from "../../lib/readingStats";
import type { GroupMember, MemberCourseProgress, ReadingPlan, ReadingProgress } from "../../types";
import { Avatar } from "../ui/Avatar";
import { Card, CardBody } from "../ui/Card";

function daysSince(iso: string | null): number | null {
  return iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)) : null;
}

/**
 * Leaders only: each member's place in the course and in the group's reading plan, with the people who
 * have been away longest listed first so they are easy to encourage.
 */
export function MemberProgress({
  groupId,
  members,
  plan,
}: {
  groupId: string;
  members: GroupMember[];
  plan: ReadingPlan | null;
}) {
  const { repository } = useCourse();
  const { t } = useLang();
  const [course, setCourse] = useState<MemberCourseProgress[] | null>(null);
  const [reading, setReading] = useState<ReadingProgress[]>([]);
  const [failed, setFailed] = useState(false);
  const today = toISO(new Date());

  useEffect(() => {
    let alive = true;
    repository
      .getMemberCourseProgress(groupId)
      .then((rows) => alive && setCourse(rows))
      .catch(() => alive && setFailed(true));
    repository
      .getReadingProgress(groupId, today)
      .then((rows) => alive && setReading(rows))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [repository, groupId, today]);

  if (failed)
    return (
      <Card>
        <CardBody>
          <h2 className="text-lg font-semibold text-ink">{t("mp.title")}</h2>
          <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("mp.error")}</p>
        </CardBody>
      </Card>
    );
  if (!course) return null;

  const dueDates = (plan?.days ?? []).map((d) => d.date).filter((d) => d <= today);
  const rows = members
    .map((m) => {
      const c = course.find((x) => x.userId === m.userId);
      const dates = new Set(reading.find((r) => r.userId === m.userId)?.dates ?? []);
      return {
        m,
        c,
        away: daysSince(c?.lastSeenAt ?? null),
        done: dueDates.filter((d) => dates.has(d)).length,
        streak: readingStreak(dueDates, dates, today),
      };
    })
    .sort((a, b) => (b.away ?? 999) - (a.away ?? 999) || a.m.displayName.localeCompare(b.m.displayName));

  const awayText = (n: number | null) =>
    n === null ? t("mp.never") : n === 0 ? t("mp.today") : n === 1 ? t("mp.yesterday") : t("mp.daysAgo", { n });

  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">{t("mp.title")}</h2>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("mp.sub")}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left font-[family-name:var(--font-ui)] text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-ink-soft">
                <th className="py-1.5 pr-3 font-medium">{t("mp.member")}</th>
                <th className="py-1.5 pr-3 font-medium">{t("mp.course")}</th>
                {dueDates.length > 0 && <th className="py-1.5 pr-3 font-medium">{t("mp.reading")}</th>}
                <th className="py-1.5 font-medium">{t("mp.lastSeen")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ m, c, away, done, streak }) => (
                <tr key={m.userId} className="border-t border-line text-ink">
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-2">
                      <Avatar value={m.avatar ?? null} name={m.displayName} size={24} />
                      {m.displayName}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    {c ? (
                      <>
                        {t("mp.rivers", { n: c.riversComplete })}
                        {c.examPassed && (
                          <span className="ml-2 rounded-full bg-olive/15 px-2 py-0.5 text-xs font-medium text-olive">
                            {t("mp.exam")}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-ink-soft">{t("mp.noData")}</span>
                    )}
                  </td>
                  {dueDates.length > 0 && (
                    <td className="py-2 pr-3 tabular-nums">
                      {t("mp.readingOf", { done, total: dueDates.length })}
                      {streak >= 2 && <span className="ml-2 text-xs text-clay">{t("mp.streak", { n: streak })}</span>}
                    </td>
                  )}
                  <td className={`py-2 ${away !== null && away >= 7 ? "font-medium text-clay" : "text-ink-soft"}`}>
                    {awayText(away)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
