import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOptionalCourse } from "../../state/CourseContext";
import { deriveRiverStatus, isCourseComplete } from "../../state/progress";
import { RIVERS } from "../../theme/theme";
import { PRINCIPLE_SCRIPTURE } from "../../content/scripture";
import type { RiverNumber } from "../../types";
import { CelebrationModal } from "./CelebrationModal";

const RIVER_ICON: Record<RiverNumber, string> = {
  1: "🌱",
  2: "💧",
  3: "🌳",
  4: "🤲",
};

function seenKey(kind: "rivers" | "course"): string {
  return `four-rivers:celebrated:${kind}`;
}
function loadSeen(kind: "rivers" | "course"): Set<string> {
  try {
    const raw = localStorage.getItem(seenKey(kind));
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}
function saveSeen(kind: "rivers" | "course", seen: Set<string>) {
  try {
    localStorage.setItem(seenKey(kind), JSON.stringify([...seen]));
  } catch {
    /* storage unavailable — the celebration just might replay next visit */
  }
}

type Celebration = { kind: "river"; river: RiverNumber } | { kind: "course" };

/**
 * Watches course progress for the moment a river — or the whole course —
 * first becomes complete, and shows a one-time celebratory modal for it.
 * Backed by localStorage (per-browser, same pattern as useModuleProgress),
 * so a refresh never replays it. On first mount, anything already complete
 * is treated as already celebrated rather than firing retroactively — this
 * shipped after real progress already existed, and shouldn't surprise
 * returning users with a popup for something they finished long ago.
 */
export function CelebrationWatcher() {
  const snapshot = useOptionalCourse()?.snapshot ?? null;
  const navigate = useNavigate();
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const seenRivers = useRef<Set<string> | null>(null);
  const seenCourse = useRef<Set<string> | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!snapshot) return;
    seenRivers.current ??= loadSeen("rivers");
    seenCourse.current ??= loadSeen("course");
    const rivers = seenRivers.current;
    const courseSeen = seenCourse.current;

    if (!initialized.current) {
      let changed = false;
      for (const r of [1, 2, 3, 4] as RiverNumber[]) {
        if (deriveRiverStatus(snapshot, r) === "complete" && !rivers.has(String(r))) {
          rivers.add(String(r));
          changed = true;
        }
      }
      if (isCourseComplete(snapshot) && !courseSeen.has("done")) {
        courseSeen.add("done");
        changed = true;
      }
      if (changed) {
        saveSeen("rivers", rivers);
        saveSeen("course", courseSeen);
      }
      initialized.current = true;
      return;
    }

    if (isCourseComplete(snapshot) && !courseSeen.has("done")) {
      courseSeen.add("done");
      for (const r of [1, 2, 3, 4] as RiverNumber[]) rivers.add(String(r));
      saveSeen("course", courseSeen);
      saveSeen("rivers", rivers);
      setCelebration({ kind: "course" });
      return;
    }

    for (const r of [1, 2, 3, 4] as RiverNumber[]) {
      if (deriveRiverStatus(snapshot, r) === "complete" && !rivers.has(String(r))) {
        rivers.add(String(r));
        saveSeen("rivers", rivers);
        setCelebration({ kind: "river", river: r });
        break;
      }
    }
  }, [snapshot]);

  if (!celebration) return null;

  if (celebration.kind === "course") {
    return (
      <CelebrationModal
        open
        onClose={() => setCelebration(null)}
        accent="#c9a24b"
        icon="🎉"
        eyebrow="Course complete"
        title="All four rivers flowed"
        message="You've worked through income, saving, investing, and giving — and put each one into practice. That's the whole course."
        confetti
        actionLabel="Open your dashboard"
        onAction={() => {
          setCelebration(null);
          navigate("/dashboard");
        }}
      />
    );
  }

  const river = RIVERS.find((r) => r.number === celebration.river)!;
  const next = RIVERS.find((r) => r.number === celebration.river + 1);
  return (
    <CelebrationModal
      open
      onClose={() => setCelebration(null)}
      accent={river.accent}
      icon={RIVER_ICON[celebration.river]}
      eyebrow="River complete"
      title={`${river.title}, complete`}
      message={river.principle}
      verse={PRINCIPLE_SCRIPTURE[celebration.river]}
      actionLabel={next ? `Start River ${next.number}: ${next.title}` : "Open your dashboard"}
      onAction={() => {
        setCelebration(null);
        navigate(next ? `/course/river/${next.number}` : "/dashboard");
      }}
    />
  );
}
