import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useContent } from "../../state/ContentContext";
import { canManageContent, viewerFromRole } from "../../lib/access";
import type { AdminGroup, AdminOverview, LeaderRequest, Learner, ModuleSection } from "../../types";
import { toGroupsError, type GroupsError } from "../../state/useGroups";
import { RIVERS } from "../../theme/theme";
import { Card, CardBody } from "../ui/Card";
import { Button } from "../ui/Button";
import { ContentOverrideEditor } from "../course/ContentOverrideEditor";
import { TestimonyEditor } from "./TestimonyEditor";

/** Browser-side course state that would otherwise outlive a reset (and, for the
 * old module-read keys, get re-uploaded by useModuleProgress's migration). */
const LOCAL_COURSE_KEYS = [
  "four-rivers:quiz:introduction",
  "four-rivers:celebrated:rivers",
  "four-rivers:celebrated:course",
  ...["introduction", "1", "2", "3", "4"].map((s) => `four-rivers:progress:river-${s}`),
];

function ResetProgressCard() {
  const { repository } = useCourse();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    const ok = window.confirm(
      "Reset your own course progress?\n\nThis clears your rivers, modules read, quiz and exam results, certificate, 30-Day Challenge, and tracker entries so you can experience the course from the start. Your journal and any content edits are kept.\n\nThis can't be undone.",
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await repository.resetProgress();
      for (const key of LOCAL_COURSE_KEYS) localStorage.removeItem(key);
      // A full reload so no in-memory state (celebrations, caches) survives.
      window.location.assign("/course");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reset.");
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardBody className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Reset my course progress</h2>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            Start over as a brand-new learner to see everything work again. Only your own account is affected.
          </p>
          {error && <p className="mt-1 font-[family-name:var(--font-ui)] text-xs text-red-700">{error}</p>}
        </div>
        <Button variant="danger" onClick={() => void handleReset()} disabled={busy}>
          {busy ? "Resetting…" : "Reset my progress"}
        </Button>
      </CardBody>
    </Card>
  );
}

function ModuleRow({
  section,
  moduleIndex,
  accent,
}: {
  section: ModuleSection;
  moduleIndex: number;
  accent: string;
}) {
  const { getLesson, isOverridden } = useContent();
  const lesson = getLesson(section, moduleIndex);
  const overridden = isOverridden(section, moduleIndex);
  const [open, setOpen] = useState(false);

  return (
    <Card accent={accent}>
      <CardBody className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">{lesson.title}</span>
            {overridden && (
              <span className="rounded-full bg-gold/20 px-2 py-0.5 font-[family-name:var(--font-ui)] text-[10px] font-medium uppercase tracking-wide text-clay">
                Edited
              </span>
            )}
          </div>
          {!open && (
            <Button variant="ghost" onClick={() => setOpen(true)}>
              Edit
            </Button>
          )}
        </div>
        {open && (
          <ContentOverrideEditor section={section} moduleIndex={moduleIndex} onDone={() => setOpen(false)} />
        )}
      </CardBody>
    </Card>
  );
}

type Tab = "overview" | "learners" | "leaders" | "groups" | "content" | "testimony" | "tools";

function Stat({
  label,
  value,
  accent,
  onClick,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <CardBody>
      <p className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${accent ? "text-clay" : "text-ink"}`}>
        {value}
      </p>
    </CardBody>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="text-left">
      <Card className="transition-colors hover:bg-parchment-deep/40">{body}</Card>
    </button>
  ) : (
    <Card>{body}</Card>
  );
}

function SetupNotice({ error }: { error: GroupsError }) {
  return (
    <Card accent="var(--color-gold)">
      <CardBody>
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          {error.needsSetup
            ? "Run supabase/011_community.sql in the Supabase SQL editor, then reload. Until then these numbers can't load."
            : error.message}
        </p>
      </CardBody>
    </Card>
  );
}

/** Loads one admin query and tracks its error, so each tab can fail on its own. */
function useAdminData<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<GroupsError | null>(null);
  const [key, setKey] = useState(0);
  const reload = useCallback(() => setKey((k) => k + 1), []);
  useEffect(() => {
    let cancelled = false;
    load()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(toGroupsError(err));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { data, error, reload };
}

function Overview({ goTo }: { goTo: (t: Tab) => void }) {
  const { repository } = useCourse();
  const { data, error } = useAdminData<AdminOverview>(() => repository.getAdminOverview());
  if (error) return <SetupNotice error={error} />;
  if (!data) return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading…</p>;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Learners" value={data.learners} onClick={() => goTo("learners")} />
        <Stat label="Passed the exam" value={data.examPassed} />
        <Stat label="Group leaders" value={data.leaders} />
        <Stat
          label="Leader requests waiting"
          value={data.pendingRequests}
          accent={data.pendingRequests > 0}
          onClick={() => goTo("leaders")}
        />
        <Stat label="Groups" value={data.groups} onClick={() => goTo("groups")} />
        <Stat label="Group members" value={data.groupMembers} />
        <Stat label="Chat messages" value={data.messages} />
        <Stat label="Prayers on walls" value={data.prayers} />
      </div>
    </div>
  );
}

function Leaders() {
  const { repository } = useCourse();
  const { data, error, reload } = useAdminData<LeaderRequest[]>(() => repository.listLeaderRequests());
  const [busy, setBusy] = useState<string | null>(null);
  if (error) return <SetupNotice error={error} />;
  if (!data) return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading…</p>;
  const pending = data.filter((r) => r.status === "requested");
  const approved = data.filter((r) => r.status === "approved");

  async function act(r: LeaderRequest, approve: boolean) {
    setBusy(r.userId);
    try {
      await repository.setLeaderApproved(r.userId, approve);
      reload();
    } finally {
      setBusy(null);
    }
  }

  const row = (r: LeaderRequest) => (
    <Card key={r.userId}>
      <CardBody className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-ink">{r.displayName || r.email}</p>
          <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
            {r.email}
            {r.requestedAt && ` · ${new Date(r.requestedAt).toLocaleDateString()}`}
          </p>
          {r.note && (
            <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">“{r.note}”</p>
          )}
        </div>
        <div className="flex gap-2">
          {r.status === "requested" ? (
            <>
              <Button disabled={busy === r.userId} onClick={() => void act(r, true)}>
                Approve
              </Button>
              <Button variant="ghost" disabled={busy === r.userId} onClick={() => void act(r, false)}>
                Decline
              </Button>
            </>
          ) : (
            <Button variant="ghost" disabled={busy === r.userId} onClick={() => void act(r, false)}>
              Revoke
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">Waiting for review ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">No requests right now.</p>
        ) : (
          pending.map(row)
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">Approved leaders ({approved.length})</h2>
        {approved.length === 0 ? (
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Nobody yet.</p>
        ) : (
          approved.map(row)
        )}
      </section>
    </div>
  );
}

function Learners() {
  const { repository } = useCourse();
  const { data, error } = useAdminData<Learner[]>(() => repository.listLearners());
  const [filter, setFilter] = useState("");
  if (error)
    return error.needsSetup || /admin_learners/.test(error.message) ? (
      <Card accent="var(--color-gold)">
        <CardBody>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            Run supabase/012_admin_learners.sql in the Supabase SQL editor, then reload.
          </p>
        </CardBody>
      </Card>
    ) : (
      <SetupNotice error={error} />
    );
  if (!data) return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading…</p>;
  const q = filter.trim().toLowerCase();
  const rows = data.filter(
    (l) =>
      !q ||
      l.email.toLowerCase().includes(q) ||
      l.displayName.toLowerCase().includes(q) ||
      l.fullName.toLowerCase().includes(q),
  );
  const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search by name or email"
          className="w-full max-w-sm rounded-lg border border-line bg-surface px-3 py-2 font-[family-name:var(--font-ui)] text-base text-ink focus:border-water focus:outline-none"
        />
        <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          {rows.length === data.length
            ? `${data.length} learners`
            : `${rows.length} of ${data.length} learners`}
        </span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[34rem] border-collapse text-left font-[family-name:var(--font-ui)] text-sm">
          <thead>
            <tr className="bg-parchment-deep/40 text-xs uppercase tracking-wide text-ink-soft">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Signed up</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.userId} className="border-t border-line text-ink">
                <td className="px-3 py-2">
                  {l.fullName || l.displayName || <span className="text-ink-soft">(no name yet)</span>}
                  {l.fullName && l.displayName && l.fullName !== l.displayName && (
                    <span className="ml-2 text-xs text-ink-soft">goes by {l.displayName}</span>
                  )}
                </td>
                <td className="px-3 py-2 break-all">{l.email}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-ink-soft">
                  {dateFmt.format(new Date(l.signedUpAt))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Groups() {
  const { repository } = useCourse();
  const { data, error, reload } = useAdminData<AdminGroup[]>(() => repository.listAllGroups());
  if (error) return <SetupNotice error={error} />;
  if (!data) return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading…</p>;
  if (data.length === 0)
    return (
      <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
        No groups have been created yet.
      </p>
    );
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[34rem] border-collapse text-left font-[family-name:var(--font-ui)] text-sm">
        <thead>
          <tr className="bg-parchment-deep/40 text-xs uppercase tracking-wide text-ink-soft">
            <th className="px-3 py-2 font-medium">Group</th>
            <th className="px-3 py-2 font-medium">Code</th>
            <th className="px-3 py-2 font-medium">Leader</th>
            <th className="px-3 py-2 text-right font-medium">Members</th>
            <th className="px-3 py-2 text-right font-medium">Messages</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {data.map((g) => (
            <tr key={g.id} className="border-t border-line text-ink">
              <td className="px-3 py-2">{g.name}</td>
              <td className="px-3 py-2 font-mono tracking-widest">{g.joinCode}</td>
              <td className="px-3 py-2">{g.leaderName}</td>
              <td className="px-3 py-2 text-right tabular-nums">{g.memberCount}</td>
              <td className="px-3 py-2 text-right tabular-nums">{g.messageCount}</td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  className="text-xs text-ink-soft hover:text-red-700"
                  onClick={async () => {
                    if (
                      !window.confirm(
                        `Delete "${g.name}", its chat, and its prayer wall for everyone? This can't be undone.`,
                      )
                    )
                      return;
                    await repository.deleteGroup(g.id);
                    reload();
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Content() {
  const { getIntroduction, getRiver } = useContent();
  const [filter, setFilter] = useState("");
  const q = filter.trim().toLowerCase();
  const sections = useMemo(() => {
    const intro = getIntroduction();
    return [
      {
        key: "introduction",
        label: "Introduction",
        section: "introduction" as ModuleSection,
        accent: "#c9a24b",
        lessons: intro.lessons,
      },
      ...RIVERS.map((r) => ({
        key: String(r.number),
        label: `River ${r.number}: ${getRiver(r.number).title}`,
        section: r.number as ModuleSection,
        accent: r.accent,
        lessons: getRiver(r.number).lessons,
      })),
    ];
  }, [getIntroduction, getRiver]);

  return (
    <div className="flex flex-col gap-4">
      <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
        Edit any module's title, body, or scripture, or use the pencil on the module's own page. Changes apply
        immediately for every English-language learner. Quiz and exam questions aren't editable here yet.
      </p>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter modules by title"
        className="w-full max-w-sm rounded-lg border border-line bg-surface px-3 py-2 font-[family-name:var(--font-ui)] text-base text-ink focus:border-water focus:outline-none"
      />
      {sections.map((sec) => {
        const rows = sec.lessons
          .map((l, i) => ({ l, i }))
          .filter(({ l }) => !q || l.title.toLowerCase().includes(q));
        if (rows.length === 0) return null;
        return (
          <details key={sec.key} open={!!q} className="rounded-xl border border-line bg-surface/50">
            <summary className="cursor-pointer px-4 py-3 text-base font-semibold text-ink">
              {sec.label} <span className="text-sm font-normal text-ink-soft">({rows.length})</span>
            </summary>
            <div className="flex flex-col gap-3 px-3 pb-3">
              {rows.map(({ i }) => (
                <ModuleRow key={i} section={sec.section} moduleIndex={i} accent={sec.accent} />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "learners", label: "Learners" },
  { key: "leaders", label: "Leaders" },
  { key: "groups", label: "Groups" },
  { key: "content", label: "Content" },
  { key: "testimony", label: "Testimony" },
  { key: "tools", label: "Tools" },
];

/**
 * The admin dashboard: one place for everything an admin manages, split into
 * compact tabs so new functions can be added as another tab instead of
 * another long page. Overview shows the numbers; Leaders approves requests to
 * lead a Community group; Groups lists every group; Content edits lesson text; Testimony edits the home page story;
 * Tools holds the reset button.
 */
export function AdminPage() {
  const { snapshot, loading, repository } = useCourse();
  const [tab, setTab] = useState<Tab>("overview");
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (snapshot?.profile.role !== "admin") return;
    repository
      .getAdminOverview()
      .then((o) => setPending(o.pendingRequests))
      .catch(() => {});
  }, [repository, snapshot?.profile.role, tab]);

  if (loading && !snapshot)
    return <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">Loading…</p>;
  if (!snapshot) return null;

  const viewer = viewerFromRole(snapshot.profile.role);
  if (!canManageContent(viewer)) return <Navigate to="/course" replace />;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-ink">Admin dashboard</h1>
        <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          Learners, Community leaders, groups, and lesson text in one place.
        </p>
      </header>

      <div
        role="tablist"
        className="flex flex-wrap gap-2 border-b border-line pb-3 font-[family-name:var(--font-ui)]"
      >
        {TABS.map((x) => (
          <button
            key={x.key}
            role="tab"
            type="button"
            aria-selected={tab === x.key}
            onClick={() => setTab(x.key)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === x.key
                ? "bg-water-deep text-white"
                : "text-ink-soft hover:bg-parchment-deep hover:text-ink"
            }`}
          >
            {x.label}
            {x.key === "leaders" && pending > 0 && (
              <span className="rounded-full bg-gold px-1.5 text-[11px] font-semibold text-ink">
                {pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && <Overview goTo={setTab} />}
      {tab === "learners" && <Learners />}
      {tab === "leaders" && <Leaders />}
      {tab === "groups" && <Groups />}
      {tab === "content" && <Content />}
      {tab === "testimony" && <TestimonyEditor />}
      {tab === "tools" && <ResetProgressCard />}
    </div>
  );
}
