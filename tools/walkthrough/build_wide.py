#!/usr/bin/env python3
"""
Builds the horizontal (1920x1080) 4 Rivers introduction for LinkedIn from
storyboard_wide.json and the screenshots in shots/. Same toolchain as
build.py (Pillow frames, music.py track, encode.swift), but with an
introduction-style layout: animated text on the left, a phone showing the real
app on the right, and a colored wipe between scenes.

    python3 build_wide.py       # writes out/four-rivers-linkedin.mp4
"""
import json, math, multiprocessing as mp, os, shutil, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
SB = json.loads((HERE / "storyboard_wide.json").read_text())
W, H, FPS = 1920, 1080, SB["fps"]
SCRATCH = Path(os.environ.get("WALKTHROUGH_TMP", "/tmp/four-rivers-walkthrough")) / "wide"
OUT = HERE / "out"

BG = (250, 245, 236)
INK = (44, 38, 32)
INK_SOFT = (92, 83, 71)
GEORGIA_B = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
GEORGIA = "/System/Library/Fonts/Supplemental/Georgia.ttf"
HELV = "/System/Library/Fonts/Helvetica.ttc"
WIPE = 0.4          # half-length of the transition, in seconds
BAND, SLANT = 380, 180
X0, TEXT_W = 130, 880
PHONE_W, PHONE_H, BEZEL = 520, 880, 14
SRC_W, SRC_H = 690, 1494
CROP_H = round(SRC_W * PHONE_H / PHONE_W)
PHONE_CX, PHONE_TOP = 1440, 100
RIVERS = [
    ("RIVER 1  ·  PISHON", "Multiple Streams of Income", "Cultivate more than one source of provision.", "#2f6f4f"),
    ("RIVER 2  ·  GIHON", "Saving", "Store in advance for what is ahead.", "#1f6f8b"),
    ("RIVER 3  ·  HIDDEKEL", "Investing", "Put what you have to faithful work over time.", "#3a5a9b"),
    ("RIVER 4  ·  EUPHRATES", "Giving", "Let the stream flow back out to others.", "#a9743b"),
]


def rgb(hexstr):
    h = hexstr.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def ease_out(x):
    x = max(0.0, min(1.0, x))
    return 1 - (1 - x) ** 3


def ease_io(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def font(path, size, index=0):
    return ImageFont.truetype(path, size, index=index)


def wrap(draw, text, fnt, max_w):
    lines, cur = [], ""
    for word in text.split():
        trial = f"{cur} {word}".strip()
        if draw.textlength(trial, font=fnt) <= max_w:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    return lines + [cur]


def text_layer(text, fnt, fill, width, line_h, center=False, spacing=0):
    probe = ImageDraw.Draw(Image.new("RGB", (4, 4)))
    lines = wrap(probe, text, fnt, width) if not spacing else [text]
    img = Image.new("RGBA", (width, line_h * len(lines) + 12), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for i, line in enumerate(lines):
        if spacing:  # letter-spaced kicker
            total = sum(d.textlength(c, font=fnt) + spacing for c in line) - spacing
            x = (width - total) / 2 if center else 0
            for c in line:
                d.text((x, i * line_h), c, font=fnt, fill=fill)
                x += d.textlength(c, font=fnt) + spacing
        else:
            x = (width - d.textlength(line, font=fnt)) / 2 if center else 0
            d.text((x, i * line_h), line, font=fnt, fill=fill)
    return img


def rounded(size, radius, fill):
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(img).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=fill)
    return img


def soft_shadow(size, box, radius, color, alpha, blur):
    """RGBA layer holding a blurred rounded rect; only alpha is blurred so there is no dark halo."""
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(box, radius=radius, fill=alpha)
    mask = mask.filter(ImageFilter.GaussianBlur(blur))
    layer = Image.new("RGBA", size, tuple(color) + (0,))
    layer.putalpha(mask)
    return layer


def background(accent, soft, center_glow):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img, "RGBA")
    cx, cy, r = (PHONE_CX, 540, 440) if center_glow else (W // 2, 540, 520)
    gm = Image.new("L", (W, H), 0)
    ImageDraw.Draw(gm).ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    gm = gm.filter(ImageFilter.GaussianBlur(40))
    img.paste(Image.new("RGB", (W, H), rgb(soft)), (0, 0), gm)
    # flowing river lines along the bottom, echoing the app's motif
    wave = Image.new("RGBA", (W * 2, 300 * 2), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wave)
    for k, (amp, ph, alpha) in enumerate([(26, 0.0, 70), (20, 1.7, 48), (14, 3.1, 32)]):
        pts = [(x, 2 * (170 + 40 * k) + 2 * amp * math.sin(x / 2 / 230 + ph)) for x in range(0, W * 2 + 8, 8)]
        wd.line(pts, fill=rgb(accent) + (alpha,), width=10, joint="curve")
    wave = wave.resize((W, 300), Image.LANCZOS)
    img.paste(wave, (0, H - 300), wave)
    # accent edge on the left
    d.rectangle([0, 0, 14, H], fill=rgb(accent) + (255,))
    return img


def build_phone(shot_path):
    shot = Image.open(HERE / shot_path).convert("RGB").crop((0, 0, SRC_W, SRC_H))
    pad = 70
    base = Image.new("RGBA", (PHONE_W + 2 * BEZEL + 2 * pad, PHONE_H + 2 * BEZEL + 2 * pad), (0, 0, 0, 0))
    pw, ph_ = PHONE_W + 2 * BEZEL, PHONE_H + 2 * BEZEL
    base.alpha_composite(soft_shadow(base.size, [pad, pad + 26, pad + pw, pad + 26 + ph_], 66, (50, 38, 20), 120, 26))
    base.alpha_composite(rounded((PHONE_W + 2 * BEZEL, PHONE_H + 2 * BEZEL), 66, (34, 30, 26, 255)), (pad, pad))
    mask = rounded((PHONE_W, PHONE_H), 52, (255, 255, 255, 255)).split()[3]
    return shot, base, mask, pad


class Scene:
    def __init__(self, spec, index, seconds):
        self.spec, self.index, self.seconds = spec, index, seconds
        self.kind = spec["type"]
        accent = rgb(spec["accent"])
        self.bg = background(spec["accent"], spec["soft"], self.kind != "closing")
        center = self.kind == "closing"
        width = W - 2 * X0 if center else TEXT_W
        k_font, h_font, b_font = font(HELV, 28, 1), font(GEORGIA_B, 92 if center else 76), font(GEORGIA, 37)
        kicker = text_layer(spec["kicker"].upper(), k_font, accent, width, 40, center, spacing=5)
        headline = text_layer(spec["headline"], h_font, INK, width, 100 if center else 88, center)
        body = text_layer(spec["body"], b_font, INK_SOFT, width, 56, center)
        rule = rounded((90, 8), 4, accent + (255,))
        gap1, gap2, gap3 = 22, 30, 34
        total = 8 + gap1 + kicker.height + gap2 + headline.height + gap3 + body.height
        if center:
            total += 150
        y = (H - total) // 2
        x = (W - width) // 2 if center else X0
        self.layers = []  # (image, x, y, delay)
        if center:
            for n, r in enumerate(RIVERS):
                bar = rounded((150, 12), 6, rgb(r[3]) + (255,))
                self.layers.append((bar, W // 2 - 4 * 80 + n * 160 + 5, y, 0.1 + 0.1 * n))
            y += 70
            total -= 70
        if not center:
            self.layers.append((rule, x, y, 0.05))
        y += 8 + gap1
        self.layers.append((kicker, x, y, 0.12))
        y += kicker.height + gap2
        self.layers.append((headline, x, y, 0.28))
        y += headline.height + gap3
        if center:
            url = text_layer(SB["footer"], font(GEORGIA_B, 70), accent, width, 90, True)
            self.layers.append((body, x, y, 0.55))
            self.layers.append((url, x, y + body.height + 10, 0.8))
        else:
            self.layers.append((body, x, y, 0.5))
        if self.kind == "phone":
            self.shot, self.phone, self.mask, self.pad = build_phone(spec["image"])
        elif self.kind == "rivers":
            self.cards = []
            cx0, cy0, ch, cg = 1090, 150, 170, 26
            for n, (label, title, line, col) in enumerate(RIVERS):
                card = Image.new("RGBA", (730, ch), (0, 0, 0, 0))
                body_card = rounded((730, ch), 26, (255, 253, 248, 255))
                card.alpha_composite(body_card)
                ImageDraw.Draw(card).rounded_rectangle([0, 0, 730 - 1, ch - 1], radius=26, outline=(226, 214, 192, 255), width=2)
                ImageDraw.Draw(card).rounded_rectangle([0, 0, 22, ch - 1], radius=11, fill=rgb(col) + (255,))
                dc = ImageDraw.Draw(card)
                dc.text((52, 24), label, font=font(HELV, 24, 1), fill=rgb(col))
                dc.text((52, 58), title, font=font(GEORGIA_B, 44), fill=INK)
                dc.text((52, 118), line, font=font(GEORGIA, 28), fill=INK_SOFT)
                shadow = soft_shadow((730 + 80, ch + 80), [40, 52, 40 + 730, 52 + ch], 26, (60, 45, 20), 70, 16)
                shadow.alpha_composite(card, (40, 40))
                self.cards.append((shadow, cx0 - 40, cy0 + n * (ch + cg) - 40, 0.55 + 0.2 * n))

    def render(self, t):
        img = self.bg.copy().convert("RGBA")
        for layer, x, y, delay in self.layers:
            a = ease_out((t - delay) / 0.55)
            if a <= 0:
                continue
            paste_alpha(img, layer, x, y + 42 * (1 - a), a)
        if self.kind == "phone":
            a = ease_out((t - 0.15) / 0.9)
            if a > 0:
                p = max(0.0, min(1.0, t / (self.seconds + WIPE)))
                lo, hi = self.spec["pan"]
                y0 = max(0, min(SRC_H - CROP_H, lo + (hi - lo) * p))
                screen = self.shot.crop((0, round(y0), SRC_W, round(y0) + CROP_H)).resize((PHONE_W, PHONE_H), Image.LANCZOS)
                ph = self.phone.copy()
                ph.paste(screen, (self.pad + BEZEL, self.pad + BEZEL), self.mask)
                float_y = 7 * math.sin(2 * math.pi * t / 4.5)
                x = PHONE_CX - ph.width // 2 + 320 * (1 - a)
                paste_alpha(img, ph, x, PHONE_TOP - self.pad - BEZEL + float_y, a)
        elif self.kind == "rivers":
            for card, x, y, delay in self.cards:
                a = ease_out((t - delay) / 0.6)
                if a > 0:
                    paste_alpha(img, card, x + 220 * (1 - a), y, a)
        return img.convert("RGB")


def paste_alpha(dst, src, x, y, a):
    if a < 0.999:
        src = src.copy()
        src.putalpha(src.getchannel("A").point(lambda v: int(v * a)))
    x, y = int(round(x)), int(round(y))
    sx, sy = max(0, -x), max(0, -y)
    ex, ey = min(src.width, dst.width - x), min(src.height, dst.height - y)
    if ex > sx and ey > sy:
        dst.alpha_composite(src.crop((sx, sy, ex, ey)), (x + sx, y + sy))


SCENES, STARTS, TOTAL = [], [], 0.0


def setup():
    global SCENES, STARTS, TOTAL
    t = 0.0
    for i, spec in enumerate(SB["scenes"]):
        secs = spec.get("seconds", SB["sceneSeconds"])
        SCENES.append(Scene(spec, i, secs))
        STARTS.append(t)
        t += secs
    TOTAL = t


def scene_time(i, T):
    return T - STARTS[i] + (WIPE if i > 0 else 0.2)


def frame(n):
    T = n / FPS
    i = max(k for k in range(len(SCENES)) if STARTS[k] <= T + 1e-9)
    near_next = i + 1 < len(SCENES) and T > STARTS[i + 1] - WIPE
    near_prev = i > 0 and T < STARTS[i] + WIPE
    if near_next:
        old_i, new_i, boundary = i, i + 1, STARTS[i + 1]
    elif near_prev:
        old_i, new_i, boundary = i - 1, i, STARTS[i]
    else:
        return SCENES[i].render(scene_time(i, T))
    q = ease_io((T - (boundary - WIPE)) / (2 * WIPE))
    old = SCENES[old_i].render(scene_time(old_i, T))
    new = SCENES[new_i].render(scene_time(new_i, T))
    xt = -(BAND + SLANT) + q * (W + BAND + SLANT)
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).polygon([(0, 0), (xt + SLANT, 0), (xt, H), (0, H)], fill=255)
    out = old.copy()
    out.paste(new, (0, 0), mask)
    band = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(band)
    col = rgb(SB["scenes"][new_i]["accent"])
    bd.polygon([(xt + SLANT, 0), (xt + BAND + SLANT, 0), (xt + BAND, H), (xt, H)], fill=col + (255,))
    bd.polygon([(xt + SLANT, 0), (xt + SLANT + 36, 0), (xt + 36, H), (xt, H)], fill=(255, 255, 255, 70))
    out.paste(band, (0, 0), band)
    return out


def render_frame(n):
    frame(n).save(SCRATCH / "frames" / f"f{n:05d}.jpg", quality=92)
    return n


def main():
    shutil.rmtree(SCRATCH, ignore_errors=True)
    (SCRATCH / "frames").mkdir(parents=True)
    (SCRATCH / "audio").mkdir()
    setup()
    total = TOTAL + 0.3
    if total > 90:
        sys.exit("longer than 90 seconds; trim scenes")
    count = round(total * FPS)
    print(f"{total:.1f}s, {len(SCENES)} scenes, {count} frames")
    with mp.get_context("fork").Pool(max(2, (os.cpu_count() or 4) - 1)) as pool:
        for _ in pool.imap_unordered(render_frame, range(count), chunksize=8):
            pass
    track = SCRATCH / "audio" / "music.wav"
    subprocess.run([sys.executable, str(HERE / "music.py"), str(track), str(total)], check=True)
    (SCRATCH / "audio.json").write_text(json.dumps([{"file": str(track), "start": 0}]))
    OUT.mkdir(exist_ok=True)
    out = OUT / SB["output"]
    subprocess.run(["swift", str(HERE / "encode.swift"), str(SCRATCH / "frames"), str(FPS), str(W), str(H),
                    str(SCRATCH / "audio.json"), str(out)], check=True)
    print("wrote", out)


if __name__ == "__main__":
    main()
