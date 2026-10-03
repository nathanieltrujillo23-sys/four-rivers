import { INTRODUCTION, LESSONS } from "../content/lessons";
import { QUIZ_PASS_THRESHOLD, QUIZ_QUESTION_COUNT } from "../content/quizzes";
import { EXAM_PASS_THRESHOLD, EXAM_QUESTION_COUNT } from "../content/exam";
import { CHALLENGE_LENGTH_DAYS } from "./challenge";
import type { DemoSeed } from "../data/demoRepository";

export interface DemoStep {
  /** The real page this step is shown on. */
  path: string;
  /** Matches a `data-tour` attribute on that page. */
  target: string;
  title: string;
  text: string;
  /** What state the sample account should be in on this step. */
  seed?: DemoSeed;
  /** The sample account is gone from this step on (the home page). */
  leaveDemo?: boolean;
}

/**
 * The guided tour: each step is a real page of the app, shown with a sample
 * account (see data/demoRepository.ts), ending back on the home page.
 */
export const DEMO_STEPS: DemoStep[] = [
  {
    path: "/course",
    target: "course-rivers",
    title: "Your course home",
    text: "The Introduction and the four rivers live here, and each river unlocks after you pass the one before it. This is a sample account, so nothing you see is saved.",
  },
  {
    path: "/course/introduction",
    target: "intro-modules",
    title: "The Introduction",
    text: `${INTRODUCTION.lessons.length} short modules on stewardship in Scripture, plus budgeting, compounding, and debt. A quiz unlocks once you've read them all.`,
  },
  {
    path: "/course/introduction/module/1",
    target: "mark-complete",
    title: "Reading a module",
    text: "Read each module, jot a note for your journal if something stands out, then mark it complete. Your progress follows you across devices.",
  },
  {
    path: "/course/river/1",
    target: "river-modules",
    title: "A river's modules",
    text: "Each river is a short list of modules, about 15 minutes of reading in all, followed by a quiz.",
  },
  {
    path: `/course/river/1/module/${LESSONS[1].lessons.length}`,
    target: "practice",
    title: "The practice tracker",
    text: "A river's last module has a simple tracker where you log one real entry: an income stream, a savings deposit, an investment, or a gift.",
  },
  {
    path: "/course/river/1/quiz",
    target: "quiz",
    title: "River quizzes",
    text: `${QUIZ_QUESTION_COUNT} practical questions at the end of every river. Score ${QUIZ_PASS_THRESHOLD} to unlock the next river, and retake it as often as you like.`,
  },
  {
    path: "/course/exam",
    target: "exam-card",
    title: "The final exam",
    text: `After River 4, ${EXAM_QUESTION_COUNT} questions, one per page with arrows to move between them. Score ${EXAM_PASS_THRESHOLD} to pass, with unlimited retakes.`,
  },
  {
    path: "/certificate",
    target: "certificate",
    title: "Your certificate",
    text: "Passing the exam unlocks a printable certificate. The QR code lets anyone confirm it's genuine.",
    seed: { examPassed: true },
  },
  {
    path: "/challenge",
    target: "challenge-header",
    title: "The 30-Day Challenge",
    text: `An optional pace that spreads every module, entry, and quiz across ${CHALLENGE_LENGTH_DAYS - 1} days, with the exam on day ${CHALLENGE_LENGTH_DAYS}, plus a daily streak.`,
    seed: { examPassed: true, challengeStarted: true },
  },
  {
    path: "/",
    target: "begin",
    title: "That's the course",
    text: "The sample account is gone and nothing was saved. When you're ready, create a free account and begin with the Introduction.",
    leaveDemo: true,
  },
];
