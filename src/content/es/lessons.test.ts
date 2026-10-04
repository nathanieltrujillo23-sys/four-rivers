import { describe, expect, it } from "vitest";
import { INTRODUCTION, LESSONS } from "../lessons";
import { INTRODUCTION_TEXT_ES, RIVER_TEXT_ES } from "./index";
import { EXAM_QUESTIONS } from "../exam";
import { INTRO_QUIZ } from "../introQuiz";
import { QUIZZES } from "../quizzes";
import { EXAM_ES, INTRO_QUIZ_ES, QUIZZES_ES } from "./quizzes";

describe("Spanish lessons", () => {
  it("mirror the English structure so the verses line up", () => {
    expect(INTRODUCTION_TEXT_ES?.lessons).toHaveLength(INTRODUCTION.lessons.length);
    INTRODUCTION.lessons.forEach((l, i) =>
      expect(INTRODUCTION_TEXT_ES?.lessons[i].body.length, `intro ${i}`).toBe(l.body.length),
    );
    for (const n of [1, 2, 3, 4] as const) {
      const es = RIVER_TEXT_ES[n];
      expect(es?.lessons, `river ${n}`).toHaveLength(LESSONS[n].lessons.length);
      LESSONS[n].lessons.forEach((l, i) =>
        expect(es?.lessons[i].body.length, `river ${n} lesson ${i}`).toBe(l.body.length),
      );
    }
  });

  it("translates every quiz and exam question with the same number of options", () => {
    const same = (en: { options: string[] }[], es: { options: string[]; question: string }[] | undefined, name: string) => {
      expect(es, name).toBeDefined();
      expect(es).toHaveLength(en.length);
      en.forEach((q, i) => {
        expect(es![i].options, `${name} ${i}`).toHaveLength(q.options.length);
        expect(es![i].question.length, `${name} ${i}`).toBeGreaterThan(10);
      });
    };
    for (const n of [1, 2, 3, 4] as const) same(QUIZZES[n], QUIZZES_ES[n], `river ${n} quiz`);
    same(EXAM_QUESTIONS, EXAM_ES, "exam");
    same(INTRO_QUIZ, INTRO_QUIZ_ES, "intro quiz");
  });
});
