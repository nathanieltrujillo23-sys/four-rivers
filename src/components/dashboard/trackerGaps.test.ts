import { describe, expect, it } from "vitest";
import { trackerGaps } from "./trackerGaps";

const none = { incomeStreams: [], savingsGoals: [], savingsContributions: [], investmentEntries: [], givingEntries: [] };

describe("trackerGaps", () => {
  it("flags every tracker for a brand-new learner", () => {
    expect(trackerGaps(none)).toEqual([true, true, true, true]);
  });
  it("clears a tracker once it has an entry (a saving goal alone counts for saving)", () => {
    expect(trackerGaps({ ...none, incomeStreams: [{} as never] })).toEqual([false, true, true, true]);
    expect(trackerGaps({ ...none, savingsGoals: [{} as never] })).toEqual([true, false, true, true]);
    expect(trackerGaps({ ...none, savingsContributions: [{} as never] })).toEqual([true, false, true, true]);
    expect(trackerGaps({ ...none, investmentEntries: [{} as never], givingEntries: [{} as never] })).toEqual([true, true, false, false]);
  });
});
