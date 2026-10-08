import { useState } from "react";
import { LOGO_IDS, LOGOS, type LogoId } from "../../brand/logoMarks.mjs";
import { saveLogoChoice, useLogoChoice } from "../../lib/logoChoice";
import { BrandMark } from "../ui/BrandMark";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";

/** Admin, Tools: pick the logo shown in the header, on certificates, in the browser tab, and in link previews. */
export function LogoChooser() {
  const chosen = useLogoChoice();
  const [busy, setBusy] = useState<LogoId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<LogoId | null>(null);

  async function choose(id: LogoId) {
    setBusy(id);
    setError(null);
    setSaved(null);
    try {
      await saveLogoChoice(id);
      setSaved(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the logo. Try again.");
    }
    setBusy(null);
  }

  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div>
          <h2 className="t-h4">Logo</h2>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            Choose the mark for the site header, certificates, the browser tab, and the picture shown when the link is
            shared. The tab icon changes at once; a link preview can take a few days to refresh in apps that saved the
            old one.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LOGO_IDS.map((id) => {
            const on = id === chosen;
            return (
              <li
                key={id}
                className={`flex flex-col gap-3 rounded-xl border p-3 ${on ? "border-water-deep" : "border-line"}`}
              >
                <div className="flex h-28 items-center justify-center rounded-lg bg-parchment-deep">
                  <BrandMark logo={id} size={76} />
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-parchment px-3 py-2">
                  <BrandMark logo={id} size={26} />
                  <span className="font-[family-name:var(--font-display)] t-h4">4 Rivers</span>
                </div>
                <div>
                  <p className="font-semibold text-ink">{LOGOS[id].name}</p>
                  <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{LOGOS[id].note}</p>
                </div>
                {on ? (
                  <p className="font-[family-name:var(--font-ui)] text-sm font-medium text-water-deep">In use</p>
                ) : (
                  <Button variant="secondary" disabled={busy !== null} onClick={() => void choose(id)}>
                    {busy === id ? "Saving…" : `Use ${LOGOS[id].name}`}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        {saved && (
          <p role="status" className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            Saved. {LOGOS[saved].name} is now the logo.
          </p>
        )}
        {error && (
          <p role="alert" className="font-[family-name:var(--font-ui)] text-sm text-clay">
            {error}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
