import { useLang } from "../../i18n/LanguageContext";

/** The two walkthroughs under "See it in action" (made by tools/dev/record-walkthroughs.mjs; replace the files in public/videos/ to use your own). */
const VIDEOS = [
  { id: "course", title: "show.v1.title", text: "show.v1.text", len: "show.v1.len", poster: "show.v1.alt", script: "show.v1.script" },
  { id: "tools", title: "show.v2.title", text: "show.v2.text", len: "show.v2.len", poster: "show.v2.alt", script: "show.v2.script" },
] as const;

export function VideoShowcase() {
  const { t } = useLang();
  return (
    <section aria-labelledby="show-title" className="text-center">
      <h2 id="show-title" className="t-h1">
        {t("show.title")}
      </h2>
      <p className="t-lead mx-auto mt-3 max-w-xl">{t("show.sub")}</p>
      <div className="mt-10 grid gap-8 text-left lg:grid-cols-2">
        {VIDEOS.map((v) => (
          <article key={v.id} className="panel overflow-hidden" aria-labelledby={`vid-${v.id}-title`}>
            <video
              className="block aspect-video w-full bg-ink"
              controls
              playsInline
              preload="none"
              poster={`/videos/${v.id}-poster.jpg`}
              aria-label={t(v.poster)}
              aria-describedby={`vid-${v.id}-script`}
            >
              <source src={`/videos/${v.id}.mp4`} type="video/mp4" />
            </video>
            <div className="px-5 pb-5 pt-4">
              <h3 id={`vid-${v.id}-title`} className="t-h3">
                {t(v.title)}
              </h3>
              <p className="mt-1 font-[family-name:var(--font-ui)] text-xs font-medium uppercase tracking-wider text-ink-soft">
                {t(v.len)}
              </p>
              <p className="mt-2 font-[family-name:var(--font-ui)] text-sm leading-relaxed text-ink-soft">{t(v.text)}</p>
              <details className="mt-3 font-[family-name:var(--font-ui)] text-sm">
                <summary className="cursor-pointer font-medium text-water-deep">{t("show.transcript")}</summary>
                <p id={`vid-${v.id}-script`} className="mt-2 leading-relaxed text-ink-soft">
                  {t(v.script)}
                </p>
              </details>
            </div>
          </article>
        ))}
      </div>
      <p className="mx-auto mt-5 max-w-xl font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("show.note")}</p>
    </section>
  );
}
