import { Link } from "react-router-dom";

/**
 * The lesson rail (Update 39): one short segment per lesson in a river (or the introduction), filled with the river's
 * color once read, with the current lesson marked. Each segment links to its lesson. It replaces the plain progress
 * bar at the top of a lesson, and says the same thing in text for screen readers.
 */
export function LessonRail({
  count,
  current,
  isRead,
  hrefFor,
  titleFor,
  accent,
  label,
}: {
  count: number;
  current: number;
  isRead: (i: number) => boolean;
  hrefFor: (i: number) => string;
  titleFor: (i: number) => string;
  accent: string;
  /** e.g. "3 of 7 read" */
  label: string;
}) {
  return (
    <nav aria-label={label} className="flex flex-col gap-1.5">
      <ol className="flex gap-1.5">
        {Array.from({ length: count }, (_, i) => {
          const read = isRead(i);
          const here = i === current;
          return (
            <li key={i} className="min-w-0 flex-1">
              <Link
                to={hrefFor(i)}
                aria-current={here ? "page" : undefined}
                title={titleFor(i)}
                className="group block py-2"
              >
                <span className="sr-only">
                  {i + 1}. {titleFor(i)}
                </span>
                <span
                  aria-hidden="true"
                  className={`block rounded-full transition-all duration-300 group-hover:opacity-80 ${here ? "h-[5px]" : "h-[3px]"}`}
                  style={{
                    backgroundColor: read ? accent : "var(--color-line)",
                    boxShadow: here ? `0 0 0 2px var(--color-surface), 0 0 0 3px ${accent}` : undefined,
                  }}
                />
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
