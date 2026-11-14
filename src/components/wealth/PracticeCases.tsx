import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PRACTICE_CASES, type PracticeCase } from "../../lib/wealthPractice";
import type { WealthClient } from "../../types";
import { Button } from "../ui/Button";
import { Panel } from "./parts";

const LEVEL_TONE: Record<PracticeCase["level"], string> = {
  Foundation: "border-river-1 text-river-1",
  Intermediate: "border-water-deep text-water-deep",
  Advanced: "border-clay text-clay-text",
};

/**
 * Practice cases: invented clients in common situations. Starting one opens it as a client plan with the facts filled in;
 * the SWOT, strategy, model and presentation are the student's to do.
 */
export function PracticeCases({ create, started }: { create: (plan: unknown) => Promise<WealthClient>; started: string[] }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState<string | null>(null);
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(c: PracticeCase) {
    setBusy(c.id);
    setError(null);
    try {
      const made = await create(c.build());
      navigate(`/community/wealth/${made.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Practice with a client who is not real" subtitle="Six invented clients, from a first job to five years before retirement. Each opens as a client plan with the discovery notes, balance sheet, spending and goals filled in. The analysis and the presentation are yours.">
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink">
          Work the case alone or with a partner, build the PowerPoint, then present it to someone in the track and ask them to score it with the review rubric. Read "What a strong answer notices" only after you have your own.
        </p>
        {error && (
          <p role="alert" className="font-[family-name:var(--font-ui)] text-sm text-red-700">
            The case could not be opened: {error}
          </p>
        )}
      </Panel>
      <ul className="flex flex-col gap-4">
        {PRACTICE_CASES.map((c) => {
          const isOpen = open === c.id;
          return (
            <li key={c.id} className="panel flex flex-col gap-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 font-[family-name:var(--font-ui)] text-[11px] font-medium ${LEVEL_TONE[c.level]}`}>{c.level}</span>
                    {started.includes(c.client.split(",")[0]) && <span className="font-[family-name:var(--font-ui)] text-[11px] text-ink-soft">In your clients</span>}
                  </p>
                  <h3 className="mt-2 t-h3">{c.title}</h3>
                  <p className="font-[family-name:var(--font-ui)] text-sm font-medium text-ink">{c.client}</p>
                  <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{c.summary}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button variant="secondary" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : c.id)} aria-label={`${isOpen ? "Hide" : "Read"} the brief: ${c.title}`}>
                    {isOpen ? "Hide the brief" : "Read the brief"}
                  </Button>
                  <Button disabled={busy !== null} onClick={() => start(c)} aria-label={`Start this case: ${c.title}`}>
                    {busy === c.id ? "Opening…" : "Start this case"}
                  </Button>
                </div>
              </div>
              {isOpen && (
                <div className="grid gap-5 border-t border-line pt-4 lg:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <h4 className="t-h4">What you learn in the meeting</h4>
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
                      <h4 className="t-h4">Tools that fit</h4>
                      <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{c.tools.join(" · ")}</p>
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
      <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">Every person and number in these cases is invented for practice. They are teaching material, not advice for anyone in a similar situation.</p>
    </div>
  );
}
