import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { NotificationBanner } from './components/NotificationBanner';
import { DashboardPageV2 } from './pages/DashboardPageV2';
import { ArticleFormPageV2 } from './pages/ArticleFormPageV2';
import { PreviewPage } from './pages/PreviewPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { PlannerPage } from './pages/PlannerPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { HomePage } from './pages/HomePage';
import { FamilyMembersPage } from './pages/FamilyMembersPage';
import { PhotoStudioPage } from './pages/PhotoStudioPage';
import { AdminPageV2 } from './pages/AdminPageV2';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Pages publiques */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Pages protégées */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <NotificationBanner />
                <AppLayout>
                  <Routes>
                    <Route path="/dashboard-v2" element={<DashboardPageV2 />} />
                    <Route path="/admin-v2" element={<AdminPageV2 />} />
                    <Route path="/articles/new-v2" element={<ArticleFormPageV2 />} />
                    <Route path="/articles/:id/edit-v2" element={<ArticleFormPageV2 />} />
                    <Route path="/articles/:id/preview" element={<PreviewPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/planner" element={<PlannerPage />} />
                    <Route path="/photo-studio" element={<PhotoStudioPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/family" element={<FamilyMembersPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/admin-v2" replace />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
