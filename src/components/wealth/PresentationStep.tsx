import { useMemo, useState } from "react";
import { useCopy } from "../../lib/copy";
import { DECK_SECTIONS, deckOutline, deckSlideCount } from "../../lib/wealthDeck";
import type { Insights, McResult, WealthPlan } from "../../lib/wealthMath";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/Field";
import { ModuleHead, Panel } from "./parts";
import { PlanBrief } from "./PlanBrief";

/**
 * Step 8: the presentation. Settings (who is presenting, the date), what goes in the deck, and the download. The deck is
 * built here in the browser from the plan and the client's toolkit numbers; nothing is sent anywhere.
 */
export function PresentationStep({
  plan,
  set,
  tools,
  sim,
  target,
  insights,
  missionText,
  presenterName,
}: {
  plan: WealthPlan;
  set: (next: WealthPlan) => void;
  tools: Record<string, unknown>;
  sim: McResult;
  target: number;
  insights: Insights;
  missionText: string;
  presenterName: string;
}) {
  const copy = useCopy();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBrief, setShowBrief] = useState(false);
  const outline = useMemo(() => deckOutline({ plan, tools, copy }), [plan, tools, copy]);
  const count = deckSlideCount(outline);
  const skipped = new Set(plan.deck.skip);
  const presenter = plan.deck.presenter || presenterName;

  const setDeck = (patch: Partial<WealthPlan["deck"]>) => set({ ...plan, deck: { ...plan.deck, ...patch } });
  const toggleSection = (id: string) => setDeck({ skip: skipped.has(id) ? plan.deck.skip.filter((x) => x !== id) : [...plan.deck.skip, id] });

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const { buildDeck } = await import("../../lib/wealthDeck");
      // The presenter's name is filled in from their account when they have not typed one.
      const withPresenter = { ...plan, deck: { ...plan.deck, presenter } };
      const { pres, filename } = await buildDeck({ plan: withPresenter, tools, copy });
      await pres.writeFile({ fileName: filename });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const sectionRows = outline.filter((o) => o.kind === "section");
  const toolRows = outline.filter((o) => o.kind === "tool");

  return (
    <div className="flex flex-col gap-6">
      <ModuleHead
        step={8}
        title="Presentation"
        desc="Turn the plan into a PowerPoint walk-through for the client: their goals, the financial model behind them, and the tools for the areas they chose to learn about."
      >
        <Button onClick={() => void download()} disabled={busy} aria-describedby="deck-count">
          {busy ? "Building the deck…" : "Download PowerPoint (.pptx)"}
        </Button>
      </ModuleHead>
      {error && (
        <p role="alert" className="font-[family-name:var(--font-ui)] text-sm text-red-700">
          The presentation could not be built: {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="About the meeting" className="lg:col-span-1">
          <label className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
            Presented by
            <TextInput value={plan.deck.presenter} onChange={(e) => setDeck({ presenter: e.target.value })} placeholder={presenterName || "Your name"} />
          </label>
          <label className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
            Meeting date
            <TextInput type="date" value={plan.deck.meetingDate} onChange={(e) => setDeck({ meetingDate: e.target.value })} />
          </label>
          <p id="deck-count" className="font-[family-name:var(--font-ui)] text-sm text-ink">
            <b className="tabular-nums">{count} slides</b> · native, editable charts and tables · speaker notes on every slide
          </p>
          <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
            The speaker notes explain each slide in plain words, so you can present from them. Open the file in PowerPoint, Keynote, or Google Slides.
          </p>
        </Panel>

        <Panel title="What goes in the deck" subtitle="Untick anything to leave it out. Parts with nothing in the plan yet are greyed." className="lg:col-span-2">
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {sectionRows.map((o) => {
              const meta = DECK_SECTIONS.find((d) => d.id === o.id)!;
              return (
                <li key={o.id}>
                  <label className={`flex items-start gap-2 rounded-lg px-2 py-1.5 font-[family-name:var(--font-ui)] text-sm ${o.available ? "cursor-pointer hover:bg-parchment-deep/60" : "opacity-70"}`}>
                    <input
                      type="checkbox"
                      checked={o.included}
                      disabled={!o.available}
                      onChange={() => toggleSection(o.id)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-water-deep)]"
                    />
                    <span>
                      <span className="font-medium text-ink">{meta.label}</span>
                      <span className="block text-xs text-ink-soft">{o.available ? meta.text : o.reason}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <Panel title="Toolkit slides" subtitle="One slide per tool, with its numbers, results and a chart where it has one. Choose the tools in step 6.">
        {toolRows.length === 0 ? (
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">No tools yet. Choose the focus areas in step 6, or tick extra tools there.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {toolRows.map((o) => {
              const filled = tools[o.tool!] !== undefined && tools[o.tool!] !== null;
              return (
                <li key={o.id} className="rounded-full border border-line bg-parchment-deep px-3 py-1 font-[family-name:var(--font-ui)] text-xs text-ink">
                  {o.title}
                  <span className="ml-1.5 text-ink-soft">{filled ? "client's numbers" : "example numbers"}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Button variant="secondary" onClick={() => setShowBrief((v) => !v)} aria-expanded={showBrief}>
          {showBrief ? "Hide the one-page brief" : "Show the one-page brief"}
        </Button>
        <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">A printable single page to leave with the client.</span>
      </div>
      {showBrief && <PlanBrief plan={plan} sim={sim} target={target} insights={insights} missionText={missionText} />}
    </div>
  );
}
