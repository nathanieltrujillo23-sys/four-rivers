import { useState } from "react";
import { IB_CASES, type IbCase } from "../../lib/ibPractice";
import type { IbData } from "../../lib/ibWorkspace";
import { Button } from "../ui/Button";
import { Panel } from "../wealth/parts";

const LEVEL_TONE: Record<IbCase["level"], string> = {
  Foundation: "border-river-1 text-river-1",
  Intermediate: "border-water-deep text-water-deep",
  Advanced: "border-clay text-clay-text",
};

/**
 * Practice cases: an invented sale, buyout and merger. Loading one replaces the numbers in the models it names (after a
 * confirmation) and opens the valuation models; the analysis and the recommendation are the student's.
 */
export function IbPracticeCases({ update, onLoaded }: { update: (fn: (d: IbData) => IbData) => void; onLoaded: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [shown, setShown] = useState<Record<string, boolean>>({});

  function load(c: IbCase) {
    if (!window.confirm(`Load "${c.title}"? This replaces what is in these models: ${c.models.join(", ")}. Export or share your own work first if you want to keep it.`)) return;
    update((d) => ({ ...d, ...c.load() }));
    onLoaded();
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Practice on a deal that is not real" subtitle="Three invented situations: a family selling its company, a fund weighing a buyout, and a merger. Each loads its numbers into the valuation models; the analysis and the recommendation are yours.">
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink">
          Work the case, export the models to Excel, then share one for peer review or walk a partner through your recommendation in two minutes. Read "What a strong answer notices" only after you have your own.
        </p>
      </Panel>
      <ul className="flex flex-col gap-4">
        {IB_CASES.map((c) => {
          const isOpen = open === c.id;
          return (
            <li key={c.id} className="panel flex flex-col gap-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 font-[family-name:var(--font-ui)] text-[11px] font-medium ${LEVEL_TONE[c.level]}`}>{c.level}</span>
                    <span className="font-[family-name:var(--font-ui)] text-[11px] text-ink-soft">You are the {c.role.toLowerCase()}</span>
                  </p>
                  <h3 className="mt-2 t-h3">{c.title}</h3>
                  <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{c.summary}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button variant="secondary" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : c.id)} aria-label={`${isOpen ? "Hide" : "Read"} the brief: ${c.title}`}>
                    {isOpen ? "Hide the brief" : "Read the brief"}
                  </Button>
                  <Button onClick={() => load(c)} aria-label={`Load the numbers: ${c.title}`}>
                    Load the numbers
                  </Button>
                </div>
              </div>
              {isOpen && (
                <div className="grid gap-5 border-t border-line pt-4 lg:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <h4 className="t-h4">The situation</h4>
                    {c.brief.map((p) => (
                      <p key={p} className="font-[family-name:var(--font-ui)] text-sm text-ink">
                        {p}
                      </p>
                    ))}
                  </div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <h4 className="t-h4">Your work</h4>
                      <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 font-[family-name:var(--font-ui)] text-sm text-ink">
                        {c.tasks.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ol>
                    </div>
                    <div>
                      <h4 className="t-h4">Models it fills in</h4>
                      <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{c.models.join(" · ")}</p>
                    </div>
                    <div>
                      {shown[c.id] ? (
                        <>
                          <h4 className="t-h4">What a strong answer notices</h4>
                          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 font-[family-name:var(--font-ui)] text-sm text-ink">
                            {c.notice.map((t) => (
                              <li key={t}>{t}</li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <Button variant="ghost" onClick={() => setShown({ ...shown, [c.id]: true })} aria-label={`Show what a strong answer notices: ${c.title}`}>
                          Show what a strong answer notices
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">Every company, peer and deal in these cases is invented for practice. None is a real security or transaction, and nothing here is investment advice.</p>
    </div>
  );
}
