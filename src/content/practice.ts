import { VERSE } from "./scripture";

/**
 * 30 Days of Practice: one small action a day after the course, a week for each river and two days to look back.
 * Each day has the action, one line on why it matters, a verse from the course's own library (KJV, NIV, NLT or ESV,
 * shown in the matching Spanish version in Spanish), and where in the app to do it. These are habits to try, for
 * learning; nothing here is financial advice.
 */
export type PracticeLink =
  | { kind: "tracker"; river: 1 | 2 | 3 | 4 }
  | { kind: "journal" }
  | { kind: "dashboard" }
  | { kind: "glossary" };

export interface PracticeText {
  title: string;
  action: string;
  why: string;
}

export interface PracticeDay {
  day: number;
  river: 1 | 2 | 3 | 4;
  verse: keyof typeof VERSE;
  link?: PracticeLink;
  en: PracticeText;
  es: PracticeText;
}

export const PRACTICE_LENGTH = 30;

export const PRACTICE_DAYS: PracticeDay[] = [
  /* Week 1: Income */
  {
    day: 1,
    river: 1,
    verse: "prov27_23_esv",
    link: { kind: "journal" },
    en: {
      title: "See where it goes",
      action: "Write down every dollar you spend today, however small.",
      why: "You can't steward what you can't see. One honest day is the start of every budget.",
    },
    es: {
      title: "Mira a dónde va",
      action: "Anota cada dólar que gastes hoy, por pequeño que sea.",
      why: "No puedes administrar lo que no ves. Un día honesto es el comienzo de todo presupuesto.",
    },
  },
  {
    day: 2,
    river: 1,
    verse: "deut8_18_niv",
    link: { kind: "tracker", river: 1 },
    en: {
      title: "Name every stream",
      action: "List every source of income you have in the Income tracker, even the small or irregular ones.",
      why: "Seeing all of it at once shows what you've been given and where it could grow.",
    },
    es: {
      title: "Nombra cada fuente",
      action: "Anota cada fuente de ingresos que tengas en el registro de Ingresos, incluso las pequeñas o irregulares.",
      why: "Verlo todo junto muestra lo que se te ha dado y dónde podría crecer.",
    },
  },
  {
    day: 3,
    river: 1,
    verse: "col3_23_niv",
    en: {
      title: "Work it fully",
      action: "Choose one task today, at work or in class, and do it completely, not just well enough.",
      why: "Diligence is part of stewardship, and it is noticed long before a raise is.",
    },
    es: {
      title: "Hazlo completo",
      action: "Elige una tarea hoy, en el trabajo o en clase, y hazla por completo, no solo lo suficiente.",
      why: "La diligencia es parte de la mayordomía, y se nota mucho antes que un aumento.",
    },
  },
  {
    day: 4,
    river: 1,
    verse: "pet4_10_kjv",
    link: { kind: "journal" },
    en: {
      title: "One skill to grow",
      action: "Write down one skill that would raise what you can earn this year, and the first step toward it.",
      why: "Your abilities are gifts to develop, and growing them is the surest way to grow your income.",
    },
    es: {
      title: "Una habilidad para crecer",
      action: "Escribe una habilidad que aumentaría lo que puedes ganar este año, y el primer paso hacia ella.",
      why: "Tus habilidades son dones para desarrollar, y hacerlas crecer es la forma más segura de aumentar tus ingresos.",
    },
  },
  {
    day: 5,
    river: 1,
    verse: "ex20_9_kjv",
    en: {
      title: "Rest on purpose",
      action: "Set aside part of today with no earning and no spending. Notice how it feels.",
      why: "Rest is a reminder that what you have doesn't depend on working every hour.",
    },
    es: {
      title: "Descansa a propósito",
      action: "Aparta una parte del día sin ganar ni gastar dinero. Fíjate en cómo te sientes.",
      why: "El descanso recuerda que lo que tienes no depende de trabajar cada hora.",
    },
  },
  {
    day: 6,
    river: 1,
    verse: "prov15_22_esv",
    en: {
      title: "Ask one question",
      action: "Ask someone further along in a career you admire one question about how they got there.",
      why: "Plans succeed with many advisers, and most people are glad to be asked.",
    },
    es: {
      title: "Haz una pregunta",
      action: "Pregúntale a alguien más avanzado en una carrera que admiras cómo llegó hasta ahí.",
      why: "Los planes tienen éxito con muchos consejeros, y a la mayoría le alegra que le pregunten.",
    },
  },
  {
    day: 7,
    river: 1,
    verse: "hab2_2_kjv",
    link: { kind: "journal" },
    en: {
      title: "Look back at the week",
      action: "In your journal, write what surprised you most about your spending and earning this week.",
      why: "Writing it down turns a week of small actions into something you can learn from.",
    },
    es: {
      title: "Repasa la semana",
      action: "En tu diario, escribe lo que más te sorprendió de tus gastos e ingresos esta semana.",
      why: "Escribirlo convierte una semana de acciones pequeñas en algo de lo que puedes aprender.",
    },
  },

  /* Week 2: Saving */
  {
    day: 8,
    river: 2,
    verse: "prov21_5_esv",
    link: { kind: "tracker", river: 2 },
    en: {
      title: "Set one goal",
      action: "Create or check one savings goal in the Saving tracker, with an amount and a date.",
      why: "A named goal with a date turns 'I should save' into a plan.",
    },
    es: {
      title: "Fija una meta",
      action: "Crea o revisa una meta de ahorro en el registro de Ahorro, con una cantidad y una fecha.",
      why: "Una meta con nombre y fecha convierte 'debería ahorrar' en un plan.",
    },
  },
  {
    day: 9,
    river: 2,
    verse: "prov21_20_niv",
    link: { kind: "tracker", river: 2 },
    en: {
      title: "Save first",
      action: "Move any amount, even $5, into savings before you spend anything today, and log it.",
      why: "Saving first, not with whatever is left, is the habit that makes savings happen.",
    },
    es: {
      title: "Ahorra primero",
      action: "Pasa cualquier cantidad, aunque sean $5, a tus ahorros antes de gastar algo hoy, y anótalo.",
      why: "Ahorrar primero, y no con lo que sobre, es el hábito que hace que el ahorro suceda.",
    },
  },
  {
    day: 10,
    river: 2,
    verse: "luke14_28_niv",
    en: {
      title: "Cut one leak",
      action: "Find one subscription or recurring charge you don't use, and cancel or pause it.",
      why: "Small recurring costs add up quietly. Counting the cost includes what you've stopped noticing.",
    },
    es: {
      title: "Cierra una fuga",
      action: "Busca una suscripción o un cargo recurrente que no uses, y cancélalo o páusalo.",
      why: "Los pequeños gastos recurrentes se acumulan sin hacer ruido. Calcular el costo incluye lo que ya no notas.",
    },
  },
  {
    day: 11,
    river: 2,
    verse: "prov19_2_niv",
    en: {
      title: "Wait a day",
      action: "Pick one thing you want to buy today and wait 24 hours before deciding.",
      why: "A day's pause separates what you need from what you want right now.",
    },
    es: {
      title: "Espera un día",
      action: "Elige algo que quieras comprar hoy y espera 24 horas antes de decidir.",
      why: "Una pausa de un día separa lo que necesitas de lo que quieres en este momento.",
    },
  },
  {
    day: 12,
    river: 2,
    verse: "prov6_6_esv",
    link: { kind: "dashboard" },
    en: {
      title: "Find your emergency number",
      action: "Add up three months of essentials (housing, food, transport, bills). That's your emergency-fund target.",
      why: "Knowing the number makes a hard season something you prepared for, not something that surprises you.",
    },
    es: {
      title: "Calcula tu número de emergencia",
      action: "Suma tres meses de gastos esenciales (vivienda, comida, transporte, cuentas). Esa es tu meta de fondo de emergencia.",
      why: "Conocer el número convierte una temporada difícil en algo para lo que te preparaste, no en una sorpresa.",
    },
  },
  {
    day: 13,
    river: 2,
    verse: "phil4_11_kjv",
    link: { kind: "journal" },
    en: {
      title: "Count what you have",
      action: "Write down five things you already have that you're thankful for.",
      why: "Contentment is the quiet strength behind every savings habit.",
    },
    es: {
      title: "Cuenta lo que tienes",
      action: "Escribe cinco cosas que ya tienes y por las que estás agradecido.",
      why: "El contentamiento es la fuerza silenciosa detrás de todo hábito de ahorro.",
    },
  },
  {
    day: 14,
    river: 2,
    verse: "prov30_25_kjv",
    en: {
      title: "Plan one category",
      action: "Set a limit for one spending category next week, such as food or going out.",
      why: "Planning ahead in one area is easier than trying to fix everything at once.",
    },
    es: {
      title: "Planifica una categoría",
      action: "Pon un límite a una categoría de gasto para la próxima semana, como comida o salidas.",
      why: "Planificar con tiempo en un área es más fácil que intentar arreglarlo todo a la vez.",
    },
  },
  {
    day: 15,
    river: 2,
    verse: "luke16_10_esv",
    link: { kind: "tracker", river: 2 },
    en: {
      title: "Log the week",
      action: "Add up what you saved this week and log it in the Saving tracker.",
      why: "Faithful in little: small amounts recorded honestly build the habit for larger ones.",
    },
    es: {
      title: "Registra la semana",
      action: "Suma lo que ahorraste esta semana y anótalo en el registro de Ahorro.",
      why: "Fiel en lo poco: cantidades pequeñas anotadas con honestidad forman el hábito para las grandes.",
    },
  },

  /* Week 3: Investing */
  {
    day: 16,
    river: 3,
    verse: "prov13_11_niv",
    link: { kind: "journal" },
    en: {
      title: "Know what's offered",
      action: "Find out whether your job or school offers a retirement account and any matching. Write down what you learn.",
      why: "Many people miss money already offered to them simply because they never asked.",
    },
    es: {
      title: "Conoce lo que se ofrece",
      action: "Averigua si tu trabajo o escuela ofrece una cuenta de jubilación y si hay aportación equivalente. Escribe lo que aprendas.",
      why: "Mucha gente pierde dinero que ya se le ofrece simplemente porque nunca preguntó.",
    },
  },
  {
    day: 17,
    river: 3,
    verse: "jas5_7_esv",
    link: { kind: "dashboard" },
    en: {
      title: "Watch time work",
      action: "In the dashboard calculator, see what $50 a month becomes over 40 years. Note the number.",
      why: "Growth takes patience. Seeing the curve makes the long wait easier to choose.",
    },
    es: {
      title: "Mira al tiempo trabajar",
      action: "En la calculadora del panel, mira en qué se convierten $50 al mes durante 40 años. Anota el número.",
      why: "El crecimiento requiere paciencia. Ver la curva hace más fácil elegir la espera.",
    },
  },
  {
    day: 18,
    river: 3,
    verse: "prov9_9_esv",
    link: { kind: "glossary" },
    en: {
      title: "Learn one term",
      action: "Look up 'index fund' in the glossary and explain it to yourself in one sentence.",
      why: "Understanding what you'd own is the first rule of investing.",
    },
    es: {
      title: "Aprende un término",
      action: "Busca 'fondo indexado' en el glosario y explícatelo en una sola frase.",
      why: "Entender lo que tendrías es la primera regla de la inversión.",
    },
  },
  {
    day: 19,
    river: 3,
    verse: "eccl11_2_niv",
    link: { kind: "journal" },
    en: {
      title: "Why spread it out",
      action: "Write, in your own words, why it's wise not to put everything in one place.",
      why: "Diversification is an old idea: you don't know which disaster may come.",
    },
    es: {
      title: "Por qué diversificar",
      action: "Escribe, con tus propias palabras, por qué es sabio no ponerlo todo en un solo lugar.",
      why: "La diversificación es una idea antigua: no sabes qué desgracia puede venir.",
    },
  },
  {
    day: 20,
    river: 3,
    verse: "prov28_20_kjv",
    en: {
      title: "Test a quick-money pitch",
      action: "Think of one 'get rich quick' pitch you've seen online. Check it against what you learned in the course.",
      why: "Haste to be rich is a warning sign, in Scripture and in every fraud report.",
    },
    es: {
      title: "Pon a prueba una promesa de dinero rápido",
      action: "Piensa en una promesa de 'hazte rico rápido' que hayas visto en internet. Compárala con lo que aprendiste en el curso.",
      why: "La prisa por enriquecerse es una señal de alerta, en las Escrituras y en todo informe de fraude.",
    },
  },
  {
    day: 21,
    river: 3,
    verse: "prov24_27_esv",
    link: { kind: "journal" },
    en: {
      title: "Name your time horizon",
      action: "Write down when you'd need money you invest: five years, twenty, forty?",
      why: "Money needed soon belongs somewhere steadier than money that can wait decades.",
    },
    es: {
      title: "Define tu horizonte",
      action: "Escribe cuándo necesitarías el dinero que inviertes: ¿cinco años, veinte, cuarenta?",
      why: "El dinero que necesitarás pronto debe estar en un lugar más estable que el que puede esperar décadas.",
    },
  },
  {
    day: 22,
    river: 3,
    verse: "matt25_27_kjv",
    link: { kind: "tracker", river: 3 },
    en: {
      title: "Log one entry",
      action: "Add one investment entry, or a planned one, to the Investing tracker.",
      why: "In the parable, the servant who buried his talent was the one rebuked. Putting money to work is part of faithfulness.",
    },
    es: {
      title: "Registra una entrada",
      action: "Añade una entrada de inversión, o una planificada, al registro de Inversión.",
      why: "En la parábola, el siervo que enterró su talento fue el reprendido. Poner el dinero a trabajar es parte de la fidelidad.",
    },
  },
  {
    day: 23,
    river: 3,
    verse: "prov11_28_niv",
    link: { kind: "journal" },
    en: {
      title: "Where is your trust?",
      action: "In your journal, write honestly about what gives you a sense of security.",
      why: "Investing is wise; trusting in riches is not. The difference is worth checking often.",
    },
    es: {
      title: "¿Dónde está tu confianza?",
      action: "En tu diario, escribe con honestidad qué te da sensación de seguridad.",
      why: "Invertir es sabio; confiar en las riquezas no lo es. Vale la pena revisar la diferencia a menudo.",
    },
  },

  /* Week 4: Giving */
  {
    day: 24,
    river: 4,
    verse: "cor9_7_niv",
    link: { kind: "journal" },
    en: {
      title: "Decide in advance",
      action: "Decide an amount or a percentage to give this month, and write it down.",
      why: "Giving decided ahead of time is cheerful, not reluctant or under pressure.",
    },
    es: {
      title: "Decide de antemano",
      action: "Decide una cantidad o un porcentaje para dar este mes, y escríbelo.",
      why: "Dar lo que se decidió con tiempo es alegre, no a regañadientes ni bajo presión.",
    },
  },
  {
    day: 25,
    river: 4,
    verse: "acts20_35_kjv",
    link: { kind: "tracker", river: 4 },
    en: {
      title: "Give today",
      action: "Give something today, any amount, and log it in the Giving tracker.",
      why: "It is more blessed to give than to receive, and the habit starts with one gift.",
    },
    es: {
      title: "Da hoy",
      action: "Da algo hoy, cualquier cantidad, y anótalo en el registro de Generosidad.",
      why: "Más bienaventurado es dar que recibir, y el hábito empieza con un solo regalo.",
    },
  },
  {
    day: 26,
    river: 4,
    verse: "gal6_10_niv",
    en: {
      title: "Give time",
      action: "Help someone with a task today without being asked.",
      why: "Generosity isn't only money. Time and attention are often what people need most.",
    },
    es: {
      title: "Da tiempo",
      action: "Ayuda hoy a alguien con una tarea sin que te lo pida.",
      why: "La generosidad no es solo dinero. El tiempo y la atención suelen ser lo que más se necesita.",
    },
  },
  {
    day: 27,
    river: 4,
    verse: "matt6_3_esv",
    en: {
      title: "Give in secret",
      action: "Give one gift that no one will know came from you.",
      why: "A gift nobody sees checks whose approval you're giving for.",
    },
    es: {
      title: "Da en secreto",
      action: "Haz un regalo sin que nadie sepa que vino de ti.",
      why: "Un regalo que nadie ve revela de quién buscas la aprobación al dar.",
    },
  },
  {
    day: 28,
    river: 4,
    verse: "prov14_15_kjv",
    link: { kind: "journal" },
    en: {
      title: "Look into a cause",
      action: "Choose one cause you care about and find out what it does and how it uses what it's given.",
      why: "The prudent look carefully. Giving wisely means knowing where your gift goes.",
    },
    es: {
      title: "Investiga una causa",
      action: "Elige una causa que te importe y averigua qué hace y cómo usa lo que recibe.",
      why: "El prudente mira bien. Dar con sabiduría es saber a dónde va tu regalo.",
    },
  },
  {
    day: 29,
    river: 4,
    verse: "jas1_17_kjv",
    en: {
      title: "Say thank you",
      action: "Thank someone who has been generous to you, by message, call or note.",
      why: "Gratitude remembers that every good gift comes from above, and it encourages the giver.",
    },
    es: {
      title: "Da las gracias",
      action: "Agradece a alguien que ha sido generoso contigo, con un mensaje, una llamada o una nota.",
      why: "La gratitud recuerda que todo buen regalo viene de lo alto, y anima a quien da.",
    },
  },
  {
    day: 30,
    river: 4,
    verse: "josh24_15_kjv",
    link: { kind: "journal" },
    en: {
      title: "Choose what stays",
      action: "Look back at the 30 days and write down the three habits you'll keep.",
      why: "Stewardship is decided out loud and then lived every ordinary day afterward.",
    },
    es: {
      title: "Elige lo que se queda",
      action: "Repasa los 30 días y escribe los tres hábitos que vas a mantener.",
      why: "La mayordomía se decide en voz alta y luego se vive cada día ordinario después.",
    },
  },
];

/** Which day of practice is "today", by elapsed time since it started, clamped to 1-30. */
export function currentPracticeDay(startedAt: string, now: number = Date.now()): number {
  const day = Math.floor((now - new Date(startedAt).getTime()) / 86_400_000) + 1;
  return Math.min(PRACTICE_LENGTH, Math.max(1, day));
}
