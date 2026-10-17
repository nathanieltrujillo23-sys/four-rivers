import { describe, expect, it } from "vitest";
import { CHECKLIST, checklistProgress, emptyCompliance, normalizeCompliance, roleProblem, scanForPromises } from "./wealthCompliance";
import { followUpEmail } from "./wealthFollowUp";
import { preflight } from "./wealthPreflight";
import { actionSummary, emptyTrack, normalizeTrack } from "./wealthTrack";
import { diffPlans } from "./wealthVersions";
import { emptyPlan, normalizePlan, samplePlan } from "./wealthMath";

describe("compliance", () => {
  it("flags titles and designations in a role line, and accepts a student role", () => {
    expect(roleProblem("Student, Daily Bread Wealth Management Track")).toBeNull();
    for (const bad of ["Wealth Advisor", "CFP candidate", "Licensed planner", "Registered representative", "Financial planner"]) expect(roleProblem(bad), bad).toBeTruthy();
  });

  it("flags promises and tells people what to buy, but not ordinary assumptions", () => {
    const flags = scanForPromises([
      { where: "a", text: "This fund is risk-free and will earn 10%." },
      { where: "b", text: "You should buy Apple." },
      { where: "c", text: "We assume a 6% return, which is not guaranteed." },
    ]);
    expect(flags.map((f) => f.where)).toEqual(["a", "b"]);
  });

  it("tracks checklist progress, including the presenter's own items", () => {
    const c = emptyCompliance();
    expect(checklistProgress(c)).toEqual({ done: 0, total: CHECKLIST.length });
    c.done.educational = "2026-10-17";
    c.custom = [{ id: "x", text: "Called the track leader", done: true }, { id: "y", text: "", done: true }];
    expect(checklistProgress(c)).toEqual({ done: 2, total: CHECKLIST.length + 1 });
    expect(normalizeCompliance({ done: { educational: "d", bogus: "d", title: 4 } }).done).toEqual({ educational: "d" });
  });
});

describe("pre-flight review", () => {
  it("passes a clean plan except the items only the presenter can confirm", () => {
    const plan = samplePlan();
    plan.deck.presenter = "Nathaniel Trujillo";
    const items = preflight(plan);
    expect(items.find((i) => i.id === "disclosures")?.level).toBe("pass");
    expect(items.find((i) => i.id === "role")?.level).toBe("pass");
    expect(items.find((i) => i.id === "promises")?.level).toBe("pass");
    expect(items.find((i) => i.id === "checklist")?.level).toBe("warn");
  });

  it("warns about a bad role, a promise, a named security, a missing source and a left-out disclosures slide", () => {
    const plan = samplePlan();
    plan.deck.role = "Wealth Advisor";
    plan.notes.discovery = "He is sure this is a guaranteed winner. Buy TSLA now.";
    plan.portfolio = { ...plan.portfolio, started: true, source: "", asOf: "" };
    plan.portfolio.classes = plan.portfolio.classes.map((c, i) => ({ ...c, weight: i === 0 ? "100" : "0" }));
    plan.deck.skip = ["disclosures"];
    const level = (id: string) => preflight(plan).find((i) => i.id === id)?.level;
    expect(level("role")).toBe("warn");
    expect(level("promises")).toBe("warn");
    expect(level("securities")).toBe("warn");
    expect(level("cma")).toBe("warn");
    expect(level("disclosures")).toBe("warn");
  });
});

describe("tracking and the follow-up email", () => {
  it("summarizes open and overdue items", () => {
    const t = normalizeTrack({ actions: [{ id: "1", text: "Send statements", owner: "client", due: "2026-10-01", done: false }, { id: "2", text: "Draft the plan", owner: "me", due: "2026-11-01", done: false }, { id: "3", text: "Done", owner: "me", due: "", done: true }, { id: "4", text: "  ", owner: "me", due: "", done: false }] });
    expect(actionSummary(t, "2026-10-17")).toEqual({ open: 2, overdue: 1, nextDue: "2026-10-01" });
    expect(normalizeTrack({ stage: "nope" }).stage).toBe(emptyTrack().stage);
  });

  it("drafts an email with the agreed actions, the next meeting, and the educational reminder", () => {
    const plan = samplePlan();
    plan.deck.presenter = "Nathaniel Trujillo";
    plan.client.contact = "marcus.rivera@email.com · text preferred";
    plan.track = { ...plan.track, nextMeeting: "2026-11-14", actions: [{ id: "a", text: "Send your last three pay stubs", owner: "client", due: "2026-10-30", done: false }, { id: "b", text: "Build the portfolio", owner: "me", due: "", done: false }], emailTone: "friendly", emailNote: "" };
    const e = followUpEmail(plan);
    expect(e.to).toBe("marcus.rivera@email.com");
    expect(e.body).toMatch(/^Hi Marcus,/);
    expect(e.body).toContain("Send your last three pay stubs (by October 30, 2026)");
    expect(e.body).toContain("Things I will do:");
    expect(e.body).toContain("November 14, 2026");
    expect(e.body).toMatch(/I am a student, not a licensed adviser/);
    expect(e.body).toMatch(/Nathaniel Trujillo\nStudent, Daily Bread/);
    plan.track.emailTone = "formal";
    expect(followUpEmail(plan).body).toMatch(/^Dear Marcus Rivera,/);
  });
});

describe("what changed between versions", () => {
  it("lists changed goals, saving and risk in plain words, and nothing when nothing changed", () => {
    const a = samplePlan();
    const b = normalizePlan(JSON.parse(JSON.stringify(a)));
    expect(diffPlans(a, b)).toEqual([]);
    b.model.monthly = "900";
    b.goals[0].amount = "8000";
    b.goals.pop();
    b.client.risk = "Conservative";
    const d = diffPlans(a, b).join("\n");
    expect(d).toMatch(/Monthly saving: \$400 to \$900/);
    expect(d).toMatch(/target: \$6,000 to \$8,000/);
    expect(d).toMatch(/Goal removed/);
    expect(emptyPlan().track.stage).toBe("discovery");
  });
});
