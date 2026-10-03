import type { QuizQuestion } from "./quizzes";

/** Score needed (out of 50) to pass the final exam and unlock the certificate. */
export const EXAM_PASS_THRESHOLD = 35;
export const EXAM_QUESTION_COUNT = 50;

/**
 * The 50-question final exam, covering all four rivers (roughly a dozen
 * questions each). Each question is practical and scenario-based. It asks
 * the learner to apply or reflect on a principle from the lesson content
 * rather than recall an isolated fact, and grounded in the same material as the
 * per-river quizzes, but drawing on different angles and specifics so the
 * exam tests the fuller sweep of the course.
 */
export const EXAM_QUESTIONS: QuizQuestion[] = [
  // River 1: Multiple Streams of Income (13)
  {
    question:
      "A successful entrepreneur starts telling people his own strength and cleverness built his business from nothing. What warning, given to a prosperous Israel about to enter the promised land, does this course say applies directly to him?",
    options: [
      "Israel was told to stop working entirely once prosperous",
      "Remember the LORD your God, for it is he who gives the power to get wealth",
      "Prosperity is proof God favors some people more than others",
      "Wealth should always be hidden from others",
    ],
    correctIndex: 1,
  },
  {
    question:
      "Of two coworkers earning identical paychecks, one views himself as the sole owner of his income while the other views himself as a steward managing what's been entrusted to him. According to this course, which posture does the steward's view tend to produce?",
    options: [
      "Entitlement and anxiety",
      "Indifference about how the money gets used",
      "Gratitude paired with a sense of responsibility",
      "A belief that giving becomes unnecessary",
    ],
    correctIndex: 2,
  },
  {
    question:
      "An employee feels her retail job isn't important enough to deserve her full effort. What does Paul's instruction to the Colossian servants to work heartily, as for the Lord suggest about her approach?",
    options: [
      "Give full, honest effort regardless of how significant the job looks",
      "Only give full effort to jobs that pay especially well",
      "Effort only really matters when a supervisor is watching",
      "Looking for different work is the only faithful option",
    ],
    correctIndex: 0,
  },
  {
    question:
      "A man stops working, confident that provision will simply arrive regardless of his effort. What correction did Paul give to a similar situation in the church at Thessalonica?",
    options: [
      "If anyone is not willing to work, let him not eat",
      "Ask the church to support you indefinitely",
      "Wait patiently until work finds you",
      "Only the poor are expected to work",
    ],
    correctIndex: 0,
  },
  {
    question:
      "Someone wants to put all their effort and savings into a single income source because it's simplest to manage. What does Ecclesiastes' advice to give a portion to seven, even to eight, suggest instead?",
    options: [
      "Simplicity should always override spreading effort",
      "Spread what you have, since you can't know what disaster may come",
      "Eight is the specific ideal number of income sources",
      "The advice applies only to inheritance, not income",
    ],
    correctIndex: 1,
  },
  {
    question:
      "Someone assumes a paycheck is the only legitimate kind of income worth discussing. Besides earned and business income, what other two families of income does this course name that she may be overlooking?",
    options: [
      "Government assistance and inheritance",
      "Asset income and creative or intellectual income",
      "Passive income and active income",
      "Taxable and non-taxable income",
    ],
    correctIndex: 1,
  },
  {
    question:
      "A homeowner rents out a spare unit and wonders what category that income falls under in this course's framework. What type of income is that?",
    options: ["Earned income", "Business income", "Asset income", "Creative income"],
    correctIndex: 2,
  },
  {
    question:
      "A landlord describes his rental income as \"completely passive\" and stops responding to tenant maintenance requests, assuming it should require nothing from him. What caution does this course raise about that assumption?",
    options: [
      "The assumption is correct; rental income needs no attention",
      "Almost no income is truly effortless. It's differently shaped work, not absent work",
      "He should sell the property since all income requires labor",
      "Passive income is a myth that doesn't exist in any form",
    ],
    correctIndex: 1,
  },
  {
    question:
      "Someone feels that combining a trade with ministry work somehow cheapens the ministry itself. What example from Paul's life challenges that feeling?",
    options: [
      "Paul refused to ever work a trade once he began ministering",
      "Paul worked as a tentmaker alongside Priscilla and Aquila while also ministering",
      "Paul only worked before becoming an apostle",
      "Trade work was reserved for those outside the church",
    ],
    correctIndex: 1,
  },
  {
    question:
      "A woman wonders whether running a business is compatible with also being a generous, faithful follower of God. Which business-owning woman does this course point to as a scriptural example?",
    options: [
      "Ruth, a gleaner in the fields",
      "Lydia, a seller of purple cloth",
      "The widow of Zarephath",
      "Rahab, an innkeeper",
    ],
    correctIndex: 1,
  },
  {
    question:
      "An opportunity would pay well, but only if the person is willing to shade the truth to close the deal. What does this course's guardrails lesson call an income stream that requires cutting corners with honesty?",
    options: ["A bonus", "A leak", "A loophole", "A shortcut"],
    correctIndex: 1,
  },
  {
    question:
      "Someone sets an income goal simply by matching whatever a wealthier neighbor earns. What does the guardrails lesson say should actually set the size of an income goal?",
    options: [
      "Your purpose for the income",
      "The highest number you can imagine",
      "What others around you are earning",
      "Whatever a bank will approve you for",
    ],
    correctIndex: 0,
  },
  {
    question:
      "A financial planner is explaining to a young couple why relying on a single paycheck is riskier than it feels day to day. Using this course's two-household comparison, what does diversifying income actually change?",
    options: [
      "Whether hard financial news can ever happen to them",
      "How a sudden loss of one income source lands on the household, not whether something hard can happen",
      "Their tax bracket for the year",
      "How much they're required to save each month",
    ],
    correctIndex: 1,
  },

  // River 2: Saving (12)
  {
    question:
      "Someone with a modest income assumes serious saving is only possible once they earn far more. What does the picture of the ant in Proverbs teach about what preparation actually requires?",
    options: [
      "A large income before it's worth starting",
      "The habit of preparing consistently, not great strength or a big income",
      "Ants are a poor model since they don't deal with money",
      "Waiting until an emergency forces the habit",
    ],
    correctIndex: 1,
  },
  {
    question:
      "A family living paycheck to paycheck assumes saving is a luxury meant for people with more breathing room. What does this course say about who actually has the most reason to start saving, even in small amounts?",
    options: [
      "Only households with plenty left over each month",
      "Households with little margin, since they have the most to lose from a surprise",
      "Only those nearing retirement age",
      "Business owners exclusively",
    ],
    correctIndex: 1,
  },
  {
    question:
      "A man asks Jesus to settle a dispute over an inheritance, and Jesus responds with the parable of the rich fool instead of ruling on the dispute. What does that response suggest about the deeper issue Jesus wanted to address?",
    options: [
      "Inheritance disputes should always go to religious leaders",
      "The man's focus on getting his share revealed a heart issue bigger than the legal question",
      "Jesus avoided financial questions on principle",
      "The parable had nothing to do with the man's actual request",
    ],
    correctIndex: 1,
  },
  {
    question:
      "A couple wants to furnish and decorate a new home in detail before they've secured stable income or savings to support it. What does the proverb about preparing your work outside before building your house suggest they reconsider?",
    options: [
      "Decorating should always come before anything else",
      "Foundational preparation should come before the finishing touches",
      "Houses are a poor use of money in any case",
      "Only farmers benefit from this kind of planning",
    ],
    correctIndex: 1,
  },
  {
    question:
      "Someone keeps a vague goal of \"save more this year\" and never makes real progress. What four elements does this course say turn a vague wish into a concrete savings goal?",
    options: [
      "Bank name, account type, interest rate, and fees",
      "Purpose, amount, deadline, and rhythm",
      "Risk level, liquidity, tax status, and term",
      "A promise, a prayer, a plan, and a partner",
    ],
    correctIndex: 1,
  },
  {
    question:
      "A newly married couple has no savings, some costly credit card debt, and a long-term dream of buying a home. In what order does this course suggest they generally tackle these?",
    options: [
      "The home down payment first, since it takes the longest to reach",
      "A small starter cushion, then the costly debt, then a fuller cushion, then longer-term goals",
      "All three pursued with equal amounts of money at once",
      "Whichever one feels most urgent that particular week",
    ],
    correctIndex: 1,
  },
  {
    question:
      "Someone feels embarrassed telling others they can currently only save $20 a month. Which prophet's question, \"who has despised the day of small things?\", speaks directly to that discouragement?",
    options: ["Jeremiah", "Malachi", "Haggai", "Zechariah"],
    correctIndex: 2,
  },
  {
    question:
      "Someone argues that a single $500 deposit made once is clearly more valuable than $20 deposited every week. What does this course say a small, regular deposit accomplishes that a large, occasional one often doesn't?",
    options: [
      "It automatically earns a higher interest rate",
      "It builds the habit, keeps the goal visible, and survives changes in mood",
      "It avoids all possible bank fees",
      "It qualifies for special tax treatment",
    ],
    correctIndex: 1,
  },
  {
    question:
      "During a season of financial strain in his community, a man wonders whether living with integrity has any real bearing on his family's provision. What does Psalm 37, as discussed in this course, say happens to the blameless in days of famine?",
    options: [
      "They are put to shame",
      "They have abundance",
      "They are forgotten by others",
      "They must borrow heavily to survive",
    ],
    correctIndex: 1,
  },
  {
    question:
      "A man has the means to help an aging parent but chooses not to, assuming his regular giving at church already covers his obligations. What does Paul's statement about providing for one's relatives say about that assumption?",
    options: [
      "Giving to church fully covers family responsibility",
      "Anyone who does not provide for his relatives has denied the faith",
      "Family provision is optional once children are grown",
      "Only parents are required to provide, never the reverse",
    ],
    correctIndex: 1,
  },
  {
    question:
      "Someone with a small starter cushion already built wonders whether to stop saving entirely in order to attack their credit card debt faster. What does this course's suggested order recommend instead?",
    options: [
      "Stop saving completely and devote everything to the debt",
      "Focus on paying down the costly debt while still saving something",
      "Ignore the debt until every long-term goal is met",
      "Take on more debt to consolidate the smaller balances",
    ],
    correctIndex: 1,
  },
  {
    question:
      "Someone notices they tend to buy things impulsively right after seeing what a friend just purchased. What practical habit does this course suggest to curb that pattern and grow contentment?",
    options: [
      "Avoid ever buying anything new again",
      "Compare the purchase with a few other friends first",
      "Give nonessential purchases a cooling-off period of a few days before buying",
      "Only buy items that are already on sale",
    ],
    correctIndex: 2,
  },

  // River 3: Investing (13)
  {
    question:
      "Three employees are given different-sized budgets to manage based on their experience, echoing the master in the parable of the talents. What determined how much each servant received in that parable?",
    options: [
      "Equal amounts regardless of ability",
      "Each servant's own ability",
      "A random lottery",
      "Seniority within the household",
    ],
    correctIndex: 1,
  },
  {
    question:
      "Someone is too afraid to invest at all, so they let a windfall sit completely idle rather than take even the simplest safe option. According to the parable of the talents, what minimal step could the third servant have taken instead of burying the money?",
    options: [
      "Given it all away immediately",
      "Deposited it with bankers to earn interest",
      "Spent it on the master's household",
      "Buried it somewhere even safer",
    ],
    correctIndex: 1,
  },
  {
    question:
      "Someone receives a large inheritance and immediately puts all of it into a rushed, unresearched opportunity because they're excited to grow it fast. What does Proverbs say, as discussed in this course, about wealth gained hastily?",
    options: [
      "It will not be blessed in the end",
      "It always doubles within a year",
      "It's automatically protected from loss",
      "It passes safely to the next generation",
    ],
    correctIndex: 0,
  },
  {
    question:
      "An investor is comparing two opportunities: one promises fast, guaranteed high returns with no risk; the other is a well-understood option that simply takes years to pay off. Which of these is actually a warning sign this course lists?",
    options: [
      "Promising high returns with little or no risk is a warning sign, but needing a long time horizon is not",
      "Needing a long time horizon is the clearest warning sign of fraud",
      "Both are equally serious warning signs",
      "Neither one is actually a meaningful warning sign",
    ],
    correctIndex: 0,
  },
  {
    question:
      "A craftsman wonders whether skilled, practical work like building or design really counts as a spiritual gift. Who does this course point to as someone filled by God with wisdom and skill for intricate craftsmanship?",
    options: ["Bezalel", "Aaron", "Joshua", "Caleb"],
    correctIndex: 0,
  },
  {
    question:
      "Someone has a natural ability they've let sit unused for years, assuming it will always be there when they finally need it. What does Paul's instruction to Timothy about the gift of God in him suggest instead?",
    options: [
      "Hide it until exactly the right moment",
      "Fan it into flame by actively tending and developing it",
      "Sell the ability for immediate profit",
      "Compare it against other people's gifts",
    ],
    correctIndex: 1,
  },
  {
    question:
      "A new investor considers learning entirely on her own, avoiding any mentor or community of more experienced people. What does \"iron sharpens iron,\" as used in this course, suggest she's missing out on?",
    options: [
      "Healthy competition",
      "The sharpening value of mentorship and counsel from others",
      "Physical discipline",
      "The benefit of public debate",
    ],
    correctIndex: 1,
  },
  {
    question:
      "An investor checks his account daily, frustrated that growth isn't visible yet after a short time. What does Jesus's parable of the growing seed (first the blade, then the ear, then the full grain) suggest about that expectation?",
    options: [
      "Checking daily will make growth happen faster",
      "Growth often happens gradually, through a process no one fully controls or can rush",
      "Seeds are literally the best investment option",
      "Farmers are naturally the best investors",
    ],
    correctIndex: 1,
  },
  {
    question:
      "Someone wants to pull their investment out after a few disappointing months, unwilling to wait any longer. What image does James use to describe the patience a farmer shows while waiting for a harvest?",
    options: [
      "A farmer waiting for a good market report",
      "A farmer waiting patiently for the early and the late rains",
      "A farmer waiting for a buyer to approach",
      "A farmer waiting for new equipment",
    ],
    correctIndex: 1,
  },
  {
    question:
      "A young saver wonders why financial teachers make such a big deal about starting to invest early, even with small amounts. How does this course describe compounding, the concept behind that advice?",
    options: [
      "A guaranteed, fixed return every year",
      "Growth that itself grows over time",
      "A type of insurance policy",
      "A specific tax strategy",
    ],
    correctIndex: 1,
  },
  {
    question:
      "An investor asks a salesperson plain, direct questions about fees and risk, and the salesperson becomes visibly irritated and dismissive. What does this course say that reaction is worth noting as?",
    options: [
      "Nothing, since irritation is normal and means nothing",
      "Information worth paying attention to, just like a vague or evasive answer",
      "A sign the investor was simply rude to ask",
      "Proof the opportunity must be especially exclusive",
    ],
    correctIndex: 1,
  },
  {
    question:
      "An investor wants to put every available dollar into a single stock because it's the one they feel most confident about. How does Ecclesiastes' counsel to divide a portion among seven, even eight, apply to that plan?",
    options: [
      "It confirms that concentrating fully in one option is wisest",
      "It supports spreading investments rather than concentrating everything in one place",
      "It applies only to charitable giving, not investing",
      "It recommends exactly eight investments, no more or fewer",
    ],
    correctIndex: 1,
  },
  {
    question:
      "An investor is offered a deal that would technically be legal but depends on quietly misleading another party about the real value involved. What does Proverbs' image of \"a false balance,\" as applied in this course, say about that kind of gain?",
    options: [
      "Any profit is acceptable regardless of method",
      "Honest gain matters; dishonest gain is fundamentally different even at the same dollar value",
      "Only outright theft is actually condemned",
      "Business dealings are exempt from this principle",
    ],
    correctIndex: 1,
  },

  // River 4: Giving (12)
  {
    question:
      "A successful investor starts to feel that the wealth he's built is entirely his own possession to do with exactly as he pleases, owing nothing to anyone. What does the LORD's statement through Malachi, \"the silver is mine, and the gold is mine,\" say to that feeling?",
    options: [
      "Wealth ultimately belongs to God; we hold and manage it, we don't fully own it",
      "Only silver and gold are God's concern, not other assets",
      "The verse is about the temple treasury only, not personal wealth",
      "Wealth earned through hard work escapes this claim",
    ],
    correctIndex: 0,
  },
  {
    question:
      "A wealthy donor wants public recognition for a large gift, feeling he's earned the credit for his own generosity. What attitude does David's prayer, \"who am I, and who are my people, that we should be able to offer so willingly?\" model instead?",
    options: [
      "Humility, recognizing even the ability to give generously as a gift",
      "Confidence that generosity should always be publicly rewarded",
      "Reluctance to give unless credit is guaranteed",
      "The belief that only kings should give large gifts",
    ],
    correctIndex: 0,
  },
  {
    question:
      "Someone takes personal pride in everything they've accumulated, as if none of it depended on anything outside their own effort. What question did Paul ask the Corinthians that directly challenges that mindset?",
    options: [
      "\"What do you have that you did not receive?\"",
      "\"Why do you not give more than you have?\"",
      "\"Who told you that you were wealthy?\"",
      "\"What profit is there in all your labor?\"",
    ],
    correctIndex: 0,
  },
  {
    question:
      "Someone wants a biblical example of giving a portion of an increase back to God before it was ever a formal command. After his military victory, who did Abraham give a tenth of everything to?",
    options: ["Lot", "Melchizedek", "Pharaoh", "Abimelech"],
    correctIndex: 1,
  },
  {
    question:
      "A farmer under the law of Moses wonders exactly what the tithe was a tenth of, and to whom it ultimately belonged. According to this course, what was it?",
    options: [
      "A tenth of livestock only, belonging to the priests personally",
      "A tenth of the produce of the land, belonging to the Lord",
      "A tenth of income, belonging to the king",
      "A tenth of time, belonging to the Sabbath",
    ],
    correctIndex: 1,
  },
  {
    question:
      "Someone is scrupulous about giving exactly the correct percentage down to the penny, while treating the people around them unfairly and without mercy. Whose example does Jesus's rebuke about tithing mint, dill, and cumin while neglecting justice and mercy warn against?",
    options: ["The tax collectors", "The Pharisees and scribes", "The Roman soldiers", "The Sadducees"],
    correctIndex: 1,
  },
  {
    question:
      "A donor insists on a photo and a public announcement every time he gives to a cause. What does Jesus's teaching to \"not let your left hand know what your right hand is doing\" suggest about that approach?",
    options: [
      "Giving should always be publicized to encourage others",
      "Giving is meant to be done without seeking public notice or show",
      "The teaching only applies to giving money, not time",
      "Public giving is always hypocritical and therefore forbidden",
    ],
    correctIndex: 1,
  },
  {
    question:
      "A landowner wants a biblical pattern for structuring practical, ongoing provision for the poor around him, not just occasional gifts. What Old Testament provisions does this course point to as examples?",
    options: [
      "Leaving the edges of fields unharvested, and periodically releasing debts",
      "A mandatory annual lottery distributing wealth",
      "Free housing funded entirely by the king's treasury",
      "A complete exemption from labor for the poor",
    ],
    correctIndex: 0,
  },
  {
    question:
      "Someone becomes discouraged that poverty never seems to fully go away no matter how much is given, and wonders if that makes giving pointless. What does Deuteronomy 15:11 say should follow from the fact that the poor will always be present?",
    options: [
      "Giving is futile, so effort should go elsewhere",
      "Open your hand wide to your brother, to the needy and the poor",
      "Only the government should address ongoing poverty",
      "Wait until poverty is fully solved before giving",
    ],
    correctIndex: 1,
  },
  {
    question:
      "A church member tells a struggling family \"I'll be praying for you\" but offers no practical help, despite having the means to do so. What point does James make with his question about saying \"go in peace, be warmed and filled\" without giving what's needed?",
    options: [
      "Kind words alone are always a sufficient response",
      "Sympathy without action doesn't actually help someone in need",
      "The poor should not be spoken to directly",
      "Clothing donations specifically are unnecessary",
    ],
    correctIndex: 1,
  },
  {
    question:
      "A wealthy investor is advised that enjoying the resources he has is fine, as long as his ultimate security doesn't rest in the size of his portfolio. Whose instruction to Timothy reflects that exact balance?",
    options: ["Peter's", "Paul's", "James's", "John's"],
    correctIndex: 1,
  },
  {
    question:
      "Someone has built strong habits in earning, saving, and investing but has never built any habit of giving. What does this course say that pattern can slowly turn a person into?",
    options: [
      "An ideal steward, since giving is optional extra credit",
      "Someone guarding a pile rather than directing a channel",
      "Automatically wealthier, with no real downside",
      "Exactly the balanced model this course recommends",
    ],
    correctIndex: 1,
  },
];
