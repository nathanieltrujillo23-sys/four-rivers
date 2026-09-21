/**
 * Lesson content for the four rivers — one file per river in this folder.
 *
 * Every point carries scripture: the intro, each section, and the practice step
 * all have verses (KJV, NIV, NLT, ESV only; see content/scripture.ts). Each
 * lesson is sized to about 15 minutes of reading (see `lessonReadingMinutes`),
 * about an hour for the whole course.
 *
 * Compliance note (carried from prior builds): this content is educational and
 * principle-based. It must not become personalized financial or investment
 * advice, and must not promise returns. If it ever approaches that line, it
 * needs the same legal review flag as the other platform's Portfolio module.
 */

import type { Lesson, ScriptureRef } from "../../types";
import { VERSE } from "../scripture";
import { river1 } from "./river1";
import { river2 } from "./river2";
import { river3 } from "./river3";
import { river4 } from "./river4";

export const LESSONS: Record<1 | 2 | 3 | 4, Lesson> = {
  1: river1,
  2: river2,
  3: river3,
  4: river4,
};

/** Every verse a lesson carries, in reading order, de-duplicated by reference + version. */
export function allLessonScripture(lesson: Lesson): ScriptureRef[] {
  const seen = new Set<string>();
  const out: ScriptureRef[] = [];
  const all = [
    ...lesson.introScripture,
    ...lesson.sections.flatMap((s) => s.scriptureRefs),
    ...lesson.practiceScripture,
  ];
  for (const ref of all) {
    const key = `${ref.reference}|${ref.translation}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(ref);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Reading time
 * ------------------------------------------------------------------ */

/** Average adult silent-reading speed, used for the "≈ N min" estimates. */
export const WORDS_PER_MINUTE = 225;

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Everything a reader (or the read-aloud voice) encounters in a lesson. */
export function lessonWordCount(lesson: Lesson): number {
  const verse = (v: ScriptureRef) => words(v.text) + words(v.reference) + 1;
  let total = words(lesson.title) + words(lesson.intro);
  total += lesson.introScripture.reduce((n, v) => n + verse(v), 0);
  for (const s of lesson.sections) {
    total += words(s.heading);
    total += s.body.reduce((n, p) => n + words(p), 0);
    total += s.scriptureRefs.reduce((n, v) => n + verse(v), 0);
  }
  total += lesson.practiceScripture.reduce((n, v) => n + verse(v), 0);
  return total;
}

export function lessonReadingMinutes(lesson: Lesson): number {
  return Math.max(1, Math.round(lessonWordCount(lesson) / WORDS_PER_MINUTE));
}

export function courseReadingMinutes(): number {
  return ([1, 2, 3, 4] as const).reduce(
    (sum, n) => sum + lessonReadingMinutes(LESSONS[n]),
    0
  );
}

/** Closing reflection shown on the completion dashboard. Every point is backed by scripture. */
export const CLOSING_REFLECTION = {
  scripture: VERSE.gen2_10_esv,
  body: [
    {
      text: "One source, four streams. In the first river you learned to see where provision comes from and to widen the channels through which it reaches you. In the second you learned to hold some of it back, on purpose, for the hard season and for the people who depend on you. In the third you learned to put it to patient, prepared, honest work. And in the fourth you learned to let it flow back out to others. None of these rivers is the whole picture, and none of them makes sense alone. Together they describe what it looks like to manage a supply that was never yours to begin with.",
      scriptureRefs: [VERSE.ps24_1_kjv],
    },
    {
      text: "The trackers in your dashboard are yours to keep using, and the journal is there to record the story as it unfolds. Stewardship is a practice, not a course you finish. You will have seasons of abundance and seasons of lack, seasons of clear direction and seasons of confusion. What Scripture asks of you in all of them is the same thing: faithfulness in small matters, week after week, and a heart that stays open toward God and toward other people.",
      scriptureRefs: [VERSE.cor4_2_kjv, VERSE.gal6_9_kjv],
    },
    {
      text: "Someday, the hope is that you will hear what the good servant hears in the parable, not because of how much you had, but because of how you handled what you were given. Keep going. Keep counting. Keep saving, keep investing patiently, and keep giving. The river is still running.",
      scriptureRefs: [VERSE.matt25_21_kjv],
    },
  ],
};
