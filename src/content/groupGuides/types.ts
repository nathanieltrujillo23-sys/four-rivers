/** Discussion material for one module, in both languages. */
export interface GuideText {
  /** Three open questions: one personal, one about the lesson, one about living it out together. */
  questions: [string, string, string];
  /** One small thing to try before the next meeting. Never a financial instruction. */
  practice: string;
  /** A one-line prompt to pray through together. */
  pray: string;
}

export interface ModuleGuide {
  en: GuideText;
  es: GuideText;
}
