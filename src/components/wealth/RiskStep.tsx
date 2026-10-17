import { useState } from "react";
import { Button } from "../ui/Button";
import { Select, TextArea } from "../ui/Field";
import { ModuleHead, Panel } from "./parts";
import type { ModuleProps } from "./PlanModules";
import { stepNo } from "./steps";
import { buildIps } from "../../lib/wealthIps";
import { RISK_QUESTIONS, answerFor, assessRisk, type RiskQuestion } from "../../lib/wealthRisk";
import { RISK_PROFILES, num, simulatePlan } from "../../lib/wealthMath";

function Question({ q, plan, set }: { q: RiskQuestion } & ModuleProps) {
  const { value, auto } = answerFor(plan, q);
  const name = `risk-${q.id}`;
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="font-[family-name:var(--font-ui)] text-sm font-medium text-ink">{q.text}</legend>
      {auto ? (
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          {value == null ? (
            <>Not enough in the plan yet to answer this. Fill in the earlier steps.</>
          ) : (
            <>
              Worked out from the plan: <b className="text-ink">{q.options[value]}</b>
            </>
          )}
        </p>
      ) : (
        <div className="flex flex-col gap-1 sm:grid sm:grid-cols-1">
          {q.options.map((opt, i) => (
            <label key={opt} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-1.5 font-[family-name:var(--font-ui)] text-sm ${value === i ? "border-water-deep bg-parchment-deep text-ink" : "border-line text-ink-soft hover:bg-parchment-deep/60"}`}>
              <input
                type="radio"
                name={name}
                checked={value === i}
                onChange={() => set({ ...plan, risk: { ...plan.risk, answers: { ...plan.risk.answers, [q.id]: i } } })}
                className="mt-0.5 h-4 w-4 accent-[var(--color-water-deep)]"
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

/** A five-step scale with the profile this part points to marked on it. */
function Scale({ label, index, detail }: { label: string; index: number | null; detail: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 font-[family-name:var(--font-ui)] text-sm">
        <span className="font-semibold text-ink">{label}</span>
        <span className="text-ink-soft">{detail}</span>
      </div>
      <ol className="grid grid-cols-5 gap-1" aria-label={`${label} on the five risk profiles`}>
        {RISK_PROFILES.map((p, i) => {
          const on = index === i;
          return (
            <li
              key={p.name}
              aria-current={on ? "true" : undefined}
              className={`rounded px-1 py-1.5 text-center font-[family-name:var(--font-ui)] text-[11px] leading-tight ${on ? "bg-water-deep font-semibold text-white" : "bg-parchment-deep text-ink-soft"}`}
            >
              {p.name}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Step 7: the three-part risk profile, and the investment policy statement built from the plan. */
export function RiskStep({ plan, set }: ModuleProps) {
  const { target } = simulatePlan(plan);
  const a = assessRisk(plan, target);
  const ips = buildIps(plan, target);
  const [copied, setCopied] = useState(false);
  const inUse = a.inUse ?? plan.client.risk;
  const profile = RISK_PROFILES.find((p) => p.name === inUse) ?? RISK_PROFILES[2];
  const applied = plan.client.risk === profile.name && num(plan.model.ret) === profile.ret && num(plan.model.vol) === profile.vol;
  const tolQs = RISK_QUESTIONS.filter((q) => q.group === "tolerance");
  const capQs = RISK_QUESTIONS.filter((q) => q.group === "capacity");

  const apply = () => set({ ...plan, client: { ...plan.client, risk: profile.name }, model: { ...plan.model, ret: profile.ret, vol: profile.vol } });
  const setOverride = (id: string, text: string) => set({ ...plan, ips: { overrides: { ...plan.ips.overrides, [id]: text } } });

  return (
    <div className="flex flex-col gap-6">
      <ModuleHead
        step={stepNo("risk")}
        title="Risk profile and policy statement"
        desc="Advisors separate how much risk a client is willing to take, how much they can afford, and how much their goals require. The plan is built on the lowest of the first two."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Risk tolerance" subtitle="Their attitude: how they feel and behave when markets fall. Ask these out loud.">
          <div className="flex flex-col gap-5">
            {tolQs.map((q) => (
              <Question key={q.id} q={q} plan={plan} set={set} />
            ))}
          </div>
        </Panel>
        <Panel title="Risk capacity" subtitle="Their situation: how much loss they could absorb without derailing their life. Some answers come from the plan.">
          <div className="flex flex-col gap-5">
            {capQs.map((q) => (
              <Question key={q.id} q={q} plan={plan} set={set} />
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="What it adds up to" subtitle="Tolerance and capacity are scored from the answers above; the required return comes from the goals and the model.">
        <div className="flex flex-col gap-5">
          <Scale label="Tolerance" index={a.toleranceIndex} detail={a.tolerance == null ? `Answer ${3 - a.answered.tolerance > 0 ? 3 - a.answered.tolerance : 0} more` : `${Math.round(a.tolerance)} of 100`} />
          <Scale label="Capacity" index={a.capacityIndex} detail={a.capacity == null ? "Answer more, or fill in the earlier steps" : `${Math.round(a.capacity)} of 100`} />
          <Scale
            label="Required return"
            index={a.requiredIndex == null ? null : Math.min(a.requiredIndex, RISK_PROFILES.length - 1)}
            detail={a.required == null ? "Pick a target goal in the model" : a.requiredIndex === RISK_PROFILES.length ? `${a.required}% a year, beyond every profile` : `${a.required}% a year`}
          />
        </div>
        <div className="grid gap-4 rounded-xl bg-parchment-deep p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="font-[family-name:var(--font-ui)] text-sm text-ink">
            <p>
              <b>Recommended profile: {a.recommended ?? "not enough answers yet"}.</b> {a.recommended ? "The more cautious of tolerance and capacity." : ""}
            </p>
            {a.gap && <p className="mt-1 text-ink-soft">{a.gap}</p>}
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <label className="flex items-center gap-2 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
              Use
              <Select
                value={plan.risk.chosen}
                onChange={(e) => set({ ...plan, risk: { ...plan.risk, chosen: e.target.value } })}
                aria-label="Risk profile to use"
                className="!py-1 !text-sm"
              >
                <option value="">{a.recommended ? `Recommended (${a.recommended})` : "Recommended"}</option>
                {RISK_PROFILES.map((p) => (
                  <option key={p.name}>{p.name}</option>
                ))}
              </Select>
            </label>
            <Button onClick={apply} disabled={applied}>
              {applied ? `${profile.name} is applied to the model` : `Apply ${profile.name} to the model`}
            </Button>
          </div>
        </div>
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          Applying sets the planning assumption to {profile.ret}% a year with swings of about {profile.vol}%, used by the projection and every goal. A questionnaire is a starting point for a conversation, not a verdict.
        </p>
      </Panel>

      <Panel
        title="Investment policy statement"
        subtitle="The written plan agreed before any investing. Drafted from the plan; reword anything, and the changes are kept."
        actions={
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(ips.map((s) => `${s.title}\n${s.text}`).join("\n\n"));
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              } catch {
                /* clipboard unavailable */
              }
            }}
          >
            {copied ? "Copied" : "Copy as text"}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {ips.map((s) => (
            <div key={s.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor={`ips-${s.id}`} className="font-[family-name:var(--font-display)] text-sm font-semibold text-ink">
                  {s.title}
                </label>
                {s.edited && (
                  <Button variant="ghost" onClick={() => setOverride(s.id, "")}>
                    Reset to the draft
                  </Button>
                )}
              </div>
              <TextArea id={`ips-${s.id}`} rows={3} className="min-h-16 !text-sm" value={s.text} onChange={(e) => setOverride(s.id, e.target.value)} />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
