import { Navigate } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { canManageContent, viewerFromRole } from "../../lib/access";
import { LESSONS, allLessonScripture } from "../../content/lessons";
import { RIVERS } from "../../theme/theme";
import { Card, CardBody } from "../ui/Card";

/**
 * v1 admin surface. Lesson content currently ships as static data
 * (src/content/lessons.ts). This page is a read-only inspector plus the
 * seam where an editing UI will go once the `lessons` table is enabled
 * (see supabase/schema.sql). Access is gated by role === 'admin'.
 */
export function AdminPage() {
  const { snapshot, loading } = useCourse();
  if (loading && !snapshot)
    return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading…</p>;
  if (!snapshot) return null;

  const viewer = viewerFromRole(snapshot.profile.role);
  if (!canManageContent(viewer)) return <Navigate to="/course" replace />;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-ink">Content administration</h1>
        <p className="mt-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          Lesson content is currently defined in <code>src/content/lessons.ts</code>. In-app editing
          arrives when the <code>lessons</code> table is enabled. Below is the content as it will
          render to learners.
        </p>
      </header>

      {RIVERS.map((r) => {
        const lesson = LESSONS[r.number];
        return (
          <Card key={r.number} accent={r.accent}>
            <CardBody className="flex flex-col gap-3">
              <div>
                <span className="font-[family-name:var(--font-ui)] text-xs font-semibold" style={{ color: r.accent }}>
                  River {r.number}
                </span>
                <h2 className="text-xl font-semibold text-ink">{lesson.title}</h2>
              </div>
              <p className="text-sm text-ink-soft">{lesson.intro}</p>
              {(() => {
                const verses = allLessonScripture(lesson);
                const unsupported = lesson.sections.filter((sec) => sec.scriptureRefs.length === 0);
                return (
                  <>
                    <div className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                      {lesson.sections.length} section{lesson.sections.length === 1 ? "" : "s"} ·{" "}
                      {verses.length} verse{verses.length === 1 ? "" : "s"}
                      {unsupported.length > 0 && (
                        <span className="ml-2 font-semibold text-red-700">
                          ⚠ {unsupported.length} section{unsupported.length === 1 ? "" : "s"} without
                          scripture
                        </span>
                      )}
                    </div>
                    <ul className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                      {verses.map((s) => (
                        <li key={`${s.reference}|${s.translation}`}>
                          • {s.reference} ({s.translation})
                        </li>
                      ))}
                    </ul>
                  </>
                );
              })()}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
