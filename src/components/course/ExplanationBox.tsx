import { Link } from "react-router-dom";
import { useLang } from "../../i18n/LanguageContext";
import { useCopy } from "../../lib/copy";
import { explanationFor } from "../../content/explain";
import type { ExplanationSet } from "../../content/explanations";

/**
 * Why the right answer is right, with the lesson's own verse and a link back to the lesson. A wrong answer shows it open;
 * a right answer keeps it folded away, so the page stays calm for people who already got it.
 */
export function ExplanationBox({ set, index, correct }: { set: ExplanationSet; index: number; correct: boolean }) {
  const { lang, t } = useLang();
  const copy = useCopy();
  const e = explanationFor(set, index, lang);
  if (!e) return null;
  // An admin's rewording applies to the English text only.
  const why = lang === "en" ? copy(`explain:${set}:${index}`, e.why) : e.why;

  const body = (
    <div className="flex flex-col gap-2 font-[family-name:var(--font-ui)] text-sm">
      <p className="leading-relaxed text-ink">{why}</p>
      {e.verse && (
        <blockquote className="border-l-2 border-gold pl-3 font-[family-name:var(--font-body)] text-ink-soft">
          “{e.verse.text}”
          <footer className="font-[family-name:var(--font-ui)] text-xs">
            {e.verse.reference} ({e.verse.version})
          </footer>
        </blockquote>
      )}
      <Link to={e.href} className="text-water underline underline-offset-4 hover:text-water-deep">
        {t("quiz.readLesson", { title: e.lessonTitle })}
      </Link>
    </div>
  );

  return correct ? (
    <details className="rounded-lg bg-parchment-deep/40 px-3 py-2">
      <summary className="cursor-pointer font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
        {t("quiz.whyRight")}
      </summary>
      <div className="mt-2">{body}</div>
    </details>
  ) : (
    <div role="note" className="rounded-lg border border-gold/60 bg-gold/10 px-3 py-3">
      <p className="mb-1 font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-clay">
        {t("quiz.whyHeading")}
      </p>
      {body}
    </div>
  );
}
