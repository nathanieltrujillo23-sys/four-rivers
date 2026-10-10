import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useResumeLink } from "../../state/useResumeLink";
import { useLang } from "../../i18n/LanguageContext";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";

const AWAY_DAYS = 3;
const DAY = 86_400_000;

/** A warm greeting that slides in when someone returns after a few days away, with the way back to where they left off. */
export function WelcomeBack() {
  const { snapshot } = useCourse();
  const resume = useResumeLink();
  const { t } = useLang();
  const userId = snapshot?.profile.userId;
  const name = snapshot?.profile.displayName;
  const [days, setDays] = useState<number | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (!userId || done.current) return;
    done.current = true;
    const key = `four-rivers:last-visit:${userId}`;
    try {
      const last = Number(localStorage.getItem(key));
      if (last && Date.now() - last >= AWAY_DAYS * DAY) setDays(Math.floor((Date.now() - last) / DAY));
      localStorage.setItem(key, String(Date.now()));
    } catch {
      /* no storage: no greeting */
    }
  }, [userId]);

  if (days === null) return null;
  return (
    <Card accent="var(--color-gold)" className="rise-in bg-parchment-deep/40">
      <CardBody className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="t-h4">{t("back.title", { greeting: name ? `, ${name}` : "" })}</h2>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("back.text", { n: days })}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setDays(null)}>
            {t("back.dismiss")}
          </Button>
          {resume && (
            <Link to={resume.to}>
              <Button>{t("back.continue")}</Button>
            </Link>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
