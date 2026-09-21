import type { Lesson } from "../../types";
import type { RiverTheme } from "../../theme/theme";
import { useLessonReader } from "../../state/useLessonReader";
import { LessonReader } from "./LessonReader";
import { LessonPanel } from "./LessonPanel";

/** The lesson text plus its read-aloud player, sharing one reader state. */
export function RiverLesson({ lesson, river }: { lesson: Lesson; river: RiverTheme }) {
  const reader = useLessonReader(lesson);
  return (
    <div className="flex flex-col gap-6">
      <LessonReader reader={reader} lesson={lesson} />
      <LessonPanel lesson={lesson} river={river} activeKey={reader.activeKey} />
    </div>
  );
}
