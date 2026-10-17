import { useState } from "react";
import { renderTool } from "../community/workshop/ScenarioToolkit";
import { CATALOG, isToolId, type ToolId } from "../community/workshop/toolCatalog";
import { DEFAULTS, coerce } from "../community/workshop/toolDefaults";
import { coerceSpec } from "../community/workshop/specValues";
import { SPECS } from "../community/workshop/toolSpecs";
import { TOPICS, topicLabel } from "../community/workshop/workshopContent";
import { useCopy } from "../../lib/copy";
import { TOPIC_WHY } from "../../lib/wealthContent";
import type { WealthPlan } from "../../lib/wealthMath";
import { Button } from "../ui/Button";
import { ModuleHead, Panel, Pill } from "./parts";
import { WealthToolkit } from "./WealthToolkit";
import { stepNo } from "./steps";

/** What a tool shows before anyone touches it (list lines carry fresh ids, so ids are left out when comparing). */
function startState(id: ToolId): unknown {
  const spec = SPECS[id];
  if (spec) return coerceSpec(spec, undefined);
  const defaults = (DEFAULTS as Record<string, object>)[id];
  return defaults ? coerce(defaults, undefined) : null;
}
const withoutIds = (v: unknown) => JSON.stringify(v, (k, x) => (k === "id" ? undefined : x));

/**
 * Step 6: the 2 or 3 areas the client most wants to learn about (the topics from the discovery meeting), each with its toolkit
 * tool open right here so the real numbers go in, and the rest of the toolkit below for anything extra to bring.
 */
export function FocusStep({
  plan,
  set,
  tools,
  onToolState,
}: {
  plan: WealthPlan;
  set: (next: WealthPlan) => void;
  tools: Record<string, unknown>;
  onToolState: (id: string, state: unknown) => void;
}) {
  const copy = useCopy();
  // Clearing a tool also resets what its screen is showing.
  const [resets, setResets] = useState<Record<string, number>>({});
  const focus = plan.focus;
  const toggle = (id: string) => {
    const next = focus.includes(id) ? focus.filter((x) => x !== id) : focus.length >= 3 ? focus : [...focus, id];
    set({ ...plan, focus: next });
  };
  const chosen = focus.map((id) => TOPICS.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t);
  const focusTools = chosen.map((t) => t.tool).filter(isToolId);
  const toggleDeck = (id: string) =>
    set({ ...plan, deck: { ...plan.deck, tools: plan.deck.tools.includes(id) ? plan.deck.tools.filter((x) => x !== id) : [...plan.deck.tools, id] } });

  return (
    <div className="flex flex-col gap-6">
      <ModuleHead
        step={stepNo("focus")}
        title="Focus areas and tools"
        desc="Which 2 or 3 areas does the client most want to learn about? Each one gets its own slides in the presentation, built from the client's real numbers."
      />
      <Panel title="Choose 2 or 3 areas" subtitle={`${focus.length} of 3 chosen. These are the topics from the end of the discovery meeting.`}>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Focus areas">
          {TOPICS.map((t) => {
            const on = focus.includes(t.id);
            const full = !on && focus.length >= 3;
            return (
              <Pill key={t.id} active={on} disabled={full} onClick={() => toggle(t.id)} label={`${topicLabel(t, copy)}${on ? ", chosen" : ""}`}>
                {topicLabel(t, copy)}
              </Pill>
            );
          })}
        </div>
        {focus.length > 0 && focus.length < 2 && (
          <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">Choose one or two more if the client wants to cover them.</p>
        )}
      </Panel>

      {chosen.map((t, i) => {
        const id = t.tool as ToolId;
        const filled = tools[id] !== undefined && tools[id] !== null;
        return (
          <Panel
            key={t.id}
            title={`${i + 1}. ${topicLabel(t, copy)}`}
            subtitle={TOPIC_WHY[t.id]}
            actions={
              filled ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    onToolState(id, null);
                    setResets((r) => ({ ...r, [id]: (r[id] ?? 0) + 1 }));
                  }}
                >
                  Clear numbers
                </Button>
              ) : (
                <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">Showing example numbers</span>
              )
            }
          >
            <p className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
              {copy(`toolkit:tool:${id}:title`, CATALOG[id].title)}
              <span className="ml-2 font-normal text-ink-soft">{copy(`toolkit:tool:${id}:text`, CATALOG[id].text)}</span>
            </p>
            <div key={`${id}-${resets[id] ?? 0}`}>
              {renderTool(id, {
                initial: tools[id],
                // A tool that reports its starting numbers as it opens has not been filled in.
                onState: (st) => {
                  if (!filled && withoutIds(st) === withoutIds(startState(id))) return;
                  onToolState(id, st);
                },
              })}
            </div>
          </Panel>
        );
      })}

      <section aria-labelledby="more-tools" className="flex flex-col gap-3">
        <h3 id="more-tools" className="t-h3">
          More tools to bring
        </h3>
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          Anything else in the toolkit that backs up the plan. Fill in a tool, then tick it to add its slide to the presentation.
        </p>
        <WealthToolkit tools={tools} onToolState={onToolState} deckTools={plan.deck.tools} focusTools={focusTools} onToggleDeck={toggleDeck} />
      </section>
    </div>
  );
}
