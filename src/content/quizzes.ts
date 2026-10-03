import type { RiverNumber } from "../types";

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

/** Score needed (out of 10) to pass a river's quiz and unlock the next river. */
export const QUIZ_PASS_THRESHOLD = 7;
export const QUIZ_QUESTION_COUNT = 10;

/**
 * Ten practical, scenario-based questions per river. Each one asks the
 * learner to apply or reflect on a principle from that river's lessons to a
 * concrete situation, rather than recall an isolated fact, and grounded in the
 * actual lesson content (content/lessons/river{N}.ts), just framed as
 * "what would you do" instead of "who said what."
 */
export const QUIZZES: Record<RiverNumber, QuizQuestion[]> = {
  1: [
    {
      question:
        "Alex believes his income is entirely the result of his own hard work and talent. According to this river, what perspective should he hold instead?",
      options: [
        "Income is a gift to be received and managed, not something produced entirely alone",
        "He should work even harder to prove his own worth",
        "His employer deserves all the credit instead",
        "Income doesn't really matter spiritually",
      ],
      correctIndex: 0,
    },
    {
      question:
        "A household depends entirely on one paycheck from one employer. Based on this river, what's the main risk they should prepare for?",
      options: [
        "That their taxes will increase significantly",
        "That a single disruption, like a layoff or illness, could stop all their income at once",
        "That they will never be offered a promotion",
        "That their work will become less interesting",
      ],
      correctIndex: 1,
    },
    {
      question:
        "Priya wants to add a second income stream but is only thinking about what sounds exciting. What question does this river suggest she ask instead?",
      options: [
        "Is this the single most profitable option available to anyone?",
        "Will my friends be impressed by this choice?",
        "What will this new stream displace, and what will it cost me in rest and relationships?",
        "Can I start earning from it by next week?",
      ],
      correctIndex: 2,
    },
    {
      question:
        "A friend is chasing a new income opportunity because he feels he'll never have enough, no matter how much he earns. According to this river's guardrails, what's the real problem?",
      options: [
        "He simply hasn't found the right opportunity yet",
        "He needs to switch financial advisors",
        "He should quit his current job immediately",
        "The love of money and the hurry to get rich, not the income itself",
      ],
      correctIndex: 3,
    },
    {
      question:
        "Two households earn the same total income. One relies on a single job; the other combines a main job with a side business and some interest income. What's the real benefit of the second setup, per this river?",
      options: [
        "It changes how a sudden job loss lands, even though it doesn't prevent hard news",
        "It guarantees they will become wealthier over time",
        "It automatically reduces how much they owe in taxes",
        "It means they no longer need to budget carefully",
      ],
      correctIndex: 0,
    },
    {
      question: "Using this river's own test for what counts as an income stream, which question fits that test?",
      options: [
        "Is it the highest-paying option available right now?",
        "Could this keep producing money for a while, even if another source stopped?",
        "Would my family be proud of this particular choice?",
        "Is it something I could also do for free?",
      ],
      correctIndex: 1,
    },
    {
      question:
        "Someone calls their rental property income \"completely passive\" and expects it to require no attention at all. How should this river's teaching adjust that expectation?",
      options: [
        "That expectation is accurate; rental income truly requires nothing",
        "They should sell the property immediately since it's too much work",
        "Almost no income is truly effortless; it's better described as differently shaped work",
        "Passive income doesn't actually exist in any form",
      ],
      correctIndex: 2,
    },
    {
      question:
        "A new employee feels her hourly retail job is somehow less spiritually significant than \"real\" ministry work. What does this river's view of work say to her?",
      options: [
        "She should quit and look for religious work instead",
        "Her job doesn't really matter to God either way",
        "Only business owners are doing meaningful work",
        "Ordinary, dignified work that produces something useful for others is itself part of the original design",
      ],
      correctIndex: 3,
    },
    {
      question:
        "A household wants to widen their income but worries it means working every evening and weekend indefinitely. What balance does this river recommend?",
      options: [
        "Build slowly, and treat rest as part of a sustainable pattern, not a reward for finishing",
        "Sacrifice rest entirely until the goal is fully reached",
        "Only pursue income streams that require zero time investment",
        "Avoid ever adding a new income stream at all",
      ],
      correctIndex: 0,
    },
    {
      question:
        "Before this river's practice exercise, a learner wonders why simply listing current income sources even matters. What point does this river make about taking inventory?",
      options: [
        "It's mainly a required form needed for tax purposes",
        "Seeing your streams clearly, even small or forgotten ones, is the first act of faithfulness with what you have",
        "It guarantees higher earnings the following year",
        "It's only useful for people who already feel financially behind",
      ],
      correctIndex: 1,
    },
  ],
  2: [
    {
      question:
        "A household just received an unexpected bonus. Based on this river's reservoir picture, what's the wisest immediate move?",
      options: [
        "Spend all of it right away since it's \"extra\"",
        "Set some aside now, since a reservoir only helps if it's filled during the good season",
        "Invest all of it immediately in a single stock",
        "Give all of it away without any thought",
      ],
      correctIndex: 1,
    },
    {
      question:
        "Someone says they can't start saving because they don't earn enough for it to be worthwhile. What does this river's picture of the ant actually teach?",
      options: [
        "You need significant income before saving matters",
        "Preparation requires habit, not great strength or a large income",
        "Ants are a poor model for financial behavior",
        "Saving only matters once an emergency has already happened",
      ],
      correctIndex: 1,
    },
    {
      question:
        "A family has a great year financially and builds a much bigger house with the surplus, with no plan for giving or margin. What was actually wrong with that choice, per the parable discussed in this river?",
      options: [
        "Building a bigger house is always wrong",
        "They should have built an even bigger house instead",
        "The storage was entirely self-focused, with no room for God or others, and offered false security",
        "They didn't consult a financial advisor first",
      ],
      correctIndex: 2,
    },
    {
      question:
        "You keep setting savings goals but failing to follow through. According to this river, what four elements should a well-written goal include to make it concrete?",
      options: [
        "Bank name, account number, interest rate, and fees",
        "Risk level, liquidity, tax status, and term",
        "A promise, a prayer, a plan, and a partner",
        "Purpose, amount, deadline, and rhythm",
      ],
      correctIndex: 3,
    },
    {
      question:
        "Someone feels discouraged saving only $5 a week, assuming it's basically pointless. What does this river say that small, regular amount actually accomplishes?",
      options: [
        "Nothing meaningful until it reaches a large total",
        "It builds the habit, keeps the goal visible, and survives changes in mood, which a one-time deposit can't do",
        "It's only useful as a tax deduction",
        "It should be avoided in favor of waiting for a bigger amount",
      ],
      correctIndex: 1,
    },
    {
      question: "A household wants to apply the \"pay yourself first\" principle from this river. What does that look like in practice?",
      options: [
        "Waiting until the end of the month to save whatever happens to be left",
        "Only saving bonus income, never regular paychecks",
        "Moving a set amount to savings the moment income arrives, before anything else is spent",
        "Saving only after every debt is fully paid off",
      ],
      correctIndex: 2,
    },
    {
      question:
        "A person building savings also carries high-interest credit card debt, and wonders which to prioritize. Why does this river say costly debt typically needs urgent attention?",
      options: [
        "It doesn't really matter which comes first",
        "Interest paid on costly debt often exceeds anything savings could earn, canceling out the benefit of saving",
        "Debt automatically disqualifies someone from saving at all",
        "Credit card companies require savings to come first",
      ],
      correctIndex: 1,
    },
    {
      question: "Someone keeps overspending on nonessential purchases driven by comparison to others. What practical habit does this river suggest to grow contentment?",
      options: [
        "Avoid ever buying anything new again",
        "Compare purchases with friends before deciding",
        "Only buy things that happen to be on sale",
        "Give nonessential purchases a cooling-off period of a few days before buying",
      ],
      correctIndex: 3,
    },
    {
      question:
        "A couple is deciding what to tackle first: an emergency cushion, costly debt, or a long-term goal like a down payment. What order does this river generally recommend?",
      options: [
        "Long-term goals first, since they take the longest to reach",
        "A small starter cushion, then costly debt, then a fuller cushion, then longer-term goals",
        "Whatever feels most urgent emotionally in the moment",
        "All goals pursued with equal amounts at the same time",
      ],
      correctIndex: 1,
    },
    {
      question:
        "This river's practice is to set one goal and log a first contribution. Why does it emphasize logging even a small first deposit, rather than waiting until you can contribute a \"meaningful\" amount?",
      options: [
        "Small amounts don't actually count toward the goal",
        "It's only a formality required to unlock the next river",
        "The habit of showing up honestly, even with a small number, is what the practice is actually building",
        "Logging isn't really necessary if you remember mentally",
      ],
      correctIndex: 2,
    },
  ],
  3: [
    {
      question:
        "A friend buries a windfall in an account earning almost no interest, too afraid to ever invest any of it. Based on the parable of the talents, how would this river describe that choice?",
      options: [
        "Wise and completely safe",
        "Not neutral, because letting money sit idle while losing ground is its own kind of failure, not safety",
        "The best possible option available",
        "Exactly what Scripture requires",
      ],
      correctIndex: 1,
    },
    {
      question:
        "Someone is drawn to an investment \"opportunity\" promising unusually high returns with little risk, and pressuring a quick decision. What does this river say to do?",
      options: [
        "Act quickly before the opportunity disappears",
        "Invest a small amount just to test it out",
        "Treat those exact features as warning signs and slow down",
        "Ask the promoter to apply even more pressure to confirm urgency",
      ],
      correctIndex: 2,
    },
    {
      question:
        "Before opening any investment account, this river suggests investing in something else first. What is it, and why does it \"pay the longest\"?",
      options: [
        "Real estate, because property always appreciates",
        "Cryptocurrency, because it's new and fast-growing",
        "Nothing, since self-investment isn't actually addressed",
        "Yourself, because your abilities are assets that can be developed or left idle, like any other resource",
      ],
      correctIndex: 3,
    },
    {
      question:
        "A new investor expects fast results and feels discouraged after a few months of little visible growth. What does this river's image of the farmer and the seed suggest instead?",
      options: [
        "Give up and try something else immediately",
        "Real growth often happens gradually, in a process no one fully controls or can rush",
        "Fast results are the only real sign of a good investment",
        "Patience is irrelevant to investing outcomes",
      ],
      correctIndex: 1,
    },
    {
      question:
        "One investor asks plain questions before committing money (what they're buying, how it earns money, what it costs); another just hands it over because a friend recommended it. What does this river say about that difference?",
      options: [
        "Enthusiasm is a fine substitute for understanding",
        "Understanding what you're committing to before committing separates prudent investing from mere hope",
        "Asking questions first is rude and unnecessary",
        "Only licensed professionals are allowed to ask questions",
      ],
      correctIndex: 1,
    },
    {
      question: "An investor puts their entire portfolio into the company that also employs them. What risk does this river's teaching on spreading risk highlight?",
      options: [
        "There is no real concern; concentration is always best",
        "A single disappointment there could be devastating, since nothing else is there to absorb it",
        "Diversification guarantees a profit either way",
        "Owning just one investment mainly simplifies taxes",
      ],
      correctIndex: 1,
    },
    {
      question: "Someone wants to grow their ability to earn, but considers paying for a course or mentor wasteful. What does this river say about investing in yourself?",
      options: [
        "It's one of the first and longest-paying investments, since it sharpens the ability that produces other income",
        "It's only worthwhile for people already wealthy",
        "Self-improvement always competes unfairly with other goals",
        "Mentors are optional and rarely make a real difference",
      ],
      correctIndex: 0,
    },
    {
      question:
        "An investor is deciding between a lower return earned honestly and a higher return that requires deceiving others. What should guide that decision, according to this river?",
      options: [
        "A profit is a profit, regardless of how it's earned",
        "Only the investor's own losses carry any moral weight",
        "It's fine as long as it's technically legal",
        "The source of a gain matters; honest gain is fundamentally different from dishonest gain, even at the same dollar amount",
      ],
      correctIndex: 3,
    },
    {
      question:
        "Someone is about to make a major investing decision entirely alone, without asking anyone else's opinion. What does this river's teaching on counsel suggest?",
      options: [
        "Counsel is unnecessary for personal financial decisions",
        "Proverbs repeatedly ties safety and sound plans to seeking counsel from others",
        "Asking for advice signals financial failure",
        "Only wealthy people truly need financial counsel",
      ],
      correctIndex: 1,
    },
    {
      question: "This river's practice asks you to log one investment contribution, even if small or just planned. What does it say about someone not investing anything yet?",
      options: [
        "They've failed at this river entirely",
        "They should borrow money to start investing immediately",
        "That may be the moment to honestly ask why, and what would need to be true to begin",
        "The tracker will reject an entry if nothing has been invested",
      ],
      correctIndex: 2,
    },
  ],
  4: [
    {
      question: "Someone hesitates to give generously because it \"feels like a subtraction\" from what's theirs. What premise does this river say should reframe that feeling?",
      options: [
        "Giving is indeed always a pure loss",
        "Everything already belongs to God; giving is returning a portion of what was never fully ours to begin with",
        "Giving is only meaningful if it financially hurts",
        "Money belongs entirely to whoever earned it",
      ],
      correctIndex: 1,
    },
    {
      question:
        "A person decides what to give only after all other spending is finished each month, and usually ends up giving nothing. What principle from this river addresses that pattern?",
      options: [
        "Giving should always come last, after every other expense",
        "Firstfruits: giving first, before spending the rest, protects it from being consumed by expanding expenses",
        "Giving monthly is unnecessary for most households",
        "It's fine, since nothing is technically owed to anyone",
      ],
      correctIndex: 1,
    },
    {
      question:
        "Two friends give the exact same amount, but one does it cheerfully and thoughtfully while the other gives reluctantly just to avoid guilt. How does this river weigh those two gifts?",
      options: [
        "Identically, since the dollar amount is what matters most",
        "The reluctant gift is more meaningful because it cost more emotionally",
        "Neither gift counts if there's any hesitation at all",
        "The heart and motive behind a gift matters more than its size or reluctant compliance",
      ],
      correctIndex: 3,
    },
    {
      question: "Someone wants to apply this river's teaching on caring for the poor but doesn't know where to start. What does this river suggest as a wise starting point?",
      options: [
        "Give exclusively to large national organizations",
        "Start with those closest to you, like family, neighbors, coworkers, and fellow church members",
        "Avoid giving directly to individuals altogether",
        "Wait until you're wealthy to begin giving to anyone",
      ],
      correctIndex: 1,
    },
    {
      question:
        "A struggling family is told that if they give more money, God is obligated to return even more to them financially. What's the problem with that teaching, per this river?",
      options: [
        "It's an accurate formula every Christian should follow",
        "It's only a problem for wealthy givers, not strugglng ones",
        "It turns giving into a transaction and can pressure people into giving what they can't afford",
        "Scripture never actually mentions sowing and reaping",
      ],
      correctIndex: 2,
    },
    {
      question: "Someone keeps a private record of what they give, then wonders if that contradicts Jesus's teaching about secret giving. What is the record actually for, per this river?",
      options: [
        "To eventually show others how generous they've been",
        "Private stewardship, meaning seeing whether giving matches intentions rather than earning public credit",
        "It's a requirement every Christian must publish",
        "Record-keeping and secret giving are simply incompatible",
      ],
      correctIndex: 1,
    },
    {
      question:
        "A wealthy person is told not to set their hope on their riches, while also being told their wealth isn't inherently evil. What balanced posture does this river describe?",
      options: [
        "Feel guilty for having any wealth at all",
        "Give away every possession immediately",
        "Avoid ever growing wealthier from this point forward",
        "Enjoy what's provided without anchoring hope in it, and stay ready to share, so wealth becomes a resource",
      ],
      correctIndex: 3,
    },
    {
      question: "Someone treats earning, saving, and investing as the whole picture of good stewardship, with no real plan to give. What can that pattern slowly turn a person into, per this river?",
      options: [
        "An ideal steward, since giving is optional extra credit",
        "Someone guarding a pile, rather than a channel",
        "Automatically wealthy, with no real downsides",
        "Exactly the model this course recommends",
      ],
      correctIndex: 1,
    },
    {
      question: "A household wants to decide what portion to give and where, rather than giving impulsively whenever asked. What does this river suggest as a practical first step?",
      options: [
        "A spontaneous decision made fresh each time a need arises",
        "No plan at all, since planning giving feels unspiritual",
        "A simple plan that decides in advance the portion, the recipients, and the timing",
        "A public pledge announced to the whole congregation",
      ],
      correctIndex: 2,
    },
    {
      question: "This river's practice is to log a gift you've given or are committing to give. Why does this river say giving comes last, as the fourth river, rather than first?",
      options: [
        "It's the least important of the four and easy to skip",
        "It has no real connection to the other three rivers",
        "It should actually come before saving and investing",
        "It completes the picture: the water that was gathered and put to work also needs to flow back out",
      ],
      correctIndex: 3,
    },
  ],
};
