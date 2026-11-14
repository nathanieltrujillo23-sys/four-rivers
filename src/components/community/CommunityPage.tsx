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
import { FeatureIcon } from "../ui/FeatureIcons";
import { AskForm } from "./AskForm";
import { DailyBreadPanel } from "./DailyBreadPanel";

const ACCENT = THEME.palette.gold;

/** The small outlined buttons for leader actions ("Request leader status", "Generate a group code"). */
const pillCls =
  "rounded-full border border-line px-4 py-1.5 font-[family-name:var(--font-ui)] text-xs text-ink-soft transition-colors hover:bg-parchment-deep hover:text-ink";

function joinError(message: string, t: Translate): string {
  if (/group not found/i.test(message)) return t("join.notFound");
  if (/group is full/i.test(message)) return t("join.full");
  if (/joining is off/i.test(message)) return t("join.off");
  return t("community.error", { message });
}

/**
 * Community, in two halves. On the left, community and groups for everyone: join with a leader's 4-digit code, open your
 * groups, and ask for (or use) leader status. On the right, the Daily Bread members' space: readings, the prayer wall and
 * the three tool sets, each opened, pending, or asked for.
 */
export function CommunityPage() {
  const { repository, snapshot, reload } = useCourse();
  const { t } = useLang();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { groups, loading, error, create, join, reload: reloadGroups } = useGroups(repository);
  const myId = snapshot?.profile.userId ?? "";
  // The Daily Bread group lives in its own space; archived groups are hidden from members and their leader can restore them below.
  const active = groups.filter((g) => !g.archivedAt && !g.dailyBread);
  const archived = groups.filter((g) => g.archivedAt && g.leaderId === myId);

  const myName = snapshot?.profile.displayName || snapshot?.profile.fullName || "";
  const leaderStatus = snapshot?.profile.leaderStatus ?? "none";
  const canCreate = leaderStatus === "approved" || snapshot?.profile.role === "admin";

  const [code, setCode] = useState((params.get("code") ?? "").replace(/\D/g, "").slice(0, 4));
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
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
    <div className="mx-auto flex max-w-5xl flex-col gap-8 py-4">
      <header>
        <h1 className="t-h1">{t("community.title")}</h1>
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
        <p className="font-[family-name:var(--font-ui)] text-sm text-red-700" role="alert">
          {t("community.error", { message: error.message })}
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section aria-labelledby="groups-title" className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface/80 shadow-sm">
          <div className="px-6 pb-6 pt-7">
            <p className="t-eyebrow">{t("community.groupsEyebrow")}</p>
            <h2 id="groups-title" className="mt-1.5 t-h2">
              {t("community.groupsTitle")}
            </h2>
            <p className="mt-2 font-[family-name:var(--font-ui)] text-sm leading-relaxed text-ink-soft">{t("community.groupsSub")}</p>

            <div data-tour="community-join" className="mt-5 rounded-xl border border-line bg-parchment/60 p-5">
              <h3 className="t-h4">{t("join.title")}</h3>
              <p className="mt-0.5 font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("join.prompt")}</p>
              <form onSubmit={submitJoin} className="mt-3 flex flex-wrap items-stretch gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  placeholder="0000"
                  aria-label={t("join.label")}
                  className="w-44 rounded-lg border border-line bg-surface px-3 py-2 text-center font-mono text-2xl tracking-[0.45em] text-ink focus:border-water focus:outline-none"
                />
                <Button type="submit" className="min-w-24" disabled={joining || code.length !== 4}>
                  {joining ? t("join.busy") : t("join.btn")}
                </Button>
              </form>
              <p className="mt-2 font-[family-name:var(--font-ui)] text-[11px] text-ink-soft">{t("join.privacy")}</p>
              {joinMsg && (
                <p className="mt-1 font-[family-name:var(--font-ui)] text-xs text-red-700" role="alert">
                  {joinMsg}
                </p>
              )}
            </div>
          </div>

          {!loading && active.length > 0 && (
            <div className="border-t border-line">
              <h3 className="px-6 pb-1 pt-4 font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                {t("yours.title")}
              </h3>
              <ul className="stagger divide-y divide-line">
                {active.map((g) => (
                  <li key={g.id}>
                    <Link to={`/community/${g.id}`} className="group flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-parchment-deep/40">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-parchment text-water-deep">
                        <FeatureIcon name="users" size={20} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate t-h4">{g.name}</span>
                        {g.leaderId === myId && <span className="block font-[family-name:var(--font-ui)] text-[11px] text-clay-text">{t("yours.leader")}</span>}
                      </span>
                      <span className="shrink-0 font-[family-name:var(--font-ui)] text-xs font-medium text-water-deep">
                        {t("yours.open")}
                        <FeatureIcon name="arrow" size={14} className="ml-1 inline-block align-[-2px] transition-transform duration-150 group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-line px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              {canCreate ? (
                !creating && (
                  <button type="button" onClick={() => setCreating(true)} className={pillCls}>
                    {t("create.btn")}
                  </button>
                )
              ) : leaderStatus === "requested" ? (
                <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("leader.requested")}</p>
              ) : (
                !asking && (
                  <button type="button" onClick={() => setAsking(true)} className={pillCls}>
                    {t("leader.request")}
                  </button>
                )
              )}
            </div>
            {canCreate && creating && (
              <form onSubmit={submitCreate} className="flex flex-col gap-3 rounded-xl border border-line bg-parchment/60 p-4">
                <h3 className="t-h4">{t("create.title")}</h3>
                <Field label={t("create.name")}>
                  <TextInput autoFocus value={groupName} maxLength={60} placeholder={t("create.ph")} onChange={(e) => setGroupName(e.target.value)} />
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
            )}
            {!canCreate && leaderStatus !== "requested" && asking && (
              <AskForm
                hint={t("leader.hint")}
                label={t("leader.noteLabel")}
                placeholder={t("leader.notePh")}
                onSend={async (note) => {
                  await repository.requestLeader(note);
                  setAsking(false);
                  reload();
                }}
                onCancel={() => setAsking(false)}
              />
            )}
          </div>
        </section>

        <DailyBreadPanel />
      </div>

      {archived.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="t-h4">{t("yours.archived")}</h2>
          <ul className="stagger flex flex-col gap-2">
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
