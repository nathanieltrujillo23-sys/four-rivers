import { useEffect, useId, useRef, useState, type ReactElement } from "react";
import { useCopy } from "../../../lib/copy";
import { Button } from "../../ui/Button";
import { AccountsTool, CarTool, DebtTool, HouseTool, IncomeTool, MarriageTool, VacationTool, YourselfTool, type ToolProps } from "./scenarioTools";
import { SpecTool } from "./SpecTool";
import { CATALOG, SECTIONS, type ToolId } from "./toolCatalog";
import { SPECS } from "./toolSpecs";
import { TOOLKIT_TEXT, TOPICS } from "./workshopContent";

/** The tools that have their own screens; every other tool is drawn from its spec (toolSpecs.ts). */
const CUSTOM: Partial<Record<ToolId, (p: ToolProps) => ReactElement>> = {
  yourself: (p) => <YourselfTool {...p} />,
  income: (p) => <IncomeTool {...p} />,
  accounts: (p) => <AccountsTool {...p} />,
  car: (p) => <CarTool {...p} />,
  house: (p) => <HouseTool {...p} />,
  debt: (p) => <DebtTool {...p} />,
  marriage: (p) => <MarriageTool {...p} />,
  vacation: (p) => <VacationTool {...p} />,
};

function renderTool(id: ToolId, p: ToolProps): ReactElement {
  const spec = SPECS[id];
  if (spec) return <SpecTool key={id} id={id} spec={spec} {...p} />;
  return CUSTOM[id]?.(p) ?? <p>This tool is not available.</p>;
}

/**
 * The money toolkit: six drop-down sections (Live, Give, Grow, Owe, Estate planning, Other financial goals) of six tools
 * each. `recommended` lists the topic ids chosen in a meeting; sections holding their tools start open and mark them.
 */
export function ScenarioToolkit({
  recommended = [],
  level = 3,
  states,
  onToolState,
  selected,
  onToggle,
  maxSelected = 3,
}: {
  recommended?: string[];
  level?: 3 | 5;
  /** The numbers saved with the meeting for each tool, and where to report changes (a meeting keeps them). */
  states?: Record<string, unknown>;
  onToolState?: (id: string, state: unknown) => void;
  /** The tools picked for the meeting PDF, and the toggle (only inside a meeting). */
  selected?: string[];
  onToggle?: (id: string) => void;
  maxSelected?: number;
}) {
  const copy = useCopy();
  const Heading = `h${level}` as "h3" | "h5";
  const PanelHeading = `h${level + 1}` as "h4" | "h6";
  const base = useId();
  const picked = new Set(recommended.map((id) => TOPICS.find((t) => t.id === id)?.tool).filter(Boolean));
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(SECTIONS.filter((s) => s.tools.some((t) => picked.has(t))).map((s) => s.id)),
  );
  // Choosing a topic opens the section that holds its tool.
  const pickedKey = [...picked].join(",");
  useEffect(() => {
    const wanted = SECTIONS.filter((sec) => sec.tools.some((t) => picked.has(t))).map((sec) => sec.id);
    if (wanted.length === 0) return;
    setOpenSections((prev) => (wanted.every((id) => prev.has(id)) ? prev : new Set([...prev, ...wanted])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedKey]);
  const [openId, setOpenId] = useState<ToolId | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const toggleSection = (id: string) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-3">
      {SECTIONS.map((section) => {
        const open = openSections.has(section.id);
        const chosen = section.tools.filter((t) => picked.has(t)).length;
        const inPdf = section.tools.filter((t) => selected?.includes(t)).length;
        const bodyId = `${base}-${section.id}`;
        const openHere = openId && (section.tools as readonly string[]).includes(openId) ? openId : null;
        return (
          <section key={section.id} className="rounded-xl border border-line bg-surface">
            <Heading className="m-0">
              <button
                type="button"
                aria-expanded={open}
                aria-controls={bodyId}
                onClick={() => toggleSection(section.id)}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left hover:bg-parchment-deep/50"
              >
                <span>
                  <span className="t-h4 block">{copy(`toolkit:section:${section.id}:title`, section.title)}</span>
                  <span className="block font-[family-name:var(--font-ui)] text-sm font-normal text-ink-soft">{copy(`toolkit:section:${section.id}:text`, section.text)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 font-[family-name:var(--font-ui)] text-xs font-normal text-ink-soft">
                  {chosen > 0 && <span className="rounded-full bg-gold/25 px-2 py-0.5 font-medium text-ink">Chosen topic</span>}
                  {inPdf > 0 && <span className="rounded-full bg-water-deep/15 px-2 py-0.5 font-medium text-ink">{inPdf} in the PDF</span>}
                  <span aria-hidden="true" className={`text-base transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
                    {open ? "−" : "+"}
                  </span>
                </span>
              </button>
            </Heading>
            {open && (
              <div id={bodyId} className="section-open flex flex-col gap-4 border-t border-line p-4">
                <ul className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {section.tools.map((id) => {
                    const on = id === openId;
                    const title = copy(`toolkit:tool:${id}:title`, CATALOG[id].title);
                    const text = copy(`toolkit:tool:${id}:text`, CATALOG[id].text);
                    return (
                      <li key={id} className="flex flex-col gap-1">
                        <button
                          type="button"
                          aria-expanded={on}
                          onClick={() => {
                            setOpenId(on ? null : id);
                            if (!on) window.setTimeout(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
                          }}
                          className={`flex h-full w-full flex-col gap-1 rounded-xl border p-3 text-left ${
                            on ? "border-water-deep bg-parchment-deep" : "border-line bg-surface hover:bg-parchment-deep/50"
                          }`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-ink">{title}</span>
                            {picked.has(id) && (
                              <span className="rounded-full bg-gold/25 px-2 py-0.5 font-[family-name:var(--font-ui)] text-[11px] font-medium text-ink">Chosen topic</span>
                            )}
                          </span>
                          <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{text}</span>
                        </button>
                        {onToggle && (
                          <label className="flex cursor-pointer items-center gap-2 px-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                            <input
                              type="checkbox"
                              checked={selected?.includes(id) ?? false}
                              disabled={!(selected?.includes(id) ?? false) && (selected?.length ?? 0) >= maxSelected}
                              onChange={() => onToggle(id)}
                              className="h-4 w-4 accent-[var(--color-water-deep)]"
                            />
                            <span>Include {title} in the PDF</span>
                          </label>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {openHere && (
                  <div ref={panel} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
                    <div className="flex items-center justify-between gap-3">
                      <PanelHeading className="t-h4">{copy(`toolkit:tool:${openHere}:title`, CATALOG[openHere as ToolId].title)}</PanelHeading>
                      <Button variant="ghost" onClick={() => setOpenId(null)}>
                        Close
                      </Button>
                    </div>
                    {renderTool(openHere as ToolId, {
                      initial: states?.[openHere],
                      onState: onToolState ? (st) => onToolState(openHere, st) : undefined,
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
      <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{copy("toolkit:page:disclaimer", TOOLKIT_TEXT.disclaimer)}</p>
    </div>
  );
}
