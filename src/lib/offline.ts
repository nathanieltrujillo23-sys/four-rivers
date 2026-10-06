import { useEffect, useState } from "react";
import type { CourseSnapshot } from "../types";
import type { PassageText } from "./bibleSearch";

/** Whether the browser thinks it has a connection, updated as it comes and goes. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
/** False when the device has no room (or no storage), so the caller can say the copy was not kept. */
function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ---- A light copy of the learner's course state, so lessons open without a connection ---- */

const snapshotKey = (userId: string) => `four-rivers:offline-snapshot:${userId}`;

/**
 * Only what is needed to read lessons offline (profile, progress, which modules were read). Money entries are
 * deliberately left out: they are personal, and the device copy should hold as little as possible.
 */
export function saveLightSnapshot(snapshot: CourseSnapshot): void {
  write(snapshotKey(snapshot.profile.userId), {
    ...snapshot,
    incomeStreams: [],
    savingsGoals: [],
    savingsContributions: [],
    investmentEntries: [],
    givingEntries: [],
  });
}

export function loadLightSnapshot(userId: string): CourseSnapshot | null {
  return read<CourseSnapshot>(snapshotKey(userId));
}

export function clearOfflineData(userId: string): void {
  try {
    localStorage.removeItem(snapshotKey(userId));
    localStorage.removeItem(readingsKey(userId));
  } catch {
    /* ignore */
  }
}

/* ---- Group readings saved for offline (KJV only, which is public domain) ---- */

export interface SavedReading {
  groupId: string;
  groupName: string;
  date: string;
  passages: string;
  parts: { label: string; book: number; chapters: PassageText[] }[];
}

const readingsKey = (userId: string) => `four-rivers:offline-readings:${userId}`;

export function loadSavedReadings(userId: string): SavedReading[] {
  return read<SavedReading[]>(readingsKey(userId)) ?? [];
}

/** Replaces the saved readings of one group, keeping any other group's. */
export function saveReadings(userId: string, groupId: string, readings: SavedReading[]): boolean {
  const others = loadSavedReadings(userId).filter((r) => r.groupId !== groupId);
  return write(readingsKey(userId), [...others, ...readings]);
}
