import type { QuizQuestion } from "./quizzes";

/** Score needed (out of 10) to pass the introduction's quiz. Unlike the river
 * quizzes, this doesn't gate or unlock anything — the introduction was never
 * part of the unlock chain — it's purely for reinforcement. */
export const INTRO_QUIZ_PASS_THRESHOLD = 7;

/**
 * Ten practical, scenario-based questions grounded in
 * content/lessons/introduction.ts — each asks the learner to apply or
 * reflect on a principle rather than recall an isolated fact.
 */
export const INTRO_QUIZ: QuizQuestion[] = [
  {
    question:
      "Jordan was handed a company car for work and now treats it as entirely his own to risk however he likes. What does the introduction's picture of the very first human assignment — managing a garden that belonged to someone else — say about how he should view it instead?",
    options: [
      "It's his to use however he wants once it's in his possession",
      "What's placed in our care is still owed careful management, even when it isn't ultimately ours",
      "Only religious objects require this kind of care",
      "Company property is a special exception to stewardship",
    ],
    correctIndex: 1,
  },
  {
    question:
      "Comparing herself to a wealthier friend, Maria feels like a financial failure even though she manages her modest income carefully and generously. What single word does the introduction say this whole course keeps measuring against, instead of amount?",
    options: ["Wealthy", "Faithful", "Clever", "Lucky"],
    correctIndex: 1,
  },
  {
    question:
      "A family facing a sudden financial shortfall remembers Abraham on the mountain, naming the place \"The LORD will provide\" after provision showed up at the point of need. What does that story suggest to them in their own shortfall?",
    options: [
      "Provision rarely arrives until the very last possible moment, so panic is reasonable",
      "They should stop planning ahead since provision will simply appear",
      "It's an encouragement to trust provision even amid real uncertainty, without excusing poor planning",
      "Only famous figures like Abraham can expect that kind of provision",
    ],
    correctIndex: 2,
  },
  {
    question:
      "A household has an unusually strong income year and is deciding what to do with the extra. What does Joseph's foresight — storing grain during Egypt's years of plenty — suggest they consider, rather than spending every bit of the surplus?",
    options: [
      "Spend it all immediately since surplus years are rare",
      "Set some aside with an eye toward leaner seasons that may come later",
      "Give it all away at once to avoid the temptation of having it",
      "Surplus income should always go straight into the stock market",
    ],
    correctIndex: 1,
  },
  {
    question:
      "A ministry leader is surprised when a building project receives more donations than it actually needs, and has to ask people to stop giving. What earlier story, from the building of the tabernacle under Moses, mirrors this exact situation?",
    options: [
      "The people initially refused to give anything at all",
      "The materials arrived too late to be useful",
      "The people gave so willingly and so much that Moses had to tell them to stop",
      "Moses had to personally fund the entire project",
    ],
    correctIndex: 2,
  },
  {
    question:
      "Someone keeps drifting between pursuing money as their ultimate goal and claiming they still serve God first, never actually deciding which one governs their choices. What challenge, given by Joshua near the end of his life, speaks directly to that drift?",
    options: [
      "Build a new temple before making any decision",
      "Choose this day whom you will serve",
      "Wait for a clearer sign before committing either way",
      "Appoint someone else to decide for you",
    ],
    correctIndex: 1,
  },
  {
    question:
      "Someone is tempted to quietly cut an ethical corner on a financial matter, confident that absolutely no one would ever find out. What does Daniel's choice in Babylon — refusing the king's food and wine when no one was watching — suggest about that temptation?",
    options: [
      "Integrity only matters when someone else is watching",
      "It's acceptable as long as the outcome benefits you",
      "Convictions are meant to hold even when no one would ever notice the difference",
      "Daniel's situation was about diet, not finances, so it doesn't apply",
    ],
    correctIndex: 2,
  },
  {
    question:
      "Someone avoids making a budget because it feels like a restrictive cage designed to stop them from enjoying their own money. How does the introduction reframe what a budget actually is?",
    options: [
      "A cage built to limit spending and restrict freedom",
      "A plan that tells your money where to go before the month spends it for you",
      "A type of loan agreement with a bank",
      "A government filing requirement",
    ],
    correctIndex: 1,
  },
  {
    question:
      "A young saver wonders whether starting with a small amount now is even worth it compared to waiting until she has a much larger sum to invest. What does the introduction's teaching on the time value of money — compounding, growth that itself grows — suggest about waiting?",
    options: [
      "Waiting for a larger amount is always the smarter move",
      "The amount matters far more than how early you start",
      "Starting early lets growth build on growth over more time, which waiting gives up",
      "Compounding only applies to large sums of money",
    ],
    correctIndex: 2,
  },
  {
    question:
      "Someone is comfortable carrying an open-ended balance of debt because the monthly payments feel manageable, without thinking much about what that debt actually costs them beyond the payment itself. What does Proverbs' teaching, quoted in the introduction, say about the relationship between a borrower and a lender?",
    options: [
      "They're simply business partners with shared interests",
      "The borrower is servant to the lender",
      "Lenders are obligated to act purely in the borrower's favor",
      "The relationship carries no real weight once payments are current",
    ],
    correctIndex: 1,
  },
];
