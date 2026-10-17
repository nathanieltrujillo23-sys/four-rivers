import { describe, expect, it } from "vitest";
import { TOOL_IDS } from "../components/community/workshop/toolCatalog";
import { TOOL_MATH } from "./wealthToolMath";
import { goalMath, portfolioMath, projectionMath, retirementMath, riskMath, snapshotMath } from "./wealthCoreMath";
import { emptyPlan, samplePlan } from "./wealthMath";

describe("how-it-is-calculated notes", () => {
  it("has an explanation for each of the 36 toolkit tools", () => {
    for (const id of TOOL_IDS) {
      expect(TOOL_MATH[id], id).toBeTruthy();
      expect(TOOL_MATH[id].length).toBeGreaterThan(0);
      for (const line of TOOL_MATH[id]) expect(line.length).toBeGreaterThan(30);
    }
    expect(Object.keys(TOOL_MATH)).toHaveLength(TOOL_IDS.length);
  });

  it("writes the core notes with the client's own numbers, and never prints NaN", () => {
    for (const plan of [samplePlan(), emptyPlan()]) {
      const all = [projectionMath, goalMath, snapshotMath, riskMath, portfolioMath, retirementMath].flatMap((f) => f(plan)).join(" ");
      expect(all).not.toMatch(/NaN|undefined|Infinity/);
    }
    expect(projectionMath(samplePlan()).join(" ")).toMatch(/2,000 simulated futures/);
    expect(snapshotMath(samplePlan()).join(" ")).toMatch(/Net worth = total assets/);
  });
});
