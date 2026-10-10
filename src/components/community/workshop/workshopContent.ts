/** The wording of the Daily Bread Discovery workshop: six steps, with the questions the analyst asks. */

/** The one-page workshop agreement (Daily Bread at the University of Florida), kept in Google Drive. */
export const AGREEMENT_URL = "https://drive.google.com/file/d/1cx4jO4T0jlz8mKUh3h1rMj4QIvn6QJ57/view?usp=sharing";

export const MISSION_VERSE = {
  reference: "Ephesians 2:8-10",
  version: "KJV",
  text: "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast. For we are his workmanship, created in Christ Jesus unto good works, which God hath before ordained that we should walk in them.",
};

/** Text outside the six steps. Each can be reworded from Admin, Content (keys `workshop:<name>` and `toolkit:<name>`). */
export const WORKSHOP_TEXT = {
  intro:
    "Six steps for a discovery meeting. Take notes as you talk; they save as you type. These notes are confidential: only you (and the group's owner) can see them, and they are never shown to the group.",
  agreementIntro:
    "Read the one-page agreement together. It covers the educational purpose, that this is not financial advice, and strict confidentiality. Then both of you sign below.",
  agreementConsent:
    "We have read the agreement, understand this workshop is education and not financial advice, and agree to keep everything shared confidential.",
  nextStep: "Open the tools for the topics you chose and work through the numbers together.",
  pdfIntro:
    "Tick the box under 2 or 3 tools above to include them. The PDF has your notes from the six steps, the money mission statement, the topics, and the numbers from each chosen tool.",
  disclaimer: "Education only. Nothing here is financial, legal, tax, or investment advice.",
} as const;

export const TOOLKIT_TEXT = {
  intro: "Thirty-six tools in six sections: Live, Give, Grow, Owe, Estate planning, and Other financial goals. Open a section, then a tool.",
  disclaimer:
    "These tools are for learning and planning. They use the numbers you type, make simple assumptions, and are not financial, tax, legal, or investment advice. The estate planning pages are organizers, not legal documents.",
} as const;

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
  { id: "emergency", label: "Saving and an emergency fund", tool: "emergency" },
  { id: "giving", label: "Giving", tool: "giveplan" },
  { id: "markets", label: "Investing in the markets", tool: "accounts" },
  { id: "yourself", label: "Investing in yourself", tool: "yourself" },
  { id: "income", label: "Growing income", tool: "income" },
  { id: "retirement", label: "Retirement", tool: "retire" },
  { id: "debt", label: "Paying off debt", tool: "debt" },
  { id: "car", label: "Buying a car", tool: "car" },
  { id: "house", label: "Buying a house", tool: "house" },
  { id: "estate", label: "Estate planning", tool: "will" },
  { id: "marriage", label: "Getting married", tool: "marriage" },
  { id: "vacation", label: "Taking a vacation", tool: "vacation" },
  { id: "family", label: "Having a child", tool: "baby" },
  { id: "business", label: "Starting a business", tool: "business" },
  { id: "moving", label: "Moving", tool: "moving" },
];

/** A plain-text summary of a meeting, for copying into notes or an email. */
export function meetingSummary(
  m: { participantName: string; answers: Record<string, string>; topics: string[] },
  date: string,
  copy: (key: string, fallback: string) => string = (_k, f) => f,
): string {
  const a = (k: string) => (m.answers[k] ?? "").trim();
  const steps = workshopSteps(copy);
  const title = (id: string) => steps.find((x) => x.id === id)!.title;
  const label = (key: string) => steps.flatMap((x) => x.fields).find((f) => f.key === key)?.label ?? key;
  const block = (heading: string, body: string) => (body ? `${heading}\n${body}\n\n` : "");
  const swot = swotGrid(copy)
    .map((g) => {
      const p = a(`swot.${g.id}.personal`);
      const f = a(`swot.${g.id}.financial`);
      return p || f ? `${g.label}\n  ${g.fields[0].label}: ${p || "-"}\n  ${g.fields[1].label}: ${f || "-"}\n` : "";
    })
    .filter(Boolean)
    .join("\n");
  const topics = m.topics.map((id) => {
    const t = TOPICS.find((x) => x.id === id);
    return t ? topicLabel(t, copy) : id;
  });
  return (
    `Discovery meeting with ${m.participantName} (${date})\n\n` +
    block(title("basics"), a("basics.notes")) +
    block(title("vision"), a("vision.notes")) +
    (swot ? `${title("swot")}\n${swot}\n` : "") +
    block(label("reflection.lean"), a("reflection.lean")) +
    block(label("reflection.work"), a("reflection.work")) +
    block(label("mission.work"), a("mission.work")) +
    block(label("mission.problems"), a("mission.problems")) +
    block(label("mission.money"), a("mission.money")) +
    block(label("mission.statement"), a("mission.statement")) +
    block("Topics for the workshop", topics.join(", ")) +
    block(title("recap"), a("recap.notes"))
  ).trim();
}

type CopyFn = (key: string, fallback: string) => string;
const plain: CopyFn = (_k, f) => f;

/** The six steps with any reworded titles, questions, labels, and hints applied. */
export function workshopSteps(copy: CopyFn = plain): WorkshopStep[] {
  return WORKSHOP_STEPS.map((st) => ({
    ...st,
    title: copy(`workshop:step:${st.id}:title`, st.title),
    prompt: copy(`workshop:step:${st.id}:prompt`, st.prompt),
    fields: st.fields.map((f) => ({
      ...f,
      label: copy(`workshop:field:${f.key}:label`, f.label),
      hint: f.hint === undefined ? undefined : copy(`workshop:field:${f.key}:hint`, f.hint),
    })),
  }));
}

/** The SWOT grid with any reworded labels applied. */
export function swotGrid(copy: CopyFn = plain) {
  return SWOT_GRID.map((g) => ({
    ...g,
    label: copy(`workshop:swot:${g.id}`, g.label),
    fields: g.fields.map((f) => ({ ...f, label: copy(`workshop:field:${f.key}:label`, f.label) })),
  }));
}

export const topicLabel = (t: { id: string; label: string }, copy: CopyFn = plain) => copy(`workshop:topic:${t.id}`, t.label);
