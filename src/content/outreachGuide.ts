/**
 * The one-page guide for pastors, campus ministers, and small-group leaders, shown (and printed) from the Admin
 * dashboard's Outreach section. It describes only what the app really does.
 */
export interface OutreachGuide {
  title: string;
  lead: string;
  sections: { heading: string; items?: string[]; text?: string }[];
  contactLine: string;
  scan: string;
}

export const OUTREACH_GUIDE: Record<"en" | "es", OutreachGuide> = {
  en: {
    title: "Start 4 Rivers groups in your church or ministry",
    lead: "4 Rivers is a free, Scripture-based course in stewardship for young adults: how to earn, save, invest, and give with faith. A group lets your people go through it together.",
    sections: [
      {
        heading: "What a group does together",
        items: [
          "Reads the same lessons, each rooted in Scripture, at its own pace.",
          "Follows a shared reading plan, with a daily check-off and a catch-up list for missed days.",
          "Chats, keeps a prayer wall, and sees when someone passes the final exam.",
          "Gets a weekly email summary for its leaders.",
        ],
      },
      {
        heading: "How to start (about ten minutes)",
        items: [
          "Contact us so we can approve you as a group leader (or ask us to pre-approve a list of leaders).",
          "Create your free account and sign in with the same email.",
          "On the Community page, choose Create a group and give it a name.",
          "Share the 4-digit code: a link, a QR code, or a printed poster.",
          "Pick a reading plan from the ready-made ones, or build your own.",
        ],
      },
      {
        heading: "What leaders see, and what stays private",
        text: "Leaders can see each member's progress in the course and in the group's readings, so they know who to encourage. Money entries are private to each person and are never shown to a leader.",
      },
      {
        heading: "What it costs",
        text: "Nothing. The course, the exam, the certificate, and the groups are free. Everything is available in English and Spanish.",
      },
    ],
    contactLine: "Questions, or want a list of leaders approved in advance? Reach out any time.",
    scan: "Scan to visit 4 Rivers",
  },
  es: {
    title: "Empieza grupos de 4 Rivers en tu iglesia o ministerio",
    lead: "4 Rivers es un curso gratuito de mayordomía, basado en las Escrituras, para jóvenes adultos: cómo ganar, ahorrar, invertir y dar con fe. Un grupo permite que tu gente lo recorra junta.",
    sections: [
      {
        heading: "Lo que hace un grupo juntos",
        items: [
          "Lee las mismas lecciones, cada una con raíces en las Escrituras, a su propio ritmo.",
          "Sigue un plan de lectura compartido, con una marca diaria y una lista para ponerse al día.",
          "Conversa, tiene un muro de oración y se entera cuando alguien aprueba el examen final.",
          "Sus líderes reciben un resumen semanal por correo.",
        ],
      },
      {
        heading: "Cómo empezar (unos diez minutos)",
        items: [
          "Contáctanos para aprobarte como líder de grupo (o pídenos aprobar de antemano una lista de líderes).",
          "Crea tu cuenta gratuita e inicia sesión con el mismo correo.",
          "En la página Comunidad, elige Crear un grupo y ponle nombre.",
          "Comparte el código de 4 dígitos: un enlace, un código QR o un cartel impreso.",
          "Elige un plan de lectura de los ya preparados, o crea el tuyo.",
        ],
      },
      {
        heading: "Lo que ven los líderes y lo que sigue privado",
        text: "Los líderes pueden ver el avance de cada miembro en el curso y en las lecturas del grupo, para saber a quién animar. Las entradas de dinero son privadas de cada persona y nunca se muestran a un líder.",
      },
      {
        heading: "Cuánto cuesta",
        text: "Nada. El curso, el examen, el certificado y los grupos son gratuitos. Todo está disponible en inglés y en español.",
      },
    ],
    contactLine: "¿Preguntas, o quieres una lista de líderes aprobados de antemano? Escríbenos cuando quieras.",
    scan: "Escanea para visitar 4 Rivers",
  },
};

/** The English guide with any reworded pieces applied (keys `outreach:...`; see Admin, Content). One list item per line. */
export function guideWithCopy(g: OutreachGuide, copy: (key: string, fallback: string) => string): OutreachGuide {
  return {
    title: copy("outreach:title", g.title),
    lead: copy("outreach:lead", g.lead),
    sections: g.sections.map((s, i) => ({
      heading: copy(`outreach:s${i}:heading`, s.heading),
      text: s.text === undefined ? undefined : copy(`outreach:s${i}:text`, s.text),
      items:
        s.items === undefined
          ? undefined
          : copy(`outreach:s${i}:items`, s.items.join("\n"))
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean),
    })),
    contactLine: copy("outreach:contact", g.contactLine),
    scan: copy("outreach:scan", g.scan),
  };
}
