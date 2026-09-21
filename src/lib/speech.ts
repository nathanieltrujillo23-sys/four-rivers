/**
 * Text-to-speech provider seam.
 *
 * v1 uses the browser's built-in speech synthesis (Web Speech API): free, no
 * server, and the voices are the ones your device already ships with (often
 * quite natural on recent macOS, iOS, Android and Windows). To upgrade to a
 * hosted AI voice later (e.g. OpenAI or ElevenLabs), implement `SpeechProvider`
 * with a server-side proxy that holds the API key and swap it in
 * `getSpeechProvider()`. The reader UI does not need to change.
 */

export interface VoiceOption {
  id: string;
  label: string;
}

export interface SpeakOptions {
  /** 0.5 – 2.5, where 1 is normal speed. */
  rate: number;
  voiceId?: string | null;
}

export interface SpeechProvider {
  readonly supported: boolean;
  listVoices(): VoiceOption[];
  /** Calls back whenever the voice list changes (browsers load voices lazily). */
  onVoicesChanged(cb: () => void): () => void;
  /** Resolves when the text finishes, or when it is cancelled. Rejects on real errors. */
  speak(text: string, opts: SpeakOptions): Promise<void>;
  cancel(): void;
}

class BrowserSpeechProvider implements SpeechProvider {
  readonly supported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined";

  private voices(): SpeechSynthesisVoice[] {
    if (!this.supported) return [];
    return window.speechSynthesis
      .getVoices()
      .filter((v) => v.lang.toLowerCase().startsWith("en"))
      .sort(
        (a, b) =>
          Number(b.localService) - Number(a.localService) || a.name.localeCompare(b.name)
      );
  }

  listVoices(): VoiceOption[] {
    return this.voices().map((v) => ({ id: v.voiceURI, label: `${v.name} (${v.lang})` }));
  }

  onVoicesChanged(cb: () => void): () => void {
    if (!this.supported) return () => {};
    window.speechSynthesis.addEventListener("voiceschanged", cb);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", cb);
  }

  speak(text: string, opts: SpeakOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.supported) return reject(new Error("Speech is not supported"));
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = Math.min(4, Math.max(0.1, opts.rate));
      const voice = opts.voiceId
        ? window.speechSynthesis.getVoices().find((v) => v.voiceURI === opts.voiceId)
        : undefined;
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = "en-US";
      }
      utterance.onend = () => resolve();
      utterance.onerror = (e) => {
        // cancel() surfaces as "interrupted"/"canceled"; that's not a failure.
        if (e.error === "interrupted" || e.error === "canceled") resolve();
        else reject(new Error(e.error));
      };
      window.speechSynthesis.speak(utterance);
    });
  }

  cancel(): void {
    if (this.supported) window.speechSynthesis.cancel();
  }
}

let provider: SpeechProvider | null = null;

export function getSpeechProvider(): SpeechProvider {
  if (!provider) provider = new BrowserSpeechProvider();
  return provider;
}
