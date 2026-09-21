import type { IncomeCadence, IncomeStream } from "../types";

const MONTHLY_FACTOR: Record<IncomeCadence, number> = {
  one_time: 0, // excluded from recurring monthly-equivalent
  weekly: 52 / 12,
  biweekly: 26 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  annually: 1 / 12,
};

export const CADENCE_LABEL: Record<IncomeCadence, string> = {
  one_time: "One-time",
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
};

/** Approximate recurring monthly value of a single stream (one-time = 0). */
export function monthlyEquivalent(stream: Pick<IncomeStream, "amount" | "cadence">): number {
  return stream.amount * MONTHLY_FACTOR[stream.cadence];
}

export function totalMonthlyEquivalent(streams: IncomeStream[]): number {
  return streams.reduce((sum, s) => sum + monthlyEquivalent(s), 0);
}
