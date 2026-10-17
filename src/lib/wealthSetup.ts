/**
 * Tailoring a client plan: what kind of client this is, and which parts of the workbench and the deck are switched on. A client
 * type only sets sensible starting choices; every part can be turned on or off for the one person, and the choice is kept with
 * the plan.
 */

export const CLIENT_TYPES = [
  { id: "general", label: "General", text: "Everything on. Turn parts off as the conversation shows what matters." },
  { id: "student", label: "College student", text: "Short horizon, small balances: budgeting, a first Roth IRA, building credit and a buffer." },
  { id: "young", label: "Young professional", text: "Employer plan, debt, a first home, and starting to invest." },
  { id: "business", label: "Business owner or self-employed", text: "Variable income, self-employment tax, insurance, and selling or saving from the business." },
  { id: "family", label: "Family with children", text: "Insurance, education savings, a home, and giving." },
  { id: "preretire", label: "Near retirement", text: "Income that lasts, taxes on withdrawals, Roth conversions, and giving." },
  { id: "executive", label: "Executive or concentrated stock", text: "Employer stock, large gains, tax planning, and charitable giving." },
] as const;
export type ClientTypeId = (typeof CLIENT_TYPES)[number]["id"];

export interface ModuleDef {
  id: string;
  label: string;
  text: string;
  /** Plan steps this part adds (see steps.ts). */
  steps: string[];
  /** Deck sections this part adds (see DECK_SECTIONS). */
  deck: string[];
}

/** The parts of the workbench that can be switched off. The client, snapshot, goals, risk, model and presentation steps are always on. */
export const MODULES: ModuleDef[] = [
  { id: "swot", label: "SWOT and strategy", text: "Strengths, weaknesses, opportunities and threats, and the strategy built from them.", steps: ["swot", "strategy"], deck: ["swot", "strategy"] },
  { id: "mission", label: "Money mission", text: "The vision and one-sentence mission that guide decisions.", steps: ["mission"], deck: ["vision"] },
  { id: "portfolio", label: "Portfolio and investments", text: "Capital market assumptions, allocation, the efficient frontier, stress tests and fees.", steps: ["portfolio"], deck: ["allocation", "stress", "fees", "market"] },
  { id: "retirement", label: "Retirement income", text: "Whether the money lasts through retirement.", steps: [], deck: ["retirement"] },
  { id: "focus", label: "Focus areas and toolkit", text: "The 2 or 3 topics the client most wants to learn, with their toolkit tools.", steps: ["focus"], deck: ["focus"] },
];
export const PLANNING_MODULES: ModuleDef[] = [
  { id: "planning.insurance", label: "Insurance needs", text: "Life, disability and umbrella coverage.", steps: [], deck: ["insurance"] },
  { id: "planning.roth", label: "Roth conversion", text: "Whether and how much to convert.", steps: [], deck: ["roth"] },
  { id: "planning.location", label: "Asset location", text: "Which account holds which investment.", steps: [], deck: ["location"] },
  { id: "planning.gains", label: "Capital gains", text: "The tax on selling, and gain or loss harvesting.", steps: [], deck: ["gains"] },
  { id: "planning.giving", label: "Charitable giving", text: "Cash, stock or a donor-advised fund.", steps: [], deck: ["giving"] },
];
export const ALL_MODULES: ModuleDef[] = [...MODULES, ...PLANNING_MODULES];

/** What a client type switches off to begin with. Everything else is on. */
const OFF: Record<ClientTypeId, string[]> = {
  general: [],
  student: ["portfolio", "retirement", "planning.insurance", "planning.location", "planning.gains", "planning.giving"],
  young: ["planning.location", "planning.gains", "planning.giving"],
  business: ["planning.roth", "planning.giving"],
  family: ["planning.gains"],
  preretire: [],
  executive: ["planning.roth"],
};

export interface SetupData {
  type: ClientTypeId;
  /** Parts the analyst switched on or off by hand; anything not here follows the client type. */
  modules: Record<string, boolean>;
}

export const emptySetup = (): SetupData => ({ type: "general", modules: {} });

export function normalizeSetup(raw: unknown): SetupData {
  const base = emptySetup();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const r = raw as Record<string, unknown>;
  const type = CLIENT_TYPES.some((t) => t.id === r.type) ? (r.type as ClientTypeId) : "general";
  const modules: Record<string, boolean> = {};
  if (r.modules && typeof r.modules === "object" && !Array.isArray(r.modules)) {
    for (const [k, v] of Object.entries(r.modules as Record<string, unknown>)) if (typeof v === "boolean" && ALL_MODULES.some((m) => m.id === k)) modules[k] = v;
  }
  return { type, modules };
}

/** Whether a part is on for this client: the analyst's choice, or else the client type's default. */
export const moduleOn = (setup: SetupData, id: string): boolean => setup.modules[id] ?? !OFF[setup.type].includes(id);

/** The planning tools that are on (the Planning step shows only these). */
export const planningToolsOn = (setup: SetupData): string[] => PLANNING_MODULES.filter((m) => moduleOn(setup, m.id)).map((m) => m.id.replace("planning.", ""));

/** Whether a step is shown for this client. */
export function stepVisible(setup: SetupData, key: string): boolean {
  if (key === "planning") return planningToolsOn(setup).length > 0;
  const m = MODULES.find((x) => x.steps.includes(key));
  return m ? moduleOn(setup, m.id) : true;
}

/** Deck section ids that are off for this client because their part of the workbench is off. */
export function deckSectionsOff(setup: SetupData): Set<string> {
  const off = new Set<string>();
  for (const m of ALL_MODULES) if (!moduleOn(setup, m.id)) for (const d of m.deck) off.add(d);
  return off;
}
