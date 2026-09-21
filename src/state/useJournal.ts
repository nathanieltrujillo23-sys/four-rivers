import { useCallback, useEffect, useState } from "react";
import type { CourseRepository } from "../data/repository";
import type { JournalEntry } from "../types";
import { uid } from "../utils/id";

export type JournalInput = Pick<JournalEntry, "title" | "body" | "entryDate" | "riverNumber">;

function sortEntries(list: JournalEntry[]): JournalEntry[] {
  return [...list].sort(
    (a, b) => b.entryDate.localeCompare(a.entryDate) || b.createdAt.localeCompare(a.createdAt)
  );
}

/** Set when the journal table doesn't exist yet (migration not run). */
export const JOURNAL_SETUP_HINT =
  "The journal isn't set up in your database yet. Run supabase/002_journal.sql in the Supabase SQL editor, then reload.";

function friendlyError(message: string): { message: string; needsSetup: boolean } {
  const missing = /journal_entries/.test(message) && /(schema cache|does not exist|relation)/i.test(message);
  return missing ? { message: JOURNAL_SETUP_HINT, needsSetup: true } : { message, needsSetup: false };
}

/**
 * Journal state. Kept separate from CourseContext on purpose: the journal loads
 * lazily on its own page, so a missing table can never break the course.
 */
export function useJournal(repository: CourseRepository) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; needsSetup: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    repository
      .listJournalEntries()
      .then((rows) => {
        if (!cancelled) setEntries(sortEntries(rows));
      })
      .catch((err: Error) => {
        if (!cancelled) setError(friendlyError(err.message));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  const add = useCallback(
    async (input: JournalInput) => {
      const now = new Date().toISOString();
      const row: JournalEntry = { id: uid(), createdAt: now, updatedAt: now, ...input };
      await repository.insertJournalEntry(row);
      setEntries((prev) => sortEntries([row, ...prev]));
    },
    [repository]
  );

  const update = useCallback(
    async (id: string, input: JournalInput) => {
      const existing = entries.find((e) => e.id === id);
      if (!existing) return;
      const row: JournalEntry = { ...existing, ...input, updatedAt: new Date().toISOString() };
      await repository.updateJournalEntry(row);
      setEntries((prev) => sortEntries(prev.map((e) => (e.id === id ? row : e))));
    },
    [repository, entries]
  );

  const remove = useCallback(
    async (id: string) => {
      await repository.deleteJournalEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    },
    [repository]
  );

  return { entries, loading, error, add, update, remove };
}
