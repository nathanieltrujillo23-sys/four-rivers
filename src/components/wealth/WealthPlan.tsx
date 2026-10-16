import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { FocusStep } from "./FocusStep";
import { ModuleExecution } from "./PlanExecution";
import { ModuleBasics, ModuleGoals, ModuleMission, ModuleReflection, ModuleSwot } from "./PlanModules";
import { PresentationStep } from "./PresentationStep";
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

const STEPS = [
  { id: 1, short: "Client" },
  { id: 2, short: "Goals" },
  { id: 3, short: "SWOT" },
  { id: 4, short: "Strategy" },
  { id: 5, short: "Mission" },
  { id: 6, short: "Focus areas" },
  { id: 7, short: "Model" },
  { id: 8, short: "Presentation" },
] as const;
const LAST = 8;

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
  const [active, setActive] = useState<number>(1);
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
  const complete: Record<number, boolean> = {
    1: !!(c.name && c.age && c.occupation),
    2: plan.goals.length > 0,
    3: SWOT_KEYS.every((k) => plan.swot[k].length > 0),
    4: plan.swot.S.length > 0 && (plan.swot.O.length > 0 || plan.swot.T.length > 0),
    5: !!missionText,
    6: plan.focus.length >= 2,
    7: plan.roadmap.length > 0 && num(plan.model.initial) + num(plan.model.monthly) > 0,
    8: false,
  };
  const doneCount = Object.values(complete).filter(Boolean).length;
  const empty = isPlanEmpty(plan);

  return (
    <div className="flex flex-col gap-6">
      <div ref={top} className="scroll-mt-24" />
      <div className="flex flex-col gap-3 print:hidden">
        <nav aria-label="Plan steps" className="flex gap-1 overflow-x-auto pb-1">
          {STEPS.map((step) => {
            const on = active === step.id;
            const last = step.id === LAST;
            return (
              <button
                key={step.id}
                type="button"
                aria-current={on ? "step" : undefined}
                onClick={() => setActive(step.id)}
                className={`flex min-w-[112px] flex-1 items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                  on ? "border-water-deep bg-water-deep text-white" : "border-line bg-surface text-ink hover:bg-parchment-deep"
                }`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-[family-name:var(--font-ui)] text-xs font-semibold ${
                    complete[step.id] ? "bg-river-1 text-white" : on ? "bg-black/20 text-white" : last ? "bg-gold/30 text-ink" : "bg-parchment-deep text-ink-soft"
                  }`}
                >
                  {complete[step.id] ? "✓" : step.id}
                </span>
                <span className="font-[family-name:var(--font-ui)] text-[13px] font-medium">{step.short}</span>
              </button>
            );
          })}
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          <p>
            <span className="tabular-nums">{doneCount} of 7</span> steps complete
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {empty && (
              <Button
                variant="ghost"
                onClick={() => {
                  set(samplePlan());
                  setActive(1);
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
                      setActive(1);
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
        {active === 1 && <ModuleBasics plan={plan} set={set} />}
        {active === 2 && <ModuleGoals plan={plan} set={set} />}
        {active === 3 && <ModuleSwot plan={plan} set={set} />}
        {active === 4 && <ModuleReflection plan={plan} set={set} insights={insights} />}
        {active === 5 && <ModuleMission plan={plan} set={set} missionText={missionText} />}
        {active === 6 && <FocusStep plan={plan} set={set} tools={tools} onToolState={onToolState} />}
        {active === 7 && <ModuleExecution plan={plan} set={set} sim={sim} target={target} tab={tab} setTab={setTab} />}
        {active === LAST && (
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
        <Button variant="secondary" onClick={() => setActive((a) => Math.max(1, a - 1))} disabled={active === 1}>
          Previous
        </Button>
        {active < LAST ? <Button onClick={() => setActive((a) => a + 1)}>Next: {STEPS[active].short}</Button> : <span />}
      </div>
    </div>
  );
}
