import { afterEach, describe, expect, it, vi } from "vitest";
import { nltText, runBible, tooMany, youVersionPassage } from "../api/bible.ts";

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

  it("reads an NIV passage from YouVersion, skipping psalm titles and verse labels", async () => {
    const html =
      '<div><div class="d">A psalm of David.</div><div class="q1"><span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>The <span class="nd">Lord</span> is my shepherd, I lack nothing.</div>' +
      '<div class="q2"><span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>He makes me lie down in green pastures,</div><div class="q1">he leads me beside quiet waters,</div></div>';
    let seen = "";
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/v1/user")) return new Response(JSON.stringify({ id: "u3" }), { status: 200 });
      seen = `${url} ${(init?.headers as Record<string, string>)["X-YVP-App-Key"]}`;
      return new Response(JSON.stringify({ content: html }), { status: 200 });
    });
    const yv = { ...env, YOUVERSION_APP_KEY: "yv-key" };
    const out = await runBible(p("version=NIV&book=Psalms&code=Ps&usfm=PSA&ch=23&from=1&to=2"), "Bearer t", yv);
    expect(seen).toContain("/bibles/111/passages/PSA.23.1-2?format=html yv-key");
    expect(out.body).toEqual({
      verses: [
        { v: 1, text: "The Lord is my shepherd, I lack nothing." },
        { v: 2, text: "He makes me lie down in green pastures, he leads me beside quiet waters," },
      ],
    });
    // Search still needs API.Bible, so it reports "not set up" and the app uses its own library.
    expect((await runBible(p("version=NIV&q=love"), "Bearer t", yv)).status).toBe(501);
  });
});

describe("YouVersion passages", () => {
  it("returns nothing for markup it does not recognise", () => {
    expect(youVersionPassage("<div>no verse markers</div>")).toEqual([]);
  });
});
