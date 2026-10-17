import { useCallback, useEffect, useState } from "react";
import type { CourseRepository } from "../data/repository";
import type { WealthCase, WealthCaseReview } from "../types";

/** The shared case library and the reviews this person can read (their own, and those of their cases). */
export function useWealthCommunity(repository: CourseRepository) {
  const [cases, setCases] = useState<WealthCase[] | null>(null);
  const [reviews, setReviews] = useState<WealthCaseReview[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, r] = await Promise.all([repository.listWealthCases(), repository.listWealthCaseReviews()]);
      setCases(c);
      setReviews(r);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [repository]);

  useEffect(() => {
    // Loading starts here and ends in setState once the request returns, the same shape as the other Wealth hooks.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return { cases, reviews, error, reload: load };
}
