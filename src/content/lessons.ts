/**
 * Lesson content for the four rivers.
 *
 * v1 status: PLACEHOLDER teaching text. Scripture is real and attached to every
 * point — the intro, each section, and the practice step all carry verses (KJV,
 * NIV, NLT, ESV only; see content/scripture.ts). Replace the `intro` and
 * `sections[].body` strings with final copy when it's ready; keep at least one
 * verse behind every section so no point stands without scriptural support.
 *
 * Compliance note (carried from prior builds): keep this content
 * educational and principle-based. It must not become personalized
 * financial or investment advice. If that line is ever approached, it needs
 * the same legal review flag as the other platform's Portfolio module.
 */

import type { Lesson, ScriptureRef } from "../types";
import { VERSE } from "./scripture";

export const LESSONS: Record<1 | 2 | 3 | 4, Lesson> = {
  1: {
    riverNumber: 1,
    title: "Multiple Streams of Income",
    intro:
      "One spring in Eden divided into four rivers. Provision, likewise, is rarely meant to arrive through a single channel. This first river is about widening the ways income can reach you — so that the failure of any one source is not the failure of all.",
    introScripture: [VERSE.gen2_10_kjv, VERSE.deut8_18_niv],
    sections: [
      {
        heading: "Why more than one stream",
        body: [
          "PLACEHOLDER: A single source of income is a single point of failure. Scripture repeatedly commends diligence, foresight, and spreading effort across several ventures rather than staking everything on one.",
          "PLACEHOLDER: Multiple streams are not about restless hustle. They are about resilience — arranging your work so a lost client, a slow season, or a closed door does not stop provision entirely.",
        ],
        scriptureRefs: [VERSE.eccl11_2_niv, VERSE.eccl11_6_nlt, VERSE.prov6_6_esv],
      },
      {
        heading: "What counts as a stream",
        body: [
          "PLACEHOLDER: A stream is any distinct, repeatable source of money: wages, a side trade, rental income, royalties, dividends, a small business line. The test is that it can stand on its own.",
          "PLACEHOLDER: Start by naming what you already have. Most people have more than one stream and have simply never counted them separately.",
        ],
        scriptureRefs: [VERSE.prov14_23_kjv, VERSE.col3_23_niv, VERSE.eph4_28_esv],
      },
      {
        heading: "The practice",
        body: [
          "PLACEHOLDER: In the tracker, log each income source as its own entry — its name, its category, its typical amount, and how often it arrives. Seeing them side by side is the point.",
        ],
        scriptureRefs: [VERSE.luke16_10_esv],
      },
    ],
    practicePrompt: "Log every income source you currently have — one entry per stream.",
    practiceScripture: [VERSE.prov27_23_esv],
  },

  2: {
    riverNumber: 2,
    title: "Saving",
    intro:
      "A river that is only ever drawn from runs dry. The second river is about holding some of what flows in — setting it aside on purpose, before it is spent, toward a named goal.",
    introScripture: [VERSE.prov21_20_nlt],
    sections: [
      {
        heading: "Storing in advance",
        body: [
          "PLACEHOLDER: Saving is provision aimed at a future need you can already see coming. The wise store during plenty so there is something to draw on during lack.",
          "PLACEHOLDER: The enemy of saving is not low income — it is the absence of a plan. Money without a destination tends to find one.",
        ],
        scriptureRefs: [VERSE.gen41_35_kjv, VERSE.prov21_20_niv, VERSE.prov30_25_kjv],
      },
      {
        heading: "Name the goal",
        body: [
          "PLACEHOLDER: A savings goal has a name and a number: an emergency fund of three months' expenses, a replacement vehicle, a first home. The name makes the sacrifice make sense.",
          "PLACEHOLDER: Small, regular contributions outperform rare large ones, because they survive changes of mood and circumstance.",
        ],
        scriptureRefs: [VERSE.prov21_5_esv, VERSE.prov13_11_niv, VERSE.prov16_3_kjv],
      },
      {
        heading: "The practice",
        body: [
          "PLACEHOLDER: Set a goal with a target amount, then log each contribution as you make it. The running balance is the sum of your contributions — nothing is assumed.",
        ],
        scriptureRefs: [VERSE.cor16_2_esv],
      },
    ],
    practicePrompt: "Create one savings goal and log your first contribution toward it.",
    practiceScripture: [VERSE.cor4_2_kjv],
  },

  3: {
    riverNumber: 3,
    title: "Investing",
    intro:
      "The third river moves further out. Investing is putting resources to work over time so they can produce more than they would sitting still — patiently, and without presuming on the outcome.",
    introScripture: [VERSE.matt25_21_niv, VERSE.prov27_1_kjv],
    sections: [
      {
        heading: "Faithful over time",
        body: [
          "PLACEHOLDER: The parable of the talents commends the servants who put what they were given to work, and rebukes the one who buried it out of fear.",
          "PLACEHOLDER: Investing rewards patience and consistency far more than timing or cleverness. Time in the effort tends to matter more than the perfect entry.",
        ],
        scriptureRefs: [VERSE.matt25_27_kjv, VERSE.eccl11_1_esv, VERSE.prov13_11_nlt],
      },
      {
        heading: "This is a log, not advice",
        body: [
          "PLACEHOLDER: 4 Rivers does not tell you what to invest in, and this tracker does not value your holdings or pull market prices. It records what you contributed and when.",
          "PLACEHOLDER: For decisions about specific investments, talk to a licensed advisor who knows your full situation.",
        ],
        scriptureRefs: [VERSE.prov15_22_esv, VERSE.prov11_14_nlt, VERSE.prov14_15_kjv],
      },
      {
        heading: "The practice",
        body: [
          "PLACEHOLDER: Each time you add money to an investment, log it — what it went into, how much, and any note to your future self about why.",
        ],
        scriptureRefs: [VERSE.luke14_28_niv],
      },
    ],
    practicePrompt: "Log one investment contribution you've made — or plan to make this month.",
    practiceScripture: [VERSE.prov21_5_kjv],
  },

  4: {
    riverNumber: 4,
    title: "Giving",
    intro:
      "In Eden the fourth river ran back out toward the wider world. The course ends where stewardship is aimed all along: releasing part of what came in, on purpose and with joy, for the good of others.",
    introScripture: [VERSE.acts20_35_kjv, VERSE.chr29_14_kjv],
    sections: [
      {
        heading: "The stream flows out",
        body: [
          "PLACEHOLDER: Giving is the point at which money stops being about accumulation and becomes about purpose. The first three rivers exist partly to make this one possible.",
          "PLACEHOLDER: Scripture frames generosity as sowing — what is released is not lost but planted, and the giver is described as the one who gains.",
        ],
        scriptureRefs: [VERSE.cor9_6_nlt, VERSE.prov11_24_esv, VERSE.luke6_38_nlt],
      },
      {
        heading: "Deliberate, not leftover",
        body: [
          "PLACEHOLDER: Giving that lands well is decided in advance — a set portion, given first, rather than whatever happens to remain at month's end.",
          "PLACEHOLDER: Keeping a simple record of what you give is not about pride; it is about being able to plan generosity the way you plan every other stream.",
        ],
        scriptureRefs: [
          VERSE.prov3_9_niv,
          VERSE.cor9_7_kjv,
          VERSE.mal3_10_esv,
          VERSE.prov27_23_niv,
        ],
      },
      {
        heading: "The practice",
        body: [
          "PLACEHOLDER: Log each gift as you give it — who received it and how much. The tracker keeps an optional running annual total.",
        ],
        scriptureRefs: [VERSE.prov19_17_esv],
      },
    ],
    practicePrompt: "Log a gift you've given recently — or one you're committing to now.",
    practiceScripture: [VERSE.gal6_10_niv],
  },
};

/** Every verse a lesson carries, in reading order, de-duplicated by reference + version. */
export function allLessonScripture(lesson: Lesson): ScriptureRef[] {
  const seen = new Set<string>();
  const out: ScriptureRef[] = [];
  const all = [
    ...lesson.introScripture,
    ...lesson.sections.flatMap((s) => s.scriptureRefs),
    ...lesson.practiceScripture,
  ];
  for (const ref of all) {
    const key = `${ref.reference}|${ref.translation}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(ref);
    }
  }
  return out;
}

/** Closing reflection shown on the completion dashboard. Every point is backed by scripture. */
export const CLOSING_REFLECTION = {
  scripture: VERSE.gen2_10_esv,
  body: [
    {
      text: "PLACEHOLDER: One source, four streams. Income widens the flow, saving holds some back, investing sets it to work, and giving sends it out again.",
      scriptureRefs: [VERSE.ps24_1_kjv],
    },
    {
      text: "PLACEHOLDER: The trackers below are yours to keep using. Stewardship is a practice, not a course you finish.",
      scriptureRefs: [VERSE.cor4_2_kjv, VERSE.gal6_9_kjv],
    },
  ],
};
