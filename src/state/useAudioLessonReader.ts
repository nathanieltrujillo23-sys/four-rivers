import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RiverNumber } from "../types";

export const RATE_MIN = 0.5;
export const RATE_MAX = 2.5;
export const RATE_STEP = 0.25;

const KEY_RATE = "four-rivers:reader:rate";
const KEY_VOICE = "four-rivers:reader:voice";
const KEY_SCRIPTURE = "four-rivers:reader:scripture";

function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — settings just won't persist */
  }
}
/** Empty string (an explicit "no voice") and "missing" both mean "not chosen". */
function loadVoice(): string | null {
  const v = load(KEY_VOICE);
  return v && v.length > 0 ? v : null;
}

export type ReaderStatus = "idle" | "playing" | "paused";

interface TimingEntry {
  key: string;
  time: number;
  scripture: boolean;
}

/**
 * Read-aloud controller for one module, backed by a pre-generated audio file
 * per voice (see scripts/generate-audio.ts) rather than live speech
 * synthesis. No voice is selected by default — the caller's UI is expected to
 * require an explicit choice before offering to play anything.
 */
export function useAudioLessonReader(river: RiverNumber, moduleNumber: number) {
  const [rate, setRateState] = useState(() => {
    const n = Number(load(KEY_RATE));
    return Number.isFinite(n) && n >= RATE_MIN && n <= RATE_MAX ? n : 1;
  });
  const [voiceId, setVoiceIdState] = useState<string | null>(() => loadVoice());
  const [includeScripture, setIncludeScriptureState] = useState(() => load(KEY_SCRIPTURE) !== "0");
  const [status, setStatus] = useState<ReaderStatus>("idle");
  const [timing, setTiming] = useState<TimingEntry[] | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (audioRef.current === null && typeof Audio !== "undefined") {
    audioRef.current = new Audio();
  }

  // Load the timing sidecar whenever the voice or module changes.
  useEffect(() => {
    setTiming(null);
    setActiveKey(null);
    if (!voiceId) return;
    let cancelled = false;
    fetch(`/audio/${voiceId}/river${river}/module${moduleNumber}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not found"))))
      .then((data: TimingEntry[]) => {
        if (!cancelled) setTiming(data);
      })
      .catch(() => {
        if (!cancelled) setTiming([]);
      });
    return () => {
      cancelled = true;
    };
  }, [voiceId, river, moduleNumber]);

  // Point the <audio> element at the right file and reset playback state.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setStatus("idle");
    setActiveKey(null);
    setDurationSeconds(null);
    audio.src = voiceId ? `/audio/${voiceId}/river${river}/module${moduleNumber}.m4a` : "";
  }, [voiceId, river, moduleNumber]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = rate;
  }, [rate]);

  // Track playback position -> active segment, and skip past scripture when toggled off.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !timing || timing.length === 0) return;

    const onTimeUpdate = () => {
      const t = audio.currentTime;
      let current: TimingEntry | null = null;
      for (const entry of timing) {
        if (entry.time <= t) current = entry;
        else break;
      }
      if (!current) return;
      if (!includeScripture && current.scripture) {
        const idx = timing.indexOf(current);
        const next = timing.slice(idx + 1).find((e) => !e.scripture);
        if (next) {
          audio.currentTime = next.time;
        } else {
          audio.pause();
          setStatus("idle");
          setActiveKey(null);
        }
        return;
      }
      setActiveKey(current.key);
    };
    const onEnded = () => {
      setStatus("idle");
      setActiveKey(null);
    };
    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) setDurationSeconds(audio.duration);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [timing, includeScripture]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !voiceId) return;
    void audio.play();
    setStatus("playing");
  }, [voiceId]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setStatus("paused");
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setStatus("idle");
    setActiveKey(null);
  }, []);

  const setRate = useCallback((next: number) => {
    const clamped = Math.min(RATE_MAX, Math.max(RATE_MIN, next));
    setRateState(clamped);
    save(KEY_RATE, String(clamped));
  }, []);

  const setVoiceId = useCallback((next: string | null) => {
    setVoiceIdState(next);
    save(KEY_VOICE, next ?? "");
  }, []);

  const setIncludeScripture = useCallback((next: boolean) => {
    setIncludeScriptureState(next);
    save(KEY_SCRIPTURE, next ? "1" : "0");
  }, []);

  // Keep the spoken paragraph in view.
  useEffect(() => {
    if (!activeKey || status !== "playing") return;
    document
      .querySelector(`[data-seg="${activeKey}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeKey, status]);

  // Stop speaking when the reader goes away (route change, unmount).
  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    []
  );

  const listenMinutes = useMemo(
    () => (durationSeconds ? Math.max(1, Math.round(durationSeconds / rate / 60)) : null),
    [durationSeconds, rate]
  );

  return {
    status,
    rate,
    setRate,
    voiceId,
    setVoiceId,
    includeScripture,
    setIncludeScripture,
    activeKey,
    listenMinutes,
    play,
    pause,
    stop,
  };
}

export type AudioLessonReaderState = ReturnType<typeof useAudioLessonReader>;
