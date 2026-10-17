/**
 * The follow-up email after a meeting, drafted from the plan: thanks, what was covered, what each side agreed to do, the next
 * meeting, and the reminder that this is an educational exercise by a student. It is a draft for the presenter to edit and send
 * themselves; nothing is ever sent from here.
 */
import { deckOutline } from "./wealthDeck";
import { fmtDate, type WealthPlan } from "./wealthMath";

export interface FollowUp {
  subject: string;
  body: string;
  /** An email address found in the client's contact line, or "". */
  to: string;
}

const EMAIL = /[^\s<>(),;:]+@[^\s<>(),;:]+\.[A-Za-z]{2,}/;

export function followUpEmail(plan: WealthPlan, o: { anonymous?: boolean } = {}): FollowUp {
  const c = plan.client;
  const t = plan.track;
  const formal = t.emailTone === "formal";
  const first = c.name.trim().split(/\s+/)[0] || "there";
  const when = plan.deck.meetingDate ? fmtDate(plan.deck.meetingDate) : "";
  const covered = deckOutline({ plan, tools: {}, anonymous: o.anonymous }).filter((x) => x.kind === "section" && x.included && !["disclosures", "methodology", "next"].includes(x.id)).map((x) => x.title.toLowerCase());
  const mine = t.actions.filter((a) => a.owner === "me" && a.text.trim() && !a.done);
  const theirs = t.actions.filter((a) => a.owner === "client" && a.text.trim() && !a.done);
  const line = (a: (typeof t.actions)[number]) => `  - ${a.text.trim()}${a.due ? ` (by ${fmtDate(a.due)})` : ""}`;
  const name = plan.deck.presenter.trim() || "Your name";
  const role = plan.deck.role.trim();

  const parts: string[] = [];
  parts.push(formal ? `Dear ${c.name.trim() || "client"},` : `Hi ${first},`);
  parts.push(
    formal
      ? `Thank you for taking the time to meet${when ? ` on ${when}` : ""}. I appreciated the chance to learn about your goals and what matters to you.`
      : `Thanks for meeting${when ? ` on ${when}` : ""}! I enjoyed hearing about your goals and what matters to you.`,
  );
  if (covered.length) parts.push(`We talked through ${covered.slice(0, 7).join(", ")}${covered.length > 7 ? ", and more" : ""}. The presentation and a one-page handout are attached so you can look at the numbers again.`);
  if (theirs.length) parts.push(`Things you said you would look at:\n${theirs.map(line).join("\n")}`);
  if (mine.length) parts.push(`Things I will do:\n${mine.map(line).join("\n")}`);
  if (t.nextMeeting) parts.push(`Our next meeting is ${fmtDate(t.nextMeeting)}${c.cadence ? `, as part of our ${c.cadence.toLowerCase()} check-ins` : ""}. Tell me if that time stops working.`);
  if (t.emailNote.trim()) parts.push(t.emailNote.trim());
  parts.push(
    "A reminder: this is an educational exercise. I am a student, not a licensed adviser, and nothing here is investment, tax, legal or insurance advice or a recommendation to buy or sell anything. The projections are hypothetical. Please check anything you plan to act on with a licensed professional.",
  );
  parts.push(`${formal ? "Sincerely" : "Thanks again"},\n${name}${role ? `\n${role}` : ""}`);
  return { subject: `${formal ? "Follow-up to our meeting" : "Following up on our meeting"}${when ? `, ${when}` : ""}`, body: parts.join("\n\n"), to: c.contact.match(EMAIL)?.[0] ?? "" };
}
