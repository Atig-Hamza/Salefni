import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function AdminLayout() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="admin-layout">
      <header className="app-header admin-header">
        <div className="app-header__brand">
          <span className="brand-link">Selefni Admin</span>
          <span className="brand-tagline">Gestion des demandes de crédit</span>
        </div>
        <nav className="app-header__nav">
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) => (isActive ? 'nav-link nav-link--active' : 'nav-link')}
          >
            Tableau de bord
          </NavLink>
          <NavLink
            to="/admin/notifications"
            className={({ isActive }) => (isActive ? 'nav-link nav-link--active' : 'nav-link')}
          >
            Notifications
          </NavLink>
          <button type="button" className="nav-link nav-link--action" onClick={handleLogout}>
            Déconnexion
          </button>
          <NotificationBell />
        </nav>
      </header>
      <main className="app-content admin-content">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
