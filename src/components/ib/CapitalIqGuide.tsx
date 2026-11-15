import { CIQ_NOTE, CIQ_STEPS } from "../../lib/capitalIq";
import { Panel } from "../wealth/parts";

/** Step by step: what to pull from Capital IQ for each banking model, where to look for it, and what to watch for. */
export function CapitalIqGuide() {
  return (
    <Panel title="Capital IQ walkthrough" subtitle="UF licenses S&P Capital IQ for students. This is what to pull for each model here, where to look for it, and what trips people up.">
      <ol className="flex flex-col gap-4">
        {CIQ_STEPS.map((s, i) => (
          <li key={s.id} className="rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h4 className="t-h4">
                <span className="mr-2 font-[family-name:var(--font-ui)] text-sm tabular-nums text-ink-soft">{i + 1}.</span>
                {s.title}
              </h4>
              <span className="rounded-full border border-line px-2.5 py-0.5 font-[family-name:var(--font-ui)] text-[11px] font-medium text-ink-soft">Goes into: {s.feeds}</span>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <p className="font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">Where to look</p>
                <ul className="mt-1.5 flex list-disc flex-col gap-1.5 pl-5 font-[family-name:var(--font-ui)] text-sm text-ink">
                  {s.look.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">What to write down</p>
                <ul className="mt-1.5 flex list-disc flex-col gap-1.5 pl-5 font-[family-name:var(--font-ui)] text-sm text-ink">
                  {s.take.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-3 rounded-lg bg-parchment-deep px-3 py-2 font-[family-name:var(--font-ui)] text-sm text-ink">
              <span className="font-semibold">Watch for: </span>
              {s.watch}
            </p>
          </li>
        ))}
      </ol>
      <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{CIQ_NOTE} 4 Rivers is not affiliated with S&P Global and holds none of its data: you enter figures yourself and name your source.</p>
    </Panel>
  );
}
