import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../state/AuthContext";
import { useOptionalCourse } from "../../state/CourseContext";
import { useResumeLink } from "../../state/useResumeLink";
import { useDemo } from "../../state/DemoContext";
import { viewerFromRole, canManageContent } from "../../lib/access";
import { TRANSLATION_NOTICES } from "../../content/scripture";
import { SPANISH_TRANSLATION_NOTICES } from "../../content/scriptureEs";
import { useLang } from "../../i18n/LanguageContext";
import { FEATURES } from "../../lib/features";
import { Button } from "../ui/Button";
import { BrandMark } from "../ui/BrandMark";
import { CelebrationWatcher } from "./CelebrationWatcher";
import { ScrollToTop } from "./ScrollToTop";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageMenu } from "./LanguageMenu";
import { ChangeNameDialog } from "./ChangeNameDialog";
import { Avatar } from "../ui/Avatar";
import { GuidedTour } from "../marketing/GuidedTour";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const snapshot = useOptionalCourse()?.snapshot ?? null;
  const viewer = viewerFromRole(snapshot?.profile.role);
  const resume = useResumeLink();
  const { lang, t } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const { demoActive, skip: exitDemo } = useDemo();
  // The tour's sample account behaves like a signed-in learner for navigation.
  const signedIn = !!user || demoActive;

  const navLinks = (
    <>
      <ShellLink to="/" end onClick={() => setMenuOpen(false)}>
        {t("nav.home")}
      </ShellLink>
      {signedIn && (
        <>
          {resume && (
            <Link to={resume.to} onClick={() => setMenuOpen(false)}>
              <Button className="mr-1 w-full sm:w-auto">{t("nav.continue")}</Button>
            </Link>
          )}
          <ShellLink to="/course" onClick={() => setMenuOpen(false)}>
            {t("nav.course")}
          </ShellLink>
          <ShellLink to="/challenge" onClick={() => setMenuOpen(false)}>
            {t("nav.challenge")}
          </ShellLink>
          <ShellLink to="/dashboard" onClick={() => setMenuOpen(false)}>
            {t("nav.dashboard")}
          </ShellLink>
          <ShellLink to="/community" onClick={() => setMenuOpen(false)}>
            {t("nav.community")}
          </ShellLink>
          {FEATURES.journal && (
            <ShellLink to="/journal" onClick={() => setMenuOpen(false)}>
              Journal
            </ShellLink>
          )}
          {snapshot && canManageContent(viewer) && (
            <ShellLink to="/admin" onClick={() => setMenuOpen(false)}>
              {t("nav.admin")}
            </ShellLink>
          )}
          {/* Hovering (or focusing) the name reveals "Change name". */}
          <div className="group relative mx-1 hidden lg:block">
            <span
              tabIndex={snapshot ? 0 : undefined}
              className="flex cursor-default items-center gap-2 rounded-lg px-2 py-1 text-ink-soft transition-colors group-focus-within:text-ink group-hover:text-ink"
            >
              {snapshot && (
                <Avatar
                  value={snapshot.profile.avatar}
                  name={snapshot.profile.displayName || user?.email || "?"}
                  size={28}
                />
              )}
              {snapshot?.profile.displayName || user?.email}
            </span>
            {snapshot && (
              <div className="invisible absolute right-0 top-full z-30 pt-1 opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setNameOpen(true)}
                  className="whitespace-nowrap rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-ink shadow-md hover:bg-parchment-deep"
                >
                  {t("nav.changeName")}
                </button>
              </div>
            )}
          </div>
          {snapshot && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setNameOpen(true);
              }}
              className="rounded-lg px-3 py-2 text-left text-ink-soft hover:text-ink lg:hidden"
            >
              {t("nav.changeName")}
            </button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              setMenuOpen(false);
              if (demoActive) exitDemo();
              else void signOut();
            }}
          >
            {t("nav.signOut")}
          </Button>
        </>
      )}
      {!signedIn && (
        <Link to="/signin" onClick={() => setMenuOpen(false)}>
          <Button variant="secondary" className="w-full sm:w-auto">
            {t("nav.signIn")}
          </Button>
        </Link>
      )}
      <LanguageMenu />
      <ThemeToggle />
    </>
  );

  return (
    <div className="min-h-screen">
      <ScrollToTop />
      {nameOpen && snapshot && <ChangeNameDialog onClose={() => setNameOpen(false)} />}
      {!demoActive && <CelebrationWatcher />}
      <GuidedTour />
      <header className="border-b border-line bg-parchment/80 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link
            to={signedIn ? "/course" : "/"}
            className="flex shrink-0 items-center gap-2 whitespace-nowrap"
          >
            <BrandMark />
            <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-ink">
              4 Rivers
            </span>
          </Link>

          <nav className="hidden flex-wrap items-center justify-end gap-1 font-[family-name:var(--font-ui)] text-sm lg:flex">
            {navLinks}
          </nav>

          <button
            type="button"
            aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink lg:hidden"
          >
            {menuOpen ? (
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>

        {menuOpen && (
          <nav className="flex flex-col gap-1 border-t border-line px-4 py-3 font-[family-name:var(--font-ui)] text-sm lg:hidden">
            {navLinks}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

      <footer className="mx-auto max-w-6xl px-4 py-10 text-center print:hidden font-[family-name:var(--font-ui)] text-xs text-ink-soft/80">
        <p>{t("footer.disclaimer")}</p>
        <p className="mt-2">
          <Link to="/glossary" className="underline-offset-2 hover:underline">
            {t("nav.glossary")}
          </Link>
        </p>
        <div className="mt-4 flex flex-col gap-1.5 text-[11px] leading-snug text-ink-soft/70">
          {lang === "es" ? (
            Object.entries(SPANISH_TRANSLATION_NOTICES).map(([version, notice]) => (
              <p key={version}>{notice}</p>
            ))
          ) : (
            <>
              <p>{t("footer.kjv")}</p>
              {Object.entries(TRANSLATION_NOTICES).map(([version, notice]) => (
                <p key={version}>{notice}</p>
              ))}
            </>
          )}
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
