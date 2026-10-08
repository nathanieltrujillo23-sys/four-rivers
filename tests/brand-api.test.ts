import { afterEach, describe, expect, it, vi } from "vitest";
import handler, { chosenLogo } from "../api/brand.js";

const env = { VITE_SUPABASE_URL: "https://x.supabase.co", VITE_SUPABASE_ANON_KEY: "anon" };

afterEach(() => vi.unstubAllGlobals());

function stubFetch(logoRow: unknown, fileOk = true) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(url);
      if (url.includes("/rest/v1/site_text")) return new Response(JSON.stringify(logoRow));
      return fileOk ? new Response(new Uint8Array([1, 2, 3])) : new Response("no", { status: 404 });
    }),
  );
  return calls;
}

function run(query: string) {
  const out: { status: number; headers: Record<string, string>; body?: unknown } = { status: 0, headers: {} };
  const res = {
    status(code: number) {
      out.status = code;
      return res;
    },
    setHeader(k: string, v: string) {
      out.headers[k] = v;
    },
    json(b: unknown) {
      out.body = b;
    },
    end(b: Buffer) {
      out.body = b;
    },
  };
  return handler({ method: "GET", url: `/api/brand${query}`, headers: { host: "four-rivers.vercel.app" } }, res).then(() => out);
}

describe("api/brand", () => {
  it("reads the chosen logo, and falls back to the original for anything unexpected", async () => {
    stubFetch([{ content: { id: "droplet" } }]);
    expect(await chosenLogo(env)).toBe("droplet");
    stubFetch([{ content: { id: "../../etc" } }]);
    expect(await chosenLogo(env)).toBe("current");
    stubFetch([]);
    expect(await chosenLogo(env)).toBe("current");
  });

  it("serves the chosen logo's file as a PNG", async () => {
    process.env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL;
    process.env.VITE_SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
    const calls = stubFetch([{ content: { id: "orb" } }]);
    const out = await run("?f=og");
    expect(out.status).toBe(200);
    expect(out.headers["Content-Type"]).toBe("image/png");
    expect(calls.at(-1)).toBe("https://four-rivers.vercel.app/brand/orb/og.png");
  });

  it("only serves the known files", async () => {
    stubFetch([]);
    expect((await run("?f=../secret")).status).toBe(404);
    expect((await run("")).status).toBe(404);
  });
});
