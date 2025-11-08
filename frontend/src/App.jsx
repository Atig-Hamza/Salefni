import { Navigate, Route, Routes } from 'react-router-dom';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import AdminLoginPage from './pages/AdminLoginPage.jsx';
import AdminNotificationsPage from './pages/AdminNotificationsPage.jsx';
import ApplicationFormPage from './pages/ApplicationFormPage.jsx';
import ApplicationSuccessPage from './pages/ApplicationSuccessPage.jsx';
import SimulationPage from './pages/SimulationPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import PublicLayout from './layouts/PublicLayout.jsx';
import { NotificationsProvider } from './context/NotificationContext.jsx';

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<SimulationPage />} />
        <Route path="/apply/:simulationId" element={<ApplicationFormPage />} />
        <Route path="/application-success/:applicationId" element={<ApplicationSuccessPage />} />
      </Route>

      <Route path="/admin/login" element={<AdminLoginPage />} />

      <Route path="/admin" element={<ProtectedRoute />}>
          <Route element={<NotificationsProvider><AdminLayout /></NotificationsProvider>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
