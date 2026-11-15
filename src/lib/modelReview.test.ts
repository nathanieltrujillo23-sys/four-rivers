import { describe, expect, it } from "vitest";
import { createDemoRepository } from "../data/demoRepository";
import { MODEL_KEYS, MODEL_KINDS, kindLabel, modelAverages, reviewReady, summarize } from "./modelReview";
import { dcf, defaultDcf, lbo } from "./ibMath";
import { emptyIb } from "./ibWorkspace";
import { exampleStoryline, newTree } from "./consultingStory";
import { defaultProfit, profit } from "./consultingMath";
import { SOFTWARE, softwareFor } from "./industrySoftware";
import { backtest, emptyModels } from "./wealthModels";

describe("peer review of models", () => {
  it("summarizes every kind of shared model from its saved inputs", () => {
    const ib = emptyIb();
    ib.comps.rows = [{ id: "a", name: "Alpha", ev: "1000", revenue: "400", ebitda: "100", netIncome: "50", equity: "800", source: "", asOf: "" }];
    ib.precedents.rows = [{ id: "p", target: "Target", acquirer: "Buyer", year: "2025", ev: "900", revenue: "300", ebitda: "90", premium: "30", source: "", asOf: "" }];
    for (const k of MODEL_KINDS.ib) {
      const s = summarize({ track: "ib", kind: k.id, data: { [k.id]: ib[k.id as keyof typeof ib] } });
      expect(s.problem, k.id).toBe("");
      expect(s.facts.length, k.id).toBeGreaterThanOrEqual(4);
      expect(JSON.stringify(s)).not.toMatch(/NaN|undefined|Infinity/);
    }
    const d = summarize({ track: "ib", kind: "dcf", data: { dcf: defaultDcf() } });
    expect(d.facts[0][1]).toBe(`$${dcf(defaultDcf()).evPerpetuity.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`);
    expect(summarize({ track: "ib", kind: "lbo", data: { lbo: ib.lbo } }).facts[0][1]).toBe(`${(Math.round(lbo(ib.lbo).irr * 1000) / 10).toFixed(1)}%`);
    expect(summarize({ track: "ib", kind: "precedents", data: { precedents: ib.precedents } }).lines).toEqual(["Target, bought by Buyer, 2025"]);
    // A model whose inputs do not work says why instead of showing numbers.
    expect(summarize({ track: "ib", kind: "dcf", data: { dcf: { ...defaultDcf(), wacc: "1" } } }).problem).toMatch(/must be higher/);

    const story = summarize({ track: "consulting", kind: "storyline", data: { storyline: exampleStoryline() } });
    expect(story.lines[0]).toMatch(/^Slide 1: FitCo should defend/);
    expect(story.lines).toHaveLength(6);
    const tree = summarize({ track: "consulting", kind: "tree", data: { tree: newTree(0) } });
    expect(tree.facts[0]).toEqual(["Top branches", "2"]);
    expect(tree.lines[1]).toBe("  - Revenue has fallen");
    const size = summarize({ track: "consulting", kind: "sizing", data: { sizing: { id: "e", title: "Stores", unit: "stores", checkLabel: "", check: "", factors: [{ id: "a", label: "People", value: "900000", op: "x" }, { id: "b", label: "People per store", value: "30000", op: "÷" }] } } });
    expect(size.facts[0]).toEqual(["Estimate", "30 stores"]);
    expect(size.lines).toEqual(["times People: 900,000", "divided by People per store: 30,000"]);
    const pr = summarize({ track: "consulting", kind: "profit", data: { profit: defaultProfit() } });
    expect(pr.facts[0][1]).toBe(`$${Math.round(profit(defaultProfit()).profit).toLocaleString("en-US")}`);
    expect(summarize({ track: "consulting", kind: "storyline", data: {} }).problem).toBeTruthy();
    expect(kindLabel("ib", "lbo")).toBe("LBO");

    // Wealth models: the same numbers the model page shows.
    const w = emptyModels();
    const bt = summarize({ track: "wealth", kind: "backtest", data: { backtest: w.backtest } });
    expect(bt.facts[1]).toEqual(["Compound return", `${(Math.round(backtest(w.backtest).cagr * 1000) / 10).toFixed(1)}%`]);
    expect(bt.lines[0]).toBe("Mix: 60% stocks, 40% bonds");
    const wd = summarize({ track: "wealth", kind: "withdraw", data: { withdraw: w.withdraw } });
    expect(wd.facts[2][0]).toBe("Constant dollar lasted");
    const es = summarize({ track: "wealth", kind: "estate", data: { estate: { ...w.estate, assets: [{ id: "a", name: "Home", value: "400000", titling: "joint" }] } } });
    expect(es.facts[0]).toEqual(["Net estate", "$400,000"]);
    expect(es.lines).toEqual(["Joint with right of survivorship: $400,000"]);
    expect(summarize({ track: "wealth", kind: "backtest", data: { backtest: { ...w.backtest, start: "1800" } } }).problem).toMatch(/between 1928/);
    expect(MODEL_KINDS.wealth.map((k) => k.id)).toEqual(["backtest", "withdraw", "estate"]);
  });

  it("averages reviews and needs every line scored", () => {
    expect(modelAverages([])).toBeNull();
    const a = modelAverages([{ scores: { structure: 4, assumptions: 2, accuracy: 3, communication: 3 } }, { scores: { structure: 2, assumptions: 2, accuracy: 4, communication: 3 } }])!;
    expect(a.byLine).toEqual({ structure: 3, assumptions: 2, accuracy: 3.5, communication: 3 });
    expect(a.overall).toBe(2.9);
    expect(reviewReady({ structure: 1, assumptions: 2, accuracy: 3 })).toBe(false);
    expect(reviewReady(Object.fromEntries(MODEL_KEYS.map((k) => [k, 4])))).toBe(true);
    expect(reviewReady(Object.fromEntries(MODEL_KEYS.map((k) => [k, 5])))).toBe(false);
  });
});

describe("the Daily Bread add-ins in the demo account", () => {
  it("shares a model, reviews a classmate's, and keeps reviews private to the two people involved", async () => {
    const repo = createDemoRepository();
    const before = await repo.listModelShares("ib");
    expect(before.map((s) => s.title)).toEqual(["DCF of a regional retailer"]);
    expect((await repo.listModelShares("consulting"))[0].kind).toBe("storyline");
    expect((await repo.listModelShares("wealth")).map((s) => s.title)).toEqual(["60/40 since 1976"]);
    await repo.reviewModel(before[0].id, { scores: { structure: 3, assumptions: 2, accuracy: 3, communication: 4 }, strengths: " Clear. ", improve: "Growth." });
    await repo.reviewModel(before[0].id, { scores: { structure: 4, assumptions: 2, accuracy: 3, communication: 4 }, strengths: "Clearer.", improve: "Growth." });
    const reviews = await repo.listModelReviews();
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({ shareId: before[0].id, strengths: "Clearer.", scores: { structure: 4 } });
    expect((await repo.listModelShares("ib"))[0].reviewCount).toBe(1);

    const id = await repo.shareModel({ track: "ib", kind: "lbo", title: " My LBO ", note: "", data: { lbo: emptyIb().lbo }, showName: false });
    const mine = (await repo.listModelShares("ib")).find((s) => s.id === id)!;
    expect(mine).toMatchObject({ title: "My LBO", authorName: "", kind: "lbo" });
    await expect(repo.reviewModel(id, { scores: {}, strengths: "", improve: "" })).rejects.toThrow(/your own model/);
    await repo.deleteModelShare(id);
    expect((await repo.listModelShares("ib")).some((s) => s.id === id)).toBe(false);
    await repo.deleteModelReview(reviews[0].id);
    expect(await repo.listModelReviews()).toEqual([]);
  });

  it("lists only members who chose to appear, and lets an admin keep a weekly brief", async () => {
    const repo = createDemoRepository();
    expect((await repo.listDirectory()).map((m) => m.displayName)).toEqual(["Jordan", "Maria", "Priya"]);
    expect(await repo.getDirectoryEntry()).toEqual({ show: false, line: "" });
    await repo.setDirectoryEntry(true, "  Sophomore, finance.  ");
    expect(await repo.getDirectoryEntry()).toEqual({ show: true, line: "Sophomore, finance." });
    expect(await repo.listDirectory()).toHaveLength(4);
    await repo.setDirectoryEntry(false, "");
    expect(await repo.listDirectory()).toHaveLength(3);

    const [sample] = await repo.listBriefs();
    expect(sample.verseTranslation).toBe("ESV");
    const id = await repo.saveBrief({ id: null, weekOf: "2099-01-05", title: "Next", market: "m", reflection: "r", verseReference: "", verseTranslation: "KJV", verseText: "" });
    expect((await repo.listBriefs())[0].id).toBe(id);
    await repo.saveBrief({ id, weekOf: "2099-01-05", title: "Next, revised", market: "m", reflection: "r", verseReference: "", verseTranslation: "KJV", verseText: "" });
    expect((await repo.listBriefs())[0].title).toBe("Next, revised");
    await repo.deleteBrief(id);
    expect(await repo.listBriefs()).toHaveLength(1);
  });
});

describe("the industry software guide", () => {
  it("covers every product named for each track, with Capital IQ marked as available through UF", () => {
    expect(new Set(SOFTWARE.map((s) => s.id)).size).toBe(SOFTWARE.length);
    expect(softwareFor("ib").map((s) => s.id)).toEqual(["capiq", "bloomberg", "factset", "pitchbook", "lseg", "macabacus", "wsp"]);
    expect(softwareFor("wealth").map((s) => s.id)).toEqual(["emoney", "mgp", "addepar", "orion", "mstar", "nitrogen"]);
    expect(softwareFor("consulting").map((s) => s.id)).toEqual(["thinkcell", "tableau", "powerbi", "alteryx", "caseprep"]);
    const access = Object.fromEntries(SOFTWARE.map((s) => [s.id, s.access]));
    // As the UF Business Library lists them: Capital IQ and Refinitiv/LSEG licensed, Bloomberg on campus terminals, no FactSet.
    expect(access).toMatchObject({ capiq: "uf", bloomberg: "uf", lseg: "uf", factset: "none" });
    for (const s of SOFTWARE) for (const t of [s.use, s.here, s.accessNote]) expect(t.length).toBeGreaterThan(20);
  });
});
