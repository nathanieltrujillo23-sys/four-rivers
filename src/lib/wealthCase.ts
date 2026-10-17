/**
 * Turning a client plan into an anonymized case study that can go in an application portfolio or be shared with the track:
 * the client's name is replaced everywhere, contact details are cleared, notes can be removed, and anything that still looks
 * like an email address or phone number is flagged for a human to check. It cannot know every fact that identifies a person,
 * so the analyst must review the result and confirm it.
 */
import { normalizePlan, type WealthPlan } from "./wealthMath";

export interface CaseOptions {
  /** What the client is called in the case, "Client A". */
  label: string;
  /** A short description without identifying details, shown where the occupation was. */
  description: string;
  /** Clear the discovery meeting notes, money psychology notes and who-it-provides-for text, which are free text. */
  removeNotes: boolean;
}

export interface CaseResult {
  plan: WealthPlan;
  tools: Record<string, unknown>;
  /** How many times the client's name was replaced. */
  replacements: number;
  /** Text that still looks identifying: where it is, and what. */
  flags: { where: string; text: string }[];
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;

/** Words of a name worth replacing: three letters or more, so initials and "of" are left alone. */
export const nameTokens = (name: string): string[] => name.split(/[^\p{L}'’]+/u).filter((t) => t.length >= 3);

function walk(value: unknown, fn: (s: string, path: string) => string, path = ""): unknown {
  if (typeof value === "string") return fn(value, path);
  if (Array.isArray(value)) return value.map((v, i) => walk(v, fn, `${path}[${i}]`));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v, fn, path ? `${path}.${k}` : k)]));
  return value;
}

/** An anonymized copy of the plan and its tool numbers, and a report of what was done and what still needs a look. */
export function anonymizeCase(plan: WealthPlan, tools: Record<string, unknown>, o: CaseOptions): CaseResult {
  const label = o.label.trim() || "Client A";
  const full = plan.client.name.trim();
  const tokens = [...new Set(nameTokens(full))].sort((a, b) => b.length - a.length);
  let replacements = 0;
  const replace = (s: string): string => {
    let out = s;
    if (full) {
      out = out.replace(new RegExp(full.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), () => {
        replacements++;
        return label;
      });
    }
    for (const t of tokens) {
      out = out.replace(new RegExp(`(?<![\\p{L}])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "giu"), () => {
        replacements++;
        return label;
      });
    }
    return out;
  };
  const cleaned = normalizePlan(walk(JSON.parse(JSON.stringify(plan)), (s) => replace(s)));
  const cleanedTools = walk(JSON.parse(JSON.stringify(tools)), (s) => replace(s)) as Record<string, unknown>;

  cleaned.client.name = label;
  cleaned.client.contact = "";
  cleaned.client.occupation = o.description.trim() || "Client (details removed)";
  if (o.removeNotes) {
    cleaned.notes.discovery = "";
    cleaned.client.psychology = "";
    cleaned.mission.beneficiaries = "loved ones";
  }
  // The presenter is the analyst, who is not the subject, so it stays.
  cleaned.deck = { ...cleaned.deck };

  const flags: CaseResult["flags"] = [];
  walk(cleaned, (s, path) => {
    if (EMAIL.test(s) || PHONE.test(s)) flags.push({ where: path, text: s.length > 80 ? `${s.slice(0, 77)}…` : s });
    return s;
  });
  return { plan: cleaned, tools: cleanedTools, replacements, flags };
}
