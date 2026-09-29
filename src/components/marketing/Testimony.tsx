import portrait from "../../assets/testimony-nathaniel.jpg";
import { Card, CardBody } from "../ui/Card";

/**
 * "My Testimony" — the founder's story, placed on the landing page just under
 * "How it works". Body text is placeholder until Nate supplies the final copy
 * (see TESTIMONY_TEXT below) — swap that array and nothing else needs to change.
 */
const TESTIMONY_TEXT: string[] = [
  "PLACEHOLDER: This is where Nate's testimony will go — his own story of walking out the four rivers, in his words. Replace this paragraph (and the ones below) with the final text.",
  "PLACEHOLDER: A second paragraph, if needed, continuing the story.",
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
          {TESTIMONY_TEXT.map((para, i) => (
            <p key={i} className="leading-relaxed text-ink-soft">
              {para}
            </p>
          ))}
          <p className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
            — Nathaniel Trujillo, Founder of 4 Rivers
          </p>
        </CardBody>
      </Card>
    </section>
  );
}
