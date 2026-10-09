import { supabase } from "../lib/supabaseClient";
import { callApi } from "../lib/serverApi";
import type {
  CourseProgress,
  CourseSnapshot,
  AdminGroup,
  AdminOverview,
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
  NotificationKind,
  GivingEntry,
  Group,
  GroupMember,
  GroupMessage,
  GroupPrayer,
  GroupVerse,
  LeaderRequest,
  LeaderStatus,
  IncomeStream,
  InvestmentEntry,
  JournalEntry,
  ModuleSection,
  ModuleView,
  Profile,
  RiverNumber,
  Role,
  SavingsContribution,
  SavingsGoal,
  Translation,
} from "../types";
import type { CourseRepository } from "./repository";

function assertOk(error: { message: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

/* ---- row <-> domain mappers ------------------------------------- */

function toProfile(row: Record<string, unknown>): Profile {
  return {
    userId: row.user_id as string,
    role: (row.role as Role) ?? "free",
    displayName: (row.display_name as string) ?? null,
    // Null until migration 009 is applied — see supabase/legacy/009_full_name.sql.
    fullName: (row.full_name as string) ?? null,
    // Both null until migration 004 is applied — see supabase/legacy/004_final_exam.sql.
    examPassedAt: (row.exam_passed_at as string) ?? null,
    examBestScore: row.exam_best_score == null ? null : Number(row.exam_best_score),
    // Null until migration 008 is applied — see supabase/legacy/008_challenge.sql.
    challengeStartedAt: (row.challenge_started_at as string) ?? null,
    // "none" until migration 011 is applied — see supabase/legacy/011_community.sql.
    leaderStatus: (row.leader_status as LeaderStatus) ?? "none",
    // Null until migration 013 is applied — see supabase/legacy/013_profiles.sql.
    avatar: (row.avatar as string) ?? null,
    // False until migration 022 is applied.
    emailReminders: !!row.email_reminders,
    // True (the default) until migration 20261006000100 is applied.
    digestEmails: row.digest_emails !== false,
    announceEmails: row.announce_emails !== false,
    welcomeSentAt: (row.welcome_sent_at as string) ?? null,
    createdAt: (row.created_at as string) ?? null,
  };
}

function toScenario(row: Record<string, unknown>): CalculatorScenario {
  return {
    id: row.id as string,
    tool: row.tool as CalculatorTool,
    name: row.name as string,
    data: row.data,
    updatedAt: row.updated_at as string,
  };
}

function toLessonFeedback(row: Record<string, unknown>): LessonFeedback {
  const section = String(row.section);
  return {
    section: (section === "introduction"
      ? "introduction"
      : (Number(section) as RiverNumber)) as ModuleSection,
    moduleIndex: Number(row.module_index),
    helpful: !!row.helpful,
    note: (row.note as string) ?? null,
    updatedAt: row.updated_at as string,
  };
}

function toGroup(row: Record<string, unknown>): Group {
  const reference = row.votd_reference as string | null;
  return {
    id: row.id as string,
    name: row.name as string,
    joinCode: row.join_code as string,
    leaderId: row.leader_id as string,
    verse: reference
      ? {
          day: row.votd_day == null ? null : Number(row.votd_day),
          reference,
          translation: row.votd_translation as Translation,
          // Null until migration 015 is applied; course verses never need it.
          text: (row.votd_text as string) ?? null,
          note: (row.votd_note as string) ?? null,
          updatedAt: (row.votd_updated_at as string) ?? (row.created_at as string),
        }
      : null,
    // True and null until migration 020 is applied.
    joinEnabled: row.join_enabled !== false,
    archivedAt: (row.archived_at as string) ?? null,
    // False until the discovery workshop update is applied.
    verseLocked: row.verse_locked === true,
    codeLocked: row.code_locked === true,
    workshopEnabled: row.workshop_enabled === true,
    createdAt: row.created_at as string,
  };
}

function toMeeting(row: Record<string, unknown>): DiscoveryMeeting {
  return {
    id: row.id as string,
    groupId: row.group_id as string,
    participantName: row.participant_name as string,
    step: Number(row.step ?? 0),
    answers: (row.answers as Record<string, string>) ?? {},
    topics: (row.topics as string[]) ?? [],
    agreement: (row.agreement as DiscoveryMeeting["agreement"]) ?? null,
    completedAt: (row.completed_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function toMessage(row: Record<string, unknown>): GroupMessage {
  return {
    id: row.id as string,
    groupId: row.group_id as string,
    userId: row.user_id as string,
    authorName: (row.author_name as string) || "Member",
    body: row.body as string,
    createdAt: row.created_at as string,
  };
}

function toProgress(row: Record<string, unknown>): CourseProgress {
  return {
    riverNumber: Number(row.river_number) as RiverNumber,
    lessonViewedAt: (row.lesson_viewed_at as string) ?? null,
    completedAt: (row.completed_at as string) ?? null,
    // Both null until migration 003 is applied — see supabase/legacy/003_quizzes.sql.
    quizPassedAt: (row.quiz_passed_at as string) ?? null,
    quizBestScore: row.quiz_best_score == null ? null : Number(row.quiz_best_score),
  };
}

function toIncomeStream(row: Record<string, unknown>): IncomeStream {
  return {
    id: row.id as string,
    name: row.name as string,
    category: (row.category as string) ?? "Other",
    amount: Number(row.amount),
    cadence: row.cadence as IncomeStream["cadence"],
    notes: (row.notes as string) ?? null,
    createdAt: row.created_at as string,
  };
}

function toSavingsGoal(row: Record<string, unknown>): SavingsGoal {
  return {
    id: row.id as string,
    name: row.name as string,
    targetAmount: Number(row.target_amount),
    createdAt: row.created_at as string,
  };
}

function toSavingsContribution(row: Record<string, unknown>): SavingsContribution {
  return {
    id: row.id as string,
    goalId: row.goal_id as string,
    amount: Number(row.amount),
    notes: (row.notes as string) ?? null,
    createdAt: row.created_at as string,
  };
}

function toInvestmentEntry(row: Record<string, unknown>): InvestmentEntry {
  return {
    id: row.id as string,
    name: row.name as string,
    contributionAmount: Number(row.contribution_amount),
    notes: (row.notes as string) ?? null,
    createdAt: row.created_at as string,
  };
}

function toGivingEntry(row: Record<string, unknown>): GivingEntry {
  return {
    id: row.id as string,
    recipient: row.recipient as string,
    amount: Number(row.amount),
    notes: (row.notes as string) ?? null,
    createdAt: row.created_at as string,
  };
}

function toModuleView(row: Record<string, unknown>): ModuleView {
  return {
    section: (row.section === "introduction" ? "introduction" : Number(row.section)) as ModuleView["section"],
    moduleIndex: Number(row.module_index),
    viewedAt: row.viewed_at as string,
  };
}

function toJournalEntry(row: Record<string, unknown>): JournalEntry {
  return {
    id: row.id as string,
    title: (row.title as string) ?? null,
    body: row.body as string,
    entryDate: row.entry_date as string,
    riverNumber: row.river_number == null ? null : (Number(row.river_number) as RiverNumber),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function createSupabaseRepository(userId: string): CourseRepository {
  async function ensureProfile(): Promise<Profile> {
    const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
    assertOk(error, "load profile");
    if (data) return toProfile(data);

    // The signup trigger normally creates this; upsert as a fallback (e.g. for
    // users created before the trigger existed).
    const { data: created, error: upsertError } = await supabase
      .from("profiles")
      .upsert({ user_id: userId }, { onConflict: "user_id" })
      .select("*")
      .single();
    assertOk(upsertError, "create profile");
    return toProfile(created);
  }

  return {
    ensureProfile,

    async loadAll(): Promise<CourseSnapshot> {
      const profile = await ensureProfile();
      const [progress, income, goals, contributions, investments, giving, moduleViews] = await Promise.all([
        supabase.from("course_progress").select("*").eq("user_id", userId),
        supabase.from("income_streams").select("*").order("created_at", { ascending: false }),
        supabase.from("savings_goals").select("*").order("created_at", { ascending: false }),
        supabase.from("savings_contributions").select("*").order("created_at", { ascending: false }),
        supabase.from("investment_entries").select("*").order("created_at", { ascending: false }),
        supabase.from("giving_entries").select("*").order("created_at", { ascending: false }),
        // Missing until migration 006 is applied — treated as "nothing viewed
        // yet" rather than failing the whole load.
        supabase.from("module_views").select("*").eq("user_id", userId),
      ]);
      assertOk(progress.error, "load progress");
      assertOk(income.error, "load income streams");
      assertOk(goals.error, "load savings goals");
      assertOk(contributions.error, "load savings contributions");
      assertOk(investments.error, "load investment entries");
      assertOk(giving.error, "load giving entries");

      return {
        profile,
        progress: (progress.data ?? []).map(toProgress),
        incomeStreams: (income.data ?? []).map(toIncomeStream),
        savingsGoals: (goals.data ?? []).map(toSavingsGoal),
        savingsContributions: (contributions.data ?? []).map(toSavingsContribution),
        investmentEntries: (investments.data ?? []).map(toInvestmentEntry),
        givingEntries: (giving.data ?? []).map(toGivingEntry),
        moduleViews: moduleViews.error ? [] : (moduleViews.data ?? []).map(toModuleView),
      };
    },

    async markLessonViewed(river: RiverNumber) {
      // Race-safe and idempotent: create the row if missing (a concurrent insert
      // is a no-op), then stamp lesson_viewed_at only where it is still null.
      const { error: rowErr } = await supabase
        .from("course_progress")
        .upsert(
          { user_id: userId, river_number: river },
          { onConflict: "user_id,river_number", ignoreDuplicates: true },
        );
      assertOk(rowErr, "ensure lesson progress row");

      const now = new Date().toISOString();
      const { error: stampErr } = await supabase
        .from("course_progress")
        .update({ lesson_viewed_at: now, updated_at: now })
        .eq("user_id", userId)
        .eq("river_number", river)
        .is("lesson_viewed_at", null);
      assertOk(stampErr, "stamp lesson viewed");
    },

    async setRiverCompletedAt(river: RiverNumber, completedAt: string | null) {
      const { error } = await supabase.from("course_progress").upsert(
        {
          user_id: userId,
          river_number: river,
          completed_at: completedAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,river_number" },
      );
      assertOk(error, "set river completed_at");
    },

    async setQuizResult(river: RiverNumber, passedAt: string | null, bestScore: number) {
      const { error } = await supabase.from("course_progress").upsert(
        {
          user_id: userId,
          river_number: river,
          quiz_passed_at: passedAt,
          quiz_best_score: bestScore,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,river_number" },
      );
      assertOk(error, "set quiz result");
    },

    async setExamResult(
      passedAt: string | null,
      bestScore: number,
      verification: { displayName: string | null; completedAt: string | null },
    ) {
      const { error } = await supabase
        .from("profiles")
        .update({ exam_passed_at: passedAt, exam_best_score: bestScore })
        .eq("user_id", userId);
      assertOk(error, "set exam result");

      // Keep the public verification row in sync, but only once there's an
      // actual pass to show — no row should exist for an unpassed exam.
      if (passedAt) {
        const { error: verifyError } = await supabase.from("certificate_verifications").upsert(
          {
            user_id: userId,
            display_name: verification.displayName,
            completed_at: verification.completedAt,
            exam_passed_at: passedAt,
            exam_best_score: bestScore,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
        assertOk(verifyError, "sync certificate verification");
      }
    },

    async markModuleViewed(section: ModuleSection, moduleIndex: number) {
      const { error } = await supabase
        .from("module_views")
        .upsert(
          { user_id: userId, section: String(section), module_index: moduleIndex },
          { onConflict: "user_id,section,module_index", ignoreDuplicates: true },
        );
      assertOk(error, "mark module viewed");
    },

    async updateNames(names: {
      displayName: string | null;
      fullName: string | null;
      avatar?: string | null;
    }) {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: names.displayName,
          full_name: names.fullName,
          // Only sent when it changed, so a project that hasn't run migration 013 keeps working.
          ...(names.avatar !== undefined ? { avatar: names.avatar } : {}),
        })
        .eq("user_id", userId);
      assertOk(error, "update names");
      // An already-issued certificate shows the new name too (no row = exam not passed yet).
      const { error: verifyError } = await supabase
        .from("certificate_verifications")
        .update({ display_name: names.fullName || names.displayName, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      assertOk(verifyError, "sync certificate name");
    },
    async startChallenge() {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("profiles")
        .update({ challenge_started_at: now })
        .eq("user_id", userId);
      assertOk(error, "start challenge");
      return now;
    },
    async resetProgress() {
      for (const table of [
        "course_progress",
        "module_views",
        "certificate_verifications",
        "savings_contributions",
        "savings_goals",
        "income_streams",
        "investment_entries",
        "giving_entries",
      ]) {
        const { error } = await supabase.from(table).delete().eq("user_id", userId);
        assertOk(error, `reset ${table}`);
      }
      const { error } = await supabase
        .from("profiles")
        .update({ exam_passed_at: null, exam_best_score: null, challenge_started_at: null })
        .eq("user_id", userId);
      assertOk(error, "reset profile progress");
    },
    async resetChallenge() {
      const { error } = await supabase
        .from("profiles")
        .update({ challenge_started_at: null })
        .eq("user_id", userId);
      assertOk(error, "reset challenge");
    },

    async insertIncomeStream(s: IncomeStream) {
      const { error } = await supabase.from("income_streams").insert({
        id: s.id,
        user_id: userId,
        name: s.name,
        category: s.category,
        amount: s.amount,
        cadence: s.cadence,
        notes: s.notes,
      });
      assertOk(error, "insert income stream");
    },
    async deleteIncomeStream(id: string) {
      const { error } = await supabase.from("income_streams").delete().eq("id", id);
      assertOk(error, "delete income stream");
    },

    async insertSavingsGoal(g: SavingsGoal) {
      const { error } = await supabase.from("savings_goals").insert({
        id: g.id,
        user_id: userId,
        name: g.name,
        target_amount: g.targetAmount,
      });
      assertOk(error, "insert savings goal");
    },
    async deleteSavingsGoal(id: string) {
      const { error } = await supabase.from("savings_goals").delete().eq("id", id);
      assertOk(error, "delete savings goal");
    },
    async insertSavingsContribution(c: SavingsContribution) {
      const { error } = await supabase.from("savings_contributions").insert({
        id: c.id,
        user_id: userId,
        goal_id: c.goalId,
        amount: c.amount,
        notes: c.notes,
      });
      assertOk(error, "insert savings contribution");
    },
    async deleteSavingsContribution(id: string) {
      const { error } = await supabase.from("savings_contributions").delete().eq("id", id);
      assertOk(error, "delete savings contribution");
    },

    async insertInvestmentEntry(e: InvestmentEntry) {
      const { error } = await supabase.from("investment_entries").insert({
        id: e.id,
        user_id: userId,
        name: e.name,
        contribution_amount: e.contributionAmount,
        notes: e.notes,
      });
      assertOk(error, "insert investment entry");
    },
    async deleteInvestmentEntry(id: string) {
      const { error } = await supabase.from("investment_entries").delete().eq("id", id);
      assertOk(error, "delete investment entry");
    },

    async insertGivingEntry(e: GivingEntry) {
      const { error } = await supabase.from("giving_entries").insert({
        id: e.id,
        user_id: userId,
        recipient: e.recipient,
        amount: e.amount,
        notes: e.notes,
      });
      assertOk(error, "insert giving entry");
    },
    async deleteGivingEntry(id: string) {
      const { error } = await supabase.from("giving_entries").delete().eq("id", id);
      assertOk(error, "delete giving entry");
    },

    async listJournalEntries() {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });
      assertOk(error, "load journal entries");
      return (data ?? []).map(toJournalEntry);
    },
    async insertJournalEntry(e: JournalEntry) {
      const { error } = await supabase.from("journal_entries").insert({
        id: e.id,
        user_id: userId,
        title: e.title,
        body: e.body,
        entry_date: e.entryDate,
        river_number: e.riverNumber,
      });
      assertOk(error, "insert journal entry");
    },
    async updateJournalEntry(e: JournalEntry) {
      const { error } = await supabase
        .from("journal_entries")
        .update({
          title: e.title,
          body: e.body,
          entry_date: e.entryDate,
          river_number: e.riverNumber,
          updated_at: e.updatedAt,
        })
        .eq("id", e.id);
      assertOk(error, "update journal entry");
    },
    async deleteJournalEntry(id: string) {
      const { error } = await supabase.from("journal_entries").delete().eq("id", id);
      assertOk(error, "delete journal entry");
    },

    async listContentOverrides() {
      const { data, error } = await supabase.from("content_overrides").select("id, content");
      if (error) return []; // table may not exist yet — every module just uses its default
      return (data ?? []).map((row) => ({ id: row.id as string, content: row.content }));
    },
    async setContentOverride(id: string, content: unknown) {
      const { error } = await supabase
        .from("content_overrides")
        .upsert({ id, content, updated_by: userId, updated_at: new Date().toISOString() });
      assertOk(error, "save content override");
    },
    async deleteContentOverride(id: string) {
      const { error } = await supabase.from("content_overrides").delete().eq("id", id);
      assertOk(error, "reset content override");
    },

    async requestLeader(note: string) {
      const { error } = await supabase.rpc("request_leader", { p_note: note });
      // Tell the admins by email (best effort; the request itself is already saved).
      if (!error) void callApi("leader-request", {});
      assertOk(error, "request leader status");
    },

    async listMyGroups() {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .order("created_at", { ascending: true });
      assertOk(error, "load groups");
      return (data ?? []).map(toGroup);
    },
    async createGroup(name: string, displayName: string) {
      const { data, error } = await supabase.rpc("create_group", {
        p_name: name,
        p_display_name: displayName,
      });
      assertOk(error, "create group");
      return toGroup(data as Record<string, unknown>);
    },
    async joinGroup(code: string, displayName: string) {
      const { data, error } = await supabase.rpc("join_group", { p_code: code, p_display_name: displayName });
      assertOk(error, "join group");
      return toGroup(data as Record<string, unknown>);
    },
    async renameGroup(groupId: string, name: string) {
      const { error } = await supabase
        .from("groups")
        .update({ name: name.trim().slice(0, 60) })
        .eq("id", groupId);
      assertOk(error, "rename group");
    },
    async regenerateGroupCode(groupId: string) {
      const { data, error } = await supabase.rpc("regenerate_group_code", { p_group: groupId });
      assertOk(error, "make a new code");
      return data as string;
    },
    async listDiscoveryMeetings(groupId: string) {
      const { data, error } = await supabase
        .from("discovery_meetings")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });
      assertOk(error, "load discovery meetings");
      return (data ?? []).map(toMeeting);
    },
    async createDiscoveryMeeting(groupId: string, participantName: string) {
      const { data, error } = await supabase
        .from("discovery_meetings")
        .insert({ group_id: groupId, participant_name: participantName.trim().slice(0, 80) })
        .select("*")
        .single();
      assertOk(error, "start a discovery meeting");
      return toMeeting(data as Record<string, unknown>);
    },
    async saveDiscoveryMeeting(m: DiscoveryMeeting) {
      const { error } = await supabase
        .from("discovery_meetings")
        .update({
          participant_name: m.participantName.trim().slice(0, 80) || "Participant",
          step: m.step,
          answers: m.answers,
          topics: m.topics,
          agreement: m.agreement,
          completed_at: m.completedAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", m.id);
      assertOk(error, "save the meeting");
    },
    async deleteDiscoveryMeeting(id: string) {
      const { error } = await supabase.from("discovery_meetings").delete().eq("id", id);
      assertOk(error, "delete the meeting");
    },
    async setGroupJoining(groupId: string, enabled: boolean) {
      const { error } = await supabase.rpc("set_group_joining", { p_group: groupId, p_enabled: enabled });
      assertOk(error, "change joining");
    },
    async setGroupArchived(groupId: string, archived: boolean) {
      const { error } = await supabase.rpc("set_group_archived", { p_group: groupId, p_archived: archived });
      assertOk(error, "archive group");
    },
    async transferGroupLeadership(groupId: string, userId: string) {
      const { error } = await supabase.rpc("transfer_group_leadership", { p_group: groupId, p_user: userId });
      assertOk(error, "hand over group");
    },
    async setCoLeader(groupId: string, userId: string, value: boolean) {
      const { error } = await supabase.rpc("set_co_leader", {
        p_group: groupId,
        p_user: userId,
        p_value: value,
      });
      assertOk(error, "set co-leader");
    },
    async removeGroupMember(groupId: string, memberId: string) {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", memberId);
      assertOk(error, "remove group member");
    },
    async deleteGroup(groupId: string) {
      const { error } = await supabase.from("groups").delete().eq("id", groupId);
      assertOk(error, "delete group");
    },
    async setGroupVerse(groupId: string, verse: Omit<GroupVerse, "updatedAt"> | null) {
      const { error } = await supabase
        .from("groups")
        .update(
          verse
            ? {
                votd_day: verse.day,
                votd_reference: verse.reference,
                votd_translation: verse.translation,
                ...(verse.text ? { votd_text: verse.text } : {}),
                votd_note: verse.note,
                votd_updated_at: new Date().toISOString(),
              }
            : {
                votd_day: null,
                votd_reference: null,
                votd_translation: null,
                votd_note: null,
                votd_updated_at: null,
              },
        )
        .eq("id", groupId);
      assertOk(error, "set group verse");
    },
    async getReadingPlan(groupId: string): Promise<ReadingPlan> {
      const { data, error } = await supabase
        .from("group_readings")
        .select("read_on, through_on, passages, plan_title")
        .eq("group_id", groupId)
        .order("read_on");
      assertOk(error, "load reading plan");
      const rows = (data ?? []) as Record<string, unknown>[];
      return {
        title: (rows[0]?.plan_title as string) ?? null,
        days: rows.map((r) => ({
          date: r.read_on as string,
          through: (r.through_on as string) ?? null,
          passages: r.passages as string,
        })),
      };
    },
    async getReadingProgress(groupId: string, date: string): Promise<ReadingProgress[]> {
      const { data, error } = await supabase.rpc("group_reading_progress", {
        p_group: groupId,
        p_date: date,
      });
      assertOk(error, "load reading progress");
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        userId: r.user_id as string,
        total: Number(r.total),
        today: !!r.today,
        dates: ((r.dates as string[] | null) ?? []).map(String),
      }));
    },
    async setReadingDone(groupId: string, date: string, done: boolean) {
      const { error } = done
        ? await supabase
            .from("group_reading_checks")
            .upsert(
              { group_id: groupId, user_id: userId, read_on: date },
              { onConflict: "group_id,user_id,read_on" },
            )
        : await supabase
            .from("group_reading_checks")
            .delete()
            .eq("group_id", groupId)
            .eq("user_id", userId)
            .eq("read_on", date);
      assertOk(error, "update reading check");
    },
    async setReadingPlan(groupId: string, plan: ReadingPlan | null) {
      const { error } = await supabase.rpc("set_group_plan", {
        p_group: groupId,
        p_title: plan?.title ?? null,
        p_days: (plan?.days ?? []).map((d) => ({
          read_on: d.date,
          through_on: d.through,
          passages: d.passages,
        })),
      });
      assertOk(error, "set reading plan");
    },
    async getGroupMembers(groupId: string): Promise<GroupMember[]> {
      const { data, error } = await supabase.rpc("group_overview", { p_group: groupId });
      assertOk(error, "load group");
      const o = data as {
        members: {
          user_id: string;
          display_name: string;
          is_leader: boolean;
          joined_at: string;
          avatar?: string | null;
          is_co_leader?: boolean;
        }[];
      };
      return o.members.map((m) => ({
        userId: m.user_id,
        displayName: m.display_name,
        avatar: m.avatar ?? null,
        isLeader: m.is_leader,
        isCoLeader: !!m.is_co_leader,
        joinedAt: m.joined_at,
      }));
    },

    async listMessages(groupId: string, limit = 150) {
      const { data, error } = await supabase
        .from("group_messages")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .limit(limit);
      assertOk(error, "load messages");
      return (data ?? []).map(toMessage).reverse();
    },
    async sendMessage(groupId: string, body: string) {
      const { data, error } = await supabase
        .from("group_messages")
        .insert({ group_id: groupId, user_id: userId, body })
        .select("*")
        .single();
      assertOk(error, "send message");
      return toMessage(data as Record<string, unknown>);
    },
    async deleteMessage(messageId: string) {
      const { error } = await supabase.from("group_messages").delete().eq("id", messageId);
      assertOk(error, "delete message");
    },
    subscribeMessages(groupId, handlers) {
      const channel = supabase
        .channel(`messages:${groupId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
          (payload) => handlers.onInsert(toMessage(payload.new as Record<string, unknown>)),
        )
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "group_messages" }, (payload) => {
          const id = (payload.old as { id?: string }).id;
          if (id) handlers.onDelete(id);
        })
        .subscribe();
      return () => {
        void supabase.removeChannel(channel);
      };
    },
    trackPresence(groupId, me, onChange) {
      const channel = supabase.channel(`presence:${groupId}`, { config: { presence: { key: me.userId } } });
      channel
        .on("presence", { event: "sync" }, () => onChange(Object.keys(channel.presenceState())))
        .subscribe((status) => {
          if (status === "SUBSCRIBED") void channel.track({ name: me.name });
        });
      return () => {
        void supabase.removeChannel(channel);
      };
    },

    async listPrayers(groupId: string): Promise<GroupPrayer[]> {
      const { data, error } = await supabase.rpc("group_prayer_wall", { p_group: groupId });
      assertOk(error, "load prayer wall");
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        body: r.body as string,
        anonymous: !!r.anonymous,
        authorName: (r.author_name as string) ?? null,
        answeredAt: (r.answered_at as string) ?? null,
        createdAt: r.created_at as string,
        mine: !!r.mine,
        amenCount: Number(r.amen_count),
        prayed: !!r.prayed,
      }));
    },
    async postPrayer(groupId: string, body: string, anonymous: boolean) {
      const { error } = await supabase
        .from("group_prayers")
        .insert({ group_id: groupId, user_id: userId, body, anonymous });
      assertOk(error, "post prayer");
    },
    async togglePrayed(prayerId: string) {
      const { data, error } = await supabase.rpc("pray_toggle", { p_prayer: prayerId });
      assertOk(error, "pray");
      return !!data;
    },
    async setPrayerAnswered(prayerId: string, answered: boolean) {
      // The person who posted the request or a group leader; the database tells the right people.
      const { error } = await supabase.rpc("set_prayer_answered", { p_prayer: prayerId, p_answered: answered });
      assertOk(error, "update prayer");
    },
    async deletePrayer(prayerId: string) {
      const { error } = await supabase.from("group_prayers").delete().eq("id", prayerId);
      assertOk(error, "delete prayer");
    },

    async getAdminOverview(): Promise<AdminOverview> {
      const { data, error } = await supabase.rpc("admin_overview");
      assertOk(error, "load admin overview");
      const o = data as Record<string, number>;
      return {
        learners: Number(o.learners),
        examPassed: Number(o.exam_passed),
        leaders: Number(o.leaders),
        pendingRequests: Number(o.pending_requests),
        groups: Number(o.groups),
        groupMembers: Number(o.group_members),
        messages: Number(o.messages),
        prayers: Number(o.prayers),
        // Zero until migration 20261006000300 is applied.
        prayersAnswered: Number(o.prayers_answered ?? 0),
        readingChecks: Number(o.reading_checks ?? 0),
        modulesRead: Number(o.modules_read ?? 0),
        trackerEntries: Number(o.tracker_entries ?? 0),
      };
    },
    async listLeaderRequests(): Promise<LeaderRequest[]> {
      const { data, error } = await supabase.rpc("admin_leader_requests");
      assertOk(error, "load leader requests");
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        userId: r.user_id as string,
        displayName: (r.display_name as string) ?? "",
        email: (r.email as string) ?? "",
        note: (r.note as string) ?? null,
        status: r.status as "requested" | "approved",
        requestedAt: (r.requested_at as string) ?? null,
      }));
    },
    async setLeaderApproved(targetId: string, approved: boolean) {
      const { error } = await supabase.rpc("admin_set_leader", { p_user: targetId, p_approve: approved });
      assertOk(error, "update leader status");
    },
    async setEmailReminders(enabled: boolean, lang: "en" | "es") {
      const { error } = await supabase
        .from("profiles")
        .update({ email_reminders: enabled, reminder_lang: lang })
        .eq("user_id", userId);
      assertOk(error, "update reminders");
    },
    async savePushSubscription(sub: { endpoint: string; p256dh: string; auth: string }) {
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({ user_id: userId, ...sub }, { onConflict: "endpoint" });
      assertOk(error, "save device");
    },
    async removePushSubscription(endpoint: string) {
      const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      assertOk(error, "remove device");
    },
    async getLessonFeedback(section: ModuleSection, moduleIndex: number) {
      const { data, error } = await supabase
        .from("lesson_feedback")
        .select("section, module_index, helpful, note, updated_at")
        .eq("user_id", userId)
        .eq("section", String(section))
        .eq("module_index", moduleIndex)
        .maybeSingle();
      if (error || !data) return null; // the table may not exist yet
      return toLessonFeedback(data as Record<string, unknown>);
    },
    async saveLessonFeedback(
      section: ModuleSection,
      moduleIndex: number,
      helpful: boolean,
      note: string | null,
    ) {
      const { error } = await supabase.from("lesson_feedback").upsert({
        user_id: userId,
        section: String(section),
        module_index: moduleIndex,
        helpful,
        note: note?.trim() ? note.trim().slice(0, 600) : null,
        updated_at: new Date().toISOString(),
      });
      assertOk(error, "save lesson feedback");
    },
    async listLessonFeedback(): Promise<LessonFeedback[]> {
      const { data, error } = await supabase
        .from("lesson_feedback")
        .select("section, module_index, helpful, note, updated_at")
        .order("updated_at", { ascending: false })
        .limit(500);
      assertOk(error, "load lesson feedback");
      return ((data ?? []) as Record<string, unknown>[]).map(toLessonFeedback);
    },
    async listNotifications(): Promise<GroupNotification[]> {
      const { data, error } = await supabase.rpc("my_notifications");
      assertOk(error, "load notifications");
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        groupId: r.group_id as string,
        groupName: (r.group_name as string) ?? "",
        kind: r.kind as NotificationKind,
        actorName: (r.actor_name as string) ?? "",
        actorAvatar: (r.actor_avatar as string) ?? null,
        note: (r.note as string) ?? null,
        mine: !!r.mine,
        createdAt: r.created_at as string,
        unread: !!r.unread,
      }));
    },
    async markNotificationsSeen(): Promise<void> {
      const { error } = await supabase.rpc("mark_notifications_seen");
      assertOk(error, "mark notifications seen");
    },
    async listLearners(): Promise<Learner[]> {
      const { data, error } = await supabase.rpc("admin_learners");
      assertOk(error, "load learners");
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        userId: r.user_id as string,
        displayName: (r.display_name as string) ?? "",
        fullName: (r.full_name as string) ?? "",
        email: (r.email as string) ?? "",
        signedUpAt: r.signed_up_at as string,
        lastActiveAt: (r.last_active_at as string) ?? null,
      }));
    },
    async getLearnerActivity(targetId: string): Promise<LearnerActivity> {
      const { data, error } = await supabase.rpc("admin_learner_activity", { p_user: targetId });
      assertOk(error, "load learner activity");
      const o = data as Record<string, any>;
      const entries = (o.entries ?? {}) as Record<string, number>;
      return {
        email: (o.email as string) ?? "",
        signedUpAt: o.signed_up_at as string,
        lastSignInAt: (o.last_sign_in_at as string) ?? null,
        lastSeenAt: (o.last_seen_at as string) ?? null,
        examPassedAt: (o.exam_passed_at as string) ?? null,
        examBestScore: o.exam_best_score == null ? null : Number(o.exam_best_score),
        challengeStartedAt: (o.challenge_started_at as string) ?? null,
        leaderStatus: (o.leader_status as LeaderStatus) ?? "none",
        rivers: ((o.rivers ?? []) as Record<string, unknown>[]).map((r) => ({
          river: Number(r.river),
          lessonViewedAt: (r.lesson_viewed_at as string) ?? null,
          completedAt: (r.completed_at as string) ?? null,
          quizPassedAt: (r.quiz_passed_at as string) ?? null,
          quizBestScore: r.quiz_best_score == null ? null : Number(r.quiz_best_score),
        })),
        modulesRead: Number(o.modules_read ?? 0),
        entries: {
          income: Number(entries.income ?? 0),
          savings: Number(entries.savings ?? 0),
          investing: Number(entries.investing ?? 0),
          giving: Number(entries.giving ?? 0),
        },
        groups: ((o.groups ?? []) as Record<string, unknown>[]).map((g) => ({
          name: g.name as string,
          role: g.role as "leader" | "co-leader" | "member",
          joinedAt: g.joined_at as string,
          readingsChecked: Number(g.readings_checked ?? 0),
        })),
        recent: ((o.recent ?? []) as Record<string, unknown>[]).map((r) => ({
          section: String(r.section),
          index: Number(r.index),
          at: r.at as string,
        })),
      };
    },
    async touchLastSeen() {
      // Quietly does nothing until the migration is applied.
      await supabase.rpc("touch_last_seen");
    },
    async listScenarios(): Promise<CalculatorScenario[]> {
      const { data, error } = await supabase
        .from("calculator_scenarios")
        .select("id, tool, name, data, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(100);
      assertOk(error, "load saved scenarios");
      return ((data ?? []) as Record<string, unknown>[]).map(toScenario);
    },
    async saveScenario(tool: CalculatorTool, name: string, scenario: unknown): Promise<CalculatorScenario> {
      const { data, error } = await supabase
        .from("calculator_scenarios")
        .insert({ user_id: userId, tool, name: name.trim().slice(0, 60), data: scenario })
        .select("id, tool, name, data, updated_at")
        .single();
      assertOk(error, "save scenario");
      return toScenario(data as Record<string, unknown>);
    },
    async deleteScenario(id: string) {
      const { error } = await supabase.from("calculator_scenarios").delete().eq("id", id);
      assertOk(error, "delete scenario");
    },
    async recordQuestionStats(section: QuestionSection, total: number, missed: number[]) {
      // Best effort: statistics must never get in the way of finishing a quiz.
      await supabase.rpc("record_question_stats", { p_section: section, p_total: total, p_missed: missed });
    },
    async getAnalytics(): Promise<AdminAnalytics> {
      const { data, error } = await supabase.rpc("admin_analytics");
      assertOk(error, "load analytics");
      const o = data as Record<string, any>;
      return {
        learners: Number(o.learners),
        started: Number(o.started),
        active7d: Number(o.active_7d),
        active30d: Number(o.active_30d),
        new7d: Number(o.new_7d),
        examPassed: Number(o.exam_passed),
        challengeStarted: Number(o.challenge_started),
        rivers: ((o.rivers ?? []) as Record<string, unknown>[]).map((r) => ({
          river: Number(r.river),
          started: Number(r.started),
          completed: Number(r.completed),
          quizPassed: Number(r.quiz_passed),
          avgBestScore: r.avg_best_score == null ? null : Number(r.avg_best_score),
        })),
        signupsByWeek: ((o.signups_by_week ?? []) as Record<string, unknown>[]).map((r) => ({
          week: r.week as string,
          count: Number(r.count),
        })),
      };
    },
    async getQuestionStats(): Promise<QuestionStat[]> {
      const { data, error } = await supabase.rpc("admin_question_stats");
      assertOk(error, "load question statistics");
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        section: r.section as QuestionSection,
        idx: Number(r.idx),
        attempts: Number(r.attempts),
        misses: Number(r.misses),
      }));
    },
    async getMemberCourseProgress(groupId: string): Promise<MemberCourseProgress[]> {
      const { data, error } = await supabase.rpc("group_member_progress", { p_group: groupId });
      assertOk(error, "load member progress");
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        userId: r.user_id as string,
        riversComplete: Number(r.rivers_complete),
        modulesRead: Number(r.modules_read),
        examPassed: !!r.exam_passed,
        lastSeenAt: (r.last_seen_at as string) ?? null,
      }));
    },
    async setAnnounceEmails(enabled: boolean) {
      const { error } = await supabase.from("profiles").update({ announce_emails: enabled }).eq("user_id", userId);
      assertOk(error, "update announcements");
    },
    async listLeaderInvites(): Promise<LeaderInvite[]> {
      const { data, error } = await supabase.rpc("admin_leader_invites");
      assertOk(error, "load invitations");
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        email: r.email as string,
        approve: !!r.approve,
        createdAt: r.created_at as string,
        acceptedAt: (r.accepted_at as string) ?? null,
      }));
    },
    async cancelLeaderInvite(email: string) {
      const { error } = await supabase.rpc("admin_cancel_leader_invite", { p_email: email });
      assertOk(error, "cancel invitation");
    },
    async listAnnouncements(): Promise<Announcement[]> {
      const { data, error } = await supabase.rpc("admin_announcements");
      assertOk(error, "load announcements");
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        audience: r.audience as "leaders" | "everyone",
        subject: r.subject as string,
        body: r.body as string,
        sentCount: Number(r.sent_count),
        createdAt: r.created_at as string,
      }));
    },
    async setDigestEmails(enabled: boolean) {
      const { error } = await supabase.from("profiles").update({ digest_emails: enabled }).eq("user_id", userId);
      assertOk(error, "update digest");
    },
    async listAllGroups(): Promise<AdminGroup[]> {
      const { data, error } = await supabase.rpc("admin_groups");
      assertOk(error, "load groups");
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        name: r.name as string,
        joinCode: r.join_code as string,
        leaderName: r.leader_name as string,
        memberCount: Number(r.member_count),
        messageCount: Number(r.message_count),
        createdAt: r.created_at as string,
      }));
    },
  };
}
