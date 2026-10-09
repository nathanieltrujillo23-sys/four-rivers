import type { jsPDF } from "jspdf";
import type { DiscoveryMeeting } from "../types";
import { MISSION_VERSE, TOPICS, WORKSHOP_TEXT, swotGrid, topicLabel, workshopSteps } from "../components/community/workshop/workshopContent";
import type { ToolSnapshot } from "../components/community/workshop/toolSummaries";
import { clean } from "./stewardshipPdf";

type RGB = [number, number, number];

const PW = 612;
const PH = 792;
const M = 50;
const W = PW - 2 * M;
const FOOT = 52;

const INK: RGB = [38, 34, 30];
const SOFT: RGB = [96, 88, 76];
const NAVY: RGB = [39, 75, 109];
const GOLD: RGB = [201, 162, 75];
const LINE: RGB = [214, 205, 186];
const PANEL: RGB = [248, 243, 233];

export interface MeetingPdfInput {
  meeting: DiscoveryMeeting;
  /** The analyst running the meeting (from the signed agreement, or their own name). */
  analystName: string;
  /** The tools the analyst picked to include, with their numbers. */
  tools: ToolSnapshot[];
  /** The admin's reworded text, if any (steps, labels, and the closing lines). */
  copy?: (key: string, fallback: string) => string;
}

function slug(text: string): string {
  return (
    clean(text)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "participant"
  );
}

/**
 * A printable record of a discovery meeting: who, the notes from each of the six steps, the money mission statement,
 * the topics chosen, and one page section per tool the analyst picked, with the numbers used. Returns the document so
 * the caller can save it (or a test can read it).
 */
export async function buildMeetingPdf(input: MeetingPdfInput): Promise<{ doc: jsPDF; filename: string }> {
  const { jsPDF: JsPDF } = await import("jspdf");
  const { meeting: m, tools } = input;
  const copy = input.copy ?? ((_k: string, f: string) => f);
  const steps = workshopSteps(copy);
  const swot = swotGrid(copy);
  const doc = new JsPDF({ unit: "pt", format: "letter" });
  const when = new Date(m.createdAt);
  const dateLong = when.toLocaleDateString("en-US", { dateStyle: "long" });
  const answer = (k: string) => clean(m.answers[k] ?? "");
  let y = M;

  const ink = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const draw = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);

  function ensure(h: number) {
    if (y + h > PH - FOOT - 10) {
      doc.addPage();
      y = M;
    }
  }

  /** Wrapped text, flowing across pages. */
  function para(
    text: string,
    o: { size?: number; font?: "helvetica" | "times"; style?: "normal" | "bold" | "italic"; color?: RGB; indent?: number; after?: number } = {},
  ) {
    const size = o.size ?? 10.5;
    const indent = o.indent ?? 0;
    doc.setFont(o.font ?? "helvetica", o.style ?? "normal");
    doc.setFontSize(size);
    ink(o.color ?? INK);
    const lines = doc.splitTextToSize(clean(text), W - indent) as string[];
    for (const line of lines) {
      ensure(size * 1.4);
      doc.text(line, M + indent, y + size);
      y += size * 1.4;
    }
    y += o.after ?? 4;
  }

  function heading(text: string, level: 1 | 2 = 1) {
    ensure(level === 1 ? 40 : 28);
    y += level === 1 ? 10 : 4;
    doc.setFont("times", "bold");
    doc.setFontSize(level === 1 ? 15 : 12);
    ink(NAVY);
    doc.text(clean(text), M, y + (level === 1 ? 15 : 12));
    y += level === 1 ? 20 : 17;
    if (level === 1) {
      draw(GOLD);
      doc.setLineWidth(1);
      doc.line(M, y, M + 46, y);
      y += 8;
    }
  }

  /** A label with its value beside it, wrapped. */
  function rows(list: [string, string][]) {
    for (const [label, value] of list) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const l = doc.splitTextToSize(clean(label), 168) as string[];
      doc.setFont("helvetica", "normal");
      const v = doc.splitTextToSize(clean(value) || "-", W - 180) as string[];
      const h = Math.max(l.length, v.length) * 14;
      ensure(h + 6);
      doc.setFont("helvetica", "bold");
      ink(SOFT);
      doc.text(l, M, y + 10);
      doc.setFont("helvetica", "normal");
      ink(INK);
      doc.text(v, M + 180, y + 10);
      y += h + 4;
      draw(LINE);
      doc.setLineWidth(0.5);
      doc.line(M, y - 1, M + W, y - 1);
      y += 3;
    }
    y += 4;
  }

  // ---- title block
  fill(NAVY);
  doc.rect(0, 0, PW, 92, "F");
  fill(GOLD);
  doc.rect(0, 92, PW, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(222, 208, 170);
  doc.text("DAILY BREAD AT THE UNIVERSITY OF FLORIDA", M, 34, { charSpace: 1.2 });
  doc.setFont("times", "bold");
  doc.setFontSize(27);
  doc.setTextColor(255, 255, 255);
  doc.text("Discovery meeting", M, 68);
  y = 122;

  rows([
    ["Participant", m.participantName],
    ["Date", dateLong],
    ["Analyst", input.analystName],
    [
      "Workshop agreement",
      m.agreement
        ? `Signed ${new Date(m.agreement.signedAt).toLocaleDateString("en-US", { dateStyle: "long" })} by ${m.agreement.analystName} and ${m.agreement.participantName}`
        : "Not signed yet",
    ],
  ]);

  // ---- mission statement, set apart
  const mission = answer("mission.statement");
  if (mission) {
    doc.setFont("times", "italic");
    doc.setFontSize(14);
    const lines = doc.splitTextToSize(`"${mission}"`, W - 36) as string[];
    const h = lines.length * 20 + 56;
    ensure(h);
    fill(PANEL);
    doc.roundedRect(M, y, W, h, 4, 4, "F");
    fill(GOLD);
    doc.rect(M, y, 4, h, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    ink(SOFT);
    doc.text("MONEY MISSION STATEMENT", M + 18, y + 20, { charSpace: 1 });
    doc.setFont("times", "italic");
    doc.setFontSize(14);
    ink(INK);
    doc.text(lines, M + 18, y + 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    ink(SOFT);
    doc.text(`${MISSION_VERSE.reference} (${MISSION_VERSE.version})`, M + 18, y + h - 10);
    y += h + 14;
  }

  // ---- the six steps
  const topicNames = m.topics.map((id) => {
    const t = TOPICS.find((x) => x.id === id);
    return t ? topicLabel(t, copy) : id;
  });
  heading("Notes from the meeting");
  steps.forEach((step, i) => {
    ensure(100); // keep a step's title with the start of its notes
    heading(`${i + 1}. ${step.title}`, 2);
    para(step.prompt, { size: 9, style: "italic", color: SOFT, after: 3 });
    let any = false;
    if (step.id === "swot") {
      for (const g of swot) {
        const p = answer(`swot.${g.id}.personal`);
        const f = answer(`swot.${g.id}.financial`);
        if (!p && !f) continue;
        any = true;
        para(g.label, { style: "bold", after: 1 });
        if (p) para(`${g.fields[0].label}: ${p}`, { indent: 10, after: 2 });
        if (f) para(`${g.fields[1].label}: ${f}`, { indent: 10, after: 2 });
      }
    } else {
      for (const f of step.fields) {
        const v = answer(f.key);
        if (!v) continue;
        any = true;
        if (step.fields.length > 1) para(f.label, { style: "bold", after: 1 });
        para(v, { indent: step.fields.length > 1 ? 10 : 0 });
      }
    }
    if (step.id === "recap" && topicNames.length) {
      any = true;
      para("Topics for the workshop", { style: "bold", after: 1 });
      para(topicNames.join("  ·  "), { indent: 10 });
    }
    if (!any) para("No notes taken.", { size: 9.5, color: SOFT, style: "italic" });
  });

  // ---- the tools picked for the PDF
  const toolHeight = (t: ToolSnapshot) =>
    44 + (t.filledIn ? 0 : 30) + t.sections.reduce((n, sec) => n + 24 + sec.rows.length * 26, 0) + t.notes.length * 32;
  if (tools.length > 0) {
    // The section title travels with its first tool.
    ensure(Math.min(toolHeight(tools[0]) + 90, PH - 2 * M - FOOT));
    heading("Next-step tools");
    para("The numbers below are the ones used in the meeting. Change them as life changes.", { size: 9.5, color: SOFT, after: 6 });
    tools.forEach((t) => {
      // Keep a tool together on one page when it fits on one.
      const height = toolHeight(t);
      if (height < PH - 2 * M - FOOT) ensure(height);
      heading(t.title, 2);
      if (!t.filledIn) {
        para("This tool was not filled in during the meeting. The numbers are only a starting example.", { size: 9.5, style: "italic", color: SOFT });
      }
      for (const s of t.sections) {
        para(s.heading, { size: 10, style: "bold", color: SOFT, after: 2 });
        rows(s.rows);
      }
      for (const n of t.notes) para(n, { size: 9, style: "italic", color: SOFT, after: 6 });
      y += 6;
    });
  }

  // ---- footers
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    draw(LINE);
    doc.setLineWidth(0.5);
    doc.line(M, PH - FOOT + 4, M + W, PH - FOOT + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    ink(SOFT);
    doc.text("Confidential: shared only between the analyst and the participant.", M, PH - FOOT + 18);
    doc.text(`Page ${p} of ${pages}`, M + W, PH - FOOT + 18, { align: "right" });
    doc.text(clean(copy("workshop:disclaimer", WORKSHOP_TEXT.disclaimer)), M, PH - FOOT + 30);
  }

  return { doc, filename: `discovery-meeting-${slug(m.participantName)}-${when.toISOString().slice(0, 10)}.pdf` };
}
