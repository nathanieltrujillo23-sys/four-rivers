#!/usr/bin/env python3
"""
Builds the 4 Rivers walkthrough video from storyboard.json and the screenshots
in shots/. macOS only: synthesizes a background track (music.py), uses Pillow for frames, and the
Swift/AVFoundation script next to this file to encode H.264 + audio, so no
ffmpeg is needed.

    python3 build.py            # writes out/four-rivers-30s.mp4
"""
import json, math, os, shutil, subprocess, sys, wave
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
SB = json.loads((HERE / "storyboard.json").read_text())
W, H = SB["size"]
FPS = SB["fps"]
FADE = SB["crossfade"]
HOLD = 1.0  # final hold on the closing card
SCRATCH = Path(os.environ.get("WALKTHROUGH_TMP", "/tmp/four-rivers-walkthrough"))
OUT = HERE / "out"

# The usable page area inside the raw screenshots (the rest is blank padding).
SRC_W, SRC_H = 690, 1494
CARD_X, CARD_Y, CARD_W, CARD_H = 60, 330, 960, 1380
CROP_H = round(SRC_W * CARD_H / CARD_W)

BG = (249, 244, 238)
INK = (44, 38, 32)
GOLD = (201, 162, 75)
SERIF_BOLD = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
SERIF = "/System/Library/Fonts/Supplemental/Georgia.ttf"


def plan():
    """Fixed beat length (the captions carry the message; the track is music only)."""
    beat = SB["beatSeconds"]
    beats = [beat] * len(SB["beats"])
    return beats, sum(beats) + HOLD


def wrap(draw, text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if draw.textlength(trial, font=font) <= max_w:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    return lines + [cur]


def background(caption, last):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    # soft gold rule under the caption, like the app's river motif
    font = ImageFont.truetype(SERIF_BOLD, 78)
    lines = wrap(d, caption, font, W - 160)
    y = 120 + (2 - len(lines)) * 40
    for line in lines:
        w = d.textlength(line, font=font)
        d.text(((W - w) / 2, y), line, font=font, fill=INK)
        y += 92
    d.rounded_rectangle([W / 2 - 60, 285, W / 2 + 60, 291], radius=3, fill=GOLD)
    foot = ImageFont.truetype(SERIF_BOLD if last else SERIF, 44 if last else 36)
    text = SB["footer"]
    w = d.textlength(text, font=foot)
    d.text(((W - w) / 2, 1790), text, font=foot, fill=GOLD if last else (120, 110, 98))
    # card shadow
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [CARD_X, CARD_Y + 14, CARD_X + CARD_W, CARD_Y + CARD_H + 14], radius=44, fill=(60, 45, 20, 70))
    shadow = shadow.filter(ImageFilter.GaussianBlur(26))
    img.paste(shadow, (0, 0), shadow)
    return img


MASK = Image.new("L", (CARD_W, CARD_H), 0)
ImageDraw.Draw(MASK).rounded_rectangle([0, 0, CARD_W - 1, CARD_H - 1], radius=40, fill=255)


def frame_for(bg, shot, pan, p):
    """p in [0, 1] through the beat; the card pans and eases in slightly."""
    y0 = pan[0] + (pan[1] - pan[0]) * p
    zoom = 1.0 - 0.035 * p  # a touch of push-in
    cw, ch = SRC_W * zoom, CROP_H * zoom
    x0 = (SRC_W - cw) / 2
    y0 = max(0, min(SRC_H - ch, y0 + (CROP_H - ch) / 2))
    card = shot.crop((round(x0), round(y0), round(x0 + cw), round(y0 + ch))).resize(
        (CARD_W, CARD_H), Image.LANCZOS)
    out = bg.copy()
    out.paste(card, (CARD_X, CARD_Y), MASK)
    return out


def main():
    beats, total = plan()
    print(f"{total:.1f}s total ({len(beats)} beats)")
    if total > 30:
        sys.exit("over the 30 second limit; lower beatSeconds or drop a beat")

    frames = SCRATCH / "frames"
    shutil.rmtree(frames, ignore_errors=True)
    frames.mkdir(parents=True)

    n_total = round(total * FPS)
    starts = [sum(beats[:i]) for i in range(len(beats))]
    shots = [Image.open(HERE / b["image"]).convert("RGB").crop((0, 0, SRC_W, SRC_H)) for b in SB["beats"]]
    bgs = [background(b["caption"], i == len(beats) - 1) for i, b in enumerate(SB["beats"])]

    def render(t):
        i = max(k for k in range(len(beats)) if starts[k] <= t + 1e-9)
        end = starts[i] + beats[i] + (HOLD if i == len(beats) - 1 else 0)
        p = min(1.0, (t - starts[i]) / max(0.01, end - starts[i]))
        img = frame_for(bgs[i], shots[i], SB["beats"][i]["pan"], p)
        local = t - starts[i]
        if i > 0 and local < FADE:
            prev = frame_for(bgs[i - 1], shots[i - 1], SB["beats"][i - 1]["pan"], 1.0)
            img = Image.blend(prev, img, local / FADE)
        return img

    for n in range(n_total):
        render(n / FPS).save(frames / f"f{n:05d}.jpg", quality=93)

    (SCRATCH / "audio").mkdir(parents=True, exist_ok=True)
    track = SCRATCH / "audio" / "music.wav"
    subprocess.run([sys.executable, str(HERE / "music.py"), str(track), str(total)], check=True)
    (SCRATCH / "audio.json").write_text(json.dumps([{"file": str(track), "start": 0}]))
    OUT.mkdir(exist_ok=True)
    out = OUT / "four-rivers-30s.mp4"
    subprocess.run(["swift", str(HERE / "encode.swift"), str(frames), str(FPS), str(W), str(H),
                    str(SCRATCH / "audio.json"), str(out)], check=True)
    print("wrote", out)


if __name__ == "__main__":
    main()
