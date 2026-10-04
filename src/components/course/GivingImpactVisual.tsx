import { useId } from "react";
import { formatCurrency } from "../../utils/format";
import { useLang } from "../../i18n/LanguageContext";

const MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];

/** The next round-number milestone at or above `total` — doubles past the ladder's top. */
function milestoneFor(total: number): number {
  for (const m of MILESTONES) if (total <= m) return m;
  let m = MILESTONES[MILESTONES.length - 1];
  while (total > m) m *= 2;
  return m;
}

/**
 * A jar that fills as total giving climbs toward the next round-number
 * milestone, and "overflows" with a few rising droplets right when it's
 * reached. Purely decorative/motivational — reads real logged totals from
 * GivingTracker, but this component itself holds no state of its own.
 */
export function GivingImpactVisual({ totalGiven, accent }: { totalGiven: number; accent: string }) {
  const { t } = useLang();
  const clipId = useId();
  const milestone = milestoneFor(totalGiven);
  const fraction = milestone > 0 ? Math.min(1, totalGiven / milestone) : 0;
  const overflowing = totalGiven > 0 && fraction >= 1;
  const fillHeight = fraction * 110;

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-parchment-deep/30 p-4">
      <svg
        viewBox="0 0 120 150"
        className="w-24"
        role="img"
        aria-label={t("giving.jarAria", { pct: Math.round(fraction * 100), amount: formatCurrency(milestone) })}
      >
        <defs>
          <clipPath id={clipId}>
            <path d="M20,30 L20,130 Q20,140 30,140 L90,140 Q100,140 100,130 L100,30 Z" />
          </clipPath>
        </defs>
        <rect x="45" y="10" width="30" height="20" rx="4" fill="none" stroke="#5c5347" strokeWidth="2" />
        <path
          d="M20,30 L20,130 Q20,140 30,140 L90,140 Q100,140 100,130 L100,30 Z"
          fill="#faf5ec"
          stroke="#5c5347"
          strokeWidth="2"
        />
        <g clipPath={`url(#${clipId})`}>
          <rect
            x="20"
            y={140 - fillHeight}
            width="80"
            height={fillHeight}
            fill={accent}
            opacity={0.75}
            style={{ transition: "y 700ms ease-out, height 700ms ease-out" }}
          />
        </g>
        {overflowing && (
          <>
            <circle className="droplet-piece" cx="35" cy="26" r="3" fill={accent} />
            <circle className="droplet-piece" cx="60" cy="22" r="3" fill={accent} style={{ animationDelay: "0.3s" }} />
            <circle className="droplet-piece" cx="83" cy="26" r="3" fill={accent} style={{ animationDelay: "0.6s" }} />
          </>
        )}
      </svg>
      <p className="text-center font-[family-name:var(--font-ui)] text-sm text-ink-soft">
        {overflowing ? (
          <span className="font-semibold" style={{ color: accent }}>
            {t("giving.overflow", { amount: formatCurrency(totalGiven) })}
          </span>
        ) : totalGiven > 0 ? (
          <>
            <span className="font-semibold text-ink">{formatCurrency(totalGiven)}</span> {t("giving.soFar")}{" "}
            <span className="font-semibold" style={{ color: accent }}>
              {formatCurrency(milestone)}
            </span>
          </>
        ) : (
          t("giving.start")
        )}
      </p>
    </div>
  );
}
