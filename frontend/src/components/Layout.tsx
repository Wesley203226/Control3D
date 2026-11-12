import { Box, CircleHelp, Layers3, LayoutDashboard, LogOut, Printer, Settings as SettingsIcon } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import AppFooter from './AppFooter';

const links = [
  { to: '/', label: 'Painel', end: true, icon: LayoutDashboard },
  { to: '/models', label: 'Projetos', icon: Box },
  { to: '/prints', label: 'Peças', icon: Printer },
  { to: '/filamentos', label: 'Filamentos', icon: Layers3 },
  { to: '/configuracoes', label: 'Configurações', icon: SettingsIcon },
  { to: '/sobre', label: 'Sobre', icon: CircleHelp },
];

function initials(name?: string) {
  if (!name) return '3D';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <>
    <div className="ambient-glass" aria-hidden="true">
      <span className="ambient-orb ambient-orb--one" />
      <span className="ambient-orb ambient-orb--two" />
      <span className="ambient-orb ambient-orb--three" />
      <span className="ambient-orb ambient-orb--four" />
    </div>
    <div className="app-frame">
      <aside className="rail glass">
        <div className="rail-logo mb-2">
          <Logo size={36} />
        </div>
        <nav className="rail-nav" aria-label="Principal">
          {links.map((link) => {
            const Icon = link.icon;
            return (
                  <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                title={link.label}
                aria-label={link.label}
                className={({ isActive }) => `rail-btn ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span className="rail-label">{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="rail-spacer" />
        <div className="rail-nav">
          <button type="button" className="rail-btn" onClick={logout} aria-label="Sair" title="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <section className="stage glass">
        <div className="stage-bar">
          <div className="user-pill">
            <span className="avatar">{initials(user?.name)}</span>
            <span className="user-name">{user?.name}</span>
          </div>
        </div>

        <div className="stage-content">
          <Outlet />
        </div>
        <AppFooter />
      </section>
    </div>
    </>
  );
}
