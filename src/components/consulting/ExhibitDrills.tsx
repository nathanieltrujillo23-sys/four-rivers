import { useEffect, useState } from "react";
import { EXHIBITS, checkAnswer, scoreExhibit, type Exhibit, type ExhibitRun } from "../../lib/consultingExhibits";
import { Button } from "../ui/Button";
import { cellCls, labelCls } from "../ib/ibParts";
import { Panel } from "../wealth/parts";

const COLORS = ["var(--color-water-deep)", "var(--color-gold-text)", "var(--color-river-1)"];
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const fmt = (v: number) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString("en-US") : String(Math.round(v * 10) / 10));

/** Grouped bars (which may go below zero) or lines, drawn from the exhibit's own numbers. */
function Chart({ e }: { e: Exhibit }) {
  const W = 640;
  const H = 280;
  const P = { l: 48, r: 12, t: 14, b: 54 };
  const all = e.series.flatMap((s) => s.values);
  const max = Math.max(0, ...all);
  const min = Math.min(0, ...all);
  const span = max - min || 1;
  const y = (v: number) => P.t + ((max - v) / span) * (H - P.t - P.b);
  const n = e.labels.length;
  const band = (W - P.l - P.r) / n;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => min + f * span);
  const summary = e.series.map((s) => `${s.name}: ${s.values.map((v, i) => `${e.labels[i]} ${fmt(v)}`).join(", ")}`).join(". ");
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${e.title}. ${summary}`} className="w-full">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth="1" />
            <text x={P.l - 6} y={y(t) + 3} fontSize="10" textAnchor="end" fill="var(--color-ink-soft)">
              {fmt(t)}
            </text>
          </g>
        ))}
        {min < 0 && <line x1={P.l} x2={W - P.r} y1={y(0)} y2={y(0)} stroke="var(--color-ink-soft)" strokeWidth="1" />}
        {e.labels.map((l, i) => (
          <text key={l} x={P.l + band * (i + 0.5)} y={H - 24} fontSize="10" textAnchor="middle" fill="var(--color-ink)">
            {l}
          </text>
        ))}
        {e.kind === "bars"
          ? e.series.map((s, k) =>
              s.values.map((v, i) => {
                const bw = (band * 0.7) / e.series.length;
                const x = P.l + band * i + band * 0.15 + bw * k;
                const top = Math.min(y(v), y(0));
                return (
                  <g key={`${k}-${i}`}>
                    <rect x={x} y={top} width={bw - 2} height={Math.max(1, Math.abs(y(v) - y(0)))} rx="2" fill={COLORS[k % COLORS.length]} opacity={v < 0 ? 0.6 : 0.9} />
                    <text x={x + (bw - 2) / 2} y={v >= 0 ? top - 4 : top + Math.abs(y(v) - y(0)) + 11} fontSize="9" textAnchor="middle" fill="var(--color-ink)">
                      {fmt(v)}
                    </text>
                  </g>
                );
              }),
            )
          : e.series.map((s, k) => (
              <g key={s.name}>
                <path d={s.values.map((v, i) => `${i ? "L" : "M"}${P.l + band * (i + 0.5)},${y(v)}`).join(" ")} fill="none" stroke={COLORS[k % COLORS.length]} strokeWidth="2.5" strokeDasharray={k === 2 ? "5 4" : undefined} />
                {s.values.map((v, i) => (
                  <text key={i} x={P.l + band * (i + 0.5)} y={y(v) - 6} fontSize="9" textAnchor="middle" fill="var(--color-ink)">
                    {fmt(v)}
                  </text>
                ))}
              </g>
            ))}
      </svg>
      {e.series.length > 1 && (
        <figcaption className="flex flex-wrap gap-x-4 gap-y-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          {e.series.map((s, k) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS[k % COLORS.length] }} />
              {s.name}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}

function Table({ e }: { e: Exhibit }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse font-[family-name:var(--font-ui)] text-sm">
        <caption className="sr-only">{e.title}</caption>
        <thead>
          <tr className="border-b border-line text-xs text-ink-soft">
            <th className="py-2 pr-3 text-left font-medium" />
            {e.labels.map((l) => (
              <th key={l} scope="col" className="py-2 pr-3 text-right font-medium">
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {e.series.map((s) => (
            <tr key={s.name} className="border-b border-line/60">
              <th scope="row" className="py-2 pr-3 text-left font-normal text-ink">
                {s.name}
              </th>
              {s.values.map((v, i) => (
                <td key={i} className="py-2 pr-3 text-right tabular-nums text-ink">
                  {fmt(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One exhibit at a time: two numbers and the takeaway, against a one-minute target. */
export function ExhibitDrillsTab({ runs, onRun }: { runs: ExhibitRun[]; onRun: (run: ExhibitRun) => void }) {
  const [index, setIndex] = useState(0);
  const e = EXHIBITS[index];
  const [numbers, setNumbers] = useState<Record<string, string>>({});
  const [choice, setChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (checked) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [checked, index]);

  const open = (i: number) => {
    setIndex(i);
    setNumbers({});
    setChoice(null);
    setChecked(false);
    setSeconds(0);
  };
  const score = scoreExhibit(e, numbers, choice);
  const check = () => {
    setChecked(true);
    onRun({ date: new Date().toISOString().slice(0, 10), exhibit: e.id, correct: score, seconds });
  };
  const best = (id: string) => runs.filter((r) => r.exhibit === id).reduce<ExhibitRun | null>((a, r) => (!a || r.correct > a.correct || (r.correct === a.correct && r.seconds < a.seconds) ? r : a), null);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <div className="flex min-w-0 flex-col gap-6">
        <Panel title={e.title} subtitle={e.context}>
          {e.kind === "table" ? <Table e={e} /> : <Chart e={e} />}
          <p className={`font-[family-name:var(--font-ui)] text-sm tabular-nums ${seconds > 60 && !checked ? "text-clay-text" : "text-ink-soft"}`} aria-label={`Elapsed ${clock(seconds)}`}>
            {clock(seconds)} <span className="text-xs">· an interviewer gives you about a minute</span>
          </p>
        </Panel>
        <Panel title="Two numbers, then the so-what">
          <div className="grid gap-3 sm:grid-cols-2">
            {e.questions.map((q) => {
              const right = checkAnswer(q, parseFloat(numbers[q.id] ?? ""));
              return (
                <label key={q.id} className={labelCls}>
                  <span>
                    {q.prompt} <span className="font-normal">({q.unit})</span>
                  </span>
                  <input inputMode="decimal" disabled={checked} value={numbers[q.id] ?? ""} onChange={(ev) => setNumbers({ ...numbers, [q.id]: ev.target.value.replace(/[^0-9.-]/g, "") })} className={cellCls} />
                  {checked && (
                    <span className={`font-normal ${right ? "text-river-1" : "text-red-700"}`}>
                      {right ? "Correct" : "Not quite"}. <span className="text-ink-soft">{q.how}</span>
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">Which sentence is the takeaway you would say first?</legend>
            {e.takeaways.map((t, i) => (
              <label key={t} className={`flex items-start gap-2 rounded-lg border px-3 py-2 font-[family-name:var(--font-ui)] text-sm text-ink ${checked && i === e.best ? "border-river-1" : checked && i === choice ? "border-red-700" : "border-line"}`}>
                <input type="radio" name={`takeaway-${e.id}`} checked={choice === i} disabled={checked} onChange={() => setChoice(i)} className="mt-1" />
                <span>
                  {t}
                  {checked && i === e.best && <span className="ml-2 text-xs font-semibold text-river-1">The so-what</span>}
                </span>
              </label>
            ))}
          </fieldset>
          {checked ? (
            <>
              <p role="status" className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
                {score} of 3 in {clock(seconds)}.
              </p>
              <p className="rounded-lg bg-parchment-deep p-3 font-[family-name:var(--font-ui)] text-sm text-ink">{e.why}</p>
              <div>
                <Button onClick={() => open((index + 1) % EXHIBITS.length)}>Next exhibit</Button>
              </div>
            </>
          ) : (
            <div>
              <Button onClick={check} disabled={choice === null}>
                Check my reading
              </Button>
            </div>
          )}
        </Panel>
      </div>
      <Panel title="The exhibits" subtitle="A description says what the chart shows. A takeaway says what it means for the decision." headingLevel={4}>
        <ul className="flex flex-col gap-1">
          {EXHIBITS.map((x, i) => {
            const b = best(x.id);
            return (
              <li key={x.id}>
                <button
                  type="button"
                  aria-current={i === index ? "true" : undefined}
                  onClick={() => open(i)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left font-[family-name:var(--font-ui)] text-sm transition-colors ${i === index ? "bg-parchment-deep text-ink" : "text-ink-soft hover:bg-parchment-deep/60 hover:text-ink"}`}
                >
                  <span>Exhibit {i + 1}</span>
                  <span className="text-xs tabular-nums">{b ? `${b.correct} of 3 · ${clock(b.seconds)}` : "not tried"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
