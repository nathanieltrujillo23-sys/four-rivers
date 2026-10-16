import { Link, useSearchParams } from "react-router-dom";
import { useCopy } from "../../lib/copy";
import { useCourse } from "../../state/CourseContext";
import { useWealth, type WealthSave } from "../../state/useWealth";
import { Button } from "../ui/Button";
import { LoadError } from "../ui/LoadError";
import { PageSkeleton } from "../ui/Skeleton";
import { WealthPlanner } from "./WealthPlan";
import { WealthToolkit } from "./WealthToolkit";
import { WEALTH_TEXT } from "./wealthText";

const TABS = [
  { id: "plan", label: "My wealth plan" },
  { id: "toolkit", label: "Money toolkit" },
] as const;

const SAVE_TEXT: Record<WealthSave, string> = {
  idle: "Saved to your account as you go",
  saving: "Saving…",
  saved: "Saved",
  error: "Not saved yet. Your changes are kept on this device and will save when you are back online.",
};

/**
 * Wealth Tools, a tool-style group in Community: a six-module wealth plan and a summarized money toolkit. Everything a
 * person enters is saved to their own private workspace; nobody else (leaders and admins included) can read it.
 */
export function WealthPage() {
  const { snapshot } = useCourse();
  const copy = useCopy();
  const profile = snapshot?.profile;
  const allowed = profile?.wealthStatus === "approved" || profile?.role === "admin";

  if (!snapshot || !profile) return <PageSkeleton cards={2} />;
  if (!allowed) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-10 text-center">
        <h1 className="t-h1">Wealth Tools</h1>
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          {profile.wealthStatus === "requested"
            ? "Your request is in. An admin will review it soon."
            : "Wealth Tools is a private space with a wealth plan and a money toolkit. Ask for it on the Community page."}
        </p>
        <Link to="/community">
          <Button variant="secondary">Back to Community</Button>
        </Link>
      </div>
    );
  }
  return <Workspace memberName={profile.fullName || profile.displayName || ""} intro={copy("wealth:page:intro", WEALTH_TEXT.intro)} />;
}

function Workspace({ memberName, intro }: { memberName: string; intro: string }) {
  const { repository, snapshot } = useCourse();
  const userId = snapshot?.profile.userId ?? "";
  const copy = useCopy();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "toolkit" ? "toolkit" : "plan";
  const { workspace, error, save, savePlan, saveTool } = useWealth(repository, userId);

  if (error && !workspace) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <LoadError message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }
  if (!workspace) return <PageSkeleton cards={3} />;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 py-2">
      <header className="flex flex-col gap-3">
        <Link to="/community" className="w-fit font-[family-name:var(--font-ui)] text-sm text-water-deep hover:underline">
          ← Community
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="t-eyebrow">{copy("wealth:page:eyebrow", WEALTH_TEXT.eyebrow)}</p>
            <h1 className="t-h1 mt-1">{copy("wealth:page:title", WEALTH_TEXT.title)}</h1>
            <p className="mt-2 max-w-2xl font-[family-name:var(--font-ui)] text-sm text-ink-soft">{intro}</p>
          </div>
          <p
            role="status"
            aria-live="polite"
            className={`rounded-full border px-3 py-1 font-[family-name:var(--font-ui)] text-xs ${save === "error" ? "border-clay text-ink" : "border-line text-ink-soft"}`}
          >
            {SAVE_TEXT[save]}
          </p>
        </div>
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          {copy("wealth:page:privacy", WEALTH_TEXT.privacy)}
        </p>
        <div role="tablist" aria-label="Wealth Tools" className="flex gap-1 rounded-xl bg-parchment-deep p-1 print:hidden">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`wealth-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`wealth-panel-${t.id}`}
              onClick={() => setParams(t.id === "plan" ? {} : { tab: t.id }, { replace: true })}
              className={`flex-1 rounded-lg px-3 py-2 font-[family-name:var(--font-ui)] text-sm font-medium transition-colors ${
                tab === t.id ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div role="tabpanel" id={`wealth-panel-${tab}`} aria-labelledby={`wealth-tab-${tab}`}>
        {tab === "plan" ? (
          <WealthPlanner saved={workspace.plan} memberName={memberName} onChange={savePlan} />
        ) : (
          <WealthToolkit tools={workspace.tools} onToolState={saveTool} />
        )}
      </div>
    </div>
  );
}
