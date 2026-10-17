import { useMemo, useState } from "react";
import { useCourse } from "../../state/CourseContext";
import { anonymizeCase } from "../../lib/wealthCase";
import { roleProblem } from "../../lib/wealthCompliance";
import { preflight } from "../../lib/wealthPreflight";
import { useCopy } from "../../lib/copy";
import { DECK_SECTIONS, deckOutline, deckSlideCount } from "../../lib/wealthDeck";
import type { Insights, McResult, WealthPlan } from "../../lib/wealthMath";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/Field";
import { ModuleHead, Panel } from "./parts";
import { DeckLook } from "./DeckLook";
import { MarketPanel, ProcessPanel, QuestionsPanel } from "./DeckCustomize";
import { PlanBrief } from "./PlanBrief";
import { stepNo } from "./steps";

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
  const { repository } = useCourse();
  const [busy, setBusy] = useState(false);
  const [caseLabel, setCaseLabel] = useState("Client A");
  const [caseDescription, setCaseDescription] = useState("");
  const [caseNotes, setCaseNotes] = useState(true);
  const [caseConfirmed, setCaseConfirmed] = useState(false);
  const [shareTitle, setShareTitle] = useState("");
  const [shareName, setShareName] = useState(true);
  const [shared, setShared] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBrief, setShowBrief] = useState(false);
  const outline = useMemo(() => deckOutline({ plan, tools, copy }), [plan, tools, copy]);
  const count = deckSlideCount(outline);
  const skipped = new Set(plan.deck.skip);
  const presenter = plan.deck.presenter || presenterName;
  const roleIssue = roleProblem(plan.deck.role);
  const warnings = useMemo(() => preflight(plan).filter((i) => i.level === "warn" && i.id !== "checklist"), [plan]);

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
      void repository.bumpWealthStat("decks").catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const caseReport = useMemo(() => anonymizeCase(plan, tools, { label: caseLabel, description: caseDescription, removeNotes: caseNotes }), [plan, tools, caseLabel, caseDescription, caseNotes]);

  async function downloadCase() {
    setBusy(true);
    setError(null);
    try {
      const { buildDeck } = await import("../../lib/wealthDeck");
      const anon = { ...caseReport.plan, deck: { ...caseReport.plan.deck, presenter } };
      const { pres, filename } = await buildDeck({ plan: anon, tools: caseReport.tools, copy, anonymous: true });
      await pres.writeFile({ fileName: filename });
      void repository.bumpWealthStat("caseExports").catch(() => {});
      void repository.bumpWealthStat("decks").catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function shareCase() {
    setBusy(true);
    setError(null);
    setShared(null);
    try {
      await repository.publishWealthCase({
        title: shareTitle.trim() || caseDescription.trim() || "Untitled case",
        summary: caseDescription.trim(),
        plan: caseReport.plan,
        tools: caseReport.tools,
        showName: shareName,
      });
      setShared("Shared. It is in the case library now, where classmates in the track can read it and leave you feedback.");
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
        step={stepNo("presentation")}
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
            Your role, as it appears on the title slide
            <TextInput value={plan.deck.role} onChange={(e) => setDeck({ role: e.target.value })} maxLength={90} aria-describedby="role-help" />
          </label>
          {roleIssue ? (
            <p id="role-help" role="alert" className="font-[family-name:var(--font-ui)] text-xs text-clay-text">
              {roleIssue}
            </p>
          ) : (
            <p id="role-help" className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
              Describe yourself as a student. Do not use a title such as advisor or planner, or a designation such as CFP, that you do not hold.
            </p>
          )}
          <label className="flex cursor-pointer items-start gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
            <input type="checkbox" checked={plan.deck.sie} onChange={(e) => setDeck({ sie: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[var(--color-water-deep)]" />
            <span>
              I have passed the FINRA SIE exam
              <span className="block text-xs text-ink-soft">Adds an accurate line to the disclosures: the SIE is an exam, not a license, and does not allow giving advice. Tick it only once you have passed.</span>
            </span>
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

      <Panel title="Compliance review" subtitle="An automatic check of the wording and pieces before you present. The full list and your own checklist are in the Follow-up step.">
        {warnings.length === 0 ? (
          <p role="status" className="font-[family-name:var(--font-ui)] text-sm text-water-deep">
            Nothing to fix: the disclosures are in, the role line is a student's, and no promises or named securities were found in the text you wrote.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {warnings.map((w) => (
              <li key={w.id} className="font-[family-name:var(--font-ui)] text-sm text-ink">
                <span aria-hidden="true" className="mr-2 text-clay-text">!</span>
                <span className="sr-only">Needs attention: </span>
                {w.fix || w.text}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <DeckLook theme={plan.deck.theme} onChange={(theme) => setDeck({ theme })} />
      <ProcessPanel plan={plan} set={set} />
      <MarketPanel plan={plan} set={set} />
      <QuestionsPanel plan={plan} set={set} />

      <Panel title="Toolkit slides" subtitle="One slide per tool, with its numbers, results and a chart where it has one. Choose the tools in the Focus areas step.">
        {toolRows.length === 0 ? (
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">No tools yet. Choose the focus areas in the Focus areas step, or tick extra tools there.</p>
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

      <Panel
        title="Case portfolio (anonymized)"
        subtitle="A copy of this presentation with the client's name replaced and contact details removed, for your application portfolio or to share with the track. Only share what the client agreed to."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
            Call the client
            <TextInput value={caseLabel} onChange={(e) => setCaseLabel(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
            Describe them without identifying details
            <TextInput value={caseDescription} onChange={(e) => setCaseDescription(e.target.value)} placeholder="e.g. College junior with tip income and a credit card" />
          </label>
        </div>
        <label className="flex cursor-pointer items-start gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
          <input type="checkbox" checked={caseNotes} onChange={(e) => setCaseNotes(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-water-deep)]" />
          <span>
            Remove the discovery meeting notes, the money psychology notes, and who the mission provides for
            <span className="block text-xs text-ink-soft">These are free text and the likeliest to name or describe someone.</span>
          </span>
        </label>
        <div className="rounded-lg bg-parchment-deep p-3 font-[family-name:var(--font-ui)] text-xs text-ink-soft" role="status">
          <p>
            The client's name is replaced with "{caseLabel.trim() || "Client A"}" in <b className="text-ink">{caseReport.replacements}</b> place{caseReport.replacements === 1 ? "" : "s"}, and contact details are cleared.
          </p>
          {caseReport.flags.length > 0 && (
            <>
              <p className="mt-2 font-medium text-clay-text">These still look like an email address or phone number. Fix them in the plan, then try again:</p>
              <ul className="mt-1 list-disc pl-5">
                {caseReport.flags.map((f) => (
                  <li key={f.where}>
                    {f.where}: {f.text}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-2">Look through the goal names, SWOT items, roadmap and tool numbers yourself too: a place, an employer, or a rare detail can identify someone.</p>
        </div>
        <label className="flex cursor-pointer items-start gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
          <input type="checkbox" checked={caseConfirmed} onChange={(e) => setCaseConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-water-deep)]" />
          <span>I have checked that nothing in this case identifies the client, and they agreed I could use it.</span>
        </label>
        <div>
          <Button onClick={() => void downloadCase()} disabled={busy || !caseConfirmed || caseReport.flags.length > 0}>
            {busy ? "Building the deck…" : "Download anonymized PowerPoint"}
          </Button>
        </div>
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <h4 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">Share it with the track</h4>
          <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
            Puts this anonymized copy in the case library, which only people with Wealth Tools can open. They can read it, copy it into their own clients to practice on, and
            send you private feedback against a rubric. You can remove it any time.
          </p>
          <label className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft sm:max-w-md">
            Case title
            <TextInput value={shareTitle} onChange={(e) => setShareTitle(e.target.value)} placeholder="e.g. College junior, tip income, first investment account" maxLength={120} />
          </label>
          <label className="flex cursor-pointer items-start gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
            <input type="checkbox" checked={shareName} onChange={(e) => setShareName(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-water-deep)]" />
            <span>Show my name as the author</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={() => void shareCase()} disabled={busy || !caseConfirmed || caseReport.flags.length > 0}>
              Share to the case library
            </Button>
            {!caseConfirmed && <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">Tick the confirmation above first.</span>}
          </div>
          {shared && (
            <p role="status" className="font-[family-name:var(--font-ui)] text-sm text-water-deep">
              {shared}
            </p>
          )}
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Button variant="secondary" onClick={() => setShowBrief((v) => !v)} aria-expanded={showBrief}>
          {showBrief ? "Hide the client handout" : "Show the client handout"}
        </Button>
        <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">A printable leave-behind you choose the parts of, in the deck colors.</span>
      </div>
      {showBrief && <PlanBrief plan={plan} sim={sim} target={target} insights={insights} missionText={missionText} onHandout={(handout) => setDeck({ handout })} />}
    </div>
  );
}
