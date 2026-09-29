import { Card, CardBody } from "../ui/Card";

const CONTACT_EMAIL = "trujillo.n@ufl.edu";

/** Simple contact box on the landing page — a direct line to the founder. */
export function Contact() {
  return (
    <Card className="mx-auto max-w-xl bg-parchment-deep/50 text-center">
      <CardBody>
        <h2 className="text-xl font-semibold text-ink">Contact</h2>
        <p className="mt-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          Questions or feedback? Reach out.
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="mt-4 inline-block rounded-lg bg-water-deep px-4 py-2 font-[family-name:var(--font-ui)] text-sm font-medium text-parchment transition-colors hover:bg-water"
        >
          {CONTACT_EMAIL}
        </a>
      </CardBody>
    </Card>
  );
}
