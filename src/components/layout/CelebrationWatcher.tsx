import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useOptionalCourse } from "../../state/CourseContext";
import { deriveRiverStatus, hasPassedRiverQuiz, isCourseComplete } from "../../state/progress";
import type { CourseSnapshot } from "../../types";
import { RIVERS } from "../../theme/theme";
import { PRINCIPLE_SCRIPTURE } from "../../content/scripture";
import type { RiverNumber } from "../../types";
import { CelebrationModal } from "./CelebrationModal";
import { useLang } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";
import { BrandMark } from "../ui/BrandMark";
import { DropletIcon, GiftIcon, SproutIcon, TreeIcon } from "../ui/RiverIcons";

const RIVER_ICON: Record<RiverNumber, (color: string) => ReactNode> = {
  1: (color) => <SproutIcon color={color} size={30} />,
  2: (color) => <DropletIcon color={color} size={30} />,
  3: (color) => <TreeIcon color={color} size={30} />,
  4: (color) => <GiftIcon color={color} size={30} />,
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
 * A river is "celebration-ready" once there's nothing left to do on it: the
 * lesson+tracker ledger condition, plus (for rivers 1-3, which actually gate
 * a next river) a passed quiz. River 4 has nothing after it to gate, so its
 * celebration still fires right on the ledger condition alone.
 */
function riverCelebrationReady(snapshot: CourseSnapshot, river: RiverNumber): boolean {
  if (deriveRiverStatus(snapshot, river) !== "complete") return false;
  return river === 4 || hasPassedRiverQuiz(snapshot.progress, river);
}

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
  const { t } = useLang();
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
        if (riverCelebrationReady(snapshot, r) && !rivers.has(String(r))) {
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
      if (riverCelebrationReady(snapshot, r) && !rivers.has(String(r))) {
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
        icon={<BrandMark size={32} />}
        eyebrow={t("celebrate.courseEyebrow")}
        title={t("celebrate.courseTitle")}
        message={t("celebrate.courseMessage")}
        confetti
        actionLabel={t("celebrate.viewCert")}
        onAction={() => {
          setCelebration(null);
          navigate("/certificate");
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
      icon={RIVER_ICON[celebration.river](river.accent)}
      eyebrow={t("celebrate.riverEyebrow")}
      title={t("celebrate.riverTitle", { title: t(`river.${river.number}.title` as StringKey) })}
      message={t(`river.${river.number}.principle` as StringKey)}
      verse={PRINCIPLE_SCRIPTURE[celebration.river]}
      actionLabel={
        next
          ? t("celebrate.startNext", { n: next.number, title: t(`river.${next.number}.title` as StringKey) })
          : t("celebrate.openDash")
      }
      onAction={() => {
        setCelebration(null);
        navigate(next ? `/course/river/${next.number}` : "/dashboard");
      }}
    />
  );
}
