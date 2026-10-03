import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../state/AuthContext";
import { useDemo } from "../../state/DemoContext";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { demoActive } = useDemo();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center font-[family-name:var(--font-ui)] text-sm text-ink-soft">
        Loading…
      </div>
    );
  }
  if (!user && !demoActive) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
