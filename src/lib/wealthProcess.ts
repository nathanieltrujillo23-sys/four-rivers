/** The "How we work together" slide: the steps of the engagement, in the presenter's words, tailored to each client. */

export interface ProcessStep {
  id: string;
  title: string;
  text: string;
}
export interface ProcessData {
  steps: ProcessStep[];
  /** A closing line about the client's role and the limits of the work. */
  promise: string;
}

export const DEFAULT_PROMISE = "You decide what to do. This is an educational exercise; for advice on products, taxes or legal matters we point you to licensed professionals.";

export const defaultProcess = (cadence = ""): ProcessData => ({
  steps: [
    { id: "p1", title: "Discovery", text: "We listen first: your story, what you value, what worries you, and what you want your money to do." },
    { id: "p2", title: "Organize", text: "We lay out what you own and owe, where each month goes, and your goals with amounts and dates." },
    { id: "p3", title: "Analyze", text: "We test the numbers with a model, look at risk and the range of outcomes, and compare options." },
    { id: "p4", title: "Discuss options", text: "We walk through the options and what each would mean, in plain words, and you choose what fits." },
    { id: "p5", title: "Follow up", text: cadence.trim() ? `We check in ${cadence.trim().toLowerCase()} and refresh the plan when life changes.` : "We check in on a schedule that suits you and refresh the plan when life changes." },
  ],
  promise: DEFAULT_PROMISE,
});

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** An empty list means "use the standard five steps"; a saved list is kept as written. */
export function normalizeProcess(raw: unknown): ProcessData {
  const base = defaultProcess();
  if (!isObj(raw)) return { steps: [], promise: DEFAULT_PROMISE };
  const steps = Array.isArray(raw.steps)
    ? raw.steps.filter(isObj).slice(0, 6).map((s, i) => ({ id: typeof s.id === "string" ? s.id : `p${i}`, title: typeof s.title === "string" ? s.title : "", text: typeof s.text === "string" ? s.text : "" }))
    : [];
  return { steps, promise: typeof raw.promise === "string" && raw.promise.trim() ? raw.promise : base.promise };
}

/** The steps to show: the saved ones, or the standard five when none are saved. */
export const processSteps = (p: ProcessData, cadence: string): ProcessStep[] => (p.steps.length ? p.steps : defaultProcess(cadence).steps);
