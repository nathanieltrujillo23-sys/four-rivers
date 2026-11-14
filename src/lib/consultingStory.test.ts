import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { evaluate } from "./excelTestKit";
import { buildRecommendation } from "./consultingDeck";
import { profitSheet, sizingSheet } from "./consultingExcel";
import { EXHIBITS, checkAnswer, scoreExhibit } from "./consultingExhibits";
import { defaultProfit, profit, profitGrid, sizing, SIZING_TEMPLATES } from "./consultingMath";
import { MAX_DEPTH, MAX_NODES, TREE_TEMPLATES, checkStory, checkTree, countNodes, exampleStoryline, isTopicLabel, newStoryline, newTree, normalizeStorylines, normalizeTrees, outline, tree } from "./consultingStory";
import { emptyConsulting, normalizeConsulting } from "./consultingWorkspace";

describe("issue trees", () => {
  it("starts from a template and grows, moves and prunes without changing the original", () => {
    const t = newTree(0);
    expect(t.branches.map((b) => b.text)).toEqual(["Revenue has fallen", "Costs have risen"]);
    const first = t.branches[0];
    const grown = tree.addChild(t, first.id);
    expect(grown.branches[0].children).toHaveLength(first.children.length + 1);
    expect(t.branches[0].children).toHaveLength(first.children.length);
    const named = tree.setText(grown, grown.branches[0].children.at(-1)!.id, "Discounts are deeper");
    expect(outline(named)).toContain("    - Discounts are deeper");
    const beside = tree.addSibling(named, first.id);
    expect(beside.branches.map((b) => b.text)).toEqual(["Revenue has fallen", "", "Costs have risen"]);
    const moved = tree.move(beside, beside.branches[2].id, -1);
    expect(moved.branches.map((b) => b.text)).toEqual(["Revenue has fallen", "Costs have risen", ""]);
    expect(tree.move(moved, moved.branches[0].id, -1)).toEqual(moved);
    const pruned = tree.remove(moved, moved.branches[2].id);
    expect(pruned.branches).toHaveLength(2);
    expect(tree.toggleHypothesis(pruned, first.id).branches[0].hypothesis).toBe(true);
    expect(outline(tree.toggleHypothesis(pruned, first.id))).toContain("[test first]");
  });

  it("stops at the depth and size limits", () => {
    let t = newTree(3);
    let id = t.branches[0].id;
    for (let d = 1; d < MAX_DEPTH + 3; d++) {
      const next = tree.addChild(t, id);
      const added = d < MAX_DEPTH;
      expect(countNodes(next.branches) - countNodes(t.branches)).toBe(added ? 1 : 0);
      t = next;
      if (added) {
        let cur = t.branches[0];
        while (cur.children.length) cur = cur.children[0];
        id = cur.id;
      }
    }
    for (let k = 0; k < MAX_NODES + 10; k++) t = tree.addTop(t);
    expect(countNodes(t.branches)).toBe(MAX_NODES);
  });

  it("points at what to look at again", () => {
    const good = tree.toggleHypothesis(newTree(0), newTree(0).branches[0].id);
    const base = newTree(0);
    const marked = tree.toggleHypothesis(base, base.branches[0].id);
    void good;
    expect(checkTree(marked)).toMatchObject({ branches: 2, depth: 3, hypotheses: 1 });
    expect(checkTree(marked).prompts).toHaveLength(1);
    expect(checkTree(base).prompts.join(" ")).toMatch(/Mark the branch you would test first/);
    const lonely = tree.remove(marked, marked.branches[1].children[1].id);
    expect(checkTree(lonely).prompts.join(" ")).toMatch(/"Costs have risen" has only one sub-branch/);
    let wide = marked;
    for (let k = 0; k < 4; k++) wide = tree.addTop(wide);
    const p = checkTree(wide).prompts.join(" ");
    expect(p).toMatch(/more than five branches/);
    expect(p).toMatch(/4 branches are blank/);
    const twice = tree.setText(marked, marked.branches[1].id, "revenue has fallen");
    expect(checkTree(twice).prompts.join(" ")).toMatch(/appears twice/);
    for (const tpl of TREE_TEMPLATES.slice(0, 3)) expect(tpl.build().length).toBeGreaterThanOrEqual(2);
  });
});

describe("storylines", () => {
  it("tells a topic label from a sentence, and coaches an empty storyline", () => {
    expect(isTopicLabel("Market overview")).toBe(true);
    expect(isTopicLabel("The market is growing 8% a year and the client is not")).toBe(false);
    const c = checkStory(newStoryline());
    expect(c.ready).toBe(false);
    expect(c.prompts[0]).toMatch(/Write the answer first/);
    const weak = { ...newStoryline(), answer: "Growth strategy", question: "How to grow?" };
    expect(checkStory(weak).prompts.join(" ")).toMatch(/reads like a topic/);
  });

  it("passes the example, whose three titles tell the story", () => {
    const c = checkStory(exampleStoryline());
    expect(c.ready).toBe(true);
    expect(c.filled).toBe(c.total);
    expect(c.titles).toHaveLength(3);
    expect(c.titles.every((t) => !isTopicLabel(t))).toBe(true);
    expect(c.prompts).toHaveLength(1);
  });

  it("becomes a three-slide PowerPoint with action titles and speaker notes", async () => {
    const s = exampleStoryline();
    const { pres, filename, titles } = await buildRecommendation(s);
    expect(filename).toBe("Example-the-regional-gym-chain.pptx");
    expect(titles[0]).toBe(s.answer);
    const zip = await JSZip.loadAsync((await pres.write({ outputType: "nodebuffer" })) as Buffer);
    const slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    expect(slides).toHaveLength(3);
    expect(Object.keys(zip.files).filter((f) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(f))).toHaveLength(3);
    const xml = (await Promise.all(slides.map((f) => zip.file(f)!.async("string")))).join(" ");
    expect(xml).toContain("Fifteen gyms earn 70% of profit");
    expect(xml).toContain("Pilot the premium offer in three gyms");
    expect(xml).not.toMatch(/undefined|NaN/);
    // A blank storyline still builds, with plain titles.
    const blank = await buildRecommendation(newStoryline());
    expect(blank.titles).toEqual(["The recommendation", "The evidence", "Risks and next steps"]);
  }, 30_000);
});

describe("exhibit drills", () => {
  it("every answer and every takeaway is true of its own data", () => {
    expect(new Set(EXHIBITS.map((e) => e.id)).size).toBe(EXHIBITS.length);
    for (const e of EXHIBITS) {
      expect(e.takeaways).toHaveLength(4);
      expect(e.best).toBeGreaterThanOrEqual(0);
      expect(e.best).toBeLessThan(4);
      for (const s of e.series) expect(s.values).toHaveLength(e.labels.length);
      for (const q of e.questions) {
        expect(Number.isFinite(q.answer), `${e.id} ${q.id}`).toBe(true);
        expect(checkAnswer(q, q.answer)).toBe(true);
        expect(checkAnswer(q, q.answer + 10 + Math.abs(q.answer) * 0.5)).toBe(false);
      }
    }
    const by = (id: string) => EXHIBITS.find((e) => e.id === id)!;
    // Segments: 20% growth, three quarters of it from Small business.
    expect(by("segments").questions.map((q) => q.answer)).toEqual([20, 75]);
    // Price up 25%, units down 24%, revenue down 5%.
    expect(by("price-volume").questions.map((q) => q.answer)).toEqual([9500, -5]);
    // Share from 30% to about 22.5%.
    expect(by("share").questions[0].answer).toBeCloseTo(22.5, 1);
    expect(by("share").questions[1].answer).toBeCloseTo(7.5, 1);
    // Online earns the most profit.
    expect(by("channels").questions.map((q) => q.answer)).toEqual([44, 118]);
    // The bridge nets to 35, down 30%; costs and volume (23) are nearly twice the price gain (12).
    expect(by("bridge").questions.map((q) => q.answer)).toEqual([35, -30]);
    // Plant C at 55%, and 78 thousand units spare of which 54 are Plant C's.
    expect(by("plants").questions.map((q) => q.answer)).toEqual([55, 78]);
  });

  it("scores two numbers and the takeaway", () => {
    const e = EXHIBITS[0];
    expect(scoreExhibit(e, { growth: "20", share: "74" }, e.best)).toBe(3);
    expect(scoreExhibit(e, { growth: "30", share: "" }, 0)).toBe(0);
    expect(scoreExhibit(e, {}, null)).toBe(0);
  });
});

describe("consulting models in Excel", () => {
  it("market sizing: the chain multiplies and divides in order", () => {
    for (const tpl of SIZING_TEMPLATES) {
      const e = { id: "e", title: tpl.title, unit: tpl.unit, checkLabel: tpl.checkLabel, check: "1000000", factors: tpl.factors.map(([label, value, op], k) => ({ id: `f${k}`, label, value, op })) };
      const m = sizingSheet(e);
      const x = evaluate([m.sheet]);
      expect(x.errors()).toEqual([]);
      expect(x.num("Market sizing", m.out.total)).toBeCloseTo(sizing(e).total, 4);
      expect(x.num("Market sizing", m.out.ratio)).toBeCloseTo(sizing(e).vsCheck!, 8);
    }
    const div = { id: "d", title: "Stores", unit: "stores", checkLabel: "", check: "", factors: [{ id: "a", label: "People", value: "900000", op: "x" as const }, { id: "b", label: "People per store", value: "30000", op: "÷" as const }, { id: "c", label: "Skipped", value: "", op: "x" as const }] };
    expect(evaluate([sizingSheet(div).sheet]).num("Market sizing", sizingSheet(div).out.total)).toBe(30);
  });

  it("profit and break-even, with the grid", () => {
    for (const i of [defaultProfit(), { price: "12.5", variableCost: "9", fixedCost: "70000", volume: "15000" }]) {
      const m = profitSheet(i);
      const x = evaluate([m.sheet]);
      const r = profit(i);
      const g = profitGrid(i);
      const S = "Profit and break-even";
      expect(x.errors()).toEqual([]);
      expect(x.num(S, m.out.profit)).toBeCloseTo(r.profit, 6);
      expect(x.num(S, m.out.be)).toBeCloseTo(r.breakEvenUnits!, 6);
      expect(x.num(S, m.out.beRev)).toBeCloseTo(r.breakEvenRevenue!, 6);
      expect(x.num(S, m.out.safety)).toBeCloseTo(r.marginOfSafety!, 8);
      expect(x.num(S, m.out.cm)).toBeCloseTo(r.contributionMargin, 8);
      expect(x.num(S, m.out.gridLow)).toBeCloseTo(g.values[0][0], 4);
      expect(x.num(S, m.out.gridMid)).toBeCloseTo(g.values[2][2], 4);
      expect(x.num(S, m.out.gridHigh)).toBeCloseTo(g.values[4][4], 4);
    }
  });
});

describe("saving trees and storylines", () => {
  it("round-trips, and drops what is malformed", () => {
    const t = newTree(1);
    const s = exampleStoryline();
    expect(normalizeTrees(JSON.parse(JSON.stringify([t])))).toEqual([t]);
    expect(normalizeStorylines(JSON.parse(JSON.stringify([s])))).toEqual([s]);
    expect(normalizeTrees("x")).toEqual([]);
    expect(normalizeStorylines([{ arguments: "x" }])[0].arguments).toHaveLength(3);
    const d = emptyConsulting();
    expect(d.trees).toEqual([]);
    d.trees = [t];
    d.storylines = [s];
    d.exhibits = [{ date: "2026-11-14", exhibit: "segments", correct: 3, seconds: 48 }];
    expect(normalizeConsulting(JSON.parse(JSON.stringify(d)))).toEqual(d);
    expect(normalizeConsulting({ sizing: [] }).exhibits).toEqual([]);
  });
});
