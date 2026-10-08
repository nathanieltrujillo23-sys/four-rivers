// Draws every logo option into public/brand/<id>/ : the tab icon, app icons, and the link-preview card.
// The Admin chooser (Tools) picks one; /api/brand serves that one's files to link previews and installs.
//   node tools/dev/make_logo_assets.mjs
// Needs Chrome (Playwright's Chromium in CI) and Georgia (macOS).
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { FIXED_PALETTE, LOGO_IDS, logoSvg } from "../../src/brand/logoMarks.mjs";

const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "public");
const OWN_PLATE = new Set(["tile", "monogram"]); // these carry their own navy, so they sit on navy

function iconHtml(id, size, pad, rounded) {
  const plate = OWN_PLATE.has(id) ? FIXED_PALETTE.navy : FIXED_PALETTE.cream;
  const inner = Math.round(size * (1 - 2 * pad));
  return `<body style="margin:0;background:transparent"><div id="t" style="width:${size}px;height:${size}px;background:${plate};border-radius:${rounded ? size * 0.22 : 0}px;display:flex;align-items:center;justify-content:center">${logoSvg(id, { size: inner })}</div></body>`;
}

function ogHtml(id) {
  const n = FIXED_PALETTE.navy;
  return `<body style="margin:0"><div id="t" style="width:1200px;height:630px;position:relative;overflow:hidden;background:linear-gradient(180deg,#182e46,${n});font-family:Georgia,serif">
  <div style="position:absolute;left:70px;top:105px;font-size:132px;font-weight:700;color:#fffcf4">4 Rivers</div>
  <div style="position:absolute;left:74px;top:290px;font-size:46px;font-style:italic;color:#e9dcc4">One source. Four streams.</div>
  <div style="position:absolute;left:74px;top:370px;font:30px Helvetica,Arial,sans-serif;color:#d6e2f0;line-height:40px">A free, Scripture-based course in<br>stewardship for young adults.</div>
  <div style="position:absolute;left:74px;top:520px;font-size:34px;font-weight:700;color:${FIXED_PALETTE.gold}">four-rivers.vercel.app</div>
  <div style="position:absolute;left:790px;top:135px;width:340px;height:340px;border-radius:50%;background:${FIXED_PALETTE.cream};display:flex;align-items:center;justify-content:center">${logoSvg(id, { size: 250 })}</div>
  </div></body>`;
}

const browser = await chromium.launch({ channel: process.env.CI ? undefined : "chrome" });
const page = await browser.newPage({ deviceScaleFactor: 1 });
async function shoot(html, width, height, out) {
  await page.setViewportSize({ width, height });
  await page.setContent(html);
  await page.locator("#t").screenshot({ path: out, omitBackground: true });
}

for (const id of LOGO_IDS) {
  const dir = join(PUB, "brand", id);
  mkdirSync(dir, { recursive: true });
  if (id === "current") {
    // The original assets are the hand-drawn ones in public/; keep them as they are.
    copyFileSync(join(PUB, "favicon-32.png"), join(dir, "favicon-32.png"));
    for (const f of ["icon-192.png", "icon-512.png", "maskable-512.png", "apple-touch-icon.png"]) copyFileSync(join(PUB, "icons", f), join(dir, f));
    copyFileSync(join(PUB, "og.png"), join(dir, "og.png"));
    continue;
  }
  await shoot(iconHtml(id, 32, 0.06, true), 32, 32, join(dir, "favicon-32.png"));
  await shoot(iconHtml(id, 192, 0.14, true), 192, 192, join(dir, "icon-192.png"));
  await shoot(iconHtml(id, 512, 0.14, true), 512, 512, join(dir, "icon-512.png"));
  await shoot(iconHtml(id, 512, 0.24, false), 512, 512, join(dir, "maskable-512.png"));
  await shoot(iconHtml(id, 180, 0.16, false), 180, 180, join(dir, "apple-touch-icon.png"));
  await shoot(ogHtml(id), 1200, 630, join(dir, "og.png"));
  console.log("drew", id);
}
await browser.close();
if (!existsSync(join(PUB, "brand", "current", "og.png"))) throw new Error("current assets missing");
