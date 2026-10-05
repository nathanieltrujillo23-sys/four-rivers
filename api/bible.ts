/**
 * Looks up and searches Bible text the app is not allowed to bundle (ESV and
 * NLT) by asking each publisher's own service. Only signed-in learners can
 * call it, and the publishers' keys never leave the server.
 *
 * Setup (Vercel project environment variables):
 *   ESV_API_KEY  from https://api.esv.org
 *   NLT_API_KEY  from https://api.nlt.to
 *   YOUVERSION_APP_KEY  (and optionally YOUVERSION_NIV_ID, default 111) from https://platform.youversion.com,
 *     for reading NIV passages. Biblica must have approved your app for the NIV first.
 *   API_BIBLE_KEY and API_BIBLE_NIV_ID  optional alternative for the NIV, from https://scripture.api.bible.
 *     NIV search needs this one; YouVersion is used for passages only.
 * A missing key answers 501 and the app shows "not set up yet".
 *
 * Publisher terms this respects (checked October 2026; recheck when they change):
 *   ESV: free for non-commercial sites, at most 500 verses per request, no storing more than 500 verses,
 *        5,000 requests a day and 60 a minute. NLT (with a key): non-commercial, 500 verses per request,
 *        5,000 requests a day. Their copyright lines are in the site footer.
 * Each person is limited to 40 lookups a minute here, and identical lookups are answered from a
 * 60 second in-memory copy so one popular passage does not use up the daily quota.
 *
 *   GET /api/bible?version=ESV&book=John&code=John&ch=3&from=16&to=17
 *   GET /api/bible?version=NLT&q=steward
 */

type Env = Record<string, string | undefined>;
interface Reply {
  status: number;
  body: unknown;
}
interface Verse {
  v: number;
  text: string;
}

const json = (status: number, body: unknown): Reply => ({ status, body });

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};
function decode(s: string): string {
  return s
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)));
}

const DROPPED_CLASSES = new Set(["vn", "tn", "tn-ref", "a-tn", "psa-title", "bk_ch_vs_header"]);

/** Plain text from the NLT service's HTML, leaving out verse numbers, footnotes, and headings. */
export function nltText(html: string): string {
  const out: string[] = [];
  let skip = 0;
  for (const token of html.match(/<[^>]+>|[^<]+/g) ?? []) {
    if (token.startsWith("<")) {
      const closing = token.startsWith("</");
      const name = (token.match(/^<\/?([a-z0-9]+)/i)?.[1] ?? "").toLowerCase();
      const cls = token.match(/class="([^"]*)"/i)?.[1] ?? "";
      const dropped = cls.split(/\s+/).some((c) => DROPPED_CLASSES.has(c)) || /^h[1-6]$/.test(name);
      if (skip === 0 && (name === "p" || name === "br")) out.push(" ");
      if (skip > 0) {
        if (closing && name !== "br") skip--;
        else if (!closing && !token.endsWith("/>") && name !== "br") skip++;
      } else if (!closing && dropped && !token.endsWith("/>")) {
        skip = 1;
      }
      continue;
    }
    if (skip === 0) out.push(token);
  }
  return clean(decode(out.join("")));
}

function nltPassage(html: string): Verse[] {
  const verses: Verse[] = [];
  const re = /<verse_export[^>]*\bvn="(\d+)"[^>]*>([\s\S]*?)<\/verse_export>/g;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const text = nltText(m[2]);
    if (text) verses.push({ v: Number(m[1]), text });
  }
  return verses;
}

/** Search results come back as table rows: a link such as "Gen.22.2", then the verse. */
function nltSearch(html: string): { total: number; results: { ref: string; text: string }[] } {
  const total = Number(html.match(/(\d+)\s+result\(s\)/)?.[1] ?? 0);
  const results: { ref: string; text: string }[] = [];
  const re = /<tr>\s*<td><a [^>]*>([^<]+)<\/a><\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/g;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const [book, ch, vs] = m[1].trim().split(".");
    results.push({
      ref: `${book} ${ch}:${vs}`, // Search rows inline footnotes as "*3:16 note..." with no markup, so cut there; the
      // app fetches the full verse when one is picked.
      text: nltText(m[2]).replace(/\s*\*\d+:\d+[\s\S]*$/, " …"),
    });
  }
  return { total, results };
}

/** Divs that are headings or titles rather than verse text (psalm titles, section headings, and so on). */
const YV_HEADING_DIV = /<div class="(?:s\d?|ms\d?|mr|sr|r|d|qa|cl|cd|sp|b)">[\s\S]*?<\/div>/g;

/** Verses from YouVersion's HTML: each verse starts at a `yv-v` marker with its number in `v`. */
export function youVersionPassage(html: string): Verse[] {
  const verses: Verse[] = [];
  const parts = html.replace(YV_HEADING_DIV, " ").split(/<span class="yv-v" v="(\d+)"><\/span>/);
  for (let i = 1; i < parts.length; i += 2) {
    const text = clean(
      decode(
        (parts[i + 1] ?? "")
          .replace(/<span class="yv-vlbl">[^<]*<\/span>/g, "")
          .replace(/<\/(?:div|p)>|<br\s*\/?>/g, " ")
          .replace(/<[^>]+>/g, ""),
      ),
    );
    if (text) verses.push({ v: Number(parts[i]), text });
  }
  return verses;
}

function esvPassage(text: string): Verse[] {
  const verses: Verse[] = [];
  const parts = text.split(/\[(\d+)\]\s*/);
  for (let i = 1; i < parts.length; i += 2) {
    const t = clean(parts[i + 1] ?? "");
    if (t) verses.push({ v: Number(parts[i]), text: t });
  }
  return verses;
}

async function fetchUpstream(url: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  } catch {
    return null;
  }
}

/** The signed-in person's id, or null when the token is missing or not valid. */
async function signedInUser(authorization: string | undefined, env: Env): Promise<string | null> {
  const url = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
  const anon = env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY;
  if (!authorization?.startsWith("Bearer ") || !url || !anon) return null;
  const res = await fetchUpstream(`${url}/auth/v1/user`, {
    headers: { apikey: anon, Authorization: authorization },
  });
  if (!res?.ok) return null;
  const user = (await res.json().catch(() => null)) as { id?: string } | null;
  return user?.id ?? null;
}

const PER_MINUTE = 40;
const hits = new Map<string, number[]>();
/** True when this person has used up their lookups for the last minute. */
export function tooMany(userId: string, now = Date.now()): boolean {
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= PER_MINUTE) {
    hits.set(userId, recent);
    return true;
  }
  recent.push(now);
  hits.set(userId, recent);
  return false;
}

const memo = new Map<string, { at: number; reply: Reply }>();
const MEMO_MS = 60_000;

/** API.Bible text mode puts verse numbers in square brackets, like the ESV. */
async function apiBible(
  path: string,
  env: Env,
): Promise<{
  data?: { content?: string; verses?: { reference: string; text: string }[]; total?: number };
} | null> {
  const res = await fetchUpstream(`https://rest.api.bible/v1/bibles/${env.API_BIBLE_NIV_ID}${path}`, {
    headers: { "api-key": env.API_BIBLE_KEY ?? "" },
  });
  return res?.ok ? ((await res.json()) as never) : null;
}

export async function runBible(
  params: URLSearchParams,
  authorization: string | undefined,
  env: Env,
): Promise<Reply> {
  const version = params.get("version");
  if (version !== "ESV" && version !== "NLT" && version !== "NIV") return json(400, { error: "bad_version" });
  const key =
    version === "ESV"
      ? env.ESV_API_KEY
      : version === "NLT"
        ? env.NLT_API_KEY
        : env.YOUVERSION_APP_KEY || (env.API_BIBLE_KEY && env.API_BIBLE_NIV_ID);
  if (!key) return json(501, { error: "not_configured" });
  const userId = await signedInUser(authorization, env);
  if (!userId) return json(401, { error: "sign_in" });
  if (tooMany(userId)) return json(429, { error: "slow_down" });
  const cacheKey = `${version}?${params.toString()}`;
  const hit = memo.get(cacheKey);
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.reply;
  const reply = await lookup(params, version, key, env);
  if (reply.status === 200) {
    memo.set(cacheKey, { at: Date.now(), reply });
    if (memo.size > 200) memo.delete(memo.keys().next().value as string);
  }
  return reply;
}

async function lookup(
  params: URLSearchParams,
  version: "ESV" | "NLT" | "NIV",
  key: string,
  env: Env,
): Promise<Reply> {
  const q = params.get("q");
  if (q !== null) {
    const query = q.trim().slice(0, 80);
    if (!query) return json(400, { error: "empty" });
    if (version === "NIV") {
      // Search goes through API.Bible only; without it the app searches its own course library.
      if (!(env.API_BIBLE_KEY && env.API_BIBLE_NIV_ID)) return json(501, { error: "not_configured" });
      const r = await apiBible(`/search?query=${encodeURIComponent(query)}&limit=25&sort=relevance`, env);
      if (!r) return json(502, { error: "upstream" });
      return json(200, {
        total: r.data?.total ?? 0,
        results: (r.data?.verses ?? []).map((v) => ({ ref: v.reference, text: clean(v.text) })),
      });
    }
    if (version === "ESV") {
      const res = await fetchUpstream(
        `https://api.esv.org/v3/passage/search/?q=${encodeURIComponent(query)}&page-size=25`,
        { headers: { Authorization: `Token ${key}` } },
      );
      if (!res?.ok) return json(502, { error: "upstream" });
      const data = (await res.json()) as {
        total_results?: number;
        results?: { reference: string; content: string }[];
      };
      return json(200, {
        total: data.total_results ?? 0,
        results: (data.results ?? []).map((r) => ({ ref: r.reference, text: clean(r.content) })),
      });
    }
    const res = await fetchUpstream(
      `https://api.nlt.to/api/search?text=${encodeURIComponent(query)}&version=NLT&key=${encodeURIComponent(key)}`,
    );
    if (!res?.ok) return json(502, { error: "upstream" });
    const { total, results } = nltSearch(await res.text());
    return json(200, { total, results: results.slice(0, 25) });
  }

  const book = params.get("book") ?? "";
  const code = params.get("code") ?? "";
  const ch = Number(params.get("ch"));
  const from = params.get("from") ? Number(params.get("from")) : null;
  const to = params.get("to") ? Number(params.get("to")) : null;
  if (!/^[1-3]? ?[A-Za-z ]{2,20}$/.test(book) || !/^[1-3]?[A-Za-z]{2,8}$/.test(code)) {
    return json(400, { error: "bad_reference" });
  }
  if (!Number.isInteger(ch) || ch < 1 || ch > 150) return json(400, { error: "bad_reference" });
  if ((from !== null && !Number.isInteger(from)) || (to !== null && !Number.isInteger(to))) {
    return json(400, { error: "bad_reference" });
  }
  const span = from === null ? "" : `:${from}${to !== null && to !== from ? `-${to}` : ""}`;

  if (version === "NIV") {
    const usfm = params.get("usfm") ?? "";
    if (!/^[1-3A-Z][A-Z]{2}$/.test(usfm)) return json(400, { error: "bad_reference" });
    const first = from ?? 1;
    if (env.YOUVERSION_APP_KEY) {
      const yvId = from === null ? `${usfm}.${ch}` : `${usfm}.${ch}.${first}${to !== null && to !== first ? `-${to}` : ""}`;
      const res = await fetchUpstream(
        `https://api.youversion.com/v1/bibles/${encodeURIComponent(env.YOUVERSION_NIV_ID ?? "111")}/passages/${yvId}?format=html`,
        { headers: { "X-YVP-App-Key": env.YOUVERSION_APP_KEY, Accept: "application/json" } },
      );
      if (!res?.ok) return json(502, { error: "upstream" });
      const data = (await res.json()) as { content?: string };
      return json(200, { verses: youVersionPassage(data.content ?? "") });
    }
    const id = from === null ? `${usfm}.${ch}` : `${usfm}.${ch}.${first}-${usfm}.${ch}.${to ?? first}`;
    const r = await apiBible(
      `/passages/${id}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false`,
      env,
    );
    if (!r) return json(502, { error: "upstream" });
    return json(200, { verses: esvPassage(r.data?.content ?? "") });
  }
  if (version === "ESV") {
    const url =
      `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(`${book} ${ch}${span}`)}` +
      "&include-passage-references=false&include-verse-numbers=true&include-first-verse-numbers=true" +
      "&include-footnotes=false&include-footnote-body=false&include-headings=false" +
      "&include-short-copyright=false&include-copyright=false&indent-using=space&indent-paragraphs=0&indent-poetry=false";
    const res = await fetchUpstream(url, { headers: { Authorization: `Token ${key}` } });
    if (!res?.ok) return json(502, { error: "upstream" });
    const data = (await res.json()) as { passages?: string[] };
    return json(200, { verses: esvPassage(data.passages?.[0] ?? "") });
  }
  const res = await fetchUpstream(
    `https://api.nlt.to/api/passages?ref=${encodeURIComponent(`${code}.${ch}${span}`)}&version=NLT&key=${encodeURIComponent(key)}`,
  );
  if (!res?.ok) return json(502, { error: "upstream" });
  return json(200, { verses: nltPassage(await res.text()) });
}

interface Req {
  url?: string;
  headers: Record<string, string | string[] | undefined>;
}
interface Res {
  status(code: number): Res;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
}

export default async function handler(req: Req, res: Res) {
  const params = new URL(req.url ?? "", "http://localhost").searchParams;
  const auth = req.headers.authorization;
  const out = await runBible(params, Array.isArray(auth) ? auth[0] : auth, process.env);
  res.setHeader("Cache-Control", "private, no-store");
  res.status(out.status).json(out.body);
}
