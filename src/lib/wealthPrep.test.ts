import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { anonymizeCase, nameTokens } from "./wealthCase";
import { buildDeck } from "./wealthDeck";
import { normalizePlan, samplePlan } from "./wealthMath";
import { PERSONAS } from "./wealthPersonas";
import { emptyPrep, normalizePrep, prepProgress, resumeBullets } from "./wealthPrep";
import { BEHAVIORAL_PROMPTS, READINESS, TECH_CATEGORIES, TECH_QUESTIONS } from "./wealthPrepContent";
import type { WealthClient } from "../types";

const client = (plan: unknown, tools: Record<string, unknown> = {}): WealthClient => ({ id: "c", name: "x", plan, tools, createdAt: "", updatedAt: "" });

describe("prep content", () => {
  it("has unique ids, real categories, and an answer for every question", () => {
    // Each list keeps its own ratings and answers, so ids only need to be unique within a list.
    for (const ids of [TECH_QUESTIONS.map((q) => q.id), BEHAVIORAL_PROMPTS.map((p) => p.id), READINESS.flatMap((g) => g.items.map((i) => i.id)), PERSONAS.map((p) => p.id)]) {
      expect(new Set(ids).size).toBe(ids.length);
    }
    for (const q of TECH_QUESTIONS) {
      expect(TECH_CATEGORIES).toContain(q.category);
      expect(q.q.length).toBeGreaterThan(12);
      expect(q.a.length).toBeGreaterThan(80);
    }
    expect(TECH_QUESTIONS.length).toBeGreaterThanOrEqual(30);
  });
});

describe("practice clients", () => {
  it("each start as a complete, believable plan with a script and a rubric", () => {
    for (const p of PERSONAS) {
      const plan = normalizePlan(p.plan());
      expect(plan.client.name, p.id).toBe(p.name);
      expect(plan.goals.length, p.id).toBeGreaterThanOrEqual(4);
      expect(plan.snapshot.assets.length, p.id).toBeGreaterThan(0);
      expect(plan.focus.length, p.id).toBe(3);
      expect(plan.model.goalId, p.id).toBe(plan.goals[plan.goals.length - 1].id);
      expect(p.facts.length, p.id).toBeGreaterThanOrEqual(5);
      expect(p.rubric.length, p.id).toBeGreaterThanOrEqual(4);
      expect(new Set(plan.goals.map((g) => g.id)).size).toBe(plan.goals.length);
    }
    expect(new Set(PERSONAS.map((p) => p.level)).size).toBeGreaterThanOrEqual(4);
  });

  it("each can be taken all the way to a presentation, with real numbers", async () => {
    for (const persona of PERSONAS) {
      const plan = persona.plan();
      plan.portfolio.started = true;
      for (const c of plan.portfolio.classes) c.weight = c.id === "lc" ? "60" : c.id === "agg" ? "40" : "0";
      const { pres, titles } = await buildDeck({ plan, tools: {} });
      expect(titles.length, persona.id).toBeGreaterThan(20);
      const buf = (await pres.write({ outputType: "nodebuffer" })) as Buffer;
      const zip = await JSZip.loadAsync(buf);
      const text = (await Promise.all(Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).map((n) => zip.file(n)!.async("string")))).join(" ");
      expect(text, persona.id).not.toMatch(/NaN|undefined|Infinity/);
    }
  }, 120_000);
});

describe("the prep document", () => {
  it("reads a saved document safely and counts progress", () => {
    expect(normalizePrep(null)).toEqual(emptyPrep());
    const d = normalizePrep({ tech: { p1: "confident", p2: "bogus" }, behavioral: { b1: "x".repeat(40) }, journal: [{ id: "j", date: "2026-10-17", view: "v", read: "", idea: "", client: "" }, { nope: 1 }], ready: { s1: true }, stats: { decks: 3 } });
    expect(d.tech).toEqual({ p1: "confident" });
    expect(d.journal).toHaveLength(1);
    expect(d.stats).toEqual({ decks: 3, caseExports: 0 });
    const p = prepProgress(d);
    expect(p.confident).toBe(1);
    expect(p.behavioral).toBe(1);
    expect(p.journal).toBe(1);
    expect(p.readyDone).toBe(1);
  });

  it("drafts resume bullets from real counts and never claims a professional engagement", () => {
    expect(resumeBullets([], emptyPrep())).toEqual([]);
    const plan = samplePlan();
    const prep = normalizePrep({ stats: { decks: 2 }, journal: [{ id: "a", date: "2026-10-17", view: "v", read: "", idea: "", client: "" }] });
    const bullets = resumeBullets([client(plan, { debt: {}, budget: {} })], prep);
    const text = bullets.join(" ");
    expect(text).toMatch(/Built 1 goals-based wealth plan for peers/);
    expect(text).toMatch(/educational, not advisory/);
    expect(text).toMatch(/Modeled 7 client goals/);
    expect(text).toMatch(/Applied 2 personal finance planning models/);
    expect(text).toMatch(/Produced 2 client presentations/);
    expect(text).toMatch(/market journal \(1 entry\)/);
    expect(text).not.toMatch(/Marcus|Rivera/);
  });
});

describe("anonymizing a case", () => {
  it("replaces the client's name everywhere, clears contact details, and optionally the free-text notes", () => {
    const plan = samplePlan();
    plan.goals[0].name = "Marcus's emergency fund";
    plan.swot.S[0].text = "Rivera saves about 20% of tips";
    const tools = { budget: { note: "Marcus Rivera's budget" } };
    const r = anonymizeCase(plan, tools, { label: "Client A", description: "College junior with tip income", removeNotes: true });
    const text = JSON.stringify(r.plan) + JSON.stringify(r.tools);
    expect(text).not.toMatch(/Marcus|Rivera/i);
    expect(r.plan.client.name).toBe("Client A");
    expect(r.plan.client.contact).toBe("");
    expect(r.plan.client.occupation).toBe("College junior with tip income");
    expect(r.plan.notes.discovery).toBe("");
    expect(r.plan.client.psychology).toBe("");
    expect(r.replacements).toBeGreaterThanOrEqual(3);
    expect(r.flags).toEqual([]);
    // The original is untouched.
    expect(plan.client.name).toBe("Marcus Rivera");
    // Keeping the notes keeps them (with the name replaced).
    const kept = anonymizeCase(plan, tools, { label: "Client A", description: "", removeNotes: false });
    expect(kept.plan.notes.discovery.length).toBeGreaterThan(20);
    expect(kept.plan.client.occupation).toBe("Client (details removed)");
  });

  it("flags anything left that looks like an email address or a phone number", () => {
    const plan = samplePlan();
    plan.notes.discovery = "Reach him at jordan.e@example.com or 352-555-0142.";
    const r = anonymizeCase(plan, {}, { label: "Client A", description: "", removeNotes: false });
    expect(r.flags.map((f) => f.where)).toContain("notes.discovery");
    expect(r.flags[0].text).toMatch(/example\.com/);
    const cleared = anonymizeCase(plan, {}, { label: "Client A", description: "", removeNotes: true });
    expect(cleared.flags).toEqual([]);
    expect(nameTokens("Dr. Ana-Lucía O'Neil Jr")).toEqual(["Ana", "Lucía", "O'Neil"]);
    const accented = samplePlan();
    accented.client.name = "Ana Lucía";
    accented.goals[0].name = "Lucía's cushion";
    const a = anonymizeCase(accented, {}, { label: "Client A", description: "", removeNotes: true });
    expect(JSON.stringify(a.plan)).not.toMatch(/Luc/);
  });

  it("builds an anonymized deck whose title says it is a case study", async () => {
    const plan = samplePlan();
    const r = anonymizeCase(plan, {}, { label: "Client A", description: "College junior", removeNotes: true });
    const { pres, filename } = await buildDeck({ plan: r.plan, tools: r.tools, anonymous: true });
    expect(filename).toBe("Client-A-Case-Study.pptx");
    const zip = await JSZip.loadAsync((await pres.write({ outputType: "nodebuffer" })) as Buffer);
    const text = (await Promise.all(Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).map((n) => zip.file(n)!.async("string")))).join(" ");
    expect(text).toContain("Case study: Client A");
    expect(text).toMatch(/anonymized case study/);
    expect(text).not.toMatch(/Marcus|Rivera/);
  }, 60_000);
});
