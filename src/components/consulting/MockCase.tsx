import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { Select } from "../ui/Field";
import { Note } from "../ib/Recruiting";
import { cellCls } from "../ib/ibParts";
import { Panel } from "../wealth/parts";
import { FRAMEWORKS } from "../../lib/consultingContent";
import { isClose } from "../../lib/consultingMath";
import { CASE_RUBRIC, type CaseLog, type ConsultingData } from "../../lib/consultingWorkspace";
import { CASE_PHASES, MOCK_CASES, clock, phaseAt, type MockCase as Mock } from "../../lib/mockCases";
import { uid } from "../../lib/wealthMath";

/** A stopwatch with the four phases of a 25-minute case. It announces each new phase to a screen reader. */
export function CaseTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const last = useRef("");
  const [announce, setAnnounce] = useState("");
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [running]);
  const p = phaseAt(seconds);
  useEffect(() => {
    const key = p.over ? "over" : p.phase.id;
    if (running && key !== last.current) {
      last.current = key;
      setAnnounce(p.over ? "The 25 minutes are up." : `Now: ${p.phase.label}, ${p.phase.minutes} minutes.`);
    }
  }, [p.over, p.phase.id, p.phase.label, p.phase.minutes, running]);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-[family-name:var(--font-ui)] text-3xl font-semibold tabular-nums text-ink" aria-label={`Elapsed ${clock(seconds)}`}>
          {clock(seconds)}
        </p>
        <Button onClick={() => setRunning((r) => !r)}>{running ? "Pause" : seconds > 0 ? "Resume" : "Start the case timer"}</Button>
        <Button
          variant="ghost"
          onClick={() => {
            setRunning(false);
            setSeconds(0);
            last.current = "";
            setAnnounce("");
          }}
        >
          Reset
        </Button>
      </div>
      <ol className="grid gap-2 sm:grid-cols-4" aria-label="Phases of a 25-minute case">
        {CASE_PHASES.map((x) => (
          <li key={x.id} className={`rounded-lg border px-3 py-2 font-[family-name:var(--font-ui)] text-xs ${p.phase.id === x.id && seconds > 0 ? "border-water-deep bg-parchment-deep text-ink" : "border-line text-ink-soft"}`} aria-current={p.phase.id === x.id && seconds > 0 ? "step" : undefined}>
            <span className="block font-semibold">{x.label}</span>
            {x.minutes} min
          </li>
        ))}
      </ol>
      {p.over && <p className="font-[family-name:var(--font-ui)] text-sm text-clay-text">Over 25 minutes. In a real interview, wrap up with your recommendation.</p>}
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
    </div>
  );
}

type Rated = Record<string, number>;

/** A mock case with an interviewer who gives the headline and shares data only when asked. */
export function MockCaseTab({ update }: { update: (fn: (d: ConsultingData) => ConsultingData) => void }) {
  const [caseId, setCaseId] = useState<string | null>(null);
  const [asked, setAsked] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [calc, setCalc] = useState<Record<string, string>>({});
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [scores, setScores] = useState<Rated>({ structure: 0, quant: 0, insight: 0, communication: 0 });
  const [saved, setSaved] = useState(false);
  const c: Mock | undefined = MOCK_CASES.find((x) => x.id === caseId);

  if (!c) {
    return (
      <div className="flex flex-col gap-6">
        <Panel title="Mock case" subtitle="An interviewer who gives you only the headline. Ask for the data you need, structure out loud, do the numbers, and finish with a recommendation. Pick a case.">
          <ul className="grid gap-3 md:grid-cols-3">
            {MOCK_CASES.map((x) => (
              <li key={x.id} className="panel flex flex-col gap-2 p-4">
                <p className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">{x.title}</p>
                <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{FRAMEWORKS.find((f) => f.id === x.framework)?.name}</p>
                <div>
                  <Button
                    onClick={() => {
                      setCaseId(x.id);
                      setAsked([]);
                      setStep(0);
                      setAnswers({});
                      setCalc({});
                      setShown({});
                      setScores({ structure: 0, quant: 0, insight: 0, communication: 0 });
                      setSaved(false);
                    }}
                    aria-label={`Start the case: ${x.title}`}
                  >
                    Start this case
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <CaseTimer />
      </div>
    );
  }

  const s = c.steps[step];
  const done = step >= c.steps.length;
  const save = () => {
    const log: CaseLog = {
      id: uid(),
      date: new Date().toISOString().slice(0, 10),
      kind: FRAMEWORKS.find((f) => f.id === c.framework)?.name ?? "Other",
      partner: "Mock case (self-scored)",
      notes: `${c.title}. Asked for ${asked.length} of ${c.data.length} pieces of data.`,
      scores: { structure: scores.structure, quant: scores.quant, insight: scores.insight, communication: scores.communication },
    };
    update((d) => ({ ...d, cases: [log, ...d.cases].slice(0, 200) }));
    setSaved(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title={c.title}
        actions={
          <Button variant="ghost" onClick={() => setCaseId(null)}>
            Choose another case
          </Button>
        }
      >
        <p className="rounded-lg bg-parchment-deep px-4 py-3 font-[family-name:var(--font-ui)] text-sm text-ink">
          <b>Interviewer:</b> {c.intro}
        </p>
      </Panel>
      <CaseTimer />
      <Panel title="Ask for data" subtitle="The interviewer will not volunteer numbers. Ask only for what your structure needs; asking for everything is a sign you have no structure.">
        <div className="flex flex-wrap gap-2">
          {c.data.map((d) => (
            <button
              key={d.id}
              type="button"
              disabled={asked.includes(d.id)}
              onClick={() => setAsked([...asked, d.id])}
              className="rounded-full border border-line px-3 py-1.5 font-[family-name:var(--font-ui)] text-xs text-ink transition-colors hover:bg-parchment-deep disabled:cursor-default disabled:bg-parchment-deep disabled:text-ink-soft"
            >
              Ask: {d.ask}
            </button>
          ))}
        </div>
        {asked.length > 0 && (
          <ul className="flex flex-col gap-2" aria-label="What the interviewer told you">
            {c.data
              .filter((d) => asked.includes(d.id))
              .map((d) => (
                <li key={d.id} className="rounded-lg border border-line px-4 py-2 font-[family-name:var(--font-ui)] text-sm text-ink">
                  <b>Interviewer:</b> {d.reply}
                </li>
              ))}
          </ul>
        )}
      </Panel>
      {!done ? (
        <Panel title={`Step ${step + 1} of ${c.steps.length}: ${{ clarify: "Clarify", structure: "Structure", quant: "Numbers", insight: "Insight", recommend: "Recommendation" }[s.kind]}`}>
          <p className="rounded-lg bg-parchment-deep px-4 py-3 font-[family-name:var(--font-ui)] text-sm text-ink">
            <b>Interviewer:</b> {s.prompt}
          </p>
          <Note label="Your answer, as you would say it" rows={4} value={answers[s.id] ?? ""} onChange={(v) => setAnswers({ ...answers, [s.id]: v })} />
          {s.calc && (
            <div className="flex flex-col gap-2">
              <label className="flex flex-wrap items-center gap-3 font-[family-name:var(--font-ui)] text-sm text-ink">
                <span className="min-w-[260px] flex-1">{s.calc.question}</span>
                <input aria-label="Your numeric answer" inputMode="decimal" value={calc[s.id] ?? ""} onChange={(e) => setCalc({ ...calc, [s.id]: e.target.value.replace(/[^0-9.-]/g, "") })} className={`${cellCls} !w-28`} />
              </label>
              {shown[s.id] && (
                <p role="status" className={`font-[family-name:var(--font-ui)] text-sm ${isClose(parseFloat(calc[s.id] ?? ""), s.calc.answer) ? "text-water-deep" : "text-clay-text"}`}>
                  {isClose(parseFloat(calc[s.id] ?? ""), s.calc.answer) ? "Correct. " : "Not quite. "}
                  Answer: {Math.round(s.calc.answer * 100) / 100}
                  {s.calc.unit}. {s.calc.working}
                </p>
              )}
            </div>
          )}
          {shown[s.id] && (
            <div className="rounded-lg border border-line px-4 py-3">
              <p className="font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-ink-soft">A strong answer includes</p>
              <ul className="mt-1 list-disc pl-5 font-[family-name:var(--font-ui)] text-sm text-ink">
                {s.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            {!shown[s.id] ? (
              <Button variant="secondary" onClick={() => setShown({ ...shown, [s.id]: true })}>
                Check my answer
              </Button>
            ) : (
              <Button onClick={() => setStep(step + 1)}>{step === c.steps.length - 1 ? "Finish the case" : "Next step"}</Button>
            )}
          </div>
        </Panel>
      ) : (
        <Panel title="Score yourself" subtitle="Be honest about each line, from 1 (needs work) to 4 (excellent). Then save it to your practice log.">
          <div className="grid gap-3 sm:grid-cols-4">
            {CASE_RUBRIC.map(([k, label, hint]) => (
              <label key={k} className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
                {label}
                <Select value={String(scores[k])} onChange={(e) => setScores({ ...scores, [k]: Number(e.target.value) })}>
                  <option value="0">Not scored</option>
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
                <span className="font-normal">{hint}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={saved}>
              {saved ? "Saved to the practice log" : "Save to the practice log"}
            </Button>
            <Button variant="ghost" onClick={() => setCaseId(null)}>
              Try another case
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
