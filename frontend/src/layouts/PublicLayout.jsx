import { Link, Outlet } from 'react-router-dom';

function PublicLayout() {
  return (
    <div className="layout">
      <header className="app-header">
        <div className="app-header__brand">
          <Link to="/" className="brand-link">Selefni</Link>
          <span className="brand-tagline">Simulation et demandes de crédit</span>
        </div>
        <nav className="app-header__nav">
          <Link to="/" className="nav-link">Simulateur</Link>
          <Link to="/admin/login" className="nav-link">Espace admin</Link>
        </nav>
      </header>
      <main className="app-content">
        <Outlet />
      </main>
      <footer className="app-footer">
        <p>Copyright {new Date().getFullYear()} Selefni. Tous droits réservés.</p>
      </footer>
    </div>
  );
}

export default PublicLayout;
