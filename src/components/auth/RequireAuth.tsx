import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../state/AuthContext";
import { useDemo } from "../../state/DemoContext";
import { PageSkeleton } from "../ui/Skeleton";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { demoActive } = useDemo();
  const location = useLocation();

  if (loading) return <PageSkeleton cards={2} />;
  if (!user && !demoActive) {
    return <Navigate to="/signin" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}
