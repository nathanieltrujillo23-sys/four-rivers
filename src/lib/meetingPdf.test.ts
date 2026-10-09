import { describe, expect, it } from "vitest";
import type { DiscoveryMeeting } from "../types";
import { summarizeTool } from "../components/community/workshop/toolSummaries";
import { TOOL_IDS } from "../components/community/workshop/toolCatalog";
import { buildMeetingPdf } from "./meetingPdf";

const meeting: DiscoveryMeeting = {
  id: "m1",
  groupId: "g1",
  participantName: "Alex Rivera",
  step: 5,
  answers: {
    "basics.notes": "Junior in finance. Stressed about loans, “but hopeful”.",
    "swot.strengths.personal": "Disciplined and good with people",
    "swot.threats.financial": "Student loans",
    "mission.statement": "Use money to open doors for others.",
    "recap.notes": "Meet again in two weeks.",
  },
  topics: ["car", "debt"],
  agreement: {
    analystName: "Sam Analyst",
    analystSignature: { kind: "typed", text: "Sam Analyst" },
    participantName: "Alex Rivera",
    participantSignature: { kind: "typed", text: "Alex Rivera" },
    signedAt: "2026-10-09T15:00:00.000Z",
  },
  completedAt: null,
  createdAt: "2026-10-09T14:00:00.000Z",
  updatedAt: "2026-10-09T15:30:00.000Z",
};

// PDF text escapes parentheses and backslashes; undo that to search it.
const textOf = (doc: Awaited<ReturnType<typeof buildMeetingPdf>>["doc"]) => doc.output().replace(/\\([()\\])/g, "$1");

describe("meeting PDF", () => {
  it("holds the notes, the mission statement, the topics, and the chosen tools", async () => {
    const tools = [summarizeTool("car", { price: 30000 }), summarizeTool("debt", undefined)];
    const { doc, filename } = await buildMeetingPdf({ meeting, analystName: "Sam Analyst", tools });
    const text = textOf(doc);
    expect(filename).toBe("discovery-meeting-alex-rivera-2026-10-09.pdf");
    for (const needle of [
      "Discovery meeting",
      "Alex Rivera",
      "Sam Analyst",
      "Use money to open doors for others.",
      "Ephesians 2:8-10 (KJV)",
      "Student loans",
      "Buying a car",
      "Paying off debt",
      "Meet again in two weeks.",
      "Confidential",
    ]) {
      expect(text).toContain(needle);
    }
    // The car tool used the saved price, and the debt tool says it was only the starting example.
    expect(text).toContain("$30,000");
    expect(text).toContain("not filled in during the meeting");
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
  });

  it("copes with a meeting that has no notes at all, and with text a PDF font cannot show", async () => {
    const empty = { ...meeting, answers: { "basics.notes": "Smile 😀 and emoji" }, topics: [], agreement: null };
    const { doc } = await buildMeetingPdf({ meeting: empty, analystName: "", tools: [] });
    const text = textOf(doc);
    expect(text).toContain("No notes taken.");
    expect(text).toContain("Not signed yet");
    expect(text).not.toContain("😀");
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it("summarizes every tool, from its saved numbers or its starting ones", () => {
    for (const id of TOOL_IDS) {
      const starting = summarizeTool(id, undefined);
      expect(starting.filledIn).toBe(false);
      expect(starting.sections.length).toBeGreaterThan(0);
      for (const s of starting.sections) for (const [label, value] of s.rows) expect(`${label}${value}`).not.toMatch(/NaN|undefined|Infinity/);
      const saved = summarizeTool(id, {});
      expect(saved.filledIn).toBe(true);
    }
  });

  it("flows long notes onto more pages", async () => {
    const long = { ...meeting, answers: { "basics.notes": "A long note. ".repeat(900) } };
    const { doc } = await buildMeetingPdf({ meeting: long, analystName: "S", tools: [] });
    expect(doc.getNumberOfPages()).toBeGreaterThan(2);
  });
});
