/** The "How we will work together" slide and the market snapshot slide. */
import { card, C, clip, CW, exhibit, HEAD, MX, newSlide, tableBase, td, text, th, W, type Ctx, type Row } from "./wealthDeckKit";
import { fmtDate } from "./wealthMath";
import { processSteps } from "./wealthProcess";

export function processSlide(c: Ctx) {
  const steps = processSteps(c.plan.process, c.plan.client.cadence).filter((s) => s.title.trim() || s.text.trim());
  const s = newSlide(c, {
    title: "How we will work together",
    takeaway: "A simple process: listen first, organize the numbers, test them, talk through options, and keep checking in.",
    notes:
      "Walk the steps left to right and say where today's meeting fits. Be explicit about the limits of the relationship: you are a student doing an educational exercise, the client decides what to do, and anything involving products, taxes or legal documents goes to a licensed professional. Ask whether the order makes sense for them and what they would add.",
  });
  const n = Math.max(1, steps.length);
  const gap = 0.2;
  const w = (CW - gap * (n - 1)) / n;
  steps.forEach((st, i) => {
    const x = MX + i * (w + gap);
    card(c.pres, s, x, 1.9, w, 3.3);
    s.addShape(c.pres.ShapeType.ellipse, { x: x + 0.2, y: 2.1, w: 0.55, h: 0.55, fill: { color: C.navy }, line: { color: C.navy, width: 0 } });
    text(s, String(i + 1), { x: x + 0.2, y: 2.1, w: 0.55, h: 0.55, fontSize: 16, bold: true, color: C.white, align: "center", valign: "middle" });
    text(s, clip(st.title, 24), { x: x + 0.2, y: 2.8, w: w - 0.4, h: 0.5, fontSize: 17, bold: true, fontFace: HEAD, color: C.navy });
    text(s, clip(st.text, 190), { x: x + 0.2, y: 3.35, w: w - 0.4, h: 1.75, fontSize: 12, color: C.ink });
  });
  card(c.pres, s, MX, 5.45, CW, 1.1, C.white);
  s.addShape(c.pres.ShapeType.rect, { x: MX, y: 5.45, w: 0.08, h: 1.1, fill: { color: C.gold }, line: { color: C.gold, width: 0 } });
  text(s, clip(c.plan.process.promise, 300), { x: MX + 0.3, y: 5.55, w: CW - 0.5, h: 0.9, fontSize: 13, color: C.ink, valign: "middle" });
}

export function marketSlide(c: Ctx) {
  const m = c.plan.market;
  const bullets = m.bullets.filter((b) => b.trim());
  const inds = m.indicators.filter((i) => i.name.trim() && i.value.trim());
  const s = newSlide(c, {
    title: "Market snapshot",
    takeaway: m.headline.trim() || "Where markets and the economy stand, in the presenter's words, with dated figures.",
    notes:
      "This is background, not a forecast. Say where each figure comes from and the date, and that nobody can reliably predict markets. Use it to explain why the plan's assumptions are what they are, not to suggest buying or selling anything. If a number is out of date by the time you present, update it or leave the slide out.",
  });
  if (bullets.length) {
    text(s, "WHAT WE ARE WATCHING", { x: MX, y: 1.85, w: 5.8, h: 0.25, fontSize: 10, bold: true, color: C.goldText, charSpacing: 1 });
    text(s, bullets.map((b, i) => ({ text: clip(b, 170), options: { bullet: true, breakLine: i < bullets.length - 1, paraSpaceAfter: 10 } })), { x: MX, y: 2.2, w: 5.8, h: 3.0, fontSize: 15 });
  }
  if (inds.length) {
    const rows: Row[] = [[th("Indicator"), th("Latest", "right"), th("As of", "right")]];
    inds.slice(0, 8).forEach((i) => rows.push([td(clip(i.name, 30), { bold: true }), td(clip(i.value, 14), { align: "right" }), td(clip(i.asOf, 14), { align: "right" })]));
    s.addTable(rows, { x: 6.9, y: 1.9, w: W - MX - 6.9, colW: [3.0, 1.5, 1.33], rowH: 0.42, ...tableBase });
  }
  if (m.changeMind.trim()) {
    card(c.pres, s, MX, 5.4, CW, 1.15, C.white);
    s.addShape(c.pres.ShapeType.rect, { x: MX, y: 5.4, w: 0.08, h: 1.15, fill: { color: C.gold }, line: { color: C.gold, width: 0 } });
    text(s, "WHAT WOULD CHANGE THIS VIEW", { x: MX + 0.3, y: 5.5, w: CW - 0.5, h: 0.22, fontSize: 10, bold: true, color: C.goldText, charSpacing: 1 });
    text(s, clip(m.changeMind, 300), { x: MX + 0.3, y: 5.78, w: CW - 0.5, h: 0.7, fontSize: 12.5 });
  }
  const srcs = Array.from(new Set([m.source, ...inds.map((i) => i.source)].map((x) => x.trim()).filter(Boolean)));
  exhibit(c, s, "Market indicators and the presenter's view", `${srcs.length ? srcs.join("; ") : "the presenter's sources (not recorded)"}${m.asOf ? `; view as of ${fmtDate(m.asOf)}` : ""}; commentary is opinion for discussion, not a forecast`);
}
