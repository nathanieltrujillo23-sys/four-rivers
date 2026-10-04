import type {
  CourseProgress,
  CourseSnapshot,
  GivingEntry,
  AdminGroup,
  AdminOverview,
  GroupNotification,
  ReadingPlan,
  ReadingProgress,
  Learner,
  Group,
  GroupMember,
  GroupMessage,
  GroupPrayer,
  LeaderRequest,
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
  /** Everything unlocked, as for the demo account. */
  fullAccess?: boolean;
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
    })),
  );

  const goal: SavingsGoal = { id: uid(), name: "Emergency fund", targetAmount: 5000, createdAt: daysAgo(5) };

  const state: CourseSnapshot = {
    profile: {
      userId: "00000000-0000-0000-0000-000000000000",
      role: "free",
      displayName: seed.fullAccess ? "Demo" : "Alex Morgan",
      fullName: null,
      examPassedAt: seed.examPassed ? new Date().toISOString() : null,
      examBestScore: seed.examPassed ? 46 : null,
      challengeStartedAt: seed.challengeStarted ? new Date().toISOString() : null,
      fullAccess: !!seed.fullAccess,
      // The demo account can create groups so the whole Community flow can be shown.
      leaderStatus: seed.fullAccess ? "approved" : "none",
    },
    progress,
    incomeStreams: [
      {
        id: uid(),
        name: "Day job",
        category: "Employment",
        amount: 3200,
        cadence: "monthly",
        notes: null,
        createdAt: daysAgo(8),
      },
      {
        id: uid(),
        name: "Freelance design",
        category: "Self-employment",
        amount: 650,
        cadence: "monthly",
        notes: null,
        createdAt: daysAgo(8),
      },
      {
        id: uid(),
        name: "Rental duplex, unit B",
        category: "Rental",
        amount: 850,
        cadence: "monthly",
        notes: null,
        createdAt: daysAgo(7),
      },
      {
        id: uid(),
        name: "Weekend photography business",
        category: "Business",
        amount: 300,
        cadence: "monthly",
        notes: null,
        createdAt: daysAgo(6),
      },
      {
        id: uid(),
        name: "Dividend income",
        category: "Investments",
        amount: 140,
        cadence: "monthly",
        notes: null,
        createdAt: daysAgo(6),
      },
      {
        id: uid(),
        name: "Book royalties",
        category: "Royalties",
        amount: 75,
        cadence: "monthly",
        notes: null,
        createdAt: daysAgo(5),
      },
    ],
    savingsGoals: [goal],
    savingsContributions: [
      { id: uid(), goalId: goal.id, amount: 250, notes: null, createdAt: daysAgo(5) },
      { id: uid(), goalId: goal.id, amount: 250, notes: null, createdAt: daysAgo(2) },
    ],
    investmentEntries: [
      { id: uid(), name: "Roth IRA", contributionAmount: 200, notes: null, createdAt: daysAgo(6) },
      {
        id: uid(),
        name: "Total market index fund",
        contributionAmount: 150,
        notes: null,
        createdAt: daysAgo(5),
      },
      { id: uid(), name: "Treasury bonds", contributionAmount: 100, notes: null, createdAt: daysAgo(4) },
      {
        id: uid(),
        name: "Real estate investment trust",
        contributionAmount: 75,
        notes: null,
        createdAt: daysAgo(3),
      },
      { id: uid(), name: "Roth IRA", contributionAmount: 200, notes: null, createdAt: daysAgo(2) },
      {
        id: uid(),
        name: "Total market index fund",
        contributionAmount: 150,
        notes: null,
        createdAt: daysAgo(1),
      },
    ],
    givingEntries: [
      { id: uid(), recipient: "Local church", amount: 200, notes: null, createdAt: daysAgo(1) },
    ],
    moduleViews,
  };

  let journal: JournalEntry[] = [];

  // A sample group so the Community page has something real to show. The
  // sample learner leads it; the other names are made up. Everything is
  // in memory and vanishes with the demo session.
  const me = state.profile.userId;
  const sampleNames = ["Maria", "Jordan", "Priya", "Sam", "Taylor", "Chris"];
  // The sample group speaks the language the tour was started in.
  const spanish = typeof localStorage !== "undefined" && localStorage.getItem("four-rivers:lang") === "es";
  const L = (en: string, es: string) => (spanish ? es : en);
  const GROUP_NAME = L("Tuesday Night Stewards", "Mayordomos de los martes");
  let groups: Group[] = [
    {
      id: "demo-group-1",
      name: GROUP_NAME,
      joinCode: "4271",
      leaderId: me,
      verse: {
        day: 12,
        reference: "Proverbs 3:9-10",
        translation: "NIV",
        note: L(
          "Where in your week does the first and best go first?",
          "¿En qué momento de tu semana va primero lo mejor?",
        ),
        updatedAt: daysAgo(1),
      },
      createdAt: daysAgo(14),
    },
  ];
  const rosters = new Map<string, GroupMember[]>([
    [
      "demo-group-1",
      [
        {
          userId: me,
          displayName: state.profile.displayName ?? "You",
          avatar: state.profile.avatar ?? "icon:cross",
          isLeader: true,
          isCoLeader: false,
          joinedAt: daysAgo(14),
        },
        ...sampleNames.map((n, i) => ({
          userId: `demo-member-${i}`,
          displayName: n,
          avatar: ["icon:lion", "icon:dove", null, "icon:lamb", "icon:lily", null][i] ?? null,
          isLeader: false,
          isCoLeader: false,
          joinedAt: daysAgo(13 - i),
        })),
      ],
    ],
  ]);
  const plans = new Map<string, ReadingPlan>();
  const checks = new Map<string, Set<string>>();
  let notifications: GroupNotification[] = [
    ["demo-n1", "exam_passed", "Priya", "icon:dove", 3, true],
    ["demo-n2", "joined", "Chris", null, 26, true],
    ["demo-n3", "exam_passed", "Maria", "icon:lion", 70, false],
    ["demo-n4", "joined", "Taylor", "icon:lily", 140, false],
  ].map(([id, kind, actorName, actorAvatar, minutesAgo, unread]) => ({
    id: id as string,
    groupId: "demo-group-1",
    groupName: GROUP_NAME,
    kind: kind as GroupNotification["kind"],
    actorName: actorName as string,
    actorAvatar: actorAvatar as string | null,
    createdAt: new Date(Date.now() - (minutesAgo as number) * 60_000).toISOString(),
    unread: unread as boolean,
  }));
  let messages: GroupMessage[] = [
    [
      "demo-member-0",
      "Maria",
      L(
        "Good morning everyone! Today's verse hit me hard.",
        "¡Buenos días a todos! El versículo de hoy me tocó el corazón.",
      ),
      130,
    ],
    [
      "demo-member-1",
      "Jordan",
      L(
        "Same here. I finally set up that first deposit this week.",
        "A mí también. Por fin hice mi primer depósito esta semana.",
      ),
      118,
    ],
    [
      me,
      state.profile.displayName ?? "You",
      L("That's huge, Jordan. Proud of you.", "Qué gran paso, Jordan. Estoy orgulloso de ti."),
      105,
    ],
    [
      "demo-member-2",
      "Priya",
      L("Can we pray for my interview on Thursday?", "¿Podemos orar por mi entrevista del jueves?"),
      62,
    ],
    [
      "demo-member-3",
      "Sam",
      L("Absolutely. Added it to the wall.", "Claro que sí. Ya la puse en el muro."),
      55,
    ],
  ].map(([userId, authorName, body, minutesAgo], i) => ({
    id: `demo-msg-${i}`,
    groupId: "demo-group-1",
    userId: userId as string,
    authorName: authorName as string,
    body: body as string,
    createdAt: new Date(Date.now() - (minutesAgo as number) * 60_000).toISOString(),
  }));
  let prayers: (GroupPrayer & { groupId: string })[] = [
    {
      id: "demo-prayer-1",
      groupId: "demo-group-1",
      body: L(
        "Priya's interview on Thursday. Peace and clear words.",
        "La entrevista de Priya el jueves. Paz y palabras claras.",
      ),
      anonymous: false,
      authorName: "Priya",
      answeredAt: null,
      createdAt: daysAgo(1),
      mine: false,
      amenCount: 4,
      prayed: false,
    },
    {
      id: "demo-prayer-2",
      groupId: "demo-group-1",
      body: L(
        "A family member is between jobs. Provision and patience.",
        "Un familiar está entre empleos. Provisión y paciencia.",
      ),
      anonymous: true,
      authorName: null,
      answeredAt: null,
      createdAt: daysAgo(2),
      mine: false,
      amenCount: 6,
      prayed: true,
    },
    {
      id: "demo-prayer-3",
      groupId: "demo-group-1",
      body: L(
        "Wisdom as I decide whether to take on a second job.",
        "Sabiduría para decidir si tomo un segundo empleo.",
      ),
      anonymous: false,
      authorName: "Jordan",
      answeredAt: null,
      createdAt: daysAgo(3),
      mine: false,
      amenCount: 3,
      prayed: false,
    },
    {
      id: "demo-prayer-4",
      groupId: "demo-group-1",
      body: "Thank you for the car repair money that showed up.",
      anonymous: false,
      authorName: "Sam",
      answeredAt: daysAgo(1),
      createdAt: daysAgo(6),
      mine: false,
      amenCount: 7,
      prayed: true,
    },
  ];
  const listeners = new Set<(m: GroupMessage) => void>();
  const overrides = new Map<string, unknown>();

  const ensureRow = (river: RiverNumber): CourseProgress => {
    let row = state.progress.find((p) => p.riverNumber === river);
    if (!row) {
      row = {
        riverNumber: river,
        lessonViewedAt: null,
        completedAt: null,
        quizPassedAt: null,
        quizBestScore: null,
      };
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
    async updateNames(names) {
      state.profile.displayName = names.displayName;
      state.profile.fullName = names.fullName;
      if (names.avatar !== undefined) state.profile.avatar = names.avatar;
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

    async requestLeader() {
      if (state.profile.leaderStatus === "none") state.profile.leaderStatus = "requested";
    },

    async listMyGroups() {
      return structuredClone(groups);
    },
    async createGroup(name, displayName) {
      let code = "";
      do {
        code = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
      } while (groups.some((g) => g.joinCode === code));
      const g: Group = {
        id: uid(),
        name,
        joinCode: code,
        leaderId: me,
        verse: null,
        createdAt: new Date().toISOString(),
      };
      groups = [...groups, g];
      rosters.set(g.id, [
        {
          userId: me,
          displayName,
          avatar: state.profile.avatar ?? null,
          isLeader: true,
          isCoLeader: false,
          joinedAt: g.createdAt,
        },
      ]);
      return structuredClone(g);
    },
    async joinGroup(code) {
      const g = groups.find((x) => x.joinCode === code.trim());
      if (!g) throw new Error("join group: group not found");
      return structuredClone(g);
    },
    async setCoLeader(groupId, userId, value) {
      const roster = rosters.get(groupId) ?? [];
      rosters.set(
        groupId,
        roster.map((m) => (m.userId === userId && !m.isLeader ? { ...m, isCoLeader: value } : m)),
      );
    },
    async removeGroupMember(groupId, userId) {
      const roster = rosters.get(groupId) ?? [];
      rosters.set(
        groupId,
        roster.filter((m) => m.userId !== userId),
      );
      if (userId === me) groups = groups.filter((g) => g.id !== groupId);
    },
    async deleteGroup(groupId) {
      groups = groups.filter((g) => g.id !== groupId);
      rosters.delete(groupId);
    },
    async setGroupVerse(groupId, verse) {
      groups = groups.map((g) =>
        g.id === groupId
          ? { ...g, verse: verse ? { ...verse, updatedAt: new Date().toISOString() } : null }
          : g,
      );
    },
    async getReadingPlan(groupId) {
      return structuredClone(plans.get(groupId) ?? { title: null, days: [] });
    },
    async getReadingProgress(groupId, date): Promise<ReadingProgress[]> {
      // Sample classmates: one has read every day so far, one most days, one only today.
      const due = (plans.get(groupId)?.days ?? []).map((d) => d.date).filter((d) => d <= date);
      const dates = new Map<string, Set<string>>([
        ["demo-member-0", new Set(due)],
        ["demo-member-1", new Set(due.length > 2 ? due.filter((_, i) => i !== 1) : due)],
        ["demo-member-3", new Set([date])],
      ]);
      for (const [key, users] of checks) {
        const [g, d] = key.split("|");
        if (g !== groupId) continue;
        for (const u of users) dates.set(u, (dates.get(u) ?? new Set()).add(d));
      }
      return [...dates].map(([userId, set]) => ({
        userId,
        today: set.has(date),
        total: set.size,
        dates: [...set].sort(),
      }));
    },
    async setReadingDone(groupId, date, done) {
      const key = `${groupId}|${date}`;
      const set = checks.get(key) ?? new Set<string>();
      if (done) set.add(me);
      else set.delete(me);
      checks.set(key, set);
    },
    async setReadingPlan(groupId, plan) {
      if (plan && plan.days.length > 0) plans.set(groupId, structuredClone(plan));
      else plans.delete(groupId);
    },
    async getGroupMembers(groupId) {
      return structuredClone(rosters.get(groupId) ?? []);
    },

    async listMessages(groupId) {
      return structuredClone(messages.filter((m) => m.groupId === groupId));
    },
    async sendMessage(groupId, body) {
      const m: GroupMessage = {
        id: uid(),
        groupId,
        userId: me,
        authorName: state.profile.displayName ?? "You",
        body,
        createdAt: new Date().toISOString(),
      };
      messages = [...messages, m];
      listeners.forEach((fn) => fn(m));
      return structuredClone(m);
    },
    async deleteMessage(messageId) {
      messages = messages.filter((m) => m.id !== messageId);
    },
    subscribeMessages(groupId, handlers) {
      const fn = (m: GroupMessage) => {
        if (m.groupId === groupId && m.userId !== me) handlers.onInsert(m);
      };
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    trackPresence(groupId, _me, onChange) {
      const roster = rosters.get(groupId) ?? [];
      onChange(roster.slice(0, 4).map((m) => m.userId));
      return () => {};
    },

    async listPrayers(groupId) {
      return prayers
        .filter((p) => p.groupId === groupId)
        .map(({ groupId: _g, ...p }) => structuredClone(p))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async postPrayer(groupId, body, anonymous) {
      prayers = [
        {
          id: uid(),
          groupId,
          body,
          anonymous,
          authorName: anonymous ? null : (state.profile.displayName ?? "You"),
          answeredAt: null,
          createdAt: new Date().toISOString(),
          mine: true,
          amenCount: 0,
          prayed: false,
        },
        ...prayers,
      ];
    },
    async togglePrayed(prayerId) {
      let now = false;
      prayers = prayers.map((p) => {
        if (p.id !== prayerId) return p;
        now = !p.prayed;
        return { ...p, prayed: now, amenCount: p.amenCount + (now ? 1 : -1) };
      });
      return now;
    },
    async setPrayerAnswered(prayerId, answered) {
      prayers = prayers.map((p) =>
        p.id === prayerId ? { ...p, answeredAt: answered ? new Date().toISOString() : null } : p,
      );
    },
    async deletePrayer(prayerId) {
      prayers = prayers.filter((p) => p.id !== prayerId);
    },

    async getAdminOverview(): Promise<AdminOverview> {
      throw new Error("admin only");
    },
    async listLeaderRequests(): Promise<LeaderRequest[]> {
      throw new Error("admin only");
    },
    async setLeaderApproved() {
      throw new Error("admin only");
    },
    async listNotifications(): Promise<GroupNotification[]> {
      return structuredClone(notifications);
    },
    async markNotificationsSeen(): Promise<void> {
      notifications = notifications.map((n) => ({ ...n, unread: false }));
    },
    async listLearners(): Promise<Learner[]> {
      throw new Error("admin only");
    },
    async listAllGroups(): Promise<AdminGroup[]> {
      throw new Error("admin only");
    },
  };
}
