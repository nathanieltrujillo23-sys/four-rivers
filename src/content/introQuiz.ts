import type { QuizQuestion } from "./quizzes";

/** Score needed (out of 10) to pass the introduction's quiz. Unlike the river
 * quizzes, this doesn't gate or unlock anything — the introduction was never
 * part of the unlock chain — it's purely for reinforcement. */
export const INTRO_QUIZ_PASS_THRESHOLD = 7;

/** Ten questions grounded directly in content/lessons/introduction.ts. */
export const INTRO_QUIZ: QuizQuestion[] = [
  {
    question: "According to the introduction, what was the first assignment any person was ever given?",
    options: [
      "To build a civilization",
      "To manage something that belonged to someone else",
      "To multiply wealth for personal gain",
      "To worship in the temple",
    ],
    correctIndex: 1,
  },
  {
    question: "What single word does the introduction call \"the measuring stick this whole course keeps coming back to\"?",
    options: ["Faithful", "Wealthy", "Clever", "Generous"],
    correctIndex: 0,
  },
  {
    question: "What did Abraham name the place where God provided on the mountain?",
    options: ["The LORD will provide", "The place of testing", "The mount of sacrifice", "The hill of promise"],
    correctIndex: 0,
  },
  {
    question: "What virtue does the introduction say Joseph modeled by storing grain during years of plenty?",
    options: ["Courage", "Foresight", "Patience", "Humility"],
    correctIndex: 1,
  },
  {
    question: "What \"strange, happy problem\" did Moses face when the people gave toward building the tabernacle?",
    options: [
      "Not enough materials were given",
      "The materials arrived too late",
      "The people gave so much he had to tell them to stop",
      "No one volunteered to help build it",
    ],
    correctIndex: 2,
  },
  {
    question: "What challenge did Joshua give the people near the end of his life?",
    options: [
      "Build a new temple",
      "Choose this day whom you will serve",
      "Appoint a new king",
      "Return to Egypt",
    ],
    correctIndex: 1,
  },
  {
    question: "What did Daniel refuse as a young man in Babylon, even though no one would have noticed?",
    options: ["A position in government", "The king's rich food and wine", "A new name", "A place to live"],
    correctIndex: 1,
  },
  {
    question: "According to the introduction, what is a budget really, underneath its restrictive reputation?",
    options: [
      "A cage built to stop you from spending",
      "A plan that tells your money where to go before the month spends it",
      "A type of loan agreement",
      "A tax filing requirement",
    ],
    correctIndex: 1,
  },
  {
    question: "What does the introduction call the mechanism behind the time value of money?",
    options: ["Inflation", "Compounding — growth that itself grows", "Diversification", "Budgeting"],
    correctIndex: 1,
  },
  {
    question: "According to Proverbs as quoted in the introduction, what is the borrower to the lender?",
    options: ["A partner", "A servant", "A guarantor", "A customer"],
    correctIndex: 1,
  },
];
