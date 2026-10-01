import type { QuizQuestion } from "./quizzes";

/** Score needed (out of 50) to pass the final exam and unlock the certificate. */
export const EXAM_PASS_THRESHOLD = 35;
export const EXAM_QUESTION_COUNT = 50;

/**
 * The 50-question final exam, covering all four rivers (roughly a dozen
 * questions each). Grounded directly in the lesson content, same as the
 * per-river quizzes, and deliberately drawing on different points from those
 * quizzes rather than repeating them, so the exam tests the fuller sweep of
 * the course rather than just the same ten facts per river again.
 */
export const EXAM_QUESTIONS: QuizQuestion[] = [
  // River 1 — Multiple Streams of Income (13)
  {
    question: "Who warned a prosperous Israel not to credit their own power for the wealth they had?",
    options: ["Moses", "David", "Solomon", "Nehemiah"],
    correctIndex: 0,
  },
  {
    question:
      "This course says seeing yourself as a steward, rather than the sole source, of your income tends to produce which posture?",
    options: ["Anxiety", "Pride", "Gratitude with responsibility", "Indifference"],
    correctIndex: 2,
  },
  {
    question: "Paul told servants in Colossae to work at everything heartily, as if working for whom?",
    options: ["Their employer", "The Lord", "Their family", "Themselves"],
    correctIndex: 1,
  },
  {
    question: "What did Paul tell the Thessalonians who had stopped working while waiting for the future?",
    options: [
      "To keep waiting patiently",
      "If anyone is not willing to work, let him not eat",
      "To ask the church for support",
      "To find an easier job",
    ],
    correctIndex: 1,
  },
  {
    question: "Which book advises giving a portion to seven, even to eight, because you don't know what disaster may come?",
    options: ["Proverbs", "Ecclesiastes", "Psalms", "James"],
    correctIndex: 1,
  },
  {
    question: "According to this course, what does the two-household illustration (one income source vs. three) actually show?",
    options: [
      "Diversifying prevents hard news from ever happening",
      "Diversifying changes how hard news lands, not whether it comes",
      "More income sources always mean more stress",
      "One strong income source is always better than several",
    ],
    correctIndex: 1,
  },
  {
    question: "Besides earned income and business income, what are the other two families of income streams this course names?",
    options: [
      "Government and inherited income",
      "Asset income and creative/intellectual income",
      "Passive and active income",
      "Taxable and non-taxable income",
    ],
    correctIndex: 1,
  },
  {
    question: "Which of these is given as an example of \"asset income\"?",
    options: ["A salary", "Rent from property", "Tips", "A freelance project fee"],
    correctIndex: 1,
  },
  {
    question: "What caution does this course give about calling asset or creative income \"passive\"?",
    options: [
      "It should never be called passive because it's illegal to do so",
      "Almost none of it is truly effortless; it's differently shaped work",
      "Passive income is always more profitable",
      "Only the wealthy can access passive income",
    ],
    correctIndex: 1,
  },
  {
    question: "Paul worked as a tentmaker alongside which couple?",
    options: ["Priscilla and Aquila", "Mary and Joseph", "Ananias and Sapphira", "Andronicus and Junia"],
    correctIndex: 0,
  },
  {
    question: "Lydia, mentioned in this course, is introduced in Scripture as a seller of what?",
    options: ["Grain", "Purple cloth", "Pottery", "Spices"],
    correctIndex: 1,
  },
  {
    question: "According to the guardrails lesson, if a stream of income requires cutting corners with honesty, what is it?",
    options: ["A bonus", "A leak", "A loophole", "An investment"],
    correctIndex: 1,
  },
  {
    question: "According to the guardrails lesson, what should set the size of your income goal?",
    options: ["Your purpose for it", "Your neighbor's income", "The maximum you can earn", "Social media trends"],
    correctIndex: 0,
  },

  // River 2 — Saving (12)
  {
    question: "What does the ant in Proverbs teach, according to this course?",
    options: [
      "Ants are naturally gifted planners",
      "Preparation doesn't require great strength or income, just the habit of it",
      "You should always save more than you spend",
      "Hard work guarantees wealth",
    ],
    correctIndex: 1,
  },
  {
    question: "According to this course, who has the strongest reason to begin saving, even in small amounts?",
    options: [
      "Those with the most money left over each month",
      "Those with little margin, who have the most to lose from a surprise",
      "Only people nearing retirement",
      "Business owners exclusively",
    ],
    correctIndex: 1,
  },
  {
    question: "What prompted Jesus to tell the parable of the rich fool?",
    options: [
      "A tax collector asking about Roman law",
      "A man in the crowd asking Jesus to settle an inheritance dispute",
      "A disciple asking about the end times",
      "A Pharisee testing him about the Sabbath",
    ],
    correctIndex: 1,
  },
  {
    question:
      "The proverb about preparing your work outside before building your house illustrates what principle?",
    options: [
      "Luxuries before necessities",
      "Preparation and foundation before the finish",
      "Houses are a poor investment",
      "Farming is more valuable than building",
    ],
    correctIndex: 1,
  },
  {
    question: "Which four elements does this course say a well-written savings goal should contain?",
    options: [
      "Purpose, amount, deadline, and rhythm",
      "Bank name, interest rate, fees, and term",
      "Risk level, liquidity, tax status, and term",
      "Name, age, income, and location",
    ],
    correctIndex: 0,
  },
  {
    question: "What order does this course suggest for sequencing savings goals?",
    options: [
      "Long-term goals first, then an emergency cushion",
      "A small starter cushion, then costly debt, then a full cushion, then longer goals",
      "All goals pursued equally and simultaneously",
      "Debt first, savings never",
    ],
    correctIndex: 1,
  },
  {
    question: "Which prophet asked, \"Who has despised the day of small things?\"",
    options: ["Haggai", "Zechariah", "Malachi", "Jeremiah"],
    correctIndex: 1,
  },
  {
    question: "According to this course, what can a small, regular deposit do that a large, occasional one often can't?",
    options: [
      "Earn a higher interest rate automatically",
      "Build the habit, keep the goal visible, and survive changes of mood",
      "Avoid all bank fees",
      "Qualify for special tax treatment",
    ],
    correctIndex: 1,
  },
  {
    question: "According to Psalm 37 as discussed in this course, what happens to the blameless in days of famine?",
    options: ["They are put to shame", "They have abundance", "They are forgotten", "They must borrow heavily"],
    correctIndex: 1,
  },
  {
    question: "Who wrote that anyone who does not provide for his relatives has denied the faith?",
    options: ["Paul", "Peter", "James", "John"],
    correctIndex: 0,
  },
  {
    question: "In this course's suggested debt plan, what comes right after building a small starter cushion?",
    options: [
      "Investing aggressively",
      "Paying down costly debt with focus while still saving something",
      "Taking on more debt for a home",
      "Stopping all saving until retirement",
    ],
    correctIndex: 1,
  },
  {
    question: "What practical technique does this course suggest for growing contentment and curbing overspending?",
    options: [
      "Never buying anything nonessential again",
      "A cooling-off period before nonessential purchases",
      "Deleting all shopping apps",
      "Only shopping once a year",
    ],
    correctIndex: 1,
  },

  // River 3 — Investing (13)
  {
    question: "In the parable of the talents, on what basis were the talents distributed to the three servants?",
    options: ["Equally to each", "According to each servant's ability", "By random lot", "By seniority"],
    correctIndex: 1,
  },
  {
    question:
      "According to the parable, what minimal step did the master say the third servant could have taken instead of burying the money?",
    options: [
      "Given it away",
      "Deposited it with bankers to earn interest",
      "Spent it on the master's household",
      "Hidden it somewhere safer",
    ],
    correctIndex: 1,
  },
  {
    question: "According to Proverbs as discussed in this course, what happens to an inheritance gotten hastily?",
    options: [
      "It will not be blessed in the end",
      "It always doubles within a year",
      "It is protected from loss",
      "It passes to the next generation automatically",
    ],
    correctIndex: 0,
  },
  {
    question: "Which of these is NOT listed in this course as a warning sign of a bad investment opportunity?",
    options: [
      "It promises high returns with little or no risk",
      "It pressures you to decide quickly",
      "It requires a long time horizon to see results",
      "It depends on recruiting other people",
    ],
    correctIndex: 2,
  },
  {
    question: "Who was given skill by God to build the tabernacle, filled with wisdom and knowledge in every kind of craft?",
    options: ["Bezalel", "Aaron", "Joshua", "Caleb"],
    correctIndex: 0,
  },
  {
    question: "Paul told Timothy to do what with the gift of God in him?",
    options: ["Hide it until the right moment", "Fan it into flame", "Sell it for a profit", "Compare it to others' gifts"],
    correctIndex: 1,
  },
  {
    question: "\"Iron sharpens iron\" is used in this course to describe the value of what?",
    options: ["Competition", "Mentorship", "Physical strength", "Debate"],
    correctIndex: 1,
  },
  {
    question: "What does Jesus's parable of the growing seed (first the blade, then the ear, then the full grain) illustrate about investing?",
    options: [
      "Investing is risk-free if you're patient",
      "Growth happens gradually, in a process no one fully controls",
      "Seeds are a wise literal investment",
      "Farmers make the best investors",
    ],
    correctIndex: 1,
  },
  {
    question: "James compares patient investors to a farmer waiting for what?",
    options: ["A good market report", "The early and the late rains", "A buyer for his land", "A new plow"],
    correctIndex: 1,
  },
  {
    question: "This course describes compounding as what?",
    options: ["A guaranteed return", "Growth that itself grows", "A type of insurance", "A tax strategy"],
    correctIndex: 1,
  },
  {
    question: "According to this course, what should you take as useful information if a professional becomes irritated by your direct questions about an investment?",
    options: [
      "That they are simply busy",
      "Information worth noting, same as a vague answer",
      "Nothing — irritation is normal and meaningless",
      "That you should apologize for asking",
    ],
    correctIndex: 1,
  },
  {
    question: "Ecclesiastes' advice to divide your portion among seven, or even eight, is applied in this course to which principle?",
    options: ["Tithing", "Diversification/spreading risk", "Budgeting", "Debt repayment"],
    correctIndex: 1,
  },
  {
    question: "Proverbs' image of \"a false balance\" in this course's investing lesson is about what?",
    options: ["Diversification", "Honest gain in business dealings", "Patience", "Seeking counsel"],
    correctIndex: 1,
  },

  // River 4 — Giving (12)
  {
    question: "\"The silver is mine, and the gold is mine, saith the LORD of hosts\" is spoken through which prophet?",
    options: ["Haggai", "Malachi", "Zechariah", "Joel"],
    correctIndex: 0,
  },
  {
    question: "Who prayed, \"Who am I, and who are my people, that we should be able to offer so willingly?\"",
    options: ["Solomon", "David", "Moses", "Nehemiah"],
    correctIndex: 1,
  },
  {
    question: "Who asked the Corinthians, \"What do you have that you did not receive?\"",
    options: ["Peter", "James", "Paul", "John"],
    correctIndex: 2,
  },
  {
    question: "After a military victory, Abraham gave a tenth of everything to whom?",
    options: ["Melchizedek", "Lot", "Pharaoh", "Abimelech"],
    correctIndex: 0,
  },
  {
    question: "Under the law of Moses, the tithe was a tenth of what, belonging to whom?",
    options: [
      "A tenth of livestock only, belonging to the priests",
      "A tenth of the produce of the land, belonging to the Lord",
      "A tenth of income, belonging to the king",
      "A tenth of time, belonging to the Sabbath",
    ],
    correctIndex: 1,
  },
  {
    question: "Jesus said the scribes and Pharisees tithed mint, dill, and cumin but neglected what?",
    options: [
      "Their families",
      "The weightier matters: justice, mercy, and faithfulness",
      "The temple tax",
      "Their own businesses",
    ],
    correctIndex: 1,
  },
  {
    question: "\"Do not let your left hand know what your right hand is doing\" is Jesus's teaching about what?",
    options: ["Tithing exactly ten percent", "Giving in secret rather than for show", "Ambidextrous work", "Fasting"],
    correctIndex: 1,
  },
  {
    question: "Which Old Testament provisions for the poor does this course mention?",
    options: [
      "Leaving the edges of fields unharvested, and the release of debts",
      "A mandatory annual lottery for the poor",
      "Free housing provided by the king",
      "Exemption from all labor",
    ],
    correctIndex: 0,
  },
  {
    question: "Deuteronomy 15:11 says there will never cease to be poor in the land, therefore you shall do what?",
    options: [
      "Avoid the poor to protect your own resources",
      "Open your hand wide to your brother, to the needy and the poor",
      "Report poverty to the authorities",
      "Wait for the poor to ask three times",
    ],
    correctIndex: 1,
  },
  {
    question: "James's question about saying \"go in peace, be warmed and filled\" without giving needed things makes what point?",
    options: [
      "Kind words are always sufficient",
      "Sympathy alone, without action, doesn't actually help anyone",
      "The poor should not be spoken to directly",
      "Clothing donations are unnecessary",
    ],
    correctIndex: 1,
  },
  {
    question: "Paul told Timothy to instruct the wealthy not to set their hopes on what?",
    options: ["Their families", "The uncertainty of riches", "Their good works", "Their own wisdom"],
    correctIndex: 1,
  },
  {
    question: "According to this course, a person who earns, saves, and invests without ever giving can slowly become someone who is guarding what?",
    options: ["A legacy", "A pile", "A business", "A reputation"],
    correctIndex: 1,
  },
];
