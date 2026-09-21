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
  /* River 1 — additional */
  jas1_17_kjv: v(
    "James 1:17",
    "KJV",
    "Every good gift and every perfect gift is from above, and cometh down from the Father of lights, with whom is no variableness, neither shadow of turning."
  ),
  gen2_15_esv: v(
    "Genesis 2:15",
    "ESV",
    "The Lord God took the man and put him in the garden of Eden to work it and keep it."
  ),
  thess2_3_10_esv: v(
    "2 Thessalonians 3:10",
    "ESV",
    "For even when we were with you, we would give you this command: If anyone is not willing to work, let him not eat."
  ),
  prov27_24_esv: v(
    "Proverbs 27:24",
    "ESV",
    "for riches do not last forever; and does a crown endure to all generations?"
  ),
  prov31_16_kjv: v(
    "Proverbs 31:16",
    "KJV",
    "She considereth a field, and buyeth it: with the fruit of her hands she planteth a vineyard."
  ),
  prov31_24_kjv: v(
    "Proverbs 31:24",
    "KJV",
    "She maketh fine linen, and selleth it; and delivereth girdles unto the merchant."
  ),
  acts18_3_kjv: v(
    "Acts 18:3",
    "KJV",
    "And because he was of the same craft, he abode with them, and wrought: for by their occupation they were tentmakers."
  ),
  prov28_20_kjv: v(
    "Proverbs 28:20",
    "KJV",
    "A faithful man shall abound with blessings: but he that maketh haste to be rich shall not be innocent."
  ),
  tim6_9_niv: v(
    "1 Timothy 6:9-10",
    "NIV",
    "Those who want to get rich fall into temptation and a trap and into many foolish and harmful desires that plunge people into ruin and destruction. For the love of money is a root of all kinds of evil. Some people, eager for money, have wandered from the faith and pierced themselves with many griefs."
  ),
  heb13_5_esv: v(
    "Hebrews 13:5",
    "ESV",
    "Keep your life free from love of money, and be content with what you have, for he has said, 'I will never leave you nor forsake you.'"
  ),
  ps127_2_esv: v(
    "Psalm 127:2",
    "ESV",
    "It is in vain that you rise up early and go late to rest, eating the bread of anxious toil; for he gives to his beloved sleep."
  ),
  ex20_9_kjv: v(
    "Exodus 20:9-10",
    "KJV",
    "Six days shalt thou labour, and do all thy work: But the seventh day is the sabbath of the LORD thy God…"
  ),
  eccl4_6_niv: v(
    "Ecclesiastes 4:6",
    "NIV",
    "Better one handful with tranquility than two handfuls with toil and chasing after the wind."
  ),

  /* River 2 — additional */
  luke12_15_esv: v(
    "Luke 12:15",
    "ESV",
    "And he said to them, 'Take care, and be on your guard against all covetousness, for one's life does not consist in the abundance of his possessions.'"
  ),
  luke12_20_kjv: v(
    "Luke 12:20-21",
    "KJV",
    "But God said unto him, Thou fool, this night thy soul shall be required of thee: then whose shall those things be, which thou hast provided? So is he that layeth up treasure for himself, and is not rich toward God."
  ),
  matt6_19_esv: v(
    "Matthew 6:19-21",
    "ESV",
    "Do not lay up for yourselves treasures on earth, where moth and rust destroy and where thieves break in and steal, but lay up for yourselves treasures in heaven, where neither moth nor rust destroys and where thieves do not break in and steal. For where your treasure is, there your heart will be also."
  ),
  prov24_27_esv: v(
    "Proverbs 24:27",
    "ESV",
    "Prepare your work outside; get everything ready for yourself in the field, and after that build your house."
  ),
  zech4_10_kjv: v(
    "Zechariah 4:10",
    "KJV",
    "For who hath despised the day of small things?…"
  ),
  prov22_3_kjv: v(
    "Proverbs 22:3",
    "KJV",
    "A prudent man foreseeth the evil, and hideth himself: but the simple pass on, and are punished."
  ),
  ps37_18_esv: v(
    "Psalm 37:18-19",
    "ESV",
    "The Lord knows the days of the blameless, and their heritage will remain forever; they are not put to shame in evil times; in the days of famine they have abundance."
  ),
  tim5_8_niv: v(
    "1 Timothy 5:8",
    "NIV",
    "Anyone who does not provide for their relatives, and especially for their own household, has denied the faith and is worse than an unbeliever."
  ),
  prov13_22_niv: v(
    "Proverbs 13:22",
    "NIV",
    "A good person leaves an inheritance for their children's children, but a sinner's wealth is stored up for the righteous."
  ),
  prov22_7_kjv: v(
    "Proverbs 22:7",
    "KJV",
    "The rich ruleth over the poor, and the borrower is servant to the lender."
  ),
  rom13_8_kjv: v(
    "Romans 13:8",
    "KJV",
    "Owe no man any thing, but to love one another: for he that loveth another hath fulfilled the law."
  ),
  phil4_11_kjv: v(
    "Philippians 4:11",
    "KJV",
    "Not that I speak in respect of want: for I have learned, in whatsoever state I am, therewith to be content."
  ),
  prov10_4_esv: v(
    "Proverbs 10:4",
    "ESV",
    "A slack hand causes poverty, but the hand of the diligent makes rich."
  ),

  /* River 3 — additional */
  matt25_25_kjv: v(
    "Matthew 25:25",
    "KJV",
    "And I was afraid, and went and hid thy talent in the earth: lo, there thou hast that is thine."
  ),
  prov28_22_esv: v(
    "Proverbs 28:22",
    "ESV",
    "A stingy man hastens after wealth and does not know that poverty will come upon him."
  ),
  prov20_21_kjv: v(
    "Proverbs 20:21",
    "KJV",
    "An inheritance may be gotten hastily at the beginning; but the end thereof shall not be blessed."
  ),
  mark4_28_esv: v(
    "Mark 4:28",
    "ESV",
    "The earth produces by itself, first the blade, then the ear, then the full grain in the ear."
  ),
  jas5_7_esv: v(
    "James 5:7",
    "ESV",
    "Be patient, therefore, brothers, until the coming of the Lord. See how the farmer waits for the precious fruit of the earth, being patient about it, until it receives the early and the late rains."
  ),
  prov19_2_niv: v(
    "Proverbs 19:2",
    "NIV",
    "Desire without knowledge is not good—how much more will hasty feet miss the way!"
  ),
  eccl11_2_nlt: v(
    "Ecclesiastes 11:2",
    "NLT",
    "Give portions to seven investments, or even eight, for you don't know what disasters may come upon the land."
  ),
  prov11_28_niv: v(
    "Proverbs 11:28",
    "NIV",
    "Those who trust in their riches will fall, but the righteous will thrive like a green leaf."
  ),
  ps62_10_esv: v(
    "Psalm 62:10",
    "ESV",
    "Do not trust in extortion; set no vain hopes on robbery; if riches increase, set not your heart on them."
  ),
  prov11_1_kjv: v(
    "Proverbs 11:1",
    "KJV",
    "A false balance is abomination to the LORD: but a just weight is his delight."
  ),
  prov10_2_niv: v(
    "Proverbs 10:2",
    "NIV",
    "Ill-gotten treasures have no lasting value, but righteousness delivers from death."
  ),
  prov16_8_kjv: v(
    "Proverbs 16:8",
    "KJV",
    "Better is a little with righteousness than great revenues without right."
  ),
  prov12_15_kjv: v(
    "Proverbs 12:15",
    "KJV",
    "The way of a fool is right in his own eyes: but he that hearkeneth unto counsel is wise."
  ),
  jas4_13_esv: v(
    "James 4:13-15",
    "ESV",
    "Come now, you who say, 'Today or tomorrow we will go into such and such a town and spend a year there and trade and make a profit'—yet you do not know what tomorrow will bring. What is your life? For you are a mist that appears for a little time and then vanishes. Instead you ought to say, 'If the Lord wills, we will live and do this or that.'"
  ),

  /* River 4 — additional */
  hag2_8_kjv: v(
    "Haggai 2:8",
    "KJV",
    "The silver is mine, and the gold is mine, saith the LORD of hosts."
  ),
  cor4_7_esv: v(
    "1 Corinthians 4:7",
    "ESV",
    "For who sees anything different in you? What do you have that you did not receive? If then you received it, why do you boast as if you did not receive it?"
  ),
  lev27_30_kjv: v(
    "Leviticus 27:30",
    "KJV",
    "And all the tithe of the land, whether of the seed of the land, or of the fruit of the tree, is the LORD's: it is holy unto the LORD."
  ),
  gen14_20_kjv: v(
    "Genesis 14:20",
    "KJV",
    "And blessed be the most high God, which hath delivered thine enemies into thy hand. And he gave him tithes of all."
  ),
  matt23_23_esv: v(
    "Matthew 23:23",
    "ESV",
    "Woe to you, scribes and Pharisees, hypocrites! For you tithe mint and dill and cumin, and have neglected the weightier matters of the law: justice and mercy and faithfulness. These you ought to have done, without neglecting the others."
  ),
  mark12_43_esv: v(
    "Mark 12:43-44",
    "ESV",
    "And he called his disciples to him and said to them, 'Truly, I say to you, this poor widow has put in more than all those who are contributing to the offering box. For they all contributed out of their abundance, but she out of her poverty has put in everything she had, all she had to live on.'"
  ),
  matt6_3_esv: v(
    "Matthew 6:3-4",
    "ESV",
    "But when you give to the needy, do not let your left hand know what your right hand is doing, so that your giving may be in secret. And your Father who sees in secret will reward you."
  ),
  deut15_11_esv: v(
    "Deuteronomy 15:11",
    "ESV",
    "For there will never cease to be poor in the land. Therefore I command you, 'You shall open wide your hand to your brother, to the needy and to the poor, in your land.'"
  ),
  prov31_20_kjv: v(
    "Proverbs 31:20",
    "KJV",
    "She stretcheth out her hand to the poor; yea, she reacheth forth her hands to the needy."
  ),
  jas2_15_esv: v(
    "James 2:15-16",
    "ESV",
    "If a brother or sister is poorly clothed and lacking in daily food, and one of you says to them, 'Go in peace, be warmed and filled,' without giving them the things needed for the body, what good is that?"
  ),
  tim6_17_niv: v(
    "1 Timothy 6:17-19",
    "NIV",
    "Command those who are rich in this present world not to be arrogant nor to put their hope in wealth, which is so uncertain, but to put their hope in God, who richly provides us with everything for our enjoyment. Command them to do good, to be rich in good deeds, and to be generous and willing to share. In this way they will lay up treasure for themselves as a firm foundation for the coming age, so that they may take hold of the life that is truly life."
  ),
  matt6_24_kjv: v(
    "Matthew 6:24",
    "KJV",
    "No man can serve two masters: for either he will hate the one, and love the other; or else he will hold to the one, and despise the other. Ye cannot serve God and mammon."
  ),
  prov21_26_esv: v(
    "Proverbs 21:26",
    "ESV",
    "All day long he craves and craves, but the righteous gives and does not hold back."
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
