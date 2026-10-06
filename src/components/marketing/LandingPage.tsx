import { Link } from "react-router-dom";
import { useAuth } from "../../state/AuthContext";
import { RIVERS, readable } from "../../theme/theme";
import { EDEN_RIVER_REFS, PRINCIPLE_SCRIPTURE, VERSE } from "../../content/scripture";
import { ScriptureQuote } from "../ui/Scripture";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { Testimony } from "./Testimony";
import { StatsStrip } from "./StatsStrip";
import { Contact } from "./Contact";
import { HeroRivers } from "./HeroRivers";
import { useDemo } from "../../state/DemoContext";
import { useLang } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";
import { localizeReference } from "../../i18n/books";

export function LandingPage() {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const { startTour, beginGlow, demoActive } = useDemo();
  const signedIn = !!user || demoActive;

  return (
    <div className="flex flex-col gap-14 py-4">
      <section className="text-center">
        <p className="mb-3 font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.2em] text-clay">
          {localizeReference("Genesis 2:10–14", lang)}
        </p>
        <h1 className="mx-auto max-w-2xl text-4xl font-semibold leading-tight text-ink sm:text-5xl">
          {t("landing.h1")}
        </h1>
        <p className="mx-auto mt-4 max-w-xl font-[family-name:var(--font-ui)] text-lg text-ink-soft">
          {t("landing.sub")}
        </p>
        <div className="mt-8">
          <HeroRivers />
        </div>
        <div className="mx-auto mt-6 max-w-xl text-left">
          <ScriptureQuote verse={VERSE.gen2_10_kjv} />
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
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

      <section className="grid gap-4 sm:grid-cols-2">
        {RIVERS.map((r) => (
          <Card key={r.number} accent={r.accent}>
            <CardBody>
              <div className="flex items-baseline gap-2">
                <span
                  className="font-[family-name:var(--font-ui)] text-sm font-semibold"
                  style={{ color: readable(r.accent) }}
                >
                  {t("river.label", { n: r.number })}
                </span>
                <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                  {t("landing.namedFor", {
                    river: t(`eden.${r.number}` as StringKey),
                    ref: localizeReference(EDEN_RIVER_REFS[r.number], lang),
                  })}
                </span>
              </div>
              <h3 className="mt-1 text-xl font-semibold text-ink">
                {t(`river.${r.number}.title` as StringKey)}
              </h3>
              <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                {t(`river.${r.number}.principle` as StringKey)}
              </p>
              <div className="mt-3">
                <ScriptureQuote verse={PRINCIPLE_SCRIPTURE[r.number]} compact />
              </div>
            </CardBody>
          </Card>
        ))}
      </section>

      <section className="rounded-2xl bg-parchment-deep/60 p-8 text-center">
        <h2 className="text-2xl font-semibold text-ink">{t("landing.how")}</h2>
        <div className="mx-auto mt-5 grid max-w-2xl gap-5 font-[family-name:var(--font-ui)] text-sm text-ink-soft sm:grid-cols-3">
          <div>
            <div className="text-2xl font-semibold text-water-deep">1</div>
            {t("landing.how1")}
          </div>
          <div>
            <div className="text-2xl font-semibold text-water-deep">2</div>
            {t("landing.how2")}
          </div>
          <div>
            <div className="text-2xl font-semibold text-water-deep">3</div>
            {t("landing.how3")}
          </div>
        </div>
      </section>

      <StatsStrip />

      <Testimony />

      <Contact />

      <p className="text-center font-[family-name:var(--font-ui)] text-xs text-ink-soft">
        {t("landing.disclaimer")}
      </p>
    </div>
  );
}
