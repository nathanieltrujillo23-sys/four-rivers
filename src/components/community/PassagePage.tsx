import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useLang } from "../../i18n/LanguageContext";
import { localizePassages, localizeReference } from "../../i18n/books";
import { BIBLE_BOOKS } from "../../lib/bibleBooks";
import { fetchPassage, getAccessToken, type PassageText, type SearchNote } from "../../lib/bibleSearch";
import { loadBibleShape } from "../../lib/kjv";
import { parseISO, parsePassage, type BibleShape, type Passage } from "../../lib/readingPlan";
import type { Translation } from "../../types";
import { Card, CardBody } from "../ui/Card";
import { PassageBody } from "./PassageText";

const VERSIONS: Translation[] = ["KJV", "NIV", "ESV", "NLT"];

interface Loaded {
  label: string;
  passage: Passage;
  chapters: PassageText[];
}

/**
 * A reading on a page of its own: the whole passage, in KJV, ESV, or NLT. The
 * KJV is built in; ESV and NLT come through the server once its keys are set.
 */
export function PassagePage() {
  const { groupId } = useParams();
  const [params] = useSearchParams();
  const { lang, t } = useLang();
  const passages = params.get("p") ?? "";
  const date = params.get("d");
  const [version, setVersion] = useState<Translation>("KJV");
  const [shape, setShape] = useState<BibleShape | null>(null);
  // The result remembers which reading and version it is for, so a stale one never shows.
  const key = `${passages}|${version}`;
  const [result, setResult] = useState<{
    key: string;
    loaded: Loaded[] | null;
    note: SearchNote | null;
    failed: boolean;
  } | null>(null);
  const current = result?.key === key ? result : null;
  const loaded = current?.loaded ?? null;
  const note = current?.note ?? null;
  const failed = current?.failed ?? false;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await loadBibleShape();
        if (!alive) return;
        setShape(s);
        const out: Loaded[] = [];
        for (const label of passages.split("; ")) {
          const passage = parsePassage(label, s);
          if (!passage) continue;
          const r = await fetchPassage(passage, version, getAccessToken);
          if (r.note) {
            if (alive) setResult({ key, loaded: null, note: r.note, failed: false });
            return;
          }
          out.push({ label, passage, chapters: r.chapters });
        }
        if (alive) setResult({ key, loaded: out, note: null, failed: false });
      } catch {
        if (alive) setResult({ key, loaded: null, note: null, failed: true });
      }
    })();
    return () => {
      alive = false;
    };
  }, [passages, version, key]);

  const dateText = date
    ? new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(parseISO(date))
    : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <Link
          to={`/community/${groupId}`}
          className="font-[family-name:var(--font-ui)] text-sm text-ink-soft hover:text-ink"
        >
          {t("read.back")}
        </Link>
        <h1 className="mt-1 text-3xl font-semibold text-ink">{localizePassages(passages, lang)}</h1>
        {dateText && <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{dateText}</p>}
      </header>

      <div role="group" aria-label={t("ld.version")} className="flex flex-wrap items-center gap-2">
        <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("ld.version")}:</span>
        {VERSIONS.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={version === v}
            onClick={() => setVersion(v)}
            className={`rounded-full border px-3 py-1 font-[family-name:var(--font-ui)] text-sm transition-colors ${
              version === v
                ? "border-water-deep bg-water-deep text-white"
                : "border-line bg-surface text-ink-soft hover:bg-parchment-deep"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      {lang === "es" && (
        <p className="-mt-3 font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("read.english")}</p>
      )}

      <Card>
        <CardBody className="flex flex-col gap-8">
          {note ? (
            <p className="font-[family-name:var(--font-ui)] text-sm text-clay" role="status">
              {t(`ld.note.${note}`, { version })}
            </p>
          ) : failed ? (
            <p className="font-[family-name:var(--font-ui)] text-sm text-red-700" role="alert">
              {t("plan.loadError")}
            </p>
          ) : !loaded || !shape ? (
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("read.loading")}</p>
          ) : loaded.length === 0 ? (
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("ld.noResults")}</p>
          ) : (
            loaded.map((part) => (
              <section key={part.label} className="flex flex-col gap-3">
                {loaded.length > 1 && (
                  <h2 className="border-b border-line pb-1 font-[family-name:var(--font-ui)] text-sm font-semibold uppercase tracking-wide text-clay">
                    {localizeReference(part.label, lang)}
                  </h2>
                )}
                <PassageBody
                  chapters={part.chapters}
                  breaks={(c) => shape.breaks(part.passage.book, c)}
                  chapterLabel={
                    part.chapters.length > 1 || part.passage.fromVerse !== 1
                      ? (c) => localizeReference(`${bookName(part.passage)} ${c}`, lang)
                      : undefined
                  }
                />
              </section>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function bookName(p: Passage): string {
  return BIBLE_BOOKS[p.book].ref;
}
