import { Button } from "../ui/Button";
import { ProjectionChart } from "./parts";
import {
  SCHED_CATS,
  SWOT_KEYS,
  SWOT_TITLES,
  fmtDate,
  fmtK,
  fmtPct,
  fmtUsd,
  num,
  type Insights,
  type McResult,
  type WealthPlan,
} from "../../lib/wealthMath";

function H({ children }: { children: string }) {
  return <h3 className="mb-2 border-b border-line pb-1 font-[family-name:var(--font-ui)] text-[10px] font-bold uppercase tracking-[0.18em] text-ink">{children}</h3>;
}

/** The one-page summary of a person's plan, printable (Letter, portrait) or savable as a PDF. */
export function PlanBrief({
  plan,
  sim,
  target,
  insights,
  missionText,
}: {
  plan: WealthPlan;
  sim: McResult;
  target: number;
  insights: Insights;
  missionText: string;
}) {
  const { client, goals, swot, roadmap, schedule } = plan;
  const total = goals.reduce((s, g) => s + num(g.amount), 0);
  const saved = goals.reduce((s, g) => s + Math.min(num(g.current), num(g.amount)), 0);
  const targetGoal = goals.find((g) => g.id === plan.model.goalId);
  const hours = SCHED_CATS.map((c) => ({ ...c, h: Object.values(schedule).filter((v) => v === c.key).length })).filter((c) => c.h > 0);
  const next = roadmap.filter((r) => r.status !== "Completed" && (r.phase === "30 Days" || r.phase === "90 Days")).slice(0, 6);
  return (
    <div className="flex flex-col gap-6">
      <style>{`
        @media print {
          @page { size: letter portrait; margin: 0.4in; }
          body * { visibility: hidden !important; }
          #wealth-brief, #wealth-brief * { visibility: visible !important; }
          #wealth-brief { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: 0 !important; }
          #wealth-brief, #wealth-brief * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-eyebrow">Wealth Tools</p>
          <h2 className="t-h2 mt-1">My wealth plan</h2>
          <p className="mt-1.5 font-[family-name:var(--font-ui)] text-sm text-ink-soft">A one page summary of your plan. Print it, or save it as a PDF from the print window.</p>
        </div>
        <Button onClick={() => window.print()}>Print or save as PDF</Button>
      </div>

      <article id="wealth-brief" className="mx-auto w-full max-w-[8.5in] rounded-sm border border-line bg-surface font-[family-name:var(--font-ui)] text-[11px] leading-snug text-ink shadow-md">
        <header className="flex items-start justify-between gap-6 bg-water-deep px-8 py-5 text-white">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white">4 Rivers · Wealth plan</p>
            <p className="mt-1 text-2xl">{client.name || "My plan"}</p>
            <p className="mt-0.5 text-white">{[client.age && `Age ${client.age}`, client.occupation].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="shrink-0 text-right text-white">
            <p>{fmtDate(client.date)}</p>
            <p className="mt-1 inline-block rounded-full border border-white/50 px-2 py-0.5">{client.risk}</p>
          </div>
        </header>

        <div className="flex flex-col gap-4 px-8 py-5">
          {missionText && (
            <div className="border-l-4 border-gold bg-parchment-deep py-2 pl-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-clay-text">Money mission</p>
              <p className="mt-0.5 text-[14px] text-ink">“{missionText}”</p>
            </div>
          )}

          <div className="grid grid-cols-4 gap-3">
            {(
              [
                ["Needed", fmtK(total)],
                ["Funded today", total ? fmtPct(saved / total) : "0%"],
                ["Median outcome", fmtK(sim.final.p50)],
                ["Chance of success", sim.prob == null ? "n/a" : fmtPct(sim.prob)],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k} className="rounded border border-line px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-ink-soft">{k}</p>
                <p className="text-lg font-semibold tabular-nums text-ink">{v}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <H>Goals</H>
              <table className="w-full">
                <tbody>
                  {goals.slice(0, 7).map((g) => (
                    <tr key={g.id} className="border-b border-line last:border-0">
                      <td className="py-1 pr-2">{g.name}</td>
                      <td className="whitespace-nowrap py-1 pr-2 text-ink-soft">
                        {num(g.horizon)} yr · {g.priority}
                      </td>
                      <td className="whitespace-nowrap py-1 text-right font-medium tabular-nums">{fmtUsd(num(g.amount))}</td>
                    </tr>
                  ))}
                  {goals.length === 0 && (
                    <tr>
                      <td className="py-1 text-ink-soft">No goals added.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div>
              <H>SWOT summary</H>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {SWOT_KEYS.map((k) => (
                  <div key={k}>
                    <p className="font-semibold text-ink">{SWOT_TITLES[k]}</p>
                    <ul className="list-disc pl-3.5 text-ink-soft">
                      {swot[k].slice(0, 3).map((x) => (
                        <li key={x.id}>{x.text}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[1.25fr_1fr] gap-5">
            <div>
              <H>{`Projection · ${sim.years} years · ${plan.model.ret}% return / ${plan.model.vol}% swings`}</H>
              <ProjectionChart data={sim.data} target={target} compact caption={`Projection over ${sim.years} years, median ${fmtUsd(sim.final.p50)}`} />
              <p className="mt-1 flex justify-between tabular-nums text-[10px] text-ink-soft">
                <span>
                  <b className="text-ink">Low</b> {fmtUsd(sim.final.p10)}
                </span>
                <span>
                  <b className="text-ink">Median</b> {fmtUsd(sim.final.p50)}
                </span>
                <span>
                  <b className="text-ink">High</b> {fmtUsd(sim.final.p90)}
                </span>
              </p>
              <p className="mt-0.5 text-[10px] text-ink-soft">
                {fmtUsd(num(plan.model.initial))} to start + {fmtUsd(num(plan.model.monthly))}/mo{targetGoal ? ` toward "${targetGoal.name}"` : ""}.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <H>Strategic priorities</H>
                <ol className="list-decimal pl-4">
                  {insights.remediate.slice(0, 2).map((x, i) => (
                    <li key={`r${i}`}>
                      <b>Fix:</b> {x.headline}
                    </li>
                  ))}
                  {insights.growth.slice(0, 2).map((x, i) => (
                    <li key={`g${i}`}>
                      <b>Grow:</b> {x.tactic}
                    </li>
                  ))}
                  {insights.risk.slice(0, 1).map((x, i) => (
                    <li key={`k${i}`}>
                      <b>Defend:</b> {x.tactic}
                    </li>
                  ))}
                </ol>
              </div>
              {hours.length > 0 && (
                <div>
                  <H>Weekly time</H>
                  <p className="flex flex-wrap gap-x-3 gap-y-1">
                    {hours.map((c) => (
                      <span key={c.key} className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-sm" style={{ background: c.color }} />
                        {c.label.split(" / ")[0]} <b className="tabular-nums">{c.h}h</b>
                      </span>
                    ))}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <H>Next 90 days</H>
            {next.length ? (
              <ul className="grid grid-cols-2 gap-x-5 gap-y-1">
                {next.map((r) => (
                  <li key={r.id} className="flex items-start gap-2">
                    <span className={`mt-0.5 h-3 w-3 shrink-0 rounded-sm border ${r.status === "In Progress" ? "border-gold bg-gold" : "border-ink-soft"}`} />
                    <span>
                      <span className="text-ink-soft">{r.phase}:</span> {r.text}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-soft">Build the roadmap in Module 6 to fill in your next steps.</p>
            )}
          </div>
        </div>
        <footer className="flex justify-between gap-4 border-t border-line px-8 py-3 text-[9px] text-ink-soft">
          <span>Hypothetical projections for learning and planning only; not investment, tax, or legal advice. Past performance does not guarantee future results.</span>
          <span className="shrink-0">4 Rivers · One source. Four streams.</span>
        </footer>
      </article>
    </div>
  );
}
