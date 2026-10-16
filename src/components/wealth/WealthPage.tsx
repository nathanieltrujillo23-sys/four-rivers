import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCopy } from "../../lib/copy";
import { emptyPlan, normalizePlan, samplePlan } from "../../lib/wealthMath";
import { TOPICS, topicLabel } from "../community/workshop/workshopContent";
import { useCourse } from "../../state/CourseContext";
import { useWealthClients } from "../../state/useWealth";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { Field, TextInput } from "../ui/Field";
import { LoadError } from "../ui/LoadError";
import { PageSkeleton } from "../ui/Skeleton";
import { SAVE_TEXT, WEALTH_TEXT } from "./wealthText";

const FLOW = [
  ["1", "Discovery meeting", "Meet the student or client and take notes."],
  ["2", "Client plan", "Goals, SWOT, strategy and mission, from what they told you."],
  ["3", "Focus areas and tools", "Their 2 or 3 topics, with the numbers for each."],
  ["4", "Presentation", "A PowerPoint walk-through with the model behind it."],
] as const;

/**
 * Wealth Tools, a tool-style group in Community, for students in the Daily Bread wealth management track: a list of the
 * client plans they are working on. Each plan is private to the student who made it.
 */
export function WealthPage() {
  const { snapshot } = useCourse();
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
            : "Wealth Tools is a private space for taking a client from a discovery meeting to a presentation. Ask for it on the Community page."}
        </p>
        <Link to="/community">
          <Button variant="secondary">Back to Community</Button>
        </Link>
      </div>
    );
  }
  return <Clients userId={profile.userId} />;
}

function Clients({ userId }: { userId: string }) {
  const { repository } = useCourse();
  const copy = useCopy();
  const navigate = useNavigate();
  const { clients, error, save, create, remove } = useWealthClients(repository, userId);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  if (error && !clients) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <LoadError message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }
  if (!clients) return <PageSkeleton cards={3} />;

  async function start(e: FormEvent, example = false) {
    e.preventDefault();
    if (!example && !name.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const plan = example ? samplePlan() : { ...emptyPlan(), client: { ...emptyPlan().client, name: name.trim() } };
      const made = await create(plan);
      navigate(`/community/wealth/${made.id}`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 py-2">
      <header className="flex flex-col gap-3">
        <Link to="/community" className="w-fit font-[family-name:var(--font-ui)] text-sm text-water-deep hover:underline">
          ← Community
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="t-eyebrow">{copy("wealth:page:eyebrow", WEALTH_TEXT.eyebrow)}</p>
            <h1 className="t-h1 mt-1">{copy("wealth:page:title", WEALTH_TEXT.title)}</h1>
            <p className="mt-2 max-w-2xl font-[family-name:var(--font-ui)] text-sm text-ink-soft">{copy("wealth:page:intro", WEALTH_TEXT.intro)}</p>
          </div>
          <p
            role="status"
            aria-live="polite"
            className={`rounded-full border px-3 py-1 font-[family-name:var(--font-ui)] text-xs ${save === "error" ? "border-clay text-ink" : "border-line text-ink-soft"}`}
          >
            {SAVE_TEXT[save]}
          </p>
        </div>
        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{copy("wealth:page:privacy", WEALTH_TEXT.privacy)}</p>
      </header>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="How it works">
        {FLOW.map(([n, title, text]) => (
          <li key={n} className="panel-inner flex gap-3 p-4">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-water-deep font-[family-name:var(--font-ui)] text-xs font-semibold text-white">{n}</span>
            <span>
              <span className="block font-[family-name:var(--font-display)] text-sm font-semibold text-ink">{title}</span>
              <span className="block font-[family-name:var(--font-ui)] text-xs text-ink-soft">{text}</span>
            </span>
          </li>
        ))}
      </ol>

      <Card>
        <CardBody>
          <form onSubmit={(e) => void start(e)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Start a client plan" className="flex-1">
              <TextInput value={name} maxLength={80} placeholder="The client's name" onChange={(e) => setName(e.target.value)} />
            </Field>
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? "Starting…" : "Start plan"}
            </Button>
            {clients.length === 0 && (
              <Button type="button" variant="secondary" disabled={busy} onClick={(e) => void start(e, true)}>
                See an example client
              </Button>
            )}
          </form>
          {msg && (
            <p role="alert" className="mt-3 font-[family-name:var(--font-ui)] text-xs text-red-700">
              {msg}
            </p>
          )}
        </CardBody>
      </Card>

      <section aria-labelledby="clients-title" className="flex flex-col gap-3">
        <h2 id="clients-title" className="t-h4">
          Your clients ({clients.length})
        </h2>
        {clients.length === 0 ? (
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">No client plans yet. Start one above, right after a discovery meeting.</p>
        ) : (
          <ul className="stagger grid gap-3 sm:grid-cols-2">
            {clients.map((c) => {
              const plan = normalizePlan(c.plan);
              const focus = plan.focus.map((id) => TOPICS.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t);
              return (
                <li key={c.id}>
                  <Card className="h-full">
                    <CardBody className="flex h-full flex-col gap-3">
                      <div>
                        <p className="t-h4">{c.name || "New client"}</p>
                        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                          {plan.goals.length} goal{plan.goals.length === 1 ? "" : "s"} · {Object.keys(c.tools).length} tool{Object.keys(c.tools).length === 1 ? "" : "s"} filled in · updated{" "}
                          {new Date(c.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {focus.length > 0 && (
                        <p className="flex flex-wrap gap-1.5" aria-label="Focus areas">
                          {focus.map((t) => (
                            <span key={t.id} className="rounded-full bg-parchment-deep px-2.5 py-0.5 font-[family-name:var(--font-ui)] text-xs text-ink">
                              {topicLabel(t, copy)}
                            </span>
                          ))}
                        </p>
                      )}
                      <div className="mt-auto flex flex-wrap items-center gap-2">
                        <Link to={`/community/wealth/${c.id}`}>
                          <Button>Open</Button>
                        </Link>
                        {confirm === c.id ? (
                          <span className="inline-flex items-center gap-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                            Delete this plan?
                            <Button
                              variant="danger"
                              onClick={async () => {
                                await remove(c.id);
                                setConfirm(null);
                              }}
                            >
                              Yes, delete
                            </Button>
                            <Button variant="ghost" onClick={() => setConfirm(null)}>
                              Cancel
                            </Button>
                          </span>
                        ) : (
                          <Button variant="ghost" onClick={() => setConfirm(c.id)} aria-label={`Delete ${c.name || "client"} plan`}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
