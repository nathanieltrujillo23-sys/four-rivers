/** The steps of a client plan, in order. Step numbers shown on screen come from here, so a new step renumbers the rest. */
export const STEPS = [
  { key: "client", short: "Client" },
  { key: "snapshot", short: "Snapshot" },
  { key: "goals", short: "Goals" },
  { key: "swot", short: "SWOT" },
  { key: "strategy", short: "Strategy" },
  { key: "mission", short: "Mission" },
  { key: "risk", short: "Risk and IPS" },
  { key: "portfolio", short: "Portfolio" },
  { key: "focus", short: "Focus areas" },
  { key: "model", short: "Model" },
  { key: "presentation", short: "Presentation" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

/** The step's number (1 first). */
export const stepNo = (key: StepKey): number => STEPS.findIndex((s) => s.key === key) + 1;
