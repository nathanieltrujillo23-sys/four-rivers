/** Slides for the scenario comparison (base, upside, downside) and the sensitivity (tornado) analysis. */
import { barChart, C, clip, exhibit, kpi, lineChart, money, MX, newSlide, tableBase, td, text, th, W, type Ctx, type Row } from "./wealthDeckKit";
import { fmtK, fmtPct, num } from "./wealthMath";
import { runScenarios, sensitivity } from "./wealthScenarios";

export function casesSlide(c: Ctx) {
  const results = runScenarios(c.plan, 1000);
  const base = results[0];
  const years = Math.round(num(c.plan.model.years) || 1);
  const spread = results.reduce((a, r) => (r.sim.final.p50 > a.hi.sim.final.p50 ? { ...a, hi: r } : r.sim.final.p50 < a.lo.sim.final.p50 ? { ...a, lo: r } : a), { hi: base, lo: base });
  const s = newSlide(c, {
    title: "Base, upside and downside",
    takeaway: `After ${years} years the median ranges from ${money(spread.lo.sim.final.p50)} (${spread.lo.scenario.name.toLowerCase()}) to ${money(spread.hi.sim.final.p50)} (${spread.hi.scenario.name.toLowerCase()}), against ${money(base.sim.final.p50)} in the base case.`,
    notes:
      "Show the three cases together so the client sees a range, not a single number. The base case is the plan as it stands; the others change the market or the saving. Say what each stands for in plain words, then ask which one the client would find hardest to live through. These are illustrations of what could happen, not forecasts and not a prediction of any investment's result.",
  });
  const labels = Array.from({ length: base.sim.data.length }, (_, i) => (i % Math.max(1, Math.round(years / 8)) === 0 || i === years ? `Yr ${i}` : ""));
  lineChart(c, s, MX, 1.8, 6.2, 3.7, labels, results.map((r) => ({ name: r.scenario.name, values: r.sim.data.map((p) => Math.round(p.p50)) })), [C.navy, C.green, C.red, C.gold, C.blue, C.mute]);
  const rows: Row[] = [[th("Scenario"), th("Median", "right"), th("Middle 80%", "right"), th(base.target > 0 ? `Chance of ${fmtK(base.target)}` : "Chance of goal", "right")]];
  results.forEach((r) =>
    rows.push([
      td(clip(r.scenario.name, 18), { bold: true }),
      td(money(r.sim.final.p50), { align: "right" }),
      td(`${fmtK(r.sim.final.p10)} to ${fmtK(r.sim.final.p90)}`, { align: "right" }),
      td(r.sim.prob == null ? "n/a" : fmtPct(r.sim.prob), { align: "right", bold: true }),
    ]),
  );
  s.addTable(rows, { x: 7.1, y: 1.9, w: W - MX - 7.1, colW: [1.5, 1.2, 1.7, 1.23], rowH: 0.5, ...tableBase });
  const notes = results.map((r) => `${r.scenario.name}: ${r.scenario.note || (r.changes.length ? r.changes.join("; ") : "the plan as it is")}`);
  text(s, notes.join("\n"), { x: 7.1, y: 1.9 + 0.5 * rows.length + 0.25, w: W - MX - 7.1, h: 2.2, fontSize: 11, color: C.slate });
  text(s, `Starting balance ${money(num(c.plan.model.initial))}; ${money(num(c.plan.model.monthly))} a month in the base case; ${c.plan.model.real ? "today's dollars" : "future dollars"}.`, { x: MX, y: 5.7, w: 6.2, h: 0.5, fontSize: 12, color: C.slate });
  exhibit(c, s, `Median balance and range of outcomes in ${results.length} scenarios`, "4 Rivers Wealth Tools; Monte Carlo model with 1,000 simulated paths; hypothetical and not a forecast");
}

export function sensitivitySlide(c: Ctx) {
  const r = sensitivity(c.plan, 1000);
  const top = r.rows[0];
  const s = newSlide(c, {
    title: "What moves the outcome",
    takeaway: top ? `${top.label} matters most: moving it from ${top.adverse} to ${top.favorable} changes the median by ${money(top.swing)}.` : "The assumptions that move the outcome most are the ones to discuss first.",
    notes:
      "A tornado chart changes one assumption at a time and shows how far the result moves. The longest bars are the assumptions that matter most, which tells the client where to spend their attention. Usually the things a person controls, such as how much they save and how long they stay invested, matter more than guessing the market. Each bar shows the median ending balance with that one input changed; everything else stays as in the plan. Changing one input at a time ignores how inputs interact.",
  });
  const rows = r.rows;
  barChart(c, s, MX, 1.85, 7.3, 4.2, rows.map((x) => x.label), [
    { name: "Adverse input", values: rows.map((x) => Math.round(x.adverseMedian - r.baseMedian)) },
    { name: "Favorable input", values: rows.map((x) => Math.round(x.favorableMedian - r.baseMedian)) },
  ], { horizontal: true, stacked: true, colors: [C.red, C.green], legend: true });
  const tbl: Row[] = [[th("Assumption"), th("Adverse", "right"), th("Favorable", "right")]];
  rows.forEach((x) => tbl.push([td(clip(x.label, 20), { bold: true }), td(x.adverse, { align: "right" }), td(x.favorable, { align: "right" })]));
  s.addTable(tbl, { x: 8.2, y: 1.9, w: W - MX - 8.2, colW: [1.7, 1.2, 1.23], rowH: 0.42, ...tableBase });
  kpi(c, s, 8.2, 1.9 + 0.42 * tbl.length + 0.3, W - MX - 8.2, "Base median", money(r.baseMedian), `after ${Math.round(num(c.plan.model.years) || 1)} years`);
  text(s, "Bars show the change in the median ending balance from the base case.", { x: MX, y: 6.15, w: 7.3, h: 0.3, fontSize: 11, color: C.slate });
  exhibit(c, s, "Change in the median ending balance when one assumption moves at a time", "4 Rivers Wealth Tools; Monte Carlo model with 1,000 simulated paths and a fixed seed; hypothetical");
}

