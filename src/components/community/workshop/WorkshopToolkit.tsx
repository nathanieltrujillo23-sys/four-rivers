import { Card, CardBody } from "../../ui/Card";
import { ScenarioToolkit } from "./ScenarioToolkit";

/** The money toolkit on a workshop group's page, open to every member. */
export function WorkshopToolkit() {
  return (
    <section aria-labelledby="toolkit-title">
      <Card>
        <CardBody className="flex flex-col gap-4">
          <div>
            <p className="t-eyebrow">For everyone in the group</p>
            <h2 id="toolkit-title" className="t-h3">
              Money toolkit
            </h2>
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              Thirty tools in six sections: Live, Give, Grow, Owe, Estate planning, and Other financial goals. Open a section, then a tool.
            </p>
          </div>
          <ScenarioToolkit />
        </CardBody>
      </Card>
    </section>
  );
}
