import { supabase } from "../lib/supabaseClient";
import type {
  CourseProgress,
  CourseSnapshot,
  GivingEntry,
  IncomeStream,
  InvestmentEntry,
  JournalEntry,
  Profile,
  RiverNumber,
  Role,
  SavingsContribution,
  SavingsGoal,
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
  };
}

function toProgress(row: Record<string, unknown>): CourseProgress {
  return {
    riverNumber: Number(row.river_number) as RiverNumber,
    lessonViewedAt: (row.lesson_viewed_at as string) ?? null,
    completedAt: (row.completed_at as string) ?? null,
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
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
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
      const [progress, income, goals, contributions, investments, giving] = await Promise.all([
        supabase.from("course_progress").select("*").eq("user_id", userId),
        supabase.from("income_streams").select("*").order("created_at", { ascending: false }),
        supabase.from("savings_goals").select("*").order("created_at", { ascending: false }),
        supabase.from("savings_contributions").select("*").order("created_at", { ascending: false }),
        supabase.from("investment_entries").select("*").order("created_at", { ascending: false }),
        supabase.from("giving_entries").select("*").order("created_at", { ascending: false }),
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
      };
    },

    async markLessonViewed(river: RiverNumber) {
      // Race-safe and idempotent: create the row if missing (a concurrent insert
      // is a no-op), then stamp lesson_viewed_at only where it is still null.
      const { error: rowErr } = await supabase
        .from("course_progress")
        .upsert(
          { user_id: userId, river_number: river },
          { onConflict: "user_id,river_number", ignoreDuplicates: true }
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
      const { error } = await supabase
        .from("course_progress")
        .upsert(
          {
            user_id: userId,
            river_number: river,
            completed_at: completedAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,river_number" }
        );
      assertOk(error, "set river completed_at");
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
  };
}
