import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Lesson } from "../types";
import { buildSegments, splitIntoChunks } from "../lib/lessonSegments";
import { getSpeechProvider, type VoiceOption } from "../lib/speech";

export const RATE_MIN = 0.5;
export const RATE_MAX = 2.5;
export const RATE_STEP = 0.25;

/** Typical text-to-speech pace at 1× (words per minute), for the listening estimate. */
const SPEECH_WPM = 150;

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

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export type ReaderStatus = "idle" | "playing" | "paused";

/**
 * Read-aloud controller for one lesson. Speaks short chunks in sequence (which
 * keeps browsers from cutting long text off), highlights the segment being
 * read, and supports variable speed. Speed changes take effect immediately by
 * restarting the current chunk, because the Web Speech API cannot change the
 * rate of an utterance already in progress.
 */
export function useLessonReader(lesson: Lesson) {
  const provider = getSpeechProvider();

  const [rate, setRateState] = useState(() => {
    const n = Number(load(KEY_RATE));
    return Number.isFinite(n) && n >= RATE_MIN && n <= RATE_MAX ? n : 1;
  });
  const [voiceId, setVoiceIdState] = useState<string | null>(() => load(KEY_VOICE));
  const [includeScripture, setIncludeScriptureState] = useState(() => load(KEY_SCRIPTURE) !== "0");
  const [voices, setVoices] = useState<VoiceOption[]>(() => provider.listVoices());
  const [status, setStatus] = useState<ReaderStatus>("idle");
  const [chunkIndex, setChunkIndexState] = useState(0);

  const token = useRef(0);
  const indexRef = useRef(0);
  const settingsRef = useRef({ rate, voiceId });
  const statusRef = useRef<ReaderStatus>("idle");

  const chunks = useMemo(
    () =>
      buildSegments(lesson)
        .filter((s) => includeScripture || !s.scripture)
        .flatMap((s) =>
          splitIntoChunks(s.text).map((text) => ({ key: s.key, text, section: s.section }))
        ),
    [lesson, includeScripture]
  );
  const chunksRef = useRef(chunks);

  useEffect(() => {
    settingsRef.current = { rate, voiceId };
  }, [rate, voiceId]);
  useEffect(() => {
    chunksRef.current = chunks;
  }, [chunks]);
  useEffect(() => provider.onVoicesChanged(() => setVoices(provider.listVoices())), [provider]);

  const setIndex = useCallback((i: number) => {
    indexRef.current = i;
    setChunkIndexState(i);
  }, []);
  const setStatusBoth = useCallback((s: ReaderStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const run = useCallback(
    async (start: number) => {
      const mine = ++token.current;
      provider.cancel();
      await sleep(60); // some browsers drop a speak() issued right after cancel()
      if (mine !== token.current) return;
      setStatusBoth("playing");
      const list = chunksRef.current;
      for (let i = start; i < list.length; i++) {
        if (mine !== token.current) return;
        setIndex(i);
        try {
          await provider.speak(list[i].text, settingsRef.current);
        } catch {
          if (mine === token.current) setStatusBoth("idle");
          return;
        }
      }
      if (mine === token.current) {
        setStatusBoth("idle");
        setIndex(0);
      }
    },
    [provider, setIndex, setStatusBoth]
  );

  const stop = useCallback(() => {
    token.current++;
    provider.cancel();
    setStatusBoth("idle");
    setIndex(0);
  }, [provider, setIndex, setStatusBoth]);

  const pause = useCallback(() => {
    token.current++;
    provider.cancel();
    setStatusBoth("paused");
  }, [provider, setStatusBoth]);

  const play = useCallback(() => {
    void run(statusRef.current === "paused" ? indexRef.current : 0);
  }, [run]);

  const setRate = useCallback(
    (next: number) => {
      const clamped = Math.min(RATE_MAX, Math.max(RATE_MIN, next));
      settingsRef.current = { ...settingsRef.current, rate: clamped };
      setRateState(clamped);
      save(KEY_RATE, String(clamped));
      if (statusRef.current === "playing") void run(indexRef.current);
    },
    [run]
  );

  const setVoiceId = useCallback(
    (next: string | null) => {
      settingsRef.current = { ...settingsRef.current, voiceId: next };
      setVoiceIdState(next);
      save(KEY_VOICE, next ?? "");
      if (statusRef.current === "playing") void run(indexRef.current);
    },
    [run]
  );

  const setIncludeScripture = useCallback(
    (next: boolean) => {
      stop(); // chunk positions change when scripture is added or removed
      setIncludeScriptureState(next);
      save(KEY_SCRIPTURE, next ? "1" : "0");
    },
    [stop]
  );

  const sectionCount = lesson.sections.length;
  const currentSection = chunks[chunkIndex]?.section ?? -1;

  /** Jump to the start of the previous (-1) or next (+1) part of the lesson. */
  const skipSection = useCallback(
    (delta: 1 | -1) => {
      const list = chunksRef.current;
      const cur = list[indexRef.current]?.section ?? -1;
      const target = Math.min(sectionCount - 1, Math.max(-1, cur + delta));
      const start = list.findIndex((c) => c.section === target);
      if (start < 0) return;
      if (statusRef.current === "playing") {
        void run(start);
      } else {
        setIndex(start);
        setStatusBoth("paused");
      }
    },
    [run, sectionCount, setIndex, setStatusBoth]
  );

  // Stop speaking when the reader goes away (route change, unmount).
  useEffect(
    () => () => {
      token.current++;
      provider.cancel();
    },
    [provider]
  );

  const activeKey = status === "idle" ? null : (chunks[chunkIndex]?.key ?? null);

  // Keep the spoken paragraph in view.
  useEffect(() => {
    if (!activeKey || status !== "playing") return;
    document
      .querySelector(`[data-seg="${activeKey}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeKey, status]);

  const totalWords = useMemo(
    () => chunks.reduce((n, c) => n + c.text.split(/\s+/).filter(Boolean).length, 0),
    [chunks]
  );
  const listenMinutes = Math.max(1, Math.round(totalWords / (SPEECH_WPM * rate)));

  return {
    supported: provider.supported,
    status,
    rate,
    setRate,
    voices,
    voiceId,
    setVoiceId,
    includeScripture,
    setIncludeScripture,
    activeKey,
    currentSection,
    sectionCount,
    listenMinutes,
    play,
    pause,
    stop,
    skipSection,
  };
}

export type LessonReaderState = ReturnType<typeof useLessonReader>;
