import { useId, useMemo, useState } from "react";
import { useCopy } from "../../lib/copy";
import { Button } from "../ui/Button";
import { renderTool } from "../community/workshop/ScenarioToolkit";
import { CATALOG, SECTIONS, isToolId, type ToolId } from "../community/workshop/toolCatalog";
import { summarizeTool } from "../community/workshop/toolSummaries";
import { DEFAULTS, coerce } from "../community/workshop/toolDefaults";
import { coerceSpec } from "../community/workshop/specValues";
import { SPECS } from "../community/workshop/toolSpecs";
import { TOOLKIT_TEXT } from "../community/workshop/workshopContent";
import { HowCalculated, Panel } from "./parts";
import { TOOL_MATH } from "../../lib/wealthToolMath";
import { WEALTH_TEXT } from "./wealthText";

const filledIn = (tools: Record<string, unknown>, id: string) => tools[id] !== undefined && tools[id] !== null;

/** What a tool shows before anyone touches it (list lines carry fresh ids, so ids are left out when comparing). */
function startState(id: ToolId): unknown {
  const spec = SPECS[id];
  if (spec) return coerceSpec(spec, undefined);
  const defaults = (DEFAULTS as Record<string, object>)[id];
  return defaults ? coerce(defaults, undefined) : null;
}
const withoutIds = (v: unknown) => JSON.stringify(v, (k, x) => (k === "id" ? undefined : x));

/**
 * The money toolkit, summarized: one line per tool (its headline number once the person has put theirs in), grouped into
 * the six sections, with the full tool opening in place. Each person's numbers are their own and are saved to their account.
 */
export function WealthToolkit({
  tools,
  onToolState,
  deckTools,
  focusTools = [],
  onToggleDeck,
}: {
  tools: Record<string, unknown>;
  onToolState: (id: string, state: unknown) => void;
  /** The extra tools chosen for the presentation, and the toggle (omit both for a toolkit with no presentation). */
  deckTools?: string[];
  /** Tools already in the presentation because they belong to a focus area. */
  focusTools?: string[];
  onToggleDeck?: (id: string) => void;
}) {
  const copy = useCopy();
  const base = useId();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [openTool, setOpenTool] = useState<ToolId | null>(null);

  const snapshots = useMemo(() => {
    const out = new Map<string, ReturnType<typeof summarizeTool>>();
    for (const [id, state] of Object.entries(tools)) {
      if (isToolId(id) && state != null) out.set(id, summarizeTool(id, state, copy));
    }
    return out;
  }, [tools, copy]);
  const headline = (id: ToolId) => {
    const snap = snapshots.get(id);
    const rows = snap?.sections[snap.sections.length - 1]?.rows ?? [];
    return rows.slice(0, 2);
  };
  const count = snapshots.size;

  return (
    <div className="flex flex-col gap-6">
      <style>{`
        @media print {
          @page { size: letter portrait; margin: 0.5in; }
          body * { visibility: hidden !important; }
          #wealth-toolkit-summary, #wealth-toolkit-summary * { visibility: visible !important; }
          #wealth-toolkit-summary { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
          #wealth-toolkit-summary .no-print { display: none !important; }
        }
      `}</style>

      <Panel
        title={count > 0 ? `Numbers at a glance (${count} ${count === 1 ? "tool" : "tools"})` : "Numbers at a glance"}
        subtitle={copy("wealth:toolkit:intro", WEALTH_TEXT.toolkitIntro)}
        actions={
          count > 0 ? (
            <Button variant="secondary" className="no-print" onClick={() => window.print()}>
              Print this summary
            </Button>
          ) : undefined
        }
        className="print:shadow-none"
      >
        <div id="wealth-toolkit-summary" className="flex flex-col gap-3">
          {count === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              Nothing yet. The numbers show up here as soon as a tool is filled in.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...snapshots.values()].map((snap) => (
                <li key={snap.id} className="panel-inner px-4 py-3">
                  <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-ink">{snap.title}</p>
                  <dl className="mt-1.5 flex flex-col gap-1">
                    {headline(snap.id).map(([label, value]) => (
                      <div key={label}>
                        <dt className="font-[family-name:var(--font-ui)] text-[11px] text-ink-soft">{label}</dt>
                        <dd className="font-[family-name:var(--font-ui)] text-sm font-semibold tabular-nums text-ink">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <div className="flex flex-col gap-3">
        {SECTIONS.map((section) => {
          const open = openSection === section.id;
          const done = section.tools.filter((t) => filledIn(tools, t)).length;
          const bodyId = `${base}-${section.id}`;
          return (
            <section key={section.id} className="rounded-xl border border-line bg-surface">
              <h3 className="m-0">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={bodyId}
                  onClick={() => {
                    setOpenSection(open ? null : section.id);
                    if (open) setOpenTool(null);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left hover:bg-parchment-deep/50"
                >
                  <span>
                    <span className="t-h4 block">{copy(`toolkit:section:${section.id}:title`, section.title)}</span>
                    <span className="block font-[family-name:var(--font-ui)] text-sm font-normal text-ink-soft">
                      {copy(`toolkit:section:${section.id}:text`, section.text)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 font-[family-name:var(--font-ui)] text-xs font-normal text-ink-soft">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${done > 0 ? "bg-river-1/15 text-ink" : "bg-parchment-deep"}`}>
                      {done} of {section.tools.length}
                    </span>
                    <span aria-hidden="true" className="text-base">
                      {open ? "−" : "+"}
                    </span>
                  </span>
                </button>
              </h3>
              {open && (
                <div id={bodyId} className="section-open flex flex-col gap-3 border-t border-line p-3">
                  <ul className="flex flex-col divide-y divide-line">
                    {section.tools.map((id) => {
                      const on = openTool === id;
                      const rows = headline(id);
                      const title = copy(`toolkit:tool:${id}:title`, CATALOG[id].title);
                      return (
                        <li key={id} className="py-1">
                          <button
                            type="button"
                            aria-expanded={on}
                            onClick={() => setOpenTool(on ? null : id)}
                            className={`flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg px-3 py-2 text-left ${
                              on ? "bg-parchment-deep" : "hover:bg-parchment-deep/50"
                            }`}
                          >
                            <span className="flex items-center gap-2 font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
                              <span
                                aria-hidden="true"
                                className={`grid h-4 w-4 place-items-center rounded-full text-[10px] ${filledIn(tools, id) ? "bg-river-1 text-white" : "border border-line text-transparent"}`}
                              >
                                ✓
                              </span>
                              {title}
                              {filledIn(tools, id) && <span className="sr-only"> (filled in)</span>}
                              {focusTools.includes(id) && (
                                <span className="rounded-full bg-gold/25 px-2 py-0.5 text-[11px] font-medium text-ink">Focus area</span>
                              )}
                              {deckTools?.includes(id) && <span className="rounded-full bg-water-deep/15 px-2 py-0.5 text-[11px] font-medium text-ink">In the presentation</span>}
                            </span>
                            <span className="min-w-0 truncate font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                              {rows.length > 0
                                ? rows.map(([label, value]) => `${label}: ${value}`).join(" · ")
                                : copy(`toolkit:tool:${id}:text`, CATALOG[id].text)}
                            </span>
                          </button>
                          {on && (
                            <div className="mt-2 flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
                              <div className="flex items-center justify-between gap-3">
                                <h4 className="t-h4">{title}</h4>
                                <span className="flex gap-1">
                                  {filledIn(tools, id) && (
                                    <Button
                                      variant="ghost"
                                      onClick={() => {
                                        onToolState(id, null);
                                        setOpenTool(null);
                                      }}
                                    >
                                      Clear my numbers
                                    </Button>
                                  )}
                                  <Button variant="ghost" onClick={() => setOpenTool(null)}>
                                    Close
                                  </Button>
                                </span>
                              </div>
                              {onToggleDeck && !focusTools.includes(id) && (
                                <label className="flex cursor-pointer items-center gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
                                  <input
                                    type="checkbox"
                                    checked={deckTools?.includes(id) ?? false}
                                    onChange={() => onToggleDeck(id)}
                                    className="h-4 w-4 accent-[var(--color-water-deep)]"
                                  />
                                  Include {title} in the presentation
                                </label>
                              )}
                              <HowCalculated title="How this tool is calculated" steps={TOOL_MATH[id]} />
                              {renderTool(id, {
                                initial: tools[id],
                                // A tool that reports its starting numbers as it opens has not been filled in.
                                onState: (s) => {
                                  if (!filledIn(tools, id) && withoutIds(s) === withoutIds(startState(id))) return;
                                  onToolState(id, s);
                                },
                              })}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{copy("toolkit:page:disclaimer", TOOLKIT_TEXT.disclaimer)}</p>
      </div>
    </div>
  );
}
