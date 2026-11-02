import { describe, expect, it } from "vitest";
import { PORTFOLIO_CHECKS, portfolioSections, reviewsGiven } from "./careerPortfolio";
import { emptyIb } from "./ibWorkspace";
import { emptyConsulting } from "./consultingWorkspace";
import { emptyPrep } from "./wealthPrep";
import { roleProblem } from "./wealthCompliance";

describe("career portfolio", () => {
  it("shows only the spaces the person has, with honest counts and no invented bullets", () => {
    expect(portfolioSections({})).toEqual([]);
    const ib = { ...emptyIb(), deals: [{ id: "d", date: "", company: "Example Co", kind: "IPO", size: "", why: "", takeaway: "", source: "" }], tech: { ac1: "confident" as const, va1: "getting" as const } };
    const [s] = portfolioSections({ ib });
    expect(s.id).toBe("ib");
    expect(s.facts.find(([k]) => k.startsWith("Technical"))?.[1]).toBe("1 of 36");
    expect(s.facts.find(([k]) => k.startsWith("Deals"))?.[1]).toBe("1");
    expect(s.bullets.join(" ")).toMatch(/rated 1 as ready/);
    expect(s.bullets.join(" ")).toMatch(/not real transactions/);
    // Nothing done yet: no bullets that claim work.
    const empty = portfolioSections({ ib: emptyIb() })[0];
    expect(empty.bullets).toEqual([]);
  });

  it("summarizes consulting practice with the rubric averages and drill scores", () => {
    const c = {
      ...emptyConsulting(),
      cases: [
        { id: "1", date: "2026-10-01", kind: "Profitability", partner: "", notes: "", scores: { structure: 3, quant: 4, insight: 0, communication: 3 } },
        { id: "2", date: "2026-10-05", kind: "Market entry", partner: "", notes: "", scores: { structure: 4, quant: 2, insight: 0, communication: 3 } },
      ],
      drills: [{ date: "2026-10-02", score: 8, total: 10, seconds: 200 }],
      stories: { lead: "Situation: a club had no plan. Task: lead it. Action: I set weekly goals. Result: attendance doubled in a semester." },
    };
    const [s] = portfolioSections({ consulting: c });
    expect(s.facts.find(([k]) => k.startsWith("Practice cases"))?.[1]).toBe("2");
    expect(s.facts.find(([k]) => k.startsWith("Average"))?.[1]).toBe("structure 3.5, quantitative 3, communication 3");
    expect(s.bullets.join(" ")).toMatch(/Completed 2 practice cases across 2 case types/);
    expect(s.bullets.join(" ")).toMatch(/averaging 80% correct/);
    expect(s.bullets.join(" ")).toMatch(/1 fit story/);
  });

  it("builds the wealth section from the prep document and the client plans", () => {
    const [s] = portfolioSections({ wealth: { prep: { ...emptyPrep(), stats: { decks: 2, caseExports: 1 } }, clients: [], cases: [], reviewsGiven: 3 } });
    expect(s.id).toBe("wealth");
    expect(s.facts.find(([k]) => k.startsWith("Presentations"))?.[1]).toBe("2");
    expect(s.facts.find(([k]) => k.startsWith("Peer reviews"))?.[1]).toBe("3");
  });

  it("has a checklist that covers identity, honesty, confidentiality, titles and performance, and counts only my own reviews", () => {
    expect(PORTFOLIO_CHECKS.map((c) => c.id)).toEqual(["anon", "honest", "confidential", "title", "models", "performance"]);
    expect(reviewsGiven([{ reviewerId: "a" }, { reviewerId: "b" }, { reviewerId: "a" }] as never, "a")).toBe(2);
    expect(roleProblem("CFA candidate")).toBeTruthy();
  });
});
