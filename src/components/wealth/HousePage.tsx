import { Link } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useWealthPrep } from "../../state/useWealthPrep";
import type { HouseView, Indicator } from "../../lib/wealthHouse";
import { FILING_OPTIONS } from "../../lib/taxMath";
import { RISK_PROFILES, uid } from "../../lib/wealthMath";
import { Button } from "../ui/Button";
import { Select, TextInput } from "../ui/Field";
import { LoadError } from "../ui/LoadError";
import { PageSkeleton } from "../ui/Skeleton";
import { MoneyField, Panel } from "./parts";
import { SAVE_TEXT } from "./wealthText";

const cell =
  "w-full min-w-0 rounded-lg border border-line bg-surface px-2 py-1.5 font-[family-name:var(--font-ui)] text-sm tabular-nums text-ink focus:border-water focus:outline-none";
const labelCls = "flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft";

const SOURCES: [string, string][] = [
  ["FRED, Federal Reserve Bank of St. Louis", "https://fred.stlouisfed.org"],
  ["U.S. Treasury daily yield curve rates", "https://home.treasury.gov/policy-issues/financing-the-government/interest-rate-statistics"],
  ["Bureau of Labor Statistics: CPI and employment", "https://www.bls.gov"],
  ["Federal Reserve: monetary policy and the federal funds rate", "https://www.federalreserve.gov/monetarypolicy.htm"],
];

/** The analyst's house view: default assumptions and a market snapshot, applied to a client's plan when asked. */
export function HousePage() {
  const { snapshot } = useCourse();
  const profile = snapshot?.profile;
  const allowed = profile?.wealthStatus === "approved" || profile?.role === "admin";
  if (!snapshot || !profile) return <PageSkeleton cards={2} />;
  if (!allowed) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-10 text-center">
        <h1 className="t-h1">House view</h1>
        <Link to="/community">
          <Button variant="secondary">Back to Community</Button>
        </Link>
      </div>
    );
  }
  return <House userId={profile.userId} />;
}

function House({ userId }: { userId: string }) {
  const { repository } = useCourse();
  const prep = useWealthPrep(repository, userId);
  if (prep.error && !prep.data) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <LoadError message={prep.error} onRetry={() => window.location.reload()} />
      </div>
    );
  }
  if (!prep.data) return <PageSkeleton cards={3} />;
  const h = prep.data.house;
  const setH = (next: HouseView) => prep.update((d) => ({ ...d, house: next }));
  const setM = (patch: Partial<HouseView["market"]>) => setH({ ...h, market: { ...h.market, ...patch } });
  const num0 = (v: string) => v.replace(/[^0-9.]/g, "");
  const setInd = (id: string, patch: Partial<Indicator>) => setM({ indicators: h.market.indicators.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const bullets = [...h.market.bullets, "", "", "", ""].slice(0, 4);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 py-2">
      <header className="flex flex-col gap-3">
        <Link to="/community/wealth" className="w-fit font-[family-name:var(--font-ui)] text-sm text-water-deep hover:underline">
          ← Wealth Tools
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="t-eyebrow">Daily Bread wealth management track</p>
            <h1 className="t-h1 mt-1">House view</h1>
            <p className="mt-2 max-w-2xl font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              The assumptions you use by default and a short, dated view of the markets, in your own words. Apply them to a client's plan from the Client step or the Presentation step; the plan then keeps its own copy you can change for that client. Only you can see this page.
            </p>
          </div>
          <p role="status" aria-live="polite" className={`rounded-full border px-3 py-1 font-[family-name:var(--font-ui)] text-xs ${prep.save === "error" ? "border-clay text-ink" : "border-line text-ink-soft"}`}>
            {SAVE_TEXT[prep.save]}
          </p>
        </div>
      </header>

      <Panel title="Default assumptions" subtitle="Used when you apply the house view to a plan. Every one can still be changed for a single client.">
        <div className="grid gap-4 sm:grid-cols-4">
          <MoneyField label="Inflation" suffix="%" value={h.inflation} onChange={(v) => setH({ ...h, inflation: num0(v) })} />
          <MoneyField label="Yearly fee on the portfolio" suffix="%" value={h.fee} onChange={(v) => setH({ ...h, fee: num0(v) })} />
          <MoneyField label="State income tax" suffix="%" value={h.state} onChange={(v) => setH({ ...h, state: num0(v) })} />
          <label className={labelCls}>
            Filing status
            <Select value={h.filing} onChange={(e) => setH({ ...h, filing: e.target.value as HouseView["filing"] })}>
              {FILING_OPTIONS.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse font-[family-name:var(--font-ui)] text-sm">
            <caption className="mb-2 text-left text-xs text-ink-soft">Return and volatility assumed for each risk profile, percent a year. Replace the placeholders with a published source (see the Portfolio step for guidance).</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-soft">
                <th className="py-2 pr-3 font-medium">Risk profile</th>
                <th className="py-2 pr-3 font-medium">Expected return</th>
                <th className="py-2 font-medium">Volatility</th>
              </tr>
            </thead>
            <tbody>
              {RISK_PROFILES.map((p) => (
                <tr key={p.name} className="border-b border-line/60">
                  <td className="py-1.5 pr-3">{p.name}</td>
                  <td className="py-1.5 pr-3">
                    <input aria-label={`${p.name} expected return`} inputMode="decimal" value={h.returns[p.name]?.ret ?? ""} onChange={(e) => setH({ ...h, returns: { ...h.returns, [p.name]: { ...h.returns[p.name], ret: num0(e.target.value) } } })} className={cell} />
                  </td>
                  <td className="py-1.5">
                    <input aria-label={`${p.name} volatility`} inputMode="decimal" value={h.returns[p.name]?.vol ?? ""} onChange={(e) => setH({ ...h, returns: { ...h.returns, [p.name]: { ...h.returns[p.name], vol: num0(e.target.value) } } })} className={cell} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Market view" subtitle="Your own words, with the date and where the figures came from. Nobody can predict markets: write what you see and why it matters, not what will happen.">
        <label className={labelCls}>
          Headline
          <TextInput value={h.market.headline} maxLength={140} onChange={(e) => setM({ headline: e.target.value })} placeholder="e.g. Interest rates are the story: the market expects cuts the data does not yet support" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {bullets.map((b, i) => (
            <label key={i} className={labelCls}>
              What I am watching {i + 1}
              <TextInput
                value={b}
                maxLength={170}
                onChange={(e) => {
                  const next = [...bullets];
                  next[i] = e.target.value;
                  let end = next.length;
                  while (end > 0 && !next[end - 1].trim()) end--;
                  setM({ bullets: next.slice(0, end) });
                }}
              />
            </label>
          ))}
        </div>
        <label className={labelCls}>
          What would change this view
          <TextInput value={h.market.changeMind} maxLength={300} onChange={(e) => setM({ changeMind: e.target.value })} placeholder="e.g. Two months of inflation above 3.5%, or unemployment rising above 5%" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelCls}>
            View as of
            <TextInput type="date" value={h.market.asOf} onChange={(e) => setM({ asOf: e.target.value })} />
          </label>
          <label className={labelCls}>
            Where the view comes from
            <TextInput value={h.market.source} onChange={(e) => setM({ source: e.target.value })} placeholder="e.g. FOMC statement, BLS CPI release" />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse font-[family-name:var(--font-ui)] text-sm">
            <caption className="sr-only">Market indicators</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-soft">
                <th className="py-2 pr-2 font-medium">Indicator</th>
                <th className="py-2 pr-2 font-medium">Latest</th>
                <th className="py-2 pr-2 font-medium">As of</th>
                <th className="py-2 pr-2 font-medium">Source</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {h.market.indicators.map((i, n) => (
                <tr key={i.id} className="border-b border-line/60">
                  <td className="py-1.5 pr-2">
                    <TextInput aria-label={`Indicator ${n + 1} name`} value={i.name} onChange={(e) => setInd(i.id, { name: e.target.value })} className="!py-1.5 !text-sm" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input aria-label={`${i.name || `Indicator ${n + 1}`} latest value`} value={i.value} onChange={(e) => setInd(i.id, { value: e.target.value })} className={cell} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <TextInput aria-label={`${i.name || `Indicator ${n + 1}`} as of`} type="date" value={i.asOf} onChange={(e) => setInd(i.id, { asOf: e.target.value })} className="!py-1.5 !text-sm" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <TextInput aria-label={`${i.name || `Indicator ${n + 1}`} source`} value={i.source} onChange={(e) => setInd(i.id, { source: e.target.value })} className="!py-1.5 !text-sm" />
                  </td>
                  <td className="py-1.5 text-right">
                    <Button variant="ghost" onClick={() => setM({ indicators: h.market.indicators.filter((x) => x.id !== i.id) })} aria-label={`Remove ${i.name || `indicator ${n + 1}`}`}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {h.market.indicators.length < 10 && (
          <div>
            <Button variant="secondary" onClick={() => setM({ indicators: [...h.market.indicators, { id: uid(), name: "", value: "", asOf: "", source: "" }] })}>
              Add an indicator
            </Button>
          </div>
        )}
      </Panel>

      <Panel title="Where to look the figures up" subtitle="Primary sources, so a number on a slide can be checked.">
        <ul className="flex flex-col gap-1.5 font-[family-name:var(--font-ui)] text-sm">
          {SOURCES.map(([name, href]) => (
            <li key={href}>
              <a href={href} target="_blank" rel="noreferrer" className="text-water-deep underline underline-offset-2">
                {name}
              </a>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
