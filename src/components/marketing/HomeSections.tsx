import { Link } from "react-router-dom";
import { RIVERS, readable } from "../../theme/theme";
import { useLang } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";
import { SproutIcon, DropletIcon, TreeIcon, GiftIcon } from "../ui/RiverIcons";
import { FeatureIcon, type FeatureIconName } from "../ui/FeatureIcons";

const RIVER_ICONS = [SproutIcon, DropletIcon, TreeIcon, GiftIcon];

/** "What you'll learn": one card per river with a single sentence about what you will be able to do. */
export function LearnCards() {
  const { t } = useLang();
  return (
    <section aria-labelledby="learn-title">
      <div className="text-center">
        <h2 id="learn-title" className="t-h1">
          {t("learn.title")}
        </h2>
        <p className="t-lead mx-auto mt-3 max-w-xl">{t("learn.sub")}</p>
      </div>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {RIVERS.map((r, i) => {
          const Icon = RIVER_ICONS[i];
          return (
            <li
              key={r.number}
              className="panel flex flex-col gap-3 p-5 transition-transform duration-200 hover:-translate-y-1"
              style={{ borderTop: `4px solid ${r.accent}` }}
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: r.accentSoft }}
              >
                <Icon color={readable(r.accent)} size={26} />
              </span>
              <p className="t-eyebrow" style={{ color: readable(r.accent) }}>
                {t("learn.river", { n: r.number })}
              </p>
              <h3 className="t-h3">{t(`river.${r.number}.title` as StringKey)}</h3>
              <p className="font-[family-name:var(--font-ui)] text-sm leading-relaxed text-ink-soft">
                {t(`learn.${r.number}` as StringKey)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const STEPS: { icon: FeatureIconName; title: StringKey; text: StringKey }[] = [
  { icon: "book", title: "how.t1", text: "landing.how1" },
  { icon: "pencil", title: "how.t2", text: "landing.how2" },
  { icon: "chart", title: "how.t3", text: "landing.how3" },
];

/** Three steps, each with an icon. */
export function HowItWorks() {
  const { t } = useLang();
  return (
    <section aria-labelledby="how-title" className="panel bg-parchment-deep/60 px-6 py-10 text-center sm:px-10">
      <h2 id="how-title" className="t-h1">
        {t("landing.how")}
      </h2>
      <ol className="mx-auto mt-8 grid max-w-3xl gap-8 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex flex-col items-center gap-3">
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-surface text-water-deep shadow-sm">
              <FeatureIcon name={s.icon} size={26} />
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-water-deep font-[family-name:var(--font-ui)] text-xs font-semibold text-white"
              >
                {i + 1}
              </span>
            </span>
            <h3 className="t-h4">{t(s.title)}</h3>
            <p className="font-[family-name:var(--font-ui)] text-sm leading-relaxed text-ink-soft">{t(s.text)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** A closing call to action. */
export function FinalCta({ signedIn }: { signedIn: boolean }) {
  const { t } = useLang();
  return (
    <section className="rounded-3xl bg-water-deep px-6 py-12 text-center text-white sm:px-10">
      <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight sm:text-4xl">
        {t("cta.title")}
      </h2>
      <p className="mx-auto mt-3 max-w-md font-[family-name:var(--font-ui)] text-base text-white/85">{t("cta.sub")}</p>
      <div className="mt-7">
        <Link
          to={signedIn ? "/course" : "/signin"}
          className="inline-block rounded-lg bg-white px-7 py-3 font-[family-name:var(--font-ui)] text-base font-semibold text-water-deep shadow-sm transition-colors hover:bg-parchment"
        >
          {signedIn ? t("landing.continue") : t("landing.begin")}
        </Link>
      </div>
    </section>
  );
}
