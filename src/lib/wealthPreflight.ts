/**
 * An automatic review of a plan before it is shown to anyone: what the presentation and the free text in the plan say, checked
 * against the compliance posture in wealthCompliance.ts. It catches wording and missing pieces; it does not replace the
 * presenter's own checklist or any real compliance review.
 */
import { deckOutline } from "./wealthDeck";
import { checklistProgress, roleProblem, scanForPromises } from "./wealthCompliance";
import { marketFilled } from "./wealthHouse";
import { weightTotal } from "./wealthPortfolio";
import { SWOT_KEYS, type WealthPlan } from "./wealthMath";

export interface PreflightItem {
  id: string;
  level: "pass" | "warn";
  text: string;
  /** What to do about a warning. */
  fix?: string;
}

/** Every piece of free text a person typed that ends up on a slide, in the handout, or in the notes. */
export function freeText(plan: WealthPlan): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [
    { where: "the client's money psychology notes", text: plan.client.psychology },
    { where: "the discovery notes", text: plan.notes.discovery },
    { where: "the vision", text: plan.mission.vision },
    { where: "the mission", text: plan.mission.custom },
    { where: "the market headline", text: plan.market.headline },
    { where: "the market view", text: `${plan.market.bullets.join(" ")} ${plan.market.changeMind}` },
    { where: "the process slide", text: `${plan.process.steps.map((s) => `${s.title} ${s.text}`).join(" ")} ${plan.process.promise}` },
    { where: "the insurance note", text: plan.planning.insurance.note },
    { where: "the Roth conversion note", text: plan.planning.roth.note },
    { where: "the asset location note", text: plan.planning.location.note },
    { where: "the capital gains note", text: plan.planning.gains.note },
    { where: "the giving note", text: plan.planning.giving.note },
    { where: "the follow-up email note", text: plan.track.emailNote },
  ];
  for (const k of SWOT_KEYS) out.push({ where: `the SWOT (${k})`, text: plan.swot[k].map((x) => x.text).join(" ") });
  for (const s of plan.scenarios.list) out.push({ where: `the "${s.name}" scenario`, text: s.note });
  for (const g of plan.goals) out.push({ where: `the goal "${g.name}"`, text: g.name });
  for (const [id, e] of Object.entries(plan.talk.edits)) out.push({ where: `an edited answer (${id})`, text: `${e.q ?? ""} ${e.a ?? ""}` });
  for (const list of Object.values(plan.talk.custom)) for (const x of list) out.push({ where: "one of your own questions", text: `${x.q} ${x.a}` });
  return out;
}

const SECURITY_RE = /\((?:NYSE|NASDAQ|AMEX):\s*[A-Z.]+\)|\$[A-Z]{2,5}\b|\b(?:[Bb]uy|[Ss]ell|[Ss]hort|[Pp]urchase)\s+(?:shares of\s+)?[A-Z]{2,5}\b/;

export function preflight(plan: WealthPlan, anonymous = false): PreflightItem[] {
  const out: PreflightItem[] = [];
  const add = (id: string, ok: boolean, text: string, fix?: string) => out.push({ id, level: ok ? "pass" : "warn", text, ...(ok ? {} : { fix }) });
  const outline = deckOutline({ plan, tools: {}, anonymous });
  const disc = outline.find((o) => o.id === "disclosures");
  add("disclosures", !!disc?.included, "The disclosures slide is in the deck.", "Turn the Assumptions and disclosures slide back on in What goes in the deck.");
  const rp = roleProblem(plan.deck.role);
  add("role", !rp, "The title slide describes the presenter as a student.", rp ?? "");
  add("presenter", !!plan.deck.presenter.trim(), "The presenter's name is filled in, so the disclosures say who is presenting.", "Type your name in Presented by.");
  const promises = scanForPromises(freeText(plan));
  add("promises", promises.length === 0, "No promises or guarantees in the text you wrote.", promises.map((p) => `"${p.phrase}" in ${p.where}`).join("; ") + ". Reword it as an assumption or an illustration.");
  const securities = freeText(plan).filter((f) => SECURITY_RE.test(f.text));
  add("securities", securities.length === 0, "No specific securities are named as something to buy or sell.", `A specific security looks to be named in ${securities.map((s) => s.where).join("; ")}. Describe the kind of investment instead, or label it clearly as an illustration, not a recommendation.`);
  if (plan.portfolio.started && Math.abs(weightTotal(plan.portfolio) - 100) < 0.5) add("cma", !!plan.portfolio.source.trim() && !!plan.portfolio.asOf, "The capital market assumptions have a source and a date.", "Record the source and date in the Portfolio step, Assumptions tab.");
  if (marketFilled(plan.market)) {
    add("marketsource", !!plan.market.source.trim() || plan.market.indicators.filter((i) => i.value.trim()).every((i) => i.source.trim()), "The market snapshot names its sources.", "Add where the market view and each indicator come from.");
    add("marketdate", !!plan.market.asOf, "The market snapshot has an as-of date.", "Add the date the view was written.");
  }
  add("meeting", !!plan.deck.meetingDate, "The meeting date is set, so every exhibit shows an as-of date.", "Set the meeting date in the Presentation step.");
  const p = checklistProgress(plan.compliance);
  add("checklist", p.done === p.total, `Your own checklist is complete (${p.done} of ${p.total}).`, `${p.total - p.done} item${p.total - p.done === 1 ? "" : "s"} on your checklist are not confirmed yet (Follow-up step, Compliance tab).`);
  if (!anonymous && !plan.compliance.done.consent) add("consent", false, "", "Confirm the client agreed to share their information (checklist item).");
  return out;
}
