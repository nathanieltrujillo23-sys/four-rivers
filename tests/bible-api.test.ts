import { afterEach, describe, expect, it, vi } from "vitest";
import { nltText, runBible, tooMany } from "../api/bible.ts";

const env = {
  NLT_API_KEY: "k",
  ESV_API_KEY: "k",
  VITE_SUPABASE_URL: "https://x.supabase.co",
  VITE_SUPABASE_ANON_KEY: "anon",
};

afterEach(() => vi.unstubAllGlobals());

describe("NLT text", () => {
  it("drops verse numbers, footnotes, and headings but keeps the words", () => {
    const html =
      '<h3 class="chapter-number">Psalm 23</h3><p><span class="vn">1</span>The <span class="sc">Lord</span> is my shepherd;' +
      '<a class="a-tn">*</a><span class="tn"><span class="tn-ref">23:1</span> A note.</span></p><p>I have all that I need.</p>';
    expect(nltText(html)).toBe("The Lord is my shepherd; I have all that I need.");
  });
});

describe("limits", () => {
  it("allows 40 lookups a minute per person, then asks them to slow down", () => {
    const now = 1_000_000;
    for (let i = 0; i < 40; i++) expect(tooMany("limit-user", now + i)).toBe(false);
    expect(tooMany("limit-user", now + 50)).toBe(true);
    expect(tooMany("limit-user", now + 61_000)).toBe(false);
  });
});

describe("the endpoint", () => {
  const p = (q: string) => new URLSearchParams(q);

  it("refuses unknown versions and bad references", async () => {
    expect((await runBible(p("version=KJV&q=love"), "Bearer t", env)).status).toBe(400);
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ id: "u1" }), { status: 200 }));
    const bad = await runBible(p("version=ESV&book=../x&code=John&ch=3"), "Bearer t", env);
    expect(bad.status).toBe(400);
  });

  it("says not configured without a key, and 401 without a valid sign-in", async () => {
    expect(
      (await runBible(p("version=ESV&q=love"), "Bearer t", { ...env, ESV_API_KEY: undefined })).status,
    ).toBe(501);
    vi.stubGlobal("fetch", async () => new Response("no", { status: 401 }));
    expect((await runBible(p("version=NLT&q=love"), "Bearer t", env)).status).toBe(401);
    expect((await runBible(p("version=NLT&q=love"), undefined, env)).status).toBe(401);
  });

  it("keeps the NIV off until API.Bible is set up", async () => {
    expect((await runBible(p("version=NIV&q=love"), "Bearer t", env)).status).toBe(501);
  });

  it("reads an ESV passage into numbered verses", async () => {
    vi.stubGlobal("fetch", async (url: string) =>
      String(url).includes("/auth/v1/user")
        ? new Response(JSON.stringify({ id: "u2" }), { status: 200 })
        : new Response(
            JSON.stringify({ passages: ["[16] For God so loved the world. [17] For God did not send."] }),
            {
              status: 200,
            },
          ),
    );
    const out = await runBible(p("version=ESV&book=John&code=John&ch=3&from=16&to=17"), "Bearer t", env);
    expect(out.status).toBe(200);
    expect(out.body).toEqual({
      verses: [
        { v: 16, text: "For God so loved the world." },
        { v: 17, text: "For God did not send." },
      ],
    });
  });
});
