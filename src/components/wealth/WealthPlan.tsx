import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { FocusStep } from "./FocusStep";
import { RiskStep } from "./RiskStep";
import { SnapshotStep } from "./SnapshotStep";
import { STEPS, type StepKey } from "./steps";
import { ModuleExecution } from "./PlanExecution";
import { ModuleBasics, ModuleGoals, ModuleMission, ModuleReflection, ModuleSwot } from "./PlanModules";
import { PresentationStep } from "./PresentationStep";
import { assessRisk } from "../../lib/wealthRisk";
import {
  SWOT_KEYS,
  buildMission,
  emptyPlan,
  isPlanEmpty,
  normalizePlan,
  num,
  samplePlan,
  simulatePlan,
  synthesize,
  type WealthPlan,
} from "../../lib/wealthMath";


/**
 * One client's plan, from the discovery meeting to the presentation: the client, goals, SWOT, strategy, mission, the 2 or 3
 * focus areas with their tools, the financial model, and the PowerPoint. The plan lives here and is reported up on every
 * change; saving it is the page's job.
 */
export function WealthPlanner({
  saved,
  tools,
  analystName,
  onChange,
  onToolState,
}: {
  saved: unknown;
  tools: Record<string, unknown>;
  /** The signed-in person (the presenter), filled in as the default presenter. */
  analystName: string;
  onChange: (plan: WealthPlan) => void;
  onToolState: (id: string, state: unknown) => void;
}) {
  const [plan, setPlan] = useState<WealthPlan>(() => normalizePlan(saved));
  const [active, setActive] = useState<StepKey>("client");
  const [tab, setTab] = useState<"model" | "edu" | "sched" | "road">("model");
  const [confirmReset, setConfirmReset] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  const set = (next: WealthPlan) => {
    setPlan(next);
    onChange(next);
  };

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [active]);

  const { sim, target } = useMemo(() => simulatePlan(plan), [plan]);
  const insights = useMemo(() => synthesize(plan.swot), [plan.swot]);
  const missionText = useMemo(() => buildMission(plan.mission, plan.client), [plan.mission, plan.client]);

  const c = plan.client;
  const risk = assessRisk(plan, target);
  const complete: Record<StepKey, boolean> = {
    client: !!(c.name && c.age && c.occupation),
    snapshot: plan.snapshot.assets.length > 0 && plan.snapshot.expenses.length > 0,
    goals: plan.goals.length > 0,
    swot: SWOT_KEYS.every((k) => plan.swot[k].length > 0),
    strategy: plan.swot.S.length > 0 && (plan.swot.O.length > 0 || plan.swot.T.length > 0),
    mission: !!missionText,
    risk: risk.recommended !== null,
    focus: plan.focus.length >= 2,
    model: plan.roadmap.length > 0 && num(plan.model.initial) + num(plan.model.monthly) > 0,
    presentation: false,
  };
  const doneCount = Object.values(complete).filter(Boolean).length;
  const at = STEPS.findIndex((x) => x.key === active);
  const empty = isPlanEmpty(plan);

  return (
    <div className="flex flex-col gap-6">
      <div ref={top} className="scroll-mt-24" />
      <div className="flex flex-col gap-3 print:hidden">
        <nav aria-label="Plan steps" className="flex gap-1 overflow-x-auto pb-1">
          {STEPS.map((step, idx) => {
            const on = active === step.key;
            const last = step.key === "presentation";
            return (
              <button
                key={step.key}
                type="button"
                aria-current={on ? "step" : undefined}
                onClick={() => setActive(step.key)}
                className={`flex min-w-[112px] flex-1 items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                  on ? "border-water-deep bg-water-deep text-white" : "border-line bg-surface text-ink hover:bg-parchment-deep"
                }`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-[family-name:var(--font-ui)] text-xs font-semibold ${
                    complete[step.key] ? "bg-river-1 text-white" : on ? "bg-black/20 text-white" : last ? "bg-gold/30 text-ink" : "bg-parchment-deep text-ink-soft"
                  }`}
                >
                  {complete[step.key] ? "✓" : idx + 1}
                </span>
                <span className="font-[family-name:var(--font-ui)] text-[13px] font-medium">{step.short}</span>
              </button>
            );
          })}
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          <p>
            <span className="tabular-nums">{doneCount} of {STEPS.length - 1}</span> steps complete
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {empty && (
              <Button
                variant="ghost"
                onClick={() => {
                  set(samplePlan());
                  setActive("client");
                }}
              >
                See an example client
              </Button>
            )}
            {!empty &&
              (confirmReset ? (
                <span className="inline-flex items-center gap-1">
                  Clear this whole plan?
                  <Button
                    variant="danger"
                    onClick={() => {
                      set(emptyPlan());
                      setActive("client");
                      setConfirmReset(false);
                    }}
                  >
                    Yes, start over
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                    Cancel
                  </Button>
                </span>
              ) : (
                <Button variant="ghost" onClick={() => setConfirmReset(true)}>
                  Start over
                </Button>
              ))}
          </div>
        </div>
      </div>

      <div>
        {active === "client" && <ModuleBasics plan={plan} set={set} />}
        {active === "snapshot" && <SnapshotStep plan={plan} set={set} />}
        {active === "goals" && <ModuleGoals plan={plan} set={set} />}
        {active === "swot" && <ModuleSwot plan={plan} set={set} />}
        {active === "strategy" && <ModuleReflection plan={plan} set={set} insights={insights} />}
        {active === "mission" && <ModuleMission plan={plan} set={set} missionText={missionText} />}
        {active === "risk" && <RiskStep plan={plan} set={set} />}
        {active === "focus" && <FocusStep plan={plan} set={set} tools={tools} onToolState={onToolState} />}
        {active === "model" && <ModuleExecution plan={plan} set={set} sim={sim} target={target} tab={tab} setTab={setTab} />}
        {active === "presentation" && (
          <PresentationStep
            plan={plan}
            set={set}
            tools={tools}
            sim={sim}
            target={target}
            insights={insights}
            missionText={missionText}
            presenterName={analystName}
          />
        )}
      </div>

      <div className="flex items-center justify-between border-t border-line pt-5 print:hidden">
        <Button variant="secondary" onClick={() => setActive(STEPS[Math.max(0, at - 1)].key)} disabled={at === 0}>
          Previous
        </Button>
        {at < STEPS.length - 1 ? <Button onClick={() => setActive(STEPS[at + 1].key)}>Next: {STEPS[at + 1].short}</Button> : <span />}
      </div>
    </div>
  );
}
