import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { TOOL_IDS } from "../components/community/workshop/toolCatalog";
import { buildDeck, deckOutline, deckSlideCount, deckToolIds } from "./wealthDeck";
import { emptyPlan, samplePlan } from "./wealthMath";

const all0 = (text: string[]) => text.join(" ");

async function open(input: Parameters<typeof buildDeck>[0], only?: number) {
  const { pres, titles, filename } = await buildDeck(input, { only });
  const buf = (await pres.write({ outputType: "nodebuffer" })) as Buffer;
  const zip = await JSZip.loadAsync(buf);
  const names = Object.keys(zip.files);
  const slides = names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  const text = await Promise.all(slides.map((n) => zip.file(n)!.async("string")));
  return { zip, names, slides, text, titles, filename };
}

describe("the wealth presentation", () => {
  it("lists the focus areas' tools first, then any extras, without repeats", () => {
    const plan = samplePlan();
    plan.deck.tools = ["budget", "debt", "compound"];
    expect(deckToolIds(plan)).toEqual(["debt", "accounts", "house", "budget", "compound"]);
  });

  it("outlines only what the plan can fill, and lets a part be left out", () => {
    const empty = deckOutline({ plan: emptyPlan(), tools: {} });
    const on = (id: string) => empty.find((o) => o.id === id)!;
    expect(on("goals").available).toBe(false);
    expect(on("goals").included).toBe(false);
    expect(on("goals").reason).toBeTruthy();
    expect(on("summary").included).toBe(true);

    const plan = samplePlan();
    plan.deck.skip = ["swot"];
    const o = deckOutline({ plan, tools: {} });
    expect(o.find((x) => x.id === "swot")).toMatchObject({ included: false, available: true });
    expect(o.filter((x) => x.kind === "tool").map((x) => x.tool)).toEqual(["debt", "accounts", "house"]);
  });

  it("builds a deck with a slide, speaker notes and the right charts for each part", async () => {
    const input = { plan: samplePlan(), tools: {} };
    const count = deckSlideCount(deckOutline(input));
    const d = await open(input);
    expect(d.slides).toHaveLength(count);
    expect(d.titles).toHaveLength(count);
    expect(d.titles.slice(0, 3)).toEqual(["Title", "Contents", "Executive summary"]);
    for (const t of ["Key takeaways and options", "Balance sheet", "Goal funding status", "Risk profile", "Investment policy statement", "Methodology appendix", "Asset allocation", "Correlations", "Efficient frontier", "Stress tests", "Fees", "Rebalancing", "Retirement income"]) expect(d.titles).toContain(t);
    // Charts and tables that stand as evidence are numbered, with a source and an as-of date.
    expect(all0(d.text)).toMatch(/Exhibit 1:.* Source: .*as of /);
    expect(d.names.filter((n) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n))).toHaveLength(count);
    expect(d.names.filter((n) => /^ppt\/charts\/chart\d+\.xml$/.test(n)).length).toBeGreaterThanOrEqual(8);
    expect(d.filename).toBe("Marcus-Rivera-Wealth-Plan.pptx");
    const all = d.text.join(" ");
    expect(all).toContain("Marcus Rivera");
    expect(all).toContain("Wealth Plan and Scenario Walkthrough");
    expect(all).not.toMatch(/NaN|undefined|Infinity/);
  }, 60_000);

  it("draws a slide for every one of the 36 toolkit tools, with real numbers", async () => {
    const plan = samplePlan();
    plan.deck.tools = [...TOOL_IDS];
    const d = await open({ plan, tools: {} });
    const toolSlides = d.titles.length - deckSlideCount(deckOutline({ plan: { ...plan, deck: { ...plan.deck, tools: [] } }, tools: {} }));
    expect(toolSlides).toBe(TOOL_IDS.length - 3);
    expect(d.text.join(" ")).not.toMatch(/NaN|undefined|Infinity/);
  }, 120_000);

  it("still builds when the plan is empty or most parts are left out", async () => {
    const d = await open({ plan: emptyPlan(), tools: {} });
    expect(d.slides.length).toBeGreaterThanOrEqual(5);
    expect(d.text.join(" ")).not.toMatch(/NaN|undefined|Infinity/);
    const plan = samplePlan();
    plan.deck.skip = ["swot", "strategy", "model", "scenarios", "education", "cashflow", "schedule", "roadmap", "goals", "recommendation", "snapshot", "goalstatus", "risk", "ips", "methodology", "allocation", "stress", "fees", "retirement", "sensitivity", "cases", "process"];
    const small = await open({ plan, tools: {} });
    expect(small.slides.length).toBeLessThan(15);
  }, 60_000);

  it("uses a tool's own saved numbers, and says when it only has the example", async () => {
    const plan = samplePlan();
    plan.focus = ["debt"];
    const withNumbers = await open({
      plan,
      tools: { debt: { debts: [{ name: "Visa", balance: 3333, aprPercent: 21, minimum: 90 }], extra: 100 } },
    });
    const noNumbers = await open({ plan, tools: {} });
    const find = (d: Awaited<ReturnType<typeof open>>) => d.text.find((t) => t.includes("<a:t>The debts</a:t>")) ?? "";
    expect(find(withNumbers)).toContain("Visa");
    expect(find(withNumbers)).not.toContain("starting example numbers");
    expect(find(noNumbers)).toContain("starting example numbers");
  }, 60_000);

  it("draws the planning-depth slides the plan has numbers for, and drops parts turned off for the client", async () => {
    const plan = samplePlan();
    plan.planning.roth = { ...plan.planning.roth, taxable: "40000", balance: "100000", amount: "20000" };
    plan.planning.location = { ...plan.planning.location, taxable: "100000", deferred: "100000", roth: "50000" };
    plan.planning.gains.lots = [{ id: "a", name: "Index fund", basis: "10000", value: "25000", longTerm: true, sell: true }];
    plan.planning.giving.note = "Give appreciated shares.";
    const on = await open({ plan, tools: {} });
    for (const t of ["Insurance needs", "Roth conversion", "Asset location", "Capital gains", "Charitable giving"]) expect(on.titles).toContain(t);
    expect(on.text.join(" ")).toContain("Give appreciated shares.");
    expect(on.text.join(" ")).not.toMatch(/NaN|undefined|Infinity/);

    plan.setup = { type: "student", modules: { "planning.giving": true } };
    const o = deckOutline({ plan, tools: {} });
    const by = (id: string) => o.find((x) => x.id === id)!;
    expect(by("allocation")).toMatchObject({ included: false, available: false });
    expect(by("insurance").included).toBe(false);
    expect(by("giving").included).toBe(true);
    expect(by("roth").included).toBe(true);
  }, 60_000);
});

describe("deck themes", () => {
  it("keeps text readable in every palette and returns the original colors for the default", async () => {
    const { THEMES, resolvePalette, contrast, normalizeTheme } = await import("./wealthTheme");
    expect(resolvePalette(normalizeTheme(null))).toMatchObject({ navy: "1F3F5E", gold: "C9A24B" });
    for (const t of [...THEMES, { id: "custom", primary: "F2E6A0", accent: "FFF200" }]) {
      const p = resolvePalette({ id: t.id, primary: t.primary, accent: t.accent });
      expect(contrast(p.navy, "FFFFFF")).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.goldText, "FFFFFF")).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.gold, p.deep)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("paints the deck in the chosen colors and none of the default navy", async () => {
    const { resolvePalette } = await import("./wealthTheme");
    const plan = samplePlan();
    plan.deck.theme = { id: "modern", primary: "0F4C5C", accent: "E36414" };
    const d = await open({ plan, tools: {} });
    const pal = resolvePalette(plan.deck.theme);
    const xml = d.text.join(" ");
    expect(xml).toContain(pal.navy);
    expect(xml).not.toContain("1F3F5E");
    // The next default deck is not affected by the earlier one.
    const back = await open({ plan: samplePlan(), tools: {} }, 3);
    expect(back.text.join(" ")).toContain("1F3F5E");
  }, 60_000);

  it("describes the presenter as a student and mentions the SIE only once it is passed", async () => {
    const plan = samplePlan();
    plan.deck.presenter = "Nathaniel Trujillo";
    const before = (await open({ plan, tools: {} })).text.join(" ");
    expect(before).toContain("Presented by Nathaniel Trujillo");
    expect(before).toContain("Student, Daily Bread Wealth Management Track");
    expect(before).toMatch(/not a registered investment adviser/);
    expect(before).not.toMatch(/Securities Industry Essentials/);
    expect(before).not.toMatch(/\bwe recommend\b/i);
    plan.deck.sie = true;
    const after = (await open({ plan, tools: {} })).text.join(" ");
    expect(after).toMatch(/Securities Industry Essentials \(SIE\) exam, which is not a license/);
  }, 60_000);
});

describe("scenario slides", () => {
  it("adds the base, upside and downside slide once there are scenarios, and a sensitivity slide whenever there is a model", async () => {
    const { defaultScenarios } = await import("./wealthScenarios");
    const { uid } = await import("./wealthMath");
    const plan = samplePlan();
    const before = await open({ plan, tools: {} });
    expect(before.titles).not.toContain("Base, upside and downside");
    expect(before.titles).toContain("What moves the outcome");
    plan.scenarios.list = defaultScenarios(plan.model, uid);
    const d = await open({ plan, tools: {} });
    expect(d.titles).toContain("Base, upside and downside");
    expect(d.text.join(" ")).toContain("Downside");
    expect(d.text.join(" ")).not.toMatch(/NaN|undefined|Infinity/);
  }, 60_000);
});

describe("process, market and anticipated questions", () => {
  it("puts anticipated questions in the speaker notes, and honors edits, hidden ones and the presenter's own", async () => {
    const plan = samplePlan();
    plan.talk = { hidden: ["model:3"], edits: { "model:1": { a: "MY OWN ANSWER ABOUT EARLY LOSSES" } }, custom: { model: [{ id: "x", q: "What about crypto?", a: "I cannot advise on that; see a licensed professional." }] } };
    const d = await open({ plan, tools: {} });
    const notes = await Promise.all(d.names.filter((n) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n)).map((n) => d.zip.file(n)!.async("string")));
    const all = notes.join(" ");
    expect(all).toContain("ANTICIPATED QUESTIONS");
    expect(all).toContain("Is this financial advice?");
    expect(all).toContain("MY OWN ANSWER ABOUT EARLY LOSSES");
    expect(all).toContain("What about crypto?");
    expect(all).not.toContain("Why should I trust a simulation?");
  }, 60_000);

  it("draws the process slide and, once filled in, the market snapshot", async () => {
    const plan = samplePlan();
    plan.client.cadence = "Monthly";
    const first = await open({ plan, tools: {} });
    expect(first.titles).toContain("How we will work together");
    expect(first.titles).not.toContain("Market snapshot");
    expect(first.text.join(" ")).toContain("You decide what to do");
    plan.market.headline = "Rates are the story this quarter";
    plan.market.indicators[1] = { ...plan.market.indicators[1], value: "4.1%", asOf: "2026-10-01", source: "U.S. Treasury" };
    const d = await open({ plan, tools: {} });
    expect(d.titles).toContain("Market snapshot");
    expect(d.text.join(" ")).toContain("Rates are the story this quarter");
    expect(d.text.join(" ")).toContain("U.S. Treasury");
  }, 60_000);
});
