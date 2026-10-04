/**
 * Looks up and searches Bible text the app is not allowed to bundle (ESV and
 * NLT) by asking each publisher's own service. Only signed-in learners can
 * call it, and the publishers' keys never leave the server.
 *
 * Setup (Vercel project environment variables):
 *   ESV_API_KEY  from https://api.esv.org
 *   NLT_API_KEY  from https://api.nlt.to
 * A missing key answers 501 and the app shows "not set up yet".
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

async function signedIn(authorization: string | undefined, env: Env): Promise<boolean> {
  const url = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
  const anon = env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY;
  if (!authorization?.startsWith("Bearer ") || !url || !anon) return false;
  const res = await fetchUpstream(`${url}/auth/v1/user`, {
    headers: { apikey: anon, Authorization: authorization },
  });
  return !!res?.ok;
}

export async function runBible(
  params: URLSearchParams,
  authorization: string | undefined,
  env: Env,
): Promise<Reply> {
  const version = params.get("version");
  if (version !== "ESV" && version !== "NLT") return json(400, { error: "bad_version" });
  const key = version === "ESV" ? env.ESV_API_KEY : env.NLT_API_KEY;
  if (!key) return json(501, { error: "not_configured" });
  if (!(await signedIn(authorization, env))) return json(401, { error: "sign_in" });

  const q = params.get("q");
  if (q !== null) {
    const query = q.trim().slice(0, 80);
    if (!query) return json(400, { error: "empty" });
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
