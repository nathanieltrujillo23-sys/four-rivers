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
      "A successful entrepreneur starts telling people his own strength and cleverness built his business from nothing. Which warning, first given to a prosperous Israel, applies to him?",
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
      "Two coworkers earn the same paycheck. One thinks of his income as entirely his own, and the other sees himself as a steward of what's been entrusted to him. What attitude does the steward's view tend to produce?",
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
      "An employee figures her retail job isn't important enough for her full effort. How would Paul's instruction to the Colossians, to work heartily as for the Lord, change her approach?",
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
      "A man quits working, sure that provision will come no matter what he does. What did Paul say to people with that attitude in Thessalonica?",
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
      "Someone wants to pour all their effort and savings into one income source because it's the easiest to manage. What does Ecclesiastes' advice to divide a portion among seven, even eight, say to that?",
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
      "Someone figures a paycheck is the only kind of income worth talking about. Besides earned and business income, which two other families of income does the course name?",
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
      "A homeowner rents out a spare unit and wonders where that income fits in the course's categories. Which type is it?",
    options: [
      "Earned income",
      "Business income",
      "Asset income",
      "Creative income",
    ],
    correctIndex: 2,
  },
  {
    question:
      "A landlord calls his rental income 'completely passive' and stops answering maintenance requests, assuming it should take nothing from him. What does the course say about that assumption?",
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
      "Someone worries that mixing a trade with ministry cheapens the ministry. Which example from Paul's life pushes back on that?",
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
      "A woman wonders whether running a business fits with being a generous, faithful follower of God. Which business owner does the course point to as an example from Scripture?",
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
      "An opportunity pays well, but only if the person is willing to bend the truth to close the deal. What does the guardrails lesson call an income stream that costs you your honesty?",
    options: ["A bonus", "A leak", "A loophole", "A shortcut"],
    correctIndex: 1,
  },
  {
    question:
      "Someone picks an income goal by matching whatever a wealthier neighbor makes. According to the guardrails lesson, what should set the size of an income goal instead?",
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
      "A financial planner is explaining to a young couple why one paycheck is riskier than it feels. Going by the course's two-household comparison, what does having more than one stream actually change?",
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
      "Someone with a modest income assumes serious saving has to wait until they earn a lot more. What does Proverbs' ant show about what preparation really takes?",
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
      "A family living paycheck to paycheck treats saving as a luxury for people with more room. According to the course, who has the strongest reason to start, even in small amounts?",
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
      "A man asks Jesus to settle an inheritance dispute, and Jesus answers with the parable of the rich fool instead of a ruling. What does that tell you about what Jesus was after?",
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
      "A couple wants to furnish and decorate their new home before they have steady income or savings behind it. What might the proverb about preparing your work outside before building your house ask them to reconsider?",
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
      "Someone has a vague goal to 'save more this year' and never gets anywhere. Which four elements does the course say make a savings goal concrete?",
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
      "A newly married couple has no savings, some costly credit card debt, and a dream of buying a home. In what order does the course generally lay these out?",
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
      "Someone feels embarrassed that they can only save $20 a month. Which prophet's question, 'who has despised the day of small things?', speaks to that?",
    options: ["Jeremiah", "Malachi", "Haggai", "Zechariah"],
    correctIndex: 3,
  },
  {
    question:
      "Someone argues that one $500 deposit beats $20 every week. What can a small, regular deposit do that a big, occasional one often can't?",
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
      "During a hard season in his community, a man wonders whether living with integrity makes any difference to his family's provision. In the course's discussion of Psalm 37, what happens to the blameless in days of famine?",
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
      "A man could help his aging parent but doesn't, figuring his regular giving at church covers his obligations. What does Paul say about providing for your relatives?",
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
      "Someone with a small starter cushion in place wonders whether to stop saving altogether to pay off a credit card faster. What does the course's order suggest instead?",
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
      "Someone notices they tend to buy impulsively right after seeing a friend's new purchase. Which habit does the course suggest for that, and for growing contentment?",
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
      "Three employees get different-sized budgets to manage, depending on their experience, much like the servants in the parable of the talents. What decided how much each servant got?",
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
      "Someone is so afraid to invest that a windfall just sits there doing nothing, not even in the simplest safe option. In the parable of the talents, what was the least the third servant could have done instead of burying the money?",
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
      "Someone inherits a large sum and, excited to grow it fast, puts all of it into a rushed, unresearched opportunity. What does Proverbs say about wealth gained in a hurry?",
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
      "An investor compares two opportunities. One promises fast, guaranteed returns with no risk. The other is well understood and just takes years to pay off. Which of these does the course actually list as a warning sign?",
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
      "A craftsman wonders whether skilled, hands-on work like building or design counts as a spiritual gift. Who does the course point to as filled by God with skill for intricate craftsmanship?",
    options: ["Bezalel", "Aaron", "Joshua", "Caleb"],
    correctIndex: 0,
  },
  {
    question:
      "Someone has let a natural ability sit unused for years, assuming it'll still be there when they need it. What does Paul tell Timothy to do with the gift of God in him?",
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
      "A new investor wants to learn everything alone and skip mentors or any community of experienced people. What does 'iron sharpens iron' say she'd be missing?",
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
      "An investor checks his account every day and gets frustrated that nothing is visibly growing yet. What does Jesus's parable of the growing seed (first the blade, then the ear, then the full grain) say about that expectation?",
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
      "Someone wants to pull their money out after a few disappointing months because they can't wait any longer. What image does James use for the patience of a farmer waiting on a harvest?",
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
      "A young saver wonders why financial teachers keep pushing people to invest early, even small amounts. How does the course describe compounding, the idea behind that advice?",
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
      "An investor asks a salesperson direct questions about fees and risk, and the salesperson gets visibly irritated and dismissive. How does the course say to read that reaction?",
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
      "An investor wants every available dollar in one stock because it's the one they're most sure about. How does Ecclesiastes' advice to divide a portion among seven, even eight, speak to that plan?",
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
      "An investor is offered a deal that's technically legal but depends on quietly misleading the other side about the real value. What does Proverbs' image of 'a false balance' say about that kind of gain?",
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
      "A successful investor has started to feel his wealth is entirely his own, to use as he pleases, with no one to answer to. How does the LORD's word through Haggai, 'the silver is mine, and the gold is mine,' speak to that?",
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
      "A wealthy donor wants public recognition for a big gift because he feels he earned the credit for his own generosity. What attitude does David's prayer, 'who am I, and who are my people, that we should be able to offer so willingly?', show instead?",
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
      "Someone takes pride in everything they've built up, as if none of it came from outside their own effort. Which question did Paul put to the Corinthians that challenges that?",
    options: [
      '"What do you have that you did not receive?"',
      '"Why do you not give more than you have?"',
      '"Who told you that you were wealthy?"',
      '"What profit is there in all your labor?"',
    ],
    correctIndex: 0,
  },
  {
    question:
      "Someone is looking for a biblical example of giving back a portion of an increase before it was ever a formal command. After his military victory, who did Abraham give a tenth of everything to?",
    options: ["Lot", "Melchizedek", "Pharaoh", "Abimelech"],
    correctIndex: 1,
  },
  {
    question:
      "A farmer under the law of Moses wants to know exactly what the tithe was a tenth of, and who it belonged to. What was it, according to the course?",
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
      "Someone is careful to give exactly the right percentage down to the penny but treats the people around them unfairly and without mercy. Whom does Jesus's rebuke about tithing mint, dill, and cumin while skipping justice and mercy point at?",
    options: [
      "The tax collectors",
      "The Pharisees and scribes",
      "The Roman soldiers",
      "The Sadducees",
    ],
    correctIndex: 1,
  },
  {
    question:
      "A donor wants a photo and a public announcement every time he gives. What does Jesus's teaching to 'not let your left hand know what your right hand is doing' say about that?",
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
      "A landowner wants a biblical pattern for ongoing, practical provision for the poor around him, beyond occasional gifts. Which Old Testament provisions does the course point to?",
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
      "Someone gets discouraged that poverty never seems to go away, no matter how much is given, and wonders if giving is pointless. According to Deuteronomy 15:11, what follows from the fact that the poor will always be among us?",
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
      "A church member says 'I'll be praying for you' to a struggling family but offers no practical help, though they could. What point does James make with his question about saying 'go in peace, be warmed and filled' without giving what's needed?",
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
      "A wealthy investor is told it's fine to enjoy what he has, as long as his security doesn't rest on how big his portfolio is. Whose instruction to Timothy matches that balance?",
    options: ["Peter's", "Paul's", "James's", "John's"],
    correctIndex: 1,
  },
  {
    question:
      "Someone has strong habits of earning, saving, and investing but has never built a habit of giving. What does the course say that can slowly turn a person into?",
    options: [
      "An ideal steward, since giving is optional extra credit",
      "Someone guarding a pile rather than directing a channel",
      "Automatically wealthier, with no real downside",
      "Exactly the balanced model this course recommends",
    ],
    correctIndex: 1,
  },
];
