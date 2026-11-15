import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useLang } from "../../i18n/LanguageContext";
import type { Group, GroupMember, ReadingPlan } from "../../types";
import { isDailyBreadMember, TOOL_INFO, toolAccess, type DailyBreadTool } from "../../lib/dailyBread";
import { OptionCard, SectionHead, SpaceBanner, type OptionLink } from "./CommunityKit";
import { Button } from "../ui/Button";
import { FeatureIcon } from "../ui/FeatureIcons";
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
 * The Daily Bread members' space: three ways in at the top (work with a client, do a case study, use the tools), then
 * the chat and the prayer wall, with the members, the weekly brief and the verse of the day beside them. The readings and the wall belong to one private group that members are added to when they open
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
  const open = (k: DailyBreadTool) => tools.some((r) => r.tool === k && r.open);
  const openTools = tools.filter((r) => r.open);

  const caseLinks: OptionLink[] = [
    ...(open("wealth") ? [{ to: "/community/wealth/cases?tab=practice", label: t("dbp.case.wealth"), note: t("dbp.case.wealthNote") }] : []),
    ...(open("ib") ? [{ to: "/community/ib?tab=cases", label: t("dbp.case.ib"), note: t("dbp.case.ibNote") }] : []),
    ...(open("consulting") ? [{ to: "/community/consulting?tab=mock", label: t("dbp.case.consulting"), note: t("dbp.case.consultingNote") }] : []),
  ];
  const toolLinks: OptionLink[] = openTools.map(({ tool }) => ({ to: TOOL_INFO[tool].path, label: TOOL_INFO[tool].name, ariaLabel: t(`${tool}.open`) }));
  const locked = <span>{t("dbp.lockedOption")}</span>;

  const setupNote =
    space.state === "loading" ? (
      <PageSkeleton label={t("common.loading")} cards={1} />
    ) : space.state === "none" ? (
      <div className="cm-card flex flex-col items-start gap-3 p-5">
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{isAdmin ? t("dbp.notSetUpAdmin") : t("dbp.notSetUp")}</p>
        {isAdmin && (
          <Button onClick={setUp} disabled={busy}>
            {busy ? t("dbp.setUpBusy") : t("dbp.setUp")}
          </Button>
        )}
      </div>
    ) : space.state === "sql" ? (
      <p className="cm-card p-5 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{isAdmin ? t("dbp.needsSql") : t("dbp.notSetUp")}</p>
    ) : space.state === "error" ? (
      <p role="alert" className="font-[family-name:var(--font-ui)] text-sm text-red-700">
        {t("community.error", { message: space.message })}
      </p>
    ) : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 py-4">
      <SpaceBanner
        back={{ to: "/community", label: t("dbp.back") }}
        eyebrow={t("db.title")}
        title="Daily Bread"
        sub={`${t("dbp.tagline")} ${t("dbp.sub")}`}
        photo="/brand/daily-bread-skyline.jpg"
        stats={member ? [{ label: t("dbp.statMembers"), value: members.length }, { label: t("dbp.statTools"), value: openTools.length }] : []}
        actions={
          isLeader && group ? (
            <Link
              to={`/community/${group.id}/leader`}
              className="group inline-flex items-center gap-2 rounded-md border border-white/40 px-3 py-1.5 font-[family-name:var(--font-ui)] text-xs font-medium text-white transition-colors hover:bg-white/10"
            >
              {t("dbp.manage")}
              <FeatureIcon name="arrow" size={14} className="cm-arrow" />
            </Link>
          ) : undefined
        }
      />

      {!member ? (
        <p className="cm-card px-5 py-4 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          {t("dbp.noAccess")}{" "}
          <Link to="/community" className="text-water-deep underline">
            {t("dbp.back").replace("← ", "")}
          </Link>
        </p>
      ) : (
        <>
          <section aria-labelledby="dbp-start" className="flex flex-col gap-5">
            <SectionHead id="dbp-start" label={t("dbp.startLabel")} title={t("dbp.startTitle")} />
            <ul className="stagger grid gap-5 md:grid-cols-3">
              <li>
                <OptionCard
                  index={1}
                  icon="users"
                  title={t("dbp.opt.client")}
                  text={t("dbp.opt.clientText")}
                  links={open("wealth") ? [{ to: "/community/wealth/clients", label: t("dbp.opt.clientLink") }] : []}
                  empty={locked}
                />
              </li>
              <li>
                <OptionCard index={2} icon="book" title={t("dbp.opt.case")} text={t("dbp.opt.caseText")} links={caseLinks} empty={locked} />
              </li>
              <li>
                <OptionCard index={3} icon="chart" title={t("dbp.opt.tools")} text={t("dbp.opt.toolsText")} links={toolLinks} empty={locked} />
              </li>
            </ul>
          </section>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="flex min-w-0 flex-col gap-6">
              {setupNote}
              {group && <GroupChat group={group} myId={myId} isLeader={isLeader} members={members} />}
              {group && <PrayerWall group={group} isLeader={isLeader} />}
            </div>
            <aside className="flex flex-col gap-6" aria-label={t("dbp.aside")}>
              <MemberDirectory />
              <WeeklyBrief isAdmin={isAdmin} compact />
              {group && plan && (group.verseLocked || !hasPlan) && <VerseOfDay group={group} isLeader={isLeader} />}
            </aside>
          </div>

          {group && plan && hasPlan && (
            <section aria-labelledby="dbp-today" className="flex flex-col gap-4">
              <SectionHead id="dbp-today" label={t("dbp.today")} title={t("dbp.readingPlan")} />
              <ReadingToday group={group} plan={plan} members={members} myId={myId} />
              <ReadingCalendar group={group} isLeader={isLeader} plan={plan} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
