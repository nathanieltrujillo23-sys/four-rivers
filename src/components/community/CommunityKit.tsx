import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { FeatureIcon, type FeatureIconName } from "../ui/FeatureIcons";

/**
 * The building blocks every Community screen shares, so they look like one product: the banner at the top of a space,
 * a section heading, the large option cards, and a number that counts up into place.
 */

const reduced = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce");

/** A whole number that counts up to its value the first time it appears. */
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const still = reduced();
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (still) return;
    const start = performance.now();
    const begin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(begin + (value - begin) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, still]);
  return <span className="tabular-nums">{still ? value : shown}</span>;
}

/** The Daily Bread wordmark: dark ink on light pages, white on dark ones (or always white with `tone="white"`). */
export function DailyBreadLogo({ className = "", tone = "auto" }: { className?: string; tone?: "auto" | "white" }) {
  if (tone === "white") return <img src="/brand/daily-bread-wordmark-white.png" alt="Daily Bread" className={className} draggable={false} />;
  return (
    <span className={`inline-block ${className}`}>
      <img src="/brand/daily-bread-wordmark-ink.png" alt="Daily Bread" className="db-logo-ink h-full w-auto" draggable={false} />
      <img src="/brand/daily-bread-wordmark-white.png" alt="" aria-hidden="true" className="db-logo-white h-full w-auto" draggable={false} />
    </span>
  );
}

/**
 * The dark banner at the top of a space: where you are, what it is for, and a few live numbers. With `photo` the
 * picture fills the banner and carries the title itself (the heading stays for screen readers); with `logo` the Daily
 * Bread wordmark sits above the title.
 */
export function SpaceBanner({
  back,
  eyebrow,
  title,
  sub,
  stats = [],
  actions,
  photo,
  logo = false,
}: {
  back?: { to: string; label: string };
  eyebrow: string;
  title: string;
  sub: string;
  stats?: { label: string; value: number }[];
  actions?: ReactNode;
  /** The banner picture: a JPEG fallback plus an optional WebP srcset (sharp on wide and Retina screens). */
  photo?: { src: string; webp?: string };
  logo?: boolean;
}) {
  const statList =
    stats.length > 0 ? (
      <dl className="flex gap-8">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="font-[family-name:var(--font-ui)] text-[11px] font-semibold uppercase tracking-[0.14em] text-white">{s.label}</dt>
            <dd className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold text-white">
              <CountUp value={s.value} />
            </dd>
          </div>
        ))}
      </dl>
    ) : null;
  const backLink = back && (
    <Link to={back.to} className="group inline-flex items-center gap-1.5 font-[family-name:var(--font-ui)] text-sm text-white hover:text-white">
      <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:-translate-x-0.5">
        ←
      </span>
      {back.label.replace(/^←\s*/, "")}
    </Link>
  );
  if (photo) {
    return (
      <header className="cm-sheen relative overflow-hidden rounded-[0.875rem] bg-[#141c25] text-white shadow-sm">
        {/* The whole photo always shows (it carries its own wordmark and tagline at the lower left), so our text sits at
            the top, and the numbers at the lower right on wide screens or in a strip underneath on phones. */}
        <div className="relative aspect-[800/448] w-full sm:max-h-[30rem]">
          <picture>
            {photo.webp && <source type="image/webp" srcSet={photo.webp} sizes="(min-width: 72rem) 72rem, 100vw" />}
            <img
              src={photo.src}
              alt=""
              aria-hidden="true"
              className="cm-photo absolute inset-0 h-full w-full object-cover object-center"
              draggable={false}
              decoding="async"
              fetchPriority="high"
            />
          </picture>
          <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgb(10_18_28/0.6)_0%,rgb(10_18_28/0)_30%,rgb(10_18_28/0)_60%,rgb(10_18_28/0.7)_100%)]" />
          <div className="absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-9 sm:py-8">
            {backLink ?? <span />}
            <div className="flex flex-col items-end gap-2.5">
              <p className="font-[family-name:var(--font-ui)] text-[10px] font-semibold uppercase tracking-[0.18em] text-white sm:text-[11px]">{eyebrow}</p>
              {actions && <div className="hidden flex-wrap justify-end gap-2 sm:flex">{actions}</div>}
            </div>
          </div>
          {statList && <div className="absolute bottom-8 right-9 hidden sm:block">{statList}</div>}
        </div>
        <h1 className="sr-only">{title}</h1>
        <p className="sr-only">{sub}</p>
        {(statList || actions) && (
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:hidden">
            {statList}
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
        )}
      </header>
    );
  }
  return (
    <header className="cm-sheen relative overflow-hidden rounded-[0.875rem] bg-water-deep px-6 py-8 text-white shadow-sm sm:px-9 sm:py-10">
      <svg aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-[22rem] w-[22rem] text-white opacity-[0.16]" viewBox="0 0 200 200" fill="none">
        <g className="cm-ring-a">
          <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 5" />
          <circle cx="100" cy="100" r="64" stroke="currentColor" strokeWidth="0.6" />
        </g>
        <g className="cm-ring-b">
          <circle cx="100" cy="100" r="78" stroke="currentColor" strokeWidth="0.6" strokeDasharray="10 6" />
          <circle cx="100" cy="100" r="44" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1 4" />
        </g>
      </svg>
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 max-w-2xl">
          {backLink}
          {logo && <DailyBreadLogo tone="white" className="mt-6 block h-16 w-auto" />}
          <p className={`${logo ? "mt-4" : "mt-5"} font-[family-name:var(--font-ui)] text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90`}>{eyebrow}</p>
          <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-white sm:text-[2.6rem]">{title}</h1>
          <span aria-hidden="true" className="grow-x mt-4 block h-px w-16 bg-white/60" />
          <p className="mt-4 font-[family-name:var(--font-ui)] text-sm leading-relaxed text-white">{sub}</p>
          {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
        </div>
        {statList}
      </div>
    </header>
  );
}

/** A section's heading: a small label, a serif title, and one line about it. */
export function SectionHead({ id, label, title, sub, action }: { id?: string; label?: string; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {label && <p className="cm-label">{label}</p>}
        <h2 id={id} className="mt-1 font-[family-name:var(--font-display)] text-[1.35rem] font-semibold leading-tight text-ink">
          {title}
        </h2>
        {sub && <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export interface OptionLink {
  to: string;
  label: string;
  /** A short note on the right (a count, or why it is locked). */
  note?: string;
  /** Read by screen readers instead of the label, when the label alone is not enough. */
  ariaLabel?: string;
}

/**
 * One of the large choices at the top of a space. With `to` the whole card is one link; with `links` it lists where
 * to go (only the places this person can open), and `empty` explains what to do when there are none.
 */
export function OptionCard({
  index,
  icon,
  title,
  text,
  to,
  cta,
  links,
  empty,
}: {
  index: number;
  icon: FeatureIconName;
  title: string;
  text: string;
  to?: string;
  cta?: string;
  links?: OptionLink[];
  empty?: ReactNode;
}) {
  const head = (
    <>
      <div className="flex items-start justify-between">
        <span className="cm-icon h-11 w-11">
          <FeatureIcon name={icon} size={22} />
        </span>
        <span className="font-[family-name:var(--font-ui)] text-xs font-medium tabular-nums tracking-[0.12em] text-ink-soft">{String(index).padStart(2, "0")}</span>
      </div>
      <h3 className="mt-6 font-[family-name:var(--font-display)] text-xl font-semibold leading-snug text-ink">{title}</h3>
      <p className="mt-2 font-[family-name:var(--font-ui)] text-sm leading-relaxed text-ink-soft">{text}</p>
    </>
  );
  if (to) {
    return (
      <Link to={to} className="cm-card cm-lift cm-rule group flex h-full flex-col p-6 focus-visible:outline-offset-4">
        {head}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-6 font-[family-name:var(--font-ui)] text-sm font-medium text-water-deep">
          {cta}
          <FeatureIcon name="arrow" size={16} className="cm-arrow" />
        </span>
      </Link>
    );
  }
  return (
    <div className="cm-card cm-lift cm-rule group flex h-full flex-col p-6">
      {head}
      <div className="mt-auto pt-5">
        {links && links.length > 0 ? (
          <ul className="divide-y divide-line border-t border-line">
            {links.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  aria-label={l.ariaLabel}
                  className="flex items-center justify-between gap-3 py-2.5 font-[family-name:var(--font-ui)] text-sm text-ink transition-colors hover:text-water-deep"
                >
                  <span className="min-w-0 truncate font-medium">{l.label}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-ink-soft">
                    {l.note}
                    <FeatureIcon name="arrow" size={14} className="cm-arrow text-water-deep" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-t border-line pt-3 font-[family-name:var(--font-ui)] text-xs leading-relaxed text-ink-soft">{empty}</div>
        )}
      </div>
    </div>
  );
}
