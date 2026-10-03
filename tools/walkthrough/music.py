#!/usr/bin/env python3
"""
Synthesizes an original upbeat, polished background track (no samples, nothing
licensed) as a mono 44.1 kHz WAV. Pure standard library.

    python3 music.py out.wav 27.0
"""
import array, math, random, sys, wave

SR = 44100
BPM = 112
BEAT = 60 / BPM
# I - V - vi - IV in C, one chord per bar: (bass root, chord tones as MIDI)
CHORDS = [(48, [60, 64, 67, 71]), (43, [55, 62, 67, 71]), (45, [57, 60, 64, 67]), (41, [53, 60, 65, 69])]


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def render(seconds):
    n = int(seconds * SR)
    buf = [0.0] * n
    rnd = random.Random(7)

    def add(start, dur, fn, gain):
        i0 = int(start * SR)
        for i in range(max(0, i0), min(n, i0 + int(dur * SR))):
            buf[i] += fn((i - i0) / SR) * gain

    def tone(f, attack, decay_to):
        def fn(t):
            env = min(1, t / attack) * math.exp(-t / decay_to)
            return env * (math.sin(2 * math.pi * f * t) + 0.35 * math.sin(4 * math.pi * f * t)
                          + 0.12 * math.sin(6 * math.pi * f * t))
        return fn

    bars = int(seconds / (BEAT * 4)) + 1
    for bar in range(bars):
        t0 = bar * BEAT * 4
        root, tones = CHORDS[bar % 4]
        level = min(1.0, 0.45 + bar * 0.12)  # builds over the first bars
        # warm pad: slightly detuned pairs held for the bar
        for m in tones[:3]:
            for det in (0.997, 1.003):
                f = hz(m) * det
                add(t0, BEAT * 4 + 0.3,
                    lambda t, f=f: min(1, t / 0.4) * math.sin(2 * math.pi * f * t) * 0.5 * (1 - 0.3 * (t / (BEAT * 4))),
                    0.045 * level)
        # bass: driving eighths from bar 1
        if bar >= 1:
            for e in range(8):
                add(t0 + e * BEAT / 2, BEAT * 0.45, tone(hz(root), 0.005, 0.18), 0.16 * level)
        # bright plucked arpeggio, sixteenth feel from bar 2
        pattern = [0, 1, 2, 3, 2, 1, 2, 3] if bar >= 2 else [0, 2, 1, 3]
        step = BEAT / 2 if bar < 2 else BEAT / 2
        for k in range(8 if bar >= 2 else 4):
            m = tones[pattern[k % len(pattern)]] + 12
            add(t0 + k * (BEAT if bar < 2 else BEAT / 2), 0.5, tone(hz(m), 0.003, 0.11), 0.07 * level)
        # kick on every beat from bar 2
        if bar >= 2:
            for b in range(4):
                add(t0 + b * BEAT, 0.28,
                    lambda t: math.sin(2 * math.pi * (50 + 110 * math.exp(-t * 40)) * t) * math.exp(-t / 0.09),
                    0.5)
        # offbeat hats and claps for energy
        if bar >= 3:
            for e in range(8):
                add(t0 + e * BEAT / 2 + BEAT / 4 * (e % 2 == 1) * 0, 0.05,
                    lambda t: (rnd.random() * 2 - 1) * math.exp(-t / 0.012), 0.05 if e % 2 else 0.025)
            for b in (1, 3):
                add(t0 + b * BEAT, 0.16,
                    lambda t: (rnd.random() * 2 - 1) * math.exp(-t / 0.035), 0.09)

    # master: gentle fade in/out, soft clip, normalize to about -3 dBFS
    fade_in, fade_out = 0.4, 2.2
    for i in range(n):
        t = i / SR
        g = min(1, t / fade_in) * min(1, (seconds - t) / fade_out)
        buf[i] = math.tanh(buf[i] * 1.4 * g)
    peak = max(abs(x) for x in buf) or 1
    return array.array("h", (int(x / peak * 0.7 * 32767) for x in buf))


if __name__ == "__main__":
    out, seconds = sys.argv[1], float(sys.argv[2])
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(render(seconds).tobytes())
