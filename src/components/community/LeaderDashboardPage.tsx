import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useGroups } from "../../state/useGroups";
import { useLang } from "../../i18n/LanguageContext";
import { findLibraryVerse } from "../../content/verseLibrary";
import { localizedVerse, SPANISH_VERSION } from "../../content/scriptureEs";
import type { GroupMember, ScriptureRef } from "../../types";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { Field, TextArea, TextInput } from "../ui/Field";
import { QrCode } from "../ui/QrCode";
import { ReadingPlanBuilder } from "./ReadingPlanBuilder";
import { supabase } from "../../lib/supabaseClient";
import {
  FULL_BIBLE,
  completeVerse,
  searchScripture,
  type SearchOutcome,
  type VersionFilter,
} from "../../lib/bibleSearch";

const VERSIONS = ["KJV", "NIV", "NLT", "ESV"] as const;

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const { t } = useLang();
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          window.setTimeout(() => setDone(false), 1800);
        } catch {
          window.prompt(label, text);
        }
      }}
    >
      {done ? t("common.copied") : label}
    </Button>
  );
}

/**
 * The leader's control room for one group: the 4-digit code, the verse of the
 * day (picked from the course's own scripture library, so only the approved
 * translations can appear), the roster, and the danger zone.
 */
export function LeaderDashboardPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { repository, snapshot } = useCourse();
  const { lang, t } = useLang();
  const { groups, loading, setVerse, remove } = useGroups(repository);
  const [members, setMembers] = useState<GroupMember[]>([]);

  const group = groups.find((g) => g.id === groupId);
  const myId = snapshot?.profile.userId ?? "";

  const [day, setDay] = useState("");
  const [query, setQuery] = useState("");
  const [version, setVersion] = useState<VersionFilter>("all");
  const [outcome, setOutcome] = useState<SearchOutcome>({ results: [], note: null });
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<ScriptureRef | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Start the form from whatever is currently shared.
  useEffect(() => {
    if (!group) return;
    const v = group.verse;
    setDay(v?.day ? String(v.day) : "");
    setPicked(
      v
        ? (findLibraryVerse(v.reference, v.translation) ??
            (v.text ? { reference: v.reference, translation: v.translation, text: v.text } : null))
        : null,
    );
    setNote(v?.note ?? "");
    // only when the group first loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id]);

  useEffect(() => {
    if (!group) return;
    repository
      .getGroupMembers(group.id)
      .then(setMembers)
      .catch(() => {});
  }, [repository, group]);

  // Typing searches after a short pause: the course library instantly, the whole Bible via KJV text or the server.
  useEffect(() => {
    let current = true;
    const timer = window.setTimeout(
      async () => {
        setSearching(true);
        const out = await searchScripture({ query, version, lang, getToken });
        if (!current) return;
        setOutcome(out);
        setSearching(false);
      },
      query.trim() ? 350 : 0,
    );
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [query, version, lang]);

  const results = outcome.results;

  if (loading)
    return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("common.loading")}</p>;
  if (!group || group.leaderId !== myId)
    return <Navigate to={group ? `/community/${group.id}` : "/community"} replace />;

  async function share() {
    if (!picked || !group) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const n = parseInt(day, 10);
      await setVerse(group.id, {
        day: Number.isFinite(n) && n > 0 ? Math.min(n, 999) : null,
        reference: picked.reference,
        translation: picked.translation,
        // Course verses are looked up by reference; anything else carries its own text.
        text: findLibraryVerse(picked.reference, picked.translation) ? null : picked.text,
        note: note.trim() || null,
      });
      setSaved(true);
    } catch (err) {
      setError(t("community.error", { message: err instanceof Error ? err.message : String(err) }));
    } finally {
      setBusy(false);
    }
  }

  async function clearVerse() {
    if (!group) return;
    setBusy(true);
    try {
      await setVerse(group.id, null);
      setPicked(null);
      setDay("");
      setNote("");
      setSaved(false);
    } finally {
      setBusy(false);
    }
  }

  const inviteLink = `${window.location.origin}/community?code=${group.joinCode}`;
  const pickedShown = picked ? localizedVerse(picked, lang) : null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link
          to={`/community/${group.id}`}
          className="font-[family-name:var(--font-ui)] text-sm text-ink-soft hover:text-ink"
        >
          {t("ld.back")}
        </Link>
        <h1 className="mt-1 text-3xl font-semibold text-ink">{t("ld.title")}</h1>
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{group.name}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card accent="var(--color-gold)">
          <CardBody className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-ink">{t("ld.codeTitle")}</h2>
            <p className="font-mono text-5xl font-semibold tracking-[0.35em] text-ink">{group.joinCode}</p>
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("ld.codeHint")}</p>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={group.joinCode} label={t("ld.copyCode")} />
              <CopyButton text={inviteLink} label={t("ld.copyLink")} />
            </div>
            <div className="mt-1 flex items-center gap-4 border-t border-line pt-4">
              {/* White tile so the code scans in dark mode too. */}
              <div className="shrink-0 rounded-xl bg-white p-1.5 shadow-sm">
                <QrCode value={inviteLink} size={132} color="#274b6d" label={t("ld.qrAria")} />
              </div>
              <div>
                <p className="font-semibold text-ink">{t("ld.qrTitle")}</p>
                <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("ld.qrHint")}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-ink">
              {t("ld.membersTitle")}{" "}
              <span className="text-sm font-normal text-ink-soft">({members.length})</span>
            </h2>
            <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
              {members.map((m) => (
                <li
                  key={m.userId}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 font-[family-name:var(--font-ui)] text-sm text-ink"
                >
                  <span className="truncate">{m.displayName}</span>
                  {m.isLeader ? (
                    <span className="text-xs text-clay">{t("members.leader")}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(t("ld.removeConfirm", { name: m.displayName }))) return;
                        await repository.removeGroupMember(group.id, m.userId);
                        setMembers((prev) => prev.filter((x) => x.userId !== m.userId));
                      }}
                      className="text-xs text-ink-soft hover:text-red-700"
                    >
                      {t("ld.remove")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <Card accent="var(--color-gold)">
        <CardBody className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{t("ld.verseTitle")}</h2>
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("ld.verseHint")}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-[160px_1fr]">
            <Field label={t("ld.day")}>
              <TextInput
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                value={day}
                onChange={(e) => setDay(e.target.value)}
                placeholder="12"
              />
            </Field>
            <div className="flex items-end">
              <Button
                variant="ghost"
                onClick={() => setDay(String((parseInt(day, 10) || 0) + 1))}
                type="button"
              >
                {t("ld.nextDay")}
              </Button>
            </div>
          </div>

          <div role="group" aria-label={t("ld.version")} className="flex flex-wrap items-center gap-2">
            <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              {t("ld.version")}:
            </span>
            {(["all", ...VERSIONS] as const).map((v) => {
              const on = version === v;
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setVersion(v)}
                  className={`rounded-full border px-3 py-1 font-[family-name:var(--font-ui)] text-sm transition-colors ${
                    on
                      ? "border-water-deep bg-water-deep text-white"
                      : "border-line bg-surface text-ink-soft hover:bg-parchment-deep"
                  }`}
                >
                  {v === "all" ? t("ld.version.all") : lang === "es" ? SPANISH_VERSION[v] : v}
                </button>
              );
            })}
          </div>

          <Field label={t("ld.search")}>
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("ld.searchPh")}
            />
          </Field>

          <ul
            className="flex max-h-72 flex-col gap-2 overflow-y-auto rounded-xl bg-parchment-deep/30 p-2"
            role="listbox"
            aria-label={t("ld.search")}
          >
            {results.length === 0 && (
              <li className="px-2 py-3 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                {searching ? t("ld.searching") : t("ld.noResults")}
              </li>
            )}
            {results.map((v) => {
              const s = localizedVerse(v, lang);
              const active = picked?.reference === v.reference && picked.translation === v.translation;
              return (
                <li key={`${v.reference}|${v.translation}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={async () => {
                      setSaved(false);
                      setPicked(await completeVerse(v, getToken));
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                      active
                        ? "border-water-deep bg-water-deep/10"
                        : "border-line bg-surface hover:bg-parchment-deep/50"
                    }`}
                  >
                    <span className="block font-[family-name:var(--font-ui)] text-xs font-semibold text-ink-soft">
                      {s.reference} ({s.version})
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-sm text-ink">{s.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
            <p>{t(FULL_BIBLE.includes(version as never) ? "ld.hint.full" : "ld.hint.library")}</p>
            {outcome.note && (
              <p className={outcome.note === "more" ? "" : "text-clay"} role="status">
                {t(`ld.note.${outcome.note}`, { version, n: results.length, total: outcome.total ?? 0 })}
              </p>
            )}
            {lang === "es" && FULL_BIBLE.includes(version as never) && <p>{t("ld.note.english")}</p>}
          </div>

          {pickedShown && (
            <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
              {t("ld.pickedPreview")}: {pickedShown.reference} ({pickedShown.version})
            </p>
          )}

          <Field label={t("ld.note")}>
            <TextArea
              value={note}
              maxLength={300}
              placeholder={t("ld.notePh")}
              className="min-h-20"
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={!picked || busy} onClick={() => void share()}>
              {t("ld.share")}
            </Button>
            {group.verse && (
              <Button variant="ghost" disabled={busy} onClick={() => void clearVerse()}>
                {t("ld.clear")}
              </Button>
            )}
            {saved && (
              <span className="font-[family-name:var(--font-ui)] text-sm text-olive">{t("ld.saved")}</span>
            )}
          </div>
          {error && (
            <p className="font-[family-name:var(--font-ui)] text-xs text-red-700" role="alert">
              {error}
            </p>
          )}
        </CardBody>
      </Card>

      <ReadingPlanBuilder group={group} />

      <div>
        <Button
          variant="danger"
          onClick={async () => {
            if (!window.confirm(t("ld.deleteConfirm"))) return;
            await remove(group.id);
            navigate("/community");
          }}
        >
          {t("ld.deleteGroup")}
        </Button>
      </div>
    </div>
  );
}
