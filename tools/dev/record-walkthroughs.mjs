#!/usr/bin/env node
/**
 * Records the two silent, captioned walkthrough videos on the home page ("See it in action") from the built-in sample
 * account, so they always match the real app: public/videos/{course,tools}.mp4 plus a poster image for each.
 * Needs macOS (the MP4 is written by tools/dev/frames-to-mp4.swift) and the app running (npm run dev):
 *
 *   node tools/dev/record-walkthroughs.mjs                 # both videos, from http://localhost:5273
 *   node tools/dev/record-walkthroughs.mjs course          # just one
 *   BASE_URL=https://four-rivers.vercel.app node tools/dev/record-walkthroughs.mjs
 *
 * To use your own screen recordings instead, drop files with the same names into public/videos/.
 */
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:5273";
const ROOT = new URL("../../", import.meta.url).pathname.replace(/%20/g, " ");
const OUT = join(ROOT, "public/videos");
const W = 1280;
const H = 720;
const FPS = 20;
const BITRATE = 900_000;
mkdirSync(OUT, { recursive: true });

const SWIFT = join(tmpdir(), "four-rivers-frames-to-mp4");
execFileSync("swiftc", ["-O", join(ROOT, "tools/dev/frames-to-mp4.swift"), "-o", SWIFT], { stdio: "inherit" });

/* ---------- what gets drawn on top of the page: captions, a cursor, title and end cards ---------- */

const OVERLAY = () => {
  if (document.getElementById("rec-root")) return;
  const root = document.createElement("div");
  root.id = "rec-root";
  root.innerHTML = `
    <style>
      #rec-root{position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
      #rec-cap{position:absolute;left:50%;bottom:34px;transform:translate(-50%,16px);max-width:1040px;padding:14px 26px;border-radius:6px;background:rgba(39,75,109,.96);color:#fff;font-size:26px;line-height:1.3;font-weight:600;text-align:center;opacity:0;transition:opacity .35s,transform .35s;box-shadow:0 8px 30px rgba(0,0,0,.25)}
      #rec-cap.on{opacity:1;transform:translate(-50%,0)}
      #rec-cap small{display:block;margin-top:4px;font-size:17px;font-weight:400;opacity:.85}
      #rec-dot{position:absolute;left:-40px;top:-40px;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(201,162,75,.9);border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);transition:transform .12s}
      #rec-dot.down{transform:scale(.7)}
      .rec-ripple{position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:3px solid #c9a24b;animation:rec-rip .6s ease-out forwards}
      @keyframes rec-rip{to{transform:scale(3.2);opacity:0}}
      #rec-card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:#faf5ec;color:#2c2620;text-align:center;padding:0 120px;opacity:0;transition:opacity .5s}
      #rec-card.on{opacity:1}
      #rec-card img{width:84px;height:84px;border-radius:18px}
      #rec-card .k{font-size:20px;letter-spacing:.2em;text-transform:uppercase;color:#7a5e14;font-weight:600}
      #rec-card h1{margin:0;font:600 68px/1.1 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
      #rec-card p{margin:0;font:400 30px/1.4 "Iowan Old Style",Georgia,serif;color:#5c5347;max-width:880px}
      #rec-card .bar{width:120px;height:4px;background:#c9a24b}
    </style>
    <div id="rec-dot"></div><div id="rec-cap"></div><div id="rec-card"></div>`;
  document.documentElement.appendChild(root);
  addEventListener("mousemove", (e) => {
    const d = document.getElementById("rec-dot");
    if (d) {
      d.style.left = e.clientX + "px";
      d.style.top = e.clientY + "px";
    }
  }, true);
  addEventListener("mousedown", (e) => {
    document.getElementById("rec-dot")?.classList.add("down");
    const r = document.createElement("div");
    r.className = "rec-ripple";
    r.style.left = e.clientX + "px";
    r.style.top = e.clientY + "px";
    document.getElementById("rec-root")?.appendChild(r);
    setTimeout(() => r.remove(), 700);
  }, true);
  addEventListener("mouseup", () => document.getElementById("rec-dot")?.classList.remove("down"), true);
};

class Recorder {
  constructor(page, name) {
    this.page = page;
    this.name = name;
    this.dir = mkdtempSync(join(tmpdir(), `rec-${name}-`));
    this.frames = [];
    this.t0 = null;
    this.last = 0;
    this.mouse = { x: -40, y: -40 };
  }

  async start() {
    await this.page.addInitScript(OVERLAY);
    this.cdp = await this.page.context().newCDPSession(this.page);
    this.cdp.on("Page.screencastFrame", async (f) => {
      const ts = f.metadata.timestamp;
      this.t0 ??= ts;
      const t = ts - this.t0;
      const file = `f${String(this.frames.length).padStart(5, "0")}.jpg`;
      writeFileSync(join(this.dir, file), Buffer.from(f.data, "base64"));
      this.frames.push({ t, file });
      this.last = t;
      await this.cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
    });
    await this.cdp.send("Page.startScreencast", { format: "jpeg", quality: 82, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  }

  async stop(extraHold = 0.8) {
    await this.page.waitForTimeout(400);
    await this.cdp.send("Page.stopScreencast").catch(() => {});
    const duration = this.last + extraHold;
    writeFileSync(join(this.dir, "manifest.json"), JSON.stringify({ width: W, height: H, duration, fps: FPS, bitrate: BITRATE, frames: this.frames }));
    const out = join(OUT, `${this.name}.mp4`);
    execFileSync(SWIFT, [join(this.dir, "manifest.json"), out], { stdio: "inherit" });
    rmSync(this.dir, { recursive: true, force: true });
    return { out, duration };
  }

  /* --- drawing --- */
  async overlay() {
    await this.page.evaluate(OVERLAY);
  }
  async caption(text, sub = "") {
    await this.overlay();
    await this.page.evaluate(([t, s]) => {
      const c = document.getElementById("rec-cap");
      c.innerHTML = t + (s ? `<small>${s}</small>` : "");
      c.classList.add("on");
    }, [text, sub]);
  }
  async hideCaption() {
    await this.page.evaluate(() => document.getElementById("rec-cap")?.classList.remove("on"));
    await this.page.waitForTimeout(400);
  }
  async card(kicker, title, sub, ms, { poster } = {}) {
    await this.overlay();
    await this.page.evaluate(([k, t, s]) => {
      const c = document.getElementById("rec-card");
      c.innerHTML = `<img src="/favicon.svg" alt=""><div class="bar"></div><div class="k">${k}</div><h1>${t}</h1><p>${s}</p>`;
      void c.offsetWidth;
      c.classList.add("on");
    }, [kicker, title, sub]);
    await this.page.waitForTimeout(700);
    if (poster) await this.page.screenshot({ path: join(OUT, poster), type: "jpeg", quality: 80 });
    await this.page.waitForTimeout(ms);
  }
  async endCard() {
    await this.page.evaluate(() => document.getElementById("rec-card")?.classList.remove("on"));
    await this.page.waitForTimeout(600);
  }

  /* --- moving around, like a person --- */
  async glide(x, y, ms = 650) {
    const steps = Math.max(8, Math.round(ms / 16));
    const { x: x0, y: y0 } = this.mouse;
    for (let i = 1; i <= steps; i++) {
      const p = i / steps;
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      await this.page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e);
      await this.page.waitForTimeout(ms / steps);
    }
    this.mouse = { x, y };
  }
  async click(locator, { after = 900 } = {}) {
    await locator.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(250);
    const box = await locator.boundingBox();
    await this.glide(box.x + Math.min(box.width / 2, 120), box.y + box.height / 2);
    await this.page.waitForTimeout(200);
    await this.page.mouse.down();
    await this.page.waitForTimeout(90);
    await this.page.mouse.up();
    await this.page.waitForTimeout(after);
  }
  async scroll(to, ms = 1800) {
    await this.page.evaluate(
      ([target, dur]) =>
        new Promise((resolve) => {
          const start = scrollY;
          const max = document.documentElement.scrollHeight - innerHeight;
          const end = Math.max(0, Math.min(target === "end" ? max : target, max));
          const t0 = performance.now();
          const tick = (now) => {
            const p = Math.min(1, (now - t0) / dur);
            const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
            scrollTo(0, start + (end - start) * e);
            p < 1 ? requestAnimationFrame(tick) : resolve();
          };
          requestAnimationFrame(tick);
        }),
      [to, ms],
    );
  }
  async scrollTo(locator, offset = 110, ms = 1400) {
    const y = await locator.evaluate((el, off) => el.getBoundingClientRect().top + scrollY - off, offset);
    await this.scroll(y, ms);
  }
  /** Moves inside the app without a reload, so the sample account's in-memory state survives. */
  async go(path, settle = 1000) {
    await this.page.evaluate((p) => {
      history.pushState({}, "", p);
      dispatchEvent(new PopStateEvent("popstate"));
    }, path);
    await this.page.waitForTimeout(settle);
    await this.page.evaluate(() => scrollTo(0, 0));
  }
  async type(locator, text) {
    await this.click(locator, { after: 200 });
    for (const ch of text) {
      await this.page.keyboard.type(ch);
      await this.page.waitForTimeout(70);
    }
    await this.page.waitForTimeout(400);
  }
  async beat(ms) {
    await this.page.waitForTimeout(ms);
  }
}

/* ---------- the walkthroughs ---------- */

const SCENES = {
  course: async (r, page) => {
    await r.card("A free course", "4 Rivers", "Scripture-based stewardship: income, saving, investing, giving.", 2600, { poster: "course-poster.jpg" });
    await r.go("/course", 600);
    await r.endCard();
    await r.caption("Four rivers, one source", "Income, saving, investing and giving, each taught from Scripture");
    await r.beat(2200);
    await r.scroll(420, 1800);
    await r.beat(1400);

    await r.hideCaption();
    await r.go("/course/river/1/module/1", 900);
    await r.caption("Short lessons with the verses beside them", "Read in KJV, NIV, NLT or ESV, or listen to the lesson");
    await r.beat(2400);
    await r.scroll(480, 2200);
    await r.beat(1200);
    await r.caption("Check yourself as you go", "Tell us whether the lesson helped; mark it complete");
    await r.beat(1800);

    await r.hideCaption();
    await r.go("/course/river/1/quiz", 900);
    await r.caption("A short quiz after every river", "Pass them all to unlock the final exam");
    await r.beat(2600);
    await r.scroll(500, 2000);
    await r.beat(1000);

    await r.hideCaption();
    await r.go("/challenge", 1000);
    await r.caption("A 30-day challenge to put it into practice", "Small daily steps, tracked for you");
    await r.beat(2800);

    await r.hideCaption();
    await r.go("/dashboard", 1000);
    await r.caption("Your dashboard keeps it all in one place", "Progress, plus calculators for your own numbers");
    await r.beat(2200);
    await r.scrollTo(page.getByRole("heading", { name: "Calculators" }), 90, 1500);
    await r.beat(1200);
    await r.click(page.getByRole("button", { name: /Monthly budget/ }).first(), { after: 1400 });
    await r.caption("Try a budget, a savings plan or compounding", "Your numbers stay private");
    await r.beat(3000);

    await r.hideCaption();
    await r.go("/certificate", 1000);
    await r.caption("Finish the exam and earn your certificate", "Free, and checkable by anyone you share it with");
    await r.beat(3000);
    await r.hideCaption();
    await r.card("Free to start", "Begin at River 1", "No cost, no card, and it works on your phone.", 3200);
  },

  tools: async (r, page) => {
    await r.card("For the Community tracks", "Tools for your track", "Wealth management, investment banking and consulting. Practice with your own numbers.", 3200, { poster: "tools-poster.jpg" });
    await r.go("/community", 700);
    await r.endCard();
    await r.caption("Request a tools space from the Community page", "An admin approves it, and it is private to you");
    await r.beat(3200);

    // Wealth management
    await r.hideCaption();
    await r.go("/community/wealth", 1000);
    await r.caption("Wealth Tools: from discovery meeting to presentation", "Four steps, built around a student or client's own goals");
    await r.beat(3000);
    await r.hideCaption();
    await r.click(page.getByRole("button", { name: "See an example client" }), { after: 1500 });
    await r.caption("A client plan, step by step", "Goals, SWOT, risk and portfolio, labelled illustrative");
    await r.beat(2800);
    await r.scroll(620, 2000);
    await r.beat(1200);
    await r.hideCaption();
    await r.click(page.getByRole("button", { name: /Presentation/ }).first(), { after: 1400 });
    await r.caption("Turn it into a PowerPoint in one of six styles", "Private bank, research note, modern advisory and more");
    await r.beat(1800);
    await r.scrollTo(page.getByRole("heading", { name: "Style template" }), 100, 1700);
    await r.beat(3400);

    // Investment banking
    await r.hideCaption();
    await r.go("/community/ib", 1000);
    await r.caption("Investment Banking Tools", "Valuation models you build from numbers you enter");
    await r.beat(2600);
    await r.scroll(560, 2200);
    await r.beat(2200);
    await r.hideCaption();
    await r.click(page.getByRole("tab", { name: "Technical questions" }), { after: 1200 });
    await r.caption("Drill the technical questions", "Rate yourself, and see what to review next");
    await r.beat(3200);

    // Consulting
    await r.hideCaption();
    await r.go("/community/consulting", 1000);
    await r.caption("Consulting Tools: practice a case against the clock", "Pick a case type and start the timer");
    await r.beat(2800);
    await r.click(page.getByRole("button", { name: "Market entry" }), { after: 1200 });
    await r.click(page.getByRole("button", { name: "Start the case timer" }), { after: 1000 });
    await r.scroll(420, 1600);
    await r.beat(3000);

    await r.hideCaption();
    await r.card("Educational practice tools", "Built for learning", "Not investment advice, and not a valuation of any real security.", 3600);
  },
};

/* ---------- run ---------- */

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(SCENES);
const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
for (const name of names) {
  if (!SCENES[name]) throw new Error(`unknown video "${name}" (have: ${Object.keys(SCENES).join(", ")})`);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => localStorage.setItem("four-rivers:lang", "en"));
  const page = await ctx.newPage();
  await page.goto(`${BASE}/signin`);
  await page.locator('input[name="email"]').fill("demo");
  await page.locator('input[name="password"]').fill("demo");
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/course/);
  await page.waitForTimeout(800);
  const r = new Recorder(page, name);
  await r.start();
  await SCENES[name](r, page);
  const { out, duration } = await r.stop();
  console.log(`${name}: ${duration.toFixed(1)}s -> ${out}`);
  await ctx.close();
}
await browser.close();
