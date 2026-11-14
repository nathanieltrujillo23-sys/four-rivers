import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useLang } from "../../i18n/LanguageContext";
import type { Group, GroupMember, ReadingPlan } from "../../types";
import { isDailyBreadMember, TOOL_INFO, toolAccess } from "../../lib/dailyBread";
import { Button } from "../ui/Button";
import { FeatureIcon } from "../ui/FeatureIcons";
import { Reveal } from "../ui/Reveal";
import { PageSkeleton } from "../ui/Skeleton";
import { PrayerWall } from "./PrayerWall";
import { GroupChat } from "./GroupChat";
import { MemberDirectory } from "./MemberDirectory";
import { WeeklyBrief } from "./WeeklyBrief";
import { ReadingCalendar } from "./ReadingCalendar";
import { ReadingToday } from "./ReadingToday";
import { VerseOfDay } from "./VerseOfDay";

type Space = { state: "loading" } | { state: "ready"; group: Group } | { state: "none" } | { state: "sql" } | { state: "error"; message: string };

/**
 * The Daily Bread members' space: today's reading (or the verse of the day), the in-house software for the three tracks,
 * and the prayer wall. The readings and the wall belong to one private group that members are added to when they open
 * this page; an admin makes it once from here.
 */
export function DailyBreadPage() {
  const { repository, snapshot } = useCourse();
  const { t } = useLang();
  const profile = snapshot?.profile;
  const member = isDailyBreadMember(profile);
  const isAdmin = profile?.role === "admin";
  const myId = profile?.userId ?? "";
  const myName = profile?.displayName || profile?.fullName || "";
  const [space, setSpace] = useState<Space>({ state: "loading" });
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [plan, setPlan] = useState<ReadingPlan | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!member) return;
    let alive = true;
    repository
      .joinDailyBread(myName)
      .then((g) => alive && setSpace(g ? { state: "ready", group: g } : { state: "none" }))
      .catch((err: unknown) => {
        if (!alive) return;
        const message = err instanceof Error ? err.message : String(err);
        setSpace(/join_daily_bread|daily_bread/.test(message) && /(schema cache|does not exist|Could not find)/i.test(message) ? { state: "sql" } : { state: "error", message });
      });
    return () => {
      alive = false;
    };
  }, [repository, member, myName]);

  const group = space.state === "ready" ? space.group : null;
  useEffect(() => {
    if (!group) return;
    let alive = true;
    repository
      .getReadingPlan(group.id)
      .then((p) => alive && setPlan(p))
      .catch(() => alive && setPlan({ title: null, days: [] }));
    repository
      .getGroupMembers(group.id)
      .then((rows) => alive && setMembers(rows))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [repository, group]);

  async function setUp() {
    setBusy(true);
    try {
      setSpace({ state: "ready", group: await repository.createDailyBreadGroup(myName) });
    } catch (err) {
      setSpace({ state: "error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  if (!snapshot) return <PageSkeleton label={t("common.loading")} />;

  const isLeader = !!group && (group.leaderId === myId || members.some((m) => m.userId === myId && m.isCoLeader));
  const hasPlan = !!plan && plan.days.length > 0;
  const tools = toolAccess(profile).filter((r) => r.status !== "unavailable");
  const wealthOpen = tools.some((r) => r.tool === "wealth" && r.open);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 py-4">
      <header className="relative overflow-hidden rounded-2xl bg-water-deep px-6 py-8 text-white shadow-sm sm:px-8">
        <svg aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-72 w-72 opacity-20" viewBox="0 0 200 200" fill="none">
          {[90, 70, 50, 30].map((r) => (
            <circle key={r} cx="100" cy="100" r={r} stroke="currentColor" strokeWidth="1" />
          ))}
        </svg>
        <Link to="/community" className="relative font-[family-name:var(--font-ui)] text-sm text-white hover:text-white">
          {t("dbp.back")}
        </Link>
        <p className="relative mt-4 font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-[0.16em] text-white">{t("db.title")}</p>
        <h1 className="relative mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-white">Daily Bread</h1>
        <p className="relative mt-2 max-w-xl font-[family-name:var(--font-ui)] text-sm leading-relaxed text-white">{t("dbp.sub")}</p>
        {isLeader && group && (
          <Link
            to={`/community/${group.id}/leader`}
            className="relative mt-5 inline-flex items-center gap-2 rounded-lg border border-white/40 px-3 py-1.5 font-[family-name:var(--font-ui)] text-xs font-medium text-white transition-colors hover:bg-white/10"
          >
            {t("dbp.manage")}
            <FeatureIcon name="arrow" size={14} />
          </Link>
        )}
      </header>

      {!member ? (
        <p className="rounded-xl border border-line bg-surface/70 px-5 py-4 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          {t("dbp.noAccess")}{" "}
          <Link to="/community" className="text-water-deep underline">
            {t("dbp.back").replace("← ", "")}
          </Link>
        </p>
      ) : (
        <>
          <WeeklyBrief isAdmin={isAdmin} />

          <section aria-labelledby="dbp-today" className="flex flex-col gap-4">
            <h2 id="dbp-today" className="t-h3">
              {t("dbp.today")}
            </h2>
            {space.state === "loading" && <PageSkeleton label={t("common.loading")} cards={1} />}
            {space.state === "none" && (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line px-5 py-4">
                <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{isAdmin ? t("dbp.notSetUpAdmin") : t("dbp.notSetUp")}</p>
                {isAdmin && (
                  <Button onClick={setUp} disabled={busy}>
                    {busy ? t("dbp.setUpBusy") : t("dbp.setUp")}
                  </Button>
                )}
              </div>
            )}
            {space.state === "sql" && (
              <p className="rounded-xl border border-dashed border-line px-5 py-4 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                {isAdmin ? t("dbp.needsSql") : t("dbp.notSetUp")}
              </p>
            )}
            {space.state === "error" && (
              <p role="alert" className="font-[family-name:var(--font-ui)] text-sm text-red-700">
                {t("community.error", { message: space.message })}
              </p>
            )}
            {group && plan && (
              <>
                {(group.verseLocked || !hasPlan) && <VerseOfDay group={group} isLeader={isLeader} />}
                {hasPlan && (
                  <>
                    <ReadingToday group={group} plan={plan} members={members} myId={myId} />
                    <ReadingCalendar group={group} isLeader={isLeader} plan={plan} />
                  </>
                )}
              </>
            )}
          </section>

          <section aria-labelledby="dbp-software" className="flex flex-col gap-4">
            <div>
              <h2 id="dbp-software" className="t-h3">
                {t("dbp.software")}
              </h2>
              <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("dbp.softwareSub")}</p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-3">
              {tools.map(({ tool, status, open }) => {
                const info = TOOL_INFO[tool];
                return (
                  <li key={tool} className="flex flex-col rounded-2xl border border-line bg-surface/80 p-5 shadow-sm">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-water-deep text-white">
                      <FeatureIcon name={info.icon} size={22} />
                    </span>
                    <h3 className="mt-4 t-h4">{info.name}</h3>
                    <p className="mt-1 flex-1 font-[family-name:var(--font-ui)] text-xs leading-relaxed text-ink-soft">{t(info.line)}</p>
                    <div className="mt-4">
                      {open ? (
                        <Link
                          to={info.path}
                          aria-label={t(`${tool}.open`)}
                          className="group inline-flex items-center gap-1.5 font-[family-name:var(--font-ui)] text-sm font-medium text-water-deep"
                        >
                          {t("dbp.open")}
                          <FeatureIcon name="arrow" size={16} className="transition-transform duration-150 group-hover:translate-x-0.5" />
                        </Link>
                      ) : (
                        <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{status === "requested" ? t(`${tool}.requested`) : t("db.locked")}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {wealthOpen && (
              <nav aria-label={t("dbp.also")} className="flex flex-wrap items-center gap-x-5 gap-y-2 font-[family-name:var(--font-ui)] text-sm">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">{t("dbp.also")}</span>
                {(
                  [
                    ["/community/wealth/models", "dbp.models"],
                    ["/community/wealth/prep", "dbp.prep"],
                    ["/community/wealth/cases", "dbp.cases"],
                    ["/community/wealth/house", "dbp.house"],
                  ] as const
                ).map(([to, key]) => (
                  <Link key={to} to={to} className="text-water-deep hover:underline">
                    {t(key)}
                  </Link>
                ))}
              </nav>
            )}
          </section>

          <div className={`grid items-start gap-6 ${group ? "lg:grid-cols-[minmax(0,1fr)_340px]" : ""}`}>
            {group && <GroupChat group={group} myId={myId} isLeader={isLeader} members={members} />}
            <MemberDirectory />
          </div>

          {group && (
            <Reveal>
              <PrayerWall group={group} isLeader={isLeader} />
            </Reveal>
          )}
        </>
      )}
    </div>
  );
}
