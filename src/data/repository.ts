import type { PlanVersion } from "../lib/wealthVersions";
import type {
  CourseSnapshot,
  AdminGroup,
  AdminOverview,
  AccountNotice,
  GroupNotification,
  LessonFeedback,
  ReadingPlan,
  ReadingProgress,
  Learner,
  LearnerActivity,
  CalculatorScenario,
  CalculatorTool,
  AdminAnalytics,
  QuestionSection,
  QuestionStat,
  MemberCourseProgress,
  Announcement,
  LeaderInvite,
  DiscoveryMeeting,
  GivingEntry,
  Group,
  GroupMember,
  GroupMessage,
  GroupPrayer,
  GroupVerse,
  LeaderRequest,
  WealthCase,
  WealthCaseReview,
  WealthClient,
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
    verification: { displayName: string | null; completedAt: string | null },
  ): Promise<void>;

  /** Idempotent: records a module as viewed. Safe to call repeatedly. */
  markModuleViewed(section: ModuleSection, moduleIndex: number): Promise<void>;

  /**
   * Saves the preferred name (greetings) and full name (certificate). If the
   * exam is already passed, the public verification record is kept in sync.
   */
  updateNames(names: {
    displayName: string | null;
    fullName: string | null;
    /** Leave out to keep the current picture; null clears it. */
    avatar?: string | null;
  }): Promise<void>;

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

  /* ---- Community (see supabase/legacy/011_community.sql) ----------------------
   * Loaded on their own, like the journal, so a project that hasn't run the
   * migration still works: these reject and the Community page explains what
   * is missing. Nobody's individual progress is ever returned.
   */
  /** Asks the admin for leader status (so the person can create groups). */
  requestLeader(note: string): Promise<void>;
  /** Asks the admin for the Wealth Tools space. */
  requestWealth(note: string): Promise<void>;
  /** The signed-in person's own client plans, newest change first (nobody else's are ever returned). Rejects until approved. */
  listWealthClients(): Promise<WealthClient[]>;
  /** Starts a client plan (from a starting plan document, or empty) and returns it. */
  createWealthClient(plan: unknown | null): Promise<WealthClient>;
  /** Saves a client's wealth plan. */
  saveWealthClientPlan(clientId: string, plan: unknown): Promise<void>;
  /** Saves one toolkit tool's numbers for a client without touching the others; null clears that tool. */
  saveWealthClientTool(clientId: string, toolId: string, state: unknown): Promise<void>;
  deleteWealthClient(clientId: string): Promise<void>;
  /** The signed-in person's own career-prep document (practice ratings, answers, journal, checklist, tracker). */
  loadWealthPrep(): Promise<unknown>;
  saveWealthPrep(data: unknown): Promise<void>;
  /** Counts a deck or case export (kept apart from the document so a save never rolls it back). */
  bumpWealthStat(key: "decks" | "caseExports"): Promise<void>;

  /** Saved versions of one client plan, newest first (the plan and toolkit numbers as they were). */
  listWealthVersions(clientId: string): Promise<PlanVersion[]>;
  saveWealthVersion(clientId: string, label: string, plan: unknown, tools: Record<string, unknown>): Promise<string>;
  deleteWealthVersion(versionId: string): Promise<void>;
  /** The shared library of anonymized cases (wealth track only), newest first. */
  listWealthCases(): Promise<WealthCase[]>;
  /** Publishes an anonymized case; showName false posts it as unnamed. Returns the case id. */
  publishWealthCase(c: { title: string; summary: string; plan: unknown; tools: Record<string, unknown>; showName: boolean }): Promise<string>;
  /** Removes a case (its author, or an admin). */
  deleteWealthCase(caseId: string): Promise<void>;
  /** Reviews the signed-in person can read: ones they wrote, plus every review of their own cases. */
  listWealthCaseReviews(): Promise<WealthCaseReview[]>;
  /** Writes (or replaces) the signed-in person's review of someone else's case. */
  reviewWealthCase(caseId: string, review: { scores: Record<string, number>; strengths: string; improve: string }): Promise<void>;
  deleteWealthCaseReview(reviewId: string): Promise<void>;

  listMyGroups(): Promise<Group[]>;
  /** Approved leaders (and admins) only. Creates the group and its 4-digit code. */
  createGroup(name: string, displayName: string): Promise<Group>;
  /** Joins by 4-digit code. Rejects with "group not found" for an unknown code. */
  joinGroup(code: string, displayName: string): Promise<Group>;
  /** Leaves a group (members), or removes another member (the leader). */
  removeGroupMember(groupId: string, userId: string): Promise<void>;
  deleteGroup(groupId: string): Promise<void>;
  /** Sets (or clears, with null) the group's day number and verse. */
  setGroupVerse(groupId: string, verse: Omit<GroupVerse, "updatedAt"> | null): Promise<void>;
  /** Group settings (leader only). */
  renameGroup(groupId: string, name: string): Promise<void>;
  /** Makes a new code and retires the old one; returns the new code. */
  regenerateGroupCode(groupId: string): Promise<string>;
  setGroupJoining(groupId: string, enabled: boolean): Promise<void>;
  /** Discovery workshop (Daily Bread): the signed-in analyst's own meetings; the group's owner sees all of them. */
  listDiscoveryMeetings(groupId: string): Promise<DiscoveryMeeting[]>;
  createDiscoveryMeeting(groupId: string, participantName: string): Promise<DiscoveryMeeting>;
  saveDiscoveryMeeting(meeting: DiscoveryMeeting): Promise<void>;
  deleteDiscoveryMeeting(id: string): Promise<void>;
  setGroupArchived(groupId: string, archived: boolean): Promise<void>;
  /** Hands the group to another approved leader in it; the old leader becomes a co-leader. */
  transferGroupLeadership(groupId: string, userId: string): Promise<void>;
  /** Makes a member a co-leader, or takes it back (group leader only). */
  setCoLeader(groupId: string, userId: string, value: boolean): Promise<void>;
  /** Makes a member an analyst, or takes it back, in a group with the Discovery workshop (leader or co-leader). */
  setAnalyst(groupId: string, userId: string, value: boolean): Promise<void>;
  getGroupMembers(groupId: string): Promise<GroupMember[]>;

  /** The group's reading calendar (empty when no plan is set). */
  getReadingPlan(groupId: string): Promise<ReadingPlan>;
  /** Who has ticked off the reading dated `date`, and how many readings each has done in all. */
  getReadingProgress(groupId: string, date: string): Promise<ReadingProgress[]>;
  /** Ticks (or unticks) my own reading for the day. */
  setReadingDone(groupId: string, date: string, done: boolean): Promise<void>;
  /** Replaces the group's plan (leader only); null clears it. */
  setReadingPlan(groupId: string, plan: ReadingPlan | null): Promise<void>;

  listMessages(groupId: string, limit?: number): Promise<GroupMessage[]>;
  sendMessage(groupId: string, body: string): Promise<GroupMessage>;
  deleteMessage(messageId: string): Promise<void>;
  /** Live updates for the chat. Returns the function that stops listening. */
  subscribeMessages(
    groupId: string,
    handlers: { onInsert: (m: GroupMessage) => void; onDelete: (id: string) => void },
  ): () => void;
  /** Who is online in the group right now. Returns the function that stops tracking. */
  trackPresence(
    groupId: string,
    me: { userId: string; name: string },
    onChange: (userIds: string[]) => void,
  ): () => void;

  listPrayers(groupId: string): Promise<GroupPrayer[]>;
  postPrayer(groupId: string, body: string, anonymous: boolean): Promise<void>;
  /** Taps "I prayed" on or off. Resolves to the new state. */
  togglePrayed(prayerId: string): Promise<boolean>;
  setPrayerAnswered(prayerId: string, answered: boolean): Promise<void>;
  deletePrayer(prayerId: string): Promise<void>;

  /* ---- Admin dashboard (admin accounts only) ---- */
  getAdminOverview(): Promise<AdminOverview>;
  listLeaderRequests(): Promise<LeaderRequest[]>;
  setLeaderApproved(userId: string, approved: boolean): Promise<void>;
  listWealthRequests(): Promise<LeaderRequest[]>;
  setWealthApproved(userId: string, approved: boolean): Promise<void>;
  listAllGroups(): Promise<AdminGroup[]>;
  /** Recent joins and exam passes in the groups I belong to (never my own). */
  listNotifications(): Promise<GroupNotification[]>;
  /** Marks everything up to now as seen, which clears the bell's count. */
  markNotificationsSeen(): Promise<void>;
  /** Notices about my own account (an admin approved my request), newest first. */
  listAccountNotices(): Promise<AccountNotice[]>;
  markAccountNoticesSeen(): Promise<void>;
  /** Turns the daily reading email on or off (the language is the one it will be written in). */
  setEmailReminders(enabled: boolean, lang: "en" | "es"): Promise<void>;
  /** Remembers this device for reading reminders. */
  savePushSubscription(sub: { endpoint: string; p256dh: string; auth: string }): Promise<void>;
  removePushSubscription(endpoint: string): Promise<void>;
  /** My answer for one lesson, if I gave one. */
  getLessonFeedback(section: ModuleSection, moduleIndex: number): Promise<LessonFeedback | null>;
  saveLessonFeedback(
    section: ModuleSection,
    moduleIndex: number,
    helpful: boolean,
    note: string | null,
  ): Promise<void>;
  /** Everyone's answers, without names (admin only). */
  listLessonFeedback(): Promise<LessonFeedback[]>;
  /** Names, emails, and sign-up dates of every learner (never passwords). */
  listLearners(): Promise<Learner[]>;
  /** Admin: clears one account's course progress and tracker entries so they start the course again. */
  adminResetAccount(userId: string): Promise<void>;
  /** One learner's activity and progress (admin only). */
  getLearnerActivity(userId: string): Promise<LearnerActivity>;
  /** Notes that the app was opened, so admins can see when someone was last active. */
  touchLastSeen(): Promise<void>;
  /** My saved calculator scenarios, newest first. */
  listScenarios(): Promise<CalculatorScenario[]>;
  saveScenario(tool: CalculatorTool, name: string, data: unknown): Promise<CalculatorScenario>;
  deleteScenario(id: string): Promise<void>;
  /** Adds one quiz or exam attempt to the "most missed questions" counts (no names are kept). */
  recordQuestionStats(section: QuestionSection, total: number, missed: number[]): Promise<void>;
  getAnalytics(): Promise<AdminAnalytics>;
  getQuestionStats(): Promise<QuestionStat[]>;
  /** Leaders: how every member is doing in the course. */
  getMemberCourseProgress(groupId: string): Promise<MemberCourseProgress[]>;
  /** Turns announcement emails from the admin on or off for me. */
  setAnnounceEmails(enabled: boolean): Promise<void>;
  /** Invitations to lead a group that have been sent, newest first (admin only). */
  listLeaderInvites(): Promise<LeaderInvite[]>;
  cancelLeaderInvite(email: string): Promise<void>;
  /** The announcements sent so far, newest first (admin only). */
  listAnnouncements(): Promise<Announcement[]>;
  /** Leaders: turns the weekly email about their groups on or off. */
  setDigestEmails(enabled: boolean): Promise<void>;
}
