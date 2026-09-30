/**
 * Minimal WAV (RIFF/PCM) reader/writer/concatenator, just enough to stitch
 * together the per-segment clips Piper produces. All of Piper's output here
 * is 16-bit mono PCM at a fixed sample rate, so this doesn't need to handle
 * the general case.
 */
import { readFileSync, writeFileSync } from "fs";

export interface PcmClip {
  sampleRate: number;
  numChannels: number;
  bitsPerSample: number;
  data: Buffer; // raw PCM samples, no header
}

export function readWav(path: string): PcmClip {
  const buf = readFileSync(path);
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error(`${path} is not a RIFF/WAVE file`);
  }
  let offset = 12;
  let fmt: { numChannels: number; sampleRate: number; bitsPerSample: number } | null = null;
  let data: Buffer | null = null;
  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString("ascii", offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    const body = buf.subarray(offset + 8, offset + 8 + chunkSize);
    if (chunkId === "fmt ") {
      fmt = {
        numChannels: body.readUInt16LE(2),
        sampleRate: body.readUInt32LE(4),
        bitsPerSample: body.readUInt16LE(14),
      };
    } else if (chunkId === "data") {
      data = body;
    }
    offset += 8 + chunkSize + (chunkSize % 2); // chunks are word-aligned
  }
  if (!fmt || !data) throw new Error(`${path}: missing fmt or data chunk`);
  return { sampleRate: fmt.sampleRate, numChannels: fmt.numChannels, bitsPerSample: fmt.bitsPerSample, data };
}

export function writeWav(path: string, clip: PcmClip): void {
  const { sampleRate, numChannels, bitsPerSample, data } = clip;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([header, data]));
}

export function clipDurationSeconds(clip: PcmClip): number {
  const bytesPerSample = clip.bitsPerSample / 8;
  const totalSamples = clip.data.length / (bytesPerSample * clip.numChannels);
  return totalSamples / clip.sampleRate;
}

/**
 * Concatenates clips (all must share sampleRate/numChannels/bitsPerSample)
 * with a short silence gap between each. Returns the merged clip plus the
 * time, in seconds, at which each input clip's audio begins.
 */
export function concatWithGaps(clips: PcmClip[], gapMs: number): { clip: PcmClip; startTimes: number[] } {
  if (clips.length === 0) throw new Error("concatWithGaps: no clips");
  const { sampleRate, numChannels, bitsPerSample } = clips[0];
  const bytesPerFrame = (numChannels * bitsPerSample) / 8;
  const gapFrames = Math.round((gapMs / 1000) * sampleRate);
  const gapBuffer = Buffer.alloc(gapFrames * bytesPerFrame, 0);

  const parts: Buffer[] = [];
  const startTimes: number[] = [];
  let frameCount = 0;
  clips.forEach((c, i) => {
    if (c.sampleRate !== sampleRate || c.numChannels !== numChannels || c.bitsPerSample !== bitsPerSample) {
      throw new Error("concatWithGaps: mismatched clip formats");
    }
    startTimes.push(frameCount / sampleRate);
    parts.push(c.data);
    frameCount += c.data.length / bytesPerFrame;
    if (i < clips.length - 1) {
      parts.push(gapBuffer);
      frameCount += gapFrames;
    }
  });

  return {
    clip: { sampleRate, numChannels, bitsPerSample, data: Buffer.concat(parts) },
    startTimes,
  };
}
