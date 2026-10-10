import { useState } from "react";
import { useLang } from "../../i18n/LanguageContext";
import { Button } from "../ui/Button";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const { t } = useLang();
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          window.setTimeout(() => setDone(false), 1800);
        } catch {
          window.prompt(label, text);
        }
      }}
    >
      {done && (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mr-1 inline-block align-[-2px]">
          <path className="draw" pathLength={1} d="M3 8.5l3.2 3.2L13 4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {done ? t("common.copied") : label}
    </Button>
  );
}
