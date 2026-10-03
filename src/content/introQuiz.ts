import type { QuizQuestion } from "./quizzes";

/** Score needed (out of 10) to pass the introduction's quiz. Unlike the river
 * quizzes, this doesn't gate or unlock anything. The introduction was never
 * part of the unlock chain, so the quiz is purely for reinforcement. */
export const INTRO_QUIZ_PASS_THRESHOLD = 7;

/**
 * Ten questions grounded in content/lessons/introduction.ts. Each one asks
 * the learner to apply or reflect on an idea from the lessons, in plain
 * words, rather than recall an isolated fact.
 */
export const INTRO_QUIZ: QuizQuestion[] = [
  {
    question:
      "A friend gets a company car for work and starts treating it like it's all his. The introduction says the very first job people were given was to manage something that belonged to someone else. How would that change the way he looks at the car?",
    options: [
      "It's his to use however he likes once he has the keys",
      "Something placed in your care still deserves careful management, even if it isn't yours",
      "Only religious things need that kind of care",
      "Company property is an exception to stewardship",
    ],
    correctIndex: 1,
  },
  {
    question:
      "Maria looks at a friend who earns more and starts feeling like she's failing, even though she handles her own money carefully and gives generously. Which word does the introduction say this whole course measures by, instead of how much you have?",
    options: ["Clever", "Wealthy", "Lucky", "Faithful"],
    correctIndex: 3,
  },
  {
    question:
      'Your family hits a sudden money shortfall. You remember that Abraham named the place on the mountain "The LORD will provide" after help showed up right when it was needed. What could that story say to you right now?',
    options: [
      "Help usually comes at the last second, so panic makes sense",
      "You can stop planning, because things will just work out",
      "You can trust that provision is possible in a real tight spot, while still doing your part to plan",
      "That kind of provision only happens to famous people",
    ],
    correctIndex: 2,
  },
  {
    question:
      "You have an unusually good year at work and some extra money. Joseph stored grain during the good years before the famine came. What might his example nudge you to do with the extra?",
    options: [
      "Set some aside for leaner seasons that could come later",
      "Spend it all now, since good years are rare",
      "Give all of it away at once so you aren't tempted by it",
      "Put every bit of it into the stock market",
    ],
    correctIndex: 0,
  },
  {
    question:
      "Think of a time you gave your time or money to something because you wanted to, not because anyone made you. In the story of the tabernacle, the people gave so much that Moses had to tell them to stop. What usually sits behind that kind of giving?",
    options: [
      "Pressure from the people around you",
      "Having more than you actually needed",
      "Hoping to get something back",
      "A willing heart that cares about what it's giving to",
    ],
    correctIndex: 3,
  },
  {
    question:
      "You keep saying God comes first, but you also keep letting money make most of your choices, and you've never really decided between the two. Which challenge from Joshua speaks to that?",
    options: [
      "Wait for a clearer sign before you decide",
      "Choose this day whom you will serve",
      "Build something new before deciding anything",
      "Let someone else decide for you",
    ],
    correctIndex: 1,
  },
  {
    question:
      "You see a way to bend a rule around money, and nobody would ever find out. Daniel turned down the king's food and wine when no one was watching. What does that say to you?",
    options: [
      "Doing right only counts when someone is watching",
      "It's fine as long as it works out in your favor",
      "Your convictions are meant to hold even when nobody would ever notice",
      "His story was about food, so it doesn't apply to money",
    ],
    correctIndex: 2,
  },
  {
    question:
      "A friend avoids budgeting because it feels like a cage around his own money. How does the introduction describe what a budget really is?",
    options: [
      "A plan that tells your money where to go before the month spends it for you",
      "A cage that limits what you can spend",
      "A kind of loan paperwork",
      "A form you file with the government",
    ],
    correctIndex: 0,
  },
  {
    question:
      "A friend wonders whether saving a small amount now is even worth it, or if she should wait until she has more. What does the introduction say about starting early?",
    options: [
      "Waiting until you have more is always the smarter move",
      "How much you start with matters far more than when you start",
      "Starting early gives growth more time to build on itself, and waiting gives that up",
      "Compounding only works on large amounts",
    ],
    correctIndex: 2,
  },
  {
    question:
      "When the introduction talks about debt, it quotes a proverb about the borrower and the lender. What does the proverb say?",
    options: [
      "They're equal partners",
      "The borrower is servant to the lender",
      "The lender always has to act in the borrower's favor",
      "It stops mattering once the payments are current",
    ],
    correctIndex: 1,
  },
];
