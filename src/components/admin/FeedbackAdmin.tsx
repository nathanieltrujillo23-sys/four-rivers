import { useEffect, useMemo, useState } from "react";
import { useCourse } from "../../state/CourseContext";
import { useContent } from "../../state/ContentContext";
import type { LessonFeedback, ModuleSection } from "../../types";
import { Card, CardBody } from "../ui/Card";
import { PageSkeleton } from "../ui/Skeleton";

/** What learners said about each lesson (no names), so the weakest lessons are easy to spot. */
export function FeedbackAdmin() {
  const { repository } = useCourse();
  const { getIntroduction, getRiver } = useContent();
  const [rows, setRows] = useState<LessonFeedback[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    repository
      .listLessonFeedback()
      .then((r) => alive && setRows(r))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [repository]);

  const titleOf = (section: ModuleSection, i: number): string => {
    const lessons = section === "introduction" ? getIntroduction().lessons : getRiver(section).lessons;
    const label = section === "introduction" ? "Introduction" : `River ${section}`;
    return `${label}, lesson ${i + 1}: ${lessons[i]?.title ?? ""}`;
  };

  const byLesson = useMemo(() => {
    const map = new Map<string, { section: ModuleSection; moduleIndex: number; yes: number; no: number }>();
    for (const r of rows ?? []) {
      const key = `${r.section}:${r.moduleIndex}`;
      const row = map.get(key) ?? { section: r.section, moduleIndex: r.moduleIndex, yes: 0, no: 0 };
      if (r.helpful) row.yes += 1;
      else row.no += 1;
      map.set(key, row);
    }
    // Lessons with the most "not really" answers first.
    return [...map.values()].sort((a, b) => b.no - a.no || b.yes + b.no - (a.yes + a.no));
  }, [rows]);

  if (error) {
    return (
      <p className="font-[family-name:var(--font-ui)] text-sm text-red-700" role="alert">
        Couldn't load feedback. Run supabase/migrations/20261005000200_lesson_feedback.sql if you haven't yet.
      </p>
    );
  }
  if (!rows) return <PageSkeleton cards={2} />;
  if (rows.length === 0) {
    return (
      <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
        No feedback yet. Learners see a "Did this lesson help you personally?" box at the end of every lesson.
      </p>
    );
  }

  const notes = rows.filter((r) => r.note);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardBody>
          <h2 className="t-h4">By lesson</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse font-[family-name:var(--font-ui)] text-sm">
              <caption className="sr-only">Lesson feedback counts</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Lesson
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Helped
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Not really
                  </th>
                </tr>
              </thead>
              <tbody>
                {byLesson.map((r) => (
                  <tr key={`${r.section}:${r.moduleIndex}`} className="border-b border-line/60">
                    <th scope="row" className="py-2 pr-3 text-left font-normal text-ink">
                      {titleOf(r.section, r.moduleIndex)}
                    </th>
                    <td className="px-3 py-2 text-right tabular-nums text-olive">{r.yes}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-clay">{r.no}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="t-h4">Notes</h2>
          {notes.length === 0 ? (
            <p className="mt-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              No written notes yet.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {notes.map((r, i) => (
                <li
                  key={i}
                  className="rounded-lg bg-parchment-deep/40 px-3 py-2 font-[family-name:var(--font-ui)] text-sm"
                >
                  <p className="text-xs text-ink-soft">
                    {titleOf(r.section, r.moduleIndex)} · {r.helpful ? "helped" : "didn't help"}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-ink">{r.note}</p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
