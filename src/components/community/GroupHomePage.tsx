import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useGroups } from "../../state/useGroups";
import { useLang } from "../../i18n/LanguageContext";
import type { GroupMember, ReadingPlan } from "../../types";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { GroupChat } from "./GroupChat";
import { ReadingCalendar } from "./ReadingCalendar";
import { ReadingToday } from "./ReadingToday";
import { MembersPanel } from "./MembersPanel";
import { PrayerWall } from "./PrayerWall";
import { VerseOfDay } from "./VerseOfDay";

/**
 * A group's home: the name in the heading, the leader's verse of the day,
 * members on the left, chat on the right, and the prayer wall below.
 */
export function GroupHomePage() {
  const { groupId } = useParams();
  const { repository, snapshot } = useCourse();
  const { t } = useLang();
  const location = useLocation();
  const { groups, loading, error } = useGroups(repository);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [plan, setPlan] = useState<ReadingPlan | null>(null);
  const [bannerOpen, setBannerOpen] = useState(
    !!(location.state as { justCreated?: boolean } | null)?.justCreated,
  );

  const group = groups.find((g) => g.id === groupId);
  const myId = snapshot?.profile.userId ?? "";
  const hasPlan = !!plan && plan.days.length > 0;
  const myName = snapshot?.profile.displayName || snapshot?.profile.fullName || "";
  const isOwner = !!group && group.leaderId === myId;
  // The leader and any co-leader can moderate and reach the leader tools.
  const isLeader = isOwner || members.some((m) => m.userId === myId && m.isCoLeader);

  useEffect(() => {
    if (!group) return;
    let alive = true;
    repository
      .getReadingPlan(group.id)
      .then((p) => alive && setPlan(p))
      .catch(() => alive && setPlan({ title: null, days: [] }));
    return () => {
      alive = false;
    };
  }, [repository, group?.id]);

  useEffect(() => {
    if (!group) return;
    let cancelled = false;
    const load = () =>
      repository
        .getGroupMembers(group.id)
        .then((rows) => {
          if (!cancelled) setMembers(rows);
        })
        .catch(() => {});
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    const stop = repository.trackPresence(group.id, { userId: myId, name: myName }, (ids) =>
      setOnline(new Set(ids)),
    );
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      stop();
    };
  }, [repository, group, myId, myName]);

  if (loading) {
    return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("common.loading")}</p>;
  }
  if (!group) {
    if (error) return <Navigate to="/community" replace />;
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("group.notFound")}</p>
        <Link to="/community">
          <Button variant="secondary">{t("group.back")}</Button>
        </Link>
      </div>
    );
  }

  const onlineCount = members.filter((m) => online.has(m.userId) || m.userId === myId).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/community"
            className="font-[family-name:var(--font-ui)] text-sm text-ink-soft hover:text-ink"
          >
            {t("group.back")}
          </Link>
          <h1 className="mt-1 text-3xl font-semibold text-ink">{group.name}</h1>
          <p className="mt-1 flex items-center gap-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            {t("ld.codeTitle")}
            <span className="rounded-md bg-parchment-deep px-2 py-0.5 font-mono text-base font-semibold tracking-[0.25em] text-ink">
              {group.joinCode}
            </span>
          </p>
          <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            {t(members.length === 1 ? "yours.membersOne" : "yours.membersMany", { n: members.length })}
            {onlineCount > 0 && <> · {t("group.online", { n: onlineCount })}</>}
          </p>
        </div>
        {isLeader && (
          <Link to={`/community/${group.id}/leader`}>
            <Button variant="secondary">{t("group.leaderDash")}</Button>
          </Link>
        )}
      </header>

      {group.archivedAt && (
        <p
          role="status"
          className="rounded-xl bg-parchment-deep px-4 py-3 font-[family-name:var(--font-ui)] text-sm text-ink"
        >
          {t("gs.archivedNote")}
        </p>
      )}

      {bannerOpen && isOwner && (
        <Card accent="var(--color-olive)" className="bg-olive/10">
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink">
              {t("create.done", { code: group.joinCode })}
            </p>
            <button
              type="button"
              onClick={() => setBannerOpen(false)}
              className="text-sm text-ink-soft hover:text-ink"
            >
              ×
            </button>
          </CardBody>
        </Card>
      )}

      {/* A group shows either its reading plan or a verse of the day, never both. */}
      {plan &&
        (hasPlan ? (
          <>
            <ReadingToday group={group} plan={plan} members={members} myId={myId} />
            <ReadingCalendar group={group} isLeader={isLeader} plan={plan} />
          </>
        ) : (
          <>
            <VerseOfDay group={group} isLeader={isLeader} />
            {isLeader && !group.verse && <ReadingCalendar group={group} isLeader plan={plan} />}
          </>
        ))}

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <MembersPanel members={members} online={online} myId={myId} />
        <GroupChat group={group} myId={myId} isLeader={isLeader} members={members} />
      </div>

      <PrayerWall group={group} isLeader={isLeader} />
    </div>
  );
}
