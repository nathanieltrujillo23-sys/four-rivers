import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { toGroupsError, useGroups } from "../../state/useGroups";
import { useLang } from "../../i18n/LanguageContext";
import type { Translate } from "../../i18n/LanguageContext";
import { THEME } from "../../theme/theme";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { Field, TextInput } from "../ui/Field";

const ACCENT = THEME.palette.gold;

function joinError(message: string, t: Translate): string {
  if (/group not found/i.test(message)) return t("join.notFound");
  if (/group is full/i.test(message)) return t("join.full");
  if (/joining is off/i.test(message)) return t("join.off");
  return t("community.error", { message });
}

/**
 * The front door of Community: a single prompt for the 4-digit code from a
 * group leader. Below it, a small button lets anyone ask an admin for leader
 * status; once approved, that button becomes "Generate a group code".
 */
export function CommunityPage() {
  const { repository, snapshot, reload } = useCourse();
  const { t } = useLang();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { groups, loading, error, create, join, reload: reloadGroups } = useGroups(repository);
  // Archived groups are hidden from members; their leader can restore them below.
  const archived = groups.filter((g) => g.archivedAt && g.leaderId === (snapshot?.profile.userId ?? ""));
  const active = groups.filter((g) => !g.archivedAt);

  const myName = snapshot?.profile.displayName || snapshot?.profile.fullName || "";
  const leaderStatus = snapshot?.profile.leaderStatus ?? "none";
  const isAdmin = snapshot?.profile.role === "admin";
  const canCreate = leaderStatus === "approved" || isAdmin;
  const myId = snapshot?.profile.userId ?? "";

  const [code, setCode] = useState((params.get("code") ?? "").replace(/\D/g, "").slice(0, 4));
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState<string | null>(null);

  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [askMsg, setAskMsg] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [makeBusy, setMakeBusy] = useState(false);
  const [makeMsg, setMakeMsg] = useState<string | null>(null);

  useEffect(() => {
    if (params.has("code")) {
      params.delete("code");
      setParams(params, { replace: true });
    }
    // only on first render, to tidy an invite link
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitJoin(e: FormEvent) {
    e.preventDefault();
    if (code.length !== 4) {
      setJoinMsg(t("join.invalid"));
      return;
    }
    setJoining(true);
    setJoinMsg(null);
    try {
      const g = await join(code, myName);
      navigate(`/community/${g.id}`);
    } catch (err) {
      setJoinMsg(joinError(err instanceof Error ? err.message : String(err), t));
    } finally {
      setJoining(false);
    }
  }

  async function submitRequest(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setAskMsg(null);
    try {
      await repository.requestLeader(note.trim());
      setAsking(false);
      reload();
    } catch (err) {
      setAskMsg(t("community.error", { message: err instanceof Error ? err.message : String(err) }));
    } finally {
      setSending(false);
    }
  }

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    if (!groupName.trim()) return;
    setMakeBusy(true);
    setMakeMsg(null);
    try {
      const g = await create(groupName, myName);
      navigate(`/community/${g.id}`, { state: { justCreated: true } });
    } catch (err) {
      setMakeMsg(t("community.error", { message: err instanceof Error ? err.message : String(err) }));
    } finally {
      setMakeBusy(false);
    }
  }

  const needsSetup = error?.needsSetup || (!!error && toGroupsError(error.message).needsSetup);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 py-4">
      <header className="text-center">
        <h1 className="text-3xl font-semibold text-ink">{t("community.title")}</h1>
        <p className="mt-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("community.sub")}</p>
      </header>

      {needsSetup && (
        <Card accent={ACCENT}>
          <CardBody>
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("community.setup")}</p>
          </CardBody>
        </Card>
      )}
      {error && !needsSetup && (
        <p className="text-center font-[family-name:var(--font-ui)] text-sm text-red-700" role="alert">
          {t("community.error", { message: error.message })}
        </p>
      )}

      <Card accent={ACCENT}>
        <CardBody className="flex flex-col items-center gap-4 py-8 text-center">
          <h2 className="text-2xl font-semibold text-ink">{t("join.title")}</h2>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("join.prompt")}</p>
          <form onSubmit={submitJoin} className="flex w-full max-w-xs flex-col items-center gap-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              placeholder="0000"
              aria-label={t("join.label")}
              className="w-full rounded-xl border-2 border-line bg-surface px-3 py-3 text-center font-mono text-4xl tracking-[0.5em] text-ink focus:border-water focus:outline-none"
            />
            <Button type="submit" className="w-full" disabled={joining || code.length !== 4}>
              {joining ? t("join.busy") : t("join.btn")}
            </Button>
            {joinMsg && (
              <p className="font-[family-name:var(--font-ui)] text-xs text-red-700" role="alert">
                {joinMsg}
              </p>
            )}
          </form>
        </CardBody>
      </Card>

      <div className="flex flex-col items-center gap-3">
        {canCreate ? (
          creating ? (
            <form
              onSubmit={submitCreate}
              className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-line bg-surface/60 p-4"
            >
              <h3 className="text-base font-semibold text-ink">{t("create.title")}</h3>
              <Field label={t("create.name")}>
                <TextInput
                  autoFocus
                  value={groupName}
                  maxLength={60}
                  placeholder={t("create.ph")}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </Field>
              <div className="flex gap-2">
                <Button type="submit" disabled={!groupName.trim() || makeBusy}>
                  {makeBusy ? t("create.busy") : t("create.go")}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                  {t("leader.cancel")}
                </Button>
              </div>
              {makeMsg && (
                <p className="font-[family-name:var(--font-ui)] text-xs text-red-700" role="alert">
                  {makeMsg}
                </p>
              )}
            </form>
          ) : (
            <Button variant="secondary" onClick={() => setCreating(true)}>
              {t("create.btn")}
            </Button>
          )
        ) : leaderStatus === "requested" ? (
          <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("leader.requested")}</p>
        ) : asking ? (
          <form
            onSubmit={submitRequest}
            className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-line bg-surface/60 p-4"
          >
            <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("leader.hint")}</p>
            <Field label={t("leader.noteLabel")}>
              <TextInput
                value={note}
                maxLength={300}
                placeholder={t("leader.notePh")}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={sending}>
                {sending ? t("leader.sending") : t("leader.send")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAsking(false)}>
                {t("leader.cancel")}
              </Button>
            </div>
            {askMsg && (
              <p className="font-[family-name:var(--font-ui)] text-xs text-red-700" role="alert">
                {askMsg}
              </p>
            )}
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAsking(true)}
            className="rounded-full border border-line px-4 py-1.5 font-[family-name:var(--font-ui)] text-xs text-ink-soft transition-colors hover:bg-parchment-deep hover:text-ink"
          >
            {t("leader.request")}
          </button>
        )}
      </div>

      {!loading && active.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink">{t("yours.title")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map((g) => (
              <Link key={g.id} to={`/community/${g.id}`}>
                <Card accent={ACCENT} className="transition-colors hover:bg-parchment-deep/30">
                  <CardBody className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-ink">{g.name}</p>
                      {g.leaderId === myId && (
                        <span className="font-[family-name:var(--font-ui)] text-xs text-clay">
                          {t("yours.leader")}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 font-[family-name:var(--font-ui)] text-sm text-water-deep">
                      {t("yours.open")} →
                    </span>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {archived.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink">{t("yours.archived")}</h2>
          <ul className="flex flex-col gap-2">
            {archived.map((g) => (
              <li
                key={g.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface/60 px-4 py-3 font-[family-name:var(--font-ui)] text-sm"
              >
                <span className="font-medium text-ink">{g.name}</span>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await repository.setGroupArchived(g.id, false);
                      reloadGroups();
                    } catch (err) {
                      window.alert(joinError(err instanceof Error ? err.message : String(err), t));
                    }
                  }}
                >
                  {t("yours.restore")}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
