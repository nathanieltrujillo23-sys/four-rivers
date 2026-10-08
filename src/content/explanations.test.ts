import { describe, expect, it } from "vitest";
import { EXPLANATIONS, type ExplanationSet } from "./explanations";
import { EXPLANATIONS_ES } from "./es/explanations";
import { LESSONS, INTRODUCTION } from "./lessons";
import { QUIZZES } from "./quizzes";
import { INTRO_QUIZ } from "./introQuiz";
import { EXAM_QUESTIONS } from "./exam";
import { explanationFor } from "./explain";

const QUESTIONS: Record<ExplanationSet, unknown[]> = {
  introduction: INTRO_QUIZ,
  1: QUIZZES[1],
  2: QUIZZES[2],
  3: QUIZZES[3],
  4: QUIZZES[4],
  exam: EXAM_QUESTIONS,
} as never;

describe("answer explanations", () => {
  for (const set of Object.keys(QUESTIONS) as ExplanationSet[]) {
    it(`${set}: one per question, in both languages, pointing at a real lesson and verse`, () => {
      expect(EXPLANATIONS[set]).toHaveLength(QUESTIONS[set].length);
      expect(EXPLANATIONS_ES[set]).toHaveLength(QUESTIONS[set].length);
      EXPLANATIONS[set].forEach((e, i) => {
        const lessons = e.section === "introduction" ? INTRODUCTION.lessons : LESSONS[e.section].lessons;
        expect(lessons[e.lesson], `${set} #${i + 1} lesson`).toBeDefined();
        expect(lessons[e.lesson].scriptureRefs[e.verse], `${set} #${i + 1} verse`).toBeDefined();
        expect(e.why.length).toBeGreaterThan(40);
        expect(EXPLANATIONS_ES[set][i].length).toBeGreaterThan(40);
      });
    });
  }

  it("shows the lesson's own verse and a link back to the lesson, in Spanish too", () => {
    const en = explanationFor("2", 0, "en")!;
    expect(en.href).toBe("/course/river/2/module/1");
    expect(en.verse?.reference).toBe("Genesis 41:35-36");
    expect(en.lessonTitle).toBe("Why a river needs a reservoir");
    const es = explanationFor("2", 0, "es")!;
    expect(es.why).toMatch(/depósito/);
    expect(es.verse?.version).toBe("RVR1960");
  });
});
