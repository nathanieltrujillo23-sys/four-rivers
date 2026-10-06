/**
 * Ready-made reading plans a leader can start from. Passages are written the way a person would type
 * them into the plan maker, and the number of days sets the length (one reading a day).
 */
export interface PlanTemplate {
  id: string;
  title: { en: string; es: string };
  blurb: { en: string; es: string };
  /** Passages in reading order. */
  passages: string[];
  days: number;
  /** Keep chapters whole (true), or split them at natural breaks to even out the days. */
  wholeChapters: boolean;
}

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: "proverbs31",
    title: { en: "Proverbs in 31 days", es: "Proverbios en 31 días" },
    blurb: { en: "One chapter a day, the book of wisdom in a month.", es: "Un capítulo al día, el libro de sabiduría en un mes." },
    passages: ["Proverbs"],
    days: 31,
    wholeChapters: true,
  },
  {
    id: "sermon7",
    title: { en: "The Sermon on the Mount in a week", es: "El Sermón del Monte en una semana" },
    blurb: { en: "Matthew 5 to 7, spread over seven days.", es: "Mateo 5 a 7, repartido en siete días." },
    passages: ["Matthew 5-7"],
    days: 7,
    wholeChapters: false,
  },
  {
    id: "stewardship12",
    title: { en: "Stewardship in 12 days", es: "Mayordomía en 12 días" },
    blurb: {
      en: "Key passages on money, work, saving, and giving.",
      es: "Pasajes clave sobre el dinero, el trabajo, el ahorro y la generosidad.",
    },
    passages: [
      "Genesis 41:25-57",
      "Proverbs 3:5-10",
      "Ecclesiastes 5:10-20",
      "Matthew 6:19-34",
      "Matthew 25:14-30",
      "Luke 12:13-34",
      "Luke 16:1-13",
      "Malachi 3:6-12",
      "2 Corinthians 8",
      "2 Corinthians 9",
      "1 Timothy 6:6-19",
      "Hebrews 13:1-8",
    ],
    days: 12,
    wholeChapters: false,
  },
  {
    id: "john21",
    title: { en: "The Gospel of John in 21 days", es: "El Evangelio de Juan en 21 días" },
    blurb: { en: "One chapter a day through John.", es: "Un capítulo al día en Juan." },
    passages: ["John"],
    days: 21,
    wholeChapters: true,
  },
  {
    id: "psalms30",
    title: { en: "Psalms in 30 days", es: "Salmos en 30 días" },
    blurb: { en: "About five psalms a day.", es: "Unos cinco salmos al día." },
    passages: ["Psalm"],
    days: 30,
    wholeChapters: true,
  },
  {
    id: "romans16",
    title: { en: "Romans in 16 days", es: "Romanos en 16 días" },
    blurb: { en: "One chapter a day through Paul's great letter.", es: "Un capítulo al día en la gran carta de Pablo." },
    passages: ["Romans"],
    days: 16,
    wholeChapters: true,
  },
  {
    id: "acts28",
    title: { en: "Acts in 28 days", es: "Hechos en 28 días" },
    blurb: { en: "The early church, a chapter a day.", es: "La iglesia primitiva, un capítulo al día." },
    passages: ["Acts"],
    days: 28,
    wholeChapters: true,
  },
];
