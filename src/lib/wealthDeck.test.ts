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
    for (const t of ["Recommendation", "Balance sheet", "Goal funding status", "Risk profile", "Investment policy statement", "Methodology appendix", "Asset allocation", "Correlations", "Efficient frontier", "Stress tests", "Fees", "Rebalancing", "Retirement income"]) expect(d.titles).toContain(t);
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
    plan.deck.skip = ["swot", "strategy", "model", "scenarios", "education", "cashflow", "schedule", "roadmap", "goals", "recommendation", "snapshot", "goalstatus", "risk", "ips", "methodology", "allocation", "stress", "fees", "retirement"];
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
