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
    path: "/course/introduction/module/1",
    target: "mark-complete",
    title: "tour.s2.title",
    text: "tour.s2.text",
    vars: { n: INTRODUCTION.lessons.length },
  },
  {
    path: `/course/river/1/module/${LESSONS[1].lessons.length}`,
    target: "practice",
    title: "tour.s3.title",
    text: "tour.s3.text",
    vars: { count: QUIZ_QUESTION_COUNT, pass: QUIZ_PASS_THRESHOLD },
  },
  {
    path: "/certificate",
    target: "certificate",
    title: "tour.s4.title",
    text: "tour.s4.text",
    vars: { count: EXAM_QUESTION_COUNT, pass: EXAM_PASS_THRESHOLD },
    seed: { examPassed: true },
  },
  {
    path: "/challenge",
    target: "challenge-header",
    title: "tour.s5.title",
    text: "tour.s5.text",
    vars: { days: CHALLENGE_LENGTH_DAYS - 1, last: CHALLENGE_LENGTH_DAYS },
    seed: { examPassed: true, challengeStarted: true },
  },
  {
    path: "/dashboard",
    target: "dash-calculators",
    title: "tour.s6.title",
    text: "tour.s6.text",
    seed: { examPassed: true, challengeStarted: true },
  },
  {
    path: "/community",
    target: "community-join",
    title: "tour.s7.title",
    text: "tour.s7.text",
    seed: { examPassed: true, challengeStarted: true, readingPlan: true },
  },
  {
    path: "/community/demo-group-1",
    target: "group-reading",
    title: "tour.s8.title",
    text: "tour.s8.text",
    seed: { examPassed: true, challengeStarted: true, readingPlan: true },
  },
  {
    path: "/community/demo-group-1/leader",
    target: "leader-plan",
    title: "tour.s9.title",
    text: "tour.s9.text",
    seed: { examPassed: true, challengeStarted: true, readingPlan: true },
  },
  {
    path: "/",
    target: "begin",
    title: "tour.s10.title",
    text: "tour.s10.text",
    leaveDemo: true,
  },
];
