import { TickText } from "./TickText";
import { haptic } from "../../lib/motion";
import { useEffect } from "react";

/** A quiz score that counts up from zero, with a bar that fills to it and a mark where passing begins. */
export function ScoreMeter({ score, total, pass, passed }: { score: number; total: number; pass: number; passed: boolean }) {
  useEffect(() => {
    if (passed) haptic([18, 40, 18]);
  }, [passed]);
  const pct = total > 0 ? Math.min(100, (score / total) * 100) : 0;
  const mark = total > 0 ? (pass / total) * 100 : 0;
  return (
    <div className="mt-3 flex items-center gap-3 font-[family-name:var(--font-ui)]" aria-hidden="true">
      <span className="relative text-2xl font-semibold tabular-nums text-ink">
        {passed &&
          Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <span
                key={i}
                className="sparkle absolute left-3 top-1/2 h-1.5 w-1.5 rounded-full bg-gold"
                style={{ ["--dx" as string]: `${Math.round(Math.cos(a) * 34)}px`, ["--dy" as string]: `${Math.round(Math.sin(a) * 22)}px`, animationDelay: `${0.9 + (i % 4) * 0.06}s` }}
              />
            );
          })}
        <TickText value={`${score}`} />
        <span className="text-base font-normal text-ink-soft"> / {total}</span>
      </span>
      <div className="relative h-2.5 w-full max-w-xs rounded-full bg-parchment-deep">
        <div
          className={`grow-x h-full rounded-full ${passed ? "bg-olive" : "bg-clay"}`}
          style={{ width: `${pct}%`, animationDelay: "0.2s", animationDuration: "1.1s" }}
        />
        <span className="absolute -top-1 h-4.5 w-0.5 bg-ink/60" style={{ left: `${mark}%`, height: "1.1rem" }} />
      </div>
    </div>
  );
}
