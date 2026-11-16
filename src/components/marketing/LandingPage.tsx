import { Link } from "react-router-dom";
import { useAuth } from "../../state/AuthContext";
import { VERSE } from "../../content/scripture";
import { localizedVerse } from "../../content/scriptureEs";
import { Button } from "../ui/Button";
import { Reveal } from "../ui/Reveal";
import { Testimony } from "./Testimony";
import { StatsStrip } from "./StatsStrip";
import { HeroMap } from "./HeroMap";
import { FounderVideo } from "./FounderVideo";
import { LearnCards, HowItWorks, FinalCta } from "./HomeSections";
import { VideoShowcase } from "./VideoShowcase";
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
      <section className="grid items-center gap-10 pt-4 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
        <div className="rise-in text-center lg:text-left">
          <p className="cm-label">{localizeReference("Genesis 2:10–14", lang)}</p>
          <h1 className="t-display mt-3 lg:max-w-xl">{t("landing.h1")}</h1>
          <span aria-hidden="true" className="grow-x mx-auto mt-5 block h-px w-16 bg-water-deep lg:mx-0" />
          <figure className="mx-auto mt-5 max-w-xl lg:mx-0">
            <blockquote className="font-[family-name:var(--font-display)] text-lg italic leading-snug text-ink-soft sm:text-xl">
              “{verse.text}”
            </blockquote>
            <figcaption className="mt-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
              {verse.reference} ({verse.version})
            </figcaption>
          </figure>
          <p className="t-lead mx-auto mt-5 max-w-xl lg:mx-0">{t("landing.sub")}</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
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
          <p className="mt-4 font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("landing.facts")}</p>
        </div>
        <HeroMap />
      </section>

      <StatsStrip />

      <FounderVideo />

      <Reveal>
        <LearnCards />
      </Reveal>

      <Reveal>
        <HowItWorks />
      </Reveal>

      <Reveal>
        <VideoShowcase />
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
