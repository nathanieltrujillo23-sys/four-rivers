import { Link, useParams } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { useWealthClients } from "../../state/useWealth";
import { Button } from "../ui/Button";
import { LoadError } from "../ui/LoadError";
import { PageSkeleton } from "../ui/Skeleton";
import { SAVE_TEXT } from "./wealthText";
import { WealthPlanner } from "./WealthPlan";

/** One client's plan, from discovery notes to presentation. Only the student who made it can open it. */
export function WealthClientPage() {
  const { clientId } = useParams();
  const { repository, snapshot } = useCourse();
  const profile = snapshot?.profile;
  const allowed = profile?.wealthStatus === "approved" || profile?.role === "admin";
  if (!snapshot || !profile) return <PageSkeleton cards={3} />;
  if (!allowed) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-10 text-center">
        <h1 className="t-h1">Wealth Tools</h1>
        <Link to="/community">
          <Button variant="secondary">Back to Community</Button>
        </Link>
      </div>
    );
  }
  return <Client clientId={clientId ?? ""} userId={profile.userId} analystName={profile.fullName || profile.displayName || ""} repositoryKey={repository} />;
}

function Client({ clientId, userId, analystName, repositoryKey }: { clientId: string; userId: string; analystName: string; repositoryKey: ReturnType<typeof useCourse>["repository"] }) {
  const { clients, error, save, savePlan, saveTool } = useWealthClients(repositoryKey, userId);
  if (error && !clients) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <LoadError message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }
  if (!clients) return <PageSkeleton cards={3} />;
  const client = clients.find((c) => c.id === clientId);
  if (!client) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-10 text-center">
        <h1 className="t-h1">That plan was not found</h1>
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">It may have been deleted. Your other client plans are on the list.</p>
        <Link to="/community/wealth">
          <Button variant="secondary">All clients</Button>
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 py-2">
      <header className="flex flex-col gap-2">
        <Link to="/community/wealth" className="w-fit font-[family-name:var(--font-ui)] text-sm text-water-deep hover:underline">
          ← All clients
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="t-eyebrow">Client plan</p>
            <h1 className="t-h1 mt-1">{client.name || "New client"}</h1>
          </div>
          <p
            role="status"
            aria-live="polite"
            className={`rounded-full border px-3 py-1 font-[family-name:var(--font-ui)] text-xs ${save === "error" ? "border-clay text-ink" : "border-line text-ink-soft"}`}
          >
            {SAVE_TEXT[save]}
          </p>
        </div>
      </header>
      <WealthPlanner
        key={client.id}
        saved={client.plan}
        tools={client.tools}
        analystName={analystName}
        onChange={(plan) => savePlan(client.id, plan)}
        onToolState={(toolId, state) => saveTool(client.id, toolId, state)}
      />
    </div>
  );
}
