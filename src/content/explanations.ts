import type { ModuleSection } from "../types";

/**
 * Why each quiz and exam answer is right, in a sentence or two, with the lesson to revisit and which of that lesson's
 * verses fits. The Spanish wording is in es/explanations.ts, in the same order. Which option is correct stays in the
 * quiz data, so an explanation can never disagree with the answer key.
 */
export interface Explanation {
  /** Why the correct answer is correct. */
  why: string;
  /** The lesson to read again: its section, its position in that section, and which of its verses to show. */
  section: ModuleSection;
  lesson: number;
  verse: number;
}

/** "introduction", a river number as text ("1" to "4"), or "exam". */
export type ExplanationSet = "introduction" | "1" | "2" | "3" | "4" | "exam";

export const EXPLANATIONS: Record<ExplanationSet, Explanation[]> = {
  introduction: [
    { section: "introduction", lesson: 0, verse: 1, why: "Stewardship starts from the fact that it was never all yours. A company car or your own paycheck, anything placed in your care still deserves careful management." },
    { section: "introduction", lesson: 0, verse: 2, why: "The course measures by faithfulness, not by how much you have. You can be faithful with a little, so comparing yourself to someone who earns more misses the point." },
    { section: "introduction", lesson: 1, verse: 0, why: "Abraham's story shows that provision can arrive in a real tight spot, which is not a reason to stop planning. Trust and doing your part go together." },
    { section: "introduction", lesson: 1, verse: 2, why: "Joseph stored grain in the good years before the famine came. A good year is a chance to set something aside for a leaner season." },
    { section: "introduction", lesson: 2, verse: 1, why: "The tabernacle gifts came from willing hearts, not pressure, until Moses had to say stop. Real generosity grows out of caring about what you give to." },
    { section: "introduction", lesson: 2, verse: 2, why: "Joshua's challenge is to decide, not to wait or let someone else decide for you. Putting God first while money makes most of your choices is a choice already being made." },
    { section: "introduction", lesson: 3, verse: 0, why: "Daniel refused the king's food when no one was watching. Convictions about money are meant to hold even when nobody would ever know." },
    { section: "introduction", lesson: 4, verse: 2, why: "A budget is a plan that tells your money where to go before the month spends it for you. That is why it works more like a map than a cage." },
    { section: "introduction", lesson: 5, verse: 1, why: "Growth builds on itself over time, so starting early gives it more time to work. Waiting until you have more gives that up." },
    { section: "introduction", lesson: 6, verse: 0, why: "The proverb is plain: the borrower is servant to the lender. Debt is not a sin, but it limits your freedom, and that is worth knowing before you borrow." },
  ],
  1: [
    { section: 1, lesson: 0, verse: 0, why: "Scripture says it is God who gives the power to get wealth. Income is a gift to receive and manage, not something produced entirely alone." },
    { section: 1, lesson: 2, verse: 0, why: "With one paycheck from one employer, one disruption such as a layoff or an illness can stop all the income at once. That is the fragility the lesson warns about." },
    { section: 1, lesson: 5, verse: 0, why: "Before chasing a new stream, ask what it will displace and what it will cost in rest and relationships. Excitement alone is not a reason to add it." },
    { section: 1, lesson: 4, verse: 1, why: "The guardrails put the problem in the love of money and the hurry to get rich, not in income itself. No amount feels like enough when that is the root." },
    { section: 1, lesson: 2, verse: 0, why: "Several streams do not prevent bad news, but they change how a sudden job loss lands. One household is left with nothing; the other still has something coming in." },
    { section: 1, lesson: 3, verse: 0, why: "The test for a stream is whether it could keep producing money for a while even if another source stopped. Highest pay or good feelings are not the test." },
    { section: 1, lesson: 3, verse: 0, why: "Almost no income is truly effortless. Rental income is better described as differently shaped work than as no work." },
    { section: 1, lesson: 1, verse: 1, why: "Ordinary, dignified work that serves others is part of the original design. Colossians says to do it heartily, as for the Lord, whatever the job." },
    { section: 1, lesson: 5, verse: 0, why: "The lesson points to building slowly and treating rest as part of a sustainable pattern, not a prize for finishing. Trading away every evening and weekend for years is not the goal." },
    { section: 1, lesson: 6, verse: 0, why: "Listing every source, even the small or forgotten ones, is the first act of faithfulness with what you have. You cannot manage well what you have not looked at." },
  ],
  2: [
    { section: 2, lesson: 0, verse: 0, why: "A reservoir only helps if it is filled in the good season. Setting some of the bonus aside now is what Joseph did before the lean years." },
    { section: 2, lesson: 0, verse: 1, why: "The ant has no ruler and no large income, yet it prepares. The lesson is the habit of preparing, not great strength." },
    { section: 2, lesson: 1, verse: 1, why: "The rich fool's storage was entirely about himself, with no room for God or others, and it gave only false security. Saving is wise; hoarding for yourself is not." },
    { section: 2, lesson: 2, verse: 0, why: "A goal becomes concrete with four things: a purpose, an amount, a deadline, and a rhythm. A vague wish to save more does not tell you what to do on Friday." },
    { section: 2, lesson: 3, verse: 0, why: "A small regular amount builds the habit, keeps the goal visible, and survives changes in mood, which a one-time deposit cannot do. Five dollars a week counts." },
    { section: 2, lesson: 3, verse: 0, why: "Paying yourself first means moving a set amount to savings as soon as income arrives, before anything else is spent. Saving what is left over rarely leaves anything." },
    { section: 2, lesson: 5, verse: 0, why: "The interest on costly debt often exceeds anything savings could earn, which cancels out the benefit of saving. That is why costly debt needs urgent attention." },
    { section: 2, lesson: 5, verse: 2, why: "A cooling-off period of a few days gives the urge to compare and buy time to fade. It builds contentment without swearing off buying forever." },
    { section: 2, lesson: 4, verse: 0, why: "The lesson's order is a small starter cushion, then costly debt, then a fuller cushion, then longer-term goals. The prudent person sees trouble coming and prepares in a sensible sequence." },
    { section: 2, lesson: 6, verse: 0, why: "Showing up honestly with a small number is the habit the practice is building. Setting something aside, as Paul told the Corinthians, starts with a first amount, not a perfect one." },
  ],
  3: [
    { section: 3, lesson: 0, verse: 1, why: "In the parable, burying the money was not safe or neutral; it was a failure. Letting a windfall sit idle while it loses ground is its own kind of failure." },
    { section: 3, lesson: 1, verse: 0, why: "Wealth gained in a hurry is a warning, and high returns with almost no risk, pushed fast, are the very signs to slow down on. Pressure to decide now is part of the pattern." },
    { section: 3, lesson: 2, verse: 2, why: "Your abilities are assets that can be developed or left idle, like any other resource. That is why investing in yourself comes first and pays the longest." },
    { section: 3, lesson: 3, verse: 1, why: "The farmer sows, then waits through the blade, the ear, and the full grain, in a process no one fully controls. Real growth is usually gradual and cannot be rushed." },
    { section: 3, lesson: 4, verse: 1, why: "The prudent investor asks plain questions first: what is this, how does it earn, and what does it cost. Handing money over because a friend recommended it is hope, not understanding." },
    { section: 3, lesson: 5, verse: 0, why: "With everything in one place, a single disappointment can be devastating because nothing else absorbs it. Spreading risk is what Ecclesiastes advises." },
    { section: 3, lesson: 2, verse: 4, why: "A course or a mentor sharpens the ability that produces other income, which is why it is one of the first and longest-paying investments. It is not only for the wealthy." },
    { section: 3, lesson: 6, verse: 0, why: "A false balance is an abomination, so the source of a gain matters. Honest gain is fundamentally different from dishonest gain, even at the same dollar amount." },
    { section: 3, lesson: 7, verse: 0, why: "Proverbs repeatedly ties safety and sound plans to seeking counsel. A big decision made completely alone skips one of Scripture's most repeated safeguards." },
    { section: 3, lesson: 8, verse: 0, why: "Not investing yet may be the moment to ask honestly why, and what would need to be true to begin. The practice is meant to start that conversation, not to grade you." },
  ],
  4: [
    { section: 4, lesson: 0, verse: 0, why: "Everything already belongs to God: the silver and the gold are His. Giving is returning a portion of what was never fully ours to begin with." },
    { section: 4, lesson: 1, verse: 0, why: "Firstfruits means giving first, before spending the rest. Giving what is left over usually comes to nothing, because expanding expenses consume it." },
    { section: 4, lesson: 3, verse: 0, why: "God loves a cheerful giver. The heart and motive behind a gift matter more than its size or a reluctant compliance." },
    { section: 4, lesson: 4, verse: 2, why: "The lesson starts with the people closest to you: family, neighbors, coworkers, and fellow church members. Needs near you are real, and James shows words alone do not meet them." },
    { section: 4, lesson: 5, verse: 0, why: "Sowing and reaping describes a principle of generosity, not a formula that obligates God to repay with money. Treating it as a transaction pressures people to give what they cannot afford." },
    { section: 4, lesson: 3, verse: 2, why: "A private record is for stewardship: seeing whether your giving matches your intentions. It is not for earning public credit, so it fits Jesus's teaching on giving in secret." },
    { section: 4, lesson: 6, verse: 0, why: "Paul's instruction holds both: do not set your hope on riches, and be ready to share. Wealth becomes a resource instead of a master." },
    { section: 4, lesson: 6, verse: 0, why: "Earning, saving, and investing without giving can slowly make someone a person guarding a pile rather than a channel. Giving keeps the water moving." },
    { section: 4, lesson: 7, verse: 1, why: "A simple plan decides ahead the portion, the recipients, and the timing. That replaces impulse with intention." },
    { section: 4, lesson: 7, verse: 0, why: "Giving comes fourth because it completes the picture: the water that was gathered and put to work also needs to flow back out. It connects to the other three, not apart from them." },
  ],
  exam: [
    { section: 1, lesson: 0, verse: 0, why: "The warning to a prosperous Israel was to remember the LORD, who gives the power to get wealth. Pride in your own cleverness forgets where the ability came from." },
    { section: 1, lesson: 0, verse: 1, why: "A steward holds what was entrusted to him, and that tends to produce gratitude paired with a sense of responsibility. Entitlement and anxiety grow from the \"it's all mine\" view." },
    { section: 1, lesson: 1, verse: 1, why: "Paul says to work heartily, as for the Lord and not for people. So full, honest effort belongs to every job, however small it looks." },
    { section: 1, lesson: 1, verse: 2, why: "Paul told the Thessalonians that if anyone is not willing to work, let him not eat. Provision is not a reason to stop working." },
    { section: 1, lesson: 2, verse: 0, why: "Ecclesiastes says to divide a portion among seven, even eight, because you do not know what disaster may come. It points toward spreading what you have rather than relying on one source." },
    { section: 1, lesson: 3, verse: 0, why: "Besides earned and business income, the course names asset income and creative or intellectual income. A paycheck is only one kind of stream." },
    { section: 1, lesson: 3, verse: 0, why: "Money from renting out a spare unit comes from something you own, so it is asset income. That is different from earning a wage or running a business." },
    { section: 1, lesson: 3, verse: 0, why: "Almost no income is truly effortless. Rental income is differently shaped work, not absent work, so maintenance requests still matter." },
    { section: 1, lesson: 3, verse: 2, why: "Paul worked as a tentmaker alongside Priscilla and Aquila while he ministered. Trade and ministry were not enemies." },
    { section: 1, lesson: 3, verse: 1, why: "Scripture points to Lydia, a seller of purple cloth, as a business owner who was also faithful and generous. Business and faith fit together." },
    { section: 1, lesson: 4, verse: 0, why: "The guardrails lesson calls an income stream that costs you your honesty a leak. It drains something worth more than the money it brings in." },
    { section: 1, lesson: 4, verse: 0, why: "The size of an income goal should come from your purpose for the income, not from what a neighbor makes or the highest number you can imagine." },
    { section: 1, lesson: 2, verse: 0, why: "More than one stream does not stop hard news from happening. It changes how a sudden loss of one source lands on the household." },
    { section: 2, lesson: 0, verse: 1, why: "The ant has no ruler and no big income, yet it prepares. Preparation takes the habit of preparing consistently, not great strength." },
    { section: 2, lesson: 0, verse: 2, why: "Households with little margin have the most to lose from a surprise, so they have the strongest reason to start, even in small amounts." },
    { section: 2, lesson: 1, verse: 0, why: "Jesus answered the man's request with the parable of the rich fool because his focus on getting his share revealed a heart issue bigger than the legal question." },
    { section: 2, lesson: 2, verse: 1, why: "The proverb says to prepare your work outside before building your house. Foundational preparation should come before the finishing touches." },
    { section: 2, lesson: 2, verse: 0, why: "A savings goal becomes concrete with a purpose, an amount, a deadline, and a rhythm. \"Save more this year\" has none of those." },
    { section: 2, lesson: 5, verse: 0, why: "The lesson's order is a small starter cushion, then costly debt, then a fuller cushion, then longer-term goals. It is a sequence, not everything at once." },
    { section: 2, lesson: 3, verse: 1, why: "Zechariah asked who has despised the day of small things. A small amount saved is not something to be embarrassed about." },
    { section: 2, lesson: 3, verse: 0, why: "A small, regular deposit builds the habit, keeps the goal visible, and survives changes in mood. A big, occasional deposit often cannot do those things." },
    { section: 2, lesson: 4, verse: 1, why: "Psalm 37 says the blameless have abundance in days of famine. Integrity is part of how provision is promised to hold." },
    { section: 2, lesson: 4, verse: 2, why: "Paul says anyone who does not provide for his relatives has denied the faith. Giving at church does not replace family responsibility." },
    { section: 2, lesson: 5, verse: 0, why: "With a small cushion in place, the order says to focus on the costly debt while still saving something. Stopping saving completely leaves you exposed." },
    { section: 2, lesson: 5, verse: 2, why: "A cooling-off period of a few days lets the urge to copy a friend's purchase fade. It builds contentment without swearing off buying." },
    { section: 3, lesson: 0, verse: 0, why: "In the parable of the talents, each servant received according to his own ability. It was not equal for all, a lottery, or based on seniority." },
    { section: 3, lesson: 0, verse: 1, why: "The master said the third servant should at least have put the money with the bankers to earn interest. Burying it was the one thing that earned nothing." },
    { section: 3, lesson: 1, verse: 0, why: "Proverbs says the one in a hurry to be rich will not go unpunished, and wealth gained quickly will not be blessed in the end. Haste is the warning." },
    { section: 3, lesson: 1, verse: 1, why: "High returns with little or no risk are a warning sign. A long time horizon is not a warning sign; it is simply how many good things pay off." },
    { section: 3, lesson: 2, verse: 0, why: "Bezalel was filled by God with skill for intricate craftsmanship. Hands-on work and design can be a spiritual gift." },
    { section: 3, lesson: 2, verse: 2, why: "Paul told Timothy to fan the gift of God into flame. Abilities left unused fade, so they are worth tending and developing." },
    { section: 3, lesson: 2, verse: 3, why: "Iron sharpens iron points to the value of mentorship and counsel from others. Learning everything alone gives that up." },
    { section: 3, lesson: 3, verse: 1, why: "Jesus's seed grows first the blade, then the ear, then the full grain. Growth is gradual, in a process no one fully controls, so checking daily will not speed it up." },
    { section: 3, lesson: 3, verse: 2, why: "James compares patience to a farmer waiting for the early and the late rains. The harvest comes in its time, not on demand." },
    { section: 3, lesson: 3, verse: 0, why: "Compounding is growth that itself grows over time. It is why starting early, even small, is worth so much." },
    { section: 3, lesson: 4, verse: 1, why: "The prudent give thought to their steps, and the simple believe anything. A salesperson's irritation at fair questions is information, just like a vague or evasive answer." },
    { section: 3, lesson: 5, verse: 0, why: "Dividing a portion among seven, even eight, supports spreading investments rather than concentrating everything in one place. You cannot know what disaster may come." },
    { section: 3, lesson: 6, verse: 0, why: "The false balance is an abomination to the LORD. A gain that depends on misleading the other side is dishonest gain, even if it is technically legal." },
    { section: 4, lesson: 0, verse: 0, why: "The LORD says the silver and the gold are His. Wealth ultimately belongs to God; we hold and manage it, we do not fully own it." },
    { section: 4, lesson: 0, verse: 1, why: "David's prayer shows humility: even the ability to give generously is a gift. It matches Paul's question, \"What do you have that you did not receive?\"" },
    { section: 4, lesson: 0, verse: 1, why: "Paul asked the Corinthians, \"What do you have that you did not receive?\" It undercuts the idea that everything came from your own effort." },
    { section: 4, lesson: 1, verse: 2, why: "After his victory, Abraham gave a tenth of everything to Melchizedek, long before the law of Moses. Giving back a portion of an increase came before it was a formal command." },
    { section: 4, lesson: 1, verse: 1, why: "Under the law of Moses the tithe was a tenth of the produce of the land, and it belonged to the Lord." },
    { section: 4, lesson: 2, verse: 1, why: "Jesus aimed his rebuke about tithing mint, dill, and cumin while skipping justice and mercy at the Pharisees and scribes. Getting the percentage exactly right is not the whole of obedience." },
    { section: 4, lesson: 3, verse: 2, why: "Do not let the left hand know what the right hand is doing: giving is meant to be done without seeking public notice or show." },
    { section: 4, lesson: 4, verse: 0, why: "The course points to leaving the edges of fields unharvested and periodically releasing debts, ongoing and practical ways to provide for the poor beyond occasional gifts." },
    { section: 4, lesson: 4, verse: 0, why: "Because the poor will always be among us, Deuteronomy says to open your hand wide to your brother, to the needy and the poor. The ongoing need is the reason to give, not an excuse." },
    { section: 4, lesson: 4, verse: 2, why: "James asks what good it is to say \"go in peace, be warmed and filled\" without giving what is needed. Sympathy without action does not actually help." },
    { section: 4, lesson: 6, verse: 0, why: "It was Paul who told Timothy to charge the rich not to set their hope on uncertain riches but on God, and to be ready to share. Enjoying what you have without anchoring hope in it is that balance." },
    { section: 4, lesson: 6, verse: 0, why: "Strong habits of earning, saving, and investing without giving can slowly make someone guard a pile rather than direct a channel. Giving keeps the water moving." },
  ],
};
