/**
 * Two thinking tools for Consulting Tools: an issue tree (break a question into parts that do not overlap and leave nothing
 * out) and a storyline (the answer first, then the three reasons, then what to do), which becomes a three-slide
 * recommendation. The checks here are prompts for the student's judgment, not a grade.
 */

/* ------------------------------------------------------------------ */
/* Issue trees                                                         */
/* ------------------------------------------------------------------ */

export interface TreeNode {
  id: string;
  text: string;
  /** Marked as the branch you would test first. */
  hypothesis: boolean;
  children: TreeNode[];
}
export interface IssueTree {
  id: string;
  title: string;
  /** The question at the top of the tree. */
  question: string;
  branches: TreeNode[];
}

export const MAX_DEPTH = 4;
export const MAX_NODES = 60;

let counter = 0;
/** An id that is unique within this session and stable once saved. */
export const nodeId = () => `n${Date.now().toString(36)}${(counter++).toString(36)}`;

const node = (text: string, children: TreeNode[] = []): TreeNode => ({ id: nodeId(), text, hypothesis: false, children });

export const TREE_TEMPLATES: { name: string; question: string; build: () => TreeNode[] }[] = [
  {
    name: "Profit is falling",
    question: "Why has profit fallen, and what would restore it?",
    build: () => [
      node("Revenue has fallen", [node("Price per unit is lower"), node("Units sold are lower", [node("The market is smaller"), node("Our share of it is smaller")]), node("The mix has shifted to cheaper products")]),
      node("Costs have risen", [node("Variable cost per unit is higher"), node("Fixed costs are higher")]),
    ],
  },
  {
    name: "Should we enter a market?",
    question: "Should the client enter this market?",
    build: () => [
      node("Is the market attractive?", [node("Size and growth"), node("Profitability of players in it")]),
      node("Can we win in it?", [node("What customers want that we can offer"), node("How competitors would respond")]),
      node("Is it worth it for us?", [node("Investment needed and payback"), node("Risks, and what we would give up")]),
    ],
  },
  {
    name: "How do we grow?",
    question: "How can the client grow revenue by the target?",
    build: () => [
      node("Sell more to today's customers", [node("Raise price"), node("More purchases per customer"), node("Keep more customers from leaving")]),
      node("Win new customers", [node("In today's markets"), node("In new places or segments")]),
      node("Offer something new", [node("Build it"), node("Buy or partner for it")]),
    ],
  },
  { name: "Blank", question: "", build: () => [node(""), node("")] },
];

export const newTree = (template = 0): IssueTree => {
  const t = TREE_TEMPLATES[template] ?? TREE_TEMPLATES[0];
  return { id: nodeId(), title: t.name === "Blank" ? "New issue tree" : t.name, question: t.question, branches: t.build() };
};

const walk = (nodes: TreeNode[], fn: (n: TreeNode, depth: number, siblings: TreeNode[]) => void, depth = 1) => {
  for (const x of nodes) {
    fn(x, depth, nodes);
    walk(x.children, fn, depth + 1);
  }
};
export const countNodes = (nodes: TreeNode[]): number => nodes.reduce((a, x) => a + 1 + countNodes(x.children), 0);

/** Applies a change to the list that holds a node (found by id). Returns a new tree. */
function editList(nodes: TreeNode[], id: string, fn: (list: TreeNode[], index: number) => TreeNode[]): TreeNode[] {
  const i = nodes.findIndex((x) => x.id === id);
  if (i >= 0) return fn(nodes, i);
  return nodes.map((x) => ({ ...x, children: editList(x.children, id, fn) }));
}
const mapNode = (nodes: TreeNode[], id: string, fn: (n: TreeNode) => TreeNode): TreeNode[] => nodes.map((x) => (x.id === id ? fn(x) : { ...x, children: mapNode(x.children, id, fn) }));
const depthOf = (nodes: TreeNode[], id: string, depth = 1): number => {
  for (const x of nodes) {
    if (x.id === id) return depth;
    const d = depthOf(x.children, id, depth + 1);
    if (d) return d;
  }
  return 0;
};

export const tree = {
  setText: (t: IssueTree, id: string, text: string): IssueTree => ({ ...t, branches: mapNode(t.branches, id, (x) => ({ ...x, text })) }),
  toggleHypothesis: (t: IssueTree, id: string): IssueTree => ({ ...t, branches: mapNode(t.branches, id, (x) => ({ ...x, hypothesis: !x.hypothesis })) }),
  /** Adds a sub-branch under a node (not past the depth limit or the size limit). */
  addChild: (t: IssueTree, id: string): IssueTree => {
    if (countNodes(t.branches) >= MAX_NODES || depthOf(t.branches, id) >= MAX_DEPTH) return t;
    return { ...t, branches: mapNode(t.branches, id, (x) => ({ ...x, children: [...x.children, node("")] })) };
  },
  /** Adds a branch beside a node, right after it. */
  addSibling: (t: IssueTree, id: string): IssueTree => (countNodes(t.branches) >= MAX_NODES ? t : { ...t, branches: editList(t.branches, id, (list, i) => [...list.slice(0, i + 1), node(""), ...list.slice(i + 1)]) }),
  addTop: (t: IssueTree): IssueTree => (countNodes(t.branches) >= MAX_NODES ? t : { ...t, branches: [...t.branches, node("")] }),
  remove: (t: IssueTree, id: string): IssueTree => ({ ...t, branches: editList(t.branches, id, (list, i) => list.filter((_, k) => k !== i)) }),
  move: (t: IssueTree, id: string, by: -1 | 1): IssueTree => ({
    ...t,
    branches: editList(t.branches, id, (list, i) => {
      const j = i + by;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    }),
  }),
};

export interface TreeCheck {
  branches: number;
  leaves: number;
  depth: number;
  hypotheses: number;
  /** Things worth a second look, in plain words. */
  prompts: string[];
}

/** Counts the tree and lists what to look at again: single sub-branches, too many branches, blanks, repeats, no hypothesis. */
export function checkTree(t: IssueTree): TreeCheck {
  let leaves = 0;
  let depth = 0;
  let hypotheses = 0;
  let blanks = 0;
  const single: string[] = [];
  const wide: string[] = [];
  const repeats: string[] = [];
  const seenLists = new Set<TreeNode[]>();
  const lists = (list: TreeNode[], parent: string) => {
    if (seenLists.has(list)) return;
    seenLists.add(list);
    if (list.length === 1 && parent) single.push(parent);
    if (list.length > 5) wide.push(parent || "the top of the tree");
    const texts = list.map((x) => x.text.trim().toLowerCase()).filter(Boolean);
    const dup = texts.find((x, i) => texts.indexOf(x) !== i);
    if (dup) repeats.push(dup);
  };
  lists(t.branches, "");
  walk(t.branches, (x, d) => {
    depth = Math.max(depth, d);
    if (!x.children.length) leaves += 1;
    if (x.hypothesis) hypotheses += 1;
    if (!x.text.trim()) blanks += 1;
    lists(x.children, x.text.trim() || "an unnamed branch");
  });
  const prompts: string[] = [];
  if (!t.question.trim()) prompts.push("Write the question at the top. A tree answers one question; if you cannot state it, the tree will wander.");
  if (t.branches.length < 2) prompts.push("Split the question into at least two branches.");
  if (blanks) prompts.push(`${blanks} ${blanks === 1 ? "branch is" : "branches are"} blank. Name ${blanks === 1 ? "it" : "them"} or remove ${blanks === 1 ? "it" : "them"}.`);
  for (const s of single) prompts.push(`"${s}" has only one sub-branch. One part is not a split: add what else it could be, or fold it into its parent.`);
  for (const w of wide) prompts.push(`${w === "the top of the tree" ? "The top of the tree" : `"${w}"`} has more than five branches. Group them so a listener can hold them: three or four is the usual limit.`);
  for (const r of repeats) prompts.push(`"${r}" appears twice at the same level. Branches should not overlap.`);
  if (!hypotheses && countNodes(t.branches) >= 4) prompts.push("Mark the branch you would test first. A tree without a hypothesis is a list; the hypothesis says where to start.");
  if (!prompts.length) prompts.push("Now test it aloud: do the branches at each level overlap? Together, do they cover everything? Could a branch be tested with data you could ask for?");
  return { branches: t.branches.length, leaves, depth, hypotheses, prompts };
}

/** The tree as indented lines, for copying into notes or a slide. */
export function outline(t: IssueTree): string {
  const lines = [t.question.trim() || t.title];
  walk(t.branches, (x, d) => lines.push(`${"  ".repeat(d)}- ${x.text.trim() || "(blank)"}${x.hypothesis ? "  [test first]" : ""}`));
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/* Storyline                                                           */
/* ------------------------------------------------------------------ */

export interface Argument {
  id: string;
  /** The reason, as a full sentence. */
  claim: string;
  /** Up to three facts or analyses behind it. */
  support: string[];
  /** The chart or table that would prove it. */
  exhibit: string;
}
export interface Storyline {
  id: string;
  title: string;
  client: string;
  situation: string;
  complication: string;
  question: string;
  /** The governing thought: the recommendation in one sentence. It is the title of slide 1. */
  answer: string;
  arguments: Argument[];
  /** The titles of slides 2 and 3, each a full sentence. */
  evidenceTitle: string;
  nextTitle: string;
  risks: string[];
  next: string[];
}

const argument = (): Argument => ({ id: nodeId(), claim: "", support: ["", "", ""], exhibit: "" });
export const newStoryline = (): Storyline => ({ id: nodeId(), title: "New recommendation", client: "", situation: "", complication: "", question: "", answer: "", arguments: [argument(), argument(), argument()], evidenceTitle: "", nextTitle: "", risks: ["", "", ""], next: ["", "", ""] });

export const exampleStoryline = (): Storyline => ({
  id: nodeId(),
  title: "Example: the regional gym chain",
  client: "FitCo (an invented client)",
  situation: "FitCo runs 40 gyms across the Southeast and grew revenue 8% a year for a decade.",
  complication: "Membership has fallen 6% in two years while two low-price chains opened 25 gyms in its cities.",
  question: "How should FitCo respond to restore growth?",
  answer: "FitCo should defend its 15 strongest gyms with a premium offer and close or convert the 8 weakest, which lifts profit by about $6 million a year.",
  arguments: [
    { id: nodeId(), claim: "The low-price chains are taking only price-sensitive members, who were never profitable.", support: ["Members who left paid 30% less than average", "Their visits per month were half the average", "Churn among members on premium plans is unchanged"], exhibit: "Bar chart: profit per member by plan, leavers against stayers" },
    { id: nodeId(), claim: "Fifteen gyms earn 70% of profit and face little new competition.", support: ["Profit by gym, ranked", "Only 3 of the 15 have a low-price rival within 5 miles", "They are at 85% of capacity at peak hours"], exhibit: "Ranked bar chart: profit by gym, with rivals marked" },
    { id: nodeId(), claim: "The eight weakest gyms lose money and cannot be fixed by price.", support: ["Each has two or more low-price rivals nearby", "Matching price would cut revenue 25% across all members", "Leases on five of them end within 18 months"], exhibit: "Table: the eight gyms, loss, rivals and lease end date" },
  ],
  evidenceTitle: "Profit is concentrated in gyms the new chains have not reached, and the losses are concentrated where they have.",
  nextTitle: "The plan carries two risks, both manageable, and can start within 90 days.",
  risks: ["Premium members may also leave if service slips during the changes", "Closing gyms could hurt the brand in those cities", ""],
  next: ["Confirm profit by gym with finance in the next two weeks", "Pilot the premium offer in three gyms for one quarter", "Open talks with landlords on the five expiring leases"],
});

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);
/** A title that names a topic ("Market overview") instead of saying what to conclude. */
export const isTopicLabel = (s: string) => {
  const w = words(s);
  return w.length > 0 && w.length < 6;
};

export interface StoryCheck {
  /** Titles of the three slides, in order: reading only these should tell the whole story. */
  titles: string[];
  filled: number;
  total: number;
  prompts: string[];
  ready: boolean;
}

export function checkStory(s: Storyline): StoryCheck {
  const prompts: string[] = [];
  const claims = s.arguments.map((a) => a.claim.trim());
  const titles = [s.answer.trim(), s.evidenceTitle.trim(), s.nextTitle.trim()];
  if (!s.answer.trim()) prompts.push("Write the answer first: one sentence that says what the client should do. Everything else supports it.");
  else if (isTopicLabel(s.answer)) prompts.push("The answer reads like a topic. Say what to do and, if you can, what it is worth.");
  else if (!/\d/.test(s.answer)) prompts.push("Put a number in the answer if you have one (the size of the prize, a date, a count). It makes the recommendation concrete.");
  if (!s.question.trim()) prompts.push("State the client's question. The answer should respond to exactly that question.");
  const empty = claims.filter((c) => !c).length;
  if (empty) prompts.push(`${empty} of the three reasons ${empty === 1 ? "is" : "are"} blank. Three reasons is the usual shape; two strong ones beat three weak ones.`);
  s.arguments.forEach((a, i) => {
    if (a.claim.trim() && isTopicLabel(a.claim)) prompts.push(`Reason ${i + 1} reads like a topic ("${a.claim.trim()}"). Write it as a sentence that could be true or false.`);
    if (a.claim.trim() && !a.support.some((x) => x.trim())) prompts.push(`Reason ${i + 1} has nothing under it. What fact or analysis would make a skeptic believe it?`);
  });
  for (const [label, t] of [["slide 2", s.evidenceTitle], ["slide 3", s.nextTitle]] as const) {
    if (!t.trim()) prompts.push(`Give ${label} a title that is a full sentence.`);
    else if (isTopicLabel(t)) prompts.push(`The title of ${label} reads like a topic. A reader who sees only the titles should still get the story.`);
  }
  if (!s.next.some((x) => x.trim())) prompts.push("Add at least one next step: who does what, by when.");
  const fields = [s.situation, s.complication, s.question, s.answer, ...claims, s.evidenceTitle, s.nextTitle, s.next.join(""), s.risks.join("")];
  const filled = fields.filter((x) => x.trim()).length;
  const ready = !!s.answer.trim() && claims.filter(Boolean).length >= 2 && !!s.evidenceTitle.trim() && !!s.nextTitle.trim();
  if (!prompts.length) prompts.push("Read only the three titles aloud. If they tell the story on their own, the deck works. Then ask of every line: so what?");
  return { titles, filled, total: fields.length, prompts, ready };
}

/* ------------------------------------------------------------------ */
/* Saving                                                              */
/* ------------------------------------------------------------------ */

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const strs = (v: unknown, count: number) => {
  const list = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  return Array.from({ length: count }, (_, i) => list[i] ?? "");
};

function normalizeNodes(raw: unknown, depth: number, budget: { left: number }): TreeNode[] {
  if (!Array.isArray(raw) || depth > MAX_DEPTH) return [];
  const out: TreeNode[] = [];
  for (const x of raw) {
    if (!isObj(x) || budget.left <= 0) continue;
    budget.left -= 1;
    out.push({ id: str(x.id, nodeId()), text: str(x.text).slice(0, 200), hypothesis: x.hypothesis === true, children: normalizeNodes(x.children, depth + 1, budget) });
  }
  return out;
}

export function normalizeTrees(raw: unknown): IssueTree[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isObj).slice(0, 20).map((t) => ({ id: str(t.id, nodeId()), title: str(t.title, "Issue tree").slice(0, 120), question: str(t.question).slice(0, 300), branches: normalizeNodes(t.branches, 1, { left: MAX_NODES }) }));
}

export function normalizeStorylines(raw: unknown): Storyline[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isObj).slice(0, 20).map((s) => {
    const args = Array.isArray(s.arguments) ? s.arguments.filter(isObj).slice(0, 3) : [];
    return {
      id: str(s.id, nodeId()),
      title: str(s.title, "Recommendation").slice(0, 120),
      client: str(s.client).slice(0, 120),
      situation: str(s.situation).slice(0, 600),
      complication: str(s.complication).slice(0, 600),
      question: str(s.question).slice(0, 300),
      answer: str(s.answer).slice(0, 400),
      arguments: Array.from({ length: 3 }, (_, i): Argument => {
        const a = args[i];
        return a ? { id: str(a.id, nodeId()), claim: str(a.claim).slice(0, 300), support: strs(a.support, 3).map((x) => x.slice(0, 200)), exhibit: str(a.exhibit).slice(0, 200) } : argument();
      }),
      evidenceTitle: str(s.evidenceTitle).slice(0, 300),
      nextTitle: str(s.nextTitle).slice(0, 300),
      risks: strs(s.risks, 3).map((x) => x.slice(0, 200)),
      next: strs(s.next, 3).map((x) => x.slice(0, 200)),
    };
  });
}
