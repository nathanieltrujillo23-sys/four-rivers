/**
 * Public data for the course's tools (Update 41), one function for every source because the hosting plan allows a
 * limited number of functions:
 *
 *   /api/data?source=rates                 inflation, Treasury rates and the 30-year mortgage rate (FRED)
 *   /api/data?source=salary&area=us|fl     typical pay for a set of jobs (BLS, Occupational Employment and Wages)
 *   /api/data?source=school&q=<name>       schools: earnings, debt, net price, completion (College Scorecard)
 *   /api/data?source=programs&id=<id>      one school's bachelor's majors: earnings and debt (College Scorecard)
 *   /api/data?source=charity&q=<name>      nonprofits by name (ProPublica Nonprofit Explorer, IRS filings)
 *   /api/data?source=charity&ein=<ein>     one nonprofit's recent filings
 *
 * Keys (all free, see docs/api-keys.md): FRED_API_KEY, BLS_API_KEY, SCORECARD_API_KEY. Without them, rates and pay
 * fall back to the figures below (with their dates), pay uses BLS's keyless tier, and schools use api.data.gov's
 * shared demo key. Answers are cached at the edge so the sources are asked rarely.
 */

type Env = Record<string, string | undefined>;
interface Reply {
  status: number;
  body: unknown;
  cache: string;
}

const DAY = 86_400;
/** A source that is rate-limiting us says "busy" (try later); anything else is "unavailable". */
const upstreamError = (err: unknown): Reply =>
  err instanceof Error && err.message === "busy" ? bad(503, "busy") : bad(502, "unavailable");
const ok = (body: unknown, seconds: number): Reply => ({ status: 200, body, cache: `public, s-maxage=${seconds}, stale-while-revalidate=${seconds}` });
const bad = (status: number, error: string): Reply => ({ status, body: { error }, cache: "no-store" });

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, headers: { Accept: "application/json", ...(init?.headers ?? {}) } });
    if (!res.ok) throw new Error(res.status === 429 ? "busy" : `upstream ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- rates (FRED) ---------------- */

export interface Rate {
  key: "inflation" | "t3m" | "t10y" | "mortgage30";
  value: number;
  asOf: string;
}

/** Figures as of 2026-11-16, from FRED, used until FRED_API_KEY is set or if FRED can't be reached. */
export const FALLBACK_RATES: Rate[] = [
  { key: "inflation", value: 3.7, asOf: "2026-09-01" }, // CPI-U, Sep 2026 vs Sep 2025 (336.298 / 324.245)
  { key: "t3m", value: 4.05, asOf: "2026-10-01" }, // 3-month Treasury bill, monthly average (TB3MS)
  { key: "t10y", value: 5.1, asOf: "2026-11-12" }, // 10-year Treasury (DGS10)
  { key: "mortgage30", value: 7.11, asOf: "2026-11-12" }, // 30-year fixed mortgage, Freddie Mac (MORTGAGE30US)
];

type Obs = { date: string; value: string };
async function fredSeries(id: string, key: string, limit: number): Promise<{ date: string; value: number }[]> {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${encodeURIComponent(key)}&file_type=json&sort_order=desc&limit=${limit}`;
  const data = (await getJson(url)) as { observations?: Obs[] };
  return (data.observations ?? []).filter((o) => o.value !== "." && o.value !== "").map((o) => ({ date: o.date, value: Number(o.value) }));
}

/** Year-over-year inflation from monthly CPI: the latest month that also has a value a year earlier. */
export function inflationFromCpi(cpi: { date: string; value: number }[]): { value: number; asOf: string } | null {
  const byDate = new Map(cpi.map((o) => [o.date, o.value]));
  const sorted = [...cpi].sort((a, b) => b.date.localeCompare(a.date));
  for (const o of sorted) {
    const prior = `${Number(o.date.slice(0, 4)) - 1}${o.date.slice(4)}`;
    const before = byDate.get(prior);
    if (before) return { value: Math.round((o.value / before - 1) * 1000) / 10, asOf: o.date };
  }
  return null;
}

async function rates(env: Env): Promise<Reply> {
  const key = env.FRED_API_KEY;
  if (!key) return ok({ rates: FALLBACK_RATES, live: false, source: "FRED, Federal Reserve Bank of St. Louis." }, DAY);
  try {
    const [cpi, t3m, t10, mort] = await Promise.all([
      fredSeries("CPIAUCSL", key, 26),
      fredSeries("TB3MS", key, 3),
      fredSeries("DGS10", key, 10),
      fredSeries("MORTGAGE30US", key, 3),
    ]);
    const infl = inflationFromCpi(cpi);
    const out: Rate[] = [];
    const fb = (k: Rate["key"]) => FALLBACK_RATES.find((r) => r.key === k)!;
    out.push(infl ? { key: "inflation", ...infl } : fb("inflation"));
    out.push(t3m[0] ? { key: "t3m", value: t3m[0].value, asOf: t3m[0].date } : fb("t3m"));
    out.push(t10[0] ? { key: "t10y", value: t10[0].value, asOf: t10[0].date } : fb("t10y"));
    out.push(mort[0] ? { key: "mortgage30", value: mort[0].value, asOf: mort[0].date } : fb("mortgage30"));
    return ok({ rates: out, live: true, source: "FRED, Federal Reserve Bank of St. Louis." }, DAY / 2);
  } catch {
    return ok({ rates: FALLBACK_RATES, live: false, source: "FRED, Federal Reserve Bank of St. Louis." }, 3600);
  }
}

/* ---------------- pay (BLS OEWS) ---------------- */

/** Standard Occupational Classification codes for the jobs shown, with their national and Florida medians (May 2025). */
export const JOBS: { soc: string; us: number; fl: number }[] = [
  { soc: "132051", us: 102740, fl: 94490 }, // Financial analysts
  { soc: "132052", us: 105070, fl: 100970 }, // Personal financial advisors
  { soc: "113031", us: 166570, fl: 153280 }, // Financial managers
  { soc: "132011", us: 83680, fl: 79250 }, // Accountants and auditors
  { soc: "132041", us: 83510, fl: 78360 }, // Credit analysts
  { soc: "132072", us: 76690, fl: 71090 }, // Loan officers
  { soc: "131111", us: 101860, fl: 88610 }, // Management analysts
  { soc: "111021", us: 105770, fl: 101580 }, // General and operations managers
  { soc: "151252", us: 135980, fl: 130980 }, // Software developers
  { soc: "291141", us: 97550, fl: 84190 }, // Registered nurses
  { soc: "252021", us: 63970, fl: 58930 }, // Elementary school teachers
  { soc: "412031", us: 35410, fl: 34010 }, // Retail salespersons
];
const PAY_YEAR = "2025";

async function salary(params: URLSearchParams, env: Env): Promise<Reply> {
  const area = params.get("area") === "fl" ? "fl" : "us";
  const prefix = area === "fl" ? "OEUS1200000000000" : "OEUN0000000000000";
  const ids = JOBS.map((j) => `${prefix}${j.soc}13`); // 13 = annual median wage
  const fallback = { area, year: PAY_YEAR, live: false, jobs: JOBS.map((j) => ({ soc: j.soc, median: j[area] })) };
  try {
    const key = env.BLS_API_KEY;
    const url = key ? "https://api.bls.gov/publicAPI/v2/timeseries/data/" : "https://api.bls.gov/publicAPI/v1/timeseries/data/";
    const data = (await getJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(key ? { seriesid: ids, registrationkey: key, latest: true } : { seriesid: ids }),
    })) as { status?: string; Results?: { series?: { seriesID: string; data: { year: string; value: string }[] }[] } };
    if (data.status !== "REQUEST_SUCCEEDED" || !data.Results?.series) throw new Error("bls");
    const byId = new Map(data.Results.series.map((s) => [s.seriesID, s.data[0]]));
    let year = PAY_YEAR;
    const jobs = JOBS.map((j, i) => {
      const d = byId.get(ids[i]);
      const v = d ? Number(d.value) : NaN;
      if (d?.year) year = d.year;
      return { soc: j.soc, median: Number.isFinite(v) ? v : j[area] };
    });
    return ok({ area, year, live: true, jobs }, 7 * DAY);
  } catch {
    return ok(fallback, DAY);
  }
}

/* ---------------- schools (College Scorecard) ---------------- */

const SCHOOL_FIELDS = [
  "id",
  "school.name",
  "school.city",
  "school.state",
  "latest.earnings.10_yrs_after_entry.median",
  "latest.aid.median_debt.completers.overall",
  "latest.cost.avg_net_price.overall",
  "latest.completion.rate_suppressed.overall",
].join(",");

/**
 * The Scorecard's name search is loose ("University of Florida" also finds Florida State), so rank: the exact name,
 * then names that start with the words typed, then names that contain them, then the rest, keeping the source's order
 * (largest schools first) within each group.
 */
export function rankByName<T extends { name: string }>(query: string, list: T[]): T[] {
  const q = query.toLowerCase().replace(/\s+/g, " ").trim();
  const score = (name: string) => {
    const n = name.toLowerCase();
    if (n === q) return 0;
    if (n.startsWith(q)) return 1;
    if (n.includes(q)) return 2;
    return 3;
  };
  return list.map((x, i) => ({ x, i, s: score(x.name) })).sort((a, b) => a.s - b.s || a.i - b.i).map((r) => r.x);
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

async function school(params: URLSearchParams, env: Env): Promise<Reply> {
  const q = (params.get("q") ?? "").trim();
  if (q.length < 3 || q.length > 80) return bad(400, "query");
  const key = env.SCORECARD_API_KEY || "DEMO_KEY";
  const url = `https://api.data.gov/ed/collegescorecard/v1/schools?api_key=${encodeURIComponent(key)}&school.name=${encodeURIComponent(q)}&school.operating=1&fields=${SCHOOL_FIELDS}&per_page=40&sort=latest.student.size:desc`;
  try {
    const data = (await getJson(url)) as { results?: Record<string, unknown>[] };
    const schools = rankByName(q, (data.results ?? []).map((r) => ({
      id: Number(r.id),
      name: String(r["school.name"] ?? ""),
      city: String(r["school.city"] ?? ""),
      state: String(r["school.state"] ?? ""),
      earnings10: num(r["latest.earnings.10_yrs_after_entry.median"]),
      debt: num(r["latest.aid.median_debt.completers.overall"]),
      netPrice: num(r["latest.cost.avg_net_price.overall"]),
      completion: num(r["latest.completion.rate_suppressed.overall"]),
    }))).slice(0, 8);
    return ok({ schools }, 7 * DAY);
  } catch (err) {
    return upstreamError(err);
  }
}

async function programs(params: URLSearchParams, env: Env): Promise<Reply> {
  const id = params.get("id") ?? "";
  if (!/^\d{4,8}$/.test(id)) return bad(400, "id");
  const key = env.SCORECARD_API_KEY || "DEMO_KEY";
  const p = "latest.programs.cip_4_digit";
  const fields = [
    `${p}.title`,
    `${p}.credential.level`,
    `${p}.earnings.1_yr.overall_median_earnings`,
    `${p}.earnings.4_yr.overall_median_earnings`,
    `${p}.debt.staff_grad_plus.all.eval_inst.median`,
    `${p}.debt.staff_grad_plus.all.eval_inst.median_payment`,
  ].join(",");
  try {
    const data = (await getJson(`https://api.data.gov/ed/collegescorecard/v1/schools?api_key=${encodeURIComponent(key)}&id=${id}&fields=${fields}`)) as {
      results?: Record<string, unknown>[];
    };
    type Prog = {
      title?: string;
      credential?: { level?: number };
      earnings?: { "1_yr"?: { overall_median_earnings?: number }; "4_yr"?: { overall_median_earnings?: number } };
      debt?: { staff_grad_plus?: { all?: { eval_inst?: { median?: number; median_payment?: number } } } };
    };
    const list = ((data.results?.[0]?.[p] as Prog[] | undefined) ?? [])
      .filter((x) => x.credential?.level === 3)
      .map((x) => ({
        title: String(x.title ?? "").replace(/\.$/, ""),
        earnings1: num(x.earnings?.["1_yr"]?.overall_median_earnings),
        earnings4: num(x.earnings?.["4_yr"]?.overall_median_earnings),
        debt: num(x.debt?.staff_grad_plus?.all?.eval_inst?.median),
        payment: num(x.debt?.staff_grad_plus?.all?.eval_inst?.median_payment),
      }))
      .filter((x) => x.title && (x.earnings1 !== null || x.earnings4 !== null || x.debt !== null))
      .sort((a, b) => a.title.localeCompare(b.title));
    return ok({ programs: list }, 7 * DAY);
  } catch (err) {
    return upstreamError(err);
  }
}

/* ---------------- charities (ProPublica Nonprofit Explorer) ---------------- */

async function charity(params: URLSearchParams): Promise<Reply> {
  const ein = (params.get("ein") ?? "").replace(/\D/g, "");
  const base = "https://projects.propublica.org/nonprofits/api/v2";
  try {
    if (ein) {
      if (ein.length > 9) return bad(400, "ein");
      const data = (await getJson(`${base}/organizations/${ein}.json`)) as {
        organization?: Record<string, unknown>;
        filings_with_data?: Record<string, unknown>[];
      };
      const o = data.organization ?? {};
      const filings = (data.filings_with_data ?? []).slice(0, 5).map((f) => ({
        year: Number(f.tax_prd_yr),
        revenue: num(f.totrevenue),
        contributions: num(f.totcntrbgfts),
        expenses: num(f.totfuncexpns),
        netAssets: num(f.totassetsend) !== null && num(f.totliabend) !== null ? (f.totassetsend as number) - (f.totliabend as number) : null,
        officerPay: num(f.compnsatncurrofcr),
        fundraisingFees: num(f.profndraising),
        pdf: typeof f.pdf_url === "string" && f.pdf_url.startsWith("https://") ? f.pdf_url : null,
      }));
      return ok(
        {
          org: { ein, name: String(o.name ?? ""), city: String(o.city ?? ""), state: String(o.state ?? ""), ntee: String(o.ntee_code ?? ""), url: `https://projects.propublica.org/nonprofits/organizations/${ein}` },
          filings,
        },
        DAY,
      );
    }
    const q = (params.get("q") ?? "").trim();
    if (q.length < 3 || q.length > 80) return bad(400, "query");
    const data = (await getJson(`${base}/search.json?q=${encodeURIComponent(q)}`)) as { organizations?: Record<string, unknown>[] };
    const orgs = (data.organizations ?? []).slice(0, 10).map((o) => ({
      ein: String(o.ein ?? ""),
      name: String(o.name ?? ""),
      city: String(o.city ?? ""),
      state: String(o.state ?? ""),
    }));
    return ok({ orgs }, DAY);
  } catch {
    return bad(502, "unavailable");
  }
}

/** Answers kept in memory while the server stays warm (and while developing), so sources aren't asked on every load. */
const memo = new Map<string, { until: number; reply: Reply }>();
/** For tests: forget every remembered answer. */
export function clearDataCache() {
  memo.clear();
}

export async function runData(params: URLSearchParams, env: Env): Promise<Reply> {
  const key = [...params.entries()].sort().map(([k, v]) => `${k}=${v}`).join("&");
  const hit = memo.get(key);
  if (hit && hit.until > Date.now()) return hit.reply;
  const reply = await answer(params, env);
  const seconds = Number(/s-maxage=(\d+)/.exec(reply.cache)?.[1] ?? 0);
  if (reply.status === 200 && seconds > 0) {
    if (memo.size > 200) memo.clear();
    memo.set(key, { until: Date.now() + Math.min(seconds, 6 * 3600) * 1000, reply });
  }
  return reply;
}

async function answer(params: URLSearchParams, env: Env): Promise<Reply> {
  switch (params.get("source")) {
    case "rates":
      return rates(env);
    case "salary":
      return salary(params, env);
    case "school":
      return school(params, env);
    case "programs":
      return programs(params, env);
    case "charity":
      return charity(params);
    default:
      return bad(400, "source");
  }
}

interface Req {
  url?: string;
}
interface Res {
  setHeader(name: string, value: string): void;
  status(code: number): { json(body: unknown): void };
}

export default async function handler(req: Req, res: Res) {
  const params = new URL(req.url ?? "", "http://localhost").searchParams;
  const out = await runData(params, process.env);
  res.setHeader("Cache-Control", out.cache);
  res.status(out.status).json(out.body);
}
