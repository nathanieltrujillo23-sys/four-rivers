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
        "Alex is sure his income comes entirely from his own hard work and talent. How does River 1 ask him to see it instead?",
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
        "A household runs entirely on one paycheck from one employer. What's the biggest risk River 1 wants them to be ready for?",
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
        "Priya wants a second income stream, but she's only chasing whatever sounds exciting. What should she be asking herself first?",
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
        "A friend keeps chasing new ways to earn because no amount ever feels like enough. In River 1's guardrails, where is the real problem?",
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
        "Two households earn the same amount. One lives on a single job, and the other has a main job, a side business, and a little interest income. What does the second household actually gain?",
      options: [
        "It changes how a sudden job loss lands, even though it doesn't prevent hard news",
        "It guarantees they will become wealthier over time",
        "It automatically reduces how much they owe in taxes",
        "It means they no longer need to budget carefully",
      ],
      correctIndex: 0,
    },
    {
      question:
        "River 1 gives a simple test for whether something counts as an income stream. Which question matches it?",
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
        "Someone calls their rental income 'completely passive' and expects it to need no attention at all. How does River 1 reshape that expectation?",
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
        "A new hourly retail employee feels her job matters less to God than 'real' ministry does. What would River 1 tell her about work?",
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
        "A household wants more income but dreads giving up every evening and weekend for years. What balance does River 1 point toward?",
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
        "Why does River 1 start its practice by having you list your income sources, even the small or forgotten ones?",
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
        "A household gets an unexpected bonus. Going by River 2's picture of a reservoir, what's the wisest first move?",
      options: [
        'Spend all of it right away since it\'s "extra"',
        "Set some aside now, since a reservoir only helps if it's filled during the good season",
        "Invest all of it immediately in a single stock",
        "Give all of it away without any thought",
      ],
      correctIndex: 1,
    },
    {
      question:
        "Someone says they can't start saving because they don't earn enough for it to matter. What's the lesson of the ant in River 2?",
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
        "After a great financial year, a family builds a much bigger house and plans nothing for giving or a cushion. In the parable River 2 uses, what went wrong?",
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
        "Your savings goals keep fizzling out. According to River 2, which four things make a goal concrete enough to follow through on?",
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
        "Someone is discouraged because they can only save $5 a week and figure it hardly counts. What does a small, regular amount actually do for them?",
      options: [
        "Nothing meaningful until it reaches a large total",
        "It builds the habit, keeps the goal visible, and survives changes in mood, which a one-time deposit can't do",
        "It's only useful as a tax deduction",
        "It should be avoided in favor of waiting for a bigger amount",
      ],
      correctIndex: 1,
    },
    {
      question:
        "A household wants to try 'pay yourself first.' What does that look like day to day?",
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
        "A person building savings also carries a high-interest credit card balance and can't decide where to focus. Why does River 2 say costly debt typically needs urgent attention?",
      options: [
        "It doesn't really matter which comes first",
        "Interest paid on costly debt often exceeds anything savings could earn, canceling out the benefit of saving",
        "Debt automatically disqualifies someone from saving at all",
        "Credit card companies require savings to come first",
      ],
      correctIndex: 1,
    },
    {
      question:
        "Someone keeps overspending on things they don't need because they're comparing themselves to other people. Which habit does River 2 suggest for building contentment?",
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
        "A couple can't decide what to tackle first: an emergency cushion, costly debt, or a long-term goal like a down payment. What order does River 2 generally lay out?",
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
        "River 2's practice is to set one goal and log a first deposit. Why does it push you to log even a tiny first amount instead of waiting until you can give a 'meaningful' one?",
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
        "A friend sits on a windfall in an account that earns almost nothing because investing scares him. How does River 3 describe that choice, using the parable of the talents?",
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
        "An 'opportunity' promises unusually high returns with almost no risk and pushes you to decide fast. What does River 3 say to do with that?",
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
        "River 3 says there's something to invest in before you ever open an account. What is it, and why does it 'pay the longest'?",
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
        "A new investor is discouraged because a few months have passed with almost no visible growth. What does River 3's picture of the farmer and the seed say to them?",
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
        "One investor asks plain questions before putting money in: what is this, how does it earn, and what does it cost. Another hands money over because a friend recommended it. What difference does River 3 draw between them?",
      options: [
        "Enthusiasm is a fine substitute for understanding",
        "Understanding what you're committing to before committing separates prudent investing from mere hope",
        "Asking questions first is rude and unnecessary",
        "Only licensed professionals are allowed to ask questions",
      ],
      correctIndex: 1,
    },
    {
      question:
        "An investor has put everything into the company that employs her. What risk does River 3's teaching on spreading risk point to?",
      options: [
        "There is no real concern; concentration is always best",
        "A single disappointment there could be devastating, since nothing else is there to absorb it",
        "Diversification guarantees a profit either way",
        "Owning just one investment mainly simplifies taxes",
      ],
      correctIndex: 1,
    },
    {
      question:
        "Someone wants to earn more but thinks a course or a mentor is a waste of money. What does River 3 say about investing in yourself?",
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
        "An investor can take a lower return earned honestly or a higher return that depends on deceiving people. What should drive the choice, according to River 3?",
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
        "Someone is about to make a big investing decision completely on their own and hasn't asked anyone's opinion. How does River 3's teaching on counsel apply?",
      options: [
        "Counsel is unnecessary for personal financial decisions",
        "Proverbs repeatedly ties safety and sound plans to seeking counsel from others",
        "Asking for advice signals financial failure",
        "Only wealthy people truly need financial counsel",
      ],
      correctIndex: 1,
    },
    {
      question:
        "River 3's practice has you log one investment contribution, even a small or planned one. What does it say to someone who isn't investing anything yet?",
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
      question:
        "Someone holds back on giving because it 'feels like a subtraction' from what's theirs. What does River 4 say should change how they see it?",
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
        "A person only decides what to give once everything else is paid for each month, and it usually comes to nothing. Which principle in River 4 speaks to that?",
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
        "Two friends give the same amount. One gives cheerfully and with thought, and the other gives reluctantly to avoid feeling guilty. How does River 4 weigh the two gifts?",
      options: [
        "Identically, since the dollar amount is what matters most",
        "The reluctant gift is more meaningful because it cost more emotionally",
        "Neither gift counts if there's any hesitation at all",
        "The heart and motive behind a gift matters more than its size or reluctant compliance",
      ],
      correctIndex: 3,
    },
    {
      question:
        "Someone wants to help the poor but has no idea where to begin. Where does River 4 suggest they start?",
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
        "A struggling family hears that if they give more, God is obligated to repay them with more money. What's wrong with that teaching, according to River 4?",
      options: [
        "It's an accurate formula every Christian should follow",
        "It's only a problem for wealthy givers, not strugglng ones",
        "It turns giving into a transaction and can pressure people into giving what they can't afford",
        "Scripture never actually mentions sowing and reaping",
      ],
      correctIndex: 2,
    },
    {
      question:
        "Someone keeps a private record of their giving and worries it conflicts with Jesus's teaching on giving in secret. What is the record for, in River 4's view?",
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
        "A wealthy person hears two things: don't set your hope on riches, and wealth isn't automatically evil. What posture does River 4 describe that holds both?",
      options: [
        "Feel guilty for having any wealth at all",
        "Give away every possession immediately",
        "Avoid ever growing wealthier from this point forward",
        "Enjoy what's provided without anchoring hope in it, and stay ready to share, so wealth becomes a resource",
      ],
      correctIndex: 3,
    },
    {
      question:
        "Someone treats earning, saving, and investing as the whole of good stewardship and has no plan to give. What can that slowly make them, in River 4's words?",
      options: [
        "An ideal steward, since giving is optional extra credit",
        "Someone guarding a pile, rather than a channel",
        "Automatically wealthy, with no real downsides",
        "Exactly the model this course recommends",
      ],
      correctIndex: 1,
    },
    {
      question:
        "A household wants to decide ahead of time what to give and where, instead of giving on impulse whenever someone asks. What first step does River 4 suggest?",
      options: [
        "A spontaneous decision made fresh each time a need arises",
        "No plan at all, since planning giving feels unspiritual",
        "A simple plan that decides in advance the portion, the recipients, and the timing",
        "A public pledge announced to the whole congregation",
      ],
      correctIndex: 2,
    },
    {
      question:
        "River 4's practice is to log a gift you've made or plan to make. Why does the course put giving fourth instead of first?",
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
