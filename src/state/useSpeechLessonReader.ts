import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Lesson } from "../types";
import { buildSegments, splitIntoChunks } from "../lib/lessonSegments";
import { RATE_MAX, RATE_MIN, type ReaderStatus } from "./useAudioLessonReader";

const KEY_RATE = "four-rivers:speech:rate";
const KEY_VOICE = "four-rivers:speech:voice";
const KEY_SCRIPTURE = "four-rivers:speech:scripture";

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
    /* the setting just won't persist */
  }
}

interface Chunk {
  key: string;
  text: string;
  scripture: boolean;
}

export interface SpeechVoice {
  slug: string;
  name: string;
}

/**
 * Read-aloud for languages that have no pre-recorded audio (Spanish). Uses
 * the browser's own speech voices, one sentence-sized chunk at a time, and
 * reports the same shape as useAudioLessonReader so the player bar and the
 * lesson highlighting work for either. Verses are read in the matching
 * Spanish version.
 */
export function useSpeechLessonReader(lesson: Lesson, enabled: boolean, voiceLang: string) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [rate, setRateState] = useState(() => {
    const n = Number(load(KEY_RATE));
    return Number.isFinite(n) && n >= RATE_MIN && n <= RATE_MAX ? n : 1;
  });
  const [voiceId, setVoiceIdState] = useState<string | null>(() => load(KEY_VOICE) || null);
  const [includeScripture, setIncludeScriptureState] = useState(() => load(KEY_SCRIPTURE) === "1");
  const [status, setStatus] = useState<ReaderStatus>("idle");
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const queue = useMemo<Chunk[]>(
    () =>
      buildSegments(lesson, voiceLang === "es" ? "es" : "en").flatMap((seg) =>
        splitIntoChunks(seg.text).map((text) => ({ key: seg.key, text, scripture: seg.scripture })),
      ),
    [lesson, voiceLang],
  );
  const indexRef = useRef(0);
  const runRef = useRef(0); // bumped on every stop so a stale utterance can't continue the queue
  const rateRef = useRef(rate);
  const scriptureRef = useRef(includeScripture);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  rateRef.current = rate;
  scriptureRef.current = includeScripture;

  useEffect(() => {
    if (!supported) return;
    const read = () => setVoices(window.speechSynthesis.getVoices());
    read();
    window.speechSynthesis.addEventListener("voiceschanged", read);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", read);
  }, [supported]);

  const choices = useMemo<SpeechVoice[]>(
    () =>
      voices
        .filter((v) => v.lang.toLowerCase().startsWith(voiceLang))
        .map((v) => ({ slug: v.voiceURI, name: `${v.name} (${v.lang})` })),
    [voices, voiceLang],
  );

  useEffect(() => {
    voiceRef.current = voices.find((v) => v.voiceURI === voiceId) ?? null;
  }, [voices, voiceId]);

  const halt = useCallback(() => {
    runRef.current += 1;
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  const speakFrom = useCallback(
    (start: number) => {
      if (!supported) return;
      const run = ++runRef.current;
      window.speechSynthesis.cancel();
      let i = start;
      const step = () => {
        if (run !== runRef.current) return;
        while (i < queue.length && queue[i].scripture && !scriptureRef.current) i += 1;
        if (i >= queue.length) {
          setStatus("idle");
          setActiveKey(null);
          indexRef.current = 0;
          return;
        }
        indexRef.current = i;
        const chunk = queue[i];
        setActiveKey(chunk.key);
        const utter = new SpeechSynthesisUtterance(chunk.text);
        utter.rate = rateRef.current;
        utter.lang = voiceLang === "es" ? "es-US" : voiceLang;
        if (voiceRef.current) utter.voice = voiceRef.current;
        utter.onend = () => {
          i += 1;
          step();
        };
        utter.onerror = () => {
          if (run === runRef.current) {
            setStatus("idle");
            setActiveKey(null);
          }
        };
        window.speechSynthesis.speak(utter);
      };
      step();
    },
    [supported, queue, voiceLang],
  );

  const play = useCallback(() => {
    setStatus("playing");
    speakFrom(status === "paused" ? indexRef.current : 0);
  }, [speakFrom, status]);

  const pause = useCallback(() => {
    halt();
    setStatus("paused");
  }, [halt]);

  const stop = useCallback(() => {
    halt();
    indexRef.current = 0;
    setStatus("idle");
    setActiveKey(null);
  }, [halt]);

  // A new lesson, a language change, or leaving the page ends any speech.
  useEffect(() => {
    return () => {
      runRef.current += 1;
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported, queue, enabled]);
  useEffect(() => {
    setStatus("idle");
    setActiveKey(null);
    indexRef.current = 0;
  }, [queue, enabled]);

  // Keep the spoken paragraph in view.
  useEffect(() => {
    if (!activeKey || status !== "playing") return;
    document.querySelector(`[data-seg="${activeKey}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeKey, status]);

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

  const words = useMemo(
    () => queue.filter((c) => includeScripture || !c.scripture).reduce((n, c) => n + c.text.split(/\s+/).length, 0),
    [queue, includeScripture],
  );
  const listenMinutes = words > 0 ? Math.max(1, Math.round(words / 150 / rate)) : null;

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
    /** Voices available for this language, for the picker. */
    choices,
    supported,
  };
}
