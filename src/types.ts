/** Shared domain types for 4 Rivers. */

import type { RiverNumber } from "./theme/theme";

export type { RiverNumber };

/** v1 role model — Guest is "not signed in", so it never appears on a row. */
export type Role = "free" | "admin";

export interface Profile {
  userId: string;
  role: Role;
  displayName: string | null;
  /** Set once the 50-question final exam is passed (>= 35/50). The
   * certificate stays locked until then. */
  examPassedAt: string | null;
  examBestScore: number | null;
  /** Set when the learner opts into the 30-Day Challenge; null if never started. */
  challengeStartedAt: string | null;
}

/* ------------------------------------------------------------------ *
 * Course progress
 * ------------------------------------------------------------------ */

export type RiverStatus = "not_started" | "in_progress" | "complete";

/**
 * One row per (user, river). The facts stored:
 *   - lessonViewedAt: set the first time the lesson content is opened
 *   - completedAt:    set once BOTH conditions are met (lesson viewed AND
 *                     at least one tracker entry logged for that river)
 *   - quizPassedAt:   set the first time the river's quiz is passed (>= 7/10)
 *   - quizBestScore:  the best score achieved so far (0-10), kept even if a
 *                     later retake scores lower
 * `status` is always DERIVED from these plus the ledger entry count — never
 * stored as an independent value that could drift. See `deriveRiverStatus`
 * in state/progress.ts. Unlocking the NEXT river requires completedAt AND
 * quizPassedAt on this one (see `isRiverUnlocked`); quizPassedAt doesn't
 * change what "complete" itself means, so existing completions and the
 * dashboard's "X of 4 complete" count are unaffected by it.
 */
export interface CourseProgress {
  riverNumber: RiverNumber;
  lessonViewedAt: string | null;
  completedAt: string | null;
  quizPassedAt: string | null;
  quizBestScore: number | null;
}

/* ------------------------------------------------------------------ *
 * Ledger tables — every tracker entry is a real, immutable-ish row.
 * Summary numbers are ALWAYS computed by summing these, never stored.
 * ------------------------------------------------------------------ */

export type IncomeCadence = "one_time" | "weekly" | "biweekly" | "monthly" | "quarterly" | "annually";

/** River 1 — a distinct source of income. */
export interface IncomeStream {
  id: string;
  name: string;
  category: string;
  amount: number;
  cadence: IncomeCadence;
  notes: string | null;
  createdAt: string;
}

/** River 2 — a savings goal (target only; balance is summed from contributions). */
export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  createdAt: string;
}

/** River 2 — one contribution toward a goal. */
export interface SavingsContribution {
  id: string;
  goalId: string;
  amount: number;
  notes: string | null;
  createdAt: string;
}

/** River 3 — one logged investment contribution (not a valuation). */
export interface InvestmentEntry {
  id: string;
  name: string;
  contributionAmount: number;
  notes: string | null;
  createdAt: string;
}

/** River 4 — one gift given. */
export interface GivingEntry {
  id: string;
  recipient: string;
  amount: number;
  notes: string | null;
  createdAt: string;
}

/** Financial-journey journal — one row per entry. */
export interface JournalEntry {
  id: string;
  title: string | null;
  body: string;
  /** Calendar date the entry is about (YYYY-MM-DD); lets people backfill milestones. */
  entryDate: string;
  /** Optional link to one of the four rivers; null = general. */
  riverNumber: RiverNumber | null;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ *
 * Lesson content (data, not prose baked into components)
 * ------------------------------------------------------------------ */

/** The only Bible versions 4 Rivers quotes. Do not add others without approval. */
export type Translation = "KJV" | "NIV" | "NLT" | "ESV";

export interface ScriptureRef {
  reference: string;
  text: string;
  translation: Translation;
}

/**
 * One lesson: a single screen of teaching with its own title, body
 * paragraphs, and supporting scripture. A river is a sequence of these.
 */
export interface Lesson {
  title: string;
  body: string[];
  /** Scripture supporting THIS lesson's points. Every lesson must have some. */
  scriptureRefs: ScriptureRef[];
}

/** All the content for one river: an overview plus its sequence of lessons. */
export interface RiverContent {
  riverNumber: RiverNumber;
  title: string;
  intro: string;
  /** Scripture supporting the opening framing. */
  introScripture: ScriptureRef[];
  lessons: Lesson[];
  /** Prompt shown next to the companion tracker. */
  practicePrompt: string;
  /** Scripture supporting the practice / tracker step. */
  practiceScripture: ScriptureRef[];
}

/* ------------------------------------------------------------------ *
 * Full snapshot loaded per user
 * ------------------------------------------------------------------ */

/** A section whose module-read progress is tracked: one of the four rivers,
 * or the introduction (which isn't a river but has its own module list). */
export type ModuleSection = RiverNumber | "introduction";

/** One row per module a learner has opened — server-backed so "modules read"
 * survives a new browser/device instead of resetting (see module_views). */
export interface ModuleView {
  section: ModuleSection;
  moduleIndex: number;
  /** When this module was marked read — used to derive the challenge streak. */
  viewedAt: string;
}

export interface CourseSnapshot {
  profile: Profile;
  progress: CourseProgress[];
  incomeStreams: IncomeStream[];
  savingsGoals: SavingsGoal[];
  savingsContributions: SavingsContribution[];
  investmentEntries: InvestmentEntry[];
  givingEntries: GivingEntry[];
  moduleViews: ModuleView[];
}
