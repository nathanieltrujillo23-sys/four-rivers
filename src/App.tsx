import { useMemo, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "./i18n/LanguageContext";
import { AuthProvider, useAuth } from "./state/AuthContext";
import { CourseProvider } from "./state/CourseContext";
import { ContentProvider } from "./state/ContentContext";
import { DemoProvider, useDemo } from "./state/DemoContext";
import { createSupabaseRepository } from "./data/supabaseRepository";
import { AppShell } from "./components/layout/AppShell";
import { RequireAuth } from "./components/auth/RequireAuth";
import { SignInPage } from "./components/auth/SignInPage";
import { LandingPage } from "./components/marketing/LandingPage";
import { CourseHome } from "./components/course/CourseHome";
import { IntroductionPage } from "./components/course/IntroductionPage";
import { IntroductionModulePage } from "./components/course/IntroductionModulePage";
import { IntroQuiz } from "./components/course/IntroQuiz";
import { RiverPage } from "./components/course/RiverPage";
import { ModuleDetailPage } from "./components/course/ModuleDetailPage";
import { RiverQuiz } from "./components/course/RiverQuiz";
import { FinalExam } from "./components/course/FinalExam";
import { DashboardPage } from "./components/dashboard/DashboardPage";
import { CertificatePage } from "./components/course/CertificatePage";
import { ChallengePage } from "./components/course/ChallengePage";
import { VerifyCertificate } from "./components/course/VerifyCertificate";
import { JournalPage } from "./components/journal/JournalPage";
import { FEATURES } from "./lib/features";
import { AdminPage } from "./components/admin/AdminPage";
import { GlossaryPage } from "./components/course/GlossaryPage";
import { CommunityPage } from "./components/community/CommunityPage";
import { GroupHomePage } from "./components/community/GroupHomePage";
import { LeaderDashboardPage } from "./components/community/LeaderDashboardPage";
import { PassagePage } from "./components/community/PassagePage";
import { SearchPage } from "./components/course/SearchPage";
import { ContactPage } from "./components/marketing/ContactPage";
import { MomentPage } from "./components/course/MomentPage";
import { InvitePosterPage } from "./components/community/InvitePosterPage";
import { SavedReadingsPage } from "./components/community/SavedReadingsPage";

/** Mounts the per-user course data provider once the user is known. */
function CourseData({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const demo = useDemo();
  const repository = useMemo(() => (user ? createSupabaseRepository(user.id) : null), [user]);
  // The guided tour swaps in a throwaway sample account, even for someone who
  // is signed in, so the tour never reads or changes their real data.
  if (demo.repository) {
    return (
      <CourseProvider key={`demo-${demo.seedKey}`} repository={demo.repository}>
        <ContentProvider repository={demo.repository}>{children}</ContentProvider>
      </CourseProvider>
    );
  }
  if (!user || !repository) return <>{children}</>;
  return (
    <CourseProvider key={user.id} repository={repository}>
      <ContentProvider repository={repository}>{children}</ContentProvider>
    </CourseProvider>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <DemoProvider>
          <CourseData>
            <AppShell>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/signin" element={<SignInPage />} />
                <Route path="/verify/:userId" element={<VerifyCertificate />} />
                <Route path="/glossary" element={<GlossaryPage />} />
                <Route path="/contact" element={<ContactPage />} />
                {/* The About page was archived (src/archive/AboutPage.tsx); old links go to the home page. */}
                <Route path="/about" element={<Navigate to="/" replace />} />
                <Route
                  path="/course"
                  element={
                    <RequireAuth>
                      <CourseHome />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/course/introduction"
                  element={
                    <RequireAuth>
                      <IntroductionPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/course/introduction/module/:m"
                  element={
                    <RequireAuth>
                      <IntroductionModulePage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/course/introduction/quiz"
                  element={
                    <RequireAuth>
                      <IntroQuiz />
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
                <Route
                  path="/course/river/:n/module/:m"
                  element={
                    <RequireAuth>
                      <ModuleDetailPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/course/river/:n/quiz"
                  element={
                    <RequireAuth>
                      <RiverQuiz />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/course/moments/:id"
                  element={
                    <RequireAuth>
                      <MomentPage />
                    </RequireAuth>
                  }
                />
                <Route path="/course/summary" element={<Navigate to="/dashboard" replace />} />
                <Route
                  path="/challenge"
                  element={
                    <RequireAuth>
                      <ChallengePage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/course/exam"
                  element={
                    <RequireAuth>
                      <FinalExam />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <RequireAuth>
                      <DashboardPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/certificate"
                  element={
                    <RequireAuth>
                      <CertificatePage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/community"
                  element={
                    <RequireAuth>
                      <CommunityPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/community/:groupId"
                  element={
                    <RequireAuth>
                      <GroupHomePage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/community/:groupId/leader"
                  element={
                    <RequireAuth>
                      <LeaderDashboardPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/community/:groupId/read"
                  element={
                    <RequireAuth>
                      <PassagePage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/community/:groupId/poster"
                  element={
                    <RequireAuth>
                      <InvitePosterPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/search"
                  element={
                    <RequireAuth>
                      <SearchPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/offline"
                  element={
                    <RequireAuth>
                      <SavedReadingsPage />
                    </RequireAuth>
                  }
                />
                <Route path="/groups" element={<Navigate to="/community" replace />} />
                {FEATURES.journal && (
                  <Route
                    path="/journal"
                    element={
                      <RequireAuth>
                        <JournalPage />
                      </RequireAuth>
                    }
                  />
                )}
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
        </DemoProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
