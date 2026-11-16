import { afterEach, describe, expect, it, vi } from "vitest";
import { FALLBACK_RATES, JOBS, clearDataCache, inflationFromCpi, rankByName, runData } from "../api/data.ts";

const q = (s: string) => new URLSearchParams(s);
afterEach(() => {
  vi.unstubAllGlobals();
  clearDataCache();
});

function stubFetch(handler: (url: string, init?: RequestInit) => unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = handler(url, init);
      return { ok: body !== undefined, status: body === undefined ? 500 : 200, json: async () => body } as Response;
    }),
  );
}

describe("/api/data", () => {
  it("works out inflation from the latest month that has a year-earlier value", () => {
    const cpi = [
      { date: "2026-10-01", value: 337.476 },
      { date: "2026-09-01", value: 336.298 },
      { date: "2025-09-01", value: 324.245 },
    ];
    expect(inflationFromCpi(cpi)).toEqual({ value: 3.7, asOf: "2026-09-01" });
    expect(inflationFromCpi([{ date: "2026-10-01", value: 1 }])).toBeNull();
  });

  it("returns the dated fallback rates without a FRED key, and cached", async () => {
    const out = await runData(q("source=rates"), {});
    expect(out.status).toBe(200);
    expect((out.body as { rates: unknown[]; live: boolean }).rates).toEqual(FALLBACK_RATES);
    expect((out.body as { live: boolean }).live).toBe(false);
    expect(out.cache).toMatch(/s-maxage/);
  });

  it("reads FRED with a key", async () => {
    stubFetch((url) => {
      const id = /series_id=(\w+)/.exec(url)![1];
      const obs: Record<string, { date: string; value: string }[]> = {
        CPIAUCSL: [
          { date: "2026-10-01", value: "340" },
          { date: "2025-10-01", value: "330" },
        ],
        TB3MS: [{ date: "2026-10-01", value: "4.1" }],
        DGS10: [{ date: "2026-11-13", value: "." }, { date: "2026-11-12", value: "5.1" }],
        MORTGAGE30US: [{ date: "2026-11-12", value: "7.11" }],
      };
      return { observations: obs[id] };
    });
    const out = await runData(q("source=rates"), { FRED_API_KEY: "k" });
    const rates = (out.body as { rates: { key: string; value: number; asOf: string }[] }).rates;
    expect(rates.find((r) => r.key === "inflation")).toEqual({ key: "inflation", value: 3, asOf: "2026-10-01" });
    expect(rates.find((r) => r.key === "t10y")?.asOf).toBe("2026-11-12");
  });

  it("falls back to the May 2025 medians when BLS can't be reached", async () => {
    stubFetch(() => undefined);
    const out = await runData(q("source=salary&area=fl"), {});
    const body = out.body as { live: boolean; jobs: { soc: string; median: number }[] };
    expect(body.live).toBe(false);
    expect(body.jobs[0]).toEqual({ soc: JOBS[0].soc, median: JOBS[0].fl });
  });

  it("asks BLS for Florida medians with the right series ids", async () => {
    let sent: { seriesid: string[] } | null = null;
    stubFetch((_url, init) => {
      sent = JSON.parse(String(init?.body));
      return { status: "REQUEST_SUCCEEDED", Results: { series: sent!.seriesid.map((id) => ({ seriesID: id, data: [{ year: "2026", value: "1000" }] })) } };
    });
    const out = await runData(q("source=salary&area=fl"), {});
    expect(sent!.seriesid[0]).toBe("OEUS1200000000000132051" + "13");
    expect((out.body as { year: string; live: boolean }).year).toBe("2026");
  });

  it("checks school and charity input before asking anyone", async () => {
    stubFetch(() => ({}));
    expect((await runData(q("source=school&q=ab"), {})).status).toBe(400);
    expect((await runData(q("source=programs&id=12ab"), {})).status).toBe(400);
    expect((await runData(q("source=charity&q=x"), {})).status).toBe(400);
    expect((await runData(q("source=nope"), {})).status).toBe(400);
  });

  it("summarizes a charity's filings", async () => {
    stubFetch(() => ({
      organization: { name: "Example Mission", city: "Gainesville", state: "FL", ntee_code: "X20" },
      filings_with_data: [{ tax_prd_yr: 2024, totrevenue: 1000, totcntrbgfts: 900, totfuncexpns: 800, totassetsend: 500, totliabend: 100, compnsatncurrofcr: 50, profndraising: 0, pdf_url: "https://example.org/f.pdf" }],
    }));
    const out = await runData(q("source=charity&ein=12-3456789"), {});
    const body = out.body as { org: { ein: string; url: string }; filings: { netAssets: number; pdf: string }[] };
    expect(body.org.ein).toBe("123456789");
    expect(body.org.url).toContain("/organizations/123456789");
    expect(body.filings[0].netAssets).toBe(400);
  });

  it("keeps only bachelor's programs with data, by name", async () => {
    stubFetch(() => ({
      results: [
        {
          "latest.programs.cip_4_digit": [
            { title: "Finance.", credential: { level: 3 }, earnings: { "1_yr": { overall_median_earnings: 80000 } }, debt: { staff_grad_plus: { all: { eval_inst: { median: 12500, median_payment: 142 } } } } },
            { title: "Finance.", credential: { level: 5 }, earnings: {}, debt: {} },
            { title: "Accounting.", credential: { level: 3 }, earnings: {}, debt: {} },
          ],
        },
      ],
    }));
    const out = await runData(q("source=programs&id=134130"), {});
    expect((out.body as { programs: unknown[] }).programs).toEqual([{ title: "Finance", earnings1: 80000, earnings4: null, debt: 12500, payment: 142 }]);
  });

  it("ranks the school someone typed above schools that only share words", () => {
    const list = [{ name: "Florida State University" }, { name: "University of Florida-Online" }, { name: "University of Florida" }];
    expect(rankByName("university of  florida", list).map((x) => x.name)).toEqual(["University of Florida", "University of Florida-Online", "Florida State University"]);
  });

  it("remembers a good answer instead of asking the source again", async () => {
    let calls = 0;
    stubFetch(() => {
      calls += 1;
      return { status: "REQUEST_SUCCEEDED", Results: { series: [] } };
    });
    await runData(q("source=salary&area=us"), {});
    await runData(q("area=us&source=salary"), {});
    expect(calls).toBe(1);
  });
});
