import { useCallback, useEffect, useState } from "react";
import type { CourseRepository } from "../data/repository";
import type { Group, GroupVerse } from "../types";

export interface GroupsError {
  message: string;
  /** True when the Community tables or functions don't exist yet (migration 011 not run). */
  needsSetup: boolean;
}

export function toGroupsError(err: unknown): GroupsError {
  const message = err instanceof Error ? err.message : String(err);
  const missing =
    /(groups|group_members|group_messages|group_prayers|create_group|join_group|group_overview|group_prayer_wall|request_leader|admin_)/.test(
      message,
    ) && /(schema cache|does not exist|relation|function|Could not find)/i.test(message);
  return { message, needsSetup: missing };
}

/**
 * The learner's groups. Kept apart from CourseContext on purpose (like the
 * journal): the tables may not exist yet, and that must never break the course.
 */
export function useGroups(repository: CourseRepository) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<GroupsError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    repository
      .listMyGroups()
      .then((rows) => {
        if (cancelled) return;
        setGroups(rows);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(toGroupsError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repository, reloadKey]);

  const create = useCallback(
    async (name: string, displayName: string) => {
      const g = await repository.createGroup(name.trim(), displayName);
      setGroups((prev) => [...prev, g]);
      return g;
    },
    [repository],
  );

  const join = useCallback(
    async (code: string, displayName: string) => {
      const g = await repository.joinGroup(code.trim(), displayName);
      setGroups((prev) => (prev.some((x) => x.id === g.id) ? prev : [...prev, g]));
      return g;
    },
    [repository],
  );

  const leave = useCallback(
    async (groupId: string, userId: string) => {
      await repository.removeGroupMember(groupId, userId);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    },
    [repository],
  );

  const remove = useCallback(
    async (groupId: string) => {
      await repository.deleteGroup(groupId);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    },
    [repository],
  );

  const setVerse = useCallback(
    async (groupId: string, verse: Omit<GroupVerse, "updatedAt"> | null) => {
      await repository.setGroupVerse(groupId, verse);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, verse: verse ? { ...verse, updatedAt: new Date().toISOString() } : null }
            : g,
        ),
      );
    },
    [repository],
  );

  return { groups, loading, error, reload, create, join, leave, remove, setVerse };
}
