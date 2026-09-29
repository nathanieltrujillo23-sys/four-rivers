import portrait from "../../assets/testimony-nathaniel.jpg";
import { VERSE } from "../../content/scripture";
import { ScriptureQuote } from "../ui/Scripture";
import { Card, CardBody } from "../ui/Card";

/**
 * "My Testimony" — the founder's own story, in his own words, placed on the
 * landing page just under "How it works". Each entry is one paragraph of his
 * testimony; a paragraph can carry a `scripture` verse where he references
 * one, rendered as a proper attributed quote right under it.
 */
const TESTIMONY_PARAGRAPHS: { text: string; scripture?: (typeof VERSE)[keyof typeof VERSE] }[] = [
  {
    text: "My name is Nathaniel Joseph Trujillo, known to most as Nate. I am a second-year Business Administration student at the University of Florida, pursuing a degree in business administration with a minor in wealth management. My focus is on the relationship between biblical stewardship and wealth management, and my faith in Christ is the foundation both of my studies and of the career I am building.",
  },
  {
    text: "That faith did not come easily. When I was ten years old, my father passed away on a ministry trip to Chile. In that loss, God met me in a way I have never forgotten. I did not simply inherit my father's faith. I chose it for myself. I decided that day to live for Christ the way he had. If I am ever called to, I want to die for Christ the way he did too.",
  },
  {
    text: "Both my mother and father shaped how I saw money long before I understood what stewardship meant. They taught me that everything I have belongs to God first. They taught me that hard work and integrity are not separate from faith but expressions of it. That conviction has never left me. My purpose comes from God, and my career should flow out of that purpose rather than the other way around. This is why I have devoted myself to stewardship and wealth management.",
  },
  {
    text: "My middle name is Joseph, and I have always looked to the biblical Joseph as an example of what it means to work with integrity even in seasons of hardship. Scripture says the Lord was with Joseph so that he prospered, and that his master saw the Lord was with him and caused everything he did to succeed (Genesis 39:2-3). Joseph never let his circumstances shake his integrity, and God blessed the work of his hands because of it. That is the standard I hold myself to.",
    scripture: VERSE.gen39_2_niv,
  },
  {
    text: "That same conviction carries into everything I build today. I am involved with Daily Bread's weekly Bible Studies and wealth management track at UF, and I founded TruCapitalVentures to bring biblical principles into the world of trading and wealth management. My dream is to reach my generation with both the gospel and financial freedom, and to show that faith and finance were never meant to be separate pursuits.",
  },
  {
    text: "4 Rivers is where those two passions meet. It is a place to teach the biblical principles of income, saving, investing, and giving to a generation that needs both Christ and a plan for stewardship. This dream, connecting people to Jesus and to sound financial wisdom in the same breath, is what fuels my drive in both ministry and career, and is the reason I created 4 Rivers as a free resource for all of you. God bless!",
  },
];

export function Testimony() {
  return (
    <section className="flex flex-col items-center gap-6 rounded-2xl bg-parchment-deep/60 p-8 text-center">
      <h2 className="text-2xl font-semibold text-ink">My Testimony</h2>

      <img
        src={portrait}
        alt="Nathaniel Trujillo, founder of 4 Rivers"
        width={160}
        height={160}
        className="h-40 w-40 rounded-full border-4 border-white object-cover shadow-md"
      />

      <Card className="max-w-2xl text-left">
        <CardBody className="flex flex-col gap-4">
          {TESTIMONY_PARAGRAPHS.map((para, i) => (
            <div key={i} className="flex flex-col gap-3">
              <p className="leading-relaxed text-ink-soft">{para.text}</p>
              {para.scripture && <ScriptureQuote verse={para.scripture} compact />}
            </div>
          ))}
          <p className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
            — Nathaniel Joseph Trujillo, Founder of 4 Rivers
          </p>
        </CardBody>
      </Card>
    </section>
  );
}
