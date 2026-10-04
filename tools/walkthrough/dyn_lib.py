"""
Drawing and animation helpers for the dynamic 4 Rivers video (build_dynamic.py).
Everything is Pillow: layers are RGBA images placed with scale, rotation, and
alpha; 3D angles come from a perspective warp; scene changes are masks.
"""
import math
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

W, H = 1920, 1080
GEORGIA_B = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
GEORGIA = "/System/Library/Fonts/Supplemental/Georgia.ttf"
GEORGIA_I = "/System/Library/Fonts/Supplemental/Georgia Italic.ttf"
HELV = "/System/Library/Fonts/Helvetica.ttc"
HAND = "/System/Library/Fonts/Supplemental/Bradley Hand Bold.ttf"

PARCHMENT = (250, 245, 236)
PARCHMENT_DEEP = (242, 233, 216)
INK = (44, 38, 32)
INK_SOFT = (92, 83, 71)
NAVY = (39, 75, 109)
NAVY_DEEP = (24, 46, 70)
GOLD = (201, 162, 75)
CLAY = (169, 116, 59)
GREEN = (47, 111, 79)
TEAL = (31, 111, 139)
INDIGO = (58, 90, 155)
RIVER_COLORS = [GREEN, TEAL, INDIGO, CLAY]


def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


# ---------------------------------------------------------------- easing
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def lerp(a, b, t):
    return a + (b - a) * t


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def ease_in(x):
    x = clamp(x)
    return x ** 3


def ease_io(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def ease_expo(x):
    x = clamp(x)
    return 1.0 if x >= 1 else 1 - 2 ** (-10 * x)


def ease_back(x, s=1.70158):
    x = clamp(x) - 1
    return x * x * ((s + 1) * x + s) + 1


def seg(t, start, dur):
    """0..1 progress of t within [start, start+dur]."""
    return clamp((t - start) / dur) if dur > 0 else (1.0 if t >= start else 0.0)


# ---------------------------------------------------------------- fonts
_FONTS = {}


def font(path, size, index=0):
    key = (path, size, index)
    if key not in _FONTS:
        _FONTS[key] = ImageFont.truetype(path, size, index=index)
    return _FONTS[key]


# ---------------------------------------------------------------- layers
def blank(w=W, h=H, color=(0, 0, 0, 0)):
    return Image.new("RGBA", (w, h), color)


def rounded(size, radius, fill, outline=None, width=0):
    img = blank(*size)
    ImageDraw.Draw(img).rounded_rectangle(
        [0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=fill, outline=outline, width=width
    )
    return img


def soft_shadow(size, box, radius, alpha=110, blur=24, color=(40, 30, 15)):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(box, radius=radius, fill=alpha)
    mask = mask.filter(ImageFilter.GaussianBlur(blur))
    layer = Image.new("RGBA", size, tuple(color) + (0,))
    layer.putalpha(mask)
    return layer


def card(size, radius=28, fill=(255, 253, 248, 255), pad=60, shadow=100, blur=22, dy=20):
    """A rounded card with a soft shadow, padded so the shadow is not clipped."""
    w, h = size
    out = blank(w + 2 * pad, h + 2 * pad)
    out.alpha_composite(soft_shadow(out.size, [pad, pad + dy, pad + w, pad + dy + h], radius, shadow, blur))
    out.alpha_composite(rounded(size, radius, fill), (pad, pad))
    return out


def paste_clipped(dst, src, x, y):
    sx, sy = max(0, -x), max(0, -y)
    ex, ey = min(src.width, dst.width - x), min(src.height, dst.height - y)
    if ex > sx and ey > sy:
        dst.alpha_composite(src.crop((sx, sy, ex, ey)), (x + sx, y + sy))


def with_alpha(im, alpha):
    if alpha >= 0.999:
        return im
    im = im.copy()
    a = im.getchannel("A")
    im.putalpha(ImageChops.multiply(a, Image.new("L", a.size, int(255 * clamp(alpha)))))
    return im


def place(dst, src, cx, cy, scale=1.0, rot=0.0, alpha=1.0):
    """Draw `src` centered at (cx, cy), optionally scaled, rotated (degrees, counter-clockwise), and faded."""
    if alpha <= 0.004 or scale <= 0.002:
        return
    im = src
    if abs(scale - 1.0) > 0.002:
        im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.BILINEAR)
    if abs(rot) > 0.05:
        im = im.rotate(rot, resample=Image.BICUBIC, expand=True)
    im = with_alpha(im, alpha)
    paste_clipped(dst, im, round(cx - im.width / 2), round(cy - im.height / 2))


def place_tl(dst, src, x, y, alpha=1.0):
    paste_clipped(dst, with_alpha(src, alpha), round(x), round(y))


# ---------------------------------------------------------------- text
def text_img(text, fnt, fill, width=None, line_h=None, center=False, tracking=0):
    """Wrapped text as an RGBA layer. `tracking` adds letter spacing (and disables wrapping)."""
    probe = ImageDraw.Draw(Image.new("RGB", (4, 4)))
    asc, desc = fnt.getmetrics()
    lh = line_h or round((asc + desc) * 1.08)
    if tracking:
        lines = [text]
    elif width:
        lines, cur = [], ""
        for word in text.split():
            trial = f"{cur} {word}".strip()
            if probe.textlength(trial, font=fnt) <= width:
                cur = trial
            else:
                lines.append(cur)
                cur = word
        lines.append(cur)
    else:
        lines = [text]

    def line_w(s):
        if tracking:
            return sum(probe.textlength(c, font=fnt) + tracking for c in s) - tracking
        return probe.textlength(s, font=fnt)

    w = width or math.ceil(max(line_w(s) for s in lines)) + 4
    img = blank(w, lh * len(lines) + 10)
    d = ImageDraw.Draw(img)
    for i, s in enumerate(lines):
        x = (w - line_w(s)) / 2 if center else 0
        if tracking:
            for c in s:
                d.text((x, i * lh), c, font=fnt, fill=fill)
                x += d.textlength(c, font=fnt) + tracking
        else:
            d.text((x, i * lh), s, font=fnt, fill=fill)
    return img


def word_layers(text, fnt, fill, max_w, line_h, center=False):
    """Words laid out in wrapped lines: [(img, x, y)], plus (block_w, block_h)."""
    probe = ImageDraw.Draw(Image.new("RGB", (4, 4)))
    space = probe.textlength(" ", font=fnt)
    lines, cur, cur_w = [], [], 0
    for word in text.split():
        ww = probe.textlength(word, font=fnt)
        if cur and cur_w + space + ww > max_w:
            lines.append((cur, cur_w))
            cur, cur_w = [], 0
        cur.append((word, ww))
        cur_w += (space if len(cur) > 1 else 0) + ww
    lines.append((cur, cur_w))
    out = []
    asc, desc = fnt.getmetrics()
    for li, (words, lw) in enumerate(lines):
        x = (max_w - lw) / 2 if center else 0
        for word, ww in words:
            im = blank(math.ceil(ww) + 8, asc + desc + 8)
            ImageDraw.Draw(im).text((0, 0), word, font=fnt, fill=fill)
            out.append((im, x, li * line_h, word))
            x += ww + space
    return out, (max_w, line_h * len(lines))


def slide_up(im, p, rise=0.9):
    """Reveal a layer by sliding it up into its own box (clipped)."""
    p = clamp(p)
    if p >= 1:
        return im
    if p <= 0:
        return None
    out = blank(*im.size)
    out.alpha_composite(im, (0, round((1 - ease_out(p)) * im.height * rise)))
    return out


# ---------------------------------------------------------------- 3D
def _solve(a, b):
    n = len(b)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for i in range(n):
        piv = max(range(i, n), key=lambda r: abs(m[r][i]))
        m[i], m[piv] = m[piv], m[i]
        for r in range(i + 1, n):
            f = m[r][i] / m[i][i]
            for c in range(i, n + 1):
                m[r][c] -= f * m[i][c]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = (m[i][n] - sum(m[i][j] * x[j] for j in range(i + 1, n))) / m[i][i]
    return x


def perspective_coeffs(dst_quad, src_quad):
    """PIL wants coefficients mapping output pixels back to input pixels."""
    a, b = [], []
    for (X, Y), (x, y) in zip(dst_quad, src_quad):
        a.append([X, Y, 1, 0, 0, 0, -x * X, -x * Y])
        b.append(x)
        a.append([0, 0, 0, X, Y, 1, -y * X, -y * Y])
        b.append(y)
    return _solve(a, b)


def tilt(im, yaw=0.0, pitch=0.0, dist=2200.0):
    """Rotate a flat layer in 3D (degrees) and project it with perspective."""
    w, h = im.size
    if abs(yaw) < 0.2 and abs(pitch) < 0.2:
        return im
    ya, pa = math.radians(yaw), math.radians(pitch)
    pts = []
    for x, y in [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]:
        x1 = x * math.cos(ya)
        z1 = x * math.sin(ya)
        y2 = y * math.cos(pa) - z1 * math.sin(pa)
        z2 = y * math.sin(pa) + z1 * math.cos(pa)
        k = dist / (dist + z2)
        pts.append((x1 * k, y2 * k))
    minx, maxx = min(p[0] for p in pts), max(p[0] for p in pts)
    miny, maxy = min(p[1] for p in pts), max(p[1] for p in pts)
    ow, oh = math.ceil(maxx - minx), math.ceil(maxy - miny)
    dst = [(p[0] - minx, p[1] - miny) for p in pts]
    coeffs = perspective_coeffs(dst, [(0, 0), (w, 0), (w, h), (0, h)])
    return im.transform((ow, oh), Image.PERSPECTIVE, coeffs, Image.BICUBIC)


# ---------------------------------------------------------------- camera
def camera(img, zoom=1.0, cx=W / 2, cy=H / 2, rot=0.0):
    """Punch in on (cx, cy) of a full frame; optional slight roll."""
    if abs(zoom - 1.0) < 0.002 and abs(rot) < 0.05:
        return img
    cw, ch = W / zoom, H / zoom
    x0 = clamp(cx - cw / 2, 0, W - cw)
    y0 = clamp(cy - ch / 2, 0, H - ch)
    out = img.crop((round(x0), round(y0), round(x0 + cw), round(y0 + ch))).resize((W, H), Image.BICUBIC)
    if abs(rot) > 0.05:
        out = out.rotate(rot, resample=Image.BICUBIC, expand=False, fillcolor=(0, 0, 0))
    return out


# ---------------------------------------------------------------- backgrounds
_BG = {}


def gradient_bg(top, bottom, glow=None, glow_xy=(W // 2, H // 2), glow_r=700):
    key = (top, bottom, glow, glow_xy, glow_r)
    if key in _BG:
        return _BG[key].copy()
    col = Image.new("RGB", (1, H))
    px = col.load()
    for y in range(H):
        t = y / (H - 1)
        px[0, y] = tuple(round(lerp(top[i], bottom[i], t)) for i in range(3))
    img = col.resize((W, H))
    if glow:
        m = Image.new("L", (W, H), 0)
        cx, cy = glow_xy
        ImageDraw.Draw(m).ellipse([cx - glow_r, cy - glow_r, cx + glow_r, cy + glow_r], fill=255)
        m = m.filter(ImageFilter.GaussianBlur(120))
        img.paste(Image.new("RGB", (W, H), glow), (0, 0), m)
    _BG[key] = img
    return img.copy()


def bezier(p0, p1, p2, p3, n=60):
    pts = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        pts.append((
            u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
            u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1],
        ))
    return pts


def draw_line(img, pts, color, width, alpha=255):
    """Polyline with round caps on an RGBA image (drawn on a supersampled overlay)."""
    if len(pts) < 2:
        return
    ov = blank(*img.size)
    d = ImageDraw.Draw(ov)
    d.line(pts, fill=tuple(color) + (alpha,), width=width, joint="curve")
    r = width / 2
    for p in (pts[0], pts[-1]):
        d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=tuple(color) + (alpha,))
    img.alpha_composite(ov)


def drifting_waves(img, t, color, y0=H - 170, amp=22, alpha=60, count=3):
    """Gentle flowing lines along the bottom, echoing the app's river motif."""
    ov = blank(*img.size)
    d = ImageDraw.Draw(ov)
    for k in range(count):
        pts = [(x, y0 + k * 26 + amp * math.sin(x / 210 + t * (0.8 + 0.25 * k) + k * 1.7)) for x in range(0, W + 20, 20)]
        d.line(pts, fill=tuple(color) + (alpha - k * 14,), width=8, joint="curve")
    img.alpha_composite(ov)


# ---------------------------------------------------------------- transitions
def _mask_circle(cx, cy, r):
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    return m


def transition(kind, a, b, p, ring=(201, 162, 75)):
    """Blend frame `a` (old) into `b` (new). p is eased progress 0..1."""
    p = clamp(p)
    if kind == "iris":
        r = p * math.hypot(W, H) * 0.62
        out = a.copy()
        out.paste(b, (0, 0), _mask_circle(W * 0.5, H * 0.5, r))
        if 0.02 < p < 0.98:
            d = ImageDraw.Draw(out)
            d.ellipse([W / 2 - r, H / 2 - r, W / 2 + r, H / 2 + r], outline=ring, width=10)
        return out
    if kind in ("push_left", "push_right", "push_up"):
        out = Image.new("RGB", (W, H))
        if kind == "push_left":
            dx = round(-W * p)
            out.paste(a, (dx, 0))
            out.paste(b, (dx + W, 0))
        elif kind == "push_right":
            dx = round(W * p)
            out.paste(a, (dx, 0))
            out.paste(b, (dx - W, 0))
        else:
            dy = round(-H * p)
            out.paste(a, (0, dy))
            out.paste(b, (0, dy + H))
        return out
    if kind == "zoomthrough":
        scale = 1 + 0.9 * ease_in(p)
        big = a.resize((round(W * scale), round(H * scale)), Image.BILINEAR)
        x0, y0 = (big.width - W) // 2, (big.height - H) // 2
        old = big.crop((x0, y0, x0 + W, y0 + H))
        sc = 0.72 + 0.28 * ease_out(p)
        small = b.resize((round(W * sc), round(H * sc)), Image.BILINEAR)
        new = Image.new("RGB", (W, H))
        new.paste(small, ((W - small.width) // 2, (H - small.height) // 2))
        # the new scene fades in behind the old one rushing past the camera
        out = Image.blend(new if sc < 0.999 else b, b, ease_out(p)) if sc < 0.999 else b
        out = Image.blend(out, old, clamp(1 - p * 1.5))
        return out
    if kind == "doors":
        out = b.copy()
        half = W // 2
        shift = round(half * ease_io(p))
        out.paste(a.crop((0, 0, half, H)), (-shift, 0))
        out.paste(a.crop((half, 0, W, H)), (half + shift, 0))
        return out
    if kind == "blinds":
        m = Image.new("L", (W, H), 0)
        d = ImageDraw.Draw(m)
        n = 8
        for i in range(n):
            y0 = i * H / n
            d.rectangle([0, y0, W, y0 + (H / n) * clamp(p * 1.6 - i * 0.08)], fill=255)
        out = a.copy()
        out.paste(b, (0, 0), m)
        return out
    if kind == "flash":
        out = Image.blend(a, b, ease_io(p))
        glow = Image.new("RGB", (W, H), (255, 252, 244))
        return Image.blend(out, glow, math.sin(math.pi * p) * 0.85)
    if kind == "rotate":
        ang = -14 * ease_in(p)
        sc = 1 + 0.35 * ease_in(p)
        old = a.resize((round(W * sc), round(H * sc)), Image.BILINEAR).rotate(ang, resample=Image.BICUBIC, expand=False)
        x0, y0 = (old.width - W) // 2, (old.height - H) // 2
        old = old.crop((x0, y0, x0 + W, y0 + H))
        return Image.blend(old, b, ease_io(clamp(p * 1.25 - 0.1)))
    if kind == "diag":
        band, slant = 380, 190
        xt = -(band + slant) + p * (W + band + slant)
        mask = Image.new("L", (W, H), 0)
        ImageDraw.Draw(mask).polygon([(0, 0), (xt + slant, 0), (xt, H), (0, H)], fill=255)
        out = a.copy()
        out.paste(b, (0, 0), mask)
        ov = blank(W, H)
        ImageDraw.Draw(ov).polygon(
            [(xt + slant, 0), (xt + band + slant, 0), (xt + band, H), (xt, H)], fill=tuple(ring) + (255,)
        )
        out.paste(ov, (0, 0), ov)
        return out
    return b if p > 0.5 else a
