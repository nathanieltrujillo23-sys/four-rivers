/**
 * Scripture library — every verse quoted anywhere in 4 Rivers is defined here
 * once and referenced by key from lessons and UI.
 *
 * Versions: KJV, NIV, NLT, ESV ONLY (see `Translation` in types.ts).
 * KJV is public domain. NIV, NLT and ESV are copyrighted; the quotations here
 * are brief and attributed, and the required notices are rendered in the app
 * footer (see `TRANSLATION_NOTICES`). Before any commercial/paid launch, confirm
 * each publisher's current permission terms — quotation limits differ.
 *
 * When adding a verse, copy it verbatim from the named translation. Truncated
 * passages end with "…" so nothing reads as the whole verse when it isn't.
 */

import type { ScriptureRef, Translation } from "../types";

export const TRANSLATION_NOTICES: Partial<Record<Translation, string>> = {
  NIV: "Scripture quotations taken from The Holy Bible, New International Version® NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.® Used by permission. All rights reserved worldwide.",
  NLT: "Scripture quotations are taken from the Holy Bible, New Living Translation, copyright ©1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Carol Stream, Illinois 60188. All rights reserved.",
  ESV: "Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.",
};

function v(reference: string, translation: Translation, text: string): ScriptureRef {
  return { reference, translation, text };
}

export const VERSE = {
  /* Eden / the name */
  gen2_10_kjv: v(
    "Genesis 2:10",
    "KJV",
    "And a river went out of Eden to water the garden; and from thence it was parted, and became into four heads."
  ),
  gen2_10_esv: v(
    "Genesis 2:10",
    "ESV",
    "A river flowed out of Eden to water the garden, and there it divided and became four rivers."
  ),

  /* Stewardship / faithfulness */
  ps24_1_kjv: v(
    "Psalm 24:1",
    "KJV",
    "The earth is the LORD's, and the fulness thereof; the world, and they that dwell therein."
  ),
  cor4_2_kjv: v(
    "1 Corinthians 4:2",
    "KJV",
    "Moreover it is required in stewards, that a man be found faithful."
  ),
  gal6_9_kjv: v(
    "Galatians 6:9",
    "KJV",
    "And let us not be weary in well doing: for in due season we shall reap, if we faint not."
  ),

  /* Journal — remembering the journey */
  hab2_2_kjv: v(
    "Habakkuk 2:2",
    "KJV",
    "And the LORD answered me, and said, Write the vision, and make it plain upon tables, that he may run that readeth it."
  ),
  ps103_2_kjv: v(
    "Psalm 103:2",
    "KJV",
    "Bless the LORD, O my soul, and forget not all his benefits:"
  ),

  /* River 1 — income */
  deut8_18_niv: v(
    "Deuteronomy 8:18",
    "NIV",
    "But remember the Lord your God, for it is he who gives you the ability to produce wealth, and so confirms his covenant, which he swore to your ancestors, as it is today."
  ),
  eccl11_2_niv: v(
    "Ecclesiastes 11:2",
    "NIV",
    "Invest in seven ventures, yes, in eight; you do not know what disaster may come upon the land."
  ),
  eccl11_6_nlt: v(
    "Ecclesiastes 11:6",
    "NLT",
    "Plant your seed in the morning and keep busy all afternoon, for you don't know if profit will come from one activity or another—or maybe both."
  ),
  prov6_6_esv: v(
    "Proverbs 6:6-8",
    "ESV",
    "Go to the ant, O sluggard; consider her ways, and be wise. Without having any chief, officer, or ruler, she prepares her bread in summer and gathers her food in harvest."
  ),
  prov14_23_kjv: v(
    "Proverbs 14:23",
    "KJV",
    "In all labour there is profit: but the talk of the lips tendeth only to penury."
  ),
  col3_23_niv: v(
    "Colossians 3:23",
    "NIV",
    "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters…"
  ),
  eph4_28_esv: v(
    "Ephesians 4:28",
    "ESV",
    "Let the thief no longer steal, but rather let him labor, doing honest work with his own hands, so that he may have something to share with anyone in need."
  ),
  luke16_10_esv: v(
    "Luke 16:10",
    "ESV",
    "One who is faithful in a very little is also faithful in much, and one who is dishonest in a very little is also dishonest in much."
  ),
  prov27_23_esv: v(
    "Proverbs 27:23",
    "ESV",
    "Know well the condition of your flocks, and give attention to your herds…"
  ),
  prov27_23_niv: v(
    "Proverbs 27:23",
    "NIV",
    "Be sure you know the condition of your flocks, give careful attention to your herds…"
  ),

  /* River 2 — saving */
  prov21_20_kjv: v(
    "Proverbs 21:20",
    "KJV",
    "There is treasure to be desired and oil in the dwelling of the wise; but a foolish man spendeth it up."
  ),
  prov21_20_niv: v(
    "Proverbs 21:20",
    "NIV",
    "The wise store up choice food and olive oil, but fools gulp theirs down."
  ),
  prov21_20_nlt: v(
    "Proverbs 21:20",
    "NLT",
    "The wise have wealth and luxury, but fools spend whatever they get."
  ),
  gen41_35_kjv: v(
    "Genesis 41:35-36",
    "KJV",
    "And let them gather all the food of those good years that come, and lay up corn under the hand of Pharaoh, and let them keep food in the cities. And that food shall be for store to the land against the seven years of famine, which shall be in the land of Egypt; that the land perish not through the famine."
  ),
  prov30_25_kjv: v(
    "Proverbs 30:25",
    "KJV",
    "The ants are a people not strong, yet they prepare their meat in the summer;"
  ),
  prov21_5_esv: v(
    "Proverbs 21:5",
    "ESV",
    "The plans of the diligent lead surely to abundance, but everyone who is hasty comes only to poverty."
  ),
  prov21_5_kjv: v(
    "Proverbs 21:5",
    "KJV",
    "The thoughts of the diligent tend only to plenteousness; but of every one that is hasty only to want."
  ),
  prov13_11_niv: v(
    "Proverbs 13:11",
    "NIV",
    "Dishonest money dwindles away, but whoever gathers money little by little makes it grow."
  ),
  prov16_3_kjv: v(
    "Proverbs 16:3",
    "KJV",
    "Commit thy works unto the LORD, and thy thoughts shall be established."
  ),
  cor16_2_esv: v(
    "1 Corinthians 16:2",
    "ESV",
    "On the first day of every week, each of you is to put something aside and store it up, as he may prosper, so that there will be no collecting when I come."
  ),

  /* River 3 — investing */
  matt25_21_kjv: v(
    "Matthew 25:21",
    "KJV",
    "His lord said unto him, Well done, thou good and faithful servant: thou hast been faithful over a few things, I will make thee ruler over many things: enter thou into the joy of thy lord."
  ),
  matt25_21_niv: v(
    "Matthew 25:21",
    "NIV",
    "His master replied, 'Well done, good and faithful servant! You have been faithful with a few things; I will put you in charge of many things. Come and share your master's happiness!'"
  ),
  matt25_27_kjv: v(
    "Matthew 25:27",
    "KJV",
    "Thou oughtest therefore to have put my money to the exchangers, and then at my coming I should have received mine own with usury."
  ),
  prov27_1_kjv: v(
    "Proverbs 27:1",
    "KJV",
    "Boast not thyself of to morrow; for thou knowest not what a day may bring forth."
  ),
  eccl11_1_esv: v(
    "Ecclesiastes 11:1",
    "ESV",
    "Cast your bread upon the waters, for you will find it after many days."
  ),
  prov13_11_nlt: v(
    "Proverbs 13:11",
    "NLT",
    "Wealth from get-rich-quick schemes quickly disappears; wealth from hard work grows over time."
  ),
  prov15_22_esv: v(
    "Proverbs 15:22",
    "ESV",
    "Without counsel plans fail, but with many advisers they succeed."
  ),
  prov11_14_nlt: v(
    "Proverbs 11:14",
    "NLT",
    "Without wise leadership, a nation falls; there is safety in having many advisers."
  ),
  prov14_15_kjv: v(
    "Proverbs 14:15",
    "KJV",
    "The simple believeth every word: but the prudent man looketh well to his going."
  ),
  luke14_28_niv: v(
    "Luke 14:28",
    "NIV",
    "Suppose one of you wants to build a tower. Won't you first sit down and estimate the cost to see if you have enough money to complete it?"
  ),

  /* River 4 — giving */
  acts20_35_kjv: v(
    "Acts 20:35",
    "KJV",
    "It is more blessed to give than to receive."
  ),
  chr29_14_kjv: v(
    "1 Chronicles 29:14",
    "KJV",
    "But who am I, and what is my people, that we should be able to offer so willingly after this sort? for all things come of thee, and of thine own have we given thee."
  ),
  cor9_6_nlt: v(
    "2 Corinthians 9:6",
    "NLT",
    "Remember this—a farmer who plants only a few seeds will get a small crop. But the one who plants generously will get a generous crop."
  ),
  cor9_7_kjv: v(
    "2 Corinthians 9:7",
    "KJV",
    "Every man according as he purposeth in his heart, so let him give; not grudgingly, or of necessity: for God loveth a cheerful giver."
  ),
  cor9_7_niv: v(
    "2 Corinthians 9:7",
    "NIV",
    "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver."
  ),
  prov11_24_esv: v(
    "Proverbs 11:24-25",
    "ESV",
    "One gives freely, yet grows all the richer; another withholds what he should give, and only suffers want. Whoever brings blessing will be enriched, and one who waters will himself be watered."
  ),
  luke6_38_nlt: v(
    "Luke 6:38",
    "NLT",
    "Give, and you will receive. Your gift will return to you in full—pressed down, shaken together to make room for more, running over, and poured into your lap. The amount you give will determine the amount you get back."
  ),
  prov3_9_niv: v(
    "Proverbs 3:9-10",
    "NIV",
    "Honor the Lord with your wealth, with the firstfruits of all your crops; then your barns will be filled to overflowing, and your vats will brim over with new wine."
  ),
  mal3_10_esv: v(
    "Malachi 3:10",
    "ESV",
    "Bring the full tithe into the storehouse, that there may be food in my house. And thereby put me to the test, says the Lord of hosts, if I will not open the windows of heaven for you and pour down for you a blessing until there is no more need."
  ),
  prov19_17_esv: v(
    "Proverbs 19:17",
    "ESV",
    "Whoever is generous to the poor lends to the Lord, and he will repay him for his deed."
  ),
  gal6_10_niv: v(
    "Galatians 6:10",
    "NIV",
    "Therefore, as we have opportunity, let us do good to all people, especially to those who belong to the family of believers."
  ),
} as const satisfies Record<string, ScriptureRef>;

/** Where each Eden river is named (Genesis 2:11–14), for the "named for the…" labels. */
export const EDEN_RIVER_REFS: Record<1 | 2 | 3 | 4, string> = {
  1: "Genesis 2:11",
  2: "Genesis 2:13",
  3: "Genesis 2:14",
  4: "Genesis 2:14",
};

/** One supporting verse for each river's one-line principle (landing + course cards). */
export const PRINCIPLE_SCRIPTURE: Record<1 | 2 | 3 | 4, ScriptureRef> = {
  1: VERSE.eccl11_2_niv,
  2: VERSE.prov21_20_kjv,
  3: VERSE.matt25_21_kjv,
  4: VERSE.cor9_7_niv,
};
