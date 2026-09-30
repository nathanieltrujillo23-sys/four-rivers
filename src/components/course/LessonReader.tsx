import { useState } from "react";
import {
  RATE_MAX,
  RATE_MIN,
  RATE_STEP,
  type AudioLessonReaderState,
} from "../../state/useAudioLessonReader";
import { VOICES } from "../../lib/voices";

const PRESETS = [0.75, 1, 1.25, 1.5, 2];

function rateLabel(r: number): string {
  return `${Number.isInteger(r) ? r : r.toFixed(2).replace(/0$/, "")}×`;
}

/**
 * Sticky player bar for one module. A voice must be chosen — the picker
 * starts on "Select voice" rather than defaulting to one — before "Listen to
 * this lesson" does anything. Once playing, stop/speed/scripture controls
 * open below.
 */
export function LessonReader({ reader }: { reader: AudioLessonReaderState }) {
  const [open, setOpen] = useState(false);
  const { status } = reader;
  const hasVoice = !!reader.voiceId;

  const base = "rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-40";
  const btn = `${base} border-line bg-white text-ink hover:bg-parchment-deep disabled:hover:bg-white`;
  const primary = `${base} border-water-deep bg-water-deep text-parchment hover:bg-water disabled:hover:bg-water-deep`;

  return (
    <div
      role="region"
      aria-label="Read lesson aloud"
      className="sticky top-0 z-10 flex flex-col gap-3 rounded-xl border border-line bg-parchment/95 p-3 shadow-sm backdrop-blur font-[family-name:var(--font-ui)]"
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-ink-soft">Voice</span>
          <select
            value={reader.voiceId ?? ""}
            onChange={(e) => reader.setVoiceId(e.target.value || null)}
            className="rounded-lg border border-line bg-white px-2 py-1.5 text-ink"
          >
            <option value="">Select voice</option>
            {VOICES.map((v) => (
              <option key={v.slug} value={v.slug}>
                {v.name}
              </option>
            ))}
          </select>
        </label>

        {status === "playing" ? (
          <button className={primary} onClick={reader.pause}>
            ⏸ Pause
          </button>
        ) : (
          <button
            className={primary}
            disabled={!hasVoice}
            onClick={() => {
              setOpen(true);
              reader.play();
            }}
            aria-expanded={open}
          >
            ▶ {status === "paused" ? "Resume" : "Listen to this lesson"}
          </button>
        )}
        {open && (
          <button
            className={btn}
            onClick={() => {
              reader.stop();
              setOpen(false);
            }}
            aria-label="Stop"
          >
            ■ Stop
          </button>
        )}
        <span className="ml-auto text-xs text-ink-soft" aria-live="polite">
          {!hasVoice
            ? "Choose a voice to listen"
            : status === "idle"
              ? reader.listenMinutes
                ? `≈ ${reader.listenMinutes} min at ${rateLabel(reader.rate)}`
                : ""
              : "Reading aloud…"}
        </span>
      </div>

      {open && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-soft">
          <label className="flex items-center gap-2">
            <span className="font-medium">Speed</span>
            <input
              type="range"
              min={RATE_MIN}
              max={RATE_MAX}
              step={RATE_STEP}
              value={reader.rate}
              onChange={(e) => reader.setRate(Number(e.target.value))}
              aria-label="Reading speed"
              className="w-32 accent-[var(--color-water-deep)]"
            />
            <span className="w-10 font-semibold tabular-nums text-ink">{rateLabel(reader.rate)}</span>
          </label>
          <div className="flex gap-1" aria-label="Speed presets">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => reader.setRate(p)}
                className={`rounded-full border px-2 py-0.5 ${
                  reader.rate === p
                    ? "border-water-deep bg-water-deep text-parchment"
                    : "border-line bg-white hover:bg-parchment-deep"
                }`}
              >
                {rateLabel(p)}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={reader.includeScripture}
              onChange={(e) => reader.setIncludeScripture(e.target.checked)}
            />
            <span>Read scripture aloud</span>
          </label>
        </div>
      )}
    </div>
  );
}
