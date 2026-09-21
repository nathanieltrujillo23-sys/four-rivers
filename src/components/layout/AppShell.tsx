import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../state/AuthContext";
import { useOptionalCourse } from "../../state/CourseContext";
import { viewerFromRole, canManageContent } from "../../lib/access";
import { TRANSLATION_NOTICES } from "../../content/scripture";
import { Button } from "../ui/Button";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const snapshot = useOptionalCourse()?.snapshot ?? null;
  const viewer = viewerFromRole(snapshot?.profile.role);

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-parchment/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <Link to={user ? "/course" : "/"} className="flex items-center gap-2">
            <BrandMark />
            <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-ink">
              4 Rivers
            </span>
          </Link>

          <nav className="flex flex-wrap items-center justify-end gap-1 font-[family-name:var(--font-ui)] text-sm">
            <ShellLink to="/" end>
              Home
            </ShellLink>
            {user && (
              <>
                <ShellLink to="/course">Course</ShellLink>
                <ShellLink to="/dashboard">Dashboard</ShellLink>
                <ShellLink to="/journal">Journal</ShellLink>
                {snapshot && canManageContent(viewer) && <ShellLink to="/admin">Admin</ShellLink>}
                <span className="mx-1 hidden text-ink-soft sm:inline">
                  {snapshot?.profile.displayName || user.email}
                </span>
                <Button variant="ghost" onClick={() => void signOut()}>
                  Sign out
                </Button>
              </>
            )}
            {!user && (
              <Link to="/signin">
                <Button variant="secondary">Sign in</Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>

      <footer className="mx-auto max-w-4xl px-4 py-10 text-center font-[family-name:var(--font-ui)] text-xs text-ink-soft/80">
        <p>
          4 Rivers — a course in stewardship. Educational content only, not financial or investment advice.
        </p>
        <div className="mt-4 flex flex-col gap-1.5 text-[11px] leading-snug text-ink-soft/70">
          <p>Scripture quotations marked KJV are from the King James Version (public domain).</p>
          {Object.entries(TRANSLATION_NOTICES).map(([version, notice]) => (
            <p key={version}>{notice}</p>
          ))}
        </div>
      </footer>
    </div>
  );
}

function ShellLink({ to, end, children }: { to: string; end?: boolean; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `rounded-lg px-3 py-2 transition-colors ${
          isActive ? "bg-parchment-deep text-ink" : "text-ink-soft hover:text-ink"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

function BrandMark() {
  // One source parting into four streams.
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <path d="M13 2 C13 8, 5 9, 4 24" fill="none" stroke="var(--color-river-1)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M13 2 C13 9, 10 12, 9 24" fill="none" stroke="var(--color-river-2)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M13 2 C13 9, 16 12, 17 24" fill="none" stroke="var(--color-river-3)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M13 2 C13 8, 21 9, 22 24" fill="none" stroke="var(--color-river-4)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
