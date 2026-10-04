import type { ModuleSection } from "../../types";
import type { Lang } from "../../i18n/LanguageContext";
import { INTRO_GUIDES } from "./intro";
import { RIVER1_GUIDES } from "./river1";
import { RIVER2_GUIDES } from "./river2";
import { RIVER3_GUIDES } from "./river3";
import { RIVER4_GUIDES } from "./river4";
import type { GuideText, ModuleGuide } from "./types";

const GUIDES: Record<string, ModuleGuide[]> = {
  introduction: INTRO_GUIDES,
  "1": RIVER1_GUIDES,
  "2": RIVER2_GUIDES,
  "3": RIVER3_GUIDES,
  "4": RIVER4_GUIDES,
};

export function getGuide(section: ModuleSection, moduleIndex: number, lang: Lang): GuideText | null {
  return GUIDES[String(section)]?.[moduleIndex]?.[lang] ?? null;
}

/** Warm-up questions to open a meeting, one set per section; the module index picks which. */
const ICEBREAKERS: Record<string, { en: string[]; es: string[] }> = {
  introduction: {
    en: [
      "What is something you are grateful for this week?",
      "What was the best thing you ate or drank today?",
      "What is one thing you hope to get out of this group?",
      "Who taught you the most about money, for better or worse?",
    ],
    es: [
      "¿Por qué cosa estás agradecido esta semana?",
      "¿Qué fue lo mejor que comiste o bebiste hoy?",
      "¿Qué esperas recibir de este grupo?",
      "¿Quién te enseñó más sobre el dinero, para bien o para mal?",
    ],
  },
  "1": {
    en: [
      "What is the most unusual job you have ever had?",
      "If you could learn any skill in a month, what would it be?",
      "What was the first thing you ever bought with your own money?",
      "Who is the hardest worker you know, and what do you admire about them?",
    ],
    es: [
      "¿Cuál es el trabajo más inusual que has tenido?",
      "Si pudieras aprender cualquier habilidad en un mes, ¿cuál sería?",
      "¿Qué fue lo primero que compraste con tu propio dinero?",
      "¿Quién es la persona más trabajadora que conoces y qué admiras de ella?",
    ],
  },
  "2": {
    en: [
      "What did you save up for as a kid?",
      "What is something you are looking forward to this year?",
      "What is the best surprise you ever got?",
      "What is one thing you would put in a time capsule?",
    ],
    es: [
      "¿Para qué ahorrabas cuando eras niño?",
      "¿Qué esperas con ilusión este año?",
      "¿Cuál fue la mejor sorpresa que has recibido?",
      "¿Qué meterías en una cápsula del tiempo?",
    ],
  },
  "3": {
    en: [
      "What is something you started slowly that grew into something you love?",
      "Who is a wise person you would love to have dinner with?",
      "What is something you have gotten better at over the years?",
      "What is the best advice anyone has ever given you?",
    ],
    es: [
      "¿Qué cosa empezaste despacio y se volvió algo que amas?",
      "¿A qué persona sabia te encantaría invitar a cenar?",
      "¿En qué has mejorado con los años?",
      "¿Cuál es el mejor consejo que alguien te ha dado?",
    ],
  },
  "4": {
    en: [
      "What is the best gift you ever received?",
      "Who showed you kindness when you did not expect it?",
      "What is something you love giving, whether time, food, or help?",
      "What is a small thing someone did for you that you still remember?",
    ],
    es: [
      "¿Cuál es el mejor regalo que has recibido?",
      "¿Quién fue amable contigo cuando no lo esperabas?",
      "¿Qué te encanta dar, ya sea tiempo, comida o ayuda?",
      "¿Qué pequeño detalle tuvo alguien contigo que todavía recuerdas?",
    ],
  },
};

export function getIcebreaker(section: ModuleSection, moduleIndex: number, lang: Lang): string {
  const list = ICEBREAKERS[String(section)]?.[lang] ?? ICEBREAKERS.introduction[lang];
  return list[moduleIndex % list.length];
}

export type { GuideText, ModuleGuide };
