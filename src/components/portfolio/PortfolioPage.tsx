import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCourse } from "../../state/CourseContext";
import { PORTFOLIO_CHECKS, portfolioSections, reviewsGiven, type PortfolioInput } from "../../lib/careerPortfolio";
import { normalizeIb } from "../../lib/ibWorkspace";
import { normalizeConsulting } from "../../lib/consultingWorkspace";
import { normalizePrep } from "../../lib/wealthPrep";
import { presenterLine, roleProblem, DEFAULT_ROLE } from "../../lib/wealthCompliance";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/Field";
import { PageSkeleton } from "../ui/Skeleton";
import { EducationNote } from "../ib/ibParts";
import { Empty, Panel } from "../wealth/parts";

/** A one-page summary of the practice work a student has done in the tool spaces they are approved for, to print or save as a PDF. */
export function PortfolioPage() {
  const { snapshot, repository } = useCourse();
  const profile = snapshot?.profile;
  const [data, setData] = useState<PortfolioInput | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState(DEFAULT_ROLE);
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  const isAdmin = profile?.role === "admin";
  const hasWealth = profile?.wealthStatus === "approved" || isAdmin;
  const hasIb = profile?.ibStatus === "approved" || (isAdmin && profile?.ibStatus !== undefined);
  const hasConsulting = profile?.consultingStatus === "approved" || (isAdmin && profile?.consultingStatus !== undefined);
  const userId = profile?.userId ?? "";

  useEffect(() => {
    if (!profile) return;
    let off = false;
    (async () => {
      const out: PortfolioInput = {};
      if (hasWealth) {
        try {
          const [prep, clients, cases, reviews] = await Promise.all([repository.loadWealthPrep(), repository.listWealthClients(), repository.listWealthCases(), repository.listWealthCaseReviews()]);
          out.wealth = { prep: normalizePrep(prep), clients, cases: cases.filter((c) => c.authorId === userId), reviewsGiven: reviewsGiven(reviews, userId) };
        } catch {
          /* that space is not available right now */
        }
      }
      if (hasIb) out.ib = await repository.loadTrackWorkspace("ib").then(normalizeIb).catch(() => undefined);
      if (hasConsulting) out.consulting = await repository.loadTrackWorkspace("consulting").then(normalizeConsulting).catch(() => undefined);
      if (!off) setData(out);
    })();
    return () => {
      off = true;
    };
  }, [profile, hasWealth, hasIb, hasConsulting, repository, userId]);

  const sections = useMemo(() => (data ? portfolioSections(data) : []), [data]);
  if (!snapshot || !profile || !data) return <PageSkeleton cards={2} />;
  const problem = roleProblem(role);
  const ready = PORTFOLIO_CHECKS.every((c) => checks[c.id]) && !problem && name.trim().length > 0;
  const who = name.trim() || profile.fullName || profile.displayName || "Your name";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 py-2">
      <style>{`
        @media print {
          @page { size: letter portrait; margin: 0.5in; }
          body * { visibility: hidden !important; }
          #career-portfolio, #career-portfolio * { visibility: visible !important; }
          #career-portfolio { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: 0 !important; }
        }
      `}</style>
      <header className="flex flex-col gap-3 print:hidden">
        <Link to="/community" className="w-fit font-[family-name:var(--font-ui)] text-sm text-water-deep hover:underline">
          ← Community
        </Link>
        <div>
          <p className="t-eyebrow">Tools group</p>
          <h1 className="t-h1 mt-1">Career portfolio</h1>
          <p className="mt-2 max-w-2xl font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            One page that gathers the practice work you have actually done in the tool spaces you are approved for, in plain counts, with bullets you can adapt for a resume. Nothing here is invented, and nothing leaves your account unless you print it.
          </p>
        </div>
      </header>
      <div className="print:hidden">
        <EducationNote>This summarizes educational practice. It is not a track record, and it should never include a real client's or classmate's identity.</EducationNote>
      </div>

      {sections.length === 0 ? (
        <Empty>No tool spaces are open to you yet. Request Wealth Tools, Investment Banking Tools or Consulting Tools from the Community page.</Empty>
      ) : (
        <>
          <Panel title="Before you share it" subtitle="Confirm each one yourself. Printing opens once they are all true and your role line is a student's.">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
                Your name
                <TextInput value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={profile.fullName || profile.displayName || "Your name"} />
              </label>
              <label className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
                Your role line
                <TextInput value={role} maxLength={90} onChange={(e) => setRole(e.target.value)} aria-describedby="portfolio-role" />
              </label>
            </div>
            {problem && (
              <p id="portfolio-role" role="alert" className="font-[family-name:var(--font-ui)] text-xs text-clay-text">
                {problem}
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {PORTFOLIO_CHECKS.map((c) => (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-start gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
                    <input type="checkbox" checked={!!checks[c.id]} onChange={(e) => setChecks({ ...checks, [c.id]: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[var(--color-water-deep)]" />
                    {c.text}
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => window.print()} disabled={!ready}>
                Print or save as PDF
              </Button>
              {!ready && <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">Enter your name, keep the role a student's, and confirm all {PORTFOLIO_CHECKS.length} items.</span>}
            </div>
          </Panel>

          <article id="career-portfolio" className="rounded-sm border border-line bg-surface px-8 py-6 font-[family-name:var(--font-ui)] text-[12px] leading-snug text-ink shadow-md">
            <header className="border-b border-line pb-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-ink-soft">Career portfolio · educational practice</p>
              <h2 className="mt-1 text-2xl">{who}</h2>
              <p className="text-ink-soft">{presenterLine({ presenter: "", role: role.trim() || DEFAULT_ROLE, sie: false })}</p>
            </header>
            {sections.map((s) => (
              <section key={s.id} className="mt-4">
                <h3 className="mb-2 border-b border-line pb-1 text-[10px] font-bold uppercase tracking-[0.18em]">{s.title}</h3>
                <table className="w-full">
                  <tbody>
                    {s.facts.map(([k, v]) => (
                      <tr key={k} className="border-b border-line/60 last:border-0">
                        <th scope="row" className="py-1 pr-3 text-left font-normal text-ink-soft">
                          {k}
                        </th>
                        <td className="py-1 text-right font-medium tabular-nums">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {s.bullets.length > 0 && (
                  <ul className="mt-2 list-disc pl-4">
                    {s.bullets.map((b, i) => (
                      <li key={i} className="mb-1">
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
            <footer className="mt-5 border-t border-line pt-2 text-[9px] text-ink-soft">
              A summary of practice work done in educational tools, by a student. The models, cases and numbers are practice, not real transactions or client work, and nothing here is investment, tax or legal advice or a recommendation of any security.
            </footer>
          </article>
        </>
      )}
    </div>
  );
}
