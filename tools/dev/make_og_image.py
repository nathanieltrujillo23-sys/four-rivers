#!/usr/bin/env python3
"""Draws public/og.png (1200x630), the preview image shown when the site is shared. Needs Pillow and macOS fonts."""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
W, H = 1200, 630
GEORGIA_B = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
GEORGIA_I = "/System/Library/Fonts/Supplemental/Georgia Italic.ttf"
HELV = "/System/Library/Fonts/Helvetica.ttc"

img = Image.new("RGB", (W, H))
px = img.load()
top, bottom = (24, 46, 70), (39, 75, 109)
for y in range(H):
    t = y / (H - 1)
    c = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
    for x in range(W):
        px[x, y] = c

d = ImageDraw.Draw(img, "RGBA")


def bez(p0, p1, p2, p3, n=60):
    out = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        out.append((u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                    u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]))
    return out


src = (820, 130)
ends = [(640, 560), (770, 575), (880, 575), (1040, 560)]
cols = [(96, 196, 140), (72, 178, 212), (118, 148, 232), (222, 160, 90)]
for (ex, ey), col in zip(ends, cols):
    pts = bez(src, (src[0], src[1] + 160), (ex, ey - 200), (ex, ey))
    d.line(pts, fill=col + (60,), width=26, joint="curve")
    d.line(pts, fill=col + (255,), width=12, joint="curve")
    d.ellipse([ex - 10, ey - 10, ex + 10, ey + 10], fill=col + (255,))
d.ellipse([src[0] - 18, src[1] - 18, src[0] + 18, src[1] + 18], fill=(201, 162, 75, 255))

d.text((70, 150), "4 Rivers", font=ImageFont.truetype(GEORGIA_B, 128), fill=(255, 252, 244))
d.text((74, 300), "One source. Four streams.", font=ImageFont.truetype(GEORGIA_I, 44), fill=(233, 220, 196))
d.text((74, 380), "A free, Scripture based course in", font=ImageFont.truetype(HELV, 30), fill=(214, 226, 240))
d.text((74, 420), "stewardship for young adults.", font=ImageFont.truetype(HELV, 30), fill=(214, 226, 240))
d.text((74, 540), "four-rivers.vercel.app", font=ImageFont.truetype(GEORGIA_B, 36), fill=(201, 162, 75))

out = ROOT / "public" / "og.png"
img.save(out, optimize=True)
print("wrote", out)
