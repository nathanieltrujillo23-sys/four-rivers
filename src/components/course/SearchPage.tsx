import { useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { canUseSearch } from "../../state/progress";
import { useContent } from "../../state/ContentContext";
import { useLang } from "../../i18n/LanguageContext";
import { queryWords, searchLessons, type LessonHit } from "../../lib/lessonSearch";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { TextInput } from "../ui/Field";

/** Shows a snippet with {{matched}} words as <mark>. */
function Snippet({ text }: { text: string }) {
  const parts = text.split(/(\{\{.*?\}\})/g);
  return (
    <p className="text-sm text-ink-soft">
      {parts.map((p, i) =>
        p.startsWith("{{") ? (
          <mark key={i} className="rounded bg-gold/30 px-0.5 text-ink">
            {p.slice(2, -2)}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </p>
  );
}

function hrefFor(hit: LessonHit): string {
  return hit.section === "introduction"
    ? `/course/introduction/module/${hit.moduleIndex + 1}`
    : `/course/river/${hit.section}/module/${hit.moduleIndex + 1}`;
}

/** Search across every lesson in the chosen language (including any text an admin edited). */
export function SearchPage() {
  const { t } = useLang();
  const { snapshot, loading } = useCourse();
  const { getIntroduction, getRiver } = useContent();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const [draft, setDraft] = useState(query);

  const hits = useMemo(
    () =>
      searchLessons(
        [
          { section: "introduction", lessons: getIntroduction().lessons },
          ...([1, 2, 3, 4] as const).map((n) => ({ section: n, lessons: getRiver(n).lessons })),
        ],
        query,
      ),
    [query, getIntroduction, getRiver],
  );
  const searched = queryWords(query).length > 0;

  if (loading && !snapshot) return null;
  if (!snapshot || !canUseSearch(snapshot)) return <Navigate to="/course" replace />;

  function submit(e: FormEvent) {
    e.preventDefault();
    setParams(draft.trim() ? { q: draft.trim() } : {});
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-semibold text-ink">{t("search.title")}</h1>
      <form onSubmit={submit} role="search" className="flex flex-wrap gap-2">
        <div className="min-w-60 flex-1">
          <TextInput
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("search.ph")}
            autoComplete="off"
            aria-label={t("search.title")}
            autoFocus
          />
        </div>
        <Button type="submit">{t("search.go")}</Button>
      </form>

      <p role="status" className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
        {!searched
          ? query
            ? t("search.hint")
            : ""
          : hits.length === 0
            ? t("search.none")
            : hits.length === 1
              ? t("search.countOne")
              : t("search.count", { n: hits.length })}
      </p>

      <ul className="flex flex-col gap-3">
        {hits.map((hit) => (
          <li key={`${hit.section}-${hit.moduleIndex}`}>
            <Link
              to={hrefFor(hit)}
              className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Card className="transition-colors hover:bg-parchment-deep/30">
                <CardBody className="flex flex-col gap-1">
                  <span className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-wide text-clay">
                    {hit.section === "introduction"
                      ? t("search.intro")
                      : t("search.river", { n: hit.section })}
                  </span>
                  <span className="text-lg font-semibold text-ink">{hit.title}</span>
                  <Snippet text={hit.snippet} />
                </CardBody>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
