/** The wording of the Daily Bread Discovery workshop: six steps, with the questions the analyst asks. */

/** The one-page workshop agreement (Daily Bread at the University of Florida), kept in Google Drive. */
export const AGREEMENT_URL = "https://drive.google.com/file/d/1cx4jO4T0jlz8mKUh3h1rMj4QIvn6QJ57/view?usp=sharing";

export const MISSION_VERSE = {
  reference: "Ephesians 2:8-10",
  version: "KJV",
  text: "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast. For we are his workmanship, created in Christ Jesus unto good works, which God hath before ordained that we should walk in them.",
};

export interface WorkshopField {
  /** The key the note is stored under. */
  key: string;
  label: string;
  hint?: string;
  rows?: number;
}

export interface WorkshopStep {
  id: string;
  title: string;
  /** The question for the analyst to ask. */
  prompt: string;
  /** Plain text fields, or groups of them (the SWOT grid). */
  fields: WorkshopField[];
}

const SWOT_PARTS = [
  { id: "strengths", label: "Strengths" },
  { id: "weaknesses", label: "Weaknesses" },
  { id: "opportunities", label: "Opportunities" },
  { id: "threats", label: "Threats" },
] as const;

/** The SWOT grid: each of the four parts, personally and financially. */
export const SWOT_GRID = SWOT_PARTS.map((p) => ({
  id: p.id,
  label: p.label,
  fields: [
    { key: `swot.${p.id}.personal`, label: "Personally", rows: 3 },
    { key: `swot.${p.id}.financial`, label: "Financially", rows: 3 },
  ] as WorkshopField[],
}));

export const WORKSHOP_STEPS: WorkshopStep[] = [
  {
    id: "basics",
    title: "Basics / Connection",
    prompt: "Who are they, how are they doing?",
    fields: [{ key: "basics.notes", label: "Notes", hint: "Their story, what is on their mind, how they are really doing.", rows: 6 }],
  },
  {
    id: "vision",
    title: "Vision",
    prompt: "What kind of life does this person want? If they wrote the storybook version, how would it go?",
    fields: [{ key: "vision.notes", label: "Notes", hint: "Where they live, the work they do, the people around them, how they spend their days.", rows: 7 }],
  },
  {
    id: "swot",
    title: "SWOT Analysis",
    prompt: "What are their strengths, weaknesses, opportunities, and threats? Both personally and financially.",
    fields: SWOT_GRID.flatMap((g) => g.fields),
  },
  {
    id: "reflection",
    title: "SWOT Reflection",
    prompt:
      "Which of their strengths/opportunities do they find most important to lean into, and which weaknesses/threats do they need to work on or prepare for?",
    fields: [
      { key: "reflection.lean", label: "Strengths and opportunities to lean into", rows: 5 },
      { key: "reflection.work", label: "Weaknesses and threats to work on or prepare for", rows: 5 },
    ],
  },
  {
    id: "mission",
    title: "Money Mission Statement",
    prompt: "What good work do they feel called to walk in? What problems do they want to solve? How can their money play a role?",
    fields: [
      { key: "mission.work", label: "The good work they feel called to walk in", rows: 3 },
      { key: "mission.problems", label: "The problems they want to solve", rows: 3 },
      { key: "mission.money", label: "How their money can play a role", rows: 3 },
      { key: "mission.statement", label: "Their money mission statement, in their words", hint: "Write it with them, then read it back.", rows: 4 },
    ],
  },
  {
    id: "recap",
    title: "Recap / Next Steps",
    prompt: "What 2-3 personal finance topics are most important to them? Those are the ones you'll lean into for your workshop.",
    fields: [{ key: "recap.notes", label: "Recap and next steps", hint: "What you agreed on, and when you will meet next.", rows: 5 }],
  },
];

/** The topics to pick from in the last step, and the tool each one opens in the toolkit. */
export const TOPICS: { id: string; label: string; tool: string }[] = [
  { id: "budgeting", label: "Budgeting", tool: "budget" },
  { id: "markets", label: "Investing in the markets", tool: "accounts" },
  { id: "yourself", label: "Investing in yourself", tool: "yourself" },
  { id: "income", label: "Growing income", tool: "income" },
  { id: "marriage", label: "Getting married", tool: "marriage" },
  { id: "car", label: "Buying a car", tool: "car" },
  { id: "house", label: "Buying a house", tool: "house" },
  { id: "vacation", label: "Taking a vacation", tool: "vacation" },
  { id: "debt", label: "Paying off debt", tool: "debt" },
  { id: "emergency", label: "Saving and an emergency fund", tool: "vacation" },
  { id: "giving", label: "Giving", tool: "income" },
];

/** A plain-text summary of a meeting, for copying into notes or an email. */
export function meetingSummary(
  m: { participantName: string; answers: Record<string, string>; topics: string[] },
  date: string,
): string {
  const a = (k: string) => (m.answers[k] ?? "").trim();
  const block = (title: string, body: string) => (body ? `${title}\n${body}\n\n` : "");
  const swot = SWOT_GRID.map((g) => {
    const p = a(`swot.${g.id}.personal`);
    const f = a(`swot.${g.id}.financial`);
    return p || f ? `${g.label}\n  Personally: ${p || "-"}\n  Financially: ${f || "-"}\n` : "";
  })
    .filter(Boolean)
    .join("\n");
  const topics = m.topics.map((id) => TOPICS.find((t) => t.id === id)?.label ?? id);
  return (
    `Discovery meeting with ${m.participantName} (${date})\n\n` +
    block("Basics / Connection", a("basics.notes")) +
    block("Vision", a("vision.notes")) +
    (swot ? `SWOT Analysis\n${swot}\n` : "") +
    block("Lean into", a("reflection.lean")) +
    block("Work on or prepare for", a("reflection.work")) +
    block("Good work called to", a("mission.work")) +
    block("Problems to solve", a("mission.problems")) +
    block("How money can play a role", a("mission.money")) +
    block("Money mission statement", a("mission.statement")) +
    block("Topics for the workshop", topics.join(", ")) +
    block("Recap / Next steps", a("recap.notes"))
  ).trim();
}
