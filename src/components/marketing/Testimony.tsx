import portrait from "../../assets/testimony-nathaniel.jpg";
import { VERSE } from "../../content/scripture";
import { ScriptureQuote } from "../ui/Scripture";
import { Card, CardBody } from "../ui/Card";
import { useT } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";

/**
 * "My Testimony" — the founder's own story, in his own words, placed on the
 * landing page just under "How it works". Each entry is one paragraph of his
 * testimony; a paragraph can carry a `scripture` verse where he references
 * one, rendered as a proper attributed quote right under it.
 */
const TESTIMONY_PARAGRAPHS: { key: StringKey; scripture?: (typeof VERSE)[keyof typeof VERSE] }[] = [
  { key: "testimony.p1" },
  { key: "testimony.p2" },
  { key: "testimony.p3" },
  { key: "testimony.p4", scripture: VERSE.gen39_2_niv },
  { key: "testimony.p5" },
  { key: "testimony.p6" },
];

export function Testimony() {
  const t = useT();
  return (
    <section className="flex flex-col items-center gap-6 rounded-2xl bg-parchment-deep/60 p-8 text-center">
      <h2 className="text-2xl font-semibold text-ink">{t("testimony.title")}</h2>

      <img
        src={portrait}
        alt={t("testimony.alt")}
        width={160}
        height={160}
        className="h-40 w-40 rounded-full border-4 border-white object-cover shadow-md"
      />

      <Card className="max-w-2xl text-left">
        <CardBody className="flex flex-col gap-4">
          {TESTIMONY_PARAGRAPHS.map((para, i) => (
            <div key={i} className="flex flex-col gap-3">
              <p className="leading-relaxed text-ink-soft">{t(para.key)}</p>
              {para.scripture && <ScriptureQuote verse={para.scripture} compact />}
            </div>
          ))}
          <p className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
            — {t("testimony.sign")}
          </p>
        </CardBody>
      </Card>
    </section>
  );
}
