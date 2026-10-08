#!/usr/bin/env node
/**
 * Takes the phone screenshots shown on the home page (src/assets/screens/{en,es}-{1,2,3}.jpg) from the built-in
 * sample account, so they always match the real app. Run the app first (npm run dev), then:
 *
 *   node tools/dev/capture-showcase.mjs            # uses http://localhost:5273
 *   BASE_URL=https://four-rivers.vercel.app node tools/dev/capture-showcase.mjs
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:5273";
const OUT = new URL("../../src/assets/screens/", import.meta.url).pathname.replace(/%20/g, " ");
mkdirSync(OUT, { recursive: true });

// Which tour step shows each screen, and what to scroll to before the shot.
const SHOTS = [
  { n: 1, step: 1, target: null },
  { n: 2, step: 6, target: '[data-tour="dash-calculators"]' },
  { n: 3, step: 8, target: '[data-tour="group-reading"]' },
];
const TOUR = { en: "Show me around", es: "Muéstrame el curso" };

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
for (const lang of ["en", "es"]) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 780 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  await ctx.addInitScript((l) => localStorage.setItem("four-rivers:lang", l), lang);
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.getByRole("button", { name: TOUR[lang], exact: true }).click();
  let at = 1;
  for (const shot of SHOTS) {
    while (at < shot.step) {
      // The tour listens for the right-arrow key on the window, which works wherever the card ended up.
      await page.keyboard.press("ArrowRight");
      at += 1;
      await page.waitForTimeout(700);
    }
    // The tour keeps nudging its target into view for the first few seconds; wait that out before scrolling elsewhere.
    await page.waitForTimeout(shot.target ? 1600 : 4800);
    await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"][aria-modal="true"]');
      if (d) d.style.display = "none";
    });
    if (shot.target) {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 80);
      }, shot.target);
    } else await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}${lang}-${shot.n}.jpg`, type: "jpeg", quality: 82 });
    console.log(`${lang}-${shot.n}.jpg`);
    // Show the tour card again so the next loop can press Next.
    await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"][aria-modal="true"]');
      if (d) d.style.display = "";
    });
  }
  await ctx.close();
}
await browser.close();
