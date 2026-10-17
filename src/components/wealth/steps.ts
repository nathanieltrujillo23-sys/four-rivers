import { stepVisible, type SetupData } from "../../lib/wealthSetup";

/** The steps of a client plan, in order. Step numbers shown on screen come from the steps that are on for this client. */
export const STEPS = [
  { key: "client", short: "Client" },
  { key: "snapshot", short: "Snapshot" },
  { key: "goals", short: "Goals" },
  { key: "swot", short: "SWOT" },
  { key: "strategy", short: "Strategy" },
  { key: "mission", short: "Mission" },
  { key: "risk", short: "Risk and IPS" },
  { key: "portfolio", short: "Portfolio" },
  { key: "planning", short: "Planning depth" },
  { key: "focus", short: "Focus areas" },
  { key: "model", short: "Model" },
  { key: "presentation", short: "Presentation" },
  { key: "followup", short: "Follow-up" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

/** The steps that are on for this client, in order. */
export const stepsFor = (setup: SetupData) => STEPS.filter((s) => stepVisible(setup, s.key));

// The page sets this while it renders, so the headings in each step number themselves among the steps that are showing.
let showing: readonly StepKey[] = STEPS.map((s) => s.key);
export const setShowingSteps = (keys: readonly StepKey[]) => {
  showing = keys;
};

/** The step's number (1 first), among the steps that are showing. */
export const stepNo = (key: StepKey): number => {
  const i = showing.indexOf(key);
  return (i < 0 ? STEPS.findIndex((s) => s.key === key) : i) + 1;
};
