import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useContent } from "../../state/ContentContext";
import { useGroups } from "../../state/useGroups";
import { useLang } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";
import { SECTIONS, guidePath, lessonPath, moduleCount, parseSection } from "../../lib/sections";
import { THEME } from "../../theme/theme";
import type { Group, GroupOverview, ModuleSection } from "../../types";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { Field, Select, TextArea, TextInput } from "../ui/Field";
import { ProgressBar } from "../ui/ProgressBar";

const ACCENT = THEME.palette.gold;

/** "Introduction" or "River 2: Saving", in the current language. */
export function useSectionLabel() {
  const { t } = useLang();
  return (section: ModuleSection) =>
    section === "introduction"
      ? t("section.introduction")
      : `${t("river.label", { n: section })}: ${t(`river.${section}.title` as StringKey)}`;
}

function friendlyJoinError(message: string, t: ReturnType<typeof useLang>["t"]): string {
  if (/group not found/i.test(message)) return t("groups.join.notFound");
  if (/group is full/i.test(message)) return t("groups.join.full");
  return t("groups.error", { message });
}

export function GroupsPage() {
  const { repository, snapshot } = useCourse();
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const { groups, loading, error, create, join, leave, remove, setFocus, toError } = useGroups(repository);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const myName = snapshot?.profile.displayName || snapshot?.profile.fullName || "";
  const myId = snapshot?.profile.userId ?? "";
  const inviteCode = params.get("join") ?? "";

  // Land on the first group once they load (or the one just created or joined).
  const selected = useMemo(
    () => groups.find((g) => g.id === selectedId) ?? groups[0] ?? null,
    [groups, selectedId],
  );

  // An invite link keeps the join form open with the code filled in.
  useEffect(() => {
    if (inviteCode) setShowAdd(true);
  }, [inviteCode]);

  const noGroups = !loading && groups.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold text-ink">{t("groups.title")}</h1>
        <p className="mt-2 max-w-2xl font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("groups.intro")}</p>
      </header>

      {error?.needsSetup && (
        <Card accent={ACCENT}>
          <CardBody>
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("groups.setup")}</p>
          </CardBody>
        </Card>
      )}
      {error && !error.needsSetup && (
        <p className="font-[family-name:var(--font-ui)] text-sm text-red-700" role="alert">
          {t("groups.error", { message: error.message })}
        </p>
      )}

      {loading && <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("common.loading")}</p>}

      {!error?.needsSetup && !loading && (
        <>
          {groups.length > 1 && (
            <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label={t("groups.yours")}>
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={selected?.id === g.id}
                  onClick={() => setSelectedId(g.id)}
                  className={`rounded-full border px-4 py-1.5 font-[family-name:var(--font-ui)] text-sm transition-colors ${
                    selected?.id === g.id
                      ? "border-water-deep bg-water-deep text-white"
                      : "border-line bg-surface text-ink-soft hover:bg-parchment-deep"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}

          {selected && (
            <GroupPanel
              key={selected.id}
              group={selected}
              myId={myId}
              onFocus={setFocus}
              onLeave={async () => {
                if (window.confirm(t("groups.leaveConfirm"))) {
                  await leave(selected.id, myId);
                  setSelectedId(null);
                }
              }}
              onDelete={async () => {
                if (window.confirm(t("groups.deleteConfirm"))) {
                  await remove(selected.id);
                  setSelectedId(null);
                }
              }}
              onRemoveMember={async (userId, name) => {
                if (window.confirm(t("groups.removeConfirm", { name }))) {
                  await repository.removeGroupMember(selected.id, userId);
                  return true;
                }
                return false;
              }}
            />
          )}

          {!noGroups && !showAdd && (
            <div>
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="rounded-lg px-3 py-2 font-[family-name:var(--font-ui)] text-sm font-medium text-water-deep hover:bg-parchment-deep"
              >
                + {t("groups.add")}
              </button>
            </div>
          )}

          {(noGroups || showAdd) && (
            <div className="grid gap-4 md:grid-cols-2">
              <StartCard
                onCreate={async (name) => {
                  const g = await create(name, myName);
                  setSelectedId(g.id);
                  setShowAdd(false);
                }}
                toError={(e) => toError(e).message}
              />
              <JoinCard
                initialCode={inviteCode}
                onJoin={async (code) => {
                  const g = await join(code, myName);
                  setSelectedId(g.id);
                  setShowAdd(false);
                  if (params.has("join")) {
                    params.delete("join");
                    setParams(params, { replace: true });
                  }
                }}
              />
            </div>
          )}
        </>
      )}

      <GuidesIndex />
    </div>
  );
}

function StartCard({
  onCreate,
  toError,
}: {
  onCreate: (name: string) => Promise<void>;
  toError: (e: unknown) => string;
}) {
  const { t } = useLang();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onCreate(name);
      setName("");
    } catch (err) {
      setError(t("groups.error", { message: toError(err) }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card accent={ACCENT}>
      <CardBody>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-ink">{t("groups.start.title")}</h2>
          <Field label={t("groups.start.name")}>
            <TextInput value={name} maxLength={60} placeholder={t("groups.start.ph")} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Button type="submit" disabled={!name.trim() || busy}>
            {busy ? t("groups.start.busy") : t("groups.start.btn")}
          </Button>
          {error && (
            <p className="font-[family-name:var(--font-ui)] text-xs text-red-700" role="alert">
              {error}
            </p>
          )}
        </form>
      </CardBody>
    </Card>
  );
}

function JoinCard({ initialCode, onJoin }: { initialCode: string; onJoin: (code: string) => Promise<void> }) {
  const { t } = useLang();
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCode) setCode(initialCode.toUpperCase());
  }, [initialCode]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onJoin(code);
      setCode("");
    } catch (err) {
      setError(friendlyJoinError(err instanceof Error ? err.message : String(err), t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card accent={ACCENT}>
      <CardBody>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-ink">{t("groups.join.title")}</h2>
          <Field label={t("groups.join.label")}>
            <TextInput
              value={code}
              maxLength={12}
              placeholder={t("groups.join.ph")}
              autoCapitalize="characters"
              autoComplete="off"
              className="font-mono uppercase tracking-[0.2em]"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </Field>
          <Button type="submit" disabled={!code.trim() || busy}>
            {busy ? t("groups.join.busy") : t("groups.join.btn")}
          </Button>
          {error && (
            <p className="font-[family-name:var(--font-ui)] text-xs text-red-700" role="alert">
              {error}
            </p>
          )}
        </form>
      </CardBody>
    </Card>
  );
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

function GroupPanel({
  group,
  myId,
  onFocus,
  onLeave,
  onDelete,
  onRemoveMember,
}: {
  group: Group;
  myId: string;
  onFocus: ReturnType<typeof useGroups>["setFocus"];
  onLeave: () => Promise<void>;
  onDelete: () => Promise<void>;
  onRemoveMember: (userId: string, name: string) => Promise<boolean>;
}) {
  const { t } = useLang();
  const { repository } = useCourse();
  const { getLesson } = useContent();
  const sectionLabel = useSectionLabel();
  const isLeader = group.leaderId === myId;
  const [overview, setOverview] = useState<GroupOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    repository
      .getGroupOverview(group.id)
      .then((o) => {
        if (!cancelled) {
          setOverview(o);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [repository, group.id, group.focusSection, group.focusModule, reloadKey]);

  const inviteLink = `${window.location.origin}/groups?join=${group.joinCode}`;
  const hasFocus = group.focusSection !== null && group.focusModule !== null;

  return (
    <div className="flex flex-col gap-5">
      <Card accent={ACCENT}>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold text-ink">{group.name}</h2>
              {isLeader && (
                <span className="rounded-full bg-gold/20 px-2 py-0.5 font-[family-name:var(--font-ui)] text-xs font-medium text-clay">
                  {t("groups.leader")}
                </span>
              )}
            </div>
            <p className="mt-2 font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.14em] text-ink-soft">
              {t("groups.code")}
            </p>
            <p className="font-mono text-2xl font-semibold tracking-[0.25em] text-ink">{group.joinCode}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={group.joinCode} label={t("groups.copyCode")} />
            <CopyButton text={inviteLink} label={t("groups.copyLink")} />
          </div>
        </CardBody>
      </Card>

      <Card accent={ACCENT}>
        <CardBody className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-ink">{t("groups.focus.title")}</h3>
          {hasFocus ? (
            <>
              <div>
                <p className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.14em] text-ink-soft">
                  {sectionLabel(group.focusSection as ModuleSection)}
                </p>
                <p className="text-xl font-semibold text-ink">
                  {getLesson(group.focusSection as ModuleSection, group.focusModule as number).title}
                </p>
                {group.focusNote && (
                  <p className="mt-2 rounded-lg bg-parchment-deep/50 px-3 py-2 text-ink-soft">{group.focusNote}</p>
                )}
              </div>
              {overview && (
                <div>
                  <p className="mb-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                    {t("groups.focus.readers", { read: overview.focusReaders, total: overview.memberCount })}
                  </p>
                  <ProgressBar
                    fraction={overview.memberCount > 0 ? overview.focusReaders / overview.memberCount : 0}
                    accent={ACCENT}
                    label={t("groups.focus.readers", { read: overview.focusReaders, total: overview.memberCount })}
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Link to={lessonPath(group.focusSection as ModuleSection, group.focusModule as number)}>
                  <Button>{t("groups.focus.open")}</Button>
                </Link>
                <Link to={guidePath(group.focusSection as ModuleSection, group.focusModule as number)}>
                  <Button variant="secondary">{t("groups.focus.guide")}</Button>
                </Link>
              </div>
            </>
          ) : (
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              {isLeader ? t("groups.focus.noneLeader") : t("groups.focus.none")}
            </p>
          )}
          {isLeader && <FocusForm group={group} onFocus={onFocus} />}
        </CardBody>
      </Card>

      {error && (
        <p className="font-[family-name:var(--font-ui)] text-sm text-red-700" role="alert">
          {t("groups.error", { message: error })}
        </p>
      )}

      {overview && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label={t("groups.stats.members")} value={overview.memberCount} />
            <Stat label={t("groups.stats.modules")} value={overview.modulesRead} />
            <Stat label={t("groups.stats.finished")} value={`${overview.finished} / ${overview.memberCount}`} />
          </div>
          <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("groups.privacy")}</p>

          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold text-ink">{t("groups.members")}</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {overview.members.map((m) => (
                  <li
                    key={m.userId}
                    className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 font-[family-name:var(--font-ui)] text-sm text-ink"
                  >
                    {m.displayName}
                    {m.isLeader && <span className="text-xs text-clay">· {t("groups.leader")}</span>}
                    {isLeader && !m.isLeader && (
                      <button
                        type="button"
                        aria-label={`${t("groups.remove")}: ${m.displayName}`}
                        title={t("groups.remove")}
                        onClick={async () => {
                          if (await onRemoveMember(m.userId, m.displayName)) setReloadKey((k) => k + 1);
                        }}
                        className="text-ink-soft hover:text-red-700"
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </>
      )}

      <div>
        {isLeader ? (
          <Button variant="danger" onClick={() => void onDelete()}>
            {t("groups.delete")}
          </Button>
        ) : (
          <Button variant="danger" onClick={() => void onLeave()}>
            {t("groups.leave")}
          </Button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardBody>
        <p className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.14em] text-ink-soft">{label}</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums text-ink">{value}</p>
      </CardBody>
    </Card>
  );
}

function FocusForm({ group, onFocus }: { group: Group; onFocus: ReturnType<typeof useGroups>["setFocus"] }) {
  const { t } = useLang();
  const { getLesson } = useContent();
  const sectionLabel = useSectionLabel();
  const current =
    group.focusSection !== null && group.focusModule !== null ? `${group.focusSection}:${group.focusModule}` : "";
  const [value, setValue] = useState(current);
  const [note, setNote] = useState(group.focusNote ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: string, nextNote: string) {
    setBusy(true);
    setError(null);
    try {
      if (!next) {
        await onFocus(group.id, { section: null, moduleIndex: null, note: null });
        setNote("");
      } else {
        const [s, i] = next.split(":");
        await onFocus(group.id, {
          section: parseSection(s),
          moduleIndex: Number(i),
          note: nextNote.trim() || null,
        });
      }
    } catch (err) {
      setError(t("groups.error", { message: err instanceof Error ? err.message : String(err) }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-parchment-deep/30 p-4">
      <Field label={t("groups.focus.pick")}>
        <Select value={value} onChange={(e) => setValue(e.target.value)}>
          <option value="">-</option>
          {SECTIONS.map((section) => (
            <optgroup key={String(section)} label={sectionLabel(section)}>
              {Array.from({ length: moduleCount(section) }, (_, i) => (
                <option key={i} value={`${section}:${i}`}>
                  {i + 1}. {getLesson(section, i).title}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>
      <Field label={t("groups.focus.note")}>
        <TextArea
          value={note}
          maxLength={400}
          placeholder={t("groups.focus.notePh")}
          className="min-h-16"
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!value || busy} onClick={() => void save(value, note)}>
          {t("groups.focus.save")}
        </Button>
        {current && (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setValue("");
              void save("", "");
            }}
          >
            {t("groups.focus.clear")}
          </Button>
        )}
      </div>
      {error && (
        <p className="font-[family-name:var(--font-ui)] text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Every lesson's discussion guide, grouped by section. Works with or without a group. */
function GuidesIndex() {
  const { t } = useLang();
  const { getLesson } = useContent();
  const sectionLabel = useSectionLabel();

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold text-ink">{t("groups.guides.title")}</h2>
        <p className="mt-1 max-w-2xl font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("groups.guides.intro")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((section) => (
          <Card key={String(section)}>
            <CardBody>
              <h3 className="text-base font-semibold text-ink">{sectionLabel(section)}</h3>
              <ol className="mt-2 flex flex-col">
                {Array.from({ length: moduleCount(section) }, (_, i) => (
                  <li key={i}>
                    <Link
                      to={guidePath(section, i)}
                      className="flex items-baseline gap-2 rounded-lg px-2 py-1.5 font-[family-name:var(--font-ui)] text-sm text-ink-soft hover:bg-parchment-deep hover:text-ink"
                    >
                      <span className="w-5 shrink-0 text-xs tabular-nums text-ink-soft/70">{i + 1}</span>
                      <span>{getLesson(section, i).title}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
