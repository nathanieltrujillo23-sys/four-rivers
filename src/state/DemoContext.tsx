import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { CourseRepository } from "../data/repository";
import { createDemoRepository } from "../data/demoRepository";
import { DEMO_STEPS, type DemoStep } from "./demoSteps";

interface DemoContextValue {
  /** Index of the current tour step, or null when no tour is running. */
  stepIndex: number | null;
  step: DemoStep | null;
  totalSteps: number;
  /** True while the sample account is standing in for a signed-in user (the tour, or a "demo" sign-in). */
  demoActive: boolean;
  /** Signs in as the demo account (username and password "demo"). */
  startSession: () => void;
  /** The sample account's data; changes (and remounts the course) when the step's seed does. */
  repository: CourseRepository | null;
  seedKey: string;
  /** True only while the tour is on its final step, which lights up "Begin the course". */
  beginGlow: boolean;
  startTour: () => void;
  next: () => void;
  back: () => void;
  /** Leave early (or sign the demo account out): back to the home page. */
  skip: () => void;
  /** End from the final step: stays on the home page. */
  finish: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

/** Survives a page refresh within the tab, but not closing it. */
const SESSION_KEY = "four-rivers:demo-session";
const SESSION_SEED = {
  fullAccess: true,
  examPassed: true,
  challengeStarted: true,
};

function readSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}
function writeSession(on: boolean) {
  try {
    if (on) sessionStorage.setItem(SESSION_KEY, "1");
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable — the session just won't survive a refresh */
  }
}

/**
 * Runs the home page's guided tour: a sequence of real pages shown with a
 * temporary, in-memory sample account (data/demoRepository.ts), finishing
 * back on the home page. The same account is what signing in as "demo" gives:
 * everything unlocked, nothing saved. Lives above CourseData so it can swap
 * the sample account in for the real one without touching Supabase.
 */
export function DemoProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [rawIndex, setStepIndex] = useState<number | null>(null);
  const [exiting, setExiting] = useState(false);
  const [session, setSession] = useState(readSession);

  const rawStep = rawIndex === null ? null : DEMO_STEPS[rawIndex];
  const onHome = pathname === "/";
  // The sample account stays in place until the router has actually reached
  // the home page; dropping it a render early would bounce a still-mounted
  // protected page (e.g. /challenge) to the sign-in screen.
  const tourActive = !!rawStep && !(onHome && (exiting || !!rawStep.leaveDemo));
  const sessionActive = session && !(exiting && onHome);
  const demoActive = sessionActive || tourActive;
  const step = exiting ? null : rawStep;
  const stepIndex = exiting ? null : rawIndex;
  const seedKey = JSON.stringify(
    sessionActive ? SESSION_SEED : (rawStep?.seed ?? {}),
  );

  // Once an exit has landed on the home page, the tour and any demo sign-in are fully over.
  useEffect(() => {
    if (exiting && onHome) {
      setStepIndex(null);
      setExiting(false);
      setSession(false);
      writeSession(false);
    }
  }, [exiting, onHome]);
  const repository = useMemo(
    () => (demoActive ? createDemoRepository(JSON.parse(seedKey)) : null),
    [demoActive, seedKey],
  );

  const goTo = useCallback(
    (i: number) => {
      setStepIndex(i);
      navigate(DEMO_STEPS[i].path, { replace: true });
    },
    [navigate],
  );

  const value = useMemo<DemoContextValue>(
    () => ({
      stepIndex,
      step,
      totalSteps: DEMO_STEPS.length,
      demoActive,
      startSession: () => {
        writeSession(true);
        setStepIndex(null);
        setSession(true);
      },
      repository,
      seedKey,
      beginGlow: !!step?.leaveDemo,
      startTour: () => {
        if (!session) goTo(0);
      },
      next: () =>
        rawIndex !== null &&
        rawIndex < DEMO_STEPS.length - 1 &&
        goTo(rawIndex + 1),
      back: () => rawIndex !== null && rawIndex > 0 && goTo(rawIndex - 1),
      skip: () => {
        setExiting(true);
        navigate("/", { replace: true });
      },
      finish: () => {
        setStepIndex(null);
      },
    }),
    [
      stepIndex,
      rawIndex,
      step,
      demoActive,
      session,
      repository,
      seedKey,
      goTo,
      navigate,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within a DemoProvider");
  return ctx;
}
