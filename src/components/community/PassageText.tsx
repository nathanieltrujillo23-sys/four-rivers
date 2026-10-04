import type { PassageText as Chapter } from "../../lib/bibleSearch";

/** A passage laid out for reading: verse numbers in small type, new paragraphs at natural breaks. */
export function PassageBody({
  chapters,
  breaks,
  chapterLabel,
  size = "text-lg",
}: {
  chapters: Chapter[];
  breaks: (chapter: number) => number[];
  /** Shows "Chapter N" above each chapter when given. */
  chapterLabel?: (chapter: number) => string;
  size?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {chapters.map(({ chapter, verses }) => {
        const cuts = new Set(breaks(chapter));
        const paragraphs: Chapter["verses"][] = [];
        for (const v of verses) {
          if (paragraphs.length === 0 || cuts.has(v.v)) paragraphs.push([]);
          paragraphs[paragraphs.length - 1].push(v);
        }
        return (
          <div key={chapter} className="flex flex-col gap-3">
            {chapterLabel && (
              <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-ink">
                {chapterLabel(chapter)}
              </h3>
            )}
            {paragraphs.map((para, i) => (
              <p key={i} className={`${size} leading-relaxed text-ink`}>
                {para.map((v) => (
                  <span key={v.v}>
                    <sup className="mr-0.5 font-[family-name:var(--font-ui)] text-[0.6em] font-semibold text-clay">
                      {v.v}
                    </sup>
                    {v.text}{" "}
                  </span>
                ))}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
}
