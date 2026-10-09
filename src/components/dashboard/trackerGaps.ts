import type { CourseSnapshot } from "../../types";

/**
 * Which of the four river trackers (income, saving, investing, giving) have nothing in them yet. The dashboard's numbers
 * are added up from these, so an empty tracker means an empty number; the dashboard puts a note over each one.
 */
export function trackerGaps(s: Pick<CourseSnapshot, "incomeStreams" | "savingsGoals" | "savingsContributions" | "investmentEntries" | "givingEntries">): [boolean, boolean, boolean, boolean] {
  return [
    s.incomeStreams.length === 0,
    s.savingsGoals.length === 0 && s.savingsContributions.length === 0,
    s.investmentEntries.length === 0,
    s.givingEntries.length === 0,
  ];
}
