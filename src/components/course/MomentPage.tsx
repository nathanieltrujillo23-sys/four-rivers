import { Link, Navigate, useParams } from "react-router-dom";
import { useLang } from "../../i18n/LanguageContext";
import { MOMENTS, momentWithCopy, type MomentText } from "../../content/moments";
import { useCopy, type CopyFn } from "../../lib/copy";
import { MOMENTS_ES } from "../../content/es/moments";
import { findLibraryVerse } from "../../content/verseLibrary";
import { FeatureIcon } from "../ui/FeatureIcons";
import { ScriptureQuote } from "../ui/Scripture";
import { Card, CardBody } from "../ui/Card";
import { WORDS_PER_MINUTE } from "../../content/lessons";

/** The reading time, counting everything on the page except the verses. */
export function momentMinutes(t: MomentText): number {
  const text = [t.hook, ...t.sections.flatMap((s) => [s.heading, ...s.body]), ...t.steps, ...t.ask].join(" ");
  return Math.max(1, Math.round(text.split(/\s+/).length / WORDS_PER_MINUTE));
}

export function momentText(id: string, lang: "en" | "es", copy?: CopyFn): MomentText | null {
  const m = MOMENTS.find((x) => x.id === id);
  if (!m) return null;
  const spanish = lang === "es" ? MOMENTS_ES[id] : undefined;
  // An admin's rewording applies to the English text only.
  return spanish ?? (copy ? momentWithCopy(id, m.en, copy) : m.en);
}

/** One money moment: a short read for a real-life event, with Scripture, a few things to try, and questions to ask. */
export function MomentPage() {
  const { id = "" } = useParams();
  const { lang, t } = useLang();
  const copy = useCopy();
  const moment = MOMENTS.find((m) => m.id === id);
  if (!moment) return <Navigate to="/course" replace />;
  const text = momentText(id, lang, copy)!;
  const verses = moment.verses.flatMap((v) => findLibraryVerse(v.reference, v.translation) ?? []);

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <Link to="/course" className="font-[family-name:var(--font-ui)] text-sm text-ink-soft hover:text-ink">
          {t("moments.back")}
        </Link>
        <p className="t-eyebrow mt-3 flex items-center gap-2">
          <FeatureIcon name={moment.icon} size={16} />
          {t("moments.eyebrow")} · {t("moments.min", { n: momentMinutes(text) })}
        </p>
        <h1 className="t-h1 mt-1">{text.title}</h1>
        <p className="t-lead mt-3">{text.hook}</p>
      </header>

      {text.sections.map((s) => (
        <section key={s.heading} className="flex flex-col gap-3">
          <h2 className="t-h3">{s.heading}</h2>
          {s.body.map((p, i) => (
            <p key={i} className="leading-relaxed text-ink-soft">
              {p}
            </p>
          ))}
        </section>
      ))}

      <section aria-labelledby="moment-verses" className="flex flex-col gap-3">
        <h2 id="moment-verses" className="t-h3">
          {t("moments.verses")}
        </h2>
        {verses.map((v) => (
          <ScriptureQuote key={`${v.reference}-${v.translation}`} verse={v} />
        ))}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card accent="var(--color-gold)">
          <CardBody>
            <h2 className="t-h4">{t("moments.steps")}</h2>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              {text.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </CardBody>
        </Card>
        <Card accent="var(--color-water)">
          <CardBody>
            <h2 className="t-h4">{t("moments.ask")}</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              {text.ask.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <p className="font-[family-name:var(--font-ui)] text-sm">
        <Link to={moment.relatedTo} className="text-water underline underline-offset-4 hover:text-water-deep">
          {text.relatedLabel} →
        </Link>
      </p>
      <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("moments.note")}</p>
    </article>
  );
}
