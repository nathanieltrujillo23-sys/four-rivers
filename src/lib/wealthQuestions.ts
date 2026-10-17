/**
 * Anticipated client questions for each part of the deck, with answers worked out from the plan's own numbers, so the presenter
 * can rehearse the pushback before the meeting. The questions appear in the speaker notes of the slide they belong to. A
 * presenter can edit any answer, hide a question, or add their own. Answers are written as an educational discussion: they
 * explain, they do not tell a client what to buy, and they point to licensed professionals for advice.
 */
import { assessRisk } from "./wealthRisk";
import { capitalGains, givingOptions, insuranceNeeds, rothConversion } from "./wealthPlanning";
import { portfolioStats, stressTests, weightTotal } from "./wealthPortfolio";
import { fmtK, fmtPct, fmtUsd, num, planFacts, snapshotMetrics, snapshotNumbers, type WealthPlan } from "./wealthMath";

export interface QA {
  id: string;
  q: string;
  a: string;
}
/** The presenter's changes: hidden questions, edited wording, and questions they added. */
export interface TalkData {
  hidden: string[];
  edits: Record<string, { q?: string; a?: string }>;
  custom: Record<string, QA[]>;
}
export const emptyTalk = (): TalkData => ({ hidden: [], edits: {}, custom: {} });

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export function normalizeTalk(raw: unknown): TalkData {
  if (!isObj(raw)) return emptyTalk();
  const edits: TalkData["edits"] = {};
  if (isObj(raw.edits)) for (const [k, v] of Object.entries(raw.edits)) if (isObj(v)) edits[k] = { ...(typeof v.q === "string" ? { q: v.q } : {}), ...(typeof v.a === "string" ? { a: v.a } : {}) };
  const custom: TalkData["custom"] = {};
  if (isObj(raw.custom))
    for (const [k, v] of Object.entries(raw.custom))
      if (Array.isArray(v)) custom[k] = v.filter(isObj).slice(0, 6).map((x, i) => ({ id: typeof x.id === "string" ? x.id : `c${i}`, q: typeof x.q === "string" ? x.q : "", a: typeof x.a === "string" ? x.a : "" }));
  return { hidden: Array.isArray(raw.hidden) ? raw.hidden.filter((x): x is string => typeof x === "string") : [], edits, custom };
}

/** The deck parts that have anticipated questions, with their names. */
export const QUESTION_SECTIONS: [string, string][] = [
  ["summary", "Executive summary"],
  ["recommendation", "Key takeaways and options"],
  ["snapshot", "Balance sheet"],
  ["goalstatus", "Goal funding status"],
  ["risk", "Risk profile"],
  ["ips", "Investment policy statement"],
  ["allocation", "Asset allocation"],
  ["stress", "Stress tests"],
  ["fees", "Fees and rebalancing"],
  ["model", "Projection and assumptions"],
  ["cases", "Base, upside and downside"],
  ["sensitivity", "What moves the outcome"],
  ["retirement", "Retirement income"],
  ["insurance", "Insurance needs"],
  ["roth", "Roth conversion"],
  ["location", "Asset location"],
  ["gains", "Capital gains"],
  ["giving", "Charitable giving"],
];

const NOT_ADVICE = "I am a student presenting an educational exercise, so I cannot tell you what to do. Confirm anything you act on with a licensed professional.";

/** The standard questions for one part of the deck, answered from the plan. */
export function standardQuestions(plan: WealthPlan, id: string): QA[] {
  const mk = (n: number, q: string, a: string): QA => ({ id: `${id}:${n}`, q, a });
  switch (id) {
    case "summary":
    case "recommendation":
      return [
        mk(1, "Is this financial advice?", `No. ${NOT_ADVICE} What I can do is show how the numbers work and the options people usually weigh.`),
        mk(2, "Which one should I do first?", "That is your decision. A useful way to choose is to start with the option that costs you the least effort and has the biggest effect on the numbers on the slides that follow. Which feels most doable this month?"),
      ];
    case "snapshot": {
      const m = snapshotMetrics(plan);
      return [
        mk(1, "Is my debt too high?", m.debtShare == null ? "I need your income and debt payments to say. A common guideline is debt payments under about 36% of take-home pay, and lower is more comfortable." : `Your debt payments are ${fmtPct(m.debtShare)} of take-home pay. A common guideline is under about 36%, and lower is more comfortable; the interest rate on each balance matters as much as the amount.`),
        mk(2, "How much cash should I keep?", m.emergencyMonths == null ? "A common guideline is three to six months of needs, more if income is irregular." : `You hold about ${(Math.round(m.emergencyMonths * 10) / 10).toString()} months of needs in cash. A common guideline is three to six months, more if income is irregular.`),
      ];
    }
    case "goalstatus": {
      const f = planFacts(plan);
      return [
        mk(1, "Are these goals realistic?", `${fmtUsd(f.saved)} of ${fmtUsd(f.total)} is funded today. Funding every goal in a straight line would take about ${fmtUsd(f.monthlyNeed)} a month; the slide shows which goals are on track and which would need more saving, more time or a smaller target.`),
        mk(2, "Which goal comes first?", "The buckets are a starting point: essential goals first, then important, then aspirational. You can reorder them; the model will show what that changes."),
      ];
    }
    case "risk": {
      const a = assessRisk(plan, planFacts(plan).target);
      return [
        mk(1, "Why this risk profile?", `The model uses the more cautious of how you feel about swings and how much loss you could absorb${a.inUse ? ` (${a.inUse} here)` : ""}. It is a conversation starter from a short questionnaire, not a suitability determination.`),
        mk(2, "What if I want to take more risk?", "More risk means a wider range of outcomes in both directions, not a higher guaranteed return. If the goals need more than your comfortable profile can give, the options to discuss are saving more, allowing more time, or lowering the target."),
      ];
    }
    case "ips":
      return [mk(1, "Do I have to follow this policy?", "No. It is an illustration of how a professional writes down an approach so decisions stay consistent when markets are noisy. A real policy would be written and agreed with a registered adviser.")];
    case "allocation": {
      const st = plan.portfolio.started && Math.abs(weightTotal(plan.portfolio) - 100) < 0.5 ? portfolioStats(plan.portfolio) : null;
      return [
        mk(1, "Why not put everything in stocks?", st ? `Stocks have higher expected returns but larger swings. This mix has about ${Math.round(st.equity)}% in equities and swings of about ${st.vol.toFixed(1)}% a year; bonds and cash cushion the falls. The mix is an illustration, not a recommendation of any fund.` : "Stocks have higher expected returns but larger swings; bonds and cash cushion the falls. The mix shown is an illustration, not a recommendation of any fund."),
        mk(2, "Where do these return numbers come from?", plan.portfolio.source ? `They come from ${plan.portfolio.source}${plan.portfolio.asOf ? `, as of ${plan.portfolio.asOf}` : ""}. They are assumptions, not forecasts, and published sets differ from one another.` : "They are assumptions I entered and cited, not forecasts, and published sets differ from one another."),
      ];
    }
    case "stress": {
      if (!(plan.portfolio.started && Math.abs(weightTotal(plan.portfolio) - 100) < 0.5)) return [];
      const m = snapshotMetrics(plan);
      const value = m.investable > 0 ? m.investable : num(plan.model.initial) > 0 ? num(plan.model.initial) : 10000;
      const worst = stressTests(plan.portfolio, value).reduce((a, b) => (b.loss < a.loss ? b : a));
      return [mk(1, "Could I really lose that much?", `In a repeat of ${worst.scenario.name.toLowerCase()} this mix would have fallen about ${Math.abs(Math.round(worst.loss))}%. Past events do not predict the future, and a worse one is possible. The useful question is whether you would stay invested through a fall like that.`)];
    }
    case "fees":
      return [mk(1, "Is paying for advice worth it?", "That depends on what you get for it. The slide shows what a fee costs over time on the same plan so you can compare. Ask any professional what the fee covers and whether they act as a fiduciary.")];
    case "model": {
      const f = planFacts(plan);
      return [
        mk(1, "What if the market falls right at the start?", `The model includes that: in the worst tenth of simulated paths the balance ends near ${fmtK(f.sim.final.p10)}, against a median of ${fmtK(f.sim.final.p50)}. Early losses hurt more when you are still adding money slowly, and recover more slowly.`),
        mk(2, "How likely is it that I reach the goal?", f.target > 0 && f.sim.prob != null ? `In ${fmtPct(f.sim.prob)} of 2,000 simulated markets the balance reached ${fmtK(f.target)}. It is a modeled probability, not a promise.` : "Choose a goal in the model and it will show the share of simulated markets that reach it. It is a modeled probability, not a promise."),
        mk(3, "Why should I trust a simulation?", "Treat it as a way to see a range, not a forecast. The results depend on the return and swings assumed, which nobody knows in advance; the sensitivity slide shows how much each assumption matters."),
      ];
    }
    case "cases":
      return [mk(1, "Which case should I plan around?", "Many people plan around the base case and check that they could live with the downside. Which of the three would be hardest to live through?")];
    case "sensitivity":
      return [mk(1, "What can I actually control?", "Mostly how much you save, how long you stay invested, and what you pay in costs. Those usually move the outcome more than guessing the market, which nobody controls.")];
    case "retirement": {
      return [mk(1, "Will I run out of money?", "The slide shows the share of simulated markets in which the money lasted. It does not include health-care shocks, long-term care, or the tax on withdrawals, and spending usually changes over time. Treat a low number as a reason to talk about saving more, retiring later or spending less.")];
    }
    case "insurance": {
      const r = insuranceNeeds(plan.planning.insurance, snapshotNumbers(plan));
      return [
        mk(1, "Do I need life insurance?", r.life.gap > 0 ? `By the rule of thumb used here, coverage falls about ${fmtUsd(r.life.gap)} short of the need. It matters most when someone depends on your income or shares your debts. A licensed insurance agent can price actual policies.` : "By the rule of thumb used here, the need is covered. It matters most when someone depends on your income or shares your debts."),
        mk(2, "What about disability insurance?", `For people who work, an illness or injury is a bigger risk than death during the working years. The target here is ${fmtUsd(r.disability.target)} a month, against ${fmtUsd(r.disability.existing)} in force. Employer plans often cap the benefit and may tax it.`),
      ];
    }
    case "roth": {
      const r = rothConversion(plan.planning.roth);
      return [mk(1, "Should I convert to a Roth?", `${r.verdict} Whether it fits you also depends on things this estimate leaves out, so please check with a CPA or tax professional before converting; a conversion cannot be undone.`)];
    }
    case "location":
      return [mk(1, "Does this change what I own?", "No. The overall mix stays the same; only the account that holds each piece changes, which can lower the yearly tax on income. Limits on contributions and the cost of selling matter, so a tax professional should confirm.")];
    case "gains": {
      const r = capitalGains(plan.planning.gains);
      return [mk(1, "When should I sell?", `Tax is only one input. The slide shows ${r.net >= 0 ? `about ${fmtUsd(r.total)} of tax on a ${fmtUsd(r.net)} gain` : `a loss of ${fmtUsd(-r.net)} that could offset other gains`}, and ${fmtUsd(r.zeroRoom)} of room at the 0% rate. Whether to sell depends on your goals and risk, which is a conversation for a licensed professional.`)];
    }
    case "giving": {
      const r = givingOptions(plan.planning.giving);
      return [mk(1, "Is giving stock better than giving cash?", r.best ? `For this income and gift, ${r.best.short.toLowerCase()} costs least after tax, about ${fmtUsd(r.best.netCost)}. The tax saving is a side effect; the gift is the reason. A tax professional should confirm the details, and the charity must accept the gift.` : "Giving stock you have held more than a year can avoid the tax on its gain, and can be deducted at full value if you itemize. Enter a gift to see the numbers.")];
    }
    default:
      return [];
  }
}

/** The questions for a part of the deck after the presenter's edits: standard ones (unless hidden), then their own. */
export function resolvedQuestions(plan: WealthPlan, id: string): QA[] {
  const t = plan.talk;
  const std = standardQuestions(plan, id)
    .filter((x) => !t.hidden.includes(x.id))
    .map((x) => ({ ...x, ...(t.edits[x.id]?.q !== undefined ? { q: t.edits[x.id].q! } : {}), ...(t.edits[x.id]?.a !== undefined ? { a: t.edits[x.id].a! } : {}) }));
  return [...std, ...(t.custom[id] ?? []).filter((x) => x.q.trim())];
}

/** The text added to a slide's speaker notes, or "" when there are no questions. */
export function questionNotes(plan: WealthPlan, id: string): string {
  const qs = resolvedQuestions(plan, id);
  if (!qs.length) return "";
  return `ANTICIPATED QUESTIONS\n${qs.map((x) => `Q: ${x.q}\nA: ${x.a}`).join("\n\n")}`;
}
