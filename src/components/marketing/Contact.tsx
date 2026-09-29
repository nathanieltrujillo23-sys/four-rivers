import { Card, CardBody } from "../ui/Card";

const CONTACT_EMAIL = "trujillo.n@ufl.edu";
const CONTACT_PHONE_DISPLAY = "352-604-2084";
const CONTACT_PHONE_TEL = "+13526042084";

/** Simple contact box on the landing page — a direct line to the founder. */
export function Contact() {
  return (
    <Card className="mx-auto max-w-xl bg-parchment-deep/50 text-center">
      <CardBody>
        <h2 className="text-xl font-semibold text-ink">Contact</h2>
        <p className="mt-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          Every river starts with a single drop. If you have a question, a story of
          your own, or an idea for where 4 Rivers could flow next, I would love to
          hear it. Reach out anytime.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-block rounded-lg bg-water-deep px-4 py-2 font-[family-name:var(--font-ui)] text-sm font-medium text-parchment transition-colors hover:bg-water"
          >
            {CONTACT_EMAIL}
          </a>
          <a
            href={`tel:${CONTACT_PHONE_TEL}`}
            className="inline-block rounded-lg border border-line bg-parchment-deep px-4 py-2 font-[family-name:var(--font-ui)] text-sm font-medium text-ink transition-colors hover:bg-line"
          >
            {CONTACT_PHONE_DISPLAY}
          </a>
        </div>
      </CardBody>
    </Card>
  );
}
