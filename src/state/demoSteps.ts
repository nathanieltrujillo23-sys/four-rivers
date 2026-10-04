import { INTRODUCTION, LESSONS } from "../content/lessons";
import { QUIZ_PASS_THRESHOLD, QUIZ_QUESTION_COUNT } from "../content/quizzes";
import { EXAM_PASS_THRESHOLD, EXAM_QUESTION_COUNT } from "../content/exam";
import { CHALLENGE_LENGTH_DAYS } from "./challenge";
import type { DemoSeed } from "../data/demoRepository";
import type { StringKey } from "../i18n/en";

export interface DemoStep {
  /** The real page this step is shown on. */
  path: string;
  /** Matches a `data-tour` attribute on that page. */
  target: string;
  title: StringKey;
  text: StringKey;
  /** Values filled into the step's text (counts and thresholds come from the content, not the translation). */
  vars?: Record<string, string | number>;
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
    title: "tour.s1.title",
    text: "tour.s1.text",
  },
  {
    path: "/course/introduction",
    target: "intro-modules",
    title: "tour.s2.title",
    text: "tour.s2.text",
    vars: { n: INTRODUCTION.lessons.length },
  },
  {
    path: "/course/introduction/module/1",
    target: "mark-complete",
    title: "tour.s3.title",
    text: "tour.s3.text",
  },
  {
    path: "/course/river/1",
    target: "river-modules",
    title: "tour.s4.title",
    text: "tour.s4.text",
  },
  {
    path: `/course/river/1/module/${LESSONS[1].lessons.length}`,
    target: "practice",
    title: "tour.s5.title",
    text: "tour.s5.text",
  },
  {
    path: "/course/river/1/quiz",
    target: "quiz",
    title: "tour.s6.title",
    text: "tour.s6.text",
    vars: { count: QUIZ_QUESTION_COUNT, pass: QUIZ_PASS_THRESHOLD },
  },
  {
    path: "/course/exam",
    target: "exam-card",
    title: "tour.s7.title",
    text: "tour.s7.text",
    vars: { count: EXAM_QUESTION_COUNT, pass: EXAM_PASS_THRESHOLD },
  },
  {
    path: "/certificate",
    target: "certificate",
    title: "tour.s8.title",
    text: "tour.s8.text",
    seed: { examPassed: true },
  },
  {
    path: "/challenge",
    target: "challenge-header",
    title: "tour.s9.title",
    text: "tour.s9.text",
    vars: { days: CHALLENGE_LENGTH_DAYS - 1, last: CHALLENGE_LENGTH_DAYS },
    seed: { examPassed: true, challengeStarted: true },
  },
  {
    path: "/",
    target: "begin",
    title: "tour.s10.title",
    text: "tour.s10.text",
    leaveDemo: true,
  },
];
