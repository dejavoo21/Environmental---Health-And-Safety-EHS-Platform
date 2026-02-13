import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import RequestAccessPage from './pages/RequestAccessPage';
import ForcePasswordChangePage from './pages/ForcePasswordChangePage';
import DashboardPage from './pages/DashboardPage';
import IncidentsListPage from './pages/IncidentsListPage';
import IncidentNewPage from './pages/IncidentNewPage';
import IncidentDetailPage from './pages/IncidentDetailPage';
import InspectionsListPage from './pages/InspectionsListPage';
import InspectionNewPage from './pages/InspectionNewPage';
import InspectionDetailPage from './pages/InspectionDetailPage';
import ActionsListPage from './pages/ActionsListPage';
import ActionDetailPage from './pages/ActionDetailPage';
import HelpPage from './pages/HelpPage';
import AdminSitesPage from './pages/AdminSitesPage';
import AdminIncidentTypesPage from './pages/AdminIncidentTypesPage';
import AdminTemplatesPage from './pages/AdminTemplatesPage';
import AdminTemplateDetailPage from './pages/AdminTemplateDetailPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminOrganisationPage from './pages/AdminOrganisationPage';
import AdminAccessRequestsPage from './pages/AdminAccessRequestsPage';
import ReportsPage from './pages/ReportsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import NotificationsPage from './pages/NotificationsPage';
import NotificationPreferencesPage from './pages/NotificationPreferencesPage';
import SecurityPage from './pages/SecurityPage';
import NotFoundPage from './pages/NotFoundPage';
import { LoadingState } from './components/States';
// Phase 7: Chemical & Permit Management
import ChemicalRegisterPage from './pages/ChemicalRegisterPage';
import ChemicalDetailPage from './pages/ChemicalDetailPage';
import ChemicalCreatePage from './pages/ChemicalCreatePage';
import PermitBoardPage from './pages/PermitBoardPage';
import PermitsListPage from './pages/PermitsListPage';
import PermitDetailPage from './pages/PermitDetailPage';
import PermitCreatePage from './pages/PermitCreatePage';
import PermitTypesPage from './pages/PermitTypesPage';
// Phase 9: Risk Register & Enterprise Risk Management
import RisksListPage from './pages/RisksListPage';
import RiskDetailPage from './pages/RiskDetailPage';
import RiskNewPage from './pages/RiskNewPage';
import RiskEditPage from './pages/RiskEditPage';
import RiskHeatmapPage from './pages/RiskHeatmapPage';
// Phase 10: Integrations, SSO & External Connectivity
import IntegrationsPage from './pages/IntegrationsPage';
import SafetyMoments from './pages/admin/SafetyMoments';
import SiteLegislation from './pages/admin/SiteLegislation';
import PPERules from './pages/admin/PPERules';
// Phase 8: Training Module
import TrainingPage from './pages/TrainingPage';
import AdminTrainingPage from './pages/AdminTrainingPage';
// Phase 11: Safety Advisor & Security Centre
import SafetyAdvisorPage from './pages/SafetyAdvisorPage';
import AdminSecurityPage from './pages/AdminSecurityPage';

const RequireAuth = ({ children, roles }) => {
  const { user, loading, forcePasswordChange } = useAuth();

  if (loading) {
    return <LoadingState message="Loading session..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to password change page if required
  if (forcePasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const App = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/request-access" element={<RequestAccessPage />} />
    <Route path="/change-password" element={<ForcePasswordChangePage />} />
    
    <Route
      element={(
        <RequireAuth>
          <Layout />
        </RequireAuth>
      )}
    >
      <Route index element={<DashboardPage />} />
      <Route path="/incidents" element={<IncidentsListPage />} />
      <Route path="/incidents/new" element={<IncidentNewPage />} />
      <Route path="/incidents/:id" element={<IncidentDetailPage />} />
      <Route path="/inspections" element={<InspectionsListPage />} />
      <Route
        path="/inspections/new"
        element={(
          <RequireAuth roles={[ 'manager', 'admin' ]}>
            <InspectionNewPage />
          </RequireAuth>
        )}
      />
      <Route path="/inspections/:id" element={<InspectionDetailPage />} />
      <Route path="/actions" element={<ActionsListPage />} />
      <Route path="/actions/:id" element={<ActionDetailPage />} />
      
      {/* Phase 7: Chemical Register */}
      <Route path="/chemicals" element={<ChemicalRegisterPage />} />
      <Route path="/chemicals/new" element={<ChemicalCreatePage />} />
      <Route path="/chemicals/:id" element={<ChemicalDetailPage />} />
      
      {/* Phase 7: Permits */}
      <Route path="/permits" element={<PermitsListPage />} />
      <Route path="/permits/board" element={<PermitBoardPage />} />
      <Route path="/permits/new" element={<PermitCreatePage />} />
      <Route path="/permits/:id" element={<PermitDetailPage />} />
      
      {/* Phase 9: Risk Register */}
      <Route path="/risks" element={<RisksListPage />} />
      <Route
        path="/risks/new"
        element={(
          <RequireAuth roles={[ 'manager', 'admin' ]}>
            <RiskNewPage />
          </RequireAuth>
        )}
      />
      <Route
        path="/risks/heatmap"
        element={(
          <RequireAuth roles={[ 'manager', 'admin' ]}>
            <RiskHeatmapPage />
          </RequireAuth>
        )}
      />
      <Route path="/risks/:id" element={<RiskDetailPage />} />
      <Route
        path="/risks/:id/edit"
        element={(
          <RequireAuth roles={[ 'manager', 'admin' ]}>
            <RiskEditPage />
          </RequireAuth>
        )}
      />
      
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/settings/notifications" element={<NotificationPreferencesPage />} />
      <Route path="/security" element={<SecurityPage />} />
      
      {/* Phase 8: Training */}
      <Route path="/training" element={<TrainingPage />} />
      
      {/* Phase 11: Safety Advisor */}
      <Route path="/safety-advisor" element={<SafetyAdvisorPage />} />
      
      <Route path="/help" element={<HelpPage />} />
      <Route
        path="/admin/sites"
        element={(
          <RequireAuth roles={[ 'admin' ]}>
            <AdminSitesPage />
          </RequireAuth>
        )}
      />
      <Route
        path="/admin/incident-types"
        element={(
          <RequireAuth roles={[ 'admin' ]}>
            <AdminIncidentTypesPage />
          </RequireAuth>
        )}
      />
      <Route
        path="/admin/templates"
        element={(
          <RequireAuth roles={[ 'admin' ]}>
            <AdminTemplatesPage />
          </RequireAuth>
        )}
      />
      <Route
        path="/admin/templates/:id"
        element={(
          <RequireAuth roles={[ 'admin' ]}>
            <AdminTemplateDetailPage />
          </RequireAuth>
        )}
      />
      <Route
        path="/admin/permit-types"
        element={(
          <RequireAuth roles={[ 'admin' ]}>
            <PermitTypesPage />
          </RequireAuth>
        )}
      />
      <Route
        path="/admin/users"
        element={(
          <RequireAuth roles={[ 'admin' ]}>
            <AdminUsersPage />
          </RequireAuth>
        )}
      />
      <Route
        path="/admin/organisation"
        element={(
          <RequireAuth roles={[ 'admin' ]}>
            <AdminOrganisationPage />
          </RequireAuth>
        )}
      />
      <Route
        path="/admin/access-requests"
        element={(
          <RequireAuth roles={[ 'admin' ]}>
            <AdminAccessRequestsPage />
          </RequireAuth>
        )}
      />
      <Route
        path="/admin/integrations"
        element={(
          <RequireAuth roles={[ 'admin' ]}>
            <IntegrationsPage />
          </RequireAuth>
        )}
      />
      <Route
        path="/admin/security"
        element={(
          <RequireAuth roles={[ 'admin' ]}>
            <AdminSecurityPage />
          </RequireAuth>
        )}
      />
      <Route
        path="/admin/training"
        element={(
          <RequireAuth roles={[ 'admin' ]}>
            <AdminTrainingPage />
          </RequireAuth>
        )}
      />
      <Route
        path="/admin/safety-moments"
        element={(
          <RequireAuth roles={[ 'admin' ]}>
            <SafetyMoments />
          </RequireAuth>
        )}
      />
      <Route
        path="/admin/site-legislation"
        element={(
          <RequireAuth roles={[ 'admin' ]}>
            <SiteLegislation />
          </RequireAuth>
        )}
      />
      <Route
        path="/admin/ppe-rules"
        element={(
          <RequireAuth roles={[ 'admin' ]}>
            <PPERules />
          </RequireAuth>
        )}
      />
      <Route
        path="/reports"
        element={(
          <RequireAuth roles={[ 'manager', 'admin' ]}>
            <ReportsPage />
          </RequireAuth>
        )}
      />
      <Route
        path="/analytics"
        element={(
          <RequireAuth roles={[ 'manager', 'admin' ]}>
            <AnalyticsPage />
          </RequireAuth>
        )}
      />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);

export default App;
