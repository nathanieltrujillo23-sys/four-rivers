/** Saved versions of a client's plan, and a plain-words list of what changed between two of them. */
import { assessRisk } from "./wealthRisk";
import { fmtK, fmtPct, fmtUsd, normalizePlan, num, planFacts, snapshotMetrics, type WealthPlan } from "./wealthMath";
import { portfolioStats, weightTotal } from "./wealthPortfolio";

export interface PlanVersion {
  id: string;
  label: string;
  createdAt: string;
  plan: unknown;
  tools: Record<string, unknown>;
}

/** The numbers worth comparing between two meetings. */
export function planDigest(raw: unknown) {
  const plan: WealthPlan = normalizePlan(raw);
  const f = planFacts(plan);
  const m = snapshotMetrics(plan);
  const risk = assessRisk(plan, f.target);
  const pf = plan.portfolio.started && Math.abs(weightTotal(plan.portfolio) - 100) < 0.5 ? portfolioStats(plan.portfolio) : null;
  return {
    plan,
    goals: Object.fromEntries(plan.goals.map((g) => [g.id, { name: g.name, amount: num(g.amount), horizon: num(g.horizon), current: num(g.current) }])),
    monthly: num(plan.model.monthly),
    initial: num(plan.model.initial),
    ret: num(plan.model.ret),
    vol: num(plan.model.vol),
    years: num(plan.model.years),
    median: f.sim.final.p50,
    prob: f.sim.prob,
    netWorth: m.hasAny ? m.netWorth : null,
    risk: risk.inUse ?? plan.client.risk,
    equity: pf ? Math.round(pf.equity) : null,
    scenarios: plan.scenarios.list.length,
    roadmapDone: plan.roadmap.filter((r) => r.status === "Completed").length,
    roadmapTotal: plan.roadmap.length,
    toolsFilled: 0,
  };
}

/** What changed from an earlier version to a later one, as short sentences. Empty when nothing worth reporting changed. */
export function diffPlans(before: unknown, after: unknown, toolsBefore: Record<string, unknown> = {}, toolsAfter: Record<string, unknown> = {}): string[] {
  const a = planDigest(before);
  const b = planDigest(after);
  const out: string[] = [];
  const change = (label: string, x: string, y: string) => x !== y && out.push(`${label}: ${x} to ${y}`);
  for (const id of Object.keys(b.goals)) {
    const g = b.goals[id];
    const old = a.goals[id];
    if (!old) out.push(`Goal added: ${g.name} (${fmtUsd(g.amount)} in ${g.horizon} years)`);
    else {
      if (old.amount !== g.amount) out.push(`Goal "${g.name}" target: ${fmtUsd(old.amount)} to ${fmtUsd(g.amount)}`);
      if (old.horizon !== g.horizon) out.push(`Goal "${g.name}" horizon: ${old.horizon} to ${g.horizon} years`);
      if (old.current !== g.current) out.push(`Goal "${g.name}" saved so far: ${fmtUsd(old.current)} to ${fmtUsd(g.current)}`);
    }
  }
  for (const id of Object.keys(a.goals)) if (!b.goals[id]) out.push(`Goal removed: ${a.goals[id].name}`);
  change("Monthly saving", fmtUsd(a.monthly), fmtUsd(b.monthly));
  change("Starting balance", fmtUsd(a.initial), fmtUsd(b.initial));
  change("Expected return", `${a.ret}%`, `${b.ret}%`);
  change("Volatility", `${a.vol}%`, `${b.vol}%`);
  change("Years", String(a.years), String(b.years));
  change("Risk profile", a.risk, b.risk);
  if (a.equity !== b.equity && (a.equity !== null || b.equity !== null)) change("Stock share of the portfolio", a.equity == null ? "none" : `${a.equity}%`, b.equity == null ? "none" : `${b.equity}%`);
  if (a.netWorth !== b.netWorth && b.netWorth !== null) change("Net worth", a.netWorth == null ? "not entered" : fmtUsd(a.netWorth), fmtUsd(b.netWorth));
  if (Math.round(a.median / 1000) !== Math.round(b.median / 1000)) change("Median outcome", fmtK(a.median), fmtK(b.median));
  if (a.prob !== null && b.prob !== null && Math.abs(a.prob - b.prob) >= 0.005) change("Chance of the goal", fmtPct(a.prob), fmtPct(b.prob));
  if (a.scenarios !== b.scenarios) change("Scenarios saved", String(a.scenarios), String(b.scenarios));
  if (a.roadmapDone !== b.roadmapDone) change("Roadmap milestones completed", `${a.roadmapDone} of ${a.roadmapTotal}`, `${b.roadmapDone} of ${b.roadmapTotal}`);
  const ta = Object.keys(toolsBefore).length;
  const tb = Object.keys(toolsAfter).length;
  if (ta !== tb) change("Toolkit tools filled in", String(ta), String(tb));
  if (a.plan.client.name !== b.plan.client.name) change("Client name", a.plan.client.name || "blank", b.plan.client.name || "blank");
  return out;
}
