import { Link } from "react-router-dom";
import { useAuth } from "../../state/AuthContext";
import { RIVERS } from "../../theme/theme";
import { EDEN_RIVER_REFS, PRINCIPLE_SCRIPTURE, VERSE } from "../../content/scripture";
import { ScriptureQuote } from "../ui/Scripture";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";

export function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-14 py-4">
      <section className="text-center">
        <p className="mb-3 font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.2em] text-clay">
          Genesis 2:10–14
        </p>
        <h1 className="mx-auto max-w-2xl text-4xl font-semibold leading-tight text-ink sm:text-5xl">
          One source. Four streams.
        </h1>
        <p className="mx-auto mt-4 max-w-xl font-[family-name:var(--font-ui)] text-lg text-ink-soft">
          A short, sequential course in four biblical principles of stewardship —
          each paired with a simple tool to start practicing it.
        </p>
        <div className="mx-auto mt-6 max-w-xl text-left">
          <ScriptureQuote verse={VERSE.gen2_10_kjv} />
        </div>
        <div className="mt-7 flex justify-center gap-3">
          <Link to={user ? "/course" : "/signin"}>
            <Button>{user ? "Continue the course" : "Begin the course"}</Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {RIVERS.map((r) => (
          <Card key={r.number} accent={r.accent}>
            <CardBody>
              <div className="flex items-baseline gap-2">
                <span
                  className="font-[family-name:var(--font-ui)] text-sm font-semibold"
                  style={{ color: r.accent }}
                >
                  River {r.number}
                </span>
                <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                  named for the {r.edenRiver} ({EDEN_RIVER_REFS[r.number]})
                </span>
              </div>
              <h3 className="mt-1 text-xl font-semibold text-ink">{r.title}</h3>
              <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                {r.principle}
              </p>
              <div className="mt-3">
                <ScriptureQuote verse={PRINCIPLE_SCRIPTURE[r.number]} compact />
              </div>
            </CardBody>
          </Card>
        ))}
      </section>

      <section className="rounded-2xl bg-parchment-deep/60 p-8 text-center">
        <h2 className="text-2xl font-semibold text-ink">How it works</h2>
        <div className="mx-auto mt-5 grid max-w-2xl gap-5 font-[family-name:var(--font-ui)] text-sm text-ink-soft sm:grid-cols-3">
          <div>
            <div className="text-2xl font-semibold text-water-deep">1</div>
            Read (or listen to) about 15 minutes of teaching per river, each point backed by scripture.
          </div>
          <div>
            <div className="text-2xl font-semibold text-water-deep">2</div>
            Use the companion tracker to log at least one real entry.
          </div>
          <div>
            <div className="text-2xl font-semibold text-water-deep">3</div>
            Finish all four and see everything on one dashboard.
          </div>
        </div>
      </section>

      <p className="text-center font-[family-name:var(--font-ui)] text-xs text-ink-soft/80">
        4 Rivers is educational. It does not provide personalized financial or investment advice.
      </p>
    </div>
  );
}
