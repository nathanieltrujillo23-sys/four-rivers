/**
 * The storyline as a three-slide recommendation in PowerPoint: the answer, the evidence, and the risks and next steps.
 * Every slide's title is a full sentence (an action title), so the titles alone tell the story. Built in the browser.
 */
import type PptxGenJS from "pptxgenjs";
import { safeFile } from "./excel";
import type { Storyline } from "./consultingStory";

const W = 13.333;
const MX = 0.6;
const CW = W - 2 * MX;
const C = { ink: "1B2733", teal: "213B3F", mint: "B7D4CD", panel: "EEF4F2", line: "C9DCD6", soft: "55616C", white: "FFFFFF" };
const HEAD = "Georgia";
const BODY = "Calibri";

type Slide = PptxGenJS.Slide;
const text = (s: Slide, t: string | PptxGenJS.TextProps[], o: PptxGenJS.TextPropsOptions) => s.addText(t, { fontFace: BODY, color: C.ink, margin: 0, valign: "top", ...o });
const bullets = (items: string[], numbered = false): PptxGenJS.TextProps[] =>
  items.map((t, i) => ({ text: t, options: { bullet: numbered ? { type: "number" as const } : { indent: 14 }, breakLine: i < items.length - 1, paraSpaceAfter: 6 } }));

export async function buildRecommendation(s: Storyline): Promise<{ pres: PptxGenJS; filename: string; titles: string[] }> {
  const { default: Pptx } = await import("pptxgenjs");
  const pres = new Pptx();
  pres.layout = "LAYOUT_WIDE";
  pres.theme = { headFontFace: HEAD, bodyFontFace: BODY };
  pres.title = s.title;
  pres.company = "4 Rivers";
  pres.defineSlideMaster({
    title: "PAGE",
    background: { color: C.white },
    objects: [
      { rect: { x: 0, y: 0, w: W, h: 0.14, fill: { color: C.teal }, line: { color: C.teal, width: 0 } } },
      { text: { text: `Practice recommendation${s.client.trim() ? `  ·  ${s.client.trim()}` : ""}`, options: { x: MX, y: 0.3, w: 9, h: 0.25, fontSize: 10, fontFace: BODY, color: C.soft, margin: 0 } } },
      { text: { text: "Educational practice case  ·  4 Rivers  ·  not advice to any real company", options: { x: MX, y: 7.08, w: 9, h: 0.25, fontSize: 9, fontFace: BODY, color: C.soft, margin: 0 } } },
    ],
    slideNumber: { x: W - MX - 1, y: 7.08, w: 1, h: 0.25, fontSize: 9, fontFace: BODY, color: C.soft, align: "right" },
  });
  const page = (title: string, notes: string): Slide => {
    const sl = pres.addSlide({ masterName: "PAGE" });
    text(sl, title, { x: MX, y: 0.65, w: CW, h: 1.05, fontSize: 24, fontFace: HEAD, color: C.teal, valign: "middle" });
    sl.addShape(pres.ShapeType.rect, { x: MX, y: 1.8, w: CW, h: 0.02, fill: { color: C.line }, line: { color: C.line, width: 0 } });
    sl.addNotes(notes);
    return sl;
  };
  const args = s.arguments.filter((a) => a.claim.trim());
  const titles = [s.answer.trim() || "The recommendation", s.evidenceTitle.trim() || "The evidence", s.nextTitle.trim() || "Risks and next steps"];

  // Slide 1: the answer, with the three reasons and the question it responds to.
  const s1 = page(titles[0], "Start with the answer. Say the title in your own words, then the three reasons, in one breath each. Do not walk through the background unless you are asked.");
  s1.addShape(pres.ShapeType.rect, { x: MX, y: 2.1, w: 3.9, h: 4.6, fill: { color: C.panel }, line: { color: C.panel, width: 0 } });
  let y = 2.3;
  for (const [label, body] of [["Situation", s.situation], ["Complication", s.complication], ["Question", s.question]] as const) {
    if (!body.trim()) continue;
    text(s1, label.toUpperCase(), { x: MX + 0.25, y, w: 3.4, h: 0.25, fontSize: 10, bold: true, color: C.soft, charSpacing: 1 });
    text(s1, body.trim(), { x: MX + 0.25, y: y + 0.28, w: 3.4, h: 1.1, fontSize: 12 });
    y += 1.48;
  }
  const rx = MX + 4.2;
  const rw = CW - 4.2;
  text(s1, "WHY", { x: rx, y: 2.1, w: rw, h: 0.25, fontSize: 10, bold: true, color: C.soft, charSpacing: 1 });
  const rows = Math.max(1, args.length);
  const rh = Math.min(1.45, 4.2 / rows);
  args.forEach((a, i) => {
    const top = 2.45 + i * rh;
    s1.addShape(pres.ShapeType.ellipse, { x: rx, y: top + 0.08, w: 0.5, h: 0.5, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
    text(s1, String(i + 1), { x: rx, y: top + 0.08, w: 0.5, h: 0.5, fontSize: 16, bold: true, color: C.white, align: "center", valign: "middle" });
    text(s1, a.claim.trim(), { x: rx + 0.7, y: top, w: rw - 0.7, h: 0.66, fontSize: 16, fontFace: HEAD, valign: "middle" });
  });

  // Slide 2: each reason with what stands behind it and the exhibit that would prove it.
  const s2 = page(titles[1], "One column per reason. For each, say the claim, then the single strongest fact. Name the exhibit you would show; in a real deck each reason would have its own slide.");
  const cols = Math.max(1, args.length);
  const gap = 0.3;
  const cw = (CW - gap * (cols - 1)) / cols;
  args.forEach((a, i) => {
    const x = MX + i * (cw + gap);
    s2.addShape(pres.ShapeType.rect, { x, y: 2.1, w: cw, h: 0.06, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
    text(s2, a.claim.trim(), { x, y: 2.3, w: cw, h: 1.3, fontSize: 15, fontFace: HEAD, bold: true });
    const support = a.support.map((x) => x.trim()).filter(Boolean);
    if (support.length) text(s2, bullets(support), { x, y: 3.7, w: cw, h: 1.9, fontSize: 12 });
    s2.addShape(pres.ShapeType.rect, { x, y: 5.75, w: cw, h: 0.95, fill: { color: C.white }, line: { color: C.line, width: 1, dashType: "dash" } });
    text(s2, [{ text: "Exhibit: ", options: { bold: true, color: C.soft } }, { text: a.exhibit.trim() || "to be chosen", options: { color: C.soft } }], { x: x + 0.15, y: 5.85, w: cw - 0.3, h: 0.75, fontSize: 11, valign: "middle" });
  });

  // Slide 3: risks and next steps, and the answer once more.
  const s3 = page(titles[2], "Name each risk and how you would handle it before you are asked. End on the next steps: who does what, by when. Then stop talking.");
  const half = (CW - 0.4) / 2;
  const risks = s.risks.map((x) => x.trim()).filter(Boolean);
  const next = s.next.map((x) => x.trim()).filter(Boolean);
  text(s3, "RISKS", { x: MX, y: 2.1, w: half, h: 0.25, fontSize: 10, bold: true, color: C.soft, charSpacing: 1 });
  text(s3, risks.length ? bullets(risks) : "None named yet.", { x: MX, y: 2.45, w: half, h: 3, fontSize: 14 });
  text(s3, "NEXT STEPS", { x: MX + half + 0.4, y: 2.1, w: half, h: 0.25, fontSize: 10, bold: true, color: C.soft, charSpacing: 1 });
  text(s3, next.length ? bullets(next, true) : "None named yet.", { x: MX + half + 0.4, y: 2.45, w: half, h: 3, fontSize: 14 });
  s3.addShape(pres.ShapeType.rect, { x: MX, y: 5.75, w: CW, h: 0.95, fill: { color: C.mint }, line: { color: C.mint, width: 0 } });
  text(s3, [{ text: "The recommendation: ", options: { bold: true } }, { text: titles[0] }], { x: MX + 0.25, y: 5.83, w: CW - 0.5, h: 0.8, fontSize: 13, color: C.teal, valign: "middle" });

  return { pres, filename: `${safeFile(s.title || "Recommendation")}.pptx`, titles };
}
