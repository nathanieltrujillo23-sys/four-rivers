import type { Lesson, ScriptureRef } from "../../types";
import { VERSE } from "../scripture";

/**
 * The introduction: several short modules that come before River 1. It has
 * no tracker and isn't one of "the four rivers" — it doesn't participate in
 * the unlock/completion ledger at all, so it's structured like a river's
 * content (title, intro, a sequence of Lesson objects) without the fields
 * that only make sense for a river with a practice tracker
 * (practicePrompt/practiceScripture). Module-level "read" progress is
 * tracked the same client-side, localStorage-only way as every river's
 * module progress bar (see useModuleProgress) — visual only, never gating.
 */
export interface IntroductionContent {
  title: string;
  intro: string;
  introScripture: ScriptureRef[];
  lessons: Lesson[];
}

export const INTRODUCTION: IntroductionContent = {
  title: "Introduction: Stewardship",
  intro:
    "Before wading into income, saving, investing, and giving, it's worth spending a little time on the idea underneath all four: stewardship. This introduction looks at a handful of people in Scripture who modeled different pieces of it long before anyone called it personal finance, plus a few practical, everyday tools worth understanding early: budgeting, how money grows over time, and how debt and credit actually work. None of it is complicated, and none of it needs a tracker. It's simply the foundation the four rivers are built on.",
  introScripture: [VERSE.gen2_10_esv, VERSE.cor4_2_kjv],
  lessons: [
    {
      title: "What is stewardship?",
      body: [
        "Scripture opens with a claim that changes how everything afterward should be read. The earth and everything in it belongs to God, not to the people who occupy it, farm it, or eventually put a price on it. When God places the first humans in that world, he doesn't hand them a deed. He gives them a job: be fruitful, fill the earth, and have dominion over it. Dominion here isn't ownership. It's responsibility. The first assignment any person was ever given was to manage something that belonged to someone else.",
        "That distinction between manager and owner is the whole idea of stewardship in one sentence. An owner answers to no one and can do whatever they like with what's theirs. A steward manages someone else's property and gets judged on one thing: faithfulness. Not how much they started with, and not how impressive the results looked from the outside, but whether they could be trusted with what was placed in their hands. Paul states the standard plainly: what's required of stewards is that they be found faithful. That word, faithful, is the measuring stick this whole course keeps coming back to.",
        "This course is organized around a picture from Genesis: one river flowing out of a garden, dividing into four. In the modules ahead, that source splits into income, saving, investing, and giving, four different pieces of the same job of faithful management. Before any of them, this introduction looks briefly at people in Scripture who modeled pieces of that job long before anyone had a checking account, plus a few practical, unglamorous tools worth understanding early. None of it is complicated. All of it is worth getting right from the start.",
      ],
      scriptureRefs: [VERSE.gen1_28_esv, VERSE.ps24_1_kjv, VERSE.cor4_2_kjv],
    },
    {
      title: "Abraham and Joseph: trust and foresight",
      body: [
        "Abraham left everything familiar (his country, his extended family, his own history) because God told him to, trusting a promise he wouldn't live to see completed. Years later that same trust showed up in a harder moment, on a mountain, with his son beside him and no visible way out of an impossible situation. Abraham told him God himself would provide. He did, and Abraham named the place after it: the LORD will provide. Stewardship starts here, before any talk of budgets or percentages. It's a settled confidence that provision ultimately belongs to God, not to your own foresight or planning skill, even when the way forward is unclear.",
        "That trust showed up in Abraham's open hand too. Coming back from rescuing his nephew Lot in battle, he gave a tenth of everything he'd recovered to Melchizedek, a priest of God Most High, long before any command to tithe existed. Trust and generosity were the same posture in Abraham, just pointed in two directions.",
        "Joseph, generations later, modeled a different virtue: foresight. Given the unusual gift of interpreting Pharaoh's dream, seven years of abundance followed by seven years of famine, he didn't stop at prediction. He built a plan. Store a portion of every good year's harvest so the bad years wouldn't be a catastrophe. It worked. Egypt survived the famine, and eventually so did Joseph's own starving family. Nothing about that plan was clever. It was patient and unglamorous, and it required doing something today that only a future season would need.",
        "Two different scenes, one shape underneath them. Trust God enough to hold what you have with an open hand, and take the patient, ordinary steps today that a future season is going to require. Open-handed trust and practical foresight, together, are most of this course in miniature.",
      ],
      scriptureRefs: [VERSE.gen22_14_esv, VERSE.gen14_20_kjv, VERSE.gen41_35_kjv],
    },
    {
      title: "Moses and Joshua: courage with what's entrusted to you",
      body: [
        "Moses grew up with access to the wealth and standing of Pharaoh's own household, about as much financial security as the ancient world had to offer anyone. Hebrews later commends him for something almost nobody in his position would choose. He walked away from it: refused the title, chose to suffer alongside an enslaved people rather than enjoy Egypt's fleeting comforts, and considered the reproach that came with that choice worth more than all of Egypt's treasure. Whatever resources land in front of you, Moses' example asks a harder question than how much. It asks for what, and for whom.",
        "Decades later, leading the very people he'd chosen to suffer alongside, Moses ran into a problem most leaders would love to have: too much generosity. When Israel was asked to bring materials for building the tabernacle, they brought so much that the craftsmen came back and told him to make them stop. He had to issue a command restraining the giving. It's a strange, happy problem, and it says something worth remembering. A community that has genuinely caught the vision of what it's building rarely needs to be talked into generosity. The harder job, sometimes, is knowing when enough has been given.",
        "Joshua inherited leadership after Moses, and near the end of his own life gathered the people for one of Scripture's most quoted challenges. Choose, today, whom you will serve. As for me and my house, he said, we will serve the LORD. Stewardship isn't only about understanding the right principles. It's about actually deciding, out loud, and then living inside that decision every ordinary day afterward: the same discipline it takes to actually start saving, open the tracker, or pay yourself first instead of meaning to eventually, once things settle down.",
      ],
      scriptureRefs: [VERSE.heb11_24_esv, VERSE.exod36_5_esv, VERSE.josh24_15_kjv],
    },
    {
      title: "Daniel: integrity when no one is watching",
      body: [
        "Daniel was a teenager taken captive to Babylon, offered a place at the king's own table with the richest food and wine the empire had to give, and he quietly turned it down. He asked permission to eat something plainer instead, because accepting it would have compromised a conviction almost no one else in that palace shared or would have even noticed him keeping. Nobody was checking. The compromise would have been small, private, and easy to justify. He said no anyway.",
        "Decades later, older and more powerful than nearly anyone else in the kingdom, jealous officials combed through Daniel's entire record, administrative, financial, personal, looking for anything to use against him, and came up empty. Scripture's verdict is blunt: they could find no corruption in him, because he was trustworthy. That kind of reputation isn't built in a single crisis. It's the slow return on years of small, unglamorous integrity. The same young man who turned down the king's food is the same official who, decades later, couldn't be caught in anything.",
        "Most financial integrity is exactly this invisible. Nobody is auditing whether you told the whole truth about an expense, resisted a shortcut nobody would have caught, or kept a small promise when it would have been easy to let it slide. Daniel's example says those unwatched moments are exactly where a trustworthy life gets built, one ordinary decision at a time, long before anyone is checking.",
      ],
      scriptureRefs: [VERSE.dan1_8_niv, VERSE.dan6_4_niv],
    },
    {
      title: "Budgeting: telling your money where to go",
      body: [
        "A budget sounds restrictive to a lot of people, like a cage built to keep you from spending money you already have. It's really the opposite: a plan that tells your money where to go before the month spends it for you without asking. Jesus made a version of this argument to a crowd following him, using an image from construction. Suppose you want to build a tower. Wouldn't you sit down first and work out whether you can actually afford to finish it? Skip that step and you end up with a half-built tower and a crowd laughing at you. A budget is that sitting-down moment, repeated every month instead of once.",
        "Proverbs offers a related picture from farm life: know the condition of your flocks, pay close attention to your herds, because riches don't last forever. Someone who actually knows what they have, down to the details, manages it differently than someone who's just guessing. A budget is nothing more than knowing the condition of your flock in dollars: what's coming in, what's already spoken for, and what's left to decide about on purpose.",
        "The plans of the diligent lead to abundance, Proverbs says elsewhere, while hasty shortcuts lead nowhere good. A budget doesn't have to be complicated to work. Write down what comes in. Write down what has to go out. Decide on purpose where the rest goes, instead of finding out by accident near the end of the month. Do that consistently and most of what follows in this course, saving, investing, giving, gets easier, because you'll already know what you actually have to work with.",
      ],
      scriptureRefs: [VERSE.luke14_28_niv, VERSE.prov27_23_esv, VERSE.prov21_5_esv],
    },
    {
      title: "The time value of money",
      body: [
        "One of the most useful, least glamorous ideas in personal finance is this: money available now is worth more than the same amount later, because money put to work has time to grow. Ecclesiastes puts a version of this in a single memorable image. Cast your bread on the waters, and you'll find it again after many days. It describes an action that doesn't pay off right away and has to be trusted through a delay, which is exactly the shape of letting money grow instead of spending it the moment it arrives.",
        "The mechanism behind it is compounding, growth that itself grows. Proverbs describes the patient version of this plainly: money gathered little by little grows. The deeper math is that early, small, steady amounts often outgrow later, larger ones, simply because the early money had more time to compound. This course hands you an actual interactive tool for this later, in the investing river, but the principle is worth planting now. Starting today, even with very little, usually beats waiting for a better moment, because a better moment with less time left often can't make up the difference no matter how much more money eventually shows up.",
        "None of this is a formula for guaranteed riches, and nothing here promises a return. Markets and specific investments can and do lose value. It's simply math that works in your favor when you cooperate with time instead of ignoring it or racing against it.",
      ],
      scriptureRefs: [VERSE.eccl11_1_esv, VERSE.prov13_11_niv],
    },
    {
      title: "Credit, debt, and staying free",
      body: [
        "A credit score is a number that summarizes how reliably you've repaid what you've borrowed in the past, and it quietly follows you into some of the largest financial moments of adult life: renting an apartment, financing a car, qualifying for a mortgage, sometimes even a job application. It isn't a moral score. It does reward the same steady, ordinary faithfulness Scripture keeps describing: do what you said you would do, and do it on time.",
        "Scripture is direct about the nature of debt itself. The borrower is servant to the lender. Debt isn't automatically wrong, but it is a real obligation, a claim someone else now has on your future income, and it deserves to be entered with open eyes rather than convenience. Paul aims the whole trajectory of a life in one direction: owe no one anything. That's not a ban on every loan that will ever exist. It's a compass heading, toward freedom from obligation rather than further into it.",
        "Proverbs adds one more specific, practical warning worth carrying into adulthood. Don't cosign or guarantee someone else's debt. If you lack the means to cover it yourself, your own bed can be taken out from under you for someone else's unpaid promise. Being generous with what's yours is commendable, and as the giving river will show, deeply biblical. Putting your own financial stability on the line for someone else's promise is a different thing entirely, and Scripture treats it as a trap worth naming plainly rather than a kindness worth praising.",
      ],
      scriptureRefs: [VERSE.prov22_7_kjv, VERSE.rom13_8_kjv, VERSE.prov22_26_niv],
    },
    {
      title: "Before you begin",
      body: [
        "A handful of people, a handful of different angles on the same underlying job. Abraham trusted God's provision and gave freely before anyone required it of him. Joseph planned patiently for a famine years before it arrived. Moses refused wealth that wasn't his to keep, then later had to restrain a generosity that had become too much. Joshua made his commitment out loud and lived inside it. Daniel stayed clean in the small, unwatched moments, year after year, long before anyone was checking. None of them had a checking account, a credit score, or a budget spreadsheet. Every one of them still has something to teach anyone who does.",
        "From here, the course follows the picture this introduction has been building toward: one river dividing into four. River 1 looks at income, where provision actually comes from, and why relying on a single source is fragile. River 2 looks at saving, holding some of it back on purpose for the season that hasn't arrived yet. River 3 looks at investing, patient and honest work with what you've been given. River 4 looks at giving, letting what flows in also flow back out. Each one ends with a small, real step logged in a tracker, simple on purpose, actual rather than hypothetical.",
        "None of this is a finish line you cross once. It's a practice, the same way Daniel's integrity and Joseph's patience were practices, built in ordinary days rather than proven in one dramatic one. Let us not grow weary in doing good, Paul writes, for in due season we will reap, if we do not give up. That's the whole posture this course is asking of you. Keep going. The river is still running, right into River 1.",
      ],
      scriptureRefs: [VERSE.gal6_9_kjv, VERSE.jas1_17_kjv],
    },
  ],
};
