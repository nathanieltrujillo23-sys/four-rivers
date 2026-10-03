import type {
  CourseSnapshot,
  GivingEntry,
  IncomeStream,
  InvestmentEntry,
  JournalEntry,
  ModuleSection,
  Profile,
  RiverNumber,
  SavingsContribution,
  SavingsGoal,
} from "../types";

/**
 * Data-access contract. Per-row CRUD (never bulk save-all) so the backend only
 * ever writes what actually changed, and so every tracker entry is one durable
 * row. There is intentionally no "update running total" method anywhere —
 * totals are derived by the client from the rows returned by `loadAll`.
 */
export interface CourseRepository {
  loadAll(): Promise<CourseSnapshot>;

  ensureProfile(): Promise<Profile>;

  /** Idempotent: sets lesson_viewed_at once, on first view. */
  markLessonViewed(river: RiverNumber): Promise<void>;
  /** Sets or clears completed_at for a river. */
  setRiverCompletedAt(river: RiverNumber, completedAt: string | null): Promise<void>;
  /** Persists the resolved (already-merged) quiz_passed_at/quiz_best_score for a river. */
  setQuizResult(river: RiverNumber, passedAt: string | null, bestScore: number): Promise<void>;
  /**
   * Persists the resolved (already-merged) exam_passed_at/exam_best_score on
   * the profile. `verification` carries the fields needed to keep the public
   * `certificate_verifications` row in sync once the exam is passed.
   */
  setExamResult(
    passedAt: string | null,
    bestScore: number,
    verification: { displayName: string | null; completedAt: string | null }
  ): Promise<void>;

  /** Idempotent: records a module as viewed. Safe to call repeatedly. */
  markModuleViewed(section: ModuleSection, moduleIndex: number): Promise<void>;

  /** Opts into the 30-Day Challenge, returning the stamped start time. */
  startChallenge(): Promise<string>;
  /** Clears the challenge start date, so it can be started over. */
  resetChallenge(): Promise<void>;

  /**
   * Admin tool: wipes the signed-in user's course progress (rivers, modules
   * read, quiz/exam results and certificate record, challenge start) and tracker
   * entries so the course can be experienced from scratch. Journal entries are
   * left alone.
   */
  resetProgress(): Promise<void>;

  insertIncomeStream(s: IncomeStream): Promise<void>;
  deleteIncomeStream(id: string): Promise<void>;

  insertSavingsGoal(g: SavingsGoal): Promise<void>;
  deleteSavingsGoal(id: string): Promise<void>;
  insertSavingsContribution(c: SavingsContribution): Promise<void>;
  deleteSavingsContribution(id: string): Promise<void>;

  insertInvestmentEntry(e: InvestmentEntry): Promise<void>;
  deleteInvestmentEntry(id: string): Promise<void>;

  insertGivingEntry(e: GivingEntry): Promise<void>;
  deleteGivingEntry(id: string): Promise<void>;

  /**
   * Journal is loaded on its own (not part of `loadAll`) so the rest of the app
   * keeps working even if the journal table hasn't been migrated yet.
   */
  listJournalEntries(): Promise<JournalEntry[]>;
  insertJournalEntry(e: JournalEntry): Promise<void>;
  updateJournalEntry(e: JournalEntry): Promise<void>;
  deleteJournalEntry(id: string): Promise<void>;

  /**
   * Admin-editable content overrides, keyed by "<section>:<moduleIndex>".
   * Loaded on its own (like the journal) so a missing table never breaks the
   * course — absence just means every module uses its static default text.
   */
  listContentOverrides(): Promise<{ id: string; content: unknown }[]>;
  setContentOverride(id: string, content: unknown): Promise<void>;
  deleteContentOverride(id: string): Promise<void>;
}
