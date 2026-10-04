import { useCallback, useEffect, useState } from "react";
import type { CourseRepository } from "../data/repository";
import type { GroupNotification } from "../types";

const POLL_MS = 30_000;

/**
 * The bell's data: recent joins and exam passes in my groups. Refreshes every
 * 30 seconds and whenever the tab regains focus, so a new member shows up
 * without a reload.
 */
export function useNotifications(repository: CourseRepository | null) {
  const [items, setItems] = useState<GroupNotification[]>([]);

  const refresh = useCallback(async () => {
    if (!repository) return;
    try {
      setItems(await repository.listNotifications());
    } catch {
      // Before migration 014 is applied this simply stays empty.
    }
  }, [repository]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const markSeen = useCallback(async () => {
    if (!repository) return;
    try {
      await repository.markNotificationsSeen();
    } catch {
      /* the count will clear on the next successful call */
    }
  }, [repository]);

  return { items, unread: items.filter((n) => n.unread).length, refresh, markSeen };
}
