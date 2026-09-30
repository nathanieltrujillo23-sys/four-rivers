/**
 * Pre-generates one narrated audio file (plus a paragraph-timing sidecar
 * JSON) per module, per voice, using Piper — a free, offline, open-source
 * neural TTS engine. Run once whenever lesson content or the voice lineup
 * changes; never at runtime, and never per listener.
 *
 * Requires a one-time local setup (not committed — see .piper/ in .gitignore):
 *   python3 -m venv .piper/venv
 *   .piper/venv/bin/pip install piper-tts
 * Voice models are downloaded automatically into .piper/voices/ on first run.
 *
 * Also requires macOS's built-in `afconvert` (used to encode the final AAC
 * files), so this script only runs on a Mac. That's fine — it's a one-time
 * content-build step, not part of the deployed app.
 *
 * Usage:
 *   npx tsx scripts/generate-audio.ts                # generate everything missing
 *   npx tsx scripts/generate-audio.ts --voice ryan    # just one voice
 *   npx tsx scripts/generate-audio.ts --river 2       # just one river (all its modules)
 *   npx tsx scripts/generate-audio.ts --force         # regenerate even if files exist
 */
import { execFileSync } from "child_process";
import { mkdirSync, existsSync, rmSync, mkdtempSync, readdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { LESSONS } from "../src/content/lessons/index.ts";
import { buildSegments } from "../src/lib/lessonSegments.ts";
import type { RiverNumber } from "../src/types.ts";
import { readWav, writeWav, concatWithGaps, type PcmClip } from "./wav-utils.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PIPER_BIN = join(ROOT, ".piper", "venv", "bin", "piper");
const VOICES_DIR = join(ROOT, ".piper", "voices");
const AUDIO_DIR = join(ROOT, "public", "audio");
const SILENCE_MS = 350;

/**
 * The four locked-in voices. `slug` is the public, URL-safe identifier used
 * in file paths and in the app's voice picker (see src/lib/voices.ts, which
 * mirrors this list for the UI — keep the two in sync by hand since one is
 * imported at build time by the app and the other drives this Node-only
 * script, which isn't part of the browser bundle).
 */
const VOICES = [
  { slug: "ryan", name: "Ryan", model: "en_US-ryan-high" },
  { slug: "ljspeech", name: "LJ", model: "en_US-ljspeech-high" },
  { slug: "cori", name: "Cori", model: "en_GB-cori-high" },
  { slug: "alan", name: "Alan", model: "en_GB-alan-medium" },
] as const;

function modelUrls(model: string): { onnx: string; config: string } {
  // model looks like "en_US-ryan-high" -> lang "en_US", name "ryan", quality "high"
  const firstDash = model.indexOf("-");
  const lastDash = model.lastIndexOf("-");
  const lang = model.slice(0, firstDash);
  const name = model.slice(firstDash + 1, lastDash);
  const quality = model.slice(lastDash + 1);
  const base = `https://huggingface.co/rhasspy/piper-voices/resolve/main/en/${lang}/${name}/${quality}/${model}`;
  return { onnx: `${base}.onnx`, config: `${base}.onnx.json` };
}

function ensureVoiceDownloaded(model: string) {
  mkdirSync(VOICES_DIR, { recursive: true });
  const onnxPath = join(VOICES_DIR, `${model}.onnx`);
  const configPath = join(VOICES_DIR, `${model}.onnx.json`);
  if (existsSync(onnxPath) && existsSync(configPath)) return;
  const { onnx, config } = modelUrls(model);
  console.log(`Downloading voice model ${model}...`);
  execFileSync("curl", ["-sL", "-o", onnxPath, onnx], { stdio: "inherit" });
  execFileSync("curl", ["-sL", "-o", configPath, config], { stdio: "inherit" });
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const voiceArgIndex = args.indexOf("--voice");
const onlyVoiceSlug = voiceArgIndex >= 0 ? args[voiceArgIndex + 1] : null;
const riverArgIndex = args.indexOf("--river");
const onlyRiver = riverArgIndex >= 0 ? (Number(args[riverArgIndex + 1]) as RiverNumber) : null;

if (!existsSync(PIPER_BIN)) {
  console.error(
    `Piper not found at ${PIPER_BIN}. Run:\n  python3 -m venv .piper/venv\n  .piper/venv/bin/pip install piper-tts`
  );
  process.exit(1);
}

const rivers: RiverNumber[] = onlyRiver ? [onlyRiver] : [1, 2, 3, 4];
const voices = onlyVoiceSlug ? VOICES.filter((v) => v.slug === onlyVoiceSlug) : VOICES;
if (voices.length === 0) {
  console.error(`Unknown voice slug "${onlyVoiceSlug}". Valid: ${VOICES.map((v) => v.slug).join(", ")}`);
  process.exit(1);
}

interface Segment {
  key: string;
  text: string;
  scripture: boolean;
}

function moduleSegments(river: RiverNumber, moduleIndex: number): Segment[] {
  const module_ = LESSONS[river].lessons[moduleIndex];
  return buildSegments(module_);
}

/**
 * One Piper process per MODULE, not per segment — Piper loads its ~100MB
 * model fresh on every invocation, so batching all of a module's segments
 * into one call (one line of input per segment, via --output-dir) keeps
 * generation to ~124 model loads instead of ~1,000.
 */
function runPiper(model: string, segments: Segment[], workDir: string): PcmClip[] {
  const inputText = segments.map((s) => s.text.replace(/\s+/g, " ").trim()).join("\n") + "\n";
  const outDir = join(workDir, "out");
  mkdirSync(outDir, { recursive: true });
  execFileSync(
    PIPER_BIN,
    [
      "-m",
      join(VOICES_DIR, `${model}.onnx`),
      "-c",
      join(VOICES_DIR, `${model}.onnx.json`),
      "-d",
      outDir,
      "--output-dir-naming",
      "timestamp",
    ],
    { input: inputText, stdio: ["pipe", "ignore", "inherit"] }
  );
  const files = readdirSync(outDir)
    .filter((f) => f.endsWith(".wav"))
    .sort((a, b) => Number(a.replace(".wav", "")) - Number(b.replace(".wav", "")));
  if (files.length !== segments.length) {
    throw new Error(
      `Piper produced ${files.length} files for ${segments.length} input lines — aborting this module.`
    );
  }
  return files.map((f) => readWav(join(outDir, f)));
}

function encodeToAac(wavPath: string, outPath: string) {
  execFileSync("afconvert", [wavPath, outPath, "-d", "aac", "-f", "m4af", "-u", "pgcm", "2"]);
}

let generated = 0;
let skipped = 0;

for (const voice of voices) {
  ensureVoiceDownloaded(voice.model);

  for (const river of rivers) {
    const total = LESSONS[river].lessons.length;
    for (let moduleIndex = 0; moduleIndex < total; moduleIndex++) {
      const moduleNumber = moduleIndex + 1;
      const outDir = join(AUDIO_DIR, voice.slug, `river${river}`);
      const audioPath = join(outDir, `module${moduleNumber}.m4a`);
      const jsonPath = join(outDir, `module${moduleNumber}.json`);

      if (!force && existsSync(audioPath) && existsSync(jsonPath)) {
        skipped++;
        continue;
      }

      const segments = moduleSegments(river, moduleIndex);
      const workDir = mkdtempSync(join(tmpdir(), "four-rivers-audio-"));
      try {
        const clips = runPiper(voice.model, segments, workDir);
        const { clip, startTimes } = concatWithGaps(clips, SILENCE_MS);

        mkdirSync(outDir, { recursive: true });
        const tmpWav = join(workDir, "final.wav");
        writeWav(tmpWav, clip);
        encodeToAac(tmpWav, audioPath);

        const timing = segments.map((s, i) => ({ key: s.key, time: startTimes[i], scripture: s.scripture }));
        writeFileSync(jsonPath, JSON.stringify(timing));

        generated++;
        console.log(`✓ ${voice.slug}/river${river}/module${moduleNumber} (${segments.length} segments)`);
      } finally {
        rmSync(workDir, { recursive: true, force: true });
      }
    }
  }
}

console.log(`\nDone. Generated ${generated}, skipped ${skipped} (already existed).`);
