import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const KEY_CONTINUE = "four-rivers:reader:continue";

function load(): boolean {
  try {
    return localStorage.getItem(KEY_CONTINUE) === "1";
  } catch {
    return false;
  }
}
function save(on: boolean) {
  try {
    localStorage.setItem(KEY_CONTINUE, on ? "1" : "0");
  } catch {
    /* private mode: the choice just isn't remembered */
  }
}

interface Reader {
  status: "idle" | "playing" | "paused";
  voiceId: string | null;
  endedCount: number;
  play: () => void;
  pause: () => void;
  stop: () => void;
}

/**
 * Listening extras for a lesson page (Update 40):
 * - "Keep listening": when a lesson is read to the end, open the next one and keep reading (remembered per device).
 * - Lock-screen and headphone controls through the browser's Media Session: the lesson's title shows on the lock
 *   screen, and play, pause and "next" work from there.
 */
export function useListenExtras(reader: Reader, info: { title: string; album: string; nextTo: string | null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [keepListening, setKeep] = useState(load);
  const setKeepListening = useCallback((on: boolean) => {
    setKeep(on);
    save(on);
  }, []);

  // Arriving from the previous lesson with "keep listening" on: start reading once a voice is ready.
  const autoplay = (location.state as { autoplay?: boolean } | null)?.autoplay === true;
  const started = useRef(false);
  useEffect(() => {
    started.current = false;
  }, [location.key]);
  useEffect(() => {
    if (!autoplay || started.current || !reader.voiceId || reader.status !== "idle") return;
    started.current = true;
    const id = window.setTimeout(() => reader.play(), 350);
    return () => window.clearTimeout(id);
  }, [autoplay, reader, reader.voiceId, reader.status]);

  // A lesson read to its end: move on when asked to.
  const lastEnded = useRef(reader.endedCount);
  useEffect(() => {
    if (reader.endedCount === lastEnded.current) return;
    lastEnded.current = reader.endedCount;
    if (keepListening && info.nextTo) navigate(info.nextTo, { state: { autoplay: true } });
  }, [reader.endedCount, keepListening, info.nextTo, navigate]);

  // Lock screen and headphone buttons.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (reader.status === "idle") {
      ms.playbackState = "none";
      return;
    }
    try {
      ms.metadata = new MediaMetadata({ title: info.title, artist: "4 Rivers", album: info.album, artwork: [{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }] });
    } catch {
      /* older browsers */
    }
    ms.playbackState = reader.status === "playing" ? "playing" : "paused";
    const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        /* action not supported here */
      }
    };
    set("play", () => reader.play());
    set("pause", () => reader.pause());
    set("stop", () => reader.stop());
    set("nexttrack", info.nextTo ? () => navigate(info.nextTo as string, { state: { autoplay: true } }) : null);
    return () => {
      for (const a of ["play", "pause", "stop", "nexttrack"] as MediaSessionAction[]) set(a, null);
    };
  }, [reader, reader.status, info.title, info.album, info.nextTo, navigate]);

  return { keepListening, setKeepListening };
}
