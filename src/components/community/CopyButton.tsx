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
      {done ? t("common.copied") : label}
    </Button>
  );
}
