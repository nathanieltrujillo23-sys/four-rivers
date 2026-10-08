import { useState } from "react";
import type { RiverNumber, ScriptureRef } from "../../types";
import { ScriptureList } from "../ui/Scripture";
import { Card, CardBody } from "../ui/Card";
import { Button } from "../ui/Button";
import { RiverTracker } from "./RiverTracker";
import { useT } from "../../i18n/LanguageContext";

/**
 * The companion tracker, shown only on a river's practice module (its last
 * one) and collapsed by default — opening it is optional. This is the only
 * place in the course that renders a river's tracker; the river overview page
 * no longer does.
 */
export function PracticeSection({
  riverNumber,
  accent,
  prompt,
  scripture,
}: {
  riverNumber: RiverNumber;
  accent: string;
  prompt: string;
  scripture: ScriptureRef[];
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <Card accent={accent}>
      <CardBody className="flex flex-col gap-4">
        <div>
          <h2 className="t-h3">{t("practice.title")}</h2>
          <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{prompt}</p>
          <ScriptureList verses={scripture} compact className="mt-3" />
        </div>

        {open ? (
          <div className="flex flex-col gap-3">
            <RiverTracker river={riverNumber} />
            <Button variant="ghost" className="self-start" onClick={() => setOpen(false)}>
              {t("practice.hide")}
            </Button>
          </div>
        ) : (
          <Button className="self-start" onClick={() => setOpen(true)}>
            {t("practice.open")}
          </Button>
        )}
      </CardBody>
    </Card>
  );
}
