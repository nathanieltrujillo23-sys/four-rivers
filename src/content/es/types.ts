/**
 * Spanish text for a lesson. Only the words are translated here; the Bible
 * verses a lesson carries stay exactly as they are in the English content
 * (KJV, NIV, NLT, and ESV only), so a Spanish lesson always has the same
 * scripture, in the same order, as its English twin.
 */
export interface LessonText {
  title: string;
  body: string[];
}

export interface RiverText {
  title: string;
  intro: string;
  practicePrompt: string;
  lessons: LessonText[];
}

export interface IntroductionText {
  title: string;
  intro: string;
  lessons: LessonText[];
}
