/**
 * Runs the admin and leader screens' data calls against the real SQL functions (on an in-process Postgres),
 * through the app's own repository code. This catches a mismatch between what the database returns and what the
 * screens expect, which a hand-written mock would not.
 */
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { SUPABASE_SHIM, migrationFiles } from "../../scripts/pg-shim.mjs";
import { createSupabaseRepository } from "./supabaseRepository";

const db = new PGlite();
let claims = "";

const ID = {
  admin: "00000000-0000-0000-0000-0000000000a1",
  leader: "00000000-0000-0000-0000-0000000000b1",
  maria: "00000000-0000-0000-0000-0000000000c1",
  sam: "00000000-0000-0000-0000-0000000000d1",
  group: "00000000-0000-0000-0000-00000000aaaa",
};

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    /** Calls a database function as the signed-in person, the way Supabase's REST layer does. */
    rpc: async (name: string, args: Record<string, unknown> = {}) => {
      const keys = Object.keys(args);
      const params = keys.map((k, i) => `${k} => $${i + 1}${Array.isArray(args[k]) ? "::int[]" : ""}`).join(", ");
      try {
        await db.exec(`select set_config('request.jwt.claims', '${claims}', false); set role authenticated;`);
        const res = await db.query<Record<string, unknown>>(
          `select * from ${name}(${params})`,
          keys.map((k) => args[k]),
        );
        const rows = res.rows;
        const single = rows.length === 1 && Object.keys(rows[0]).length === 1 && name in rows[0];
        return { data: single ? rows[0][name] : rows, error: null };
      } catch (err) {
        return { data: null, error: { message: (err as Error).message } };
      } finally {
        await db.exec("reset role");
      }
    },
  },
}));

const as = (id: string) => {
  claims = JSON.stringify({ sub: id, role: "authenticated" });
};

beforeAll(async () => {
  await db.exec(SUPABASE_SHIM);
  for (const f of migrationFiles()) await db.exec(f.sql);
  await db.exec(`
    insert into auth.users (id, email, aud, role, created_at, last_sign_in_at) values
      ('${ID.admin}', 'admin@test.local', 'authenticated', 'authenticated', now() - interval '60 days', now() - interval '1 day'),
      ('${ID.leader}', 'lee@test.local', 'authenticated', 'authenticated', now() - interval '30 days', now() - interval '2 days'),
      ('${ID.maria}', 'maria@test.local', 'authenticated', 'authenticated', now() - interval '20 days', now() - interval '3 days'),
      ('${ID.sam}', 'sam@test.local', 'authenticated', 'authenticated', now() - interval '3 days', null);
    update profiles set role = 'admin' where user_id = '${ID.admin}';
    update profiles set leader_status = 'approved', display_name = 'Lee' where user_id = '${ID.leader}';
    update profiles set display_name = 'Maria', full_name = 'Maria Lopez', last_seen_at = now() - interval '2 hours',
      exam_passed_at = now() - interval '1 day', exam_best_score = 44, challenge_started_at = now() - interval '10 days'
      where user_id = '${ID.maria}';
    insert into course_progress (user_id, river_number, lesson_viewed_at, completed_at, quiz_passed_at, quiz_best_score) values
      ('${ID.maria}', 1, now() - interval '15 days', now() - interval '12 days', now() - interval '12 days', 9),
      ('${ID.maria}', 2, now() - interval '10 days', null, null, 6),
      ('${ID.sam}', 1, now() - interval '1 day', null, null, null);
    insert into module_views (user_id, section, module_index, viewed_at) values
      ('${ID.maria}', 'introduction', 0, now() - interval '5 days'),
      ('${ID.maria}', '1', 0, now() - interval '4 days'),
      ('${ID.maria}', '1', 1, now() - interval '1 hour'),
      ('${ID.sam}', '1', 0, now() - interval '1 day');
    insert into income_streams (user_id, name, amount) values ('${ID.maria}', 'Job', 1000), ('${ID.maria}', 'Side', 200);
    insert into giving_entries (user_id, recipient, amount) values ('${ID.maria}', 'Church', 50);
    insert into groups (id, name, join_code, leader_id) values ('${ID.group}', 'Tuesday', '1234', '${ID.leader}');
    insert into group_members (group_id, user_id, display_name) values
      ('${ID.group}', '${ID.leader}', 'Lee'), ('${ID.group}', '${ID.maria}', 'Maria'), ('${ID.group}', '${ID.sam}', 'Sam');
  `);
});

describe("admin screens against the real database functions", () => {
  it("lists learners with when each was last active", async () => {
    as(ID.admin);
    const learners = await createSupabaseRepository(ID.admin).listLearners();
    expect(learners).toHaveLength(4);
    const maria = learners.find((l) => l.userId === ID.maria)!;
    expect(maria).toMatchObject({ fullName: "Maria Lopez", displayName: "Maria", email: "maria@test.local" });
    // Last seen two hours ago beats the sign-in three days ago.
    expect(Date.now() - new Date(maria.lastActiveAt!).getTime()).toBeLessThan(3 * 3600_000);
    // Someone who never signed in and never opened the app has no last-active date.
    expect(learners.find((l) => l.userId === ID.sam)!.lastActiveAt).toBeNull();
  });

  it("shows one learner's activity and progress", async () => {
    as(ID.admin);
    const a = await createSupabaseRepository(ID.admin).getLearnerActivity(ID.maria);
    expect(a).toMatchObject({
      email: "maria@test.local",
      examBestScore: 44,
      modulesRead: 3,
      entries: { income: 2, savings: 0, investing: 0, giving: 1 },
    });
    expect(a.rivers.map((r) => [r.river, !!r.completedAt, r.quizBestScore])).toEqual([
      [1, true, 9],
      [2, false, 6],
    ]);
    expect(a.groups).toEqual([expect.objectContaining({ name: "Tuesday", role: "member", readingsChecked: 0 })]);
    // Newest first, with the section and lesson number the screen turns into a title.
    expect(a.recent.map((r) => `${r.section}:${r.index}`)).toEqual(["1:1", "1:0", "introduction:0"]);
    expect(a.lastSeenAt).not.toBeNull();
  });

  it("builds the analytics page's numbers", async () => {
    as(ID.admin);
    const repo = createSupabaseRepository(ID.admin);
    const a = await repo.getAnalytics();
    expect(a).toMatchObject({ learners: 4, started: 2, examPassed: 1, challengeStarted: 1, active7d: 1, new7d: 1 });
    expect(a.rivers).toHaveLength(4);
    expect(a.rivers[0]).toMatchObject({ river: 1, started: 2, completed: 1, quizPassed: 1, avgBestScore: 9 });
    expect(a.signupsByWeek.reduce((n, w) => n + w.count, 0)).toBe(4);

    // Quiz attempts feed the "most missed questions" list.
    as(ID.maria);
    await repo.recordQuestionStats("q1", 10, [2, 5]);
    await repo.recordQuestionStats("q1", 10, [2]);
    as(ID.admin);
    const stats = await repo.getQuestionStats();
    expect(stats.find((s) => s.section === "q1" && s.idx === 2)).toMatchObject({ attempts: 2, misses: 2 });
    expect(stats.find((s) => s.section === "q1" && s.idx === 5)).toMatchObject({ attempts: 2, misses: 1 });
    expect(stats.find((s) => s.section === "q1" && s.idx === 0)).toMatchObject({ attempts: 2, misses: 0 });
  });

  it("keeps all of it away from people who are not admins", async () => {
    as(ID.maria);
    const repo = createSupabaseRepository(ID.maria);
    await expect(repo.listLearners()).rejects.toThrow(/not allowed/);
    await expect(repo.getLearnerActivity(ID.sam)).rejects.toThrow(/not allowed/);
    await expect(repo.getAnalytics()).rejects.toThrow(/not allowed/);
    await expect(repo.getQuestionStats()).rejects.toThrow(/not allowed/);
  });

  it("gives a leader, and only a leader, each member's course progress", async () => {
    as(ID.leader);
    const rows = await createSupabaseRepository(ID.leader).getMemberCourseProgress(ID.group);
    expect(rows).toHaveLength(3);
    expect(rows.find((r) => r.userId === ID.maria)).toMatchObject({ riversComplete: 1, modulesRead: 3, examPassed: true });
    expect(rows.find((r) => r.userId === ID.sam)).toMatchObject({ riversComplete: 0, examPassed: false });
    as(ID.sam);
    await expect(createSupabaseRepository(ID.sam).getMemberCourseProgress(ID.group)).rejects.toThrow(/not allowed/);
  });
});
