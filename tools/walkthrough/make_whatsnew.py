#!/usr/bin/env python3
"""
Writes the "what's new" LinkedIn storyboards (English and Spanish) that
build_wide.py renders. Screenshots live in shots2/<lang>/ (captured from the
built-in demo account at 375x812, in each language).

    python3 make_whatsnew.py
    python3 build_wide.py storyboard_new_en.json
    python3 build_wide.py storyboard_new_es.json
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
PALETTE = [("#a9743b", "#f4e9dc"), ("#2f6f4f", "#e4efe6"), ("#1f6f8b", "#e0eef2"), ("#3a5a9b", "#e3e8f4")]

# (image, pan, kicker, headline, body) per language; same order and shots in both.
EN = [
    ("home", [0, 60], "What's new", "4 Rivers keeps growing",
     "Since you last saw it, the course picked up a community, new calculators, and a Spanish version. Here is a quick look."),
    ("language", [0, 100], "In your language", "Now available in Spanish",
     "Switch from the A menu. Lessons, quizzes, Scripture, and tools follow your choice, and you can make the text larger too."),
    ("budget", [0, 326], "Practice", "Build a real monthly budget",
     "List income, needs, discretionary spending, saving, investing, and giving, and see where every dollar goes."),
    ("tvm", [0, 326], "Learn by doing", "See what time does to your money",
     "Compare cash, a high yield savings account, and stocks and bonds over as many years as you like."),
    ("pdf", [0, 0], "Take it with you", "Print your stewardship plan",
     "Export a one page PDF with your name, the four rivers, and every line of your budget."),
    ("glossary", [0, 300], "In plain words", "A glossary for every money term",
     "Fifty short definitions you can search, so no word gets in the way of the idea."),
    ("join", [0, 200], "Community", "Join a group with a four digit code",
     "Enter the code your leader shares, or scan their QR code, and you are in."),
    ("qr", [0, 326], "For leaders", "Share a code or a QR to invite",
     "Approved leaders create a group, then hand out a four digit code or a QR that opens the join page."),
    ("chat", [0, 326], "Together", "Talk with people you know by name",
     "Group chat shows each person's picture and preferred name, so it feels like a real conversation."),
    ("prayer", [0, 326], "Pray", "A prayer wall on a blackboard",
     "Requests are pinned like notes written in pencil. Tap the drop when you pray, and mark them answered later."),
    ("profile", [60, 326], "Make it yours", "Pick a picture or a sketch",
     "Upload a photo or choose from 23 hand drawn symbols like the lion, lamb, dove, and lamp. Set your preferred name too."),
    ("bell", [0, 150], "Stay in the loop", "Know when someone joins or finishes",
     "A bell tells you when a new member arrives or a classmate passes the final exam."),
    ("plan", [0, 326], "Reading plans", "Spread any passage across the calendar",
     "Choose passages and dates, read books one after another or together, and keep chapters whole or split them at natural breaks."),
    ("progress", [0, 326], "Keep each other going", "Check in on today's reading",
     "Tick off each day and see everyone's progress in one row, with a check for every reading done."),
    ("verses", [0, 200], "Search", "Find any verse in the Bible",
     "Look up a reference or a word. The KJV is built in, with the ESV and NLT through their own services."),
    ("coleader", [0, 326], "Share the work", "Co-leaders help run the group",
     "A leader can name co-leaders to help with verses, plans, and moderation, while only the admin creates new leaders."),
]
ES = [
    ("home", [0, 60], "Novedades", "4 Rivers sigue creciendo",
     "Desde la última vez, el curso sumó una comunidad, nuevas calculadoras y una versión en español. Aquí tienes un vistazo rápido."),
    ("language", [0, 100], "En tu idioma", "Ahora también en español",
     "Cambia desde el menú A. Las lecciones, los exámenes, las Escrituras y las herramientas siguen tu elección, y puedes agrandar el texto."),
    ("budget", [0, 326], "Practica", "Arma un presupuesto mensual real",
     "Anota ingresos, necesidades, gastos opcionales, ahorro, inversión y generosidad, y mira adónde va cada dólar."),
    ("tvm", [0, 326], "Aprende haciendo", "Mira lo que el tiempo hace con tu dinero",
     "Compara efectivo, una cuenta de ahorro de alto rendimiento y acciones y bonos durante los años que quieras."),
    ("pdf", [0, 0], "Llévalo contigo", "Imprime tu plan de mayordomía",
     "Exporta un PDF de una página con tu nombre, los cuatro ríos y cada línea de tu presupuesto."),
    ("glossary", [0, 300], "En palabras sencillas", "Un glosario para cada término de dinero",
     "Cincuenta definiciones cortas que puedes buscar, para que ninguna palabra estorbe a la idea."),
    ("join", [0, 200], "Comunidad", "Únete a un grupo con un código de cuatro dígitos",
     "Ingresa el código que comparte tu líder, o escanea su código QR, y ya estás dentro."),
    ("qr", [0, 326], "Para líderes", "Comparte un código o un QR para invitar",
     "Los líderes aprobados crean un grupo y reparten un código de cuatro dígitos o un QR que abre la página para unirse."),
    ("chat", [0, 326], "Juntos", "Conversa con personas que conoces por nombre",
     "El chat muestra la foto y el nombre preferido de cada persona, para que se sienta como una conversación real."),
    ("prayer", [0, 326], "Oren", "Un muro de oración como una pizarra",
     "Las peticiones se fijan como notas escritas a lápiz. Toca la gota cuando ores y márcalas como respondidas después."),
    ("profile", [60, 326], "A tu manera", "Elige una foto o un dibujo",
     "Sube una foto o escoge entre 23 símbolos dibujados a mano, como el león, el cordero, la paloma y la lámpara. Define también tu nombre preferido."),
    ("bell", [0, 150], "Mantente al tanto", "Entérate cuando alguien se une o termina",
     "Una campana te avisa cuando llega un miembro nuevo o un compañero aprueba el examen final."),
    ("plan", [0, 326], "Planes de lectura", "Reparte cualquier pasaje en el calendario",
     "Elige pasajes y fechas, lee los libros uno tras otro o a la vez, y mantén los capítulos completos o divídelos en pausas naturales."),
    ("progress", [0, 326], "Anímense unos a otros", "Marca la lectura de hoy",
     "Marca cada día y mira el avance de todos en una fila, con una palomita por cada lectura hecha."),
    ("verses", [0, 200], "Buscar", "Encuentra cualquier versículo de la Biblia",
     "Busca una cita o una palabra. La KJV viene incluida, y la ESV y la NLT llegan por sus propios servicios."),
    ("coleader", [0, 326], "Trabajen en equipo", "Los colíderes ayudan a dirigir el grupo",
     "Un líder puede nombrar colíderes para ayudar con versículos, planes y moderación, mientras que solo el administrador crea nuevos líderes."),
]
CLOSING = {
    "en": ("4 Rivers", "Free for every young adult", "Install it on your phone like an app. Start today at"),
    "es": ("4 Rivers", "Gratis para cada joven adulto", "Instálalo en tu teléfono como una app. Empieza hoy en"),
}


def write(lang, rows, output):
    scenes = []
    for i, (img, pan, kicker, headline, body) in enumerate(rows):
        accent, soft = PALETTE[i % len(PALETTE)]
        scenes.append({"type": "phone", "image": f"shots2/{lang}/{img}.jpg", "pan": pan,
                       "accent": accent, "soft": soft, "kicker": kicker, "headline": headline, "body": body})
    k, h, b = CLOSING[lang]
    scenes.append({"type": "closing", "seconds": 5.6, "accent": "#a9743b", "soft": "#f4e9dc",
                   "kicker": k, "headline": h, "body": b})
    sb = {"output": output, "fps": 30, "sceneSeconds": 4.6, "footer": "four-rivers.vercel.app", "scenes": scenes}
    (HERE / f"storyboard_new_{lang}.json").write_text(json.dumps(sb, indent=2, ensure_ascii=False))


write("en", EN, "four-rivers-whats-new-linkedin.mp4")
write("es", ES, "four-rivers-novedades-linkedin.mp4")
print("wrote storyboard_new_en.json and storyboard_new_es.json")
