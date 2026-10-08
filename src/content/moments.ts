import type { FeatureIconName } from "../components/ui/FeatureIcons";

/**
 * "Money moments": short, principle-based reads for real life events (a first paycheck, a car, student loans, a wedding,
 * a job offer). They carry only verses from the course's own library, so every quotation is verbatim and has its Spanish
 * twin. They explain ideas to think about; they never give personal financial advice. Spanish text: es/moments.ts.
 */
export interface MomentText {
  title: string;
  hook: string;
  sections: { heading: string; body: string[] }[];
  /** Three small things to try. */
  steps: string[];
  /** Four questions to ask yourself. */
  ask: string[];
  /** The label of the link to the related lesson or tool. */
  relatedLabel: string;
}

export interface Moment {
  id: string;
  icon: FeatureIconName;
  /** Where the "related" link goes. */
  relatedTo: string;
  /** Verses from the course's library, by reference and translation. */
  verses: { reference: string; translation: string }[];
  en: MomentText;
}

export const MOMENTS: Moment[] = [
  {
    id: "first-paycheck",
    icon: "chart",
    relatedTo: "/dashboard",
    verses: [{ reference: "Proverbs 3:9-10", translation: "NIV" }, { reference: "Luke 16:10", translation: "ESV" }, { reference: "Proverbs 21:5", translation: "ESV" }, { reference: "Proverbs 13:11", translation: "NIV" }],
    en: {
      title: "Your first paycheck",
      hook: "The first real paycheck sets habits that tend to stay. A few decisions made before you spend a dollar can shape the next ten years.",
      sections: [
        {
          heading: "Look at it before you spend it",
          body: [
            "Most first paychecks arrive smaller than people expect, because taxes and deductions come out first. Start with the number that actually lands in your account, not the one on the offer letter.",
            "Then give every dollar a job before the month begins. A plan that tells your money where to go is not a cage; it is how you make sure the first and best of it goes somewhere on purpose.",
          ],
        },
        {
          heading: "Put the first portion first",
          body: [
            "Scripture's picture of honoring God with the firstfruits is giving before spending on everything else. Many people find that deciding a percentage for giving and for saving on payday, before anything else is touched, is what makes both actually happen.",
            "Starting small is fine. What matters is that the habit is set while your expenses are still small, because they tend to grow to fill whatever you earn.",
          ],
        },
        {
          heading: "Little by little",
          body: [
            "A new income is also a new chance to be faithful in small things. A modest amount set aside each pay period will outgrow a big deposit made once in a while, mostly because it keeps showing up.",
            "If you carry student or credit card debt, include it in the plan from the first month, not as an afterthought.",
          ],
        },
        {
          heading: "A common trap",
          body: [
            "The most common trap with a first paycheck is quietly raising your lifestyle to match it. A better place to live, a nicer phone, more meals out: each choice is small, but together they can use up the whole paycheck before any of it reaches saving or giving.",
            "One approach is to decide now what share of every future raise goes to your plan first, before new habits form around the higher number. It is much easier to start generous than to become generous later.",
          ],
        },
        {
          heading: "When the paycheck is not enough",
          body: [
            "If the paycheck is smaller than the bills, that is not a failure; it is information. List what is fixed, what is flexible, and find the one or two changes that would matter most.",
            "For some people the answer is a second stream of income for a season, which is what River 1 explores. Either way, the diligence Scripture praises includes asking for help, so talk it through with someone you trust.",
          ],
        },
        {
          heading: "A short story",
          body: [
            "Daniel decided before his first payday that five percent would go to giving and ten to savings, the same day the money arrived. It felt small, and for a few weeks it was easy to forget it was happening.",
            "In the fourth month his car needed a repair he had not expected. Because the savings had been building quietly, the repair was an annoyance and not a crisis. He told a friend afterward that the plan had not made him rich; it had made the surprise smaller.",
          ],
        },
      ],
      steps: [
        "Write down your take-home pay and the date of each deposit.",
        "Decide, before payday, what percentage goes to giving, to saving, and to what you owe.",
        "Set the saving up to move automatically the day money arrives.",
      ],
      ask: [
        "What do I actually take home each month, after everything comes out?",
        "What will I decide, ahead of time, about giving and saving?",
        "Which regular expense could quietly grow if I do not watch it?",
        "Who could I show my plan to, so that it stays honest?",
      ],
      relatedLabel: "Open your dashboard and its budget calculator",
    },
  },
  {
    id: "buying-a-car",
    icon: "compass",
    relatedTo: "/course/introduction/module/7",
    verses: [{ reference: "Luke 14:28", translation: "NIV" }, { reference: "Proverbs 22:7", translation: "KJV" }, { reference: "Proverbs 14:15", translation: "KJV" }, { reference: "Proverbs 21:20", translation: "NIV" }],
    en: {
      title: "Buying a car",
      hook: "A car is one of the biggest purchases many young adults make, and one of the easiest to get wrong. Counting the whole cost first changes the question.",
      sections: [
        {
          heading: "Count the whole cost",
          body: [
            "Jesus's picture of the builder who sits down to estimate the cost before building fits a car purchase well. The sticker price is only the start: insurance, fuel, maintenance, registration, and parking are all part of what the car will take from your budget every month.",
            "A useful habit is to add those costs to the payment and ask what share of your take-home pay the total would be. Many people find that number is higher than the payment alone made it feel.",
          ],
        },
        {
          heading: "Notice who the loan makes you serve",
          body: [
            "Proverbs says the borrower is servant to the lender. A car loan is not wrong, but a long loan on a car that loses value quickly can leave you owing more than it is worth, which narrows your choices for years.",
            "Shorter terms and larger down payments, saved ahead of time, tend to keep that servant relationship lighter.",
          ],
        },
        {
          heading: "Slow down the decision",
          body: [
            "The prudent person thinks about where they are going, while the simple believe anything. A salesperson's pressure to decide today is information about the sale, not about you.",
            "Waiting a few days, comparing a few options, and asking someone you trust to read the numbers with you are all ordinary ways to practice that prudence.",
          ],
        },
        {
          heading: "New, used, or neither",
          body: [
            "There is no single right answer. A reliable used car often costs far less to own, because the steepest drop in value happens in the first years. At the same time, a very cheap car that keeps breaking can cost more than it saves.",
            "The question worth asking is which choice lets you keep every other commitment, including saving and giving, without strain. Sometimes the wisest car is the one you already have, kept running a little longer.",
          ],
        },
        {
          heading: "Keep the car in its place",
          body: [
            "A car is a tool for getting to work, to family, and to church. It is easy for it to become a statement about who you are. Paul wrote that he had learned to be content in whatever state he was in.",
            "Contentment does not mean you never replace a car. It means that you replace it because of a decision you made on purpose, not because of what someone else is driving.",
          ],
        },
        {
          heading: "A short story",
          body: [
            "Priya found two cars she liked. One had a lower sticker price but a long loan and expensive insurance; the other was a few years older, with a shorter loan and cheaper upkeep.",
            "When she added every monthly cost and compared it with her take-home pay, the first car would have used a third of it. She took the second, kept saving, and gave without strain. A year later she said the car was not the surprise; what surprised her was how calm the extra room in her budget felt.",
          ],
        },
      ],
      steps: [
        "List the full monthly cost: payment, insurance, fuel, upkeep.",
        "Decide in advance a ceiling you will not go above, and write it down.",
        "Sleep on it for at least two days before signing anything.",
      ],
      ask: [
        "What is the full monthly cost of owning this car, not just the payment?",
        "How long will I be paying, and what will it be worth by then?",
        "What would I have to give up each month to afford it?",
        "Who could look at these numbers with me before I sign?",
      ],
      relatedLabel: "Read: Credit and debt in Scripture",
    },
  },
  {
    id: "student-loans",
    icon: "book",
    relatedTo: "/course/river/2/module/6",
    verses: [{ reference: "Proverbs 22:7", translation: "KJV" }, { reference: "Psalm 37:21", translation: "KJV" }, { reference: "Romans 13:8", translation: "KJV" }, { reference: "Proverbs 21:5", translation: "ESV" }],
    en: {
      title: "Student loans",
      hook: "Student loans often feel like a weight you carry quietly. Seeing the whole picture on paper is the first step toward carrying it wisely.",
      sections: [
        {
          heading: "Know exactly what you owe",
          body: [
            "Scripture speaks plainly about borrowing: the borrower is servant to the lender, and the righteous is the one who pays back. Neither verse says debt is a sin; both say it should be taken seriously.",
            "Start by listing each loan, its balance, its interest rate, and its minimum payment. Many people avoid this because it is uncomfortable, but a number you can see is much easier to plan around than a number you are afraid of.",
          ],
        },
        {
          heading: "Make a plan, not a wish",
          body: [
            "The plans of the diligent lead to abundance, and haste leads to want. A written plan for paying loans down, even a slow one, beats good intentions.",
            "Some people pay the smallest balance first for the momentum, and others pay the highest interest first to save the most. Either can work; what matters is choosing one and following it.",
          ],
        },
        {
          heading: "Keep the rest of life moving",
          body: [
            "Paying down debt does not mean pausing everything else. Most people do best keeping a small cushion for emergencies, continuing to give, and saving something, so that one surprise does not push them into more borrowing.",
            "If a payment is genuinely out of reach, talking to the lender early is almost always better than going silent.",
          ],
        },
        {
          heading: "If you are behind",
          body: [
            "Falling behind on a loan is stressful, and it is also common. Silence tends to make it worse, because balances and fees keep growing while you avoid looking.",
            "Many lenders and servicers have options for hard seasons, and they are far more available to people who reach out early. Writing down what you can pay, and asking what choices exist, is a faithful step even when it feels small.",
          ],
        },
        {
          heading: "Debt and giving together",
          body: [
            "Some people wonder whether they should keep giving while they owe money. Scripture's pattern of honoring God with the first portion does not say to wait until every debt is gone.",
            "Many people find that a smaller, steady gift keeps the habit and the heart alive while they pay down what they owe. This is a matter for conscience and counsel, so it is worth talking it through with a pastor or a mentor you trust.",
          ],
        },
        {
          heading: "A short story",
          body: [
            "Marcus avoided looking at his loans for almost a year. When he finally sat down and wrote out every balance, rate, and minimum payment, the total was big, but it was also, for the first time, a number he could plan around.",
            "He chose a payoff order, added a modest extra amount each month, and kept a small cushion and his giving going. Progress was slow for a while. He said the biggest change came the day he stopped dreading the mail, because he knew exactly where he stood.",
          ],
        },
      ],
      steps: [
        "List every loan with its balance, rate, and minimum payment.",
        "Choose a payoff order and the extra amount you can add each month.",
        "Keep a small cushion and your giving going while you pay it down.",
      ],
      ask: [
        "Do I know every loan, balance, rate, and minimum payment?",
        "Which payoff order will I actually stick with?",
        "What small cushion keeps one surprise from sending me back into borrowing?",
        "Who can I talk to if a payment is out of reach?",
      ],
      relatedLabel: "Read: Debt, contentment, and the enemy of saving",
    },
  },
  {
    id: "wedding-budget",
    icon: "heart",
    relatedTo: "/course/introduction/module/5",
    verses: [{ reference: "Luke 14:28", translation: "NIV" }, { reference: "Proverbs 24:27", translation: "ESV" }, { reference: "Ecclesiastes 4:6", translation: "NIV" }, { reference: "Philippians 4:11", translation: "KJV" }],
    en: {
      title: "A wedding budget",
      hook: "A wedding is one day; a marriage is everything after it. How a couple handles money for the first big event often sets a pattern for the rest.",
      sections: [
        {
          heading: "Talk about money before you plan the party",
          body: [
            "Many couples find that the first honest money conversation happens over the wedding budget, so it is worth having on purpose. Who is contributing, what each person owes, and what each hopes for are all easier to say before deposits are paid.",
            "Scripture's picture of counting the cost applies to joy as much as to anything: celebrate, but know the number first.",
          ],
        },
        {
          heading: "Build the foundation before the finishing touches",
          body: [
            "The proverb says to prepare your work outside and get everything ready in the field, and after that build your house. For a couple, that can mean making sure there is a small savings cushion and a plan for the first year before decorating the day.",
            "Starting married life with a large debt for one afternoon puts weight on the relationship that no photograph shows.",
          ],
        },
        {
          heading: "Choose what you will really remember",
          body: [
            "Better one handful with tranquility than two handfuls with toil. Most couples, looking back, remember the people and the promises more than the details.",
            "Pick the few things that matter most to you both, spend there on purpose, and let the rest be simpler. Contentment is a decision, not a budget line.",
          ],
        },
        {
          heading: "Family, guests, and expectations",
          body: [
            "A guest list is the fastest way for a wedding budget to grow, because every name has a cost. Families may also have hopes of their own, and it helps to hear them early and kindly rather than discover them in the middle of planning.",
            "Agreeing together on what you can say yes to, and what you will gently decline, protects both the budget and the relationships you are celebrating.",
          ],
        },
        {
          heading: "Plan for the day after",
          body: [
            "The wedding day ends, and the household begins. Moving costs, setting up a home, and the first months of two incomes becoming one all arrive quickly.",
            "A couple that sets aside something for the days after the wedding, even if the party is a little smaller, tends to begin married life with room to breathe.",
          ],
        },
        {
          heading: "A short story",
          body: [
            "Ana and Luis sat down before they booked anything and wrote what each of them hoped for. She cared most about the music and the food; he cared most about having both families gathered.",
            "They put most of the money there, kept the guest list shorter than their first draft, and set aside a cushion for their first months together. Years later they remembered the vows, the music, and the people who came. Neither could say what the flowers had cost.",
          ],
        },
      ],
      steps: [
        "Agree on a total, and who is contributing what, before booking anything.",
        "Name your top three priorities, and put most of the money there.",
        "Keep a savings cushion for the first months of marriage out of the wedding budget.",
      ],
      ask: [
        "What are the two or three things we most want from the day?",
        "What total can we both say yes to, and who is contributing what?",
        "What are we setting aside for the first months of marriage?",
        "What expectations from family should we talk about now, and kindly?",
      ],
      relatedLabel: "Read: Budgeting, telling your money where to go",
    },
  },
  {
    id: "job-offer",
    icon: "award",
    relatedTo: "/course/river/1/module/2",
    verses: [{ reference: "Colossians 3:23", translation: "NIV" }, { reference: "Proverbs 14:23", translation: "KJV" }, { reference: "Psalm 127:2", translation: "ESV" }, { reference: "Proverbs 15:22", translation: "ESV" }],
    en: {
      title: "A job offer",
      hook: "A job offer is more than a salary. It is a decision about how you will spend most of your waking hours, and it deserves more than a quick yes.",
      sections: [
        {
          heading: "Look past the number",
          body: [
            "Work is part of the original design, and Scripture says to do it heartily, as for the Lord. That makes the kind of work, the people, and the way you will be asked to do it part of the decision, not just the pay.",
            "Compare offers on the full package: salary, benefits, how much you will commute, how much room there is to learn, and what a normal week really looks like.",
          ],
        },
        {
          heading: "Count what it costs in rest and relationships",
          body: [
            "In all labor there is profit, but the same Scripture warns against rising early and staying up late in anxious toil. A higher-paying offer that takes every evening may cost more than it gives.",
            "Ask what the expected hours really are, and whether you can picture doing them for a few years without losing your health or your closest relationships.",
          ],
        },
        {
          heading: "Ask for counsel",
          body: [
            "Without counsel plans fail, but with many advisers they succeed. Someone who has worked in that field, or who knows you well, will often notice what you cannot.",
            "It is also reasonable to ask an employer questions and to take a little time to answer. A good employer expects it.",
          ],
        },
        {
          heading: "Asking about the offer",
          body: [
            "It is reasonable to ask questions about an offer, and sometimes to ask whether it can be improved. A respectful, well-prepared request shows the same diligence you would bring to the work.",
            "Decide beforehand what matters most to you, and what you would be happy to give up, so that you know what a good answer sounds like.",
          ],
        },
        {
          heading: "When to say no",
          body: [
            "An offer that would require you to bend the truth, to mislead customers, or to give up the things you have committed to is not a bargain at any salary. Better a little with righteousness than great revenues without right.",
            "Saying no can be hard, especially when money is tight. It helps to remember that being faithful with what you have now is part of how you are prepared for what comes next.",
          ],
        },
        {
          heading: "A short story",
          body: [
            "Sam had two offers. One paid noticeably more but expected late nights and weekend calls; the other paid less, with regular hours and a manager who seemed glad to teach.",
            "He wrote down what mattered beyond pay, asked two people he trusted to read both offers, and took a few days to decide. He chose the second. Two years later he was earning more than the first job had offered, and he said the learning had been worth more than the first salary difference.",
          ],
        },
      ],
      steps: [
        "Write down what matters beyond pay: people, growth, hours, purpose.",
        "Ask two people you trust to look at the offer with you.",
        "Ask for a few days to decide, and use them.",
      ],
      ask: [
        "What matters to me beyond the salary?",
        "What do the hours and the commute really cost in rest and relationships?",
        "Who has worked in this field and could tell me what they see?",
        "Could I say yes to this job and still keep my honesty and my commitments?",
      ],
      relatedLabel: "Read: Work is part of the design",
    },
  },
];
