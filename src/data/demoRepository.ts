import type {
  CourseProgress,
  CourseSnapshot,
  GivingEntry,
  IncomeStream,
  InvestmentEntry,
  JournalEntry,
  ModuleSection,
  RiverNumber,
  SavingsContribution,
  SavingsGoal,
} from "../types";
import { LESSONS } from "../content/lessons";
import { uid } from "../utils/id";
import type { CourseRepository } from "./repository";

/** Which later-in-the-course states the sample account should already be in. */
export interface DemoSeed {
  examPassed?: boolean;
  challengeStarted?: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();

/**
 * A throwaway, in-memory stand-in for the real repository, powering the
 * home page's guided tour. It's a sample learner who has finished all four
 * rivers (every module read, every quiz passed, a few tracker entries) but
 * not yet taken the final exam — so every real page, including the exam,
 * certificate, and challenge, can be shown with realistic data. Nothing is
 * ever sent to Supabase or saved; it vanishes when the tour ends.
 */
export function createDemoRepository(seed: DemoSeed = {}): CourseRepository {
  const rivers: RiverNumber[] = [1, 2, 3, 4];

  const progress: CourseProgress[] = rivers.map((r) => ({
    riverNumber: r,
    lessonViewedAt: daysAgo(9 - 2 * r + 1),
    completedAt: daysAgo(9 - 2 * r),
    quizPassedAt: daysAgo(9 - 2 * r),
    quizBestScore: 9,
  }));

  // Module reads spread over the past week, one or more each day, so the
  // challenge page shows a believable streak.
  const totalModules = rivers.reduce((n, r) => n + LESSONS[r].lessons.length, 0);
  let k = 0;
  const moduleViews: CourseSnapshot["moduleViews"] = rivers.flatMap((r) =>
    LESSONS[r].lessons.map((_, i) => ({
      section: r as ModuleSection,
      moduleIndex: i,
      viewedAt: daysAgo(7 - Math.floor((k++ * 7) / totalModules)),
    }))
  );

  const goal: SavingsGoal = { id: uid(), name: "Emergency fund", targetAmount: 5000, createdAt: daysAgo(5) };

  const state: CourseSnapshot = {
    profile: {
      userId: "00000000-0000-0000-0000-000000000000",
      role: "free",
      displayName: "Alex Morgan",
      examPassedAt: seed.examPassed ? new Date().toISOString() : null,
      examBestScore: seed.examPassed ? 46 : null,
      challengeStartedAt: seed.challengeStarted ? new Date().toISOString() : null,
    },
    progress,
    incomeStreams: [
      { id: uid(), name: "Day job", category: "Employment", amount: 3200, cadence: "monthly", notes: null, createdAt: daysAgo(7) },
      { id: uid(), name: "Freelance design", category: "Business", amount: 600, cadence: "monthly", notes: null, createdAt: daysAgo(6) },
    ],
    savingsGoals: [goal],
    savingsContributions: [
      { id: uid(), goalId: goal.id, amount: 250, notes: null, createdAt: daysAgo(5) },
      { id: uid(), goalId: goal.id, amount: 250, notes: null, createdAt: daysAgo(2) },
    ],
    investmentEntries: [
      { id: uid(), name: "Index fund", contributionAmount: 150, notes: null, createdAt: daysAgo(3) },
    ],
    givingEntries: [
      { id: uid(), recipient: "Local church", amount: 200, notes: null, createdAt: daysAgo(1) },
    ],
    moduleViews,
  };

  let journal: JournalEntry[] = [];
  const overrides = new Map<string, unknown>();

  const ensureRow = (river: RiverNumber): CourseProgress => {
    let row = state.progress.find((p) => p.riverNumber === river);
    if (!row) {
      row = { riverNumber: river, lessonViewedAt: null, completedAt: null, quizPassedAt: null, quizBestScore: null };
      state.progress.push(row);
    }
    return row;
  };

  return {
    async loadAll() {
      return structuredClone(state);
    },
    async ensureProfile() {
      return { ...state.profile };
    },

    async markLessonViewed(river) {
      const row = ensureRow(river);
      row.lessonViewedAt ??= new Date().toISOString();
    },
    async setRiverCompletedAt(river, completedAt) {
      ensureRow(river).completedAt = completedAt;
    },
    async setQuizResult(river, passedAt, bestScore) {
      const row = ensureRow(river);
      row.quizPassedAt = passedAt;
      row.quizBestScore = bestScore;
    },
    async setExamResult(passedAt, bestScore) {
      state.profile.examPassedAt = passedAt;
      state.profile.examBestScore = bestScore;
    },
    async markModuleViewed(section, moduleIndex) {
      if (!state.moduleViews.some((v) => v.section === section && v.moduleIndex === moduleIndex)) {
        state.moduleViews.push({ section, moduleIndex, viewedAt: new Date().toISOString() });
      }
    },
    async startChallenge() {
      const now = new Date().toISOString();
      state.profile.challengeStartedAt = now;
      return now;
    },
    async resetProgress() {
      state.progress = [];
      state.moduleViews = [];
      state.incomeStreams = [];
      state.savingsGoals = [];
      state.savingsContributions = [];
      state.investmentEntries = [];
      state.givingEntries = [];
      state.profile.examPassedAt = null;
      state.profile.examBestScore = null;
      state.profile.challengeStartedAt = null;
    },
    async resetChallenge() {
      state.profile.challengeStartedAt = null;
    },

    async insertIncomeStream(s: IncomeStream) {
      state.incomeStreams.unshift(s);
    },
    async deleteIncomeStream(id) {
      state.incomeStreams = state.incomeStreams.filter((s) => s.id !== id);
    },
    async insertSavingsGoal(g: SavingsGoal) {
      state.savingsGoals.unshift(g);
    },
    async deleteSavingsGoal(id) {
      state.savingsGoals = state.savingsGoals.filter((g) => g.id !== id);
      state.savingsContributions = state.savingsContributions.filter((c) => c.goalId !== id);
    },
    async insertSavingsContribution(c: SavingsContribution) {
      state.savingsContributions.unshift(c);
    },
    async deleteSavingsContribution(id) {
      state.savingsContributions = state.savingsContributions.filter((c) => c.id !== id);
    },
    async insertInvestmentEntry(e: InvestmentEntry) {
      state.investmentEntries.unshift(e);
    },
    async deleteInvestmentEntry(id) {
      state.investmentEntries = state.investmentEntries.filter((e) => e.id !== id);
    },
    async insertGivingEntry(e: GivingEntry) {
      state.givingEntries.unshift(e);
    },
    async deleteGivingEntry(id) {
      state.givingEntries = state.givingEntries.filter((e) => e.id !== id);
    },

    async listJournalEntries() {
      return [...journal];
    },
    async insertJournalEntry(e) {
      journal = [e, ...journal];
    },
    async updateJournalEntry(e) {
      journal = journal.map((j) => (j.id === e.id ? e : j));
    },
    async deleteJournalEntry(id) {
      journal = journal.filter((j) => j.id !== id);
    },

    async listContentOverrides() {
      return [...overrides].map(([id, content]) => ({ id, content }));
    },
    async setContentOverride(id, content) {
      overrides.set(id, content);
    },
    async deleteContentOverride(id) {
      overrides.delete(id);
    },
  };
}
