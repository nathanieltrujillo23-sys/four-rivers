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
 * Ten short comprehension questions per river, grounded directly in that
 * river's own lesson content (content/lessons/river{N}.ts) — nothing here
 * tests anything the lessons didn't actually say. Passing with at least
 * QUIZ_PASS_THRESHOLD is required to unlock the next river (see
 * `isRiverUnlocked` in state/progress.ts); river 4's quiz doesn't unlock
 * anything further but is included for consistency.
 */
export const QUIZZES: Record<RiverNumber, QuizQuestion[]> = {
  1: [
    {
      question: "According to this river, who does Scripture say ultimately gives the ability to produce wealth?",
      options: ["Your employer", "Your own cleverness", "God", "The economy"],
      correctIndex: 2,
    },
    {
      question: "In the Eden picture this course is built on, why did the one river divide into four?",
      options: [
        "Because the water was scarce",
        "Because a garden has many places that need watering",
        "Because of a flood",
        "So the streams could compete with each other",
      ],
      correctIndex: 1,
    },
    {
      question: "According to Genesis, when was work introduced?",
      options: [
        "After the fall, as a punishment",
        "Before the fall, as part of the original design",
        "Only for the poor",
        "It isn't mentioned in Genesis",
      ],
      correctIndex: 1,
    },
    {
      question: "What does this lesson say building multiple streams of income actually is?",
      options: [
        "An escape from labor",
        "A wiser arrangement of labor",
        "A guarantee of wealth",
        "Only something business owners can do",
      ],
      correctIndex: 1,
    },
    {
      question: "Why does this lesson say relying on a single stream of income is fragile?",
      options: [
        "It's illegal in most places",
        "It's a single point of failure",
        "It always pays too little",
        "It requires too much paperwork",
      ],
      correctIndex: 1,
    },
    {
      question: "Which of these is NOT one of the broad families of income streams described in this lesson?",
      options: ["Earned income", "Asset income", "Lottery winnings", "Creative or intellectual income"],
      correctIndex: 2,
    },
    {
      question: "What warning does this lesson give about chasing more income?",
      options: [
        "It's always wrong to want more income",
        "The danger is loving money and hurrying to get rich, not income itself",
        "You should only ever have one stream of income",
        "More streams always mean more stress",
      ],
      correctIndex: 1,
    },
    {
      question: "What does this lesson say about rest and the Sabbath?",
      options: [
        "Rest is a sign of laziness",
        "Rest is part of a sustainable pattern of work, not just what's left over",
        "Scripture doesn't address rest",
        "You should never take a day off while building income",
      ],
      correctIndex: 1,
    },
    {
      question: "What is the practice at the end of River 1?",
      options: ["Start a business", "Take an honest inventory of your current income streams", "Quit your job", "Invest in the stock market"],
      correctIndex: 1,
    },
    {
      question: "Which biblical example does this lesson give of someone with more than one income stream running at once?",
      options: ["The Proverbs 31 woman, who farmed, planted, and traded", "Moses", "Daniel", "Noah"],
      correctIndex: 0,
    },
  ],
  2: [
    {
      question: "What does the \"reservoir\" picture represent in this lesson?",
      options: [
        "Spending everything right away",
        "Holding back some of what flows in during good seasons for use in hard ones",
        "A specific type of bank account",
        "Giving money away",
      ],
      correctIndex: 1,
    },
    {
      question: "Who is given as the biblical example of preparing during years of plenty for years of famine?",
      options: ["Daniel", "Joseph", "Abraham", "Moses"],
      correctIndex: 1,
    },
    {
      question: "According to the parable of the rich fool, what was actually wrong with the farmer who built bigger barns?",
      options: [
        "He stored grain at all",
        "His storage was entirely for himself, with no room for God or others",
        "He didn't save enough",
        "He gave too much away",
      ],
      correctIndex: 1,
    },
    {
      question: "What three questions does this lesson say a good savings goal should answer?",
      options: ["Who, what, where", "What is this for, how much do I need, by when", "How fast, how risky, how secret", "Why, when, forever"],
      correctIndex: 1,
    },
    {
      question: "What does \"little by little\" refer to in this lesson?",
      options: ["Giving away small amounts", "Gathering money gradually and consistently rather than through windfalls", "Reducing debt slowly", "A type of investment account"],
      correctIndex: 1,
    },
    {
      question: "What rhythm did Paul recommend to the church in Corinth for setting money aside?",
      options: ["Once a year, after taxes", "Whenever there happens to be extra left over", "On the first day of every week, in proportion to what they'd prospered", "Only during a crisis"],
      correctIndex: 2,
    },
    {
      question: "What does \"pay yourself first\" mean in this lesson?",
      options: ["Buy something nice before paying bills", "Move money to savings as soon as income arrives, rather than saving whatever's left at month's end", "Pay off debt before anything else", "Give to charity before saving"],
      correctIndex: 1,
    },
    {
      question: "What does this lesson compare debt to?",
      options: ["A reservoir", "A hole in the floor of the reservoir", "A second income stream", "A savings goal"],
      correctIndex: 1,
    },
    {
      question: "What did Paul say he had to learn, according to this lesson?",
      options: ["How to invest wisely", "Contentment in whatever state he was in", "How to tithe", "How to budget"],
      correctIndex: 1,
    },
    {
      question: "What is the practice at the end of River 2?",
      options: ["Log an investment contribution", "Set up one savings goal and log a first contribution toward it", "Take an income inventory", "Log a gift"],
      correctIndex: 1,
    },
  ],
  3: [
    {
      question: "In the parable of the talents, what was the master's complaint against the third servant?",
      options: ["He lost all the money", "He buried the money out of fear instead of putting it to work", "He gave the money away", "He spent it all"],
      correctIndex: 1,
    },
    {
      question: "According to the parable, what did the master actually praise in the first two servants?",
      options: ["The size of the return they made", "Their faithfulness in putting the money to work", "Their risk-taking", "Their caution"],
      correctIndex: 1,
    },
    {
      question: "What two \"ditches\" does this lesson warn investors to avoid?",
      options: ["Saving too much and giving too little", "Burying money out of fear and gambling out of pride", "Working too much and too little", "Borrowing and lending"],
      correctIndex: 1,
    },
    {
      question: "According to this lesson, what investment \"comes first and pays the longest\"?",
      options: ["Real estate", "Investing in yourself", "The stock market", "Bonds"],
      correctIndex: 1,
    },
    {
      question: "What image does this lesson use to describe the importance of time and patience in investing?",
      options: ["A farmer waiting for the harvest", "A soldier in battle", "A king on a throne", "A fisherman casting nets"],
      correctIndex: 0,
    },
    {
      question: "What does Jesus's teaching about \"counting the cost\" before building a tower apply to in this lesson?",
      options: ["Only construction projects", "Understanding what you're committing your money to before you invest", "Giving to the poor", "Choosing a career"],
      correctIndex: 1,
    },
    {
      question: "What is \"diversification,\" as described in this lesson?",
      options: ["Owning only one type of asset", "Owning a variety of things that don't all rise and fall together", "Giving to multiple charities", "Having multiple jobs"],
      correctIndex: 1,
    },
    {
      question: "According to this lesson, what makes a financial gain \"honest\"?",
      options: ["How large it is", "How quickly it was earned", "Whether it was earned without cheating, deceiving, or exploiting someone else", "Whether it's taxed"],
      correctIndex: 2,
    },
    {
      question: "What does this lesson say about seeking counsel before investing?",
      options: ["It's unnecessary if you've done your own research", "Proverbs repeatedly values the safety found in many advisers", "Only professionals need advice", "Counsel should be avoided to protect your privacy"],
      correctIndex: 1,
    },
    {
      question: "What is the practice at the end of River 3?",
      options: ["Set a savings goal", "Log one investment contribution you've made or plan to make", "Give a gift", "Take an income inventory"],
      correctIndex: 1,
    },
  ],
  4: [
    {
      question: "What premise does this lesson say giving starts from?",
      options: [
        "Giving is a subtraction that always leaves you with less",
        "Everything already belongs to God, so giving is returning a portion of what's already his",
        "Giving is only meaningful for the wealthy",
        "Giving is a tax on success",
      ],
      correctIndex: 1,
    },
    {
      question: "What is \"firstfruits\" giving?",
      options: ["Giving only after all expenses are paid", "Giving the first portion of income before spending the rest", "Giving only fruit and produce", "A one-time annual gift"],
      correctIndex: 1,
    },
    {
      question: "What does this lesson say about the question \"does a Christian have to tithe?\"",
      options: [
        "It gives a single required answer",
        "It presents it as a topic faithful Christians disagree on, without decreeing an answer",
        "It says tithing was abolished",
        "It says tithing has no modern relevance at all",
      ],
      correctIndex: 1,
    },
    {
      question: "In the story of the widow's offering, why did Jesus say she gave more than the wealthy givers?",
      options: [
        "Her coins were secretly worth more than they appeared",
        "She gave out of her poverty, all she had to live on, while they gave from abundance",
        "She gave anonymously",
        "She gave directly to the temple treasury",
      ],
      correctIndex: 1,
    },
    {
      question: "According to this lesson, what matters more than the size of a gift?",
      options: ["Who sees it", "The heart and motive behind it", "How it's spent", "The recipient's gratitude"],
      correctIndex: 1,
    },
    {
      question: "What caution does this lesson give about \"sowing and reaping\" verses related to giving?",
      options: [
        "They don't apply to money at all",
        "They're sometimes misused as a formula promising financial return for giving",
        "They only apply to farmers",
        "They mean you should never expect any blessing",
      ],
      correctIndex: 1,
    },
    {
      question: "Who does this lesson say should typically receive help first, when giving directly to those in need?",
      options: ["Strangers online", "Large national charities only", "Those closest to you: family, neighbors, coworkers, fellow church members", "Whoever asks loudest"],
      correctIndex: 2,
    },
    {
      question: "According to Jesus, as quoted in this lesson, what can't you serve at the same time?",
      options: ["Two jobs", "God and money", "Two churches", "Two families"],
      correctIndex: 1,
    },
    {
      question: "Why does this lesson say giving comes last of the four rivers?",
      options: [
        "It's the least important of the four",
        "It's optional once you've saved and invested",
        "It's what turns a person from someone guarding a pile into a channel",
        "It has no real connection to the other three",
      ],
      correctIndex: 2,
    },
    {
      question: "What is the practice at the end of River 4?",
      options: ["Open a savings goal", "Log a gift you've given recently or are committing to now", "Take an income inventory", "Log an investment contribution"],
      correctIndex: 1,
    },
  ],
};
