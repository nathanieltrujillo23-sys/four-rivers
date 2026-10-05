#!/usr/bin/env node
/**
 * Checks a YouVersion Platform app key: which English Bibles it can read (and
 * their ids), whether the NIV, ESV and NLT are among them, and what a sample
 * passage looks like in both text and HTML form.
 *
 *   YOUVERSION_APP_KEY=your-key node tools/dev/youversion-check.mjs
 *
 * The app key is not a secret (YouVersion says it may sit in source code), but
 * it is still kept out of the repo: set it in Vercel as YOUVERSION_APP_KEY.
 */
const key = process.env.YOUVERSION_APP_KEY;
if (!key) {
  console.error("Set YOUVERSION_APP_KEY first.");
  process.exit(1);
}
const BASE = "https://api.youversion.com/v1";
const headers = { "X-YVP-App-Key": key, Accept: "application/json" };

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers });
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${path}\n${body.slice(0, 400)}`);
  return JSON.parse(body);
}

async function listAll(extra = "") {
  const out = [];
  let token = "";
  for (let i = 0; i < 20; i++) {
    const page = await get(
      `/bibles?language_ranges[]=en&page_size=99${extra}${token ? `&page_token=${encodeURIComponent(token)}` : ""}`,
    );
    out.push(...(page.data ?? []));
    token = page.next_page_token ?? "";
    if (!token) break;
  }
  return out;
}

const visible = await listAll();
const everything = await listAll("&all_available=true").catch(() => []);
const want = ["NIV", "ESV", "NLT", "KJV"];
const show = (list) =>
  list
    .filter((b) => want.includes(String(b.abbreviation).toUpperCase().replace(/^.*?(NIV|ESV|NLT|KJV).*$/, "$1")))
    .map((b) => `  ${String(b.abbreviation).padEnd(8)} id=${b.id}  ${b.title ?? ""}`);

console.log(`Readable with this key (${visible.length} English Bibles):`);
console.log(show(visible).join("\n") || "  none of NIV, ESV, NLT, KJV");
console.log(`\nExist on the platform but may need a license/approval (${everything.length} English Bibles):`);
console.log(show(everything).join("\n") || "  (could not list)");

const first = visible.find((b) => want.includes(String(b.abbreviation).toUpperCase())) ?? visible[0];
if (first) {
  for (const format of ["text", "html"]) {
    try {
      const p = await get(`/bibles/${first.id}/passages/JHN.3.16-17?format=${format}`);
      console.log(`\nSample ${first.abbreviation} JHN.3.16-17 (${format}):\n${JSON.stringify(p, null, 2).slice(0, 900)}`);
    } catch (e) {
      console.log(`\nSample (${format}) failed: ${e.message}`);
    }
  }
}
