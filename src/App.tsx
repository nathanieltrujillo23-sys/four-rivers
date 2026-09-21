import { useMemo, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./state/AuthContext";
import { CourseProvider } from "./state/CourseContext";
import { createSupabaseRepository } from "./data/supabaseRepository";
import { AppShell } from "./components/layout/AppShell";
import { RequireAuth } from "./components/auth/RequireAuth";
import { SignInPage } from "./components/auth/SignInPage";
import { LandingPage } from "./components/marketing/LandingPage";
import { CourseHome } from "./components/course/CourseHome";
import { RiverPage } from "./components/course/RiverPage";
import { DashboardPage } from "./components/dashboard/DashboardPage";
import { JournalPage } from "./components/journal/JournalPage";
import { AdminPage } from "./components/admin/AdminPage";

/** Mounts the per-user course data provider once the user is known. */
function CourseData({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const repository = useMemo(
    () => (user ? createSupabaseRepository(user.id) : null),
    [user]
  );
  if (!user || !repository) return <>{children}</>;
  return (
    <CourseProvider key={user.id} repository={repository}>
      {children}
    </CourseProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <CourseData>
        <AppShell>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route
              path="/course"
              element={
                <RequireAuth>
                  <CourseHome />
                </RequireAuth>
              }
            />
            <Route
              path="/course/river/:n"
              element={
                <RequireAuth>
                  <RiverPage />
                </RequireAuth>
              }
            />
            <Route path="/course/summary" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/journal"
              element={
                <RequireAuth>
                  <JournalPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AdminPage />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </CourseData>
    </AuthProvider>
  );
}

export default App;
