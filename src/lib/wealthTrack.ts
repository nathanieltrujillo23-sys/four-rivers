/** Where each client is in the engagement, the next meeting, and the action items on each side. */

export const STAGES = [
  ["prospect", "Prospect"],
  ["discovery", "Discovery"],
  ["analysis", "Analysis"],
  ["presented", "Presented"],
  ["followup", "Follow-up"],
  ["ongoing", "Ongoing"],
  ["closed", "Closed"],
] as const;
export type StageId = (typeof STAGES)[number][0];

export interface ActionItem {
  id: string;
  text: string;
  owner: "me" | "client";
  /** "2026-11-01" or "". */
  due: string;
  done: boolean;
}
export interface TrackData {
  stage: StageId;
  /** The next meeting, "2026-11-01" or "". */
  nextMeeting: string;
  actions: ActionItem[];
  emailTone: "friendly" | "formal";
  /** An extra paragraph for the follow-up email. */
  emailNote: string;
}

export const emptyTrack = (): TrackData => ({ stage: "discovery", nextMeeting: "", actions: [], emailTone: "friendly", emailNote: "" });

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export function normalizeTrack(raw: unknown): TrackData {
  const b = emptyTrack();
  if (!isObj(raw)) return b;
  const actions = Array.isArray(raw.actions)
    ? raw.actions.filter(isObj).slice(0, 40).map((a, i) => ({
        id: typeof a.id === "string" ? a.id : `a${i}`,
        text: typeof a.text === "string" ? a.text : "",
        owner: a.owner === "client" ? ("client" as const) : ("me" as const),
        due: typeof a.due === "string" ? a.due : "",
        done: a.done === true,
      }))
    : [];
  return {
    stage: STAGES.some(([id]) => id === raw.stage) ? (raw.stage as StageId) : b.stage,
    nextMeeting: typeof raw.nextMeeting === "string" ? raw.nextMeeting : "",
    actions,
    emailTone: raw.emailTone === "formal" ? "formal" : "friendly",
    emailNote: typeof raw.emailNote === "string" ? raw.emailNote : "",
  };
}

export const stageLabel = (id: StageId) => STAGES.find(([s]) => s === id)?.[1] ?? "";

/** Open items, overdue ones (due before today), and the soonest due date among the open ones. */
export function actionSummary(t: TrackData, today: string) {
  const open = t.actions.filter((a) => !a.done && a.text.trim());
  const overdue = open.filter((a) => a.due && a.due < today);
  const dates = open.map((a) => a.due).filter(Boolean).sort();
  return { open: open.length, overdue: overdue.length, nextDue: dates[0] ?? "" };
}
