import { useState } from "react";
import { Link } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useWealthClients } from "../../state/useWealth";
import { useWealthPrep } from "../../state/useWealthPrep";
import { prepProgress } from "../../lib/wealthPrep";
import { Button } from "../ui/Button";
import { LoadError } from "../ui/LoadError";
import { PageSkeleton } from "../ui/Skeleton";
import { Tile } from "./parts";
import { AppsTab, BehavioralTab, DrillsTab, JournalTab, ReadinessTab, ResumeTab, TechTab, useStartPersona } from "./prepTabs";
import { SAVE_TEXT } from "./wealthText";

type Tab = "tech" | "behavioral" | "drills" | "journal" | "ready" | "apps" | "resume";
const TABS: { id: Tab; label: string }[] = [
  { id: "tech", label: "Technical questions" },
  { id: "behavioral", label: "Behavioral" },
  { id: "drills", label: "Practice clients" },
  { id: "journal", label: "Market journal" },
  { id: "ready", label: "Readiness" },
  { id: "apps", label: "Applications" },
  { id: "resume", label: "Resume bullets" },
];

/** Interview and career preparation for the wealth management track, private to each student. */
export function PrepPage() {
  const { snapshot } = useCourse();
  const profile = snapshot?.profile;
  const allowed = profile?.wealthStatus === "approved" || profile?.role === "admin";
  if (!snapshot || !profile) return <PageSkeleton cards={2} />;
  if (!allowed) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-10 text-center">
        <h1 className="t-h1">Career prep</h1>
        <Link to="/community">
          <Button variant="secondary">Back to Community</Button>
        </Link>
      </div>
    );
  }
  return <Prep userId={profile.userId} />;
}

function Prep({ userId }: { userId: string }) {
  const { repository } = useCourse();
  const prep = useWealthPrep(repository, userId);
  const wealth = useWealthClients(repository, userId);
  const [tab, setTab] = useState<Tab>("tech");
  const starter = useStartPersona(wealth.create);

  if (prep.error && !prep.data) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <LoadError message={prep.error} onRetry={() => window.location.reload()} />
      </div>
    );
  }
  if (!prep.data) return <PageSkeleton cards={3} />;
  const data = prep.data;
  const p = prepProgress(data);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 py-2">
      <header className="flex flex-col gap-3">
        <Link to="/community/wealth" className="w-fit font-[family-name:var(--font-ui)] text-sm text-water-deep hover:underline">
          ← Wealth Tools
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="t-eyebrow">Daily Bread wealth management track</p>
            <h1 className="t-h1 mt-1">Interview and career prep</h1>
            <p className="mt-2 max-w-2xl font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              Practice the questions, rehearse client cases, keep a market journal, and track your applications. Only you can see this page; it is kept in your own account.
            </p>
          </div>
          <p role="status" aria-live="polite" className={`rounded-full border px-3 py-1 font-[family-name:var(--font-ui)] text-xs ${prep.save === "error" ? "border-clay text-ink" : "border-line text-ink-soft"}`}>
            {SAVE_TEXT[prep.save]}
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Technical" value={`${p.confident} of ${p.techTotal}`} sub={`confident; ${p.rated} rated`} />
        <Tile label="Behavioral" value={`${p.behavioral} of ${p.behavioralTotal}`} sub="answers written" />
        <Tile label="Practice clients" value={`${p.drills} of ${p.drillsTotal}`} sub="cases worked" />
        <Tile label="Readiness" value={`${p.readyDone} of ${p.readyTotal}`} sub={`${p.journal} journal entries`} />
      </div>

      <div role="tablist" aria-label="Career prep" className="flex gap-1 overflow-x-auto rounded-xl bg-parchment-deep p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`prep-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`prep-panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`min-w-[120px] flex-1 whitespace-nowrap rounded-lg px-3 py-2 font-[family-name:var(--font-ui)] text-sm font-medium transition-colors ${tab === t.id ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {starter.error && (
        <p role="alert" className="font-[family-name:var(--font-ui)] text-sm text-red-700">
          {starter.error}
        </p>
      )}
      <div role="tabpanel" id={`prep-panel-${tab}`} aria-labelledby={`prep-tab-${tab}`}>
        {tab === "tech" && <TechTab data={data} update={prep.update} />}
        {tab === "behavioral" && <BehavioralTab data={data} update={prep.update} />}
        {tab === "drills" && <DrillsTab data={data} update={prep.update} onStart={starter.start} />}
        {tab === "journal" && <JournalTab data={data} update={prep.update} />}
        {tab === "ready" && <ReadinessTab data={data} update={prep.update} />}
        {tab === "apps" && <AppsTab data={data} update={prep.update} />}
        {tab === "resume" && <ResumeTab clients={wealth.clients ?? []} data={data} />}
      </div>
    </div>
  );
}
