import { NavLink, useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import { isDemoMode, useAuth } from '../auth';

const navItems = [
  { to: '/dashboards', label: 'Tableaux de bord' },
  { to: '/overview', label: 'Vue direction' },
  { to: '/imports', label: 'Imports' },
];

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const goHome = () => navigate('/dashboards');

  return (
    <header className="app-header">
      <div
        className="logo"
        onClick={goHome}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            goHome();
          }
        }}
        role="button"
        tabIndex={0}
      >
        kpix
      </div>
      <nav className="app-nav">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="header-meta">
        {isDemoMode && <span className="pill">Mode démo</span>}
        {user && (
          <span className="pill">
            <strong>{user.name}</strong>
            <span className="muted" style={{ fontSize: '13px' }}>
              {user.email}
            </span>
          </span>
        )}
        <Button variant="secondary" onClick={logout}>
          Déconnexion
        </Button>
      </div>
    </header>
  );
};

export default Header;
