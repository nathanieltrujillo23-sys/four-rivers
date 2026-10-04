import type { jsPDF } from "jspdf";
import {
  BUDGET_CATEGORIES,
  SPENDING_CATEGORIES,
  categoryTotal,
  filledItems,
  summarize,
  type Budget,
  type BudgetCategory,
} from "../utils/budget";
import type { StringKey } from "../i18n/en";

type RGB = [number, number, number];

const PW = 612;
const PH = 792;
const M = 40;

const INK: RGB = [44, 38, 32];
const SOFT: RGB = [92, 83, 71];
const PARCHMENT: RGB = [250, 245, 236];
const LINE: RGB = [230, 220, 199];
const WHITE: RGB = [255, 255, 255];
const GREY: RGB = [196, 190, 176];

/** The four river colors plus an olive and a gold for needs and discretionary. */
const COLORS: Record<BudgetCategory, RGB> = {
  income: [47, 111, 79],
  needs: [90, 100, 70],
  discretionary: [201, 162, 75],
  saving: [31, 111, 139],
  investing: [58, 90, 155],
  giving: [169, 116, 59],
};

const RIVER_CURVES: { color: RGB; d: [number, number, number, number, number, number, number, number] }[] = [
  { color: COLORS.income, d: [13, 2, 13, 8, 5, 9, 4, 24] },
  { color: COLORS.saving, d: [13, 2, 13, 9, 10, 12, 9, 24] },
  { color: COLORS.investing, d: [13, 2, 13, 9, 16, 12, 17, 24] },
  { color: COLORS.giving, d: [13, 2, 13, 8, 21, 9, 22, 24] },
];

export interface PlanPdfInput {
  name: string;
  budget: Budget;
  lang: "en" | "es";
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  date?: Date;
}

/** jsPDF's built-in fonts only cover Latin-1, so swap or drop anything outside it. */
function clean(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\u0009\u000A -ÿ]/g, "")
    .trim();
}

function slug(text: string): string {
  return (
    clean(text)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "student"
  );
}

/**
 * Builds the one-page-or-two stewardship plan: the student's name and the
 * four rivers logo up top, a "river" diagram showing monthly income splitting
 * into needs, discretionary, saving, investing, and giving, then a box per
 * category listing every line and its dollar amount. Returns the document so
 * the caller can save it (browser) or serialize it (tests).
 */
export async function buildStewardshipPdf(input: PlanPdfInput): Promise<{ doc: jsPDF; filename: string }> {
  const { jsPDF: JsPDF } = await import("jspdf");
  const { budget, lang, t } = input;
  const name = clean(input.name);
  const doc = new JsPDF({ unit: "pt", format: "letter" });
  const locale = lang === "es" ? "es-US" : "en-US";
  const money = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(n);
  const pct = (fraction: number) => `${Math.round(fraction * 100)}%`;
  const catName = (c: BudgetCategory) => clean(t(`cat.${c}` as StringKey));
  const catTag = (c: BudgetCategory) => clean(t(`cat.${c}.tag` as StringKey));
  const sum = summarize(budget);
  const when = (input.date ?? new Date()).toLocaleDateString(locale, { month: "long", year: "numeric" });

  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
  const ink = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const alpha = (a: number) => doc.setGState(doc.GState({ opacity: a }));

  let pageNumber = 0;

  function page() {
    if (pageNumber > 0) doc.addPage();
    pageNumber += 1;
    fill(PARCHMENT);
    doc.rect(0, 0, PW, PH, "F");
  }

  function logo(x: number, y: number, size: number) {
    const k = size / 26;
    doc.setLineCap("round");
    doc.setLineWidth(2.2 * k);
    for (const r of RIVER_CURVES) {
      stroke(r.color);
      const [x0, y0, x1, y1, x2, y2, x3, y3] = r.d;
      doc.moveTo(x + x0 * k, y + y0 * k);
      doc.curveTo(x + x1 * k, y + y1 * k, x + x2 * k, y + y2 * k, x + x3 * k, y + y3 * k);
      doc.stroke();
    }
  }

  function droplet(cx: number, cy: number, s: number) {
    doc.moveTo(cx, cy - s);
    doc.curveTo(cx + s * 0.9, cy - s * 0.05, cx + s * 0.85, cy + s, cx, cy + s);
    doc.curveTo(cx - s * 0.85, cy + s, cx - s * 0.9, cy - s * 0.05, cx, cy - s);
    doc.fill();
  }

  /** Four thin waves in the river colors, like the course's own flowing motif. */
  function waves(y: number) {
    doc.setLineCap("round");
    doc.setLineWidth(1.6);
    RIVER_CURVES.forEach((r, i) => {
      stroke(r.color);
      alpha(0.75);
      const phase = i * 0.9;
      let first = true;
      for (let x = M; x <= PW - M; x += 4) {
        const yy = y + i * 3.2 + Math.sin((x - M) / 22 + phase) * 2.6;
        if (first) {
          doc.moveTo(x, yy);
          first = false;
        } else doc.lineTo(x, yy);
      }
      doc.stroke();
      alpha(1);
    });
  }

  function footer() {
    stroke(LINE);
    doc.setLineWidth(0.8);
    doc.line(M, PH - 56, PW - M, PH - 56);
    doc.setFont("times", "italic");
    doc.setFontSize(9);
    ink(SOFT);
    doc.text(`"${clean(t("pdf.verse"))}"  ${clean(t("pdf.verseRef"))}`, PW / 2, PH - 42, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`${clean(t("pdf.footer"))}  four-rivers.vercel.app`, PW / 2, PH - 29, { align: "center" });
    doc.text(clean(t("pdf.disclaimer")), PW / 2, PH - 19, { align: "center" });
    doc.text(String(pageNumber), PW - M, PH - 19, { align: "right" });
  }

  function lineBreakSafe(text: string, width: number, fontSize: number, font: string, style: string): string {
    doc.setFont(font, style);
    doc.setFontSize(fontSize);
    if (doc.getTextWidth(text) <= width) return text;
    let out = text;
    while (out.length > 1 && doc.getTextWidth(`${out}...`) > width) out = out.slice(0, -1);
    return `${out.trimEnd()}...`;
  }

  /* ---------------------------- page 1 header ---------------------------- */
  page();
  logo(M, 30, 34);
  doc.setFont("times", "bold");
  doc.setFontSize(19);
  ink(INK);
  doc.text("4 Rivers", M + 44, 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  ink(SOFT);
  doc.text(clean(when), PW - M, 56, { align: "right" });

  const title = name ? clean(t("pdf.title", { name })) : clean(t("pdf.titleNoName"));
  let titleSize = 30;
  doc.setFont("times", "bold");
  doc.setFontSize(titleSize);
  while (titleSize > 16 && doc.getTextWidth(title) > PW - 2 * M) {
    titleSize -= 1;
    doc.setFontSize(titleSize);
  }
  ink(INK);
  doc.text(title, PW / 2, 118, { align: "center" });
  doc.setFont("times", "italic");
  doc.setFontSize(12.5);
  ink(SOFT);
  doc.text(clean(t("pdf.subtitle")), PW / 2, 140, { align: "center" });
  waves(148);

  /* ------------------------------ river chart ---------------------------- */
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  ink(INK);
  doc.text(clean(t("pdf.flow")), M, 176);

  const chartTop = 212;
  const chartH = 116;
  const incomeX = M + 4;
  const barW = 16;
  const destX = 360;
  const gap = 6;
  const assigned = sum.assigned;
  const unassigned = Math.max(0, sum.leftover);
  const total = assigned + unassigned;

  type Seg = { key: BudgetCategory | "unassigned"; amount: number };
  const segs: Seg[] = SPENDING_CATEGORIES.map((c) => ({ key: c, amount: sum[c] }));
  if (unassigned > 0) segs.push({ key: "unassigned", amount: unassigned });
  const live = segs.filter((s) => s.amount > 0);

  if (total > 0 && live.length > 0) {
    const usable = chartH - gap * (live.length - 1);
    const incomeBarH = sum.income >= assigned ? usable : usable * (sum.income / assigned);
    const sourceTotal = sum.income >= assigned ? total : assigned;
    let yDest = chartTop;
    let ySrc = chartTop;
    const labelAnchors: { seg: Seg; center: number }[] = [];

    live.forEach((seg) => {
      const hd = (seg.amount / total) * usable;
      const hs = (seg.amount / sourceTotal) * incomeBarH;
      const color = seg.key === "unassigned" ? GREY : COLORS[seg.key];

      // ribbon from the income bar to this category's bar
      const xs = incomeX + barW;
      const dx = (destX - xs) / 2;
      fill(color);
      alpha(seg.key === "unassigned" ? 0.35 : 0.5);
      doc.moveTo(xs, ySrc);
      doc.curveTo(xs + dx, ySrc, destX - dx, yDest, destX, yDest);
      doc.lineTo(destX, yDest + hd);
      doc.curveTo(destX - dx, yDest + hd, xs + dx, ySrc + hs, xs, ySrc + hs);
      doc.close();
      doc.fill();
      alpha(1);

      // the destination bar
      fill(color);
      doc.roundedRect(destX, yDest, barW, Math.max(hd, 1.5), 2, 2, "F");

      labelAnchors.push({ seg, center: yDest + hd / 2 });
      yDest += hd + gap;
      ySrc += hs;
    });

    // the income bar itself
    fill(COLORS.income);
    doc.roundedRect(incomeX, chartTop, barW, Math.max(incomeBarH, 2), 3, 3, "F");

    // category labels, nudged apart so they never overlap
    const pitch = 25;
    const ys: number[] = [];
    labelAnchors.forEach((a, i) => {
      const want = a.center - 6;
      ys.push(i === 0 ? Math.max(chartTop - 2, want) : Math.max(want, ys[i - 1] + pitch));
    });
    const maxBottom = chartTop + chartH + 8;
    for (let i = ys.length - 1; i >= 0; i--) {
      const limit = i === ys.length - 1 ? maxBottom - pitch : ys[i + 1] - pitch;
      if (ys[i] > limit) ys[i] = limit;
    }
    labelAnchors.forEach((a, i) => {
      const x = destX + barW + 10;
      const isUn = a.seg.key === "unassigned";
      const label = isUn ? clean(t("pdf.unassigned")) : catName(a.seg.key as BudgetCategory);
      const color = isUn ? SOFT : COLORS[a.seg.key as BudgetCategory];
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      ink(color);
      doc.text(label, x, ys[i] + 8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      ink(SOFT);
      const share = sum.income > 0 ? ` - ${pct(a.seg.amount / sum.income)}` : "";
      doc.text(`${money(a.seg.amount)}${share}`, x, ys[i] + 20);
    });
  }

  // income label above its bar
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  ink(COLORS.income);
  doc.text(clean(t("cat.income")), M, chartTop - 22);
  doc.setFont("times", "bold");
  doc.setFontSize(15);
  ink(INK);
  const incomeText = money(sum.income);
  const incomeTextW = doc.getTextWidth(incomeText);
  doc.text(incomeText, M, chartTop - 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  ink(SOFT);
  doc.text(clean(t("pdf.perMonth")), M + incomeTextW + 4, chartTop - 7);
  if (sum.leftover < 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    ink([180, 83, 9]);
    doc.text(`${clean(t("pdf.over"))}: ${money(-sum.leftover)}`, M, chartTop + chartH + 14);
  }

  /* ----------------------------- category boxes -------------------------- */
  const boxW = (PW - 2 * M - 16) / 2;
  const HEAD = 26;
  const ROW = 14;
  const order = BUDGET_CATEGORIES;
  let y = chartTop + chartH + 26;

  function boxHeight(c: BudgetCategory): number {
    const rows = Math.max(1, filledItems(budget[c]).length);
    return HEAD + 8 + rows * ROW + 6 + 22;
  }

  function drawBox(c: BudgetCategory, x: number, top: number, h: number) {
    const color = COLORS[c];
    stroke(LINE);
    doc.setLineWidth(0.9);
    fill(WHITE);
    doc.roundedRect(x, top, boxW, h, 7, 7, "FD");
    fill(color);
    doc.roundedRect(x, top, boxW, HEAD, 7, 7, "F");
    doc.rect(x, top + HEAD - 9, boxW, 9, "F");
    fill(WHITE);
    droplet(x + 14, top + HEAD / 2, 5);
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    ink(WHITE);
    doc.text(catName(c), x + 26, top + 17.5);
    doc.setFont("times", "italic");
    doc.setFontSize(8.5);
    doc.text(catTag(c), x + boxW - 10, top + 17, { align: "right" });

    const items = filledItems(budget[c]);
    let ly = top + HEAD + 15;
    if (items.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      ink(SOFT);
      doc.text(clean(t("pdf.empty")), x + 12, ly);
    }
    items.forEach((item) => {
      const amountText = money(item.amount ?? 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      const amountW = doc.getTextWidth(amountText);
      const label = lineBreakSafe(
        clean(item.label) || "-",
        boxW - 24 - amountW - 10,
        9.5,
        "helvetica",
        "normal",
      );
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      ink(INK);
      doc.text(label, x + 12, ly);
      const labelW = doc.getTextWidth(label);
      stroke(LINE);
      doc.setLineWidth(0.7);
      doc.setLineDashPattern([1, 2.2], 0);
      doc.line(x + 12 + labelW + 4, ly - 2.5, x + boxW - 12 - amountW - 4, ly - 2.5);
      doc.setLineDashPattern([], 0);
      doc.setFont("helvetica", "bold");
      ink(INK);
      doc.text(amountText, x + boxW - 12, ly, { align: "right" });
      ly += ROW;
    });

    const totalY = top + h - 9;
    stroke(color);
    doc.setLineWidth(0.9);
    doc.line(x + 12, totalY - 12, x + boxW - 12, totalY - 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    ink(color);
    doc.text(clean(t("pdf.total")), x + 12, totalY);
    const cat = categoryTotal(budget[c]);
    doc.text(money(cat), x + boxW - 12, totalY, { align: "right" });
    if (c !== "income" && sum.income > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      ink(SOFT);
      doc.text(`${pct(cat / sum.income)} ${clean(t("pdf.ofIncome"))}`, x + boxW / 2 + 8, totalY, {
        align: "center",
      });
    }
  }

  footer();
  for (let i = 0; i < order.length; i += 2) {
    const pair = order.slice(i, i + 2);
    const h = Math.max(...pair.map(boxHeight));
    if (y + h > PH - 60) {
      page();
      logo(M, 24, 22);
      doc.setFont("times", "bold");
      doc.setFontSize(13);
      ink(INK);
      doc.text(name ? clean(t("pdf.title", { name })) : clean(t("pdf.titleNoName")), M + 30, 42);
      y = 74;
      footer();
    }
    pair.forEach((c, k) => drawBox(c, M + k * (boxW + 16), y, h));
    y += h + 12;
  }

  const filename = `${clean(t("pdf.file"))}-${slug(name)}.pdf`;
  return { doc, filename };
}
