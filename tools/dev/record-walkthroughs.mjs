#!/usr/bin/env node
/**
 * Records the two captioned walkthrough videos on the home page ("See it in action") from the built-in sample account,
 * so they always match the real app: public/videos/{course,tools}.mp4 plus a poster image for each.
 *
 * How they are made: the app is driven in a real browser while a drawn layer sits on top of it: the rest of the screen
 * dims, a ring marks the part being discussed, a callout with a drawn icon sits beside it and an arrow joins the two.
 * Cuts between pages are varied (river-color wipe, push, iris, chapter title, dissolve, or a real click), land on the beat
 * of the soundtrack, and the picture pushes in on whatever is highlighted.
 *
 * Needs macOS (the MP4 and the soundtrack are made by the Swift files next to this one) and the app running (npm run dev):
 *
 *   node tools/dev/record-walkthroughs.mjs                      # both videos, from http://localhost:5273
 *   node tools/dev/record-walkthroughs.mjs course               # just one
 *   SOUND=house node tools/dev/record-walkthroughs.mjs tools    # another soundtrack (see tools/dev/soundtracks.mjs)
 *   BASE_URL=https://four-rivers.vercel.app node tools/dev/record-walkthroughs.mjs
 *
 * The scenes read like a script: r.focus(target, { icon, title, sub }) lights up one part of the screen; r.transition()
 * moves to the next page. To use your own recordings instead, drop files with the same names into public/videos/.
 */
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULTS, SOUNDTRACKS } from "./soundtracks.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:5273";
const ROOT = new URL("../../", import.meta.url).pathname.replace(/%20/g, " ");
const OUT = join(ROOT, "public/videos");
const W = 1280;
const H = 720;
const DPR = Number(process.env.DPR ?? 1.5); // recorded larger than shown, so the push-ins stay sharp
const FPS = 24;
const BITRATE = 850_000;
mkdirSync(OUT, { recursive: true });

const BIN = mkdtempSync(join(tmpdir(), "four-rivers-bin-"));
const FRAMES = join(BIN, "frames-to-mp4");
const MIX = join(BIN, "mix-audio");
execFileSync("swiftc", ["-O", join(ROOT, "tools/dev/frames-to-mp4.swift"), "-o", FRAMES], { stdio: "ignore" });
execFileSync("swiftc", ["-O", join(ROOT, "tools/dev/mix-audio.swift"), "-o", MIX], { stdio: "ignore" });

/* ---------- the drawn layer (runs inside the page) ---------- */

const OVERLAY = () => {
  if (document.getElementById("rec-root")) return;
  const NS = "http://www.w3.org/2000/svg";
  const ACC = ["#2f6f4f", "#1f6f8b", "#3a5a9b", "#b9791f"]; // the four river colors
  // Line icons, drawn here (24 x 24, stroked).
  const ICONS = {
    waves: '<path d="M3 7.5c2-1.8 4-1.8 6 0s4 1.8 6 0 4-1.8 6 0"/><path d="M3 12c2-1.8 4-1.8 6 0s4 1.8 6 0 4-1.8 6 0"/><path d="M3 16.5c2-1.8 4-1.8 6 0s4 1.8 6 0 4-1.8 6 0"/>',
    book: '<path d="M4 5.5c2.6-1 5.4-.8 8 .8 2.6-1.6 5.4-1.8 8-.8v13c-2.6-1-5.4-.8-8 .8-2.6-1.6-5.4-1.8-8-.8z"/><path d="M12 6.3v13"/>',
    headphones: '<path d="M5 15v-3a7 7 0 0 1 14 0v3"/><rect x="4" y="14" width="3.5" height="6" rx="1.2"/><rect x="16.5" y="14" width="3.5" height="6" rx="1.2"/>',
    check: '<circle cx="12" cy="12" r="8.5"/><path d="M8.2 12.3l2.7 2.7 5-5.5"/>',
    question: '<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.6a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.6"/><path d="M12 16.9h.01"/>',
    flame: '<path d="M12 3c.8 3 4.2 4.8 4.2 9a4.2 4.2 0 0 1-8.4 0c0-1.8.8-3 1.8-4 .2 1.6 1 2.3 1.8 2.5C11.4 8.6 11.2 5.8 12 3z"/>',
    chart: '<path d="M4 20h16"/><rect x="5.5" y="11" width="3" height="9" rx=".6"/><rect x="10.5" y="5" width="3" height="15" rx=".6"/><rect x="15.5" y="8.5" width="3" height="11.5" rx=".6"/>',
    calculator: '<rect x="5.5" y="3" width="13" height="18" rx="2"/><path d="M8.5 7h7M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01"/>',
    seal: '<circle cx="12" cy="9.5" r="5.5"/><path d="M9 14.5L7.5 21l4.5-2.5 4.5 2.5-1.5-6.5"/>',
    people: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.4-3 2.7-4.8 5.5-4.8s5.1 1.8 5.5 4.8"/><circle cx="17" cy="9.5" r="2.3"/><path d="M16.5 14.3c2.3-.2 4 1.2 4.3 3.7"/>',
    chat: '<path d="M4 5.5h16v10.5H11l-4.5 3.5V16H4z"/>',
    heart: '<path d="M12 19.5s-7-4.3-7-9.7A3.9 3.9 0 0 1 12 7.5a3.9 3.9 0 0 1 7 2.3c0 5.4-7 9.7-7 9.7z"/>',
    key: '<circle cx="8" cy="12" r="3.5"/><path d="M11.5 12H21M17.5 12v3M20.5 12v2.5"/>',
    briefcase: '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5v-2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3.5 13h17"/>',
    compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    slides: '<rect x="3" y="4.5" width="18" height="12" rx="1.5"/><path d="M8 20.5h8M12 16.5v4"/>',
    trend: '<path d="M3.5 17l6-6 4 4 7-8"/><path d="M15 7h5.5v5.5"/>',
    bulb: '<path d="M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/>',
    stopwatch: '<circle cx="12" cy="13.5" r="7"/><path d="M12 13.5v-4M9.5 3h5M12 3v3.5"/>',
    shield: '<path d="M12 3l7.5 2.8v5.7c0 4.6-3.2 7.8-7.5 9.5-4.3-1.7-7.5-4.9-7.5-9.5V5.8z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
    dot: '<circle cx="12" cy="12" r="3"/>',
  };
  const icon = (name, size = 26, sw = 1.9) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="#fff" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] ?? ICONS.dot}</svg>`;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const root = document.createElement("div");
  root.id = "rec-root";
  root.innerHTML = `
    <style>
      #rec-root{position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;overflow:hidden}
      #rec-root svg{display:block}
      #rec-dim{position:absolute;inset:0;width:100%;height:100%}
      #rec-dimrect{opacity:0;transition:opacity .45s}
      .ring{position:absolute;box-sizing:border-box;border:3px solid #f0b429;opacity:0;transition:left .6s cubic-bezier(.4,0,.2,1),top .6s cubic-bezier(.4,0,.2,1),width .6s cubic-bezier(.4,0,.2,1),height .6s cubic-bezier(.4,0,.2,1),opacity .35s}
      .ring.on{opacity:1;animation:rec-ringin .5s cubic-bezier(.34,1.4,.64,1)}
      .ring::after{content:"";position:absolute;inset:-3px;border-radius:inherit;animation:rec-pulse 1.6s ease-out infinite}
      @keyframes rec-ringin{from{transform:scale(1.04)}to{transform:none}}
      @keyframes rec-pulse{0%{box-shadow:0 0 0 0 rgba(240,180,41,.65)}100%{box-shadow:0 0 0 16px rgba(240,180,41,0)}}
      .ring .num{position:absolute;left:-17px;top:-17px;width:34px;height:34px;border-radius:50%;background:#f0b429;color:#2c2620;font:800 18px/34px -apple-system,sans-serif;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,.35);animation:rec-numpop .5s cubic-bezier(.34,1.56,.64,1) .25s both}
      @keyframes rec-numpop{from{transform:scale(0)}to{transform:scale(1)}}
      #rec-arrows{position:absolute;inset:0;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 2px 5px rgba(0,0,0,.45))}
      #rec-arrows path{fill:none;stroke:#fff;stroke-width:3.5;stroke-linecap:round}
      #rec-arrows .head{fill:#fff;stroke:#fff;stroke-width:2;stroke-linejoin:round;opacity:0;animation:rec-fade .2s ease-out .72s forwards}
      #rec-arrows .line{stroke-dasharray:var(--len);stroke-dashoffset:var(--len);animation:rec-draw .45s cubic-bezier(.4,0,.2,1) .3s forwards}
      @keyframes rec-draw{to{stroke-dashoffset:0}}
      @keyframes rec-fade{to{opacity:1}}
      #rec-call{position:absolute;display:flex;align-items:flex-start;gap:14px;width:max-content;padding:15px 22px 16px 15px;border-radius:16px;background:#fff;color:#2c2620;border-top:4px solid var(--acc);
        box-shadow:0 20px 44px rgba(10,20,36,.45),0 0 0 1px rgba(0,0,0,.05);opacity:0;visibility:hidden}
      #rec-call.on{visibility:visible;animation:rec-callin .55s cubic-bezier(.22,1.3,.5,1) forwards}
      #rec-call.off{visibility:visible;animation:rec-callout .28s ease-in forwards}
      @keyframes rec-callin{0%{opacity:0;transform:translateY(14px) scale(.9)}100%{opacity:1;transform:none}}
      @keyframes rec-callout{from{opacity:1}to{opacity:0;transform:scale(.95)}}
      #rec-call .ic{flex:none;width:48px;height:48px;border-radius:50%;background:var(--acc);display:flex;align-items:center;justify-content:center;animation:rec-icpop .6s cubic-bezier(.34,1.56,.64,1) .12s both}
      @keyframes rec-icpop{from{transform:scale(.3) rotate(-30deg)}to{transform:none}}
      #rec-call .tx{font-size:24px;line-height:1.18;font-weight:800;letter-spacing:-.01em}
      #rec-call .w{display:inline-block;opacity:0;animation:rec-word .4s cubic-bezier(.34,1.4,.64,1) forwards}
      @keyframes rec-word{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
      #rec-call mark{background:linear-gradient(transparent 62%,rgba(240,180,41,.6) 62%);color:inherit;padding:0 2px}
      #rec-call .sb{margin-top:5px;font-size:16.5px;line-height:1.3;font-weight:600;color:#5c5347;opacity:0;animation:rec-word .5s ease-out .5s forwards}
      #rec-trk{position:absolute;right:20px;bottom:18px;display:flex;align-items:center;gap:10px;padding:7px 14px 7px 12px;border-radius:999px;background:rgba(255,255,255,.94);box-shadow:0 6px 18px rgba(10,20,36,.28);font:700 13px/1 -apple-system,sans-serif;color:#2c2620;opacity:0;transition:opacity .4s}
      #rec-trk.on{opacity:1}
      #rec-trk .seg{display:flex;gap:4px}
      #rec-trk .seg i{display:block;width:16px;height:5px;border-radius:3px;background:#d9cfbb;transition:background .3s}
      #rec-trk .seg i.on{background:var(--acc)}
      #rec-dot{position:absolute;left:-40px;top:-40px;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;background:rgba(240,180,41,.95);border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.4);transition:transform .12s}
      #rec-dot.down{transform:scale(.7)}
      .rec-ripple{position:absolute;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;border:4px solid #f0b429;animation:rec-rip .6s ease-out forwards}
      @keyframes rec-rip{to{transform:scale(3.4);opacity:0}}
      #rec-fx{position:absolute;inset:0}
      #rec-fx .band{position:absolute;left:0;width:100%}
      #rec-fx .panel{position:absolute;inset:0;background:radial-gradient(circle at 20% 20%,#2c5a86 0,transparent 55%),#1f3f60;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#fff;text-align:center}
      #rec-fx .panel .ic{width:92px;height:92px;border-radius:50%;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;animation:rec-icpop .55s cubic-bezier(.34,1.56,.64,1) both}
      #rec-fx .panel .k{font:700 16px/1 -apple-system,sans-serif;letter-spacing:.3em;text-transform:uppercase;color:#f3d58a;animation:rec-word .4s ease-out .1s both}
      #rec-fx .panel .t{font:700 66px/1.1 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;animation:rec-word .45s cubic-bezier(.34,1.4,.64,1) .18s both}
      #rec-fx .panel .rule{display:flex;gap:6px;animation:rec-word .4s ease-out .3s both}
      #rec-fx .panel .rule i{display:block;width:44px;height:5px;border-radius:3px}
      #rec-card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#2c2620;text-align:center;padding:0 110px;opacity:0;transition:opacity .5s;
        background:radial-gradient(circle at 18% 15%,#fff3cf 0,transparent 38%),radial-gradient(circle at 85% 85%,#d8ecf2 0,transparent 42%),#faf5ec}
      #rec-card.on{opacity:1}
      #rec-card img{width:92px;height:92px;border-radius:20px;box-shadow:0 10px 24px rgba(0,0,0,.18);animation:rec-drop .9s cubic-bezier(.34,1.56,.64,1) both}
      @keyframes rec-drop{0%{opacity:0;transform:translateY(-60px) scale(.5) rotate(-12deg)}100%{opacity:1;transform:none}}
      #rec-card .wave path{fill:none;stroke-width:3.5;stroke-linecap:round;stroke-dasharray:420;stroke-dashoffset:420;animation:rec-draw2 1.1s cubic-bezier(.4,0,.2,1) .3s forwards}
      @keyframes rec-draw2{to{stroke-dashoffset:0}}
      #rec-card .k{font-size:21px;letter-spacing:.22em;text-transform:uppercase;color:#7a5e14;font-weight:800;animation:rec-word .5s ease-out .35s both}
      #rec-card h1{margin:0;font:700 74px/1.08 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
      #rec-card h1 .w{display:inline-block;margin:0 .12em;animation:rec-word .5s cubic-bezier(.34,1.4,.64,1) both}
      #rec-card p{margin:0;font:400 31px/1.4 "Iowan Old Style",Georgia,serif;color:#5c5347;max-width:900px;animation:rec-word .6s ease-out 1s both}
      .rec-conf{position:absolute;top:-30px;width:14px;height:22px;border-radius:3px;animation:rec-fall linear forwards}
      @keyframes rec-fall{to{transform:translate(var(--dx),780px) rotate(var(--rot));opacity:.9}}
    </style>
    <svg id="rec-dim"><defs><mask id="rec-mask"><rect width="100%" height="100%" fill="#fff"/><g id="rec-holes"></g></mask></defs>
      <rect id="rec-dimrect" width="100%" height="100%" fill="#0e1a2b" mask="url(#rec-mask)"/></svg>
    <div id="rec-rings"></div><svg id="rec-arrows"></svg><div id="rec-call"></div><div id="rec-trk"></div><div id="rec-dot"></div><div id="rec-fx"></div><div id="rec-card"></div>`;
  document.documentElement.appendChild(root);
  const $ = (id) => document.getElementById(id);
  let accIdx = 0;
  let radius = 14;

  addEventListener("mousemove", (e) => {
    const d = $("rec-dot");
    if (d) {
      d.style.left = e.clientX + "px";
      d.style.top = e.clientY + "px";
    }
  }, true);
  addEventListener("mousedown", (e) => {
    $("rec-dot")?.classList.add("down");
    const r = document.createElement("div");
    r.className = "rec-ripple";
    r.style.left = e.clientX + "px";
    r.style.top = e.clientY + "px";
    $("rec-root")?.appendChild(r);
    setTimeout(() => r.remove(), 700);
  }, true);
  addEventListener("mouseup", () => $("rec-dot")?.classList.remove("down"), true);

  // The dimmed screen has a hole under every ring; the holes follow the rings while they glide.
  const follow = () => {
    const rings = [...$("rec-rings").children];
    const holes = $("rec-holes");
    rings.forEach((el, i) => {
      let h = holes.children[i];
      if (!h) {
        h = document.createElementNS(NS, "rect");
        h.setAttribute("fill", "#000");
        holes.appendChild(h);
      }
      if (!el.classList.contains("on")) {
        h.setAttribute("width", 0);
        h.setAttribute("height", 0);
        return;
      }
      const b = el.getBoundingClientRect();
      h.setAttribute("x", b.x);
      h.setAttribute("y", b.y);
      h.setAttribute("width", b.width);
      h.setAttribute("height", b.height);
      h.setAttribute("rx", radius);
    });
    requestAnimationFrame(follow);
  };
  requestAnimationFrame(follow);

  const unionOf = (rs) => {
    const x = Math.min(...rs.map((r) => r.x)), y = Math.min(...rs.map((r) => r.y));
    return { x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y };
  };
  const hits = (a, b, m = 10) => a.x < b.x + b.w + m && a.x + a.w > b.x - m && a.y < b.y + b.h + m && a.y + a.h > b.y - m;

  const rec = {
    /** Dims everything but the rects, rings them, and puts a callout beside them (with an arrow, if it fits). Returns the area used. */
    focus(cfg) {
      const { rects = [], icon: ic = "dot", title = "", sub = "", side = "auto", pos = null, dim = 0.5, pad = 10, n = null, accent = null, gap = 64, maxW = null } = cfg;
      radius = cfg.radius ?? 14;
      const acc = accent ?? ACC[accIdx++ % ACC.length];
      const spots = rects.map((r) => ({ x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 }));
      const ringsEl = $("rec-rings");
      while (ringsEl.children.length < spots.length) ringsEl.appendChild(Object.assign(document.createElement("div"), { className: "ring" }));
      [...ringsEl.children].forEach((el, i) => {
        const s = spots[i];
        if (!s) {
          el.classList.remove("on");
          el.dataset.fresh = "1";
          return;
        }
        const fresh = el.dataset.fresh === "1" || !el.classList.contains("on");
        if (fresh) el.style.transition = "none"; // appear in place instead of gliding in from the last page
        Object.assign(el.style, { left: s.x + "px", top: s.y + "px", width: s.w + "px", height: s.h + "px", borderRadius: radius + "px" });
        if (fresh) {
          void el.offsetWidth;
          el.style.transition = "";
          el.dataset.fresh = "0";
        }
        const label = n === "auto" ? (spots.length > 1 ? String(i + 1) : "") : Array.isArray(n) ? n[i] : spots.length === 1 && n ? String(n) : "";
        el.innerHTML = label ? `<span class="num">${label}</span>` : "";
        el.classList.add("on");
      });
      $("rec-dimrect").style.opacity = spots.length ? String(dim) : "0";

      // callout
      const call = $("rec-call");
      call.style.setProperty("--acc", acc);
      call.className = "";
      let wi = 0;
      const words = title
        .split(/(\*[^*]+\*|\s+)/)
        .filter((x) => x && !/^\s+$/.test(x))
        .map((w) => `<span class="w" style="animation-delay:${0.1 + wi++ * 0.06}s">${w.startsWith("*") ? `<mark>${w.slice(1, -1)}</mark>` : w}</span>`)
        .join(" ");
      call.innerHTML = `<div class="ic">${icon(ic)}</div><div><div class="tx">${words}</div>${sub ? `<div class="sb">${sub}</div>` : ""}</div>`;

      const M = 24, G = gap, VW = innerWidth, VH = innerHeight;
      const U = spots.length ? unionOf(spots) : null;
      let placed = null;
      for (const mw of maxW ? [maxW] : [450, 340]) {
        call.style.maxWidth = mw + "px";
        call.style.left = "-3000px";
        call.style.top = "0";
        const cw = call.offsetWidth, ch = call.offsetHeight;
        const inView = (x, y) => x >= M && y >= M && x + cw <= VW - M && y + ch <= VH - M - 40;
        const corners = { tl: [M, 84], tr: [VW - M - cw, 84], bl: [M, VH - M - ch - 40], br: [VW - M - cw, VH - M - ch - 40], bc: [(VW - cw) / 2, VH - ch - 52], tc: [(VW - cw) / 2, 84] };
        if (pos && corners[pos]) {
          placed = { x: corners[pos][0], y: corners[pos][1], cw, ch, arrow: false };
          break;
        }
        if (!U) {
          placed = { x: corners.bc[0], y: corners.bc[1], cw, ch, arrow: false };
          break;
        }
        const order = [...new Set([side, "right", "left", "bottom", "top"].filter((s) => s && s !== "auto"))];
        for (const s of order) {
          let x, y;
          if (s === "right") { x = U.x + U.w + G; y = U.y + U.h / 2 - ch / 2; }
          else if (s === "left") { x = U.x - G - cw; y = U.y + U.h / 2 - ch / 2; }
          else if (s === "bottom") { x = U.x + U.w / 2 - cw / 2; y = U.y + U.h + G; }
          else { x = U.x + U.w / 2 - cw / 2; y = U.y - G - ch; }
          x = Math.min(Math.max(x, M), VW - M - cw);
          y = Math.min(Math.max(y, M), VH - M - ch - 40);
          if (!inView(x, y)) continue;
          if (spots.some((sp) => hits({ x, y, w: cw, h: ch }, sp, 6))) continue;
          placed = { x, y, cw, ch, arrow: true, side: s };
          break;
        }
        if (placed) break;
      }
      if (!placed) {
        const cw = call.offsetWidth, ch = call.offsetHeight;
        const spots2 = spots.length ? spots : [{ x: 0, y: 0, w: 0, h: 0 }];
        const tries = [[(VW - cw) / 2, VH - ch - 52], [(VW - cw) / 2, 84], [VW - 24 - cw, VH - ch - 64], [24, VH - ch - 64]];
        const free = tries.find(([x, y]) => !spots2.some((sp) => hits({ x, y, w: cw, h: ch }, sp, 6)));
        const [x, y] = free ?? tries[0];
        placed = { x, y, cw, ch, arrow: false };
      }
      call.style.left = placed.x + "px";
      call.style.top = placed.y + "px";
      void call.offsetWidth;
      call.className = "on";

      // arrow
      const arrows = $("rec-arrows");
      arrows.innerHTML = "";
      if (placed.arrow && U) {
        const c = { x: placed.x, y: placed.y, w: placed.cw, h: placed.ch };
        const cc = { x: c.x + c.w / 2, y: c.y + c.h / 2 };
        const target = spots.reduce((best, sp) => {
          const d = Math.hypot(sp.x + sp.w / 2 - cc.x, sp.y + sp.h / 2 - cc.y);
          return !best || d < best.d ? { sp, d } : best;
        }, null).sp;
        const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));
        let s, e;
        if (placed.side === "right") { s = [c.x, cc.y]; e = [target.x + target.w + 8, clamp(cc.y, target.y + 16, target.y + target.h - 16)]; }
        else if (placed.side === "left") { s = [c.x + c.w, cc.y]; e = [target.x - 8, clamp(cc.y, target.y + 16, target.y + target.h - 16)]; }
        else if (placed.side === "bottom") { s = [cc.x, c.y]; e = [clamp(cc.x, target.x + 16, target.x + target.w - 16), target.y + target.h + 8]; }
        else { s = [cc.x, c.y + c.h]; e = [clamp(cc.x, target.x + 16, target.x + target.w - 16), target.y - 8]; }
        const mid = [(s[0] + e[0]) / 2, (s[1] + e[1]) / 2];
        const dx = e[0] - s[0], dy = e[1] - s[1], len = Math.hypot(dx, dy) || 1;
        const bend = 26 * (placed.side === "right" || placed.side === "bottom" ? 1 : -1);
        const ctrl = [mid[0] - (dy / len) * bend, mid[1] + (dx / len) * bend];
        const path = document.createElementNS(NS, "path");
        path.setAttribute("class", "line");
        path.setAttribute("d", `M${s[0]},${s[1]} Q${ctrl[0]},${ctrl[1]} ${e[0]},${e[1]}`);
        arrows.appendChild(path);
        path.style.setProperty("--len", path.getTotalLength() + 2);
        const ang = Math.atan2(e[1] - ctrl[1], e[0] - ctrl[0]);
        const head = document.createElementNS(NS, "path");
        head.setAttribute("class", "head");
        const p = (a, r) => `${e[0] + Math.cos(a) * r},${e[1] + Math.sin(a) * r}`;
        head.setAttribute("d", `M${e[0]},${e[1]} L${p(ang + Math.PI - 0.42, 17)} L${p(ang + Math.PI + 0.42, 17)} Z`);
        arrows.appendChild(head);
      }
      const used = [{ x: placed.x, y: placed.y, w: placed.cw, h: placed.ch }, ...spots];
      return unionOf(used);
    },
    clear() {
      $("rec-call").className = "off";
      $("rec-arrows").innerHTML = "";
      $("rec-dimrect").style.opacity = "0";
      [...$("rec-rings").children].forEach((el) => {
        el.classList.remove("on");
        el.dataset.fresh = "1";
      });
    },
    chapter(i, total, label) {
      const t = $("rec-trk");
      t.style.setProperty("--acc", ACC[i % ACC.length]);
      t.innerHTML = `<span>${label}</span><span class="seg">${Array.from({ length: total }, (_, k) => `<i class="${k <= i ? "on" : ""}"></i>`).join("")}</span>`;
      t.classList.add("on");
    },
    hideChapter() {
      $("rec-trk").classList.remove("on");
    },

    /* --- transitions: each has an In (covers the page) and an Out (reveals the new one) --- */
    async wipeIn() {
      const fx = $("rec-fx");
      fx.innerHTML = "";
      ACC.forEach((col, i) => {
        const b = document.createElement("div");
        b.className = "band";
        b.style.cssText = `top:${i * 25}%;height:25.3%;background:${col};transform:translateX(-101%);transition:transform .34s cubic-bezier(.65,0,.35,1) ${i * 65}ms`;
        fx.appendChild(b);
      });
      void fx.offsetWidth;
      [...fx.children].forEach((b) => (b.style.transform = "translateX(0)"));
      await wait(560);
    },
    async wipeOut() {
      const fx = $("rec-fx");
      [...fx.children].forEach((b) => (b.style.transform = "translateX(101%)"));
      await wait(560);
      fx.innerHTML = "";
    },
    async stingerIn(cfg) {
      const fx = $("rec-fx");
      fx.innerHTML = `<div class="panel" style="transform:translateX(-101%);transition:transform .42s cubic-bezier(.65,0,.35,1)"></div>`;
      const panel = fx.firstChild;
      void fx.offsetWidth;
      panel.style.transform = "translateX(0)";
      await wait(440);
      panel.innerHTML = `<div class="ic">${icon(cfg.icon, 48, 1.7)}</div><div class="k">${cfg.kicker}</div><div class="t">${cfg.title}</div><div class="rule">${ACC.map((c) => `<i style="background:${c}"></i>`).join("")}</div>`;
    },
    async stingerOut() {
      const fx = $("rec-fx");
      const panel = fx.firstChild;
      if (!panel) return;
      panel.innerHTML = "";
      panel.style.transform = "translateX(101%)";
      await wait(460);
      fx.innerHTML = "";
    },
    async iris(from, to, x, y, ms) {
      const fx = $("rec-fx");
      if (!fx.firstChild) fx.innerHTML = '<div class="iris" style="position:absolute;inset:0"></div>';
      const layer = fx.firstChild;
      await new Promise((res) => {
        const t0 = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - t0) / ms);
          const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
          const r = from + (to - from) * e;
          layer.style.background = `radial-gradient(circle at ${x}px ${y}px, transparent ${Math.max(0, r)}px, #1f3f60 ${Math.max(0, r) + 1}px)`;
          p < 1 ? requestAnimationFrame(tick) : res();
        };
        requestAnimationFrame(tick);
      });
    },
    irisIn: (x, y) => rec.iris(1700, 0, x, y, 520),
    async irisOut(x, y) {
      await rec.iris(0, 1700, x, y, 560);
      $("rec-fx").innerHTML = "";
    },
    async dissolveIn() {
      const r = $("root");
      r.style.transition = "opacity .24s ease";
      r.style.opacity = "0";
      await wait(260);
    },
    async dissolveOut() {
      const r = $("root");
      r.style.opacity = "1";
      await wait(340);
      r.style.transition = "";
      r.style.opacity = "";
    },
    async pushIn() {
      const r = $("root");
      r.style.transition = "transform .2s cubic-bezier(.5,0,1,1),opacity .2s";
      r.style.transform = "translateX(-70px)";
      r.style.opacity = "0";
      await wait(210);
    },
    async pushOut() {
      const r = $("root");
      r.style.transition = "none";
      r.style.transform = "translateX(70px)";
      r.style.opacity = "0";
      void r.offsetWidth;
      r.style.transition = "transform .36s cubic-bezier(.2,.9,.3,1),opacity .26s";
      r.style.transform = "";
      r.style.opacity = "1";
      await wait(380);
      r.style.transition = "";
      r.style.opacity = "";
    },

    /* --- title and end cards --- */
    card(kicker, title, sub) {
      const c = $("rec-card");
      const words = title.split(" ").map((w, i) => `<span class="w" style="animation-delay:${0.45 + i * 0.12}s">${w}</span>`).join(" ");
      const wave = (y0, col, d) => `<path stroke="${col}" style="animation-delay:${d}s" d="M0 ${y0} C 25 ${y0 - 10}, 50 ${y0 - 10}, 75 ${y0} S 125 ${y0 + 10}, 150 ${y0} S 200 ${y0 - 10}, 225 ${y0} S 275 ${y0 + 10}, 300 ${y0}"/>`;
      c.innerHTML = `<img src="/favicon.svg" alt=""><svg class="wave" width="300" height="34" viewBox="0 0 300 34">${ACC.map((col, i) => wave(5 + i * 8, col, 0.3 + i * 0.12)).join("")}</svg><div class="k">${kicker}</div><h1>${words}</h1><p>${sub}</p>`;
      void c.offsetWidth;
      c.classList.add("on");
    },
    hideCard() {
      $("rec-card").classList.remove("on");
    },
    confetti() {
      const colors = ["#2f6f4f", "#1f6f8b", "#3a5a9b", "#b9791f", "#f0b429"];
      for (let i = 0; i < 60; i++) {
        const s = document.createElement("div");
        s.className = "rec-conf";
        s.style.left = Math.random() * 100 + "%";
        s.style.background = colors[i % colors.length];
        s.style.setProperty("--dx", Math.random() * 160 - 80 + "px");
        s.style.setProperty("--rot", Math.random() * 900 - 450 + "deg");
        s.style.animationDuration = 1.8 + Math.random() * 1.6 + "s";
        s.style.animationDelay = Math.random() * 0.8 + "s";
        $("rec-root").appendChild(s);
        setTimeout(() => s.remove(), 4200);
      }
    },
  };
  window.__rec = rec;
};

/* ---------- the recorder (runs in node) ---------- */

class Recorder {
  constructor(page, name, sound) {
    this.page = page;
    this.name = name;
    this.sound = sound;
    this.bpm = SOUNDTRACKS[sound].bpm;
    this.beat = 60 / this.bpm;
    this.dir = mkdtempSync(join(tmpdir(), `rec-${name}-`));
    this.frames = [];
    this.camera = [{ t: 0, cx: 0.5, cy: 0.5, z: 1 }];
    this.cam = { cx: 0.5, cy: 0.5, z: 1 };
    this.t0 = null;
    this.wall0 = null;
    this.last = 0;
    this.mouse = { x: -40, y: -40 };
    this.holdEnd = 0;
    this.pending = null;
    this.chapters = [];
  }

  now() {
    return (Date.now() - this.wall0) / 1000;
  }
  /** The next point on the beat grid (every half beat) at or after time t. */
  nextBeat(t, every = 0.5) {
    const g = this.beat * every;
    return Math.ceil(t / g - 1e-6) * g;
  }
  async waitUntil(t) {
    const ms = (t - this.now()) * 1000;
    if (ms > 0) await this.page.waitForTimeout(ms);
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
    await this.cdp.send("Page.startScreencast", { format: "jpeg", quality: 80, maxWidth: Math.round(W * DPR), maxHeight: Math.round(H * DPR), everyNthFrame: 1 });
    // A static page sends no frames, so nudge it until the first one arrives; the soundtrack is timed from there.
    while (this.t0 === null) {
      await this.page.evaluate(() => document.body.classList.toggle("rec-nudge"));
      await this.page.waitForTimeout(80);
    }
  }

  async stop(extraHold = 1.0) {
    await this.untilDone(0);
    await this.pending;
    await this.page.waitForTimeout(400);
    await this.cdp.send("Page.stopScreencast").catch(() => {});
    const duration = this.last + extraHold;
    const camera = [...this.camera, { t: duration, ...this.cam }];
    writeFileSync(join(this.dir, "manifest.json"), JSON.stringify({ width: W, height: H, duration, fps: FPS, bitrate: BITRATE, frames: this.frames, camera }));
    const s = SOUNDTRACKS[this.sound];
    writeFileSync(join(this.dir, "audio.json"), JSON.stringify({ duration, style: this.sound, bpm: s.bpm, root: s.root }));
    execFileSync(MIX, [join(this.dir, "audio.json"), join(this.dir, "mix.wav")], { stdio: "ignore" });
    execFileSync("afconvert", [join(this.dir, "mix.wav"), join(this.dir, "mix.m4a"), "-f", "m4af", "-d", "aac", "-b", "96000"], { stdio: "ignore" });
    const out = join(OUT, `${this.name}.mp4`);
    execFileSync(FRAMES, [join(this.dir, "manifest.json"), out, join(this.dir, "mix.m4a")], { stdio: "ignore" });
    rmSync(this.dir, { recursive: true, force: true });
    return { out, duration };
  }

  /* --- the camera: pushes in on what is highlighted, eased by the encoder --- */
  setCamera(cx, cy, z, dur = 0.9) {
    const t = this.now();
    this.camera.push({ t, ...this.cam });
    this.cam = { cx, cy, z };
    this.camera.push({ t: t + dur, ...this.cam });
  }

  /* --- highlighting --- */
  async overlay() {
    await this.page.evaluate(OVERLAY);
  }
  async chapter(label) {
    if (!this.chapters.includes(label)) this.chapters.push(label);
    await this.overlay();
    await this.page.evaluate(([i, total, l]) => window.__rec.chapter(i, total, l), [this.chapters.indexOf(label), this.chapterTotal, label]);
  }

  /** Brings the targets into view (clearing the highlight first, since it would not move with the page). */
  async reveal(locs) {
    const boxes = (await Promise.all(locs.map((l) => l.boundingBox({ timeout: 2500 }).catch(() => null)))).filter(Boolean);
    if (!boxes.length) return;
    const top = Math.min(...boxes.map((b) => b.y)), bottom = Math.max(...boxes.map((b) => b.y + b.height));
    if (top >= 88 && bottom <= H - 60) return;
    await this.clear();
    const scrollY = await this.page.evaluate(() => window.scrollY);
    const h = bottom - top;
    const dest = scrollY + top - (h < H - 220 ? Math.max(110, (H - h) / 2 - 20) : 100);
    await this.scroll(dest, 850);
    await this.page.waitForTimeout(250);
  }

  /**
   * Lights up the target(s) with a callout beside them. Returns at once so the page can do something while it is read;
   * untilDone() waits out the reading time, which ends on a beat.
   */
  async focus(targets, o = {}) {
    const list = (Array.isArray(targets) ? targets : targets ? [targets] : []).filter(Boolean);
    await this.untilDone();
    await this.overlay();
    let rects = [];
    if (list.length) {
      await this.reveal(list);
      const boxes = await Promise.all(list.map((l) => l.boundingBox({ timeout: 2500 }).catch(() => null)));
      if (boxes.some((b) => !b)) console.warn(`  ! "${o.title}": a target was not found`);
      const g = o.grow ?? {};
      rects = boxes.filter(Boolean).map((b) => ({ x: b.x - (g.l ?? 0), y: b.y - (g.t ?? 0), w: b.width + (g.l ?? 0) + (g.r ?? 0), h: b.height + (g.t ?? 0) + (g.b ?? 0) }));
    }
    const used = await this.page.evaluate((cfg) => window.__rec.focus(cfg), { ...o, rects, n: o.n ?? (rects.length > 1 ? "auto" : null) });
    const words = `${o.title ?? ""} ${o.sub ?? ""}`.replace(/\*/g, "").split(/\s+/).length;
    this.holdEnd = this.nextBeat(this.now() + Math.max(1.6, words * 0.17 + 0.7));
    if (o.camera !== false && used) {
      const z = Math.min(1.24, (W - 140) / used.w, (H - 110) / used.h);
      if (z >= 1.07) this.setCamera((used.x + used.w / 2) / W, (used.y + used.h / 2) / H, z);
      else this.setCamera(0.5, 0.5, 1, 0.7);
    }
  }
  async clear() {
    await this.page.evaluate(() => window.__rec?.clear());
    if (this.cam.z !== 1) this.setCamera(0.5, 0.5, 1, 0.6);
  }
  async untilDone(gap = 0.1) {
    await this.waitUntil(this.holdEnd + gap);
  }

  /* --- cuts between pages --- */
  /**
   * kind: "wipe" (river-color bands), "stinger" (a chapter title), "iris", "dissolve", "push", or "match" (just run nav,
   * which should be a real click). The cut lands on a beat.
   */
  async transition(kind, nav, o = {}) {
    await this.untilDone(0);
    await this.pending;
    await this.clear();
    const cover = { wipe: 0.56, stinger: 0.46, iris: 0.52, dissolve: 0.26, push: 0.21, match: 0 }[kind];
    if (kind !== "match") await this.waitUntil(this.nextBeat(this.now() + cover + 0.1) - cover);
    if (kind === "wipe") await this.page.evaluate(() => window.__rec.wipeIn());
    else if (kind === "stinger") await this.page.evaluate((c) => window.__rec.stingerIn(c), o);
    else if (kind === "iris") await this.page.evaluate(([x, y]) => window.__rec.irisIn(x, y), [o.x ?? W / 2, o.y ?? H / 2]);
    else if (kind === "dissolve") await this.page.evaluate(() => window.__rec.dissolveIn());
    else if (kind === "push") await this.page.evaluate(() => window.__rec.pushIn());
    await nav();
    await this.page.waitForTimeout(kind === "match" ? 600 : 240);
    if (kind === "stinger") await this.page.waitForTimeout(480);
    // The reveal plays while the next highlight is being set up, so the cut does not stall.
    const out =
      kind === "wipe" ? () => window.__rec.wipeOut()
      : kind === "stinger" ? () => window.__rec.stingerOut()
      : kind === "iris" ? ([x, y]) => window.__rec.irisOut(x, y)
      : kind === "dissolve" ? () => window.__rec.dissolveOut()
      : kind === "push" ? () => window.__rec.pushOut()
      : null;
    if (out) {
      const playing = this.page.evaluate(out, [o.x2 ?? o.x ?? W / 2, o.y2 ?? o.y ?? H / 2]);
      // A push moves the page itself, so wait for it to settle before anything is measured.
      if (kind === "push") await playing;
      else this.pending = playing;
    }
  }

  /* --- title and end cards --- */
  async card(kicker, title, sub, { poster, confetti } = {}) {
    await this.untilDone();
    await this.pending;
    await this.overlay();
    await this.page.evaluate(([k, t, s]) => window.__rec.card(k, t, s), [kicker, title, sub]);
    if (confetti) await this.page.evaluate(() => window.__rec.confetti());
    await this.page.waitForTimeout(1400);
    if (poster) await this.page.screenshot({ path: join(OUT, poster), type: "jpeg", quality: 82, scale: "css" });
    await this.page.waitForTimeout(confetti ? 1700 : 900);
  }
  async hideCard() {
    await this.page.evaluate(() => window.__rec.hideCard());
    await this.page.waitForTimeout(560);
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
  async click(locator, { after = 700, glide = 600 } = {}) {
    await locator.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(150);
    const box = await locator.boundingBox();
    await this.glide(box.x + Math.min(box.width / 2, 120), box.y + box.height / 2, glide);
    await this.page.waitForTimeout(150);
    await this.page.mouse.down();
    await this.page.waitForTimeout(80);
    await this.page.mouse.up();
    await this.page.waitForTimeout(after);
  }
  /** A scroll that starts quickly and settles (an ease-out), so it reads as a flick rather than a drift. */
  async scroll(to, ms = 900) {
    await this.page.evaluate(
      ([target, dur]) =>
        new Promise((resolve) => {
          const start = scrollY;
          const max = document.documentElement.scrollHeight - innerHeight;
          const end = Math.max(0, Math.min(target === "end" ? max : target, max));
          const t0 = performance.now();
          const tick = (now) => {
            const p = Math.min(1, (now - t0) / dur);
            const e = 1 - Math.pow(1 - p, 4);
            scrollTo(0, start + (end - start) * e);
            p < 1 ? requestAnimationFrame(tick) : resolve();
          };
          requestAnimationFrame(tick);
        }),
      [to, ms],
    );
  }
  /** Moves inside the app without a reload, so the sample account's in-memory state survives. */
  async go(path) {
    await this.page.evaluate((p) => {
      history.pushState({}, "", p);
      dispatchEvent(new PopStateEvent("popstate"));
    }, path);
    await this.page.waitForTimeout(250);
    await this.page.evaluate(() => scrollTo(0, 0));
  }
  async type(locator, text) {
    await this.click(locator, { after: 150 });
    for (const ch of text) {
      await this.page.keyboard.type(ch);
      await this.page.waitForTimeout(55);
    }
    await this.page.waitForTimeout(300);
  }
}

/* ---------- the walkthroughs ---------- */

const card = (page, text) => page.locator("div.rounded-2xl").filter({ hasText: text }).first();
const panelOf = (loc) => loc.first().locator("xpath=ancestor::*[contains(@class,'panel') or contains(@class,'rounded-2xl')][1]");

const SCENES = {
  course: async (r, page) => {
    r.chapterTotal = 4;
    await r.card("A free course", "4 Rivers", "Scripture-based stewardship: income, saving, investing, giving.", { poster: "course-poster.jpg" });
    await r.go("/course");
    await r.hideCard();
    await r.chapter("The lessons");

    await r.focus(
      [page.getByText("Eden", { exact: true }), page.getByText("4. Giving", { exact: true })],
      { icon: "waves", title: "Four rivers, one *source*", sub: "Income, saving, investing and giving", grow: { t: 90, l: 20, r: 20 }, n: [], pad: 14 },
    );
    await r.untilDone();
    await r.focus(card(page, "Multiple Streams of Income"), { icon: "book", title: "Each river has short *lessons*", sub: "Open any one, in any order", side: "bottom" });

    await r.transition("push", () => r.go("/course/river/1/module/1"));
    await r.focus(page.locator("div.sticky").filter({ has: page.getByRole("button", { name: /Listen to this lesson/ }) }).first(), { icon: "headphones", title: "Read it, or *listen* along", sub: "Your pace, your Bible version", side: "bottom" });
    await r.untilDone();
    await r.focus(page.locator("div.rounded-xl").filter({ has: page.getByText("Scripture", { exact: true }) }).first(), { icon: "book", title: "The *verses* sit beside the lesson", sub: "KJV, NIV, NLT or ESV", side: "bottom" });

    await r.transition("wipe", () => r.go("/course/river/1/quiz"));
    await r.focus(card(page, "Alex is sure"), { icon: "question", title: "A quick *quiz* after every river", sub: "Pass them all to unlock the final exam", side: "bottom" });

    await r.transition("match", async () => {
      await r.click(page.getByRole("link", { name: "30-Day Challenge", exact: true }).first(), { after: 300 });
    });
    await r.chapter("Practice");
    await r.focus(
      [page.locator('[data-tour="challenge-header"]'), card(page, "Introduction: What is stewardship")],
      { icon: "flame", title: "Put it into practice for *30 days*", sub: "Small daily steps, and a streak to keep" },
    );

    await r.transition("stinger", () => r.go("/dashboard"), { kicker: "Chapter 3", title: "Make it your own", icon: "chart" });
    await r.chapter("Your numbers");
    await r.focus(page.locator('[data-tour="dash-calculators"]'), { icon: "calculator", title: "Calculators for *your* numbers", sub: "Budget, savings, compounding. All private", side: "bottom" });
    await r.untilDone();
    await r.click(page.getByRole("button", { name: /Monthly budget/ }).first(), { after: 500 });
    await r.focus(panelOf(page.getByText("Build your monthly plan")), { icon: "list", title: "Plan every *dollar* a job", sub: "Needs, saving, investing, giving", side: "bottom" });

    await r.transition("iris", () => r.go("/certificate"), { x: W / 2, y: H / 2 });
    await r.focus(page.locator('[data-tour="certificate"]'), { icon: "seal", title: "Earn your *certificate*", sub: "Free, and anyone can verify it", side: "right", maxW: 250, gap: 22 });

    await r.transition("stinger", () => r.go("/community"), { kicker: "Chapter 4", title: "Together", icon: "people" });
    await r.chapter("Community");
    await r.focus(page.locator('[data-tour="community-join"]'), { icon: "key", title: "Join a group with a *4-digit code*", sub: "From your group's leader" });

    await r.transition("push", () => r.go("/community/demo-group-1"));
    await r.focus(card(page, "Honor the Lord with your wealth"), { icon: "book", title: "One *verse* a day, shared", sub: "The whole group reads the same passage", side: "bottom" });
    await r.untilDone();
    const chat = card(page, "Group chat");
    await r.focus(chat, { icon: "chat", title: "Cheer each other *on*", sub: "Group chat, just for your group", side: "left", pad: 6 });
    await r.type(page.getByRole("textbox").first(), "Just finished River 2!");
    await page.keyboard.press("Enter");
    await r.untilDone();
    await r.focus(page.locator("section.chalkboard"), { icon: "heart", title: "Lift each other *up*", sub: "Share a request, or tap I prayed", side: "bottom" });
    await r.click(page.getByRole("button", { name: "I prayed" }).first(), { after: 500 }).catch(() => {});

    await r.transition("dissolve", async () => {
      await r.page.evaluate(() => window.__rec.hideChapter());
    });
    await r.card("Free to start", "Begin at River 1", "No cost, no card, and it works on your phone.", { confetti: true });
  },

  tools: async (r, page) => {
    r.chapterTotal = 3;
    await r.card("For the Community tracks", "Tools for your track", "Wealth management, investment banking and consulting. Practice with your own numbers.", { poster: "tools-poster.jpg" });
    await r.go("/community");
    await r.hideCard();
    await r.chapter("Wealth");

    await r.focus(
      [page.getByRole("link", { name: /wealth tools/i }).first(), page.getByRole("link", { name: /investment banking tools/i }).first(), page.getByRole("link", { name: /consulting tools/i }).first()],
      { icon: "key", title: "Request a *tools space*", sub: "An admin approves it, and it stays private to you", pad: 8, side: "bottom" },
    );

    await r.transition("stinger", () => r.go("/community/wealth"), { kicker: "Track 1", title: "Wealth management", icon: "briefcase" });
    await r.focus(page.locator("ol.grid").first(), { icon: "compass", title: "From *discovery* to presentation", sub: "Built around a client's own goals", side: "bottom" });
    await r.untilDone();
    await r.transition("match", async () => {
      await r.click(page.getByRole("button", { name: "See an example client" }), { after: 300 });
    });
    await r.focus(
      [panelOf(page.getByText("Profile", { exact: true })), page.locator("aside").filter({ hasText: "Client snapshot" }).first()],
      { icon: "target", title: "Notes become a *snapshot*", sub: "Step 1 of a guided plan, labelled illustrative", side: "bottom" },
    );
    await r.untilDone();
    await r.transition("match", async () => {
      await r.click(page.getByRole("button", { name: /Presentation/ }).first(), { after: 400 });
    });
    await r.focus(panelOf(page.getByRole("heading", { name: "Style template" })), { icon: "slides", title: "A PowerPoint in *six styles*", sub: "Private bank, research note, modern advisory and more", side: "top" });

    await r.chapter("Banking");
    await r.transition("wipe", () => r.go("/community/ib"));
    await r.focus(page.locator("section.panel").filter({ hasText: "Football field" }).first(), { icon: "trend", title: "Build *valuation* models", sub: "DCF, comparables, LBO and a football field", side: "top" });
    await r.untilDone();
    await r.transition("match", async () => {
      await r.click(page.getByRole("tab", { name: "Technical questions" }), { after: 500 });
    });
    await r.focus(page.locator("section.panel").filter({ hasText: "Technical questions" }).first(), { icon: "bulb", title: "Drill the *technical* questions", sub: "Rate yourself and see what to review next", side: "top" });

    await r.chapter("Consulting");
    await r.transition("iris", () => r.go("/community/consulting"), { x: W / 2, y: H / 2 });
    await r.focus(page.getByRole("tablist").first(), { icon: "grid", title: "Case *frameworks* to learn", sub: "Profitability, market entry, M&A and more", side: "bottom" });
    await r.untilDone();
    await r.transition("match", async () => {
      await r.click(page.getByRole("button", { name: "Market entry" }), { after: 500 });
      await r.click(page.getByRole("button", { name: "Start the case timer" }), { after: 400 });
    });
    await r.focus(panelOf(page.getByText("Practice it")), { icon: "stopwatch", title: "Practice a case *against the clock*", sub: "Pick a type, start the timer, think out loud", side: "top" });

    await r.transition("dissolve", async () => {
      await r.page.evaluate(() => window.__rec.hideChapter());
    });
    await r.card("Educational practice tools", "Built for learning", "Not investment advice, and not a valuation of any real security.", { confetti: true });
  },
};

/* ---------- run ---------- */

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(SCENES);
const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
for (const name of names) {
  if (!SCENES[name]) throw new Error(`unknown video "${name}" (have: ${Object.keys(SCENES).join(", ")})`);
  const sound = process.env.SOUND ?? DEFAULTS[name];
  if (!SOUNDTRACKS[sound]) throw new Error(`unknown soundtrack "${sound}" (have: ${Object.keys(SOUNDTRACKS).join(", ")})`);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
  await ctx.addInitScript(() => localStorage.setItem("four-rivers:lang", "en"));
  const page = await ctx.newPage();
  await page.goto(`${BASE}/signin`);
  await page.locator('input[name="email"]').fill("demo");
  await page.locator('input[name="password"]').fill("demo");
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/course/);
  await page.waitForTimeout(800);
  const r = new Recorder(page, name, sound);
  await r.start();
  await SCENES[name](r, page);
  const { out, duration } = await r.stop();
  console.log(`${name}: ${duration.toFixed(1)}s (${sound}) -> ${out}`);
  await ctx.close();
}
await browser.close();
rmSync(BIN, { recursive: true, force: true });
