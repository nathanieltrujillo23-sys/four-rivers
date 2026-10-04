import { useState } from "react";
import {
  RATE_MAX,
  RATE_MIN,
  RATE_STEP,
  type AudioLessonReaderState,
} from "../../state/useAudioLessonReader";
import { VOICES } from "../../lib/voices";
import { useT } from "../../i18n/LanguageContext";

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
export function LessonReader({
  reader,
  voices = VOICES,
  notice,
}: {
  reader: Pick<
    AudioLessonReaderState,
    | "status"
    | "voiceId"
    | "setVoiceId"
    | "play"
    | "pause"
    | "stop"
    | "rate"
    | "setRate"
    | "includeScripture"
    | "setIncludeScripture"
    | "listenMinutes"
  >;
  /** The voices to offer; defaults to the pre-recorded ones. */
  voices?: { slug: string; name: string }[];
  /** Shown instead of the picker's help text when there is a problem (e.g. no voice installed). */
  notice?: string | null;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { status } = reader;
  const hasVoice = !!reader.voiceId;

  const base = "rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-40";
  const btn = `${base} border-line bg-surface text-ink hover:bg-parchment-deep disabled:hover:bg-surface`;
  const primary = `${base} border-water-deep bg-water-deep text-parchment hover:bg-water disabled:hover:bg-water-deep`;

  return (
    <div
      role="region"
      aria-label={t("reader.region")}
      className="sticky top-0 z-10 flex flex-col gap-3 rounded-xl border border-line bg-parchment/95 p-3 shadow-sm backdrop-blur font-[family-name:var(--font-ui)]"
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-ink-soft">{t("reader.voice")}</span>
          <select
            value={reader.voiceId ?? ""}
            onChange={(e) => reader.setVoiceId(e.target.value || null)}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-ink"
          >
            <option value="">{t("reader.selectVoice")}</option>
            {voices.map((v) => (
              <option key={v.slug} value={v.slug}>
                {v.name}
              </option>
            ))}
          </select>
        </label>

        {status === "playing" ? (
          <button className={primary} onClick={reader.pause}>
            {t("reader.pause")}
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
            ▶ {status === "paused" ? t("reader.resume") : t("reader.listen")}
          </button>
        )}
        {open && (
          <button
            className={btn}
            onClick={() => {
              reader.stop();
              setOpen(false);
            }}
            aria-label={t("reader.stop")}
          >
            ■ {t("reader.stop")}
          </button>
        )}
        <span className="ml-auto text-xs text-ink-soft" aria-live="polite">
          {notice
            ? notice
            : !hasVoice
              ? t("reader.chooseVoice")
              : status === "idle"
                ? reader.listenMinutes
                  ? t("reader.minAt", { n: reader.listenMinutes, rate: rateLabel(reader.rate) })
                  : ""
                : t("reader.reading")}
        </span>
      </div>

      {open && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-soft">
          <label className="flex items-center gap-2">
            <span className="font-medium">{t("reader.speed")}</span>
            <input
              type="range"
              min={RATE_MIN}
              max={RATE_MAX}
              step={RATE_STEP}
              value={reader.rate}
              onChange={(e) => reader.setRate(Number(e.target.value))}
              aria-label={t("reader.speedAria")}
              className="w-32 accent-[var(--color-water-deep)]"
            />
            <span className="w-10 font-semibold tabular-nums text-ink">{rateLabel(reader.rate)}</span>
          </label>
          <div className="flex gap-1" aria-label={t("reader.presets")}>
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => reader.setRate(p)}
                className={`rounded-full border px-2 py-0.5 ${
                  reader.rate === p
                    ? "border-water-deep bg-water-deep text-parchment"
                    : "border-line bg-surface hover:bg-parchment-deep"
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
            <span>{t("reader.scripture")}</span>
          </label>
        </div>
      )}
    </div>
  );
}
