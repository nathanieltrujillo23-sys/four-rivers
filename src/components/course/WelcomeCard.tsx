import { useState } from "react";
import { useCourse } from "../../state/CourseContext";
import { useLang } from "../../i18n/LanguageContext";
import { useSiteText } from "../../lib/siteText";
import { Card, CardBody } from "../ui/Card";

const WEEKS_SHOWN = 2;
const key = (userId: string) => `four-rivers:welcome-dismissed:${userId}`;

/**
 * A thank-you and a short encouragement from the founder, at the top of the course page for a new learner's first two
 * weeks. It can be dismissed. The words are the welcome message an admin can edit (Testimony tab).
 */
export function WelcomeCard() {
  const { snapshot } = useCourse();
  const { lang, t } = useLang();
  const text = useSiteText("welcome", lang);
  const profile = snapshot?.profile;
  const [hidden, setHidden] = useState(() => {
    try {
      return !!profile && localStorage.getItem(key(profile.userId)) === "1";
    } catch {
      return false;
    }
  });

  if (!profile?.createdAt || hidden || profile.fullAccess) return null;
  const age = Date.now() - new Date(profile.createdAt).getTime();
  if (age > WEEKS_SHOWN * 7 * 86_400_000) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(key(profile.userId), "1");
    } catch {
      /* it just comes back next visit */
    }
  };

  return (
    <Card accent="var(--color-gold)" className="bg-parchment-deep/40">
      <CardBody className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="t-h3">{text.title}</h2>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("welcome.dismiss")}
            className="shrink-0 rounded-lg px-2 py-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft hover:bg-parchment-deep hover:text-ink"
          >
            ×
          </button>
        </div>
        {text.paragraphs.map((p, i) => (
          <p key={i} className="leading-relaxed text-ink-soft">
            {p}
          </p>
        ))}
        <p className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">— {text.sign}</p>
      </CardBody>
    </Card>
  );
}
