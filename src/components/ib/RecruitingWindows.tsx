import { useEffect, useState } from "react";
import { useCourse } from "../../state/CourseContext";
import { Button } from "../ui/Button";
import { Empty, Panel } from "../wealth/parts";
import type { RecruitingWindow, ToolTrack } from "../../types";

const DAY = 86_400_000;
const days = (iso: string) => Math.floor((Date.now() - new Date(`${iso}T12:00:00`).getTime()) / DAY);
const fmt = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "not stated");

/** The application windows an admin entered for this tool, each with the day it was last checked. Never a substitute for the firm's own page. */
export function RecruitingWindows({ track, onAdd, tracked }: { track: ToolTrack; onAdd: (w: RecruitingWindow) => void; tracked: string[] }) {
  const { repository } = useCourse();
  const [list, setList] = useState<RecruitingWindow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let off = false;
    repository
      .listRecruitingWindows(track)
      .then((r) => !off && setList(r))
      .catch((e: unknown) => !off && (setError(e instanceof Error ? e.message : String(e)), setList([])));
    return () => {
      off = true;
    };
  }, [repository, track]);
  return (
    <Panel title="Application dates from your admin" subtitle="Windows an admin collected from each firm's own careers page. Each shows the day it was checked: dates change, so always confirm on the firm's page before you rely on one.">
      {!list ? (
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading…</p>
      ) : list.length === 0 ? (
        <Empty>{error ? "Dates could not be loaded right now." : "No dates have been added yet."}</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((w) => {
            const age = days(w.checkedOn);
            const stale = age > 14;
            const left = w.closes ? -days(w.closes) : null;
            return (
              <li key={w.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line p-3">
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
                    {w.firm}
                    {w.role && <span className="font-normal text-ink-soft"> · {w.role}</span>}
                  </p>
                  <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                    Opens {fmt(w.opens)} · closes {fmt(w.closes)}
                    {left != null && left >= 0 && <span className={left <= 14 ? " font-medium text-clay-text" : ""}> ({left} day{left === 1 ? "" : "s"} left)</span>}
                    {left != null && left < 0 && " (closed)"}
                  </p>
                  <p className={`font-[family-name:var(--font-ui)] text-xs ${stale ? "text-clay-text" : "text-ink-soft"}`}>
                    Checked {fmt(w.checkedOn)} ({age <= 0 ? "today" : `${age} day${age === 1 ? "" : "s"} ago`}){stale ? ": check the firm's page again" : ""}
                  </p>
                  {w.notes && <p className="font-[family-name:var(--font-ui)] text-xs text-ink">{w.notes}</p>}
                  {w.url && (
                    <a href={w.url} target="_blank" rel="noreferrer" className="font-[family-name:var(--font-ui)] text-xs text-water-deep underline underline-offset-2">
                      The firm's careers page
                    </a>
                  )}
                </div>
                <Button variant="secondary" disabled={tracked.includes(w.firm.toLowerCase())} onClick={() => onAdd(w)} aria-label={`Add ${w.firm} to my tracker`}>
                  {tracked.includes(w.firm.toLowerCase()) ? "In my tracker" : "Add to my tracker"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
