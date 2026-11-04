#!/usr/bin/env node
/**
 * Records the two captioned, narrated walkthrough videos on the home page ("See it in action") from the built-in sample
 * account, so they always match the real app: public/videos/{course,tools}.mp4 plus a poster image for each.
 * Needs macOS (the narration is the built-in voice, `say`; the MP4 and the soundtrack are made by the Swift files next to
 * this one) and the app running (npm run dev):
 *
 *   node tools/dev/record-walkthroughs.mjs                 # both videos, from http://localhost:5273
 *   node tools/dev/record-walkthroughs.mjs course          # just one
 *   BASE_URL=https://four-rivers.vercel.app node tools/dev/record-walkthroughs.mjs
 *   VOICE="Flo (English (US))" node tools/dev/record-walkthroughs.mjs   # another voice (`say -v '?'` lists them)
 *
 * The scenes read like a script: r.say() shows a caption and speaks a line, then the page does something while it plays.
 * To use your own recordings instead, drop files with the same names into public/videos/.
 */
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:5273";
const VOICE = process.env.VOICE ?? "Samantha";
const ROOT = new URL("../../", import.meta.url).pathname.replace(/%20/g, " ");
const OUT = join(ROOT, "public/videos");
const W = 1280;
const H = 720;
const FPS = 20;
const BITRATE = 700_000;
mkdirSync(OUT, { recursive: true });

const BIN = mkdtempSync(join(tmpdir(), "four-rivers-bin-"));
const FRAMES = join(BIN, "frames-to-mp4");
const MIX = join(BIN, "mix-audio");
execFileSync("swiftc", ["-O", join(ROOT, "tools/dev/frames-to-mp4.swift"), "-o", FRAMES], { stdio: "ignore" });
execFileSync("swiftc", ["-O", join(ROOT, "tools/dev/mix-audio.swift"), "-o", MIX], { stdio: "ignore" });

/* ---------- what gets drawn on top of the page: captions, a cursor, rings, title and end cards ---------- */

const OVERLAY = () => {
  if (document.getElementById("rec-root")) return;
  const root = document.createElement("div");
  root.id = "rec-root";
  root.innerHTML = `
    <style>
      #rec-root{position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;overflow:hidden}
      #rec-cap{position:absolute;left:50%;bottom:30px;transform:translateX(-50%);display:flex;align-items:center;gap:16px;max-width:1080px;padding:12px 30px 12px 14px;border-radius:44px;background:#fff;color:#2c2620;
        box-shadow:0 0 0 4px var(--acc),0 14px 34px rgba(30,40,60,.38);opacity:0;visibility:hidden}
      #rec-cap.on{visibility:visible;animation:rec-pop .55s cubic-bezier(.34,1.56,.64,1) forwards,rec-float 2.6s ease-in-out .55s infinite}
      #rec-cap.off{visibility:visible;animation:rec-out .3s ease-in forwards}
      @keyframes rec-pop{0%{opacity:0;transform:translateX(-50%) translateY(40px) scale(.55)}60%{opacity:1;transform:translateX(-50%) translateY(-6px) scale(1.06)}100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
      @keyframes rec-float{0%,100%{opacity:1;transform:translateX(-50%) translateY(0)}50%{opacity:1;transform:translateX(-50%) translateY(-5px)}}
      @keyframes rec-out{from{opacity:1;transform:translateX(-50%) scale(1)}to{opacity:0;transform:translateX(-50%) translateY(24px) scale(.8)}}
      #rec-cap .ic{flex:none;width:62px;height:62px;border-radius:50%;background:var(--acc);display:flex;align-items:center;justify-content:center;font-size:34px;animation:rec-bounce 1.1s ease-in-out .5s infinite}
      @keyframes rec-bounce{0%,100%{transform:translateY(0) rotate(0)}30%{transform:translateY(-9px) rotate(-8deg)}60%{transform:translateY(0) rotate(6deg)}}
      #rec-cap .tx{font-size:29px;line-height:1.2;font-weight:800;letter-spacing:-.01em}
      #rec-cap .tx .w{display:inline-block;opacity:0;animation:rec-word .42s cubic-bezier(.34,1.56,.64,1) forwards}
      @keyframes rec-word{0%{opacity:0;transform:translateY(16px) scale(.6)}100%{opacity:1;transform:none}}
      #rec-cap mark{background:linear-gradient(transparent 58%,#f7d56a 58%);color:inherit;padding:0 3px;border-radius:3px}
      #rec-cap .sb{display:block;margin-top:3px;font-size:18px;font-weight:600;color:#5c5347;opacity:0;animation:rec-sub .5s ease-out .5s forwards}
      @keyframes rec-sub{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      #rec-dot{position:absolute;left:-40px;top:-40px;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:rgba(201,162,75,.92);border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.4);transition:transform .12s}
      #rec-dot.down{transform:scale(.7)}
      .rec-ripple{position:absolute;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;border:4px solid #c9a24b;animation:rec-rip .65s ease-out forwards}
      @keyframes rec-rip{to{transform:scale(3.6);opacity:0}}
      .rec-ring{position:absolute;border:5px solid #f0b429;border-radius:16px;box-shadow:0 0 0 0 rgba(240,180,41,.7),0 0 24px rgba(240,180,41,.6);animation:rec-ring 1s ease-in-out 3,rec-ringin .35s cubic-bezier(.34,1.56,.64,1)}
      @keyframes rec-ring{0%,100%{box-shadow:0 0 0 0 rgba(240,180,41,.7),0 0 24px rgba(240,180,41,.6)}50%{box-shadow:0 0 0 12px rgba(240,180,41,0),0 0 36px rgba(240,180,41,.9)}}
      @keyframes rec-ringin{from{opacity:0;transform:scale(1.25)}to{opacity:1;transform:none}}
      #rec-card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;color:#2c2620;text-align:center;padding:0 110px;opacity:0;transition:opacity .5s;
        background:radial-gradient(circle at 18% 15%,#fff3cf 0,transparent 38%),radial-gradient(circle at 85% 85%,#d8ecf2 0,transparent 42%),#faf5ec}
      #rec-card.on{opacity:1}
      #rec-card img{width:92px;height:92px;border-radius:20px;box-shadow:0 10px 24px rgba(0,0,0,.18);animation:rec-drop .9s cubic-bezier(.34,1.56,.64,1) both}
      @keyframes rec-drop{0%{opacity:0;transform:translateY(-60px) scale(.5) rotate(-12deg)}100%{opacity:1;transform:none}}
      #rec-card .bar{width:130px;height:5px;border-radius:3px;background:linear-gradient(90deg,#2f6f4f,#1f6f8b,#3a5a9b,#c9a24b);animation:rec-grow .7s ease-out .3s both}
      @keyframes rec-grow{from{width:0}to{width:130px}}
      #rec-card .k{font-size:21px;letter-spacing:.22em;text-transform:uppercase;color:#7a5e14;font-weight:800;animation:rec-sub .5s ease-out .35s both}
      #rec-card h1{margin:0;font:700 74px/1.08 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
      #rec-card h1 .w{display:inline-block;margin:0 .13em;animation:rec-word .5s cubic-bezier(.34,1.56,.64,1) both}
      #rec-card p{margin:0;font:400 31px/1.4 "Iowan Old Style",Georgia,serif;color:#5c5347;max-width:900px;animation:rec-sub .6s ease-out 1s both}
      .rec-conf{position:absolute;top:-30px;width:14px;height:22px;border-radius:3px;animation:rec-fall linear forwards}
      @keyframes rec-fall{to{transform:translate(var(--dx),780px) rotate(var(--rot));opacity:.9}}
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

const ACCENTS = ["#2f6f4f", "#1f6f8b", "#3a5a9b", "#c9852b"]; // the four river colors

class Recorder {
  constructor(page, name) {
    this.page = page;
    this.name = name;
    this.dir = mkdtempSync(join(tmpdir(), `rec-${name}-`));
    this.frames = [];
    this.clips = [];
    this.t0 = null;
    this.wall0 = null;
    this.last = 0;
    this.mouse = { x: -40, y: -40 };
    this.speechEnd = 0;
    this.accent = 0;
    this.lines = 0;
  }

  now() {
    return (Date.now() - this.wall0) / 1000;
  }

  async start() {
    await this.page.addInitScript(OVERLAY);
    this.cdp = await this.page.context().newCDPSession(this.page);
    this.cdp.on("Page.screencastFrame", async (f) => {
      const ts = f.metadata.timestamp;
      if (this.t0 === null) {
        this.t0 = ts;
        this.wall0 = Date.now();
      }
      const t = ts - this.t0;
      const file = `f${String(this.frames.length).padStart(5, "0")}.jpg`;
      writeFileSync(join(this.dir, file), Buffer.from(f.data, "base64"));
      this.frames.push({ t, file });
      this.last = t;
      await this.cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
    });
    await this.cdp.send("Page.startScreencast", { format: "jpeg", quality: 82, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
    // A static page sends no frames, so nudge it until the first one arrives; the soundtrack is timed from there.
    while (this.t0 === null) {
      await this.page.evaluate(() => document.body.classList.toggle("rec-nudge"));
      await this.page.waitForTimeout(80);
    }
  }

  async stop(extraHold = 1.2) {
    await this.untilSpoken();
    await this.page.waitForTimeout(400);
    await this.cdp.send("Page.stopScreencast").catch(() => {});
    const duration = this.last + extraHold;
    writeFileSync(join(this.dir, "manifest.json"), JSON.stringify({ width: W, height: H, duration, fps: FPS, bitrate: BITRATE, frames: this.frames }));
    writeFileSync(join(this.dir, "audio.json"), JSON.stringify({ duration, bpm: this.bpm ?? 96, root: this.root ?? 0, clips: this.clips }));
    execFileSync(MIX, [join(this.dir, "audio.json"), join(this.dir, "mix.wav")], { stdio: "ignore" });
    execFileSync("afconvert", [join(this.dir, "mix.wav"), join(this.dir, "mix.m4a"), "-f", "m4af", "-d", "aac", "-b", "96000"], { stdio: "ignore" });
    const out = join(OUT, `${this.name}.mp4`);
    execFileSync(FRAMES, [join(this.dir, "manifest.json"), out, join(this.dir, "mix.m4a")], { stdio: "ignore" });
    rmSync(this.dir, { recursive: true, force: true });
    return { out, duration };
  }

  /* --- voice and captions --- */
  /** Speaks `line` and shows the caption together; returns at once so the page can do something while it plays. */
  async say(icon, text, sub, line) {
    await this.untilSpoken();
    const file = join(this.dir, `v${this.lines++}.wav`);
    execFileSync("say", ["-v", VOICE, "-r", "182", "-o", file, "--data-format=LEI16@44100", line]);
    const info = execFileSync("afinfo", [file]).toString();
    const secs = Number(/estimated duration: ([\d.]+)/.exec(info)?.[1] ?? 3);
    await this.caption(icon, text, sub);
    const t = this.now();
    this.clips.push({ t, file });
    this.speechEnd = t + secs;
  }
  async untilSpoken(gap = 0.35) {
    const wait = this.speechEnd + gap - this.now();
    if (this.wall0 !== null && wait > 0) await this.page.waitForTimeout(wait * 1000);
  }
  async caption(icon, text, sub = "") {
    await this.overlay();
    const acc = ACCENTS[this.accent++ % ACCENTS.length];
    await this.page.evaluate(([i, t, s, a]) => {
      const c = document.getElementById("rec-cap");
      c.style.setProperty("--acc", a);
      c.className = "";
      let n = 0;
      const words = t
        .split(/(\*[^*]+\*|\s+)/)
        .filter((x) => x && !/^\s+$/.test(x))
        .map((w) => {
          const hl = w.startsWith("*");
          return `<span class="w" style="animation-delay:${0.12 + n++ * 0.07}s">${hl ? `<mark>${w.slice(1, -1)}</mark>` : w}</span>`;
        })
        .join(" ");
      c.innerHTML = `<div class="ic">${i}</div><div><div class="tx">${words}</div>${s ? `<span class="sb">${s}</span>` : ""}</div>`;
      void c.offsetWidth;
      c.className = "on";
    }, [icon, text, sub, acc]);
  }
  async hideCaption() {
    await this.page.evaluate(() => {
      const c = document.getElementById("rec-cap");
      if (c) c.className = "off";
    });
    await this.page.waitForTimeout(350);
  }
  async card(kicker, title, sub, line, { poster, confetti } = {}) {
    await this.untilSpoken();
    await this.overlay();
    const file = join(this.dir, `v${this.lines++}.wav`);
    execFileSync("say", ["-v", VOICE, "-r", "182", "-o", file, "--data-format=LEI16@44100", line]);
    const secs = Number(/estimated duration: ([\d.]+)/.exec(execFileSync("afinfo", [file]).toString())?.[1] ?? 3);
    await this.page.evaluate(([k, t, s]) => {
      const c = document.getElementById("rec-card");
      const words = t.split(" ").map((w, i) => `<span class="w" style="animation-delay:${0.45 + i * 0.12}s">${w}</span>`).join(" ");
      c.innerHTML = `<img src="/favicon.svg" alt=""><div class="bar"></div><div class="k">${k}</div><h1>${words}</h1><p>${s}</p>`;
      void c.offsetWidth;
      c.classList.add("on");
    }, [kicker, title, sub]);
    if (confetti) await this.confetti();
    await this.page.waitForTimeout(1500);
    if (poster) await this.page.screenshot({ path: join(OUT, poster), type: "jpeg", quality: 80 });
    const t = this.now();
    this.clips.push({ t, file });
    this.speechEnd = t + secs;
    await this.untilSpoken(0.5);
  }
  async hideCard() {
    await this.page.evaluate(() => document.getElementById("rec-card")?.classList.remove("on"));
    await this.page.waitForTimeout(600);
  }
  async confetti() {
    await this.page.evaluate(() => {
      const root = document.getElementById("rec-root");
      const colors = ["#2f6f4f", "#1f6f8b", "#3a5a9b", "#c9852b", "#f0b429", "#d9534f"];
      for (let i = 0; i < 70; i++) {
        const s = document.createElement("div");
        s.className = "rec-conf";
        s.style.left = Math.random() * 100 + "%";
        s.style.background = colors[i % colors.length];
        s.style.setProperty("--dx", Math.random() * 160 - 80 + "px");
        s.style.setProperty("--rot", Math.random() * 900 - 450 + "deg");
        s.style.animationDuration = 1.8 + Math.random() * 1.6 + "s";
        s.style.animationDelay = Math.random() * 0.8 + "s";
        root.appendChild(s);
        setTimeout(() => s.remove(), 4200);
      }
    });
  }
  /** A pulsing ring around something worth noticing. */
  async ring(locator, ms = 2800, pad = 8) {
    const box = await locator.boundingBox();
    if (!box) return;
    await this.page.evaluate(([b, p, t]) => {
      const r = document.createElement("div");
      r.className = "rec-ring";
      Object.assign(r.style, { left: b.x - p + "px", top: b.y - p + "px", width: b.width + p * 2 + "px", height: b.height + p * 2 + "px" });
      document.getElementById("rec-root").appendChild(r);
      setTimeout(() => r.remove(), t);
    }, [box, pad, ms]);
  }
  async overlay() {
    await this.page.evaluate(OVERLAY);
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
      await this.page.waitForTimeout(65);
    }
    await this.page.waitForTimeout(350);
  }
  async beat(ms) {
    await this.page.waitForTimeout(ms);
  }
}

/* ---------- the walkthroughs ---------- */

const SCENES = {
  course: async (r, page) => {
    r.bpm = 96;
    r.root = 0; // C
    await r.card("A free course", "4 Rivers", "Scripture-based stewardship: income, saving, investing, giving.", "Welcome to 4 Rivers! A free course that teaches money the way Scripture does.", { poster: "course-poster.jpg" });
    await r.go("/course", 600);
    await r.hideCard();

    await r.say("🌊", "Four rivers, one *source*", "Income, saving, investing and giving", "Four rivers: income, saving, investing, and giving. Each one flows from a single source.");
    await r.beat(1500);
    await r.scroll(420, 2400);
    await r.untilSpoken();

    await r.hideCaption();
    await r.go("/course/river/1/module/1", 900);
    await r.say("📖", "Short lessons with the *verses* beside them", "KJV, NIV, NLT or ESV, or listen along", "Every lesson is short, with the Scripture right beside it, in the Bible version you like. You can even listen along.");
    await r.beat(1200);
    await r.scroll(480, 2600);
    await r.untilSpoken();
    await r.say("✅", "Tap to *check yourself*", "Did it help? Mark it complete", "Tell us if it helped, then mark it complete.");
    await r.ring(page.getByRole("button", { name: /Completed|Mark/ }).first(), 2200).catch(() => {});
    await r.untilSpoken();

    await r.hideCaption();
    await r.go("/course/river/1/quiz", 900);
    await r.say("🧠", "A quick quiz after every *river*", "Pass them all to unlock the final exam", "A quick quiz after every river keeps it fresh. Pass them all to unlock the final exam.");
    await r.beat(1200);
    await r.scroll(500, 2600);
    await r.untilSpoken();

    await r.hideCaption();
    await r.go("/challenge", 1000);
    await r.say("🔥", "A *30-day* challenge", "Small daily steps, tracked for you", "Then put it into practice with a thirty day challenge. Small steps, every day. Watch that streak grow!");
    await r.untilSpoken();

    await r.hideCaption();
    await r.go("/dashboard", 1000);
    await r.say("📊", "Your *dashboard*, all in one place", "Progress plus calculators for your own numbers", "Your dashboard keeps everything in one place, with calculators for your own numbers.");
    await r.beat(1400);
    await r.scrollTo(page.getByRole("heading", { name: "Calculators" }), 90, 1600);
    await r.untilSpoken();
    await r.say("🧮", "Try a budget, savings or *compounding*", "Your numbers stay private", "Try a budget, a savings plan, or compound growth. Your numbers stay private.");
    await r.click(page.getByRole("button", { name: /Monthly budget/ }).first(), { after: 900 });
    await r.untilSpoken();

    await r.hideCaption();
    await r.go("/certificate", 1000);
    await r.say("🎓", "Finish the exam, earn your *certificate*", "Free, and anyone can verify it", "Finish the final exam and earn your certificate. It's free, and anyone can verify it.");
    await r.ring(page.locator("main").getByRole("img").first(), 2000).catch(() => {});
    await r.untilSpoken();

    // The community
    await r.hideCaption();
    await r.go("/community", 1000);
    await r.say("🤝", "You don't have to do it *alone*", "Join a group with a 4-digit code", "And you don't have to do it alone! Join a group with a four digit code from your leader.");
    await r.beat(1500);
    await r.ring(page.locator('input[inputmode="numeric"], input[name="code"]').first(), 2200).catch(() => {});
    await r.untilSpoken();
    await r.hideCaption();
    await r.go("/community/demo-group-1", 1000);
    await r.say("💬", "Read, chat and *pray* together", "One verse a day, shared with your group", "Your group reads the same verse each day, cheers each other on in the chat, and keeps a prayer wall.");
    await r.beat(1500);
    await r.scrollTo(page.getByRole("heading", { name: "Group chat" }), 90, 1500);
    const box = page.getByRole("textbox").first();
    await r.type(box, "Just finished River 2! 🙌");
    await page.keyboard.press("Enter");
    await r.untilSpoken();
    await r.say("🙏", "Lift each other *up*", "Share a request; tap I prayed", "Share a prayer request, and tap I prayed to let someone know you're with them.");
    await r.scrollTo(page.getByRole("heading", { name: "Prayer wall" }), 90, 1500);
    await r.click(page.getByRole("button", { name: "I prayed" }).first(), { after: 600 }).catch(() => {});
    await r.untilSpoken();

    await r.hideCaption();
    await r.card("Free to start", "Begin at River 1 🌊", "No cost, no card, and it works on your phone.", "It's free to start. Begin at River 1 today!", { confetti: true });
  },

  tools: async (r, page) => {
    r.bpm = 104;
    r.root = 7; // G
    await r.card("For the Community tracks", "Tools for your track", "Wealth management, investment banking and consulting. Practice with your own numbers.", "Headed toward wealth management, investment banking, or consulting? Here are the tools for your track!", { poster: "tools-poster.jpg" });
    await r.go("/community", 700);
    await r.hideCard();

    await r.say("🔑", "Request your *tools space*", "An admin approves it; it's private to you", "Request a tools space from the Community page. An admin approves it, and what you enter stays private to you.");
    await r.beat(1500);
    await r.scroll(300, 2200);
    await r.untilSpoken();

    // Wealth management
    await r.hideCaption();
    await r.go("/community/wealth", 1000);
    await r.say("💼", "Wealth Tools: discovery to *presentation*", "Four steps, built around a client's own goals", "Wealth Tools walks you from a discovery meeting all the way to a client plan, built around a client's own goals.");
    await r.beat(2000);
    await r.ring(page.getByRole("button", { name: "See an example client" }), 2000).catch(() => {});
    await r.untilSpoken();
    await r.click(page.getByRole("button", { name: "See an example client" }), { after: 1500 });
    await r.say("🧭", "A client plan, step by *step*", "Goals, SWOT, risk and portfolio, labelled illustrative", "Walk through goals, strengths and weaknesses, risk, and portfolio, all labelled as illustrative.");
    await r.beat(1000);
    await r.scroll(620, 2600);
    await r.untilSpoken();
    await r.hideCaption();
    await r.click(page.getByRole("button", { name: /Presentation/ }).first(), { after: 1400 });
    await r.say("🎨", "A PowerPoint in *six styles*", "Private bank, research note, modern advisory and more", "Then turn it into a PowerPoint, in one of six styles, from private bank to research note.");
    await r.beat(1000);
    await r.scrollTo(page.getByRole("heading", { name: "Style template" }), 100, 1800);
    await r.ring(page.getByRole("heading", { name: "Style template" }), 2400, 10).catch(() => {});
    await r.untilSpoken();

    // Investment banking
    await r.hideCaption();
    await r.go("/community/ib", 1000);
    await r.say("📈", "Banking *valuation* models", "DCF, comparables, LBO and a football field", "Investment Banking Tools has valuation models you build from your own numbers, like a D C F, and a football field.");
    await r.beat(1200);
    await r.scroll(560, 2800);
    await r.untilSpoken();
    await r.hideCaption();
    await r.click(page.getByRole("tab", { name: "Technical questions" }), { after: 1200 });
    await r.say("🧠", "Drill the *technical* questions", "Rate yourself and see what to review next", "Then drill the technical questions. Rate yourself, and see what to review next.");
    await r.untilSpoken();

    // Consulting
    await r.hideCaption();
    await r.go("/community/consulting", 1000);
    await r.say("⏱️", "Consulting: practice *against the clock*", "Pick a case type and start the timer", "Consulting Tools has case frameworks and a timed practice case. Pick a type, start the timer, and think out loud.");
    await r.beat(1800);
    await r.click(page.getByRole("button", { name: "Market entry" }), { after: 1200 });
    await r.click(page.getByRole("button", { name: "Start the case timer" }), { after: 800 });
    await r.scroll(420, 1800);
    await r.untilSpoken();

    await r.hideCaption();
    await r.card("Educational practice tools", "Built for learning", "Not investment advice, and not a valuation of any real security.", "These are educational practice tools, built for learning. They're not investment advice. Go practice!", { confetti: true });
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
rmSync(BIN, { recursive: true, force: true });
