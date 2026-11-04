#!/usr/bin/env node
/**
 * Renders a 40-second preview of every soundtrack in tools/dev/soundtracks.mjs into docs/audio-samples/, so they can be
 * compared by ear before choosing one for each video. Needs macOS (it compiles tools/dev/mix-audio.swift).
 *
 *   node tools/dev/audio-samples.mjs
 *
 * Then pick one with SOUND=<name> (for example SOUND=house node tools/dev/record-walkthroughs.mjs tools).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SOUNDTRACKS } from "./soundtracks.mjs";

const ROOT = new URL("../../", import.meta.url).pathname.replace(/%20/g, " ");
const OUT = join(ROOT, "docs/audio-samples");
mkdirSync(OUT, { recursive: true });
const dir = mkdtempSync(join(tmpdir(), "four-rivers-samples-"));
const mix = join(dir, "mix-audio");
execFileSync("swiftc", ["-O", join(ROOT, "tools/dev/mix-audio.swift"), "-o", mix], { stdio: "ignore" });

let i = 0;
for (const [style, s] of Object.entries(SOUNDTRACKS)) {
  const spec = join(dir, `${style}.json`);
  const wav = join(dir, `${style}.wav`);
  writeFileSync(spec, JSON.stringify({ duration: 40, style, bpm: s.bpm, root: s.root }));
  execFileSync(mix, [spec, wav], { stdio: "ignore" });
  const out = join(OUT, `${s.video}-${++i % 3 || 3}-${style}.m4a`);
  execFileSync("afconvert", [wav, out, "-f", "m4af", "-d", "aac", "-b", "128000"], { stdio: "ignore" });
  console.log(`${s.video} ${style.padEnd(9)} ${s.name}: ${out}`);
}
rmSync(dir, { recursive: true, force: true });
