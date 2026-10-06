import { INTRODUCTION, LESSONS, type IntroductionContent } from "../content/lessons";
import type { RiverContent } from "../types";
import type { StringKey } from "../i18n/en";
import { entryCountForRiver, hasPassedRiverQuiz, isModuleViewed } from "./progress";
import type { CourseSnapshot, RiverNumber } from "../types";

export const CHALLENGE_LENGTH_DAYS = 30;
const PACE_DAYS = CHALLENGE_LENGTH_DAYS - 1; // everything but the exam fits in the first 29 days

export interface ChallengeItem {
  /** English text (used by tests and as the fallback); the page renders `labelKey` with `vars` instead. */
  label: string;
  labelKey: StringKey;
  vars: Record<string, string | number>;
  to: string;
  isDone: (snapshot: CourseSnapshot) => boolean;
}

export interface ChallengeDay {
  day: number;
  title: string;
  titleKey: StringKey;
  items: ChallengeItem[];
}

/** Every task in the course, in course order, before it's spread across days. */
export interface ChallengeContent {
  introduction: IntroductionContent;
  river: (n: RiverNumber) => RiverContent;
}

const ENGLISH: ChallengeContent = { introduction: INTRODUCTION, river: (n) => LESSONS[n] };

function flatItems(content: ChallengeContent): ChallengeItem[] {
  const items: ChallengeItem[] = [];

  content.introduction.lessons.forEach((lesson, i) => {
    items.push({
      label: `Introduction: ${lesson.title}`,
      labelKey: "challenge.item.intro",
      vars: { title: lesson.title },
      to: `/course/introduction/module/${i + 1}`,
      isDone: (s) => isModuleViewed(s, "introduction", i),
    });
  });

  for (const r of [1, 2, 3, 4] as RiverNumber[]) {
    const river = content.river(r);
    river.lessons.forEach((lesson, i) => {
      items.push({
        label: `River ${r}: ${lesson.title}`,
        labelKey: "challenge.item.module",
        vars: { r, title: lesson.title },
        to: `/course/river/${r}/module/${i + 1}`,
        isDone: (s) => isModuleViewed(s, r, i),
      });
    });
    items.push({
      label: `Log an entry in the River ${r} tracker`,
      labelKey: "challenge.item.tracker",
      vars: { r },
      to: `/course/river/${r}/module/${river.lessons.length}`,
      isDone: (s) => entryCountForRiver(s, r) > 0,
    });
    items.push({
      label: `Pass the River ${r} quiz`,
      labelKey: "challenge.item.quiz",
      vars: { r },
      to: `/course/river/${r}/quiz`,
      isDone: (s) => hasPassedRiverQuiz(s.progress, r),
    });
  }

  return items;
}

/**
 * A deterministic 30-day plan: every course task (read a module, log an
 * entry, pass a quiz) spread as evenly as possible across the first 29 days
 * in course order, with day 30 reserved for the final exam alone. Computed
 * once, not stored — the plan itself never changes, only which items are
 * already done (derived live from the snapshot).
 */
export function generateChallengePlan(content: ChallengeContent = ENGLISH): ChallengeDay[] {
  const items = flatItems(content);
  const days: ChallengeDay[] = Array.from({ length: PACE_DAYS }, (_, i) => ({
    day: i + 1,
    title: `Day ${i + 1}`,
    titleKey: "challenge.day",
    items: [],
  }));

  items.forEach((item, i) => {
    const dayIndex = Math.min(PACE_DAYS - 1, Math.floor((i * PACE_DAYS) / items.length));
    days[dayIndex].items.push(item);
  });

  days.push({
    day: CHALLENGE_LENGTH_DAYS,
    title: `Day ${CHALLENGE_LENGTH_DAYS}: Final Exam`,
    titleKey: "challenge.dayExam",
    items: [
      {
        label: "Take the 4 Rivers Final Exam",
        labelKey: "challenge.item.exam",
        vars: {},
        to: "/course/exam",
        isDone: (s) => !!s.profile.examPassedAt,
      },
    ],
  });

  return days;
}

/** Which day of the challenge "should" be current, by elapsed time — clamped
 * to the challenge's length. Being ahead or behind this doesn't lock
 * anything; it's just what the page highlights as "today". */
export function currentChallengeDay(startedAt: string): number {
  const hours = (Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60);
  const day = Math.floor(hours / 24) + 1;
  return Math.min(CHALLENGE_LENGTH_DAYS, Math.max(1, day));
}

export function isDayComplete(day: ChallengeDay, snapshot: CourseSnapshot): boolean {
  return day.items.every((item) => item.isDone(snapshot));
}

/** Calendar dates (YYYY-MM-DD, local time) on which the learner did
 * something in the course — the raw material for the streak count. */
export function activityDates(snapshot: CourseSnapshot): Set<string> {
  const dates = new Set<string>();
  const add = (iso: string | null | undefined) => {
    if (!iso) return;
    dates.add(new Date(iso).toLocaleDateString("en-CA")); // YYYY-MM-DD, local
  };
  for (const v of snapshot.moduleViews) add(v.viewedAt);
  for (const e of snapshot.incomeStreams) add(e.createdAt);
  for (const e of snapshot.savingsContributions) add(e.createdAt);
  for (const e of snapshot.investmentEntries) add(e.createdAt);
  for (const e of snapshot.givingEntries) add(e.createdAt);
  for (const p of snapshot.progress) add(p.quizPassedAt);
  add(snapshot.profile.examPassedAt);
  return dates;
}

export interface StreakInfo {
  /** Days of activity in the current run (forgiven days are not counted). */
  streak: number;
  /** Days inside the run that were forgiven by a grace day, newest first (YYYY-MM-DD). */
  forgiven: string[];
  /** True when a missed day would be forgiven right now (none was forgiven in the last 7 days). */
  graceReady: boolean;
}

/**
 * Consecutive days of activity ending today or yesterday (so the streak doesn't vanish mid-day before you've
 * done anything yet today). One missed day is forgiven as long as the day before it was active, and no other
 * day was forgiven within the previous 7 days, so a single slip does not erase a long run.
 */
export function streakInfo(dates: Set<string>, now: Date = new Date()): StreakInfo {
  const dayMs = 24 * 60 * 60 * 1000;
  const ymd = (d: Date) => d.toLocaleDateString("en-CA");
  const back = (i: number) => ymd(new Date(now.getTime() - i * dayMs));

  let streak = 0;
  const forgiven: string[] = [];
  let newestForgivenAgo: number | null = null;
  let lastForgiven = -Infinity;
  // Today is still open, so it only counts if something was already done.
  for (let i = dates.has(back(0)) ? 0 : 1; i < 4000; i++) {
    if (dates.has(back(i))) {
      streak += 1;
      continue;
    }
    if (dates.has(back(i + 1)) && i - lastForgiven >= 7) {
      lastForgiven = i;
      newestForgivenAgo ??= i;
      forgiven.push(back(i));
      continue;
    }
    break;
  }
  return { streak, forgiven, graceReady: newestForgivenAgo === null || newestForgivenAgo >= 7 };
}

export function currentStreak(dates: Set<string>): number {
  return streakInfo(dates).streak;
}
