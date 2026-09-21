/** Shared domain types for 4 Rivers. */

import type { RiverNumber } from "./theme/theme";

export type { RiverNumber };

/** v1 role model — Guest is "not signed in", so it never appears on a row. */
export type Role = "free" | "admin";

export interface Profile {
  userId: string;
  role: Role;
  displayName: string | null;
}

/* ------------------------------------------------------------------ *
 * Course progress
 * ------------------------------------------------------------------ */

export type RiverStatus = "not_started" | "in_progress" | "complete";

/**
 * One row per (user, river). Only two facts are stored:
 *   - lessonViewedAt: set the first time the lesson content is opened
 *   - completedAt:    set once BOTH conditions are met (lesson viewed AND
 *                     at least one tracker entry logged for that river)
 * `status` is always DERIVED from those two plus the ledger entry count —
 * never stored as an independent value that could drift. See
 * `deriveRiverStatus` in state/progress.ts.
 */
export interface CourseProgress {
  riverNumber: RiverNumber;
  lessonViewedAt: string | null;
  completedAt: string | null;
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

export interface LessonSection {
  heading: string;
  body: string[];
  /** Scripture supporting THIS section's points. Every section must have some. */
  scriptureRefs: ScriptureRef[];
}

export interface Lesson {
  riverNumber: RiverNumber;
  title: string;
  intro: string;
  /** Scripture supporting the opening framing. */
  introScripture: ScriptureRef[];
  sections: LessonSection[];
  /** Prompt shown next to the companion tracker. */
  practicePrompt: string;
  /** Scripture supporting the practice / tracker step. */
  practiceScripture: ScriptureRef[];
}

/* ------------------------------------------------------------------ *
 * Full snapshot loaded per user
 * ------------------------------------------------------------------ */

export interface CourseSnapshot {
  profile: Profile;
  progress: CourseProgress[];
  incomeStreams: IncomeStream[];
  savingsGoals: SavingsGoal[];
  savingsContributions: SavingsContribution[];
  investmentEntries: InvestmentEntry[];
  givingEntries: GivingEntry[];
}
