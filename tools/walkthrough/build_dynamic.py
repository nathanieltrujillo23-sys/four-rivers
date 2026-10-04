#!/usr/bin/env python3
"""
The dynamic 4 Rivers overview video (about 58 seconds, 1920x1080), English or Spanish.
Scenes use 3D tilts, zooms, kinetic text, highlights, counters, and many kinds
of transitions; cuts land on the beats of music.py (112 BPM).

    python3 build_dynamic.py en          # out/four-rivers-overview-en.mp4
    python3 build_dynamic.py es          # out/four-rivers-resumen-es.mp4
    python3 build_dynamic.py en --stills # a few preview frames in /tmp
"""
import json
import multiprocessing as mp
import os
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from dyn_lib import W, H, clamp, ease_io, rgb, transition  # noqa: E402
import dyn_scenes  # noqa: E402

FPS = 30
BEAT = 60 / 112
TR = 0.42  # seconds a transition takes, centered on the cut

TEXT = {
    "en": {
        "out": "four-rivers-overview-en.mp4",
        "intro_tag": "One source. Four streams.",
        "intro_labels": ["Income", "Saving", "Investing", "Giving"],
        "hero_kick": "Genesis 2:10",
        "hero_head": "One source. Four streams.",
        "hero_hi": {"four", "streams"},
        "hero_sub": "A free, Scripture based course in stewardship, made for young adults.",
        "rivers_head": "Four principles, one plan",
        "rivers": [
            ("1", "Multiple streams of income", "Cultivate more than one source."),
            ("2", "Saving", "Store up for what is ahead."),
            ("3", "Investing", "Put money to faithful work."),
            ("4", "Giving", "Let the stream flow on."),
        ],
        "script_head": "Every lesson starts with Scripture",
        "aloud": "Read aloud",
        "tools_head": "Try it with real numbers",
        "tools_labels": ["Budget", "Time and money", "Another stream"],
        "tools_cap": "after 20 years in stocks and bonds",
        "qec_head": "Quizzes, an exam, a certificate",
        "qec_steps": ["Quiz every river", "Final exam", "Verified certificate"],
        "verified": "Verified",
        "chal_head": "30 days. One streak.",
        "day": "Day",
        "dash_head": "Track it all in one place",
        "dash_labels": ["Income", "Saved", "Invested", "Given"],
        "hellos": ["Hello", "Hola"],
        "lang_head": "English or Español",
        "pdf_head": "Print your plan",
        "gloss_head": "Know the words",
        "install_head": "Install it like an app",
        "install_chips": ["Works offline", "Home screen", "Free"],
        "add_home": "4 Rivers",
        "join_head": "Join with a code",
        "join_btn": "Join",
        "scan": "or scan the QR",
        "chat_head": "Chat with names and faces",
        "prayer_head": "Prayer wall",
        "prayer_notes": ["Peace and clear words for Thursday.", "Wisdom with my first budget.", "Safe travels for the team.", "Provision and patience."],
        "prayer_by": ["Priya", "Demo", "Sam", "Someone"],
        "prayed": "I prayed",
        "answered": "Answered",
        "plan_head": "Read the plan together",
        "plan_passage": "Proverbs 4:10 to 5:14 and Luke 2:42 to 3:22",
        "plan_toggles": ["One after another", "Together", "Whole chapters", "Split evenly"],
        "plan_names": ["Maria", "Jordan", "You", "Sam"],
        "mark": "Mark as read",
        "read": "Read",
        "plan_sum": "{n} of {total} have read today",
        "triple_labels": ["Alerts", "Find any verse", "Co-leaders"],
        "admin_head": "Tools for the people who run it",
        "admin_tabs": ["Overview", "Learners", "Leaders", "Groups", "Content", "Testimony", "Tools"],
        "admin_cards": [
            ("Edit any lesson", "Change the words, keep the course."),
            ("Edit the testimony", "The story on the home page, in both languages."),
            ("Approve leaders", "Only the admin creates new group leaders."),
        ],
        "testimony_kick": "From the founder",
        "testimony_quote": "Faith and finance were never meant to be separate pursuits.",
        "testimony_who": "Nathaniel Trujillo, founder of 4 Rivers",
        "testimony_hi": {"faith", "finance"},
        "close_head": "Free for every young adult",
        "close_sub": "Install it. Share it. Start today.",
    },
    "es": {
        "out": "four-rivers-resumen-es.mp4",
        "intro_tag": "Una fuente. Cuatro ríos.",
        "intro_labels": ["Ingresos", "Ahorro", "Inversión", "Generosidad"],
        "hero_kick": "Génesis 2:10",
        "hero_head": "Una fuente. Cuatro ríos.",
        "hero_hi": {"cuatro", "ríos"},
        "hero_sub": "Un curso gratuito de mayordomía basado en las Escrituras, hecho para jóvenes adultos.",
        "rivers_head": "Cuatro principios, un plan",
        "rivers": [
            ("1", "Múltiples fuentes de ingresos", "Cultiva más de una fuente."),
            ("2", "Ahorro", "Guarda para lo que viene."),
            ("3", "Inversión", "Pon el dinero a trabajar con fidelidad."),
            ("4", "Generosidad", "Deja que el río siga fluyendo."),
        ],
        "script_head": "Cada lección empieza con las Escrituras",
        "aloud": "Escuchar en voz alta",
        "tools_head": "Pruébalo con números reales",
        "tools_labels": ["Presupuesto", "Tiempo y dinero", "Otra fuente"],
        "tools_cap": "tras 20 años en acciones y bonos",
        "qec_head": "Cuestionarios, un examen, un certificado",
        "qec_steps": ["Un cuestionario por río", "Examen final", "Certificado verificable"],
        "verified": "Verificado",
        "chal_head": "30 días. Una racha.",
        "day": "Día",
        "dash_head": "Registra todo en un solo lugar",
        "dash_labels": ["Ingresos", "Ahorrado", "Invertido", "Dado"],
        "hellos": ["Hello", "Hola"],
        "lang_head": "English o Español",
        "pdf_head": "Imprime tu plan",
        "gloss_head": "Conoce las palabras",
        "install_head": "Instálalo como una app",
        "install_chips": ["Sin conexión", "Pantalla de inicio", "Gratis"],
        "add_home": "4 Rivers",
        "join_head": "Únete con un código",
        "join_btn": "Unirse",
        "scan": "o escanea el QR",
        "chat_head": "Chat con nombres y rostros",
        "prayer_head": "Muro de oración",
        "prayer_notes": ["Paz y palabras claras para el jueves.", "Sabiduría con mi primer presupuesto.", "Buen viaje para el equipo.", "Provisión y paciencia."],
        "prayer_by": ["Priya", "Demo", "Sam", "Alguien"],
        "prayed": "Oré",
        "answered": "Respondida",
        "plan_head": "Lean el plan juntos",
        "plan_passage": "Proverbios 4:10 a 5:14 y Lucas 2:42 a 3:22",
        "plan_toggles": ["Uno tras otro", "A la vez", "Capítulos completos", "En partes iguales"],
        "plan_names": ["Maria", "Jordan", "Tú", "Sam"],
        "mark": "Marcar como leído",
        "read": "Leído",
        "plan_sum": "{n} de {total} ya leyeron hoy",
        "triple_labels": ["Avisos", "Cualquier versículo", "Colíderes"],
        "admin_head": "Herramientas para quienes lo dirigen",
        "admin_tabs": ["Resumen", "Estudiantes", "Líderes", "Grupos", "Contenido", "Testimonio", "Herramientas"],
        "admin_cards": [
            ("Edita cualquier lección", "Cambia las palabras, conserva el curso."),
            ("Edita el testimonio", "La historia de la página de inicio, en ambos idiomas."),
            ("Aprueba líderes", "Solo el administrador crea nuevos líderes de grupo."),
        ],
        "testimony_kick": "Del fundador",
        "testimony_quote": "La fe y las finanzas nunca fueron pensadas como búsquedas separadas.",
        "testimony_who": "Nathaniel Trujillo, fundador de 4 Rivers",
        "testimony_hi": {"fe", "finanzas"},
        "close_head": "Gratis para cada joven adulto",
        "close_sub": "Instálalo. Compártelo. Empieza hoy.",
    },
}

SCENES = []
STARTS = []
DURS = []
TOTAL = 0.0
LANG = "en"


def setup(lang):
    global SCENES, STARTS, DURS, TOTAL, LANG
    LANG = lang
    SCENES, STARTS, DURS = [], [], []
    t = 0.0
    for cls in dyn_scenes.SCENES:
        sc = cls(TEXT[lang], lang)
        SCENES.append(sc)
        STARTS.append(t)
        DURS.append(sc.beats * BEAT)
        t += sc.beats * BEAT
    TOTAL = t


def local(i, T):
    return T - STARTS[i] + (TR / 2 if i > 0 else 0.0)


def frame(n):
    T = n / FPS
    i = max(k for k in range(len(SCENES)) if STARTS[k] <= T + 1e-9)
    if i + 1 < len(SCENES) and T > STARTS[i + 1] - TR / 2:
        a, b = i, i + 1
        boundary = STARTS[b]
    elif i > 0 and T < STARTS[i] + TR / 2:
        a, b = i - 1, i
        boundary = STARTS[i]
    else:
        return SCENES[i].render(local(i, T))
    p = ease_io((T - (boundary - TR / 2)) / TR)
    old = SCENES[a].render(local(a, T))
    new = SCENES[b].render(local(b, T))
    return transition(dyn_scenes.TRANSITIONS[a], old, new, p)


def render_frame(n):
    frame(n).save(SCRATCH / "frames" / f"f{n:05d}.jpg", quality=92)
    return n


SCRATCH = Path("/tmp/four-rivers-walkthrough/dynamic")


def main():
    global SCRATCH
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    lang = args[0] if args else "en"
    SCRATCH = Path("/tmp/four-rivers-walkthrough") / f"dynamic-{lang}"
    setup(lang)
    total = TOTAL + 0.3
    print(f"{lang}: {total:.1f}s, {len(SCENES)} scenes")
    if "--stills" in sys.argv:
        out = Path("/tmp") / f"dyn-stills-{lang}"
        shutil.rmtree(out, ignore_errors=True)
        out.mkdir()
        picks = [float(x) for x in os.environ.get("STILLS", "").split(",") if x] or [
            STARTS[i] + 1.4 for i in range(len(SCENES))
        ]
        for k, T in enumerate(picks):
            frame(round(T * FPS)).save(out / f"s{k:02d}_{T:05.1f}.jpg", quality=88)
        print("wrote", out)
        return
    if not 50 <= total <= 60:
        sys.exit(f"{total:.1f}s is outside 50 to 60 seconds")
    shutil.rmtree(SCRATCH, ignore_errors=True)
    (SCRATCH / "frames").mkdir(parents=True)
    (SCRATCH / "audio").mkdir()
    count = round(total * FPS)
    with mp.get_context("fork").Pool(max(2, (os.cpu_count() or 4) - 1)) as pool:
        for _ in pool.imap_unordered(render_frame, range(count), chunksize=6):
            pass
    track = SCRATCH / "audio" / "music.wav"
    subprocess.run([sys.executable, str(HERE / "music.py"), str(track), str(total)], check=True)
    (SCRATCH / "audio.json").write_text(json.dumps([{"file": str(track), "start": 0}]))
    (HERE / "out").mkdir(exist_ok=True)
    out = HERE / "out" / TEXT[lang]["out"]
    subprocess.run(["swift", str(HERE / "encode.swift"), str(SCRATCH / "frames"), str(FPS), str(W), str(H),
                    str(SCRATCH / "audio.json"), str(out)], check=True)
    print("wrote", out)


if __name__ == "__main__":
    main()
