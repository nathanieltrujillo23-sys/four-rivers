"""
The scenes of the dynamic 4 Rivers video. Each scene is a class with
render(t) -> RGB frame (t = seconds since the scene began, which can run a
little past its nominal length while a transition plays over it).
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from dyn_lib import *  # noqa: F401,F403

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
VALID = (0, 0, 690, 1494)  # the part of each 750x1624 screenshot that is real page content


# ------------------------------------------------------------------ assets
_SHOTS = {}


def shot(lang, name):
    """A phone screenshot (RGB, 690x1494), looked up in shots3 then shots2."""
    key = (lang, name)
    if key not in _SHOTS:
        for folder in ("shots3", "shots2"):
            p = HERE / folder / lang / f"{name}.jpg"
            if p.exists():
                _SHOTS[key] = Image.open(p).convert("RGB").crop(VALID)
                break
        else:
            raise FileNotFoundError(f"missing screenshot {lang}/{name}")
    return _SHOTS[key]


def ui_card(lang, name, box, scale=1.0, radius=26, pad=60, shadow=110):
    """A region of a screenshot as a rounded card with a soft shadow."""
    x0, y0, x1, y1 = box
    im = shot(lang, name).crop((max(0, x0), max(0, y0), min(690, x1), min(1494, y1)))
    if scale != 1.0:
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    mask = rounded(im.size, radius, (255, 255, 255, 255)).getchannel("A")
    base = blank(im.width + 2 * pad, im.height + 2 * pad)
    base.alpha_composite(soft_shadow(base.size, [pad, pad + 22, pad + im.width, pad + 22 + im.height], radius, shadow, 24))
    face = im.convert("RGBA")
    face.putalpha(mask)
    base.alpha_composite(face, (pad, pad))
    ImageDraw.Draw(base).rounded_rectangle(
        [pad, pad, pad + im.width - 1, pad + im.height - 1], radius=radius, outline=(226, 214, 192, 255), width=2
    )
    return base


def phone_layer(lang, name, pw=430, pan=0.0):
    """A phone mockup showing a screenshot (cropped to the phone's shape)."""
    s = shot(lang, name)
    ph = round(pw * 1494 / 690)
    crop_h = round(690 * ph / pw)
    y0 = round(clamp(pan, 0, 1) * (1494 - crop_h))
    screen = s.crop((0, y0, 690, y0 + crop_h)).resize((pw, ph), Image.LANCZOS)
    bez, pad = 14, 70
    out = blank(pw + 2 * bez + 2 * pad, ph + 2 * bez + 2 * pad)
    pwid, phei = pw + 2 * bez, ph + 2 * bez
    out.alpha_composite(soft_shadow(out.size, [pad, pad + 26, pad + pwid, pad + 26 + phei], 62, 130, 28))
    out.alpha_composite(rounded((pwid, phei), 62, (30, 27, 24, 255)), (pad, pad))
    face = screen.convert("RGBA")
    face.putalpha(rounded((pw, ph), 50, (255, 255, 255, 255)).getchannel("A"))
    out.alpha_composite(face, (pad + bez, pad + bez))
    return out


def pill(text, fnt, fg, bg, padx=34, pady=16, outline=None):
    probe = ImageDraw.Draw(Image.new("RGB", (4, 4)))
    asc, desc = fnt.getmetrics()
    w = math.ceil(probe.textlength(text, font=fnt)) + 2 * padx
    h = asc + desc + 2 * pady
    im = rounded((w, h), h // 2, bg, outline=outline, width=3 if outline else 0)
    ImageDraw.Draw(im).text((padx, pady - 2), text, font=fnt, fill=fg)
    return im


def marker(w, h, color, alpha=120):
    return rounded((max(2, round(w)), h), h // 3, tuple(color) + (alpha,))


def droplet(size, color):
    s = size
    im = blank(s, s)
    d = ImageDraw.Draw(im)
    d.polygon([(s / 2, 0), (s * 0.12, s * 0.58), (s * 0.88, s * 0.58)], fill=tuple(color) + (255,))
    d.ellipse([s * 0.12, s * 0.3, s * 0.88, s * 0.96], fill=tuple(color) + (255,))
    return im


def check_icon(size, color=(255, 255, 255), width=None):
    im = blank(size, size)
    d = ImageDraw.Draw(im)
    w = width or max(2, size // 6)
    d.line([(size * 0.22, size * 0.54), (size * 0.43, size * 0.74), (size * 0.8, size * 0.28)], fill=tuple(color) + (255,), width=w, joint="curve")
    return im


def title_words(text, fnt, fill, max_w, line_h, center=False):
    words, (bw, bh) = word_layers(text, fnt, fill, max_w, line_h, center)
    return words, bw, bh


def draw_words(img, words, x, y, t, start=0.0, step=0.08, dur=0.55, rise=0.8):
    for i, (im, wx, wy, _w) in enumerate(words):
        p = seg(t, start + i * step, dur)
        s = slide_up(im, p, rise)
        if s is not None:
            place_tl(img, s, x + wx, y + wy)


def highlight_words(img, words, which, x, y, t, start, dur, color, alpha=120):
    """A marker-pen sweep behind the chosen word indexes (one bar per line)."""
    rows = {}
    for idx in which:
        im, wx, wy, _w = words[idx]
        r = rows.setdefault(wy, [wx, wx + im.width - 8])
        r[0] = min(r[0], wx)
        r[1] = max(r[1], wx + im.width - 8)
    p = ease_out(seg(t, start, dur))
    for wy, (x0, x1) in rows.items():
        w = (x1 - x0 + 14) * p
        if w > 2:
            place_tl(img, marker(w, 58, color, alpha), x + x0 - 8, y + wy + 44)


# ------------------------------------------------------------------ scenes
class Scene:
    beats = 5

    def __init__(self, L, lang):
        self.L, self.lang = L, lang

    def render(self, t):  # pragma: no cover
        raise NotImplementedError


RIVER_X = [430, 800, 1120, 1490]


def river_paths(src=(960, 560), y_end=940, n=70):
    paths = []
    for x in RIVER_X:
        paths.append(bezier(src, (src[0], src[1] + 180), (x, y_end - 220), (x, y_end), n))
    return paths


class Intro(Scene):
    beats = 6

    def __init__(self, L, lang):
        super().__init__(L, lang)
        self.bg = gradient_bg(NAVY_DEEP, NAVY, glow=(60, 96, 140), glow_xy=(960, 520), glow_r=640)
        self.title = text_img("4 Rivers", font(GEORGIA_B, 210), (255, 252, 244), center=True)
        self.tag = text_img(L["intro_tag"], font(GEORGIA_I, 52), (233, 220, 196))
        self.paths = river_paths()
        self.labels = [text_img(s.upper(), font(HELV, 28, 1), tuple(c), tracking=5) for s, c in zip(L["intro_labels"], [(125, 214, 160), (110, 200, 226), (150, 175, 240), (232, 178, 112)])]

    def render(self, t):
        img = self.bg.convert("RGBA")
        drifting_waves(img, t, (130, 170, 210), alpha=40)
        colors = [(96, 196, 140), (72, 178, 212), (118, 148, 232), (222, 160, 90)]
        for i, (path, col) in enumerate(zip(self.paths, colors)):
            p = ease_out(seg(t, 0.25 + 0.13 * i, 1.15))
            k = max(2, int(len(path) * p))
            pts = path[:k]
            draw_line(img, pts, col, 30, 40)
            draw_line(img, pts, col, 14, 255)
            if p < 1:
                hx, hy = pts[-1]
                ImageDraw.Draw(img).ellipse([hx - 13, hy - 13, hx + 13, hy + 13], fill=(255, 250, 235, 255))
            la = seg(t, 1.25 + 0.1 * i, 0.4)
            if la > 0:
                lab = self.labels[i]
                place(img, lab, RIVER_X[i], 990, alpha=la)
        pulse = 1 + 0.12 * math.sin(t * 6)
        d = ImageDraw.Draw(img)
        r = 20 * pulse
        d.ellipse([960 - r, 560 - r, 960 + r, 560 + r], fill=GOLD + (255,))
        ts = lerp(1.45, 1.0, ease_expo(seg(t, 0.0, 0.9)))
        place(img, self.title, 960, 300, scale=ts, alpha=seg(t, 0, 0.35))
        s = slide_up(self.tag, seg(t, 0.75, 0.6))
        if s is not None:
            place(img, s, 960, 440)
        out = img.convert("RGB")
        return camera(out, 1.0 + 0.07 * (t / 3.4), 960, 540)


class Hero(Scene):
    beats = 6

    def __init__(self, L, lang):
        super().__init__(L, lang)
        self.bg = gradient_bg((252, 248, 240), (243, 233, 214), glow=(236, 222, 190), glow_xy=(1400, 520), glow_r=560)
        self.kick = text_img(L["hero_kick"].upper(), font(HELV, 30, 1), CLAY, tracking=6)
        self.words, self.bw, self.bh = title_words(L["hero_head"], font(GEORGIA_B, 112), INK, 900, 124)
        self.sub = text_img(L["hero_sub"], font(GEORGIA, 40), INK_SOFT, width=820, line_h=54)
        self.phone = phone_layer(lang, "home", 400)
        self.which = [i for i, w in enumerate(self.words) if w[3].strip(".").lower() in L["hero_hi"]]

    def render(self, t):
        img = self.bg.convert("RGBA")
        rnd = random.Random(3)
        for k in range(5):
            cx = 300 + 330 * k + 40 * math.sin(t * 0.9 + k)
            cy = 120 + rnd.randint(0, 800) + 24 * math.cos(t * 0.8 + k * 2)
            c = RIVER_COLORS[k % 4]
            ov = blank(300, 300)
            ImageDraw.Draw(ov).ellipse([40, 40, 260, 260], fill=c + (26,))
            place(img, ov, cx, cy)
        x0, y0 = 130, 270
        place_tl(img, with_alpha(self.kick, seg(t, 0.05, 0.4)), x0, y0 - 70)
        draw_words(img, self.words, x0, y0, t, start=0.2, step=0.11, dur=0.6)
        highlight_words(img, self.words, self.which, x0, y0, t, 1.35, 0.7, GOLD)
        s = slide_up(self.sub, seg(t, 1.4, 0.6))
        if s is not None:
            place_tl(img, s, x0, y0 + self.bh + 40)
        a = ease_out(seg(t, 0.1, 0.9))
        yaw = lerp(-52, -16, ease_out(seg(t, 0.1, 1.6))) + 3 * math.sin(t * 1.3)
        ph = tilt(self.phone, yaw=yaw, pitch=lerp(10, 3, a))
        place(img, ph, 1420 + 380 * (1 - a), 540 + 12 * math.sin(t * 1.7), alpha=a)
        return img.convert("RGB")


class FourRivers(Scene):
    beats = 7

    def __init__(self, L, lang):
        super().__init__(L, lang)
        self.bg = gradient_bg(NAVY_DEEP, (30, 58, 88), glow=(52, 88, 128), glow_xy=(960, 600), glow_r=760)
        self.head = text_img(L["rivers_head"], font(GEORGIA_B, 70), (255, 252, 244), center=True)
        self.cards = []
        for i, (num, name, line) in enumerate(L["rivers"]):
            col = RIVER_COLORS[i]
            c = card((380, 600), 30, (255, 253, 248, 255))
            d = ImageDraw.Draw(c)
            d.rounded_rectangle([60, 60, 60 + 380, 60 + 150], radius=30, fill=col + (255,))
            d.rectangle([60, 150, 60 + 380, 60 + 150], fill=col + (255,))
            c.alpha_composite(text_img(num, font(GEORGIA_B, 112), (255, 255, 255), center=True, width=380), (60, 62))
            c.alpha_composite(text_img(name, font(GEORGIA_B, 44), INK, width=330, line_h=52), (88, 244))
            c.alpha_composite(text_img(line, font(GEORGIA, 29), INK_SOFT, width=320, line_h=40), (88, 420))
            c.alpha_composite(droplet(60, col), (60 + 380 - 96, 60 + 600 - 96))
            self.cards.append(c)
        self.starts = [(-300, -300, -40), (700, 1500, 24), (1250, -500, 32), (2300, 560, -22)]

    def render(self, t):
        img = self.bg.convert("RGBA")
        drifting_waves(img, t, (140, 180, 220), alpha=34)
        place(img, with_alpha(self.head, seg(t, 0.0, 0.4)), 960, 120)
        for i, c in enumerate(self.cards):
            tx = 330 + 420 * i + 45 * 0
            ty = 610
            p = ease_back(seg(t, 0.1 + 0.16 * i, 0.9))
            sx, sy, rot0 = self.starts[i]
            x = lerp(sx, tx, p)
            y = lerp(sy, ty, p)
            rot = rot0 * (1 - p)
            bump = max(0.0, 1 - abs(t - (2.5 + 0.34 * i)) / 0.34)
            sc = 1 + 0.07 * bump
            place(img, c, x, y - 18 * bump, scale=sc, rot=rot)
        return img.convert("RGB")


class Scripture(Scene):
    beats = 6

    def __init__(self, L, lang):
        super().__init__(L, lang)
        self.bg = gradient_bg((250, 245, 236), (240, 230, 210), glow=(232, 222, 196), glow_xy=(560, 540), glow_r=620)
        self.card = ui_card(lang, "scripture", (32, 628, 718, 1292), scale=1.3)
        self.words, self.bw, self.bh = title_words(L["script_head"], font(GEORGIA_B, 74), INK, 640, 84)
        self.chips = [pill(v, font(HELV, 34, 1), (255, 255, 255), c) for v, c in zip(["KJV", "NIV", "NLT", "ESV"], [GREEN, TEAL, INDIGO, CLAY])]
        self.aloud = pill("▶  " + L["aloud"], font(HELV, 32, 1), NAVY, (255, 253, 248), outline=NAVY)

    def render(self, t):
        img = self.bg.convert("RGBA")
        drifting_waves(img, t, CLAY, alpha=34)
        a = ease_out(seg(t, 0.0, 0.8))
        zoom = 1 + 0.06 * (t / 3.4)
        place(img, self.card, 560 - 280 * (1 - a), 560, scale=zoom, rot=-4 * (1 - a), alpha=a)
        # marker over the first citation (about 329px below the crop's top edge)
        p = ease_out(seg(t, 0.9, 0.55))
        cw, ch = self.card.size
        cx0 = 560 - cw * zoom / 2
        cy0 = 560 - ch * zoom / 2
        if p > 0:
            place_tl(img, marker(400 * zoom * p, 46, GOLD, 130), cx0 + (60 + 70 * 1.3) * zoom, cy0 + (60 + 329 * 1.3 - 20) * zoom)
        draw_words(img, self.words, 1130, 240, t, start=0.5, step=0.1)
        for i, c in enumerate(self.chips):
            pp = ease_back(seg(t, 1.5 + 0.13 * i, 0.55))
            place(img, c, 1210 + 175 * i, 560, scale=pp, alpha=clamp(pp * 2))
        pa = ease_back(seg(t, 2.2, 0.55))
        place(img, self.aloud, 1325, 690, scale=pa, alpha=clamp(pa * 2))
        if pa > 0.8:
            for k in range(9):
                h = 12 + 34 * abs(math.sin(t * 7 + k * 0.9))
                ImageDraw.Draw(img).rounded_rectangle([1150 + k * 20, 770 - h / 2, 1160 + k * 20, 770 + h / 2], radius=5, fill=NAVY + (255,))
        return img.convert("RGB")


class Tools(Scene):
    beats = 7

    def __init__(self, L, lang):
        super().__init__(L, lang)
        self.bg = gradient_bg((244, 249, 250), (224, 238, 242), glow=(205, 228, 236), glow_xy=(1250, 520), glow_r=620)
        self.words, self.bw, self.bh = title_words(L["tools_head"], font(GEORGIA_B, 82), INK, 700, 92)
        self.cards = [
            ui_card(lang, "budget", (30, 150, 660, 1110), scale=0.8),
            ui_card(lang, "tvm", (30, 20, 660, 980), scale=0.8),
            ui_card(lang, "impact", (30, 296, 690, 1256), scale=0.8),
        ]
        self.labels = [pill(s, font(HELV, 30, 1), (255, 255, 255), c, padx=26, pady=12) for s, c in zip(L["tools_labels"], [GREEN, INDIGO, TEAL])]
        self.num = font(GEORGIA_B, 150)
        self.cap = text_img(L["tools_cap"], font(GEORGIA, 38), INK_SOFT)

    def render(self, t):
        img = self.bg.convert("RGBA")
        drifting_waves(img, t, TEAL, alpha=34)
        draw_words(img, self.words, 120, 160, t, start=0.1, step=0.1)
        value = int(58393 * ease_out(seg(t, 0.8, 2.2)))
        txt = text_img(f"${value:,}", self.num, GREEN)
        place_tl(img, txt, 120, 560)
        place_tl(img, with_alpha(self.cap, seg(t, 0.8, 0.5)), 128, 740)
        phase0 = t * 1.05
        order = []
        for i in range(3):
            ph = phase0 + i * (2 * math.pi / 3)
            z = math.cos(ph)
            order.append((z, i, ph))
        for z, i, ph in sorted(order):
            enter = ease_out(seg(t, 0.15 + 0.12 * i, 0.8))
            sc = 0.66 + 0.34 * (z + 1) / 2
            x = 1290 + 400 * math.sin(ph)
            yaw = -26 * math.sin(ph)
            card_img = tilt(self.cards[i], yaw=yaw, pitch=0)
            place(img, card_img, x + 300 * (1 - enter), 540, scale=sc, alpha=enter * (0.55 + 0.45 * (z + 1) / 2))
            if z > 0.55:
                place(img, self.labels[i], x, 130 + 20 * (1 - z), alpha=ease_out((z - 0.55) / 0.3))
        return img.convert("RGB")


class QuizExamCert(Scene):
    beats = 7

    def __init__(self, L, lang):
        super().__init__(L, lang)
        self.bg = gradient_bg((252, 247, 236), (240, 228, 200), glow=(236, 216, 168), glow_xy=(960, 520), glow_r=720)
        self.head = text_img(L["qec_head"], font(GEORGIA_B, 68), INK, center=True)
        self.quiz = ui_card(lang, "quiz", (30, 760, 720, 1570), scale=0.74)
        self.cert = ui_card(lang, "certificate", (30, 185, 720, 1505), scale=0.66)
        self.step_labels = [text_img(s, font(HELV, 32, 1), INK_SOFT, center=True, width=520) for s in L["qec_steps"]]
        self.ring_font = font(GEORGIA_B, 100)
        self.stamp = None
        st = blank(430, 150)
        d = ImageDraw.Draw(st)
        d.rounded_rectangle([4, 4, 425, 145], radius=26, outline=GREEN + (255,), width=8)
        st.alpha_composite(text_img(L["verified"].upper(), font(HELV, 56, 1), GREEN, center=True, width=430, tracking=6), (0, 36))
        self.stamp = st

    def render(self, t):
        img = self.bg.convert("RGBA")
        drifting_waves(img, t, GOLD, alpha=40)
        place(img, with_alpha(self.head, seg(t, 0.0, 0.4)), 960, 110)
        xs = [370, 960, 1550]
        # quiz
        a = ease_out(seg(t, 0.15, 0.8))
        place(img, tilt(self.quiz, yaw=18 * (1 - a)), xs[0], 600 + 260 * (1 - a), alpha=a)
        place(img, self.step_labels[0], xs[0], 985, alpha=a)
        # exam ring
        b = ease_back(seg(t, 0.55, 0.8))
        r = 190
        cx, cy = xs[1], 585
        ring = blank(2 * r + 80, 2 * r + 80)
        d = ImageDraw.Draw(ring)
        d.ellipse([40, 40, 40 + 2 * r, 40 + 2 * r], outline=(226, 214, 192, 255), width=34)
        prog = ease_out(seg(t, 1.0, 1.5)) * 0.9
        d.arc([40, 40, 40 + 2 * r, 40 + 2 * r], -90, -90 + 360 * prog, fill=GREEN + (255,), width=34)
        pct = round(90 * ease_out(seg(t, 1.0, 1.5)))
        ring.alpha_composite(text_img(f"{pct}%", self.ring_font, INK, center=True, width=2 * r + 80), (0, r - 30))
        place(img, ring, cx, cy, scale=b, alpha=clamp(b * 2))
        place(img, self.step_labels[1], xs[1], 985, alpha=clamp(b * 2))
        # certificate
        c = ease_out(seg(t, 0.9, 0.8))
        place(img, tilt(self.cert, yaw=-18 * (1 - c)), xs[2], 590 + 260 * (1 - c), alpha=c)
        place(img, self.step_labels[2], xs[2], 985, alpha=c)
        sp = ease_back(seg(t, 3.0, 0.5))
        place(img, self.stamp, xs[2] + 20, 700, scale=1.15 * sp, rot=-12, alpha=clamp(sp * 2))
        return camera(img.convert("RGB"), 1 + 0.05 * seg(t, 2.8, 1.0), xs[2], 600)


class Challenge(Scene):
    beats = 5

    def __init__(self, L, lang):
        super().__init__(L, lang)
        self.bg = gradient_bg((38, 78, 74), (24, 52, 54), glow=(58, 112, 98), glow_xy=(640, 520), glow_r=560)
        self.head = text_img(L["chal_head"], font(GEORGIA_B, 66), (255, 250, 238))
        self.day = text_img(L["day"].upper(), font(HELV, 40, 1), (232, 214, 160), tracking=10)
        self.big = font(GEORGIA_B, 330)

    def flame(self, size, t):
        im = blank(size, size)
        d = ImageDraw.Draw(im)
        w = 1 + 0.05 * math.sin(t * 12)
        s = size
        pts = [(s * 0.5, s * 0.02), (s * (0.78 * w), s * 0.5), (s * 0.7, s * 0.9), (s * 0.5, s * 0.98), (s * 0.3, s * 0.9), (s * (0.22 / w), s * 0.5)]
        d.polygon(pts, fill=(242, 156, 52, 255))
        d.polygon([(s * 0.5, s * 0.3), (s * 0.66, s * 0.66), (s * 0.58, s * 0.9), (s * 0.5, s * 0.95), (s * 0.42, s * 0.9), (s * 0.34, s * 0.66)], fill=(255, 214, 102, 255))
        return im.filter(ImageFilter.GaussianBlur(1.2))

    def render(self, t):
        img = self.bg.convert("RGBA")
        n = 1 + int(29 * ease_io(seg(t, 0.35, 2.0)))
        place_tl(img, self.day, 140, 150)
        num = text_img(str(n), self.big, (255, 250, 238))
        sc = 1 + 0.06 * (1 - ((t * 7) % 1.0)) if n < 30 else 1.0
        place(img, num, 380, 480, scale=sc)
        place(img, self.flame(120, t), 640, 770, alpha=seg(t, 0.2, 0.4))
        s = slide_up(self.head, seg(t, 0.6, 0.6))
        if s is not None:
            place_tl(img, s, 140, 870)
        # 6 x 5 grid of days
        d = ImageDraw.Draw(img)
        for k in range(30):
            col, row = k % 6, k // 6
            cx, cy = 1000 + col * 130, 210 + row * 150
            done = k < n
            pop = ease_back(seg(t, 0.35 + (2.0 * k / 29), 0.3))
            r = 46 * (1 if not done else 1 + 0.0)
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 250, 238, 38) if not done else (242, 188, 74, 255), outline=(255, 250, 238, 90), width=3)
            if done:
                place(img, check_icon(60, (38, 70, 66)), cx, cy, scale=clamp(pop, 0, 1.2))
        return img.convert("RGB")


class Dashboard(Scene):
    beats = 5

    def __init__(self, L, lang):
        super().__init__(L, lang)
        self.bg = gradient_bg((247, 246, 238), (234, 238, 226), glow=(222, 232, 206), glow_xy=(1250, 540), glow_r=600)
        self.card = ui_card(lang, "dashboard", (30, 180, 720, 1100), scale=0.95)
        self.words, self.bw, self.bh = title_words(L["dash_head"], font(GEORGIA_B, 78), INK, 760, 88)
        self.bars = list(zip(L["dash_labels"], [5215, 500, 875, 200], RIVER_COLORS))
        self.lab = font(HELV, 30, 1)
        self.val = font(GEORGIA_B, 44)

    def render(self, t):
        img = self.bg.convert("RGBA")
        drifting_waves(img, t, GREEN, alpha=34)
        a = ease_out(seg(t, 0.0, 0.9))
        place(img, tilt(self.card, yaw=lerp(-28, -10, a), pitch=2), 520 - 260 * (1 - a), 560, alpha=a)
        draw_words(img, self.words, 960, 120, t, start=0.3, step=0.1)
        d = ImageDraw.Draw(img)
        base = 940
        scale = 560 / 5215
        for i, (name, v, col) in enumerate(self.bars):
            x = 1020 + i * 215
            p = ease_out(seg(t, 0.9 + 0.15 * i, 1.0))
            h = max(10, v * scale * p)
            d.rounded_rectangle([x, base - h, x + 150, base], radius=22, fill=col + (255,))
            val = text_img(f"${round(v * p):,}", self.val, col)
            place(img, val, x + 75, base - h - 36, alpha=clamp(p * 3))
            place(img, text_img(name, self.lab, INK_SOFT, center=True, width=210), x + 75, base + 34)
        return img.convert("RGB")


class Language(Scene):
    beats = 5

    def __init__(self, L, lang):
        super().__init__(L, lang)
        self.bg = gradient_bg(NAVY_DEEP, NAVY, glow=(66, 104, 148), glow_xy=(700, 520), glow_r=620)
        self.hello = [text_img(s, font(GEORGIA_B, 230), (255, 252, 244), center=True, width=900) for s in L["hellos"]]
        self.card = ui_card(lang, "language", (30, 790, 520, 1085), scale=1.5)
        self.head = text_img(L["lang_head"], font(GEORGIA_B, 62), (233, 220, 196), center=True, width=900)
        self.sw = [text_img(s, font(HELV, 40, 1), (255, 255, 255), center=True, width=210) for s in ("English", "Español")]

    def render(self, t):
        img = self.bg.convert("RGBA")
        drifting_waves(img, t, (130, 170, 210), alpha=34)
        flip = (t - 1.5) / 0.5
        which = 0 if flip < 0 else 1
        sy = abs(math.cos(math.pi * clamp(flip, 0, 1))) if 0 <= flip <= 1 else 1
        h = self.hello[which]
        place(img, h.resize((h.width, max(2, round(h.height * max(sy, 0.02)))), Image.BILINEAR), 560, 400, alpha=seg(t, 0, 0.4))
        place(img, self.head, 560, 640, alpha=seg(t, 0.4, 0.5))
        # toggle
        tog = rounded((470, 90), 45, (255, 255, 255, 40), outline=(255, 255, 255, 130), width=3)
        knob_x = lerp(10, 240, ease_io(seg(t, 1.5, 0.5)))
        ov = blank(470, 90)
        ov.alpha_composite(tog)
        ov.alpha_composite(rounded((220, 70), 35, GOLD + (255,)), (round(knob_x), 10))
        ov.alpha_composite(self.sw[0], (10, 14))
        ov.alpha_composite(self.sw[1], (240, 14))
        place(img, ov, 560, 780, alpha=seg(t, 0.8, 0.5))
        # text size A's
        for i, (sz, tx) in enumerate(zip((30, 42, 56, 72), (360, 470, 580, 700))):
            grow = ease_back(seg(t, 2.0 + 0.12 * i, 0.5))
            a_img = text_img("A", font(GEORGIA_B, sz), (255, 252, 244))
            place(img, a_img, tx - 80, 910, scale=grow, alpha=clamp(grow * 2))
        c = ease_out(seg(t, 0.3, 0.9))
        place(img, tilt(self.card, yaw=lerp(30, 10, c), pitch=3), 1480 + 300 * (1 - c), 540, alpha=c)
        return img.convert("RGB")


class PdfGlossary(Scene):
    beats = 6

    def __init__(self, L, lang):
        super().__init__(L, lang)
        self.bg = gradient_bg((252, 246, 236), (240, 228, 206), glow=(236, 218, 184), glow_xy=(960, 540), glow_r=700)
        self.pdf = ui_card(lang, "pdf", (35, 346, 655, 1148), scale=1.02, radius=8)
        self.gloss = ui_card(lang, "glossary", (30, 460, 690, 1250), scale=1.0)
        self.h1 = text_img(L["pdf_head"], font(GEORGIA_B, 56), INK, center=True, width=800)
        self.h2 = text_img(L["gloss_head"], font(GEORGIA_B, 56), INK, center=True, width=800)

    def render(self, t):
        img = self.bg.convert("RGBA")
        drifting_waves(img, t, CLAY, alpha=34)
        a = ease_out(seg(t, 0.0, 1.1))
        place(img, tilt(self.pdf, yaw=lerp(-84, -12, a), pitch=2), 600 - 120 * (1 - a), 590, alpha=clamp(a * 3))
        place(img, self.h1, 600, 90, alpha=seg(t, 0.5, 0.5))
        b = ease_out(seg(t, 0.9, 0.9))
        place(img, tilt(self.gloss, yaw=lerp(40, 9, b), pitch=-2), 1380 + 260 * (1 - b), 600, alpha=clamp(b * 3))
        place(img, self.h2, 1380, 90, alpha=seg(t, 1.3, 0.5))
        # magnifier sweeping over the glossary
        mp = ease_io(seg(t, 2.0, 1.2))
        mx, my = lerp(1180, 1470, mp), lerp(520, 800, mp)
        ov = blank(180, 180)
        d = ImageDraw.Draw(ov)
        d.ellipse([20, 20, 120, 120], outline=NAVY + (255,), width=12, fill=(255, 255, 255, 60))
        d.line([(112, 112), (160, 160)], fill=NAVY + (255,), width=16)
        place(img, ov, mx, my, alpha=seg(t, 2.0, 0.3))
        return img.convert("RGB")


class Install(Scene):
    beats = 4

    def __init__(self, L, lang):
        super().__init__(L, lang)
        self.bg = gradient_bg((250, 246, 238), (238, 232, 214), glow=(226, 232, 212), glow_xy=(760, 540), glow_r=560)
        icon = Image.open(ROOT / "public" / "icons" / "icon-512.png").convert("RGBA").resize((150, 150), Image.LANCZOS)
        mask = rounded((150, 150), 36, (255, 255, 255, 255)).getchannel("A")
        icon.putalpha(mask)
        self.icon = icon
        self.words, self.bw, self.bh = title_words(L["install_head"], font(GEORGIA_B, 86), INK, 760, 96)
        self.chip = [pill(s, font(HELV, 32, 1), (255, 255, 255), c) for s, c in zip(L["install_chips"], [GREEN, TEAL, CLAY])]
        self.cap = text_img(L["add_home"], font(HELV, 30, 1), (255, 255, 255), center=True, width=220)

    def render(self, t):
        img = self.bg.convert("RGBA")
        drifting_waves(img, t, GREEN, alpha=34)
        phone = rounded((420, 820), 70, (32, 29, 27, 255))
        screen = rounded((394, 794), 58, (56, 90, 128, 255))
        phone.alpha_composite(screen, (13, 13))
        d = ImageDraw.Draw(phone)
        rnd = random.Random(5)
        pal = [(232, 150, 96), (118, 176, 216), (150, 200, 150), (230, 196, 100), (190, 160, 220), (240, 130, 130), (110, 190, 190)]
        for r in range(5):
            for c in range(3):
                if r == 3 and c == 1:
                    continue
                x, y = 60 + c * 110, 80 + r * 130
                d.rounded_rectangle([x, y, x + 84, y + 84], radius=20, fill=pal[rnd.randint(0, len(pal) - 1)] + (255,))
        a = ease_out(seg(t, 0.0, 0.8))
        place(img, phone, 560 - 80 * (1 - a), 540 + 400 * (1 - a), rot=-6 * (1 - a), alpha=a)
        # the app icon drops into the empty slot
        p = seg(t, 0.8, 0.8)
        drop = ease_back(p)
        sx, sy = 560 - 210 + 60 + 110 + 42, 540 - 410 + 80 + 3 * 130 + 42
        yy = lerp(sy - 520, sy, drop)
        place(img, self.icon, sx, yy, scale=lerp(1.5, 0.58, drop), alpha=seg(t, 0.8, 0.2))
        if p >= 1:
            ring = ease_out(seg(t, 1.6, 0.8))
            ov = blank(420, 420)
            ImageDraw.Draw(ov).ellipse([210 - 160 * ring, 210 - 160 * ring, 210 + 160 * ring, 210 + 160 * ring], outline=GOLD + (int(255 * (1 - ring)),), width=8)
            place(img, ov, sx, sy)
            place(img, self.cap, sx, sy + 70, alpha=seg(t, 1.6, 0.4))
        draw_words(img, self.words, 1010, 270, t, start=0.5, step=0.12)
        for i, c in enumerate(self.chip):
            pp = ease_back(seg(t, 1.2 + 0.15 * i, 0.5))
            place(img, c, 1180 + i * 0, 600 + i * 90, scale=pp, alpha=clamp(pp * 2))
        return img.convert("RGB")


class Join(Scene):
    beats = 5

    def __init__(self, L, lang):
        super().__init__(L, lang)
        self.bg = gradient_bg((247, 242, 230), (236, 226, 202), glow=(232, 214, 168), glow_xy=(700, 520), glow_r=600)
        self.words, self.bw, self.bh = title_words(L["join_head"], font(GEORGIA_B, 78), INK, 900, 88)
        self.digit = font(GEORGIA_B, 190)
        self.btn = pill(L["join_btn"], font(HELV, 44, 1), (255, 255, 255), NAVY, padx=90, pady=24)
        src = shot(lang, "qr").crop((0, 700, 345, 1200))
        navy = src.point(lambda v: 255 if v < 140 else 0).convert("L")
        r, g, bch = src.split()
        mask = ImageChops.multiply(ImageChops.multiply(r.point(lambda v: 255 if v < 90 else 0), g.point(lambda v: 255 if v < 120 else 0)), bch.point(lambda v: 255 if 80 < v < 150 else 0))
        bb = mask.getbbox() or (60, 60, 330, 330)
        side = max(bb[2] - bb[0], bb[3] - bb[1]) + 28
        cx, cy = (bb[0] + bb[2]) // 2, (bb[1] + bb[3]) // 2
        qr = src.crop((cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2)).resize((520, 520), Image.LANCZOS)
        self.qr = qr.convert("RGBA")
        self.qr_card = card((560, 560), 28, (255, 255, 255, 255))
        self.qr_card.alpha_composite(self.qr, (60 + 20, 60 + 20))
        self.scan = text_img(L["scan"], font(HELV, 32, 1), INK_SOFT, center=True, width=560)

    def render(self, t):
        img = self.bg.convert("RGBA")
        drifting_waves(img, t, CLAY, alpha=34)
        draw_words(img, self.words, 130, 110, t, start=0.1, step=0.1)
        for i, ch in enumerate("4271"):
            p = ease_back(seg(t, 0.5 + 0.28 * i, 0.4))
            box = card((170, 230), 26, (255, 253, 248, 255), shadow=90)
            dg = text_img(ch, self.digit, NAVY, center=True, width=170)
            box.alpha_composite(dg, (60, 60 - 12))
            place(img, box, 290 + i * 210, 560, scale=p, alpha=clamp(p * 2))
        # the Join button gets pressed
        press = seg(t, 2.0, 0.25)
        sc = 1 - 0.07 * math.sin(math.pi * press) if 0 < press < 1 else 1
        place(img, self.btn, 560, 810, scale=sc, alpha=seg(t, 1.5, 0.4))
        if 2.0 < t < 2.9:
            r = ease_out(seg(t, 2.0, 0.8))
            ov = blank(500, 300)
            ImageDraw.Draw(ov).ellipse([250 - 230 * r, 150 - 130 * r, 250 + 230 * r, 150 + 130 * r], outline=NAVY + (int(200 * (1 - r)),), width=6)
            place(img, ov, 560, 810)
        # QR with scanning line
        q = ease_back(seg(t, 1.2, 0.8))
        qx, qy = 1470, 530
        place(img, tilt(self.qr_card, yaw=lerp(-30, -7, ease_out(seg(t, 1.2, 1.2)))), qx, qy, scale=q, alpha=clamp(q * 2))
        if t > 2.0:
            y = qy - 220 + 440 * (0.5 + 0.5 * math.sin((t - 2.0) * 3.2))
            ImageDraw.Draw(img).rounded_rectangle([qx - 250, y - 6, qx + 250, y + 6], radius=6, fill=(60, 200, 130, 230))
        place(img, self.scan, qx, 870, alpha=seg(t, 2.0, 0.4))
        return img.convert("RGB")


class ChatFaces(Scene):
    beats = 5

    def __init__(self, L, lang):
        super().__init__(L, lang)
        self.bg = gradient_bg((247, 244, 236), (232, 232, 222), glow=(214, 226, 214), glow_xy=(560, 540), glow_r=620)
        prof = shot(lang, "profile")
        self.tiles = []
        for r in range(4):
            for c in range(6):
                if r == 3 and c == 5:
                    continue
                x, y = 68 + 94 * c, 494 + 94 * r
                im = prof.crop((x, y, x + 82, y + 82)).resize((132, 132), Image.LANCZOS).convert("RGBA")
                im.putalpha(rounded((132, 132), 26, (255, 255, 255, 255)).getchannel("A"))
                self.tiles.append(im)
        self.chat = ui_card(lang, "chat", (30, 0, 690, 1060), scale=0.95)
        self.head = text_img(L["chat_head"], font(GEORGIA_B, 62), INK, width=760, line_h=70)
        self.rot = [random.Random(i).uniform(-16, 16) for i in range(24)]

    def render(self, t):
        img = self.bg.convert("RGBA")
        drifting_waves(img, t, TEAL, alpha=34)
        s = slide_up(self.head, seg(t, 0.2, 0.6))
        if s is not None:
            place_tl(img, s, 110, 90)
        for k, tile in enumerate(self.tiles):
            c, r = k % 6, k // 6
            p = ease_back(seg(t, 0.45 + 0.055 * k, 0.5))
            hot = max(0.0, 1 - abs(t - (2.3 + 0.07 * k)) / 0.14)
            tx, ty = 170 + c * 150, 330 + r * 150
            place(img, tile, tx, ty - 14 * hot, scale=p * (1 + 0.28 * hot), rot=self.rot[k] * (1 - p), alpha=clamp(p * 2))
        a = ease_out(seg(t, 0.4, 0.9))
        place(img, tilt(self.chat, yaw=lerp(34, 12, a), pitch=2), 1450 + 300 * (1 - a), 540, alpha=clamp(a * 2))
        return img.convert("RGB")


class Prayer(Scene):
    beats = 5

    def __init__(self, L, lang):
        super().__init__(L, lang)
        self.bg = gradient_bg((51, 87, 124), (29, 58, 87), glow=(70, 110, 152), glow_xy=(960, 480), glow_r=760)
        frame = blank(W, H)
        d = ImageDraw.Draw(frame)
        d.rectangle([0, 0, W, H], outline=CLAY + (255,), width=46)
        d.rectangle([46, 46, W - 46, H - 46], outline=(110, 72, 36, 255), width=6)
        self.frame = frame
        self.title = text_img(L["prayer_head"], font(HAND, 120), (250, 245, 236))
        papers = [(250, 245, 236), (246, 236, 210), (228, 238, 242), (235, 238, 224)]
        self.notes = []
        for i, txt in enumerate(L["prayer_notes"]):
            n = blank(430, 330)
            n.alpha_composite(soft_shadow((430, 330), [12, 18, 418, 322], 6, 140, 12))
            ImageDraw.Draw(n).rectangle([8, 8, 412, 308], fill=papers[i] + (255,))
            n.alpha_composite(text_img(txt, font(HAND, 46), (44, 38, 32), width=350, line_h=56), (36, 56))
            n.alpha_composite(text_img(L["prayer_by"][i], font(HAND, 36), (96, 88, 76)), (36, 250))
            self.notes.append(n)
        self.pin_cols = RIVER_COLORS
        self.pos = [(560, 470, -5), (1010, 400, 4), (1440, 520, -3), (860, 760, 3)]
        self.pill = pill(L["prayed"], font(HAND, 44), (255, 255, 255), GREEN, padx=30, pady=8)
        self.stamp = pill(L["answered"].upper(), font(HELV, 36, 1), (60, 106, 46), (232, 244, 222), padx=24, pady=10, outline=(60, 106, 46))

    def render(self, t):
        img = self.bg.convert("RGBA")
        img.alpha_composite(self.frame)
        d = ImageDraw.Draw(img)
        place_tl(img, with_alpha(self.title, seg(t, 0.0, 0.5)), 110, 90)
        for i, n in enumerate(self.notes):
            x, y, r = self.pos[i]
            t0 = 0.4 + 0.45 * i
            p = seg(t, t0, 0.55)
            if p <= 0:
                continue
            fall = ease_in(p)
            yy = lerp(-300, y, fall)
            if p >= 1:
                sinceland = t - (t0 + 0.55)
                yy = y - 26 * math.exp(-sinceland * 6) * abs(math.sin(sinceland * 14))
            sway = r + (18 * math.exp(-(t - t0 - 0.55) * 3) * math.sin((t - t0) * 9) if t > t0 + 0.55 else 18 * (1 - fall))
            place(img, n, x, yy, rot=sway)
            if p >= 1:
                pin = ease_back(seg(t, t0 + 0.55, 0.25))
                col = self.pin_cols[i % 4]
                ov = blank(60, 60)
                ImageDraw.Draw(ov).ellipse([6, 6, 54, 54], fill=col + (255,))
                ImageDraw.Draw(ov).ellipse([16, 14, 30, 28], fill=(255, 255, 255, 190))
                place(img, ov, x, yy - 155, scale=pin)
        pp = ease_back(seg(t, 2.6, 0.5))
        x, y, r = self.pos[1]
        place(img, self.pill, x - 20, y + 120, scale=pp, alpha=clamp(pp * 2))
        sp = ease_back(seg(t, 3.1, 0.5))
        x, y, r = self.pos[2]
        place(img, self.stamp, x + 20, y + 40, scale=1.2 * sp, rot=-10, alpha=clamp(sp * 2))
        return img.convert("RGB")


class ReadingPlan(Scene):
    beats = 6

    def __init__(self, L, lang):
        super().__init__(L, lang)
        self.bg = gradient_bg((246, 249, 244), (228, 240, 230), glow=(214, 234, 218), glow_xy=(1100, 540), glow_r=640)
        self.head = text_img(L["plan_head"], font(GEORGIA_B, 62), INK, width=640, line_h=70)
        self.passage = text_img(L["plan_passage"], font(GEORGIA_B, 44), INK, width=640, line_h=54)
        self.toggles = L["plan_toggles"]
        self.names = L["plan_names"]
        self.counts = [4, 3, 0, 1]
        self.btn = pill("✓  " + L["mark"], font(HELV, 38, 1), (255, 255, 255), GREEN, padx=44, pady=18)
        self.done = pill("✓  " + L["read"], font(HELV, 38, 1), (255, 255, 255), (90, 100, 70), padx=44, pady=18)
        self.sum = font(HELV, 34, 1)

    def toggle(self, a, b, on_b, w=335):
        ov = blank(w * 2 + 20, 76)
        ImageDraw.Draw(ov).rounded_rectangle([0, 0, w * 2 + 19, 75], radius=38, fill=(255, 255, 255, 255), outline=(226, 214, 192, 255), width=3)
        ov.alpha_composite(rounded((w, 62), 31, NAVY + (255,)), (round(7 + on_b * (w + 6)), 7))
        f = font(HELV, 27, 1)
        ov.alpha_composite(text_img(a, f, (255, 255, 255) if on_b < 0.5 else INK_SOFT, center=True, width=w), (7, 17))
        ov.alpha_composite(text_img(b, f, (255, 255, 255) if on_b >= 0.5 else INK_SOFT, center=True, width=w), (w + 13, 17))
        return ov

    def render(self, t):
        img = self.bg.convert("RGBA")
        drifting_waves(img, t, GREEN, alpha=36)
        s = slide_up(self.head, seg(t, 0.1, 0.6))
        if s is not None:
            place_tl(img, s, 110, 110)
        place_tl(img, with_alpha(self.passage, seg(t, 0.5, 0.5)), 110, 270)
        place(img, self.toggle(self.toggles[0], self.toggles[1], ease_io(seg(t, 1.0, 0.5))), 480, 520, alpha=seg(t, 0.8, 0.4))
        place(img, self.toggle(self.toggles[2], self.toggles[3], ease_io(seg(t, 1.6, 0.5))), 480, 625, alpha=seg(t, 1.0, 0.4))
        # progress grid
        d = ImageDraw.Draw(img)
        gx0, gy0 = 1010, 230
        cell = 30
        rows = len(self.names)
        you_done = t > 3.0
        for r, name in enumerate(self.names):
            y = gy0 + r * 150
            place_tl(img, with_alpha(text_img(name, font(HELV, 36, 1), INK), seg(t, 0.4 + 0.12 * r, 0.4)), gx0 - 230, y + 10)
            for c in range(16):
                x = gx0 + c * 38
                filled = c < self.counts[r] + (1 if (r == 2 and you_done and c == 3) else 0)
                if r == 2 and not you_done:
                    filled = False
                if r == 2 and you_done:
                    filled = c == 3
                grow = ease_back(seg(t, 0.9 + 0.12 * c + 0.12 * r, 0.3))
                if filled:
                    sc = clamp(grow, 0, 1.15)
                    d.rounded_rectangle([x, y, x + cell, y + cell], radius=6, fill=(90, 100, 70, 255))
                    place(img, check_icon(26), x + cell / 2, y + cell / 2, scale=sc)
                else:
                    d.rounded_rectangle([x, y, x + cell, y + cell], radius=6, outline=(214, 200, 176, 255), width=3, fill=(255, 253, 248, 255))
        if t > 2.2:
            press = seg(t, 2.8, 0.25)
            sc = 1 - 0.08 * math.sin(math.pi * press) if 0 < press < 1 else 1
            place(img, self.done if you_done else self.btn, 1200, 880, scale=sc, alpha=seg(t, 2.2, 0.4))
            if you_done:
                n = 4
                place(img, text_img(self.L["plan_sum"].format(n=n, total=7), self.sum, INK_SOFT), 1200, 960, alpha=seg(t, 3.1, 0.4))
        return img.convert("RGB")


class Triple(Scene):
    beats = 6

    def __init__(self, L, lang):
        super().__init__(L, lang)
        self.bg = gradient_bg((250, 246, 238), (236, 228, 208), glow=(232, 216, 178), glow_xy=(960, 540), glow_r=780)
        self.cards = [
            ui_card(lang, "bell", (30, 100, 660, 740), scale=0.95),
            ui_card(lang, "verses", (30, 190, 690, 870), scale=0.9),
            ui_card(lang, "coleader", (30, 30, 660, 740), scale=0.95),
        ]
        self.labels = [pill(s, font(HELV, 34, 1), (255, 255, 255), c) for s, c in zip(L["triple_labels"], [CLAY, TEAL, GREEN])]
        self.starts = [(-200, -500, -18), (960, 1500, 10), (2150, -500, 16)]
        self.final = [(380, 520, -4), (960, 560, 0), (1540, 520, 4)]

    def render(self, t):
        img = self.bg.convert("RGBA")
        drifting_waves(img, t, CLAY, alpha=34)
        for i in (0, 2, 1):
            p = ease_back(seg(t, 0.15 + 0.3 * i, 0.9))
            sx, sy, r0 = self.starts[i]
            fx, fy, r1 = self.final[i]
            x, y = lerp(sx, fx, p), lerp(sy, fy, p)
            rot = lerp(r0, r1, p)
            bob = 8 * math.sin(t * 1.8 + i * 2)
            c = tilt(self.cards[i], yaw=(i - 1) * -14 * (1 - 0.3 * p), pitch=0)
            place(img, c, x, y + bob, scale=0.9, rot=rot, alpha=clamp(p * 2))
            lp = ease_back(seg(t, 0.9 + 0.3 * i, 0.5))
            place(img, self.labels[i], fx, 975, scale=lp, alpha=clamp(lp * 2))
        return camera(img.convert("RGB"), 1.045 + 0.03 * seg(t, 0, 3.2), 960, 540, rot=1.0 * math.sin(t * 0.7))


class Admin(Scene):
    beats = 5

    def __init__(self, L, lang):
        super().__init__(L, lang)
        self.bg = gradient_bg(NAVY_DEEP, (32, 60, 90), glow=(52, 88, 130), glow_xy=(960, 520), glow_r=780)
        self.head = text_img(L["admin_head"], font(GEORGIA_B, 66), (255, 252, 244), center=True, width=1500)
        self.tabs = L["admin_tabs"]
        self.cards = []
        for title, body in L["admin_cards"]:
            c = card((480, 330), 28, (255, 253, 248, 255))
            c.alpha_composite(text_img(title, font(GEORGIA_B, 42), INK, width=420, line_h=50), (60 + 36, 60 + 34))
            c.alpha_composite(text_img(body, font(GEORGIA, 30), INK_SOFT, width=410, line_h=42), (60 + 36, 60 + 150))
            self.cards.append(c)

    def render(self, t):
        img = self.bg.convert("RGBA")
        drifting_waves(img, t, (130, 170, 210), alpha=32)
        s = slide_up(self.head, seg(t, 0.0, 0.5))
        if s is not None:
            place(img, s, 960, 150)
        f = font(HELV, 32, 1)
        probe = [pill(x, f, (255, 255, 255), (255, 255, 255)) for x in self.tabs]
        total = sum(p.width for p in probe) + 22 * (len(probe) - 1)
        x = 960 - total / 2
        active = min(len(self.tabs) - 1, int(max(0.0, t - 0.6) / 0.32))
        for i, name in enumerate(self.tabs):
            on = i == active
            im = pill(name, f, (255, 255, 255) if on else (220, 232, 244), GOLD if on else (255, 255, 255, 30), outline=None if on else (200, 220, 240, 140))
            p = ease_back(seg(t, 0.2 + 0.07 * i, 0.4))
            place(img, im, x + im.width / 2, 300, scale=p * (1.08 if on else 1), alpha=clamp(p * 2))
            x += im.width + 22
        for i, c in enumerate(self.cards):
            p = ease_back(seg(t, 1.2 + 0.25 * i, 0.7))
            fx = 340 + 620 * i
            sx = -300 if i % 2 == 0 else 2200
            place(img, c, lerp(sx, fx, p), 640, rot=lerp(12 if i % 2 else -12, 0, p), alpha=clamp(p * 2))
        return img.convert("RGB")


class Testimony(Scene):
    beats = 6

    def __init__(self, L, lang):
        super().__init__(L, lang)
        self.bg = gradient_bg((250, 244, 232), (236, 224, 200), glow=(238, 218, 176), glow_xy=(560, 540), glow_r=600)
        port = Image.open(ROOT / "src" / "assets" / "testimony-nathaniel.jpg").convert("RGB").resize((520, 520), Image.LANCZOS)
        m = Image.new("L", (520, 520), 0)
        ImageDraw.Draw(m).ellipse([0, 0, 519, 519], fill=255)
        face = port.convert("RGBA")
        face.putalpha(m)
        self.portrait = blank(600, 600)
        ImageDraw.Draw(self.portrait).ellipse([20, 20, 580, 580], fill=(255, 255, 255, 255))
        self.portrait.alpha_composite(soft_shadow((600, 600), [30, 46, 570, 586], 270, 110, 22), (0, 0))
        ImageDraw.Draw(self.portrait).ellipse([20, 20, 580, 580], fill=(255, 255, 255, 255))
        self.portrait.alpha_composite(face, (40, 40))
        self.kick = text_img(L["testimony_kick"].upper(), font(HELV, 30, 1), CLAY, tracking=6)
        self.words, self.bw, self.bh = title_words(L["testimony_quote"], font(GEORGIA_B, 70), INK, 880, 82)
        self.who = text_img(L["testimony_who"], font(GEORGIA_I, 36), INK_SOFT)
        self.hi = [i for i, w in enumerate(self.words) if w[3].strip(".,").lower() in L["testimony_hi"]]
        self.qm = text_img("“", font(GEORGIA_B, 260), GOLD + (255,))

    def render(self, t):
        img = self.bg.convert("RGBA")
        drifting_waves(img, t, CLAY, alpha=34)
        p = ease_expo(seg(t, 0.0, 1.0))
        place(img, self.portrait, 560, 540, scale=lerp(0.55, 1.0, p), alpha=clamp(p * 3))
        ring = ease_out(seg(t, 0.5, 1.0))
        ov = blank(700, 700)
        ImageDraw.Draw(ov).arc([30, 30, 670, 670], -90, -90 + 360 * ring, fill=GOLD + (255,), width=10)
        place(img, ov, 560, 540)
        place(img, with_alpha(self.qm, seg(t, 0.8, 0.4)), 1010, 330, alpha=0.9)
        place_tl(img, with_alpha(self.kick, seg(t, 0.6, 0.4)), 1030, 170)
        draw_words(img, self.words, 1030, 330, t, start=1.0, step=0.12)
        highlight_words(img, self.words, self.hi, 1030, 330, t, 2.6, 0.7, GOLD, 120)
        place_tl(img, with_alpha(self.who, seg(t, 3.0, 0.5)), 1034, 330 + self.bh + 24)
        zoom = 1.0 + 0.35 * (1 - ease_out(seg(t, 0.0, 1.3)))
        return camera(img.convert("RGB"), zoom, 560, 540)


class Closing(Scene):
    beats = 6

    def __init__(self, L, lang):
        super().__init__(L, lang)
        self.bg = gradient_bg(NAVY_DEEP, NAVY, glow=(70, 108, 150), glow_xy=(960, 500), glow_r=700)
        self.words, self.bw, self.bh = title_words(L["close_head"], font(GEORGIA_B, 112), (255, 252, 244), 1500, 124, center=True)
        self.url = text_img("four-rivers.vercel.app", font(GEORGIA_B, 78), GOLD, center=True)
        self.sub = text_img(L["close_sub"], font(GEORGIA_I, 46), (233, 220, 196), center=True, width=1500)
        icon = Image.open(ROOT / "public" / "icons" / "icon-512.png").convert("RGBA").resize((140, 140), Image.LANCZOS)
        icon.putalpha(rounded((140, 140), 32, (255, 255, 255, 255)).getchannel("A"))
        self.icon = icon

    def render(self, t):
        img = self.bg.convert("RGBA")
        drifting_waves(img, t, (130, 170, 210), alpha=40)
        colors = [(96, 196, 140), (72, 178, 212), (118, 148, 232), (222, 160, 90)]
        # four rivers rush in from the corners and meet at the center
        starts = [(0, 100), (0, 980), (1920, 100), (1920, 980)]
        for i, (sx, sy) in enumerate(starts):
            path = bezier((sx, sy), (sx + (700 if sx == 0 else -700), sy), (960, 540 + (-260 if sy < 500 else 260)), (960, 440), 60)
            p = ease_out(seg(t, 0.1 + 0.1 * i, 1.0))
            pts = path[: max(2, int(len(path) * p))]
            draw_line(img, pts, colors[i], 22, 70)
            draw_line(img, pts, colors[i], 10, 255)
        place(img, self.icon, 960, 250, scale=ease_back(seg(t, 0.6, 0.6)), alpha=seg(t, 0.6, 0.3))
        draw_words(img, self.words, 210, 340, t, start=1.0, step=0.12)
        place(img, self.url, 960, 700, scale=lerp(0.85, 1.0, ease_back(seg(t, 2.0, 0.6))), alpha=seg(t, 2.0, 0.4))
        s = slide_up(self.sub, seg(t, 2.5, 0.6))
        if s is not None:
            place(img, s, 960, 830)
        return img.convert("RGB")


SCENES = [Intro, Hero, FourRivers, Scripture, Tools, QuizExamCert, Challenge, Dashboard, Language, PdfGlossary, Install, Join, ChatFaces, Prayer, ReadingPlan, Triple, Admin, Testimony, Closing]
TRANSITIONS = ["iris", "push_left", "doors", "zoomthrough", "diag", "rotate", "blinds", "push_up", "flash", "iris", "zoomthrough", "doors", "diag", "push_right", "rotate", "blinds", "iris", "zoomthrough"]
