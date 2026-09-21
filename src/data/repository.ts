import type {
  CourseSnapshot,
  GivingEntry,
  IncomeStream,
  InvestmentEntry,
  JournalEntry,
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
}
