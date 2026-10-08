#!/usr/bin/env python3
"""
Draws the brand images from one definition of the mark, with smooth (supersampled) edges:
  public/og.png                       1200x630 share card (LinkedIn, Facebook, iMessage)
  public/icons/icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png
  public/favicon-32.png, public/favicon.ico
Needs Pillow and macOS fonts.   python3 tools/dev/make_brand_assets.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "public"
GEORGIA_B = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
GEORGIA_I = "/System/Library/Fonts/Supplemental/Georgia Italic.ttf"
HELV = "/System/Library/Fonts/Helvetica.ttc"

PARCHMENT = (250, 245, 236)
NAVY = (39, 75, 109)
GOLD = (201, 162, 75)
RIVERS = [(47, 111, 79), (31, 111, 139), (58, 90, 155), (169, 116, 59)]
SS = 4  # supersampling factor


def bez(p0, p1, p2, p3, n=120):
    pts = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        pts.append((u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                    u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]))
    return pts


def stroke(d, pts, color, width):
    """A smooth round-capped line: a disc at every sample point."""
    r = width / 2
    for x, y in pts:
        d.ellipse([x - r, y - r, x + r, y + r], fill=color)


def mark(d, ox, oy, size, colors=RIVERS, source=NAVY, bold=1.0):
    """The brand mark (from favicon.svg's 32-unit drawing) at (ox, oy) with the given pixel size."""
    k = size / 32
    streams = [
        ((16, 3), (16, 10), (6, 11), (5, 29)),
        ((16, 3), (16, 11), (12, 14), (11, 29)),
        ((16, 3), (16, 11), (20, 14), (21, 29)),
        ((16, 3), (16, 10), (26, 11), (27, 29)),
    ]
    for pts, col in zip(streams, colors):
        scaled = [(ox + x * k, oy + y * k) for x, y in bez(*pts)]
        stroke(d, scaled, col, 2.6 * k * bold)
    r = 2.4 * k * bold
    d.ellipse([ox + 16 * k - r, oy + 4 * k - r, ox + 16 * k + r, oy + 4 * k + r], fill=source)


def render(w, h, draw_fn, out, bg=None):
    img = Image.new("RGB", (w * SS, h * SS), bg or PARCHMENT)
    draw_fn(ImageDraw.Draw(img), SS)
    img.resize((w, h), Image.LANCZOS).save(out)


def icon(size, out, pad=0.12, rounded=True, plate=PARCHMENT):
    def fn(d, s):
        W = size * s
        if rounded:
            d.rounded_rectangle([0, 0, W, W], radius=W * 0.22, fill=plate)
        m = W * pad
        mark(d, m, m * 0.9, W - 2 * m, bold=1.12)
    img = Image.new("RGBA", (size * SS, size * SS), (0, 0, 0, 0) if rounded else plate + (255,))
    d = ImageDraw.Draw(img)
    fn(d, SS)
    img.resize((size, size), Image.LANCZOS).save(out)


# --- app icons and favicon
(PUB / "icons").mkdir(exist_ok=True)
icon(512, PUB / "icons" / "icon-512.png", pad=0.14)
icon(192, PUB / "icons" / "icon-192.png", pad=0.14)
icon(180, PUB / "icons" / "apple-touch-icon.png", pad=0.16, rounded=False)  # iOS rounds the corners itself
icon(512, PUB / "icons" / "maskable-512.png", pad=0.24, rounded=False)  # safe zone for any mask shape
icon(32, PUB / "favicon-32.png", pad=0.06)
big = Image.open(PUB / "icons" / "icon-512.png").convert("RGBA")
big.save(PUB / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

# --- share card
W, H = 1200, 630


def og(d, s):
    # the dark blue field is painted as a vertical gradient first
    top, bottom = (24, 46, 70), (39, 75, 109)
    for y in range(H * s):
        t = y / (H * s - 1)
        d.line([(0, y), (W * s, y)], fill=tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    src = (860 * s, 120 * s)
    ends = [(660, 540), (790, 560), (910, 560), (1060, 540)]
    cols = [(96, 196, 140), (72, 178, 212), (118, 148, 232), (222, 160, 90)]
    for (ex, ey), col in zip(ends, cols):
        pts = [(x * s, y * s) for x, y in bez((860, 120), (860, 280), (ex, ey - 220), (ex, ey))]
        stroke(d, pts, col + (255,), 13 * s)
        d.ellipse([(ex - 10) * s, (ey - 10) * s, (ex + 10) * s, (ey + 10) * s], fill=col)
    d.ellipse([src[0] - 19 * s, src[1] - 19 * s, src[0] + 19 * s, src[1] + 19 * s], fill=GOLD)
    f = lambda path, size, idx=0: ImageFont.truetype(path, size * s, index=idx)
    d.text((70 * s, 130 * s), "4 Rivers", font=f(GEORGIA_B, 132), fill=(255, 252, 244))
    d.text((74 * s, 295 * s), "One source. Four streams.", font=f(GEORGIA_I, 46), fill=(233, 220, 196))
    d.text((74 * s, 375 * s), "A free, Scripture-based course in", font=f(HELV, 30), fill=(214, 226, 240))
    d.text((74 * s, 415 * s), "stewardship for young adults.", font=f(HELV, 30), fill=(214, 226, 240))
    d.text((74 * s, 530 * s), "four-rivers.vercel.app", font=f(GEORGIA_B, 34), fill=GOLD)


render(W, H, og, PUB / "og.png")
print("brand assets written")
