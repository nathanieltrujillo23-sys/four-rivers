import { describe, expect, it } from "vitest";
import { precedents, wacc } from "./ibCapital";
import { comps, dcf, footballField, lbo, lboAbilityToPay, merger } from "./ibMath";
import { IB_CASES, ibCase } from "./ibPractice";
import { emptyIb, normalizeIb } from "./ibWorkspace";
import { FULL_CASES, FULL_CASE_FACTS } from "./fullCases";
import { MOCK_CASES } from "./mockCases";
import { isClose } from "./consultingMath";

describe("banking practice cases", () => {
  it("each loads cleanly into the workspace and leaves the other models alone", () => {
    expect(new Set(IB_CASES.map((c) => c.id)).size).toBe(IB_CASES.length);
    for (const c of IB_CASES) {
      const loaded = { ...emptyIb(), ...c.load() };
      expect(normalizeIb(JSON.parse(JSON.stringify(loaded))), c.id).toEqual(loaded);
      expect(c.brief.length).toBeGreaterThanOrEqual(3);
      expect(c.tasks.length).toBeGreaterThanOrEqual(4);
      expect(c.notice.length).toBeGreaterThanOrEqual(4);
      expect(c.models.length).toBeGreaterThan(0);
    }
    expect(Object.keys(ibCase("buyout")!.load())).toEqual(["lbo"]);
    expect(ibCase("nope")).toBeUndefined();
  });

  it("the sale: precedents sit above trading multiples, most of the DCF is terminal value, and every method is above the family's number", () => {
    const s = ibCase("sell-side")!.load();
    const w = wacc(s.wacc!);
    expect(w.valid).toBe(true);
    // The DCF is preloaded with the WACC the peers give, to one decimal.
    expect((w.wacc * 100).toFixed(1)).toBe(s.dcf!.wacc);
    const d = dcf(s.dcf!);
    const c = comps(s.comps!);
    const p = precedents(s.precedents!);
    expect(d.terminalShare).toBeGreaterThan(0.7);
    expect(p.evEbitda!.median).toBeGreaterThan(c.evEbitda!.median);
    for (const ev of [d.evPerpetuity, d.evExit, c.range!.ev[0], p.range!.ev[0]]) expect(ev).toBeGreaterThan(700);
    expect(p.premium!.count).toBe(3);
    expect(footballField({ dcf: s.dcf!, comps: s.comps!, lbo: emptyIb().lbo }).map((r) => r.id)).toContain("comps");
    // The target's EBITDA is its EBIT margin plus D&A, on its revenue.
    expect(Number(s.comps!.targetEbitda)).toBeCloseTo(420 * 0.17, 6);
  });

  it("the buyout: about 13% at the asking price, and 20% only below the seller's floor", () => {
    const l = ibCase("buyout")!.load().lbo!;
    const r = lbo(l);
    expect(r.irr).toBeGreaterThan(0.12);
    expect(r.irr).toBeLessThan(0.14);
    const pay = lboAbilityToPay(l, 0.2)!;
    expect(pay).toBeGreaterThan(8.6);
    expect(pay).toBeLessThan(8.8);
    expect(r.bridge.multiple).toBeLessThan(0);
    expect(r.bridge.debt).toBeLessThan(r.bridge.growth);
    expect(r.years[0].ebitda / r.years[0].interest).toBeCloseTo(2.05, 1);
  });

  it("the merger: dilutive without savings however it is paid for, cash dilutes less, and the break-evens are as stated", () => {
    const m = ibCase("merger")!.load().merger!;
    const run = (stockPct: string, synergies: string) => merger({ ...m, stockPct, synergies });
    expect(run("100", "0").accretion).toBeLessThan(run("0", "0").accretion);
    for (const mix of ["0", "50", "100"]) {
      expect(run(mix, "0").accretion).toBeLessThan(0);
      expect(run(mix, "40").accretion).toBeGreaterThan(0);
    }
    expect(run("0", "40").offerPe).toBeGreaterThan(run("0", "40").acqPe);
    expect(run("0", "40").breakEvenSynergies).toBeCloseTo(9.3, 1);
    expect(run("100", "40").breakEvenSynergies).toBeCloseTo(26.7, 1);
  });
});

describe("full consulting cases with exhibits", () => {
  it("run longer than the mock cases, hand over two exhibits, and can start a storyline", () => {
    expect(FULL_CASES.map((c) => c.id)).toEqual(["summit", "clouddesk"]);
    const ids = new Set([...MOCK_CASES, ...FULL_CASES].map((c) => c.id));
    expect(ids.size).toBe(MOCK_CASES.length + FULL_CASES.length);
    for (const c of FULL_CASES) {
      expect(c.steps.map((s) => s.kind)).toEqual(["clarify", "structure", "quant", "quant", "insight", "recommend"]);
      const exhibits = c.steps.filter((s) => s.exhibit);
      expect(exhibits).toHaveLength(2);
      for (const s of exhibits) for (const series of s.exhibit!.series) expect(series.values).toHaveLength(s.exhibit!.labels.length);
      expect(c.steps.filter((s) => s.calc)).toHaveLength(3);
      for (const s of c.steps) {
        expect(s.points.length).toBeGreaterThan(2);
        if (s.calc) {
          expect(Number.isFinite(s.calc.answer)).toBe(true);
          expect(isClose(s.calc.answer, s.calc.answer)).toBe(true);
        }
      }
      expect(c.data.length).toBeGreaterThanOrEqual(6);
      expect(c.story!.question).toMatch(/\?$/);
      expect(JSON.stringify(c)).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it("has answer keys that follow from the figures in the exhibits", () => {
    const f = FULL_CASE_FACTS;
    // Summit: 10 x 12 x 12% - 40 x 4 x 2% + 30 x 5 x 9%.
    expect(f.soStoreProfit).toBeCloseTo(14.4 - 3.2 + 13.5, 9);
    // Closing every mall store saves 3.2 and loses 150 x 60% x 25% x 15% of online profit: about nothing.
    expect(f.soCloseAll).toBeCloseTo(3.2 - 22.5 * 0.15, 9);
    expect(Math.abs(f.soCloseAll)).toBeLessThan(0.5);
    // Closing the 15 worst saves 6.0 and loses 15/40 of that online profit.
    expect(f.soCloseWorst).toBeCloseTo(6 - 22.5 * (15 / 40) * 0.15, 9);
    expect(f.soCloseWorst).toBeGreaterThan(4);
    // CloudDesk: lifetime gross profit and how many times it covers the cost to win.
    expect(f.cdLtv).toEqual([6 * 0.8 * 4, 40 * 0.8 * 10, 300 * 0.8 * 25]);
    expect(f.cdRatio[0]).toBeCloseTo(19.2 / 9, 9);
    expect(f.cdRatio[1]).toBeCloseTo(6.4, 9);
    expect(f.cdRatio[2]).toBeCloseTo(15, 9);
    expect(f.cdNewMidValue).toBeCloseTo(6.4, 9);
    expect(f.cdNewMidValue / f.cdNewSmallValue).toBeCloseTo(3, 9);
    const summit = FULL_CASES[0];
    expect(summit.steps[2].exhibit!.series[0].values).toEqual([14.4, -3.2, 13.5]);
    expect(summit.steps[3].calc!.answer).toBe(f.soCloseAll);
  });
});
