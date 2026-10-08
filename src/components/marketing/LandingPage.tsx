import { Link } from "react-router-dom";
import { useAuth } from "../../state/AuthContext";
import { VERSE } from "../../content/scripture";
import { localizedVerse } from "../../content/scriptureEs";
import { Button } from "../ui/Button";
import { Reveal } from "../ui/Reveal";
import { Testimony } from "./Testimony";
import { StatsStrip } from "./StatsStrip";
import { HeroRivers } from "./HeroRivers";
import { LearnCards, HowItWorks, FinalCta } from "./HomeSections";
import { PhoneShowcase } from "./PhoneShowcase";
import { Faq } from "./Faq";
import { useDemo } from "../../state/DemoContext";
import { useLang } from "../../i18n/LanguageContext";
import { localizeReference } from "../../i18n/books";

/**
 * The home page: a short story from top to bottom. Promise, what you'll learn, how it works, the app on a phone, the
 * founder's story, answers to common questions, and a last invitation. The rest (the rivers' scripture, contact) is
 * on the About page.
 */
export function LandingPage() {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const { startTour, beginGlow, demoActive } = useDemo();
  const signedIn = !!user || demoActive;
  const verse = localizedVerse(VERSE.gen2_10_kjv, lang);

  return (
    <div className="flex flex-col gap-16 pb-6 sm:gap-24">
      <section className="pt-4 text-center sm:pt-10">
        <p className="t-eyebrow mb-4">{localizeReference("Genesis 2:10–14", lang)}</p>
        <h1 className="t-display mx-auto max-w-3xl">{t("landing.h1")}</h1>
        <figure className="mx-auto mt-5 max-w-xl">
          <blockquote className="font-[family-name:var(--font-display)] text-lg italic leading-snug text-ink-soft sm:text-xl">
            “{verse.text}”
          </blockquote>
          <figcaption className="mt-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
            {verse.reference} ({verse.version})
          </figcaption>
        </figure>
        <p className="t-lead mx-auto mt-6 max-w-xl">{t("landing.sub")}</p>
        <div className="mt-8">
          <HeroRivers />
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <span data-tour="begin" className={`begin-wrap${beginGlow ? " glow-border" : ""}`}>
            <Link to={signedIn ? "/course" : "/signin"}>
              <Button>{signedIn ? t("landing.continue") : t("landing.begin")}</Button>
            </Link>
          </span>
          {!demoActive && (
            <Button variant="tour" onClick={startTour}>
              {t("landing.tour")}
            </Button>
          )}
        </div>
      </section>

      <StatsStrip />

      <Reveal>
        <LearnCards />
      </Reveal>

      <Reveal>
        <HowItWorks />
      </Reveal>

      <Reveal>
        <PhoneShowcase />
      </Reveal>

      <Reveal>
        <Testimony />
      </Reveal>

      <Reveal>
        <Faq />
      </Reveal>

      <Reveal>
        <FinalCta signedIn={signedIn} />
      </Reveal>

      <p className="text-center font-[family-name:var(--font-ui)] text-xs text-ink-soft">
        {t("landing.disclaimer")}
      </p>
    </div>
  );
}
