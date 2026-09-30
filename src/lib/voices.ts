/**
 * The four locked-in read-aloud voices. Mirrors the list in
 * scripts/generate-audio.ts by hand — that script isn't part of the browser
 * bundle, so the two can't share a single import across the Node/browser
 * boundary. If you add or rename a voice, update both.
 */
export interface VoiceOption {
  slug: string;
  name: string;
}

export const VOICES: VoiceOption[] = [
  { slug: "ryan", name: "Ryan" },
  { slug: "ljspeech", name: "LJ" },
  { slug: "cori", name: "Cori" },
  { slug: "alan", name: "Alan" },
];
