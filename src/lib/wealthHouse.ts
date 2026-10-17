/**
 * The analyst's "house view": the assumptions they use by default (inflation, returns by risk profile, fees, state tax, filing
 * status) and a short market snapshot written in their own words with dated, sourced indicators. It is kept once per person and
 * applied to a client's plan on request, after which the plan holds its own copy that can be changed for that client. Nothing here
 * is supplied by the app: the numbers are the analyst's, with their sources and dates.
 */
import { RISK_PROFILES, type WealthPlan } from "./wealthMath";
import { asFilingStatus, type FilingStatus } from "./taxMath";

export interface Indicator {
  id: string;
  name: string;
  value: string;
  asOf: string;
  source: string;
}

/** A short, dated view of the markets for one client's deck. */
export interface MarketSnapshot {
  headline: string;
  bullets: string[];
  /** What would change this view. */
  changeMind: string;
  asOf: string;
  source: string;
  indicators: Indicator[];
}

export interface HouseView {
  inflation: string;
  fee: string;
  state: string;
  filing: FilingStatus;
  /** Return and volatility by risk profile name, percent a year. */
  returns: Record<string, { ret: string; vol: string }>;
  market: MarketSnapshot;
}

const INDICATORS = ["S&P 500 level", "10-year Treasury yield", "Federal funds rate", "Inflation (CPI, year over year)", "Unemployment rate", "Market volatility (VIX)"];

export const emptyMarket = (): MarketSnapshot => ({
  headline: "",
  bullets: [],
  changeMind: "",
  asOf: "",
  source: "",
  indicators: INDICATORS.map((name, i) => ({ id: `i${i}`, name, value: "", asOf: "", source: "" })),
});

export const emptyHouse = (): HouseView => ({
  inflation: "2.5",
  fee: "1",
  state: "0",
  filing: "single",
  returns: Object.fromEntries(RISK_PROFILES.map((p) => [p.name, { ret: String(p.ret), vol: String(p.vol) }])),
  market: emptyMarket(),
});

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);

export function normalizeMarket(raw: unknown): MarketSnapshot {
  const base = emptyMarket();
  if (!isObj(raw)) return base;
  const inds = Array.isArray(raw.indicators) ? raw.indicators.filter(isObj) : [];
  return {
    headline: str(raw.headline),
    bullets: Array.isArray(raw.bullets) ? raw.bullets.filter((b): b is string => typeof b === "string").slice(0, 4) : [],
    changeMind: str(raw.changeMind),
    asOf: str(raw.asOf),
    source: str(raw.source),
    indicators: inds.length
      ? inds.slice(0, 10).map((x, i) => ({ id: str(x.id, `i${i}`), name: str(x.name), value: str(x.value), asOf: str(x.asOf), source: str(x.source) }))
      : base.indicators,
  };
}

export function normalizeHouse(raw: unknown): HouseView {
  const base = emptyHouse();
  if (!isObj(raw)) return base;
  const returns = { ...base.returns };
  if (isObj(raw.returns)) for (const p of RISK_PROFILES) {
    const r = raw.returns[p.name];
    if (isObj(r)) returns[p.name] = { ret: str(r.ret, base.returns[p.name].ret), vol: str(r.vol, base.returns[p.name].vol) };
  }
  return { inflation: str(raw.inflation, base.inflation), fee: str(raw.fee, base.fee), state: str(raw.state, base.state), filing: asFilingStatus(raw.filing), returns, market: normalizeMarket(raw.market) };
}

/** Whether the snapshot has anything worth putting on a slide. */
export const marketFilled = (m: MarketSnapshot) => !!(m.headline.trim() || m.bullets.some((b) => b.trim()) || m.indicators.some((i) => i.value.trim()));

/**
 * Puts the house view into a client's plan: the return and volatility for the client's risk profile, inflation, the portfolio fee,
 * the state tax rate and filing status in the planning tools, and (when asked) the market snapshot. Anything the plan already
 * holds is replaced, so the analyst chooses when to do it.
 */
export function applyHouse(plan: WealthPlan, house: HouseView, o: { assumptions: boolean; market: boolean }): WealthPlan {
  let next = plan;
  if (o.assumptions) {
    const r = house.returns[plan.client.risk];
    next = {
      ...next,
      model: { ...next.model, inflation: house.inflation, ...(r ? { ret: r.ret, vol: r.vol } : {}) },
      portfolio: { ...next.portfolio, fee: house.fee },
      planning: {
        ...next.planning,
        roth: { ...next.planning.roth, state: house.state, status: house.filing },
        gains: { ...next.planning.gains, state: house.state, status: house.filing },
        giving: { ...next.planning.giving, state: house.state, status: house.filing },
      },
    };
  }
  if (o.market) next = { ...next, market: structuredClone(house.market) };
  return next;
}
