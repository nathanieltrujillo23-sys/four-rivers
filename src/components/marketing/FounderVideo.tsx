import { useLang } from "../../i18n/LanguageContext";

/**
 * The founder video (Update 39), above "What you'll learn". Hidden until a recording exists: set `src` (and the
 * caption files) below and it appears. The script and recording guide are in docs/founder-video-script.md.
 */
export const FOUNDER_VIDEO: { src: string | null; poster?: string; captionsEn?: string; captionsEs?: string } = {
  src: null,
};

export function FounderVideo() {
  const { t, lang } = useLang();
  if (!FOUNDER_VIDEO.src) return null;
  return (
    <section aria-labelledby="founder-video-title" className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="text-center">
        <p className="cm-label">{t("founderVideo.eyebrow")}</p>
        <h2 id="founder-video-title" className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
          {t("founderVideo.title")}
        </h2>
      </div>
      <div className="cm-card overflow-hidden">
        <video controls preload="metadata" playsInline poster={FOUNDER_VIDEO.poster} className="block aspect-video w-full bg-black">
          <source src={FOUNDER_VIDEO.src} />
          {FOUNDER_VIDEO.captionsEn && <track kind="captions" src={FOUNDER_VIDEO.captionsEn} srcLang="en" label="English" default={lang === "en"} />}
          {FOUNDER_VIDEO.captionsEs && <track kind="captions" src={FOUNDER_VIDEO.captionsEs} srcLang="es" label="Español" default={lang === "es"} />}
        </video>
      </div>
      <details className="cm-inset px-4 py-3 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
        <summary className="cursor-pointer font-medium text-ink">{t("founderVideo.transcript")}</summary>
        <p className="mt-2 leading-relaxed">{t("founderVideo.transcriptText")}</p>
      </details>
    </section>
  );
}
