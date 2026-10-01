import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../state/AuthContext";
import { useOptionalCourse } from "../../state/CourseContext";
import { useResumeLink } from "../../state/useResumeLink";
import { viewerFromRole, canManageContent } from "../../lib/access";
import { TRANSLATION_NOTICES } from "../../content/scripture";
import { Button } from "../ui/Button";
import { BrandMark } from "../ui/BrandMark";
import { CelebrationWatcher } from "./CelebrationWatcher";
import { ScrollToTop } from "./ScrollToTop";
import { ThemeToggle } from "./ThemeToggle";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const snapshot = useOptionalCourse()?.snapshot ?? null;
  const viewer = viewerFromRole(snapshot?.profile.role);
  const resume = useResumeLink();

  return (
    <div className="min-h-screen">
      <ScrollToTop />
      <CelebrationWatcher />
      <header className="border-b border-line bg-parchment/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
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
                {resume && (
                  <Link to={resume.to}>
                    <Button className="mr-1">{resume.label}</Button>
                  </Link>
                )}
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
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

      <footer className="mx-auto max-w-6xl px-4 py-10 text-center font-[family-name:var(--font-ui)] text-xs text-ink-soft/80">
        <p>
          4 Rivers: a course in stewardship. Educational content only, not financial or investment advice.
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
