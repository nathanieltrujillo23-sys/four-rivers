import { useState, type ReactNode } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = (
    <>
      <ShellLink to="/" end onClick={() => setMenuOpen(false)}>
        Home
      </ShellLink>
      {user && (
        <>
          {resume && (
            <Link to={resume.to} onClick={() => setMenuOpen(false)}>
              <Button className="mr-1 w-full sm:w-auto">{resume.label}</Button>
            </Link>
          )}
          <ShellLink to="/course" onClick={() => setMenuOpen(false)}>
            Course
          </ShellLink>
          <ShellLink to="/dashboard" onClick={() => setMenuOpen(false)}>
            Dashboard
          </ShellLink>
          <ShellLink to="/journal" onClick={() => setMenuOpen(false)}>
            Journal
          </ShellLink>
          {snapshot && canManageContent(viewer) && (
            <ShellLink to="/admin" onClick={() => setMenuOpen(false)}>
              Admin
            </ShellLink>
          )}
          <span className="mx-1 hidden text-ink-soft sm:inline">
            {snapshot?.profile.displayName || user.email}
          </span>
          <Button variant="ghost" onClick={() => { setMenuOpen(false); void signOut(); }}>
            Sign out
          </Button>
        </>
      )}
      {!user && (
        <Link to="/signin" onClick={() => setMenuOpen(false)}>
          <Button variant="secondary" className="w-full sm:w-auto">
            Sign in
          </Button>
        </Link>
      )}
      <ThemeToggle />
    </>
  );

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

          <nav className="hidden flex-wrap items-center justify-end gap-1 font-[family-name:var(--font-ui)] text-sm sm:flex">
            {navLinks}
          </nav>

          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink sm:hidden"
          >
            {menuOpen ? (
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>

        {menuOpen && (
          <nav className="flex flex-col gap-1 border-t border-line px-4 py-3 font-[family-name:var(--font-ui)] text-sm sm:hidden">
            {navLinks}
          </nav>
        )}
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

function ShellLink({
  to,
  end,
  onClick,
  children,
}: {
  to: string;
  end?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
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
