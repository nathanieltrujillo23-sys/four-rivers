import { useCallback, useState } from "react";
import { INTRO_QUIZ_PASS_THRESHOLD } from "../content/introQuiz";

const KEY = "four-rivers:quiz:introduction";

interface Result {
  passedAt: string | null;
  bestScore: number | null;
}

function load(): Result {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Result;
  } catch {
    /* storage unavailable */
  }
  return { passedAt: null, bestScore: null };
}

function save(result: Result) {
  try {
    localStorage.setItem(KEY, JSON.stringify(result));
  } catch {
    /* storage unavailable — the result just won't persist across visits */
  }
}

/**
 * The introduction's quiz result, same localStorage-only approach as its
 * module-read progress (see useModuleProgress) — this quiz is purely for
 * reinforcement and was never part of the server-side unlock chain, so it
 * doesn't need a database column the way the river quizzes and exam do.
 */
export function useIntroQuizResult() {
  const [result, setResult] = useState<Result>(load);

  const recordResult = useCallback((score: number) => {
    setResult((prev) => {
      const passed = score >= INTRO_QUIZ_PASS_THRESHOLD;
      const next: Result = {
        passedAt: passed ? (prev.passedAt ?? new Date().toISOString()) : prev.passedAt,
        bestScore: Math.max(prev.bestScore ?? 0, score),
      };
      save(next);
      return next;
    });
  }, []);

  return { ...result, recordResult };
}
